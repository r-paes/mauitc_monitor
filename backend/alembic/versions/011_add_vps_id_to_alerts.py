"""Adiciona vps_id à tabela alerts para vincular alertas de VPS

Alertas de recursos (CPU, memória, disco) agora vinculam à VPS de origem.

Revision ID: 011
Revises: 010
Create Date: 2026-04-07
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("alerts", sa.Column("vps_id", UUID(as_uuid=True), nullable=True))
    op.create_index("ix_alerts_vps_id", "alerts", ["vps_id"])


def downgrade() -> None:
    op.drop_index("ix_alerts_vps_id", table_name="alerts")
    op.drop_column("alerts", "vps_id")
