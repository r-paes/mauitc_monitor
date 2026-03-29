import { apiClient } from "./client";

export interface Instance {
  id: string;
  name: string;
  url: string;
  api_user: string;
  db_host: string | null;
  ssh_host: string | null;
  active: boolean;
}

export interface InstanceCreate {
  name: string;
  url: string;
  api_user: string;
  api_password: string;
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
  ssh_host?: string;
  ssh_port?: number;
  ssh_user?: string;
  ssh_key_path?: string;
}

export interface InstanceUpdate {
  name?: string;
  url?: string;
  api_user?: string;
  api_password?: string;
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
};
