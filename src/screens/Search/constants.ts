// 카테고리 탭은 5종(관광지·문화시설·레포츠·숙박·음식)만 노출한다 — Task 5.5 참고
// (축제/행사·쇼핑·교통은 실 API 데이터 검증 결과 메인 탭에서 제외됨).
export const SEARCH_CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "walk", label: "🐾 산책 친화" },
  { key: "관광지", label: "관광지" },
  { key: "문화시설", label: "문화시설" },
  { key: "레포츠", label: "레포츠" },
  { key: "숙박", label: "숙박" },
  { key: "음식", label: "음식" },
] as const;
