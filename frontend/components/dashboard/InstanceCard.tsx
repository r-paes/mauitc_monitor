"use client";

import { clsx } from "clsx";
import { Globe, Database, Wifi } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import type { InstanceSummary } from "@/lib/api/metrics";

function fmt(n: number | null | undefined, suffix = "") {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR") + suffix;
}

function latencyLabel(ms: number | null | undefined) {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function DeltaMiniCard({
  label,
  mautic,
  gateway,
  pct,
  ok,
}: {
  label: string;
  mautic: number | null;
  gateway: number | null;
  pct?: number;
  ok?: boolean;
}) {
  return (
    <div
      className="flex-1 rounded-md p-2.5 text-xs"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <p className="font-semibold mb-1.5" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <div className="flex items-center justify-between gap-1">
        <span style={{ color: "var(--color-text)" }}>
          Mautic {fmt(mautic)} → Gateway {fmt(gateway)}
        </span>
        {pct != null && (
          <span
            className={clsx(
              "font-bold tabular-nums",
              ok ? "text-[var(--color-ok)]" : "text-[var(--color-warning)]"
            )}
          >
            Δ{pct.toFixed(1)}%{ok ? " ✓" : " ▲"}
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  instance: InstanceSummary;
}

export function InstanceCard({ instance }: Props) {
  const emailPct =
    instance.emails_sent_mautic && instance.emails_sent_gateway
      ? Math.abs(
          ((instance.emails_sent_gateway - instance.emails_sent_mautic) /
            instance.emails_sent_mautic) *
            100
        )
      : undefined;

  const smsPct =
    instance.sms_sent_mautic && instance.sms_sent_gateway
      ? Math.abs(
          ((instance.sms_sent_gateway - instance.sms_sent_mautic) /
            instance.sms_sent_mautic) *
            100
        )
      : undefined;

  return (
    <div
      className="rounded-[var(--radius-md)] border p-4 flex flex-col gap-3"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {instance.name}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] truncate">
            {instance.url.replace(/^https?:\/\//, "")}
          </p>
        </div>
        <Badge variant={statusVariant(instance.status)} dot>
          {instance.status === "online"
            ? "Online"
            : instance.status === "degraded"
            ? "Degradado"
            : "Offline"}
        </Badge>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold tabular-nums text-[var(--color-text)]">
            {fmt(instance.contacts_24h)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Contatos/24h
          </p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-[var(--color-text)]">
            {fmt(instance.active_campaigns)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Campanhas
          </p>
        </div>
        <div>
          <p
            className={clsx(
              "text-lg font-bold tabular-nums",
              instance.api_response_ms && instance.api_response_ms > 2000
                ? "text-[var(--color-warning)]"
                : "text-[var(--color-text)]"
            )}
          >
            {latencyLabel(instance.api_response_ms)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
            Latência
          </p>
        </div>
      </div>

      {/* Mini-cards Delta */}
      <div className="flex gap-2">
        <DeltaMiniCard
          label="Email"
          mautic={instance.emails_sent_mautic}
          gateway={instance.emails_sent_gateway}
          pct={emailPct}
          ok={emailPct != null && emailPct <= 5}
        />
        <DeltaMiniCard
          label="SMS"
          mautic={instance.sms_sent_mautic}
          gateway={instance.sms_sent_gateway}
          pct={smsPct}
          ok={smsPct != null && smsPct <= 5}
        />
      </div>

      {/* Containers */}
      {instance.containers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {instance.containers.map((c) => (
            <span
              key={c.name}
              className={clsx(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                c.status === "running"
                  ? "border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-900/20"
                  : "border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20"
              )}
            >
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  c.status === "running" ? "bg-green-500" : "bg-red-500"
                )}
              />
              {c.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
