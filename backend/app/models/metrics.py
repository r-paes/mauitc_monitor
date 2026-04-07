"""
metrics.py — Métricas de saúde Mautic e gateways (TimescaleDB hypertables).
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HealthMetric(Base):
    """
    Snapshots periódicos de saúde de cada instância Mautic.
    TimescaleDB hypertable particionada por 'time'.
    """

    __tablename__ = "health_metrics"
    __table_args__ = (
        Index("ix_health_metrics_time_instance", "time", "instance_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True, server_default=func.now()
    )
    instance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instances.id", ondelete="CASCADE"), nullable=False
    )

    # Dados coletados via API Mautic
    new_contacts: Mapped[int | None] = mapped_column(Integer)         # últimas 24h
    active_campaigns: Mapped[int | None] = mapped_column(Integer)

    # Dados coletados via banco Mautic (direto)
    emails_queued: Mapped[int | None] = mapped_column(Integer)
    emails_sent_mautic: Mapped[int | None] = mapped_column(Integer)   # último período
    sms_sent_mautic: Mapped[int | None] = mapped_column(Integer)

    # Performance da instância
    api_response_ms: Mapped[int | None] = mapped_column(Integer)
    db_response_ms: Mapped[int | None] = mapped_column(Integer)

    # Status geral: ok | degraded | down
    status: Mapped[str] = mapped_column(String(20), default="ok")


class GatewayMetric(Base):
    """
    Métricas coletadas diretamente dos gateways de envio.
    TimescaleDB hypertable — base para Delta Alerts.
    """

    __tablename__ = "gateway_metrics"
    __table_args__ = (
        Index("ix_gateway_metrics_time_type", "time", "gateway_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True, server_default=func.now()
    )

    # sendpost | avant_sms
    gateway_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # Identificação da sub-account (Sendpost)
    subaccount_id: Mapped[int | None] = mapped_column(Integer)
    subaccount_name: Mapped[str | None] = mapped_column(String(100))

    # Métricas de email (Sendpost) — campos 1:1 com a API
    emails_sent: Mapped[int | None] = mapped_column(Integer)          # processed
    emails_delivered: Mapped[int | None] = mapped_column(Integer)     # delivered
    emails_dropped: Mapped[int | None] = mapped_column(Integer)       # dropped
    emails_hard_bounced: Mapped[int | None] = mapped_column(Integer)  # hardBounced
    emails_soft_bounced: Mapped[int | None] = mapped_column(Integer)  # softBounced
    emails_opened: Mapped[int | None] = mapped_column(Integer)        # opened
    emails_clicked: Mapped[int | None] = mapped_column(Integer)       # clicked
    emails_unsubscribed: Mapped[int | None] = mapped_column(Integer)  # unsubscribed
    emails_spam: Mapped[int | None] = mapped_column(Integer)          # spam
    open_rate: Mapped[float | None] = mapped_column(Float)            # calculado
    click_rate: Mapped[float | None] = mapped_column(Float)           # calculado

    # Métricas de SMS (Avant)
    sms_sent: Mapped[int | None] = mapped_column(Integer)
    sms_delivered: Mapped[int | None] = mapped_column(Integer)
    sms_failed: Mapped[int | None] = mapped_column(Integer)

    # Saldo da conta
    balance_credits: Mapped[float | None] = mapped_column(Float)
