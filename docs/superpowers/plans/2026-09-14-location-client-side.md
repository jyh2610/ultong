# 위치 기반 기능 클라이언트 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버(Elasticsearch)가 사용자 좌표를 받거나 거리를 계산하지 않도록 `apps/api`의 geo 관련 경로를 비활성화하고, "거리순 정렬"/"내 주변 보기"를 `apps/mobile`에서 기기 좌표 + 로컬 Haversine 계산으로 완전히 대체한다.

**Architecture:** API 쪽은 `PlacesSearchQueryDto`의 `lat`/`lon`/`radiusKm`/`sort=distance`와 이를 사용하는 ES 쿼리 빌더·서비스 로직을 삭제가 아니라 주석 처리해 비활성화한다(사용자 요청: "주석으로 해줘 일단"). 전체 시설 데이터 규모가 커서 서버 좁히기 없이 후보를 전부 훑을 수 없으므로, 모바일은 정밀 좌표 대신 **행정구역 단위**로 먼저 좁힌다: `expo-location`의 역지오코딩으로 기기 좌표를 시/군/구 이름으로 변환하고, 이미 존재하는 `GET /codes/regions`로 이름→코드를 매칭해 이미 존재하는 `/places/search`의 `ldongRegnCd`/`ldongSignguCd` 필터로 후보를 서버에서 좁힌다(새 서버 기능 없음, 정밀 좌표는 서버로 전송되지 않음). 그렇게 좁혀진 후보(최대 100건)에 대해서만 클라이언트에서 순수 함수 거리 유틸(`distance.ts`, Haversine)로 반경 필터링·거리순 정렬을 적용한다. `HomeScreen`의 "내 주변" 버튼은 위치 권한을 받은 뒤 `Search` 화면을 거리순 모드로 자동 진입시킨다.

**Tech Stack:** NestJS 11 + `@elastic/elasticsearch`(API), Expo SDK 57 + React Native + `expo-location` + TanStack Query(모바일)

**Spec:** `docs/superpowers/specs/2026-09-14-location-client-side-design.md`

## Global Constraints

- API에서 비활성화하는 코드는 **삭제하지 않고 주석 처리**한다. 각 블록 위에 `// [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관 (docs/superpowers/specs/2026-09-14-location-client-side-design.md)` 형태의 주석을 남긴다.
- `apps/mobile`에는 테스트 러너(jest)가 구성되어 있지 않다(`apps/mobile/CLAUDE.md`) — 이번 작업에서 jest를 새로 도입하지 않는다. 순수 함수(`distance.ts`)는 임시 `node` 스크립트로 값 검증 후 커밋하고, `yarn typecheck`를 커밋 전 게이트로 삼는다.
- 위치 권한은 앱 시작 시가 아니라 **기능을 실제로 쓰는 시점**(거리순 토글, "내 주변" 버튼)에만 요청한다.
- `apps/api`는 매 태스크 후 `yarn workspace api test`와 `yarn workspace api typecheck`를 실행한다.
- `apps/mobile`은 매 태스크 후 `yarn workspace mobile typecheck`를 실행한다(이 저장소의 유일한 모바일 자동 검증 수단, `apps/mobile/CLAUDE.md`).
- 화면 전용 타입/상수는 해당 화면 폴더(`src/screens/Search/`) 안에 두고, 2개 이상 화면에서 재사용되는 것만 `src/hooks/`, `src/lib/`에 둔다(`apps/mobile/CLAUDE.md` 폴더 구조 원칙).
- 정밀 좌표(`lat`/`lon`)는 어떤 경로로도 서버로 전송하지 않는다. 서버에 보내는 것은 이미 존재하는 `ldongRegnCd`/`ldongSignguCd`(행정구역 코드) 필터뿐이다 — 이는 위치정보사업자 신고 회피라는 이번 작업의 핵심 목적이므로, 구현 중 이 경계를 흐리는 지름길(예: 좌표를 다른 파라미터명으로 우회 전송)을 택하지 않는다.

---

## Task 1: API — DTO에서 lat/lon/radiusKm/sort=distance 비활성화

**Files:**
- Modify: `apps/api/src/search/dto/places-search-query.dto.ts:1-21,71-89,113-119`

**Interfaces:**
- Produces: `PlacesSortOption`을 `'relevance' | 'recent'`로 축소. 이후 모든 태스크는 이 축소된 타입을 전제로 한다.

- [ ] **Step 1: `lat`/`lon`/`radiusKm` 필드와 관련 import를 주석 처리**

