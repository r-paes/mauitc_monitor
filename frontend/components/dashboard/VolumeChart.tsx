"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { useEmailTimeseries } from "@/lib/hooks/useMetrics";
import { PageSpinner } from "@/components/ui/Spinner";

interface ChartPoint {
  hour: string;
  email: number;
  sms: number;
}

function buildChartData(
  raw: { time: string; count: number; type: "email" | "sms" }[]
): ChartPoint[] {
  const map: Record<string, ChartPoint> = {};
  for (const item of raw) {
    const hour = new Date(item.time).getHours().toString().padStart(2, "0") + "h";
    if (!map[hour]) map[hour] = { hour, email: 0, sms: 0 };
    map[hour][item.type] += item.count;
  }
  return Object.values(map).sort((a, b) => a.hour.localeCompare(b.hour));
}

interface Props {
  instanceId?: string;
}

export function VolumeChart({ instanceId }: Props) {
  const { data: raw, isLoading } = useEmailTimeseries({
    instance_id: instanceId,
    hours: 8,
  });

  const chartData = raw ? buildChartData(raw) : [];

  return (
    <Card padding="none">
      <div className="px-5 pt-5 pb-2">
        <CardHeader
          title="Volume de Envios (últimas 8h)"
          actions={
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)] inline-block" />
                Email
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent)] inline-block" />
                SMS
              </span>
            </div>
          }
        />
      </div>

      {isLoading ? (
        <div className="pb-6"><PageSpinner /></div>
      ) : (
        <div className="px-2 pb-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                }}
                cursor={{ fill: "var(--color-surface-2)" }}
              />
              <Bar dataKey="email" name="Email" fill="var(--color-primary)" radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="email"
                  position="inside"
                  style={{ fontSize: 10, fill: "#fff", fontWeight: 600 }}
                  formatter={(v: number) => (v > 0 ? v.toLocaleString("pt-BR") : "")}
                />
              </Bar>
              <Bar dataKey="sms" name="SMS" fill="var(--color-accent)" radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="sms"
                  position="inside"
                  style={{ fontSize: 10, fill: "#fff", fontWeight: 600 }}
                  formatter={(v: number) => (v > 0 ? v.toLocaleString("pt-BR") : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
