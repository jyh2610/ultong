import { apiFetch } from "./apiClient";
import type {
  PlaceCategoryLabel,
  PlaceDetail,
  PlaceSearchItem,
  PlaceSummary,
  PlacesSearchResult,
} from "../types/place";

export const CONTENT_TYPE_ID_BY_CATEGORY: Record<PlaceCategoryLabel, string> = {
  관광지: "12",
  문화시설: "14",
  레포츠: "28",
  숙박: "32",
  음식: "39",
};

// "산책 친화" 탭 근사값 — 서버에 outdoor 전용 필터가 없어 관광지+레포츠로 근사한다.
export const WALK_FRIENDLY_CONTENT_TYPE_IDS = [
  CONTENT_TYPE_ID_BY_CATEGORY.관광지,
  CONTENT_TYPE_ID_BY_CATEGORY.레포츠,
];

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

export type PlaceDetailParams = {
  weightKg?: number;
  hasCage?: boolean;
};

type QueryValue = string | number | boolean | string[] | undefined;

function buildQueryString(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) searchParams.set(key, value.join(","));
    } else {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

export function searchPlaces(params: PlacesSearchParams): Promise<PlacesSearchResult> {
  const qs = buildQueryString(params);
  return apiFetch<PlacesSearchResult>(`/places/search${qs ? `?${qs}` : ""}`);
}

export function getPlaceDetail(
  contentId: string,
  params: PlaceDetailParams = {},
): Promise<PlaceDetail> {
  const qs = buildQueryString(params);
  return apiFetch<PlaceDetail>(`/places/${encodeURIComponent(contentId)}${qs ? `?${qs}` : ""}`);
}

export function toPlaceSummary(item: PlaceSearchItem): PlaceSummary {
  return {
    contentId: item.contentId,
    title: item.title,
    typeLabel: item.category.contentType,
    regionLabel: item.region.sido,
    thumb: item.thumb,
    match: item.match,
  };
}

export function placeDetailToSummary(detail: PlaceDetail): PlaceSummary {
  return {
    contentId: detail.contentId,
    title: detail.title,
    typeLabel: detail.category?.content_type ?? null,
    regionLabel: detail.region?.sido ?? null,
    thumb: detail.media?.thumb ?? detail.media?.first_image ?? null,
    match: detail.match,
  };
}
