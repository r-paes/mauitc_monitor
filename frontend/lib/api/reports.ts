import { apiClient } from "./client";

export interface ReportConfig {
  id: string;
  instance_id: string;
  company_name: string;
  mautic_company_id: number | null;
  report_email: string;
  report_phone: string | null;
  send_email: boolean;
  send_sms: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportConfigCreate {
  instance_id: string;
  company_name: string;
  mautic_company_id?: number;
  report_email: string;
  report_phone?: string;
  send_email?: boolean;
  send_sms?: boolean;
  active?: boolean;
}

export interface ReportConfigUpdate {
  company_name?: string;
  mautic_company_id?: number;
  report_email?: string;
  report_phone?: string;
  send_email?: boolean;
  send_sms?: boolean;
  active?: boolean;
}

export interface ReportHistory {
  id: string;
  report_config_id: string;
  instance_id: string | null;
  generated_at: string;
  period_start: string;
  period_end: string;
  trigger: "scheduled" | "manual";
  status: "pending" | "generating" | "success" | "error";
  file_url: string | null;
  email_stats_json: Record<string, number> | null;
  sms_stats_json: Record<string, number> | null;
  sent_email: boolean;
  sent_sms: boolean;
  error_message: string | null;
}

export interface GenerateRequest {
  period_start?: string;
  period_end?: string;
}

export const reportsApi = {
  // Configs
  listConfigs: (params?: { instance_id?: string; active_only?: boolean }) =>
    apiClient.get<ReportConfig[]>("/reports/configs", { params }).then((r) => r.data),

  getConfig: (id: string) =>
    apiClient.get<ReportConfig>(`/reports/configs/${id}`).then((r) => r.data),

  createConfig: (data: ReportConfigCreate) =>
    apiClient.post<ReportConfig>("/reports/configs", data).then((r) => r.data),

  updateConfig: (id: string, data: ReportConfigUpdate) =>
    apiClient.patch<ReportConfig>(`/reports/configs/${id}`, data).then((r) => r.data),

  deleteConfig: (id: string) =>
    apiClient.delete(`/reports/configs/${id}`),

  // Geração
  generate: (configId: string, data?: GenerateRequest) =>
    apiClient
      .post<ReportHistory>(`/reports/configs/${configId}/generate`, data ?? {})
      .then((r) => r.data),

  // Histórico
  listHistory: (params?: {
    config_id?: string;
    instance_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) =>
    apiClient.get<ReportHistory[]>("/reports/history", { params }).then((r) => r.data),

  getHistory: (id: string) =>
    apiClient.get<ReportHistory>(`/reports/history/${id}`).then((r) => r.data),

  downloadUrl: (id: string) =>
    `${apiClient.defaults.baseURL}/reports/history/${id}/download`,
};
