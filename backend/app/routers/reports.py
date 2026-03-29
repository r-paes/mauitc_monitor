"""
routers/reports.py — Endpoints REST do módulo de relatórios Mautic.

Endpoints:
  GET    /reports/configs                     — lista configs (admin)
  POST   /reports/configs                     — cria config (admin)
  GET    /reports/configs/{id}                — detalhe config (admin)
  PATCH  /reports/configs/{id}                — atualiza config (admin)
  DELETE /reports/configs/{id}                — remove config (admin)
  POST   /reports/configs/{id}/generate       — dispara geração manual
  GET    /reports/history                     — lista histórico (com filtros)
  GET    /reports/history/{id}                — detalhe de uma execução
  GET    /reports/history/{id}/download       — baixa o arquivo HTML
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.reports import ReportConfig, ReportHistory
from app.routers.auth import get_current_user
from app.models.users import User
from app.services.report_generator import generate_report
from app.services.report_sender import dispatch_report

router = APIRouter(prefix="/reports", tags=["reports"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ReportConfigCreate(BaseModel):
    instance_id: uuid.UUID
    company_name: str
    mautic_company_id: Optional[int] = None
    report_email: EmailStr
    report_phone: Optional[str] = None
    send_email: bool = True
    send_sms: bool = False
    active: bool = True

    @field_validator("report_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        digits = v.replace("+", "").replace("-", "").replace(" ", "")
        if not digits.isdigit() or len(digits) < 10:
            raise ValueError("Telefone inválido. Use formato E.164: +5511999999999")
        return v


class ReportConfigUpdate(BaseModel):
    company_name: Optional[str] = None
    mautic_company_id: Optional[int] = None
    report_email: Optional[EmailStr] = None
    report_phone: Optional[str] = None
    send_email: Optional[bool] = None
    send_sms: Optional[bool] = None
    active: Optional[bool] = None


class ReportConfigOut(BaseModel):
    id: uuid.UUID
    instance_id: uuid.UUID
    company_name: str
    mautic_company_id: Optional[int]
    report_email: str
    report_phone: Optional[str]
    send_email: bool
    send_sms: bool
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportHistoryOut(BaseModel):
    id: uuid.UUID
    report_config_id: uuid.UUID
    instance_id: Optional[uuid.UUID]
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    trigger: str
    status: str
    file_url: Optional[str]
    email_stats_json: Optional[dict]
    sms_stats_json: Optional[dict]
    sent_email: bool
    sent_sms: bool
    error_message: Optional[str]

    class Config:
        from_attributes = True


class GenerateRequest(BaseModel):
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _require_admin(current_user: User) -> None:
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")


async def _get_config_or_404(config_id: uuid.UUID, db: AsyncSession) -> ReportConfig:
    result = await db.execute(select(ReportConfig).where(ReportConfig.id == config_id))
    config = result.scalars().first()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Config não encontrada")
    return config


async def _run_and_dispatch(
    db: AsyncSession,
    config: ReportConfig,
    trigger: str,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    """Tarefa de background: gera e envia o relatório."""
    history = await generate_report(
        db=db,
        config=config,
        trigger=trigger,
        period_start=period_start,
        period_end=period_end,
    )
    if history.status == "success":
        email_sent, sms_sent = await dispatch_report(config, history)
        history.sent_email = email_sent
        history.sent_sms = sms_sent
        await db.commit()


# ─── Endpoints — ReportConfig ─────────────────────────────────────────────────

@router.get("/configs", response_model=list[ReportConfigOut])
async def list_configs(
    instance_id: Optional[uuid.UUID] = Query(None),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista configurações de relatório. Filtráveis por instância e status ativo."""
    _require_admin(current_user)
    q = select(ReportConfig).order_by(ReportConfig.company_name)
    if instance_id:
        q = q.where(ReportConfig.instance_id == instance_id)
    if active_only:
        q = q.where(ReportConfig.active.is_(True))
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/configs", response_model=ReportConfigOut, status_code=status.HTTP_201_CREATED)
async def create_config(
    data: ReportConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria nova configuração de relatório para uma empresa/instância."""
    _require_admin(current_user)
    config = ReportConfig(**data.model_dump())
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@router.get("/configs/{config_id}", response_model=ReportConfigOut)
async def get_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna detalhes de uma configuração de relatório."""
    _require_admin(current_user)
    return await _get_config_or_404(config_id, db)


@router.patch("/configs/{config_id}", response_model=ReportConfigOut)
async def update_config(
    config_id: uuid.UUID,
    data: ReportConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza campos de uma configuração de relatório."""
    _require_admin(current_user)
    config = await _get_config_or_404(config_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(config, field, value)
    await db.commit()
    await db.refresh(config)
    return config


@router.delete("/configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove uma configuração de relatório e todo o seu histórico (CASCADE)."""
    _require_admin(current_user)
    config = await _get_config_or_404(config_id, db)
    await db.delete(config)
    await db.commit()


# ─── Endpoints — Geração Manual ───────────────────────────────────────────────

@router.post("/configs/{config_id}/generate", response_model=ReportHistoryOut, status_code=status.HTTP_202_ACCEPTED)
async def generate_manual(
    config_id: uuid.UUID,
    body: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dispara geração manual de relatório em background.
    Retorna o registro de histórico criado com status='generating'.
    """
    _require_admin(current_user)
    config = await _get_config_or_404(config_id, db)

    if not config.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Config inativa. Ative-a antes de gerar relatório.",
        )

    # Cria histórico pendente para retornar imediatamente
    now = datetime.now(tz=timezone.utc)
    period_start = body.period_start
    period_end = body.period_end

    background_tasks.add_task(
        _run_and_dispatch,
        db=db,
        config=config,
        trigger="manual",
        period_start=period_start,
        period_end=period_end,
    )

    # Retorna um histórico stub — a tarefa de background o atualizará
    placeholder = ReportHistory(
        id=uuid.uuid4(),
        report_config_id=config.id,
        instance_id=config.instance_id,
        generated_at=now,
        period_start=period_start or now.replace(hour=0, minute=0, second=0, microsecond=0),
        period_end=period_end or now,
        trigger="manual",
        status="generating",
    )
    db.add(placeholder)
    await db.commit()
    await db.refresh(placeholder)
    return placeholder


# ─── Endpoints — Histórico ────────────────────────────────────────────────────

@router.get("/history", response_model=list[ReportHistoryOut])
async def list_history(
    config_id: Optional[uuid.UUID] = Query(None),
    instance_id: Optional[uuid.UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista histórico de relatórios com filtros opcionais."""
    _require_admin(current_user)
    q = (
        select(ReportHistory)
        .order_by(ReportHistory.generated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if config_id:
        q = q.where(ReportHistory.report_config_id == config_id)
    if instance_id:
        q = q.where(ReportHistory.instance_id == instance_id)
    if status_filter:
        q = q.where(ReportHistory.status == status_filter)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/history/{history_id}", response_model=ReportHistoryOut)
async def get_history_entry(
    history_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna detalhes de uma execução específica."""
    _require_admin(current_user)
    result = await db.execute(select(ReportHistory).where(ReportHistory.id == history_id))
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Histórico não encontrado")
    return entry


@router.get("/history/{history_id}/download")
async def download_report(
    history_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Baixa o arquivo HTML do relatório gerado."""
    _require_admin(current_user)
    result = await db.execute(select(ReportHistory).where(ReportHistory.id == history_id))
    entry = result.scalars().first()

    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Histórico não encontrado")
    if not entry.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não disponível")

    path = Path(entry.file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo removido do disco")

    filename = f"relatorio_{entry.generated_at.strftime('%Y%m%d_%H%M')}.html"
    return FileResponse(
        path=str(path),
        media_type="text/html",
        filename=filename,
    )
