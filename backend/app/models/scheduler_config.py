"""
scheduler_config.py — Intervalos de coleta configuráveis via UI.

Permite que o admin ajuste a frequência de cada tipo de monitoramento
sem precisar alterar variáveis de ambiente ou reiniciar o backend.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SchedulerConfig(Base):
    """Configuração de intervalo para um job do scheduler."""

    __tablename__ = "scheduler_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    config_key: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<SchedulerConfig {self.config_key}={self.interval_minutes}min>"