`apps/api/src/search/dto/places-search-query.dto.ts`의 import 문(1-17줄)을 다음으로 교체:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { toBoolean } from './query-transforms';
```

(`IsLatitude`, `IsLongitude`는 더 이상 쓰이지 않으므로 제거 — 아래에서 필드 자체를 주석 처리하기 때문에 남겨두면 미사용 import로 lint 에러가 난다.)

71-89번째 줄(`lat`/`lon`/`radiusKm` 필드 3개)을 다음으로 교체:

```ts
  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // 서버는 사용자 좌표를 더 이상 받지 않는다. 거리 계산/반경 필터는 모바일에서
  // expo-location + src/lib/distance.ts(Haversine)로 처리한다.
  //
  // @ApiPropertyOptional()
  // @IsOptional()
  // @Type(() => Number)
  // @IsLatitude()
  // lat?: number;
  //
  // @ApiPropertyOptional()
  // @IsOptional()
  // @Type(() => Number)
  // @IsLongitude()
  // lon?: number;
  //
  // @ApiPropertyOptional()
  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // @IsPositive()
  // radiusKm?: number;
```

- [ ] **Step 2: `PlacesSortOption`에서 `'distance'` 제거**

21번째 줄:

```ts
export type PlacesSortOption = 'relevance' | 'recent';
```

113-119번째 줄(`sort` 필드)을 다음으로 교체:

```ts
  @ApiPropertyOptional({
    enum: ['relevance', 'recent'],
    default: 'relevance',
  })
  @IsOptional()
  @IsIn(['relevance', 'recent'])
  sort: PlacesSortOption = 'relevance';
```

- [ ] **Step 3: 타입체크 실행**

Run: `yarn workspace api typecheck`
Expected: 에러 없음 (이 시점엔 아직 `query-builder.ts`/`places.service.ts`가 옛 필드를 참조하고 있어 **에러가 나는 게 정상** — Task 2, 3에서 해소된다. 여기서는 DTO 파일 자체의 문법 에러만 없으면 됨.)

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/search/dto/places-search-query.dto.ts
git commit -m "feat(api): disable lat/lon/radiusKm and sort=distance in places search DTO"
```

---

## Task 2: API — ES 쿼리 빌더에서 geo 필터/정렬 비활성화

**Files:**
- Modify: `apps/api/src/search/places-search.query-builder.ts:24-35,146-159`
- Modify: `apps/api/src/search/places-search.query-builder.spec.ts:101-117,213-227`

**Interfaces:**
- Consumes: Task 1에서 축소된 `PlacesSearchQueryDto`/`PlacesSortOption`.

- [ ] **Step 1: geo_distance 필터 블록 주석 처리**

`places-search.query-builder.ts`의 24-35번째 줄을 다음으로 교체:

```ts
  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // if (
  //   dto.lat !== undefined &&
  //   dto.lon !== undefined &&
  //   dto.radiusKm !== undefined
  // ) {
  //   filter.push({
  //     geo_distance: {
  //       distance: `${dto.radiusKm}km`,
  //       location: { lat: dto.lat, lon: dto.lon },
  //     },
  //   });
  // }
```

- [ ] **Step 2: `_geo_distance` 정렬 블록 주석 처리**

146-159번째 줄(`if (dto.sort === 'distance' ...) { ... } else if`)을 다음으로 교체:

```ts
  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // if (
  //   dto.sort === 'distance' &&
  //   dto.lat !== undefined &&
  //   dto.lon !== undefined
  // ) {
  //   request.sort = [
  //     {
  //       _geo_distance: {
  //         location: { lat: dto.lat, lon: dto.lon },
  //         order: 'asc',
  //         unit: 'km',
  //       },
  //     },
  //   ];
  // } else
  if (dto.sort === 'recent') {
    request.sort = [{ 'sync.modified_at': 'desc' }];
  }
```

- [ ] **Step 3: 기존 geo 테스트 주석 처리**

`places-search.query-builder.spec.ts`의 101-117번째 줄(`'adds a geo_distance filter...'` 테스트 전체)을 다음으로 교체:

```ts
  // [비활성화 2026-09-14] geo_distance 필터 자체가 비활성화됨 — 위 query-builder.ts 참고
  // it('adds a geo_distance filter only when lat, lon, and radiusKm are all present', () => {
  //   const withGeo = buildPlacesSearchQuery(
  //     baseDto({ lat: 35.16, lon: 129.16, radiusKm: 5 }),
  //   );
  //   const boolWithGeo = getBool(withGeo);
  //   expect(boolWithGeo.filter).toContainEqual({
  //     geo_distance: { distance: '5km', location: { lat: 35.16, lon: 129.16 } },
  //   });
  //
  //   const withoutGeo = buildPlacesSearchQuery(baseDto({ lat: 35.16 }));
  //   const boolWithoutGeo = getBool(withoutGeo);
  //   expect(
  //     boolWithoutGeo.filter.some(
  //       (clause: Record<string, unknown>) => 'geo_distance' in clause,
  //     ),
  //   ).toBe(false);
  // });
```

