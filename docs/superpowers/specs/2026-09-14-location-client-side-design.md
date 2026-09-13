# 위치 기반 기능 클라이언트 전환 설계

**날짜:** 2026-09-14
**대상:** `apps/api`(NestJS), `apps/mobile`(Expo)
**상태:** 승인됨 — 구현 계획(writing-plans) 대기

## 배경

현재 "내 주변 검색"(반경 필터), "거리순 정렬"은 전부 서버(Elasticsearch)에서 처리된다 — 사용자의 현재 좌표(`lat`/`lon`)를 `GET /places/search` 쿼리 파라미터로 서버에 전송하고, ES의 `geo_distance` 필터와 `_geo_distance` 정렬로 계산한다.

`[[project_contest_proposal]]` 메모의 규제 제약: 위치 기반 반경 검색을 서버에서 처리하면(사용자 좌표가 서버로 전송되므로) 위치정보사업자 신고 대상 여부를 확인해야 한다. 클라이언트 로컬 거리 계산·정렬로 우회하면 신고 이슈 자체를 회피할 수 있다.

이번 설계의 목적은 "서버가 사용자 좌표를 아예 받지 않는" 상태를 만드는 것이다 — 단순히 모바일이 해당 파라미터를 안 보내는 정도가 아니라, API 자체가 그 경로를 갖지 않게 한다.

**규모 관련 미확정 사항:** 전체 시설 데이터 규모(ES 인덱스 문서 수)가 아직 파악되지 않았다(ES 인덱싱 담당 팀원 확인 필요). 이 설계는 "한 번에 최대 100건(API `size` 상한)을 받아 그 안에서 거리 계산"하는 방식을 전제로 한다 — 데이터가 수천 건 이상으로 확인되면 페이지네이션 방식(다중 페이지 fetch 또는 서버 측 재도입)을 다시 검토해야 한다.

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

- `src/lib/distance.ts`: 순수 함수 `getDistanceKm(a: {lat,lon}, b: {lat,lon}): number` — Haversine 공식. 외부 의존성 없음. TDD로 유닛 테스트 먼저 작성.

### 타입/파라미터 정리

- `src/lib/places.ts`의 `PlacesSearchParams`: `lat`/`lon`/`radiusKm` 제거, `sort`를 `'relevance' | 'recent'`로 축소(API DTO와 동일하게 유지).
- `src/types/place.ts`의 `distanceKm?: number`: 타입은 유지하되 "서버 응답 필드"가 아니라 "클라이언트가 계산해 붙이는 파생 필드"로 주석을 갱신한다.

### SearchScreen

- 정렬 옵션에 **거리순**(클라이언트 계산) 추가.
- 거리순 선택 시: (1) 위치 권한 요청 → 거부 시 relevance로 폴백 + 안내 메시지, (2) 허용 시 `/places/search`를 `size=100`(API 상한)으로 호출(다른 필터는 기존과 동일), (3) 응답의 각 아이템 `location`과 현재 위치로 `distance.ts`를 이용해 `distanceKm` 계산, (4) 선택된 반경으로 로컬 필터링, (5) 거리순 로컬 정렬 후 화면 표시.
- 이 방식은 "받아온 최대 100건 중 가장 가까운 순"이지 "전체 데이터 중 진짜 최근접"은 아님 — 데이터 규모 확인 후 재검토 대상(위 배경 섹션 참고).

### HomeScreen

- "내 주변 반려동반 가능 시설 보기" 버튼: 현재는 `navigation.getParent()?.navigate("Search", {})`만 호출하는 스텁. 이를 (1) 위치 권한 요청 → 거부 시 안내 메시지만 표시하고 이동 취소, (2) 허용 시 `Search` 화면으로 거리순 모드를 켜는 라우트 파라미터(예: `{ autoDistanceSort: true }`)와 함께 이동하도록 변경.

### 영향 없음

- `PlacesMapView.tsx`/`.web.tsx`: 이미 주어진 `{contentId, lat, lon}` 포인트를 그리기만 하므로 변경 불필요.

## 테스트

- `distance.ts`: 유닛 테스트(TDD) — 알려진 두 좌표 쌍의 거리 값 검증, 동일 좌표 시 0.
- API: `places.service.spec.ts`에서 geo 관련 케이스는 주석 처리하고, 남은 케이스(relevance/recent 정렬, 필터)가 여전히 통과하는지 확인.
- 모바일: 위치 권한 거부 시나리오(폴백 동작) 수동 확인.

## 후속 확인 필요 사항

- ES 인덱스 문서 수(팀원 확인) → "배경" 섹션의 100건 제한이 실사용에 충분한지 재검토.
