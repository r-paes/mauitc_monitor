"use client";

import { Mail, CheckCircle, XCircle, AlertTriangle, MessageSquare, CreditCard } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { MESSAGES } from "@/lib/constants/ui";
import { useAvantStats } from "@/lib/hooks/useGatewayConfig";
import type { GatewayMetric } from "@/lib/api/metrics";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

function deliveryRate(sent: number | null, delivered: number | null) {
  if (!sent || !delivered) return null;
  return `${((delivered / sent) * 100).toFixed(1)}% entrega`;
}

// ─── Sendpost (email) ────────────────────────────────────────────────────────

interface SendpostCardsProps {
  metrics: GatewayMetric[];
}

interface SubAccountRow {
  name: string;
  sent: number;
  delivered: number;
  dropped: number;
  hardBounced: number;
  softBounced: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  spam: number;
}

function aggregateBySubAccount(metrics: GatewayMetric[]): SubAccountRow[] {
  const map = new Map<string, SubAccountRow>();
  for (const m of metrics) {
    // Ignora entries fantasma (sem sub-account e sem dados)
    if (!m.subaccount_name && m.emails_sent == null) continue;

    const key = m.subaccount_name ?? "Conta";
    const existing = map.get(key);
    if (existing) {
      existing.sent += m.emails_sent ?? 0;
      existing.delivered += m.emails_delivered ?? 0;
      existing.dropped += m.emails_dropped ?? 0;
      existing.hardBounced += m.emails_hard_bounced ?? 0;
      existing.softBounced += m.emails_soft_bounced ?? 0;
      existing.opened += m.emails_opened ?? 0;
      existing.clicked += m.emails_clicked ?? 0;
      existing.unsubscribed += m.emails_unsubscribed ?? 0;
      existing.spam += m.emails_spam ?? 0;
    } else {
      map.set(key, {
        name: key,
        sent: m.emails_sent ?? 0,
        delivered: m.emails_delivered ?? 0,
        dropped: m.emails_dropped ?? 0,
        hardBounced: m.emails_hard_bounced ?? 0,
        softBounced: m.emails_soft_bounced ?? 0,
        opened: m.emails_opened ?? 0,
        clicked: m.emails_clicked ?? 0,
        unsubscribed: m.emails_unsubscribed ?? 0,
        spam: m.emails_spam ?? 0,
      });
    }
  }
  return Array.from(map.values());
}

export function SendpostCards({ metrics }: SendpostCardsProps) {
  const sendpost = metrics.filter((m) => m.gateway_type === "sendpost");
  const rows = aggregateBySubAccount(sendpost);

  const totals = rows.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      delivered: acc.delivered + r.delivered,
      dropped: acc.dropped + r.dropped,
      hardBounced: acc.hardBounced + r.hardBounced,
      softBounced: acc.softBounced + r.softBounced,
      opened: acc.opened + r.opened,
      clicked: acc.clicked + r.clicked,
      unsubscribed: acc.unsubscribed + r.unsubscribed,
      spam: acc.spam + r.spam,
    }),
    { sent: 0, delivered: 0, dropped: 0, hardBounced: 0, softBounced: 0, opened: 0, clicked: 0, unsubscribed: 0, spam: 0 }
  );

  const totalBounces = totals.hardBounced + totals.softBounced;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
        {MESSAGES.emptyStates.gateways}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de totais consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Emails Enviados"
          value={fmt(totals.sent)}
          delta={deliveryRate(totals.sent, totals.delivered) ?? undefined}
          deltaOk
          icon={<Mail size={18} />}
        />
        <StatCard
          label="Entregues"
          value={fmt(totals.delivered)}
          icon={<CheckCircle size={18} />}
        />
        <StatCard
          label="Bounces"
          value={fmt(totalBounces)}
          deltaOk={totalBounces === 0}
          delta={totalBounces > 0 ? "Verificar lista" : "Dentro do limite"}
          icon={<XCircle size={18} />}
        />
        <StatCard
          label="Spam"
          value={fmt(totals.spam)}
          deltaOk={totals.spam === 0}
          delta={totals.spam > 0 ? "Atenção requerida" : "Sem ocorrências"}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Tabela consolidada por sub-account */}
      <SendpostSubAccountTable rows={rows} />
    </div>
  );
}

const SENDPOST_COLS = [
  "Processed", "Delivered", "Dropped", "Hard Bounce",
  "Soft Bounce", "Opened", "Clicked", "Unsubscribed", "Spam",
] as const;

