import { apiClient } from "./client";

export interface SchedulerConfig {
  id: string;
  config_key: string;
  interval_minutes: number;
  description: string;
}

export interface SchedulerConfigUpdate {
  interval_minutes: number;
}

export const schedulerApi = {
  list: () =>
    apiClient.get<SchedulerConfig[]>("/scheduler/config").then((r) => r.data),

  update: (key: string, data: SchedulerConfigUpdate) =>
    apiClient.patch<SchedulerConfig>(`/scheduler/config/${key}`, data).then((r) => r.data),
};
