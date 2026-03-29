import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/lib/api/alerts";

export const ALERTS_KEY = ["alerts"] as const;

export function useAlerts(params?: { acknowledged?: boolean; severity?: string; limit?: number }) {
  return useQuery({
    queryKey: [...ALERTS_KEY, params],
    queryFn: () => alertsApi.list(params),
    refetchInterval: 30_000,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}
