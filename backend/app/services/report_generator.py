"""
report_generator.py — Orquestra a geração de relatórios Mautic.

Fluxo:
  1. Recebe ReportConfig + período
  2. Descriptografa credenciais da instância
  3. Coleta dados via MauticMySQLCollector
  4. Renderiza HTML via Jinja2
  5. Salva arquivo em disco (report_storage_path)
  6. Atualiza ReportHistory no banco
"""

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.collectors.mautic_mysql import MauticMySQLCollector
from app.config import settings
from app.models.instance import Instance
from app.models.reports import ReportConfig, ReportHistory
from app.utils.crypto import decrypt_secret

logger = logging.getLogger(__name__)

# ─── Jinja2 ───────────────────────────────────────────────────────────────────

_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "j2"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def _render_report(context: dict) -> str:
    """Renderiza o template Jinja2 com o contexto fornecido."""
    template = _jinja_env.get_template("report.html.j2")
    return template.render(**context)


# ─── Período padrão ───────────────────────────────────────────────────────────

def default_period(now: Optional[datetime] = None) -> tuple[datetime, datetime]:
    """
    Retorna (period_start, period_end) para o relatório padrão:
    hoje das 00:00 até agora (ou até 23:59 se for agendado ao final do dia).
    """
    if now is None:
        now = datetime.now(tz=timezone.utc)
    period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    period_end = now
    return period_start, period_end


# ─── Salvamento ───────────────────────────────────────────────────────────────

def _build_file_path(config: ReportConfig, generated_at: datetime) -> Path:
    """
    Monta o caminho absoluto onde o relatório será salvo.
    Estrutura: {report_storage_path}/{instance_id}/{config_id}/{YYYY-MM}/{timestamp}.html
    """
    base = Path(settings.report_storage_path)
    subdir = base / str(config.instance_id) / str(config.id) / generated_at.strftime("%Y-%m")
    subdir.mkdir(parents=True, exist_ok=True)
    filename = f"report_{generated_at.strftime('%Y%m%d_%H%M%S')}.html"
    return subdir / filename


def _build_file_url(file_path: Path) -> str:
    """
    Constrói URL pública relativa ao report_storage_path.
    Ex: /reports/uuid/uuid/2024-01/report_20240101_090000.html
    """
    base = Path(settings.report_storage_path)
    relative = file_path.relative_to(base)
    return f"/reports/{relative}"


# ─── Gerador principal ────────────────────────────────────────────────────────

async def generate_report(
    db: AsyncSession,
    config: ReportConfig,
    trigger: str = "scheduled",
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
) -> ReportHistory:
    """
    Gera um relatório para a config fornecida.

    Args:
        db:           sessão AsyncSession do banco de dados principal
        config:       ReportConfig com instância carregada (eager ou via select)
        trigger:      'scheduled' | 'manual'
        period_start: início do período (padrão: hoje 00:00 UTC)
        period_end:   fim do período (padrão: agora UTC)

    Returns:
        ReportHistory com status='success' ou status='error'
    """
    now = datetime.now(tz=timezone.utc)

    if period_start is None or period_end is None:
        period_start, period_end = default_period(now)

    # Cria registro inicial como 'generating'
    history = ReportHistory(
        id=uuid.uuid4(),
        report_config_id=config.id,
        instance_id=config.instance_id,
        generated_at=now,
        period_start=period_start,
        period_end=period_end,
        trigger=trigger,
        status="generating",
    )
    db.add(history)
    await db.commit()
    await db.refresh(history)

    try:
        # ── Carrega instância ──────────────────────────────────────────────────
        result = await db.execute(select(Instance).where(Instance.id == config.instance_id))
        instance: Optional[Instance] = result.scalars().first()

        if not instance:
            raise ValueError(f"Instância {config.instance_id} não encontrada")

        if not all([instance.db_host, instance.db_name, instance.db_user, instance.db_password_enc]):
            raise ValueError(f"Credenciais MySQL incompletas para instância {instance.name}")

        db_password = decrypt_secret(instance.db_password_enc)

        # ── Coleta dados MySQL ─────────────────────────────────────────────────
        collector = MauticMySQLCollector(
            host=instance.db_host,
            port=instance.db_port or 3306,
            dbname=instance.db_name,
            user=instance.db_user,
            password=db_password,
        )

        data = await collector.collect_for_report(
            period_start=period_start,
            period_end=period_end,
            company_id=config.mautic_company_id,
        )

        # ── Renderiza HTML ─────────────────────────────────────────────────────
        tz_label = "BRT"
        fmt = "%d/%m/%Y %H:%M"

        html_content = _render_report({
            "company_name": config.company_name,
            "instance_name": instance.name,
            "generated_at": now.strftime(fmt) + f" {tz_label}",
            "period_start": period_start.strftime(fmt),
            "period_end": period_end.strftime(fmt),
            "email": data["email"],
            "sms": data["sms"],
            "contacts": data["contacts"],
            "show_sms": config.send_sms,
            "logo_url": f"https://{settings.easypanel_domain}/static/logo.png",
            "support_email": settings.sendpost_alert_from_email,
        })

        # ── Salva em disco ─────────────────────────────────────────────────────
        file_path = _build_file_path(config, now)
        file_path.write_text(html_content, encoding="utf-8")

        file_url = _build_file_url(file_path)

        # ── Atualiza histórico ─────────────────────────────────────────────────
        history.status = "success"
        history.file_path = str(file_path)
        history.file_url = file_url
        history.email_stats_json = data["email"]
        history.sms_stats_json = data["sms"]

        logger.info(
            "Relatório gerado: %s / %s → %s",
            instance.name,
            config.company_name,
            file_path.name,
        )

    except Exception as exc:
        logger.exception(
            "Erro ao gerar relatório config=%s: %s", config.id, exc
        )
        history.status = "error"
        history.error_message = str(exc)

    await db.commit()
    await db.refresh(history)
    return history


# ─── Limpeza de arquivos antigos ──────────────────────────────────────────────

async def purge_old_reports(db: AsyncSession) -> int:
    """
    Remove arquivos de relatório mais antigos que REPORT_RETENTION_DAYS.
    Retorna quantidade de arquivos removidos.
    """
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=settings.report_retention_days)
    result = await db.execute(
        select(ReportHistory).where(
            ReportHistory.generated_at < cutoff,
            ReportHistory.file_path.isnot(None),
        )
    )
    old_entries = result.scalars().all()
    removed = 0

    for entry in old_entries:
        try:
            path = Path(entry.file_path)
            if path.exists():
                path.unlink()
                removed += 1
        except OSError as e:
            logger.warning("Não foi possível remover %s: %s", entry.file_path, e)

        entry.file_path = None
        entry.file_url = None

    if removed:
        await db.commit()
        logger.info("Limpeza: %d relatórios antigos removidos", removed)

    return removed
