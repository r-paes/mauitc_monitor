import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reportsApi,
  type ReportConfigCreate,
  type ReportConfigUpdate,
  type GenerateRequest,
} from "@/lib/api/reports";

export const REPORT_CONFIGS_KEY = ["report-configs"] as const;
export const REPORT_HISTORY_KEY = ["report-history"] as const;

export function useReportConfigs(params?: { instance_id?: string; active_only?: boolean }) {
  return useQuery({
    queryKey: [...REPORT_CONFIGS_KEY, params],
    queryFn: () => reportsApi.listConfigs(params),
  });
}

export function useReportHistory(params?: {
  config_id?: string;
  instance_id?: string;
  status?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...REPORT_HISTORY_KEY, params],
    queryFn: () => reportsApi.listHistory(params),
  });
}

export function useCreateReportConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReportConfigCreate) => reportsApi.createConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPORT_CONFIGS_KEY }),
  });
}

export function useUpdateReportConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReportConfigUpdate }) =>
      reportsApi.updateConfig(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPORT_CONFIGS_KEY }),
  });
}

export function useDeleteReportConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsApi.deleteConfig(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORT_CONFIGS_KEY });
      qc.invalidateQueries({ queryKey: REPORT_HISTORY_KEY });
    },
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ configId, data }: { configId: string; data?: GenerateRequest }) =>
      reportsApi.generate(configId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPORT_HISTORY_KEY }),
  });
}
