import { apiFetch } from "../../../lib/apiClient";

type SignupResponse = {
  accessToken: string;
  refreshToken: string;
};

export function signup(email: string, password: string, nickname: string) {
  return apiFetch<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, nickname }),
  });
}