213-227번째 줄(`'sorts by _geo_distance...'` 테스트 전체)을 다음으로 교체:

```ts
  // [비활성화 2026-09-14] _geo_distance 정렬 자체가 비활성화됨 — 위 query-builder.ts 참고
  // it('sorts by _geo_distance when sort=distance and lat/lon are present', () => {
  //   const request = buildPlacesSearchQuery(
  //     baseDto({ sort: 'distance', lat: 35.16, lon: 129.16 }),
  //   );
  //
  //   expect(request.sort).toEqual([
  //     {
  //       _geo_distance: {
  //         location: { lat: 35.16, lon: 129.16 },
  //         order: 'asc',
  //         unit: 'km',
  //       },
  //     },
  //   ]);
  // });
```

- [ ] **Step 4: 테스트 및 타입체크 실행**

Run: `yarn workspace api test places-search.query-builder`
Expected: PASS (남은 케이스: relevance 기본 정렬, recent 정렬, 기타 필터 케이스)

Run: `yarn workspace api typecheck`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/search/places-search.query-builder.ts apps/api/src/search/places-search.query-builder.spec.ts
git commit -m "feat(api): disable geo_distance filter and sort in places query builder"
```

---

## Task 3: API — 서비스에서 distanceKm 계산 비활성화

**Files:**
- Modify: `apps/api/src/search/places.service.ts:1-11,45-65,177-196`
- Modify: `apps/api/src/search/places.service.spec.ts:217-234`

- [ ] **Step 1: 미사용 import 정리**

`places.service.ts`의 5-8번째 줄:

```ts
import {
  PlacesSearchQueryDto,
} from './dto/places-search-query.dto';
```

(`PlacesSortOption`은 `getDistanceKm`에서만 쓰였는데 그 메서드를 주석 처리하므로 함께 제거.)

- [ ] **Step 2: `PlaceSearchItem.distanceKm` 필드 주석 처리**

60번째 줄:

```ts
  // [비활성화 2026-09-14] 서버는 더 이상 distanceKm을 계산하지 않는다 — 클라이언트가
  // location으로 직접 계산한다 (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // distanceKm?: number;
```

- [ ] **Step 3: `mapHit`에서 distanceKm 대입 제거**

178번째 줄(`distanceKm: this.getDistanceKm(hit, dto.sort),`)을 삭제(그 줄만 제거 — 객체 리터럴의 다른 필드는 그대로 유지).

- [ ] **Step 4: `getDistanceKm` 메서드 주석 처리**

189-196번째 줄:

```ts
  // [비활성화 2026-09-14] 위치정보사업자 신고 회피 — 클라이언트 이관
  // (docs/superpowers/specs/2026-09-14-location-client-side-design.md)
  // private getDistanceKm(
  //   hit: estypes.SearchHit<PlaceSource>,
  //   sort: PlacesSortOption,
  // ): number | undefined {
  //   if (sort !== 'distance') return undefined;
  //   const value: unknown = hit.sort?.[0];
  //   return typeof value === 'number' ? value : undefined;
  // }
```

- [ ] **Step 5: 기존 distanceKm 테스트 주석 처리**

`places.service.spec.ts`의 217-234번째 줄(`'includes distanceKm from hit.sort only when sort=distance'` 테스트 전체)을 다음으로 교체:

```ts
  // [비활성화 2026-09-14] distanceKm 계산 자체가 비활성화됨 — 위 places.service.ts 참고
  // it('includes distanceKm from hit.sort only when sort=distance', async () => {
  //   search.mockResolvedValue({
  //     ...esResponse(),
  //     hits: {
  //       total: { value: 1 },
  //       hits: [{ ...esResponse().hits.hits[0], sort: [4.21] }],
  //     },
  //   });
  //
  //   const withDistance = await service.search(
  //     baseDto({ sort: 'distance', lat: 35.07, lon: 129.01 }),
  //   );
  //   expect(withDistance.items[0].distanceKm).toBe(4.21);
  //
  //   search.mockResolvedValue(esResponse());
  //   const withoutDistance = await service.search(baseDto());
  //   expect(withoutDistance.items[0].distanceKm).toBeUndefined();
  // });
