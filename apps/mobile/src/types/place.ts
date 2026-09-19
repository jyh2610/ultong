// 카테고리 탭은 5종만 노출한다(축제/행사·쇼핑·교통은 실 API 데이터 검증 결과 제외 — Task 5.5 참고).
export type PlaceCategoryLabel = "관광지" | "문화시설" | "레포츠" | "숙박" | "음식";

export type Verdict = "allowed" | "conditional" | "denied" | "unknown";
export type Confidence = "certain" | "estimated" | "unknown";

export interface MatchResult {
  verdict: Verdict;
  reasons: string[];
  confidence: Confidence;
  areaRestricted: boolean;
}

export interface PetTags {
  pet_allowed?: boolean;
  weight_limit_kg?: number;
  weight_op?: "lte" | "lt";
  weight_is_estimated?: boolean;
  size_max?: string;
  breed_excluded?: string[];
  leash_required?: boolean;
  cage_required?: boolean;
  manner_belt_required?: boolean;
  vaccination_required?: boolean;
  poop_bag_required?: boolean;
  area_scope?: "all" | "partial";
  confidence?: Confidence;
  confidence_score?: number;
}

export interface PlaceCategory {
  contentTypeId: string | null;
  contentType: string | null;
  lcls1: string | null;
  lcls2: string | null;
  lcls3: string | null;
  categoryPath: string | null;
}

export interface PlaceRegion {
  sido: string | null;
  sigungu: string | null;
}

// 카드형 컴포넌트가 실제로 쓰는 필드만 모은 요약 — PlaceSearchItem/PlaceDetail 둘 다
// category/region 필드 모양이 달라서(§lib/places.ts 변환 함수 참고) 카드는 이 형태만 안다.
export interface PlaceSummary {
  contentId: string;
  title: string;
  typeLabel: string | null;
  regionLabel: string | null;
  thumb: string | null;
  match: MatchResult;
}

export interface PlaceSearchItem {
  contentId: string;
  title: string;
  addr1: string | null;
  location: { lat: number; lon: number } | null;
  thumb: string | null;
  category: PlaceCategory;
  region: PlaceRegion;
  // API 응답 필드가 아니다 — 서버는 더 이상 거리를 계산하지 않는다(2026-09-14).
  // 이 필드는 항상 undefined이며, 실제 값은 SearchScreen에서
  // lib/distance.ts의 getDistanceKm으로 화면 표시 시점에 계산해서 쓴다.
  distanceKm?: number;
  petTags: PetTags;
  match: MatchResult;
  evidence: unknown[];
  highlight: Record<string, string[]>;
}

export interface PlaceFacetBucket {
  code: string;
  name: string;
  count: number;
}

export interface PlacesSearchResult {
  total: number;
  page: number;
  size: number;
  hasNext: boolean;
  items: PlaceSearchItem[];
  facets: {
    byCategory: PlaceFacetBucket[];
    byType: PlaceFacetBucket[];
    bySido: PlaceFacetBucket[];
    byConfidence: { code: string; count: number }[];
  };
}

// /places/:contentId는 ES 원문(_source)을 거의 그대로 내린다 — 필드가 contentTypeId별로
// 들쑥날쑥해서(tel/homepage_url/overview 등 있을 수도 없을 수도) 알려진 필드만 명시하고
// 나머지는 인덱스 시그니처로 열어둔다.
export interface PlaceDetail {
  contentId: string;
  title: string;
  addr1?: string | null;
  addr2?: string | null;
  tel?: string | null;
  homepage_url?: string | null;
  overview?: string | null;
  location?: { lat: number; lon: number } | null;
  media?: { thumb?: string; first_image?: string };
  category?: { content_type_id?: string; content_type?: string };
  region?: { sido?: string; sigungu?: string };
  pet_tags?: PetTags;
  pet_raw?: { possible_pet?: string; need_matter?: string; etc_info?: string };
  pet_evidence?: unknown[];
  match: MatchResult;
  intro: Record<string, unknown> | null;
  introSource: "cache" | "live" | "synced";
  introCheckedAt: string;
  [key: string]: unknown;
}
