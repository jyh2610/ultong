import { useAuthStore } from "../store/authStore";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// /auth/refresh와의 무한 재시도 루프를 막기 위해, 401을 받아도 재발급을 시도하지 않는 경로
const NO_REFRESH_RETRY_PATHS = ["/auth/refresh", "/auth/login", "/auth/signup", "/auth/kakao"];

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          await useAuthStore.getState().clear();
          return null;
        }

        const data = (await response.json()) as { accessToken: string; refreshToken: string };
        await useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function doFetch(path: string, init: RequestInit | undefined, accessToken: string | null) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await doFetch(path, init, useAuthStore.getState().accessToken);

  if (response.status === 401 && !NO_REFRESH_RETRY_PATHS.includes(path)) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await doFetch(path, init, newAccessToken);
    }
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(`API request failed: ${response.status} ${path}`, response.status, data);
  }

  return data as T;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof ApiError &&
    typeof error.body === "object" &&
    error.body !== null &&
    "message" in error.body
  ) {
    const { message } = error.body as { message: unknown };
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return fallback;
}
