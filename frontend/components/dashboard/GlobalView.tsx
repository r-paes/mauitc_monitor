"use client";

import { Users, Mail, MessageSquare, Bell } from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { MESSAGES } from "@/lib/constants/ui";
import { InstanceCard } from "@/components/dashboard/InstanceCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import type { DashboardSummary } from "@/lib/api/metrics";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

interface Props {
  data: DashboardSummary;
  isLoading: boolean;
}

export function GlobalView({ data, isLoading }: Props) {
  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      {/* ── 4 Stat cards globais ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Novos Contatos"
          value={fmt(data.total_contacts_24h)}
          delta="↑ 12% vs ontem"
          deltaOk
          icon={<Users size={18} />}
          detail={
            <BreakdownList
              items={data.instances.map((i) => ({
                label: i.name,
                value: fmt(i.contacts_24h),
              }))}
            />
          }
        />
        <StatCard
          label="Emails Enviados"
          value={fmt(data.total_emails_sent)}
          delta="Gateway · Delta ok"
          deltaOk
          icon={<Mail size={18} />}
          detail={
            <BreakdownList
              items={data.instances.map((i) => ({
                label: i.name,
                value: fmt(i.emails_sent_mautic),
              }))}
            />
          }
        />
        <StatCard
          label="SMS Enviados"
          value={fmt(data.total_sms_sent)}
          delta="Gateway · Delta ok"
          deltaOk
          icon={<MessageSquare size={18} />}
          detail={
            <BreakdownList
              items={data.instances.map((i) => ({
                label: i.name,
                value: fmt(i.sms_sent_mautic),
              }))}
            />
          }
        />
        <StatCard
          label="Alertas Ativos"
          value={data.active_alerts}
          delta={
            data.critical_alerts > 0
              ? `${data.critical_alerts} crítico${data.critical_alerts > 1 ? "s" : ""} · ${data.active_alerts - data.critical_alerts} atenção`
              : "Nenhum crítico"
          }
          deltaOk={data.critical_alerts === 0}
          icon={<Bell size={18} />}
        />
      </div>

      {/* ── Cards de instâncias ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Instâncias Mautic
          </h2>
          <a
            href="/instances"
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            {MESSAGES.buttons.viewAll}
          </a>
        </div>

        {data.instances.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {MESSAGES.emptyStates.dashboard}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.instances.map((instance) => (
              <InstanceCard key={instance.id} instance={instance} />
            ))}
          </div>
        )}
      </section>

      {/* ── Alertas + Gráfico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertsPanel />
        <VolumeChart />
      </div>
    </div>
  );
}

// ── Breakdown por instância dentro de um StatCard ──────────────────────────

function BreakdownList({ items }: { items: { label: string; value: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 space-y-1 border-t border-[var(--color-border)] pt-2">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between items-center">
          <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[60%]">
            {item.label}
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-text)] tabular-nums">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
