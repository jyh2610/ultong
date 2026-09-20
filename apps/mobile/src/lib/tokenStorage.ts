import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";

// expo-secure-store has no real backing store on web (its web module is an empty
// stub), so setItemAsync/getItemAsync throw there — fall back to localStorage.
const isWeb = Platform.OS === "web";

function webGetItem(key: string): string | null {
  return localStorage.getItem(key);
}

function webSetItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

function webDeleteItem(key: string): void {
  localStorage.removeItem(key);
}

export async function loadTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    isWeb ? webGetItem(ACCESS_TOKEN_KEY) : SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    isWeb ? webGetItem(REFRESH_TOKEN_KEY) : SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  if (isWeb) {
    webSetItem(ACCESS_TOKEN_KEY, accessToken);
    webSetItem(REFRESH_TOKEN_KEY, refreshToken);
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  if (isWeb) {
    webDeleteItem(ACCESS_TOKEN_KEY);
    webDeleteItem(REFRESH_TOKEN_KEY);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
