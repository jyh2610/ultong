# 위치 기반 기능 클라이언트 전환 설계

**날짜:** 2026-09-14
**대상:** `apps/api`(NestJS), `apps/mobile`(Expo)
**상태:** 승인됨 — 구현 계획(writing-plans) 대기

## 배경

현재 "내 주변 검색"(반경 필터), "거리순 정렬"은 전부 서버(Elasticsearch)에서 처리된다 — 사용자의 현재 좌표(`lat`/`lon`)를 `GET /places/search` 쿼리 파라미터로 서버에 전송하고, ES의 `geo_distance` 필터와 `_geo_distance` 정렬로 계산한다.

`[[project_contest_proposal]]` 메모의 규제 제약: 위치 기반 반경 검색을 서버에서 처리하면(사용자 좌표가 서버로 전송되므로) 위치정보사업자 신고 대상 여부를 확인해야 한다. 클라이언트 로컬 거리 계산·정렬로 우회하면 신고 이슈 자체를 회피할 수 있다.

이번 설계의 목적은 "서버가 사용자 좌표를 아예 받지 않는" 상태를 만드는 것이다 — 단순히 모바일이 해당 파라미터를 안 보내는 정도가 아니라, API 자체가 그 경로를 갖지 않게 한다.

**2026-09-14 갱신 — 데이터 규모 확인 결과:** 팀원 확인 결과 전체 시설 데이터가 "너무 많다"고 확인됨 — 단순히 relevance 정렬로 최대 100건만 받아 그 안에서 거리 계산하는 방식으로는 실제 근처 시설을 놓칠 수 있다. 그래서 서버 쪽 후보를 먼저 **행정구역(시/군/구) 단위**로 좁힌 뒤에만 클라이언트 거리 계산을 적용한다: 기기 좌표를 역지오코딩해 시/군/구 이름을 얻고, 이미 존재하는 `GET /codes/regions`로 이름→코드를 매칭해, 이미 존재하는 `/places/search`의 `ldongRegnCd`/`ldongSignguCd` 필터(수동 지역 검색과 동일한 필터)로 후보를 좁힌다. **정밀 좌표는 여전히 서버로 전송되지 않는다** — 서버가 받는 것은 좁혀진 행정구역 코드뿐이며, 이는 이미 존재하는 일반 검색 필터와 동일한 성격이라 새로운 서버 기능이 아니다. 이렇게 좁혀진 후보(최대 100건)에 대해서만 거리 계산·반경 필터·거리순 정렬을 적용한다.

## API 변경 (`apps/api`)

**주석 처리(삭제 아님)** — 코드는 파일에 남기되 비활성화. 각 블록 상단에 "왜 비활성화했는지"와 날짜를 남긴다.

- `src/search/dto/places-search-query.dto.ts`: `lat`(71-76), `lon`(77-82), `radiusKm`(83-89) 필드 주석 처리. `sort`의 `enum`/`@IsIn`에서 `'distance'` 제거(타입은 `'relevance' | 'recent'`).
- `src/search/places-search.query-builder.ts`: geo_distance 필터 블록(24-35), `_geo_distance` 정렬 블록(146-159) 주석 처리.
- `src/search/places.service.ts`: `getDistanceKm`(189-196) 및 응답의 `distanceKm` 필드(60, 178) 주석 처리.
- `src/search/places.service.spec.ts`: 위 파라미터/필드를 검증하던 기존 테스트 케이스 주석 처리.
- Swagger 문서는 `@ApiPropertyOptional` 데코레이터가 주석 처리되므로 자동으로 반영됨(별도 작업 불필요).

`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`가 전역 적용되어 있으므로, 클라이언트가 실수로 `lat`/`lon`을 보내도 400으로 거부된다(화이트리스트에 없는 필드).

## 모바일 변경 (`apps/mobile`)

### 의존성

- `expo-location` 추가. 권한은 앱 시작 시가 아니라 **위치 기능을 실제로 사용하는 시점**(거리순 선택, "내 주변" 버튼 클릭)에 요청한다.

