import { create } from "zustand";
import { clearTokens, loadTokens, saveTokens } from "../lib/tokenStorage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  accessToken: null,
  refreshToken: null,
  hydrate: async () => {
    try {
      const { accessToken, refreshToken } = await loadTokens();
      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, status: "authenticated" });
      } else {
        set({ status: "unauthenticated" });
      }
    } catch (error) {
      console.warn("Failed to load stored auth tokens", error);
      set({ status: "unauthenticated" });
    }
  },
  setTokens: async (accessToken, refreshToken) => {
    await saveTokens(accessToken, refreshToken);
    set({ accessToken, refreshToken, status: "authenticated" });
  },
  clear: async () => {
    await clearTokens();
    set({ accessToken: null, refreshToken: null, status: "unauthenticated" });
  },
}));
