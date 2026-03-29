"use client";

import { Badge, statusVariant } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { MESSAGES } from "@/lib/constants/ui";
import type { InstanceSummary, ContainerStatus } from "@/lib/api/metrics";

interface Row {
  instanceId: string;
  instanceName: string;
  container: ContainerStatus;
}

interface Props {
  instances: InstanceSummary[];
}

export function ContainersTable({ instances }: Props) {
  const rows: Row[] = instances.flatMap((inst) =>
    (inst.containers ?? []).map((c) => ({
      instanceId: inst.id,
      instanceName: inst.name,
      container: c,
    }))
  );

  const columns = [
    {
      key: "vps",
      header: "VPS / Instância",
      render: (row: Row) => (
        <Badge variant="info">{row.instanceName}</Badge>
      ),
    },
    {
      key: "container",
      header: "Container",
      render: (row: Row) => (
        <span className="font-mono text-xs text-[var(--color-text)]">
          {row.container.name}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Row) => (
        <Badge variant={statusVariant(row.container.status)} dot>
          {MESSAGES.status[row.container.status as keyof typeof MESSAGES.status] ?? row.container.status}
        </Badge>
      ),
    },
    {
      key: "restarts",
      header: "Restarts",
      align: "right" as const,
      render: (row: Row) => (
        <span
          className={
            (row.container.restart_count ?? 0) > 5
              ? "text-[var(--color-critical)] font-semibold tabular-nums"
              : "text-[var(--color-text-muted)] tabular-nums"
          }
        >
          {row.container.restart_count ?? 0}
        </span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={rows}
      keyExtractor={(row) => `${row.instanceId}-${row.container.name}`}
      emptyMessage={MESSAGES.emptyStates.vps}
    />
  );
}
