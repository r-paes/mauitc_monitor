import { apiClient } from "./client";

export interface Alert {
  id: string;
  instance_id: string;
  instance_name?: string;
  severity: "warning" | "critical";
  type: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
  acknowledged_at: string | null;
}

export const alertsApi = {
  list: (params?: { acknowledged?: boolean; severity?: string; limit?: number }) =>
    apiClient.get<Alert[]>("/alerts/", { params }).then((r) => r.data),

  acknowledge: (id: string) =>
    apiClient.patch(`/alerts/${id}/acknowledge`).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/alerts/${id}`),
};
