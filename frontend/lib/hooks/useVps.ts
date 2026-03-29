import { useQuery } from "@tanstack/react-query";
import { vpsApi } from "@/lib/api/vps";
import { DASHBOARD_REFRESH_INTERVAL_MS } from "@/lib/constants/behavior";

export function useVpsMetrics(params?: { instance_id?: string }) {
  return useQuery({
    queryKey: ["vps", params],
    queryFn: () => vpsApi.list(params),
    refetchInterval: DASHBOARD_REFRESH_INTERVAL_MS,
  });
}

export function useServiceLogs(params?: {
  instance_id?: string;
  container?: string;
  level?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["service-logs", params],
    queryFn: () => vpsApi.logs(params),
    refetchInterval: 60_000,
  });
}
