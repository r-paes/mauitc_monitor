import { apiClient } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  active: boolean;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient
      .post<AuthTokens>("/auth/login", new URLSearchParams({
        username: payload.username,
        password: payload.password,
      }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
      .then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<AuthTokens>("/auth/refresh", { refresh_token: refreshToken })
      .then((r) => r.data),

  me: () =>
    apiClient.get<Me>("/auth/me").then((r) => r.data),
};
