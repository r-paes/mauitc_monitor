"use client";

import { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { Topnav } from "@/components/layout/Topnav";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { VpsResourceCards } from "@/components/dashboard/vps/VpsResourceCards";
import { ContainersTable } from "@/components/dashboard/vps/ContainersTable";
import { LogsTable } from "@/components/dashboard/vps/LogsTable";
import { useVpsMetrics } from "@/lib/hooks/useVps";
import { useDashboard } from "@/lib/hooks/useMetrics";
import { useTabParam } from "@/lib/hooks/useTabParam";
import { MESSAGES, PAGE_TABS } from "@/lib/constants/ui";

function VpsContent() {
  const [activeTab, setTab] = useTabParam("resources");

  const { data: vpsMetrics, isLoading: loadingVps, refetch } = useVpsMetrics();
  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();

  const isLoading = loadingVps || loadingDashboard;

  // Mapa instance_id → name para os três sub-componentes
  const instanceNames: Record<string, string> = Object.fromEntries(
    (dashboard?.instances ?? []).map((i) => [i.id, i.name])
  );

  const topnavTabs = (
    <Tabs
      tabs={PAGE_TABS.vps as unknown as { key: string; label: string }[]}
      active={activeTab}
      onChange={setTab}
      variant="topnav"
    />
  );

  const topnavActions = (
    <Button
      variant="primary"
      size="md"
      icon={<RefreshCw size={14} />}
      onClick={() => refetch()}
      loading={isLoading}
    >
      <span className="hidden sm:inline">{MESSAGES.buttons.refresh}</span>
    </Button>
  );

  return (
    <>
      <Topnav title="VPS & Logs" tabs={topnavTabs} actions={topnavActions} />

      <div className="px-4 md:px-6 py-5">
        {isLoading && !vpsMetrics ? (
          <PageSpinner />
        ) : (
          <>
            {activeTab === "resources" && (
              <VpsResourceCards
                metrics={vpsMetrics ?? []}
                instanceNames={instanceNames}
              />
            )}

            {activeTab === "containers" && (
              <Card padding="none">
                <ContainersTable instances={dashboard?.instances ?? []} />
              </Card>
            )}

            {activeTab === "logs" && (
              <LogsTable instanceNames={instanceNames} />
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function VpsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Topnav title="VPS & Logs" />
          <div className="px-4 md:px-6 py-5"><PageSpinner /></div>
        </>
      }
    >
      <VpsContent />
    </Suspense>
  );
}
