"use client";

import { clsx } from "clsx";
import { AlertTriangle, AlertOctagon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { MESSAGES } from "@/lib/constants/ui";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { RECENT_ALERTS_LIMIT } from "@/lib/constants/behavior";

export function AlertsPanel() {
  const { data: alerts, isLoading } = useAlerts({
    acknowledged: false,
    limit: RECENT_ALERTS_LIMIT,
  });

  const criticalCount = alerts?.filter((a) => a.severity === "critical").length ?? 0;

  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-3">
        <CardHeader
          title="Alertas Recentes"
          actions={
            criticalCount > 0 ? (
              <Badge variant="critical">{criticalCount} crítico{criticalCount > 1 ? "s" : ""}</Badge>
            ) : undefined
          }
        />
      </div>

      {isLoading ? (
        <div className="pb-6"><PageSpinner /></div>
      ) : !alerts?.length ? (
        <p className="px-5 pb-5 text-sm text-[var(--color-text-muted)]">
          {MESSAGES.emptyStates.alerts}
        </p>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--color-surface-2)] transition-colors"
            >
              {/* Ícone de severidade */}
              <div className="mt-0.5 shrink-0">
                {alert.severity === "critical" ? (
                  <AlertOctagon size={15} className="text-[var(--color-critical)]" />
                ) : (
                  <AlertTriangle size={15} className="text-[var(--color-warning)]" />
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                {/* Instância destacada */}
                {alert.instance_name && (
                  <span
                    className={clsx(
                      "inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mb-1",
                      alert.severity === "critical"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}
                  >
                    {alert.instance_name}
                  </span>
                )}
                <p className="text-sm text-[var(--color-text)] leading-snug line-clamp-2">
                  {alert.message}
                </p>
              </div>

              {/* Hora */}
              <span className="shrink-0 text-[11px] text-[var(--color-text-muted)] tabular-nums mt-0.5">
                {format(new Date(alert.created_at), "HH:mm", { locale: ptBR })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
