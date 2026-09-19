import * as Location from "expo-location";
import { getRegionCodes } from "../../../lib/codes";

export interface NearbyRegion {
  ldongRegnCd: string;
  ldongSignguCd?: string;
}

// 기기에서 역지오코딩한 시/도·시/군/구 "이름"을 /codes/regions의 코드와 매칭한다.
// 정밀 좌표는 이 함수 안에서만 쓰이고 서버로는 절대 전달되지 않는다 — 서버에는
// 매칭된 행정구역 코드만 /places/search의 기존 ldongRegnCd/ldongSignguCd 필터로 보낸다.
export async function resolveNearbyRegion(coords: {
  lat: number;
  lon: number;
}): Promise<NearbyRegion | null> {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lon,
    });
    if (!address?.region) return null;

    const { items: regions } = await getRegionCodes();
    const sido = regions.find((r) => r.depth === 1 && r.name === address.region);
    if (!sido) return null;

    const sigunguName = address.subregion ?? address.district ?? undefined;
    const sigungu = sigunguName
      ? regions.find((r) => r.depth === 2 && r.parentCode === sido.code && r.name === sigunguName)
      : undefined;

    return { ldongRegnCd: sido.code, ldongSignguCd: sigungu?.code };
  } catch {
    // 역지오코딩(기기 OS 호출) 또는 /codes/regions 조회(네트워크 호출) 실패 시에도
    // "지역을 못 찾음"과 동일하게 null을 반환한다 — 이 함수는 이미 매칭 실패 시
    // null을 반환하는 계약을 가지고 있으므로, 이건 그 계약의 자연스러운 확장이다.
    return null;
  }
}