function SendpostSubAccountTable({ rows }: { rows: SubAccountRow[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
              Sub-account
            </th>
            {SENDPOST_COLS.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.name}
              className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <td className="px-4 py-3 font-medium text-[var(--color-text)]">{r.name}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">{fmt(r.sent)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">{fmt(r.delivered)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">{fmt(r.dropped)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">
                <span className={r.hardBounced > 0 ? "text-[var(--color-error)]" : ""}>{fmt(r.hardBounced)}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">
                <span className={r.softBounced > 0 ? "text-[var(--color-warning)]" : ""}>{fmt(r.softBounced)}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">{fmt(r.opened)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">{fmt(r.clicked)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">{fmt(r.unsubscribed)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">
                <span className={r.spam > 0 ? "text-[var(--color-error)]" : ""}>{fmt(r.spam)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Avant SMS ───────────────────────────────────────────────────────────────

interface AvantCardsProps {
  metrics: GatewayMetric[];
}

export function AvantCards({ metrics }: AvantCardsProps) {
  const { data: avantStats, isLoading: statsLoading } = useAvantStats();

  // Stat cards globais — dados do endpoint /gateways/avant/stats
  const balance = avantStats?.balance ?? null;
  const byClient = avantStats?.by_client ?? [];

  const clientTotals = byClient.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sms_sent,
      delivered: acc.delivered + c.sms_delivered,
      failed: acc.failed + c.sms_failed,
    }),
    { sent: 0, delivered: 0, failed: 0 }
  );

  // Fallback: se não há dados do endpoint de stats, usa métricas do GatewayMetric
  const avant = metrics.filter((m) => m.gateway_type === "avant");
  const metricTotals = avant.reduce(
    (acc, m) => ({
      sent: acc.sent + (m.sms_sent ?? 0),
      delivered: acc.delivered + (m.sms_delivered ?? 0),
      failed: acc.failed + (m.sms_failed ?? 0),
      balance: m.balance_credits ?? acc.balance,
    }),
    { sent: 0, delivered: 0, failed: 0, balance: null as number | null }
  );

  const totals = byClient.length > 0 ? clientTotals : metricTotals;
  const displayBalance = balance ?? metricTotals.balance;

  if (avant.length === 0 && !statsLoading && byClient.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
        {MESSAGES.emptyStates.gateways}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="SMS Enviados"
          value={fmt(totals.sent)}
          delta={deliveryRate(totals.sent, totals.delivered) ?? undefined}
          deltaOk
          icon={<MessageSquare size={18} />}
        />
        <StatCard
          label="Entregues"
          value={fmt(totals.delivered)}
          icon={<CheckCircle size={18} />}
        />
        <StatCard
          label="Falhas"
          value={fmt(totals.failed)}
          deltaOk={totals.failed === 0}
          delta={totals.failed > 0 ? "Verificar gateway" : "Sem falhas"}
          icon={<XCircle size={18} />}
        />
        <StatCard
          label="Saldo (creditos)"
          value={fmt(displayBalance)}
          deltaOk={displayBalance != null && displayBalance > 1000}
          delta={
            displayBalance == null
              ? undefined
              : displayBalance <= 1000
              ? "Saldo baixo"
              : "Saldo ok"
          }
          icon={<CreditCard size={18} />}
        />
      </div>

      {/* Tabela por cliente (costCenterCode) */}
      {byClient.length > 0 && (
        <div className="w-full overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
                  Cost Center
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
                  Enviados
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
                  Entregues
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
                  Falhas
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
                  Taxa
                </th>
              </tr>
            </thead>
            <tbody>
              {byClient.map((c) => {
                const rate =
                  c.sms_sent > 0
                    ? ((c.sms_delivered / c.sms_sent) * 100).toFixed(1) + "%"
                    : "—";
                return (
                  <tr
                    key={c.cost_center_code}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                      {c.client_name}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs font-mono">
                      {c.cost_center_code}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--color-text)]">
                      {fmt(c.sms_sent)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--color-text)]">
                      {fmt(c.sms_delivered)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--color-text)]">
                      <span className={c.sms_failed > 0 ? "text-[var(--color-warning)]" : ""}>
                        {fmt(c.sms_failed)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--color-text)]">
                      {rate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Delta Alerts ────────────────────────────────────────────────────────────

interface DeltaCardsProps {
  metrics: GatewayMetric[];
}

export function DeltaAlertCards({ metrics }: DeltaCardsProps) {
  const delta = metrics.filter((m) => m.gateway_type === "delta");

  if (delta.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
        {MESSAGES.emptyStates.gateways}
      </p>
    );
  }

  const totals = delta.reduce(
    (acc, m) => ({
      sent: acc.sent + (m.emails_sent ?? 0) + (m.sms_sent ?? 0),
      delivered: acc.delivered + (m.emails_delivered ?? 0) + (m.sms_delivered ?? 0),
      failed: acc.failed + (m.emails_hard_bounced ?? 0) + (m.emails_soft_bounced ?? 0) + (m.sms_failed ?? 0),
    }),
    { sent: 0, delivered: 0, failed: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Alertas Disparados"
          value={fmt(totals.sent)}
          icon={<AlertTriangle size={18} />}
        />
        <StatCard
          label="Entregues"
          value={fmt(totals.delivered)}
          delta={deliveryRate(totals.sent, totals.delivered) ?? undefined}
          deltaOk
          icon={<CheckCircle size={18} />}
        />
        <StatCard
          label="Falhas de Entrega"
          value={fmt(totals.failed)}
          deltaOk={totals.failed === 0}
          delta={totals.failed > 0 ? "Verificar configuração" : "Sem falhas"}
          icon={<XCircle size={18} />}
        />
      </div>

      <BreakdownTable
        rows={delta.map((m) => ({
          type: m.gateway_type,
          cols: [
            { label: "Email",    value: fmt(m.emails_sent) },
            { label: "SMS",      value: fmt(m.sms_sent) },
            { label: "Entregues", value: fmt((m.emails_delivered ?? 0) + (m.sms_delivered ?? 0)) },
            { label: "Falhas",   value: fmt((m.emails_hard_bounced ?? 0) + (m.emails_soft_bounced ?? 0) + (m.sms_failed ?? 0)) },
          ],
        }))}
      />
    </div>
  );
}

// ─── Tabela de breakdown compartilhada ───────────────────────────────────────

interface BreakdownRow {
  type: string;
  cols: { label: string; value: string }[];
}

function BreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  if (!rows.length) return null;
  const headers = rows[0].cols.map((c) => c.label);

  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]">
              Gateway
            </th>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-right text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <td className="px-4 py-3 font-medium text-[var(--color-text)] capitalize">
                {row.type}
              </td>
              {row.cols.map((col) => (
                <td
                  key={col.label}
                  className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--color-text)]"
                >
                  {col.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
