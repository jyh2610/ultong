import type { PlaceCategoryLabel } from "../../types/place";

export const SEARCH_CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "walk", label: "🐾 산책 친화" },
  { key: "관광지", label: "관광지" },
  { key: "문화시설", label: "문화시설" },
  { key: "레포츠", label: "레포츠" },
  { key: "숙박", label: "숙박" },
  { key: "음식", label: "음식" },
] as const satisfies { key: PlaceCategoryLabel | "all" | "walk"; label: string }[];

export const DEFAULT_NEARBY_RADIUS_KM = 5;
