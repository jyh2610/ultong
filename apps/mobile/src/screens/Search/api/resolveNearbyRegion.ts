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
}