```

- [ ] **Step 6: 테스트 및 타입체크 실행**

Run: `yarn workspace api test`
Expected: PASS (search 모듈 전체)

Run: `yarn workspace api typecheck`
Expected: 에러 없음

Run: `yarn workspace api lint`
Expected: 에러 없음 (미사용 import/변수 없음)

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/search/places.service.ts apps/api/src/search/places.service.spec.ts
git commit -m "feat(api): disable server-side distanceKm computation"
```

---

## Task 4: 모바일 — expo-location 의존성 추가

**Files:**
- Modify: `apps/mobile/package.json`, `yarn.lock`

- [ ] **Step 1: Expo 호환 버전으로 설치**

Run: `cd apps/mobile && npx expo install expo-location`
Expected: `apps/mobile/package.json`의 `dependencies`에 `expo-location`이 추가되고 루트 `yarn.lock`이 갱신됨.

- [ ] **Step 2: 타입체크 실행**

Run: `yarn workspace mobile typecheck`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/mobile/package.json yarn.lock
git commit -m "feat(mobile): add expo-location dependency"
```

---

## Task 5: 모바일 — 거리 계산 순수 함수(Haversine)

**Files:**
- Create: `apps/mobile/src/lib/distance.ts`

**Interfaces:**
- Produces: `getDistanceKm(a: {lat:number,lon:number}, b: {lat:number,lon:number}): number` — Task 9에서 사용.

- [ ] **Step 1: 구현**

`apps/mobile/src/lib/distance.ts`:

```ts
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function getDistanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
```

- [ ] **Step 2: 임시 스크립트로 값 검증 (jest 없음 — Global Constraints 참고)**

Run:

```bash
node -e "
const R = 6371;
const rad = d => d * Math.PI / 180;
function dist(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
console.log('서울-부산:', dist({lat:37.5665,lon:126.9780}, {lat:35.1796,lon:129.0756}).toFixed(1), 'km');
console.log('동일좌표:', dist({lat:37.5665,lon:126.9780}, {lat:37.5665,lon:126.9780}));
"
```

Expected: 서울-부산 ≈ 325km 내외(오차 ±5km), 동일좌표는 `0`. `apps/mobile/src/lib/distance.ts`의 구현이 위 스크립트와 동일한 공식이므로 이 값이 실제 함수 동작을 대변한다.

- [ ] **Step 3: 타입체크 실행**

Run: `yarn workspace mobile typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/mobile/src/lib/distance.ts
git commit -m "feat(mobile): add haversine distance utility"
```

---

## Task 6: 모바일 — 위치 권한/좌표 훅

**Files:**
- Create: `apps/mobile/src/hooks/useMyLocation.ts`

**Interfaces:**
- Consumes: `expo-location`(Task 4).
- Produces: `useMyLocation(): { status: 'idle'|'requesting'|'granted'|'denied', coords: {lat:number,lon:number}|null, request: () => Promise<{lat:number,lon:number}|null> }` — `request()`가 좌표를 직접 반환하는 이유: 훅 state는 다음 렌더에서만 갱신되므로, 호출 직후 같은 함수 안에서 곧바로 좌표가 필요한 호출부(Task 9, 10)가 stale closure를 읽는 버그를 피하기 위함. Task 9, 10에서 사용.

- [ ] **Step 1: 구현**

`apps/mobile/src/hooks/useMyLocation.ts`:

```ts
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
```

- [ ] **Step 2: 타입체크 실행**

Run: `yarn workspace mobile typecheck`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/mobile/src/hooks/useMyLocation.ts
git commit -m "feat(mobile): add useMyLocation hook for on-demand location permission"
```

---

## Task 7: 모바일 — 검색 파라미터 타입에서 서버 geo 파라미터 제거

**Files:**
- Modify: `apps/mobile/src/lib/places.ts:24-41`

**Interfaces:**
- Consumes: Task 1에서 축소된 API `PlacesSortOption`.
- Produces: 축소된 `PlacesSearchParams`(Task 9에서 `useSearchPlaces` 호출부가 이 타입을 따름).

- [ ] **Step 1: `PlacesSortOption`/`PlacesSearchParams`에서 geo 필드 제거**

`apps/mobile/src/lib/places.ts`의 24-41번째 줄을 다음으로 교체:

```ts
export type PlacesSortOption = "relevance" | "recent";

export type PlacesSearchParams = {
  q?: string;
  contentTypeId?: string[];
  lcls1?: string;
  ldongRegnCd?: string;
  ldongSignguCd?: string;
  weightKg?: number;
  hasCage?: boolean;
  excludeDangerous?: boolean;
  sort?: PlacesSortOption;
  page?: number;
  size?: number;
};
```

- [ ] **Step 2: 타입체크 실행**

Run: `yarn workspace mobile typecheck`
Expected: 이 시점엔 에러 없음(현재 이 필드들을 실제로 채워 보내는 화면이 없었음 — 리서치 확인 완료)

- [ ] **Step 3: 커밋**

```bash
git add apps/mobile/src/lib/places.ts
git commit -m "feat(mobile): drop server-side lat/lon/radiusKm from search params"
```

---

## Task 8: 모바일 — 좌표→행정구역 코드 변환 (region narrowing)

전체 시설 데이터 규모가 커서(팀원 확인 결과 "너무 많다"), 서버에서 아무 지역 제한 없이 최대 100건만 받아 클라이언트에서 거리 필터링하면 실제로 근처 시설을 놓칠 수 있다. 정밀 좌표는 여전히 서버로 보내지 않되, **이미 존재하는** `ldongRegnCd`/`ldongSignguCd` 필터(수동 지역 검색에 쓰던 것과 동일)로 서버 쪽 후보를 사용자의 시/군/구로 먼저 좁힌다.

**Files:**
- Create: `apps/mobile/src/lib/codes.ts`
- Create: `apps/mobile/src/screens/Search/api/resolveNearbyRegion.ts` (기존 `apps/mobile/src/screens/Search/api/.gitkeep` 대체)

**Interfaces:**
- Consumes: `expo-location`(Task 4), API의 `GET /codes/regions`(기존 엔드포인트, 변경 없음).
- Produces: `resolveNearbyRegion(coords: {lat,lon}): Promise<{ldongRegnCd: string, ldongSignguCd?: string} | null>` — Task 9(SearchScreen)에서 사용.

- [ ] **Step 1: 지역 코드 조회 API 클라이언트**

`apps/mobile/src/lib/codes.ts`:

```ts
import { apiFetch } from "./apiClient";

export interface CodeItem {
  code: string;
  name: string;
  parentCode: string | null;
  parentName: string | null;
  depth: number;
  path: string;
}

export function getRegionCodes(): Promise<{ items: CodeItem[] }> {
  return apiFetch<{ items: CodeItem[] }>("/codes/regions");
}
```

- [ ] **Step 2: 좌표 → 시/군/구 코드 변환**

`apps/mobile/src/screens/Search/api/.gitkeep`을 삭제하고 `apps/mobile/src/screens/Search/api/resolveNearbyRegion.ts`를 생성:

```ts
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
```

(이름 매칭에 실패하면(예: 기기 로케일/역지오코딩 결과가 코드 목록과 다르게 표기) `null`을 반환한다 — Task 9에서 이 경우 지역 필터 없이 진행하도록 처리한다. 정확도는 낮아지지만 기능이 완전히 막히지는 않는다.)

- [ ] **Step 3: 타입체크 실행**

Run: `yarn workspace mobile typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/mobile/src/lib/codes.ts apps/mobile/src/screens/Search/api/resolveNearbyRegion.ts
git rm apps/mobile/src/screens/Search/api/.gitkeep
git commit -m "feat(mobile): resolve device coords to region code via reverse geocoding"
```

---

## Task 9: 모바일 — SearchScreen 거리순(클라이언트 계산) 정렬

**Files:**
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx:20`
- Modify: `apps/mobile/src/screens/Search/constants.ts`
- Modify: `apps/mobile/src/screens/Search/types.ts`
- Modify: `apps/mobile/src/screens/Search/SearchScreen.tsx`

**Interfaces:**
- Consumes: `getDistanceKm`(Task 5), `useMyLocation`(Task 6), 축소된 `PlacesSearchParams`(Task 7), `resolveNearbyRegion`(Task 8).
- Produces: `Search` 라우트 파라미터에 `autoDistanceSort?: boolean` 추가 — Task 10(HomeScreen)에서 사용.

- [ ] **Step 1: `apps/mobile/src/types/place.ts`의 `distanceKm` 필드 주석 갱신**

`apps/mobile/src/types/place.ts`의 `PlaceSearchItem` 인터페이스(55-68번째 줄) 중 `distanceKm?: number;` 줄을 다음으로 교체:

```ts
  // API 응답 필드가 아니다 — 서버는 더 이상 거리를 계산하지 않는다(2026-09-14).
  // 이 필드는 항상 undefined이며, 실제 값은 SearchScreen에서
  // lib/distance.ts의 getDistanceKm으로 화면 표시 시점에 계산해서 쓴다.
  distanceKm?: number;
```

- [ ] **Step 2: `Search` 라우트 파라미터에 `autoDistanceSort` 추가**

`apps/mobile/src/navigation/RootNavigator.tsx`의 20번째 줄:

```ts
  Search: { category?: string; query?: string; autoDistanceSort?: boolean };
```

- [ ] **Step 3: 기본 반경 상수 추가**

`apps/mobile/src/screens/Search/constants.ts` 끝에 추가:

```ts
export const DEFAULT_NEARBY_RADIUS_KM = 5;
```

- [ ] **Step 4: 화면 전용 정렬 모드 타입 추가**

`apps/mobile/src/screens/Search/types.ts` 전체를 다음으로 교체:

```ts
import type { RootStackScreenProps } from "../../navigation/types";

export type SearchScreenProps = RootStackScreenProps<"Search">;

// 서버에 보내는 PlacesSortOption(relevance/recent)과는 별개 — "거리순"은
// 서버에 좌표를 보내지 않고 클라이언트에서만 재정렬/필터링하는 화면 전용 모드다.
export type SearchSortMode = "relevance" | "distance";
```

- [ ] **Step 5: SearchScreen에 거리순 토글/클라이언트 필터링 반영**

`apps/mobile/src/screens/Search/SearchScreen.tsx`의 import 블록(1-24번째 줄)을 다음으로 교체:

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "../../components/icons/BackIcon";
import { SearchIcon } from "../../components/icons/SearchIcon";
import { Text } from "../../components/AppText";
import { PressableScale } from "../../components/PressableScale";
import { TextInput } from "../../components/AppTextInput";
import { EmptyState } from "../../components/EmptyState";
import { FacilityListCard } from "../../components/FacilityListCard";
import { FacilityListCardSkeleton } from "../../components/FacilityListCardSkeleton";
import { FadeIn } from "../../components/FadeIn";
import { PlacesMapView } from "../../components/PlacesMapView";
import type { MapPoint } from "../../components/PlacesMapView";
import { Skeleton } from "../../components/Skeleton";
import { useMyLocation } from "../../hooks/useMyLocation";
import { usePets } from "../../hooks/usePets";
import { useSearchPlaces } from "../../hooks/usePlaces";
import { getDistanceKm } from "../../lib/distance";
import { pickDefaultPet } from "../../lib/pets";
import { CONTENT_TYPE_ID_BY_CATEGORY, toPlaceSummary, WALK_FRIENDLY_CONTENT_TYPE_IDS } from "../../lib/places";
import { useSearchHistoryStore } from "../../store/searchHistoryStore";
import type { PlaceSearchItem, Verdict } from "../../types/place";
import { resolveNearbyRegion } from "./api/resolveNearbyRegion";
import type { NearbyRegion } from "./api/resolveNearbyRegion";
import { DEFAULT_NEARBY_RADIUS_KM, SEARCH_CATEGORIES } from "./constants";
import type { SearchScreenProps, SearchSortMode } from "./types";
```

컴포넌트 본문 시작부(옛 35-60번째 줄, `state` 선언과 `useSearchPlaces` 호출)를 다음으로 교체:

```tsx
export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const [category, setCategory] = useState<(typeof SEARCH_CATEGORIES)[number]["key"]>(
    (route.params?.category as (typeof SEARCH_CATEGORIES)[number]["key"] | undefined) ?? "all",
  );
  const [query, setQuery] = useState(route.params?.query ?? "");
  const [okOnly, setOkOnly] = useState(false);
  const [sortByMatch, setSortByMatch] = useState(false);
  const [sortMode, setSortMode] = useState<SearchSortMode>("relevance");
  const [nearbyRegion, setNearbyRegion] = useState<NearbyRegion | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const addRecentQuery = useSearchHistoryStore((state) => state.addQuery);
  const { data: pets = [] } = usePets();
  const pet = pickDefaultPet(pets);
  const insets = useSafeAreaInsets();
  const myLocation = useMyLocation();

  const contentTypeId =
    category === "all"
      ? undefined
      : category === "walk"
        ? WALK_FRIENDLY_CONTENT_TYPE_IDS
        : [CONTENT_TYPE_ID_BY_CATEGORY[category]];

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useSearchPlaces({
    q: query || undefined,
    contentTypeId,
    weightKg: pet?.weightKg,
    hasCage: pet?.hasCage,
    ldongRegnCd: sortMode === "distance" ? nearbyRegion?.ldongRegnCd : undefined,
    ldongSignguCd: sortMode === "distance" ? nearbyRegion?.ldongSignguCd : undefined,
    size: sortMode === "distance" ? 100 : undefined,
  });

  // 좌표 획득 → 시/군/구 코드로 변환(정밀 좌표는 여기서만 쓰이고 서버로는 전송되지
  // 않는다, Task 8 참고) → 거리순 모드 전환. 코드 매칭에 실패해도(null) 지역 필터
  // 없이 거리순 모드는 켠다 — 정확도는 낮아지지만 기능 자체는 막지 않는다.
  // myLocation.coords가 아니라 request()의 반환값을 쓰는 이유는 useMyLocation
  // 훅 코드 주석 참고(다음 렌더 전까지는 훅 state가 갱신되지 않기 때문).
  const enableDistanceSort = async () => {
    const coords = await myLocation.request();
    if (!coords) return;
    const region = await resolveNearbyRegion(coords);
    setNearbyRegion(region);
    setSortMode("distance");
  };

  useEffect(() => {
    if (route.params?.autoDistanceSort) {
      void enableDistanceSort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 화면 진입 시 1회만 자동 실행
  }, []);

  const toggleDistanceSort = () => {
    if (sortMode === "distance") {
      setSortMode("relevance");
      return;
    }
    void enableDistanceSort();
  };

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  const orderedItems: PlaceSearchItem[] =
    sortMode === "distance" && myLocation.coords
      ? items
          .filter((item) => item.location)
          .map((item) => ({ item, distanceKm: getDistanceKm(myLocation.coords!, item.location!) }))
          .filter(({ distanceKm }) => distanceKm <= DEFAULT_NEARBY_RADIUS_KM)
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .map(({ item }) => item)
      : items;

  const places = orderedItems.map(toPlaceSummary);

  const filtered = places
    .filter((place) => !okOnly || place.match.verdict === "allowed")
    .sort((a, b) => (sortByMatch ? MATCH_PRIORITY[a.match.verdict] - MATCH_PRIORITY[b.match.verdict] : 0));

  const filteredIds = new Set(filtered.map((place) => place.contentId));
  const mapPoints: MapPoint[] = orderedItems
    .filter((item) => filteredIds.has(item.contentId) && item.location)
    .map((item) => ({ contentId: item.contentId, lat: item.location!.lat, lon: item.location!.lon }));

  const okCount = places.filter((p) => p.match.verdict === "allowed").length;
  const condCount = places.filter((p) => p.match.verdict === "conditional").length;
  const checkCount = places.filter((p) => p.match.verdict === "denied" || p.match.verdict === "unknown").length;
```

(`items`/`places`/`filtered`/`filteredIds`/`mapPoints`/`okCount`/`condCount`/`checkCount` 선언은 기존과 이름이 같고 로직만 바뀐 것 — 이후 JSX는 이 변수들을 그대로 참조하므로 수정 불필요.)

정렬/필터 pill이 있는 블록(옛 157-178번째 줄)을 다음으로 교체:

```tsx
      <View className="mb-3.5 flex-row items-center gap-2">
        <PressableScale
          onPress={() => setOkOnly((v) => !v)}
          className={`rounded-full border px-3 py-1.5 ${
            okOnly ? "border-primary bg-primary" : "border-card-border-alt bg-card"
          }`}
        >
          <Text className={`text-label font-semibold ${okOnly ? "text-white" : "text-ink-soft"}`}>
            입장가능만 보기
          </Text>
        </PressableScale>
        <PressableScale
          onPress={() => setSortByMatch((v) => !v)}
          className={`rounded-full border px-3 py-1.5 ${
            sortByMatch ? "border-primary bg-primary" : "border-card-border-alt bg-card"
          }`}
        >
          <Text className={`text-label font-semibold ${sortByMatch ? "text-white" : "text-ink-soft"}`}>
            매칭도순 정렬
          </Text>
        </PressableScale>
        <PressableScale
          onPress={toggleDistanceSort}
          className={`rounded-full border px-3 py-1.5 ${
            sortMode === "distance" ? "border-primary bg-primary" : "border-card-border-alt bg-card"
          }`}
        >
          <Text
            className={`text-label font-semibold ${sortMode === "distance" ? "text-white" : "text-ink-soft"}`}
          >
            거리순
          </Text>
        </PressableScale>
      </View>
      {myLocation.status === "denied" && (
        <Text className="mb-3.5 text-label text-ink-faint">
          위치 권한을 허용하면 거리순으로 볼 수 있어요
        </Text>
      )}
```

- [ ] **Step 6: 타입체크 실행**

Run: `yarn workspace mobile typecheck`
Expected: 에러 없음

- [ ] **Step 7: 번들링 스모크 테스트**

Run: `cd apps/mobile && npx expo export --platform web`
Expected: 에러 없이 번들링 완료. 완료 후 `dist/`는 gitignore 대상이므로 삭제.

Run: `rm -rf apps/mobile/dist`

- [ ] **Step 8: 커밋**

```bash
git add apps/mobile/src/navigation/RootNavigator.tsx apps/mobile/src/screens/Search/constants.ts apps/mobile/src/screens/Search/types.ts apps/mobile/src/screens/Search/SearchScreen.tsx
git commit -m "feat(mobile): add client-side distance sort to SearchScreen"
```

---

## Task 10: 모바일 — HomeScreen "내 주변" 버튼 실동작 연결

**Files:**
- Modify: `apps/mobile/src/screens/Home/HomeScreen.tsx:1-22,108-116`

**Interfaces:**
- Consumes: `useMyLocation`(Task 6), `Search` 라우트의 `autoDistanceSort`(Task 9).

- [ ] **Step 1: import 및 훅 추가**

`HomeScreen.tsx`의 import 블록에 추가(다른 `../../hooks/` import들 옆):

```tsx
import { useMyLocation } from "../../hooks/useMyLocation";
```

컴포넌트 본문 최상단(`const { data: pets = [] } = usePets();` 다음 줄)에 추가:

```tsx
  const myLocation = useMyLocation();
```

- [ ] **Step 2: 버튼 핸들러 추가 및 연결**

`goToSearch` 함수 정의 다음에 추가:

```tsx
  const handleNearbyPress = async () => {
    const coords = await myLocation.request();
    if (!coords) return;
    navigation.getParent()?.navigate("Search", { autoDistanceSort: true });
  };
```

108-116번째 줄("내 주변..." 버튼)을 다음으로 교체:

```tsx
        <PressableScale
          onPress={handleNearbyPress}
          className="mb-4 w-full flex-row items-center gap-2 rounded-2xl border border-card-border-alt bg-[#EEF5F0] px-4 py-3"
        >
          <LocationPinIcon color="#7A4A2B" />
          <Text className="text-body font-semibold text-primary">
            내 주변 반려동반 가능 시설 보기
          </Text>
        </PressableScale>
        {myLocation.status === "denied" && (
          <Text className="mb-4 -mt-2 text-label text-ink-faint">
            위치 권한을 허용하면 내 주변 시설을 볼 수 있어요
          </Text>
        )}
```

- [ ] **Step 3: 타입체크 실행**

Run: `yarn workspace mobile typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/mobile/src/screens/Home/HomeScreen.tsx
git commit -m "feat(mobile): wire nearby-facilities button to request location and auto-enable distance sort"
```

---

## Task 11: 모바일 — 기기/시뮬레이터 수동 검증

위치 권한 승인/거부 분기와 실제 GPS 좌표 기반 거리순 정렬은 `yarn typecheck`나 웹 번들링으로 검증되지 않는다(브라우저는 네이티브 권한 프롬프트를 그대로 재현하지 않음) — iOS 시뮬레이터 또는 실기기에서 직접 확인한다.

**Files:** 없음(코드 변경 없는 검증 태스크)

- [ ] **Step 1: 앱 실행**

Run: `cd apps/mobile && yarn ios` (또는 `yarn android`)

- [ ] **Step 2: 권한 허용 경로 확인**

Home 화면에서 "내 주변 반려동반 가능 시설 보기" 버튼을 누른다.
Expected: OS 위치 권한 프롬프트가 뜬다 → 허용 시 Search 화면으로 이동하며 "거리순" pill이 활성화(배경색 강조) 상태로 표시되고, 목록이 가까운 순으로 정렬된다.

- [ ] **Step 3: 권한 거부 경로 확인**

기기 설정에서 앱의 위치 권한을 거부로 바꾼 뒤(또는 최초 프롬프트에서 거부 선택), Home 화면의 "내 주변..." 버튼을 다시 누른다.
Expected: Search 화면으로 이동하지 않고, 버튼 아래에 "위치 권한을 허용하면 내 주변 시설을 볼 수 있어요" 안내 텍스트가 나타난다.

Search 화면에서 직접 "거리순" pill을 눌러도 동일하게: 정렬 모드가 relevance로 유지되고 "위치 권한을 허용하면 거리순으로 볼 수 있어요" 안내가 나타나는지 확인한다.

- [ ] **Step 4: 결과 기록**

두 경로 모두 기대대로 동작하면 이 태스크를 완료 처리한다. 어긋나는 부분이 있으면 관련 태스크(8, 9 또는 10)로 돌아가 수정한다 — 이 태스크 자체는 커밋할 코드 변경이 없다.
