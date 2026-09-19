import { useCallback, useState } from "react";
import * as Location from "expo-location";

export type MyLocationStatus = "idle" | "requesting" | "granted" | "denied";

const POSITION_TIMEOUT_MS = 8000;

// expo-location의 getCurrentPositionAsync에는 자체 timeout 옵션이 없다 — GPS/위치
// 제공자가 응답을 못 주는 상태에서는 최대 수십 초까지 아무 피드백 없이 대기하다가야
// reject되는 것을 실기기(에뮬레이터)에서 직접 확인했다. Promise.race로 8초 타임아웃을
// 걸어, 응답이 늦어도 사용자가 "denied" 안내를 빨리 보고 재시도할 수 있게 한다.
function getCurrentPositionWithTimeout(): Promise<Location.LocationObject> {
  return Promise.race([
    Location.getCurrentPositionAsync({}),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("위치 조회 타임아웃")), POSITION_TIMEOUT_MS),
    ),
  ]);
}

export function useMyLocation() {
  const [status, setStatus] = useState<MyLocationStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  // 좌표를 state뿐 아니라 반환값으로도 준다 — 훅 state는 다음 렌더에야 갱신되므로,
  // 호출부가 await 직후 같은 함수 안에서 곧바로 좌표를 쓰려면 반환값이 필요하다.
  const request = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    setStatus("requesting");
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== Location.PermissionStatus.GRANTED) {
        setStatus("denied");
        return null;
      }
      const position = await getCurrentPositionWithTimeout();
      const nextCoords = { lat: position.coords.latitude, lon: position.coords.longitude };
      setCoords(nextCoords);
      setStatus("granted");
      return nextCoords;
    } catch {
      // 권한 요청 자체가 실패했거나(예: 중복 호출), 권한은 허용됐지만 위치를 가져오지
      // 못했거나(위치 서비스 꺼짐, GPS 사용 불가 등) 타임아웃된 경우 — 셋 다 "denied"로
      // 통일 처리한다. 기존 UI(권한 거부 시 안내 문구)를 재사용한다(YAGNI).
      setStatus("denied");
      return null;
    }
  }, []);

  return { status, coords, request };
}
