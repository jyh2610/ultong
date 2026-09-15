import { apiFetch } from "../../../lib/apiClient";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
