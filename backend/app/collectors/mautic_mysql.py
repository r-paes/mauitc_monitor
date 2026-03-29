"""
mautic_mysql.py — Coleta de estatísticas via conexão direta ao MySQL das instâncias Mautic.

Queries de leitura apenas. Fornece dados para geração de relatórios:
emails enviados, SMS enviados, novos contatos, empresas ativas.
"""

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import aiomysql

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Queries SQL ──────────────────────────────────────────────────────────────

QUERY_EMAIL_STATS = """
    SELECT
        COUNT(*) AS total_sent,
        SUM(CASE WHEN is_failed = 1 THEN 1 ELSE 0 END) AS total_failed,
        SUM(CASE WHEN open_count > 0 THEN 1 ELSE 0 END) AS total_opened,
        SUM(CASE WHEN click_count > 0 THEN 1 ELSE 0 END) AS total_clicked
    FROM email_stats
    WHERE is_failed = 0
      AND date_sent IS NOT NULL
      AND date_sent >= %s
      AND date_sent < %s
"""

QUERY_EMAIL_QUEUE = """
    SELECT COUNT(*) AS queued
    FROM email_stats
    WHERE is_failed = 0
      AND date_sent IS NULL
"""

QUERY_SMS_STATS = """
    SELECT
        COUNT(*) AS total_sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS total_failed
    FROM sms_messages
    WHERE date_sent >= %s
      AND date_sent < %s
      AND status IN ('sent', 'failed')
"""

QUERY_NEW_CONTACTS = """
    SELECT COUNT(*) AS total
    FROM leads
    WHERE date_added >= %s
      AND date_added < %s
      AND is_published = 1
"""

QUERY_ACTIVE_CONTACTS = """
    SELECT COUNT(*) AS total
    FROM leads
    WHERE is_published = 1
      AND is_bot IS NULL
"""

QUERY_COMPANY_EMAIL_STATS = """
    SELECT
        COUNT(*) AS total_sent,
        SUM(CASE WHEN es.open_count > 0 THEN 1 ELSE 0 END) AS total_opened,
        SUM(CASE WHEN es.click_count > 0 THEN 1 ELSE 0 END) AS total_clicked
    FROM email_stats es
    INNER JOIN leads l ON l.id = es.lead_id
    INNER JOIN companies_leads cl ON cl.lead_id = l.id
    WHERE cl.company_id = %s
      AND es.is_failed = 0
      AND es.date_sent IS NOT NULL
      AND es.date_sent >= %s
      AND es.date_sent < %s
"""

QUERY_COMPANY_SMS_STATS = """
    SELECT COUNT(*) AS total_sent
    FROM sms_messages sm
    INNER JOIN leads l ON l.id = sm.lead_id
    INNER JOIN companies_leads cl ON cl.lead_id = l.id
    WHERE cl.company_id = %s
      AND sm.status = 'sent'
      AND sm.date_sent >= %s
      AND sm.date_sent < %s
"""

QUERY_COMPANY_NEW_CONTACTS = """
    SELECT COUNT(*) AS total
    FROM leads l
    INNER JOIN companies_leads cl ON cl.lead_id = l.id
    WHERE cl.company_id = %s
      AND l.date_added >= %s
      AND l.date_added < %s
      AND l.is_published = 1
"""

QUERY_COMPANY_ACTIVE_CONTACTS = """
    SELECT COUNT(*) AS total
    FROM leads l
    INNER JOIN companies_leads cl ON cl.lead_id = l.id
    WHERE cl.company_id = %s
      AND l.is_published = 1
      AND l.is_bot IS NULL
"""


