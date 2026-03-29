import { apiClient } from "./client";

export interface VpsMetric {
  time: string;
  instance_id: string;
  cpu_percent: number | null;
  memory_percent: number | null;
  memory_used_mb: number | null;
  memory_total_mb: number | null;
  disk_percent: number | null;
  disk_used_gb: number | null;
  disk_total_gb: number | null;
  load_avg_1m: number | null;
}

export interface ServiceLog {
  id: string;
  instance_id: string;
  instance_name?: string;
  container_name: string;
  log_level: "CRIT" | "ERROR" | "WARN" | "INFO";
  message: string;
  pattern_matched: string | null;
  captured_at: string;
}

export const vpsApi = {
  list: (params?: { instance_id?: string }) =>
    apiClient.get<VpsMetric[]>("/vps/", { params }).then((r) => r.data),

  logs: (params?: {
    instance_id?: string;
    container?: string;
    level?: string;
    limit?: number;
  }) =>
    apiClient.get<ServiceLog[]>("/vps/logs", { params }).then((r) => r.data),
};
