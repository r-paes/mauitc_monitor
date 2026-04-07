"""Adiciona campos detalhados de métricas Sendpost + sub-account na gateway_metrics

Novos campos:
  - subaccount_id, subaccount_name (identificação da sub-account Sendpost)
  - emails_dropped, emails_hard_bounced, emails_soft_bounced, emails_opened, emails_clicked
Remove: emails_bounced (substituído por hard/soft bounced separados)

Revision ID: 009
Revises: 008
Create Date: 2026-04-07
"""

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Sub-account identification
    op.add_column("gateway_metrics", sa.Column("subaccount_id", sa.Integer(), nullable=True))
    op.add_column("gateway_metrics", sa.Column("subaccount_name", sa.String(100), nullable=True))

    # Novos campos de métricas detalhadas
    op.add_column("gateway_metrics", sa.Column("emails_dropped", sa.Integer(), nullable=True))
    op.add_column("gateway_metrics", sa.Column("emails_hard_bounced", sa.Integer(), nullable=True))
    op.add_column("gateway_metrics", sa.Column("emails_soft_bounced", sa.Integer(), nullable=True))
    op.add_column("gateway_metrics", sa.Column("emails_opened", sa.Integer(), nullable=True))
    op.add_column("gateway_metrics", sa.Column("emails_clicked", sa.Integer(), nullable=True))

    # Migra dados existentes: emails_bounced → emails_hard_bounced
    op.execute("""
        UPDATE gateway_metrics
        SET emails_hard_bounced = emails_bounced
        WHERE emails_bounced IS NOT NULL
    """)

    # Remove coluna antiga
    op.drop_column("gateway_metrics", "emails_bounced")

    # Index para consultas por sub-account
    op.create_index(
        "ix_gateway_metrics_subaccount",
        "gateway_metrics",
        ["subaccount_id", "time"],
    )


def downgrade() -> None:
    op.drop_index("ix_gateway_metrics_subaccount", table_name="gateway_metrics")

    op.add_column("gateway_metrics", sa.Column("emails_bounced", sa.Integer(), nullable=True))

    op.execute("""
        UPDATE gateway_metrics
        SET emails_bounced = COALESCE(emails_hard_bounced, 0) + COALESCE(emails_soft_bounced, 0)
        WHERE emails_hard_bounced IS NOT NULL OR emails_soft_bounced IS NOT NULL
    """)

    op.drop_column("gateway_metrics", "emails_clicked")
    op.drop_column("gateway_metrics", "emails_opened")
    op.drop_column("gateway_metrics", "emails_soft_bounced")
    op.drop_column("gateway_metrics", "emails_hard_bounced")
    op.drop_column("gateway_metrics", "emails_dropped")
    op.drop_column("gateway_metrics", "subaccount_name")
    op.drop_column("gateway_metrics", "subaccount_id")