### 새 유틸

- `src/lib/distance.ts`: 순수 함수 `getDistanceKm(a: {lat,lon}, b: {lat,lon}): number` — Haversine 공식. 외부 의존성 없음.
- `src/lib/codes.ts`: `GET /codes/regions`(기존 엔드포인트) 클라이언트 함수.
- `src/screens/Search/api/resolveNearbyRegion.ts`: 좌표 → 역지오코딩 → `/codes/regions` 이름 매칭 → `{ldongRegnCd, ldongSignguCd?}` 반환. 이름 매칭 실패 시 `null`(지역 필터 없이 거리순 진행, 정확도만 낮아짐).

### 타입/파라미터 정리

- `src/lib/places.ts`의 `PlacesSearchParams`: `lat`/`lon`/`radiusKm` 제거, `sort`를 `'relevance' | 'recent'`로 축소(API DTO와 동일하게 유지). `ldongRegnCd`/`ldongSignguCd`는 기존 필드 그대로 유지(이번에 거리순 모드가 이 필드를 채워 보낸다).
- `src/types/place.ts`의 `distanceKm?: number`: 타입은 유지하되 "서버 응답 필드"가 아니라 "클라이언트가 계산해 붙이는 파생 필드"로 주석을 갱신한다.

### SearchScreen

- 정렬 옵션에 **거리순**(클라이언트 계산) 추가.
- 거리순 선택 시: (1) 위치 권한 요청 → 거부 시 relevance로 폴백 + 안내 메시지, (2) 허용 시 좌표를 `resolveNearbyRegion`으로 시/군/구 코드로 변환, (3) `/places/search`를 그 코드(`ldongRegnCd`/`ldongSignguCd`)와 `size=100`(API 상한)으로 호출(다른 필터는 기존과 동일), (4) 응답의 각 아이템 `location`과 현재 위치로 `distance.ts`를 이용해 `distanceKm` 계산, (5) 선택된 반경으로 로컬 필터링, (6) 거리순 로컬 정렬 후 화면 표시.
- 이 방식은 "사용자의 시/군/구 안에서 가장 가까운 순"이며, 인접 시/군/구 경계 바로 너머의 시설은 후보에서 빠질 수 있다 — 콘테스트 MVP 범위에서는 허용 가능한 트레이드오프로 판단.

### HomeScreen

- "내 주변 반려동반 가능 시설 보기" 버튼: 현재는 `navigation.getParent()?.navigate("Search", {})`만 호출하는 스텁. 이를 (1) 위치 권한 요청 → 거부 시 안내 메시지만 표시하고 이동 취소, (2) 허용 시 `Search` 화면으로 거리순 모드를 켜는 라우트 파라미터(예: `{ autoDistanceSort: true }`)와 함께 이동하도록 변경.

### 영향 없음

- `PlacesMapView.tsx`/`.web.tsx`: 이미 주어진 `{contentId, lat, lon}` 포인트를 그리기만 하므로 변경 불필요.

## 테스트

- `distance.ts`: 유닛 테스트(TDD) — 알려진 두 좌표 쌍의 거리 값 검증, 동일 좌표 시 0.
- API: `places.service.spec.ts`에서 geo 관련 케이스는 주석 처리하고, 남은 케이스(relevance/recent 정렬, 필터)가 여전히 통과하는지 확인.
- 모바일: 위치 권한 거부 시나리오(폴백 동작) 수동 확인.

## 후속 확인 필요 사항

- 역지오코딩 결과(iOS/Android 플랫폼별 `region`/`subregion`/`district` 값)가 `/codes/regions`의 시/군/구 명칭 표기와 실제로 잘 매칭되는지 기기 테스트로 확인 필요 — 표기가 다르면(예: "서울특별시" vs "서울시") 매칭 실패 → 지역 필터 없는 폴백으로 빠진다.
- 인접 시/군/구 경계 근처 사용자를 위한 개선(예: 인접 시/군/구도 함께 조회)은 이번 스코프에서 제외 — 필요성이 확인되면 별도 브레인스토밍.
