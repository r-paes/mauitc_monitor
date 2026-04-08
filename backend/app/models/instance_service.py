"""
instance_service.py — Serviços (containers Docker) monitorados por instância Mautic.

Tipos fixos: database, crons, web.
O nome do container é informado manualmente pelo usuário.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ServiceType(str, enum.Enum):
    database = "database"
    crons = "crons"
    web = "web"


class InstanceService(Base):
    """Container Docker monitorado, associado a uma instância Mautic."""

    __tablename__ = "instance_services"
    __table_args__ = (
        Index("ix_instance_services_instance", "instance_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    instance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instances.id", ondelete="CASCADE"), nullable=False
    )
    service_type: Mapped[str] = mapped_column(
        Enum(ServiceType, name="service_type", create_constraint=True, native_enum=True),
        nullable=False,
    )
    container_name: Mapped[str] = mapped_column(String(200), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    instance: Mapped["Instance"] = relationship("Instance", back_populates="services")

    def __repr__(self) -> str:
        return f"<InstanceService {self.service_type}:{self.container_name} (instance={self.instance_id})>"
