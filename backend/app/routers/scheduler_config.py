"""
routers/scheduler_config.py — Configuração de intervalos do scheduler via API.

Permite que o admin ajuste a frequência de cada tipo de monitoramento
sem reiniciar o backend.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.scheduler_config import SchedulerConfig
from app.routers.auth import get_current_user
from app.models.users import User

router = APIRouter(prefix="/scheduler", tags=["scheduler"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class SchedulerConfigOut(BaseModel):
    id: str
    config_key: str
    interval_minutes: int
    description: str

    model_config = {"from_attributes": True}


class SchedulerConfigUpdate(BaseModel):
    interval_minutes: int = Field(ge=1, le=1440)


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/config", response_model=list[SchedulerConfigOut])
async def list_scheduler_configs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista todos os intervalos configuráveis do scheduler."""
    result = await db.execute(select(SchedulerConfig).order_by(SchedulerConfig.config_key))
    configs = result.scalars().all()
    return [
        SchedulerConfigOut(
            id=str(c.id),
            config_key=c.config_key,
            interval_minutes=c.interval_minutes,
            description=c.description,
        )
        for c in configs
    ]


@router.patch("/config/{config_key}", response_model=SchedulerConfigOut)
async def update_scheduler_config(
    config_key: str,
    data: SchedulerConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza o intervalo de um job do scheduler (admin only)."""
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    result = await db.execute(
        select(SchedulerConfig).where(SchedulerConfig.config_key == config_key)
    )
    config = result.scalars().first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração '{config_key}' não encontrada",
        )

    config.interval_minutes = data.interval_minutes
    await db.commit()
    await db.refresh(config)

    return SchedulerConfigOut(
        id=str(config.id),
        config_key=config.config_key,
        interval_minutes=config.interval_minutes,
        description=config.description,
    )
