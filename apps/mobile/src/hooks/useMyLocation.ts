import { useCallback, useState } from "react";
import * as Location from "expo-location";

export type MyLocationStatus = "idle" | "requesting" | "granted" | "denied";

export function useMyLocation() {
  const [status, setStatus] = useState<MyLocationStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  // 좌표를 state뿐 아니라 반환값으로도 준다 — 훅 state는 다음 렌더에야 갱신되므로,
  // 호출부가 await 직후 같은 함수 안에서 곧바로 좌표를 쓰려면 반환값이 필요하다.
  const request = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    setStatus("requesting");
    const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
    if (permissionStatus !== Location.PermissionStatus.GRANTED) {
      setStatus("denied");
      return null;
    }
    const position = await Location.getCurrentPositionAsync({});
    const nextCoords = { lat: position.coords.latitude, lon: position.coords.longitude };
    setCoords(nextCoords);
    setStatus("granted");
    return nextCoords;
  }, []);

  return { status, coords, request };
}
