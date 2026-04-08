import { apiClient } from "./client";

export interface VpsServer {
  id: string;
  name: string;
  host: string;
  ssh_port: number;
  ssh_user: string;
  public_key: string | null;
  active: boolean;
  instance_count: number;
}

export interface VpsServerCreate {
  name: string;
  host: string;
  ssh_port?: number;
  ssh_user?: string;
}

export interface VpsServerUpdate {
  name?: string;
  host?: string;
  ssh_port?: number;
  ssh_user?: string;
  active?: boolean;
}

export interface SshKeyOut {
  public_key: string;
}

export interface SshTestResult {
  success: boolean;
  message: string;
}

export const vpsServersApi = {
  list: () =>
    apiClient.get<VpsServer[]>("/vps-servers/").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<VpsServer>(`/vps-servers/${id}`).then((r) => r.data),

  create: (data: VpsServerCreate) =>
    apiClient.post<VpsServer>("/vps-servers/", data).then((r) => r.data),

  update: (id: string, data: VpsServerUpdate) =>
    apiClient.patch<VpsServer>(`/vps-servers/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/vps-servers/${id}`),

  generateSshKey: (id: string) =>
    apiClient.post<SshKeyOut>(`/vps-servers/${id}/generate-ssh-key`).then((r) => r.data),

  testSsh: (id: string) =>
    apiClient.post<SshTestResult>(`/vps-servers/${id}/test-ssh`).then((r) => r.data),
};
