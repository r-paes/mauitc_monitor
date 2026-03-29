"""
alembic/env.py — Configuração do ambiente de migração.

Usa DATABASE_URL do pydantic-settings e suporte async via asyncpg.
Todos os modelos são importados via app.models para que o Base.metadata
contenha o schema completo.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Importa settings e todos os modelos (necessário para Base.metadata)
from app.config import settings
from app.database import Base
import app.models  # noqa: F401 — registra todos os modelos no Base.metadata

# Configuração do Alembic
config = context.config

# Substitui sqlalchemy.url pelo DATABASE_URL do pydantic-settings
config.set_main_option("sqlalchemy.url", settings.database_url)

# Configura logging se ini tiver seção [loggers]
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata alvo para autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Executa migrações sem conexão ativa (modo offline)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Executa migrações com engine async."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Ponto de entrada para modo online (padrão)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
