import { apiClient } from "./client";

export interface InstanceService {
  id: string;
  service_type: "database" | "crons" | "web";
  container_name: string;
  active: boolean;
}

export interface Instance {
  id: string;
  name: string;
  url: string;
  api_user: string;
  vps_id: string | null;
  vps_name: string | null;
  db_host: string | null;
  active: boolean;
  services: InstanceService[];
}

export interface InstanceCreate {
  name: string;
  url: string;
  api_user: string;
  api_password: string;
  vps_id?: string;
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
}

export interface InstanceUpdate {
  name?: string;
  url?: string;
  api_user?: string;
  api_password?: string;
  active?: boolean;
  vps_id?: string | null;
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
}

export interface ServiceCreate {
  service_type: string;
  container_name: string;
}

export interface ServiceUpdate {
  container_name?: string;
  active?: boolean;
}

export const instancesApi = {
  list: () =>
    apiClient.get<Instance[]>("/instances/").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Instance>(`/instances/${id}`).then((r) => r.data),

  create: (data: InstanceCreate) =>
    apiClient.post<Instance>("/instances/", data).then((r) => r.data),

  update: (id: string, data: InstanceUpdate) =>
    apiClient.patch<Instance>(`/instances/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/instances/${id}`),

  // Services (containers monitorados)
  listServices: (instanceId: string) =>
    apiClient.get<InstanceService[]>(`/instances/${instanceId}/services`).then((r) => r.data),

  createService: (instanceId: string, data: ServiceCreate) =>
    apiClient.post<InstanceService>(`/instances/${instanceId}/services`, data).then((r) => r.data),

  updateService: (instanceId: string, serviceId: string, data: ServiceUpdate) =>
    apiClient.patch<InstanceService>(`/instances/${instanceId}/services/${serviceId}`, data).then((r) => r.data),

  removeService: (instanceId: string, serviceId: string) =>
    apiClient.delete(`/instances/${instanceId}/services/${serviceId}`),
};