class MauticMySQLCollector:
    """
    Coleta estatísticas via conexão direta ao banco MySQL de uma instância Mautic.
    Cada instância tem seu próprio banco e credenciais (armazenados criptografados).
    """

    def __init__(self, host: str, port: int, dbname: str, user: str, password: str):
        # Parâmetros separados — nunca montar DSN string com senha
        self._host = host
        self._port = port
        self._dbname = dbname
        self._user = user
        self._password = password
        self.host = host  # usado em mensagens de log

    async def _connect(self) -> aiomysql.Connection:
        """Cria conexão aiomysql com timeout configurável."""
        return await aiomysql.connect(
            host=self._host,
            port=self._port,
            db=self._dbname,
            user=self._user,
            password=self._password,
            connect_timeout=settings.mautic_mysql_connect_timeout,
            charset="utf8mb4",
            autocommit=True,
        )

    async def ping(self) -> Optional[int]:
        """Mede latência de conexão em milissegundos. Retorna None se falhar."""
        start = time.monotonic()
        conn = None
        try:
            conn = await self._connect()
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
            return int((time.monotonic() - start) * 1000)
        except Exception as e:
            logger.warning("Erro ao conectar MySQL %s: %s", self.host, e)
            return None
        finally:
            if conn:
                conn.close()

    async def get_email_stats(
        self,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        """Retorna estatísticas de email no período."""
        conn = None
        try:
            conn = await self._connect()
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(QUERY_EMAIL_STATS, (period_start, period_end))
                row = await cur.fetchone()
                queue_row = None
                await cur.execute(QUERY_EMAIL_QUEUE)
                queue_row = await cur.fetchone()
            return {
                "total_sent": int(row["total_sent"] or 0),
                "total_failed": int(row["total_failed"] or 0),
                "total_opened": int(row["total_opened"] or 0),
                "total_clicked": int(row["total_clicked"] or 0),
                "queued": int((queue_row or {}).get("queued") or 0),
            }
        except Exception as e:
            logger.warning("Erro ao coletar email_stats de %s: %s", self.host, e)
            return {"total_sent": 0, "total_failed": 0, "total_opened": 0, "total_clicked": 0, "queued": 0}
        finally:
            if conn:
                conn.close()

    async def get_sms_stats(
        self,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        """Retorna estatísticas de SMS no período. Tabela pode não existir."""
        conn = None
        try:
            conn = await self._connect()
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(QUERY_SMS_STATS, (period_start, period_end))
                row = await cur.fetchone()
            return {
                "total_sent": int(row["total_sent"] or 0),
                "total_failed": int(row["total_failed"] or 0),
            }
        except aiomysql.Error as e:
            # tabela sms_messages pode não existir nessa instalação
            logger.debug("sms_messages indisponível em %s: %s", self.host, e)
            return {"total_sent": 0, "total_failed": 0}
        finally:
            if conn:
                conn.close()

    async def get_contact_stats(
        self,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        """Retorna contatos novos no período e total ativo."""
        conn = None
        try:
            conn = await self._connect()
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(QUERY_NEW_CONTACTS, (period_start, period_end))
                new_row = await cur.fetchone()
                await cur.execute(QUERY_ACTIVE_CONTACTS)
                active_row = await cur.fetchone()
            return {
                "new_contacts": int((new_row or {}).get("total") or 0),
                "active_contacts": int((active_row or {}).get("total") or 0),
            }
        except Exception as e:
            logger.warning("Erro ao coletar contatos de %s: %s", self.host, e)
            return {"new_contacts": 0, "active_contacts": 0}
        finally:
            if conn:
                conn.close()

    async def get_company_email_stats(
        self,
        company_id: int,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        """Estatísticas de email filtradas por empresa (mautic_company_id)."""
        conn = None
        try:
            conn = await self._connect()
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(QUERY_COMPANY_EMAIL_STATS, (company_id, period_start, period_end))
                row = await cur.fetchone()
            return {
                "total_sent": int(row["total_sent"] or 0),
                "total_opened": int(row["total_opened"] or 0),
                "total_clicked": int(row["total_clicked"] or 0),
            }
        except Exception as e:
            logger.warning("Erro ao coletar email stats empresa %s em %s: %s", company_id, self.host, e)
            return {"total_sent": 0, "total_opened": 0, "total_clicked": 0}
        finally:
            if conn:
                conn.close()

    async def get_company_sms_stats(
        self,
        company_id: int,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        """Estatísticas de SMS filtradas por empresa."""
        conn = None
        try:
            conn = await self._connect()
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(QUERY_COMPANY_SMS_STATS, (company_id, period_start, period_end))
                row = await cur.fetchone()
            return {"total_sent": int(row["total_sent"] or 0)}
        except Exception as e:
            logger.debug("SMS stats empresa %s indisponível em %s: %s", company_id, self.host, e)
            return {"total_sent": 0}
        finally:
            if conn:
                conn.close()

    async def get_company_contact_stats(
        self,
        company_id: int,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        """Contatos novos e ativos filtrados por empresa."""
        conn = None
        try:
            conn = await self._connect()
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(QUERY_COMPANY_NEW_CONTACTS, (company_id, period_start, period_end))
                new_row = await cur.fetchone()
                await cur.execute(QUERY_COMPANY_ACTIVE_CONTACTS, (company_id,))
                active_row = await cur.fetchone()
            return {
                "new_contacts": int((new_row or {}).get("total") or 0),
                "active_contacts": int((active_row or {}).get("total") or 0),
            }
        except Exception as e:
            logger.warning("Erro ao coletar contatos empresa %s em %s: %s", company_id, self.host, e)
            return {"new_contacts": 0, "active_contacts": 0}
        finally:
            if conn:
                conn.close()

    async def collect_for_report(
        self,
        period_start: datetime,
        period_end: datetime,
        company_id: Optional[int] = None,
    ) -> dict:
        """
        Coleta completa para geração de relatório.
        Se company_id informado, filtra estatísticas por empresa.
        """
        if company_id:
            email_stats = await self.get_company_email_stats(company_id, period_start, period_end)
            sms_stats = await self.get_company_sms_stats(company_id, period_start, period_end)
            contact_stats = await self.get_company_contact_stats(company_id, period_start, period_end)
        else:
            email_stats = await self.get_email_stats(period_start, period_end)
            sms_stats = await self.get_sms_stats(period_start, period_end)
            contact_stats = await self.get_contact_stats(period_start, period_end)

        return {
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "email": email_stats,
            "sms": sms_stats,
            "contacts": contact_stats,
        }
