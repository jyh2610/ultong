import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";

import { getPlaceDetail, searchPlaces } from "../lib/places";
import type { PlaceDetailParams, PlacesSearchParams } from "../lib/places";

export function useSearchPlaces(params: Omit<PlacesSearchParams, "page">) {
  return useInfiniteQuery({
    queryKey: ["places", "search", params],
    queryFn: ({ pageParam }) => searchPlaces({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
  });
}

export function usePlaceDetail(contentId: string, params: PlaceDetailParams = {}) {
  return useQuery({
    queryKey: ["places", "detail", contentId, params],
    queryFn: () => getPlaceDetail(contentId, params),
  });
}

// 코스/오프라인 화면이 로컬에 저장한 contentId 목록을 상세 조회로 풀어쓴다 —
// 검색 API는 페이지네이션이 있어 "전체 목록"을 대신할 수 없다.
export function usePlacesByIds(contentIds: string[], params: PlaceDetailParams = {}) {
  const results = useQueries({
    queries: contentIds.map((contentId) => ({
      queryKey: ["places", "detail", contentId, params],
      queryFn: () => getPlaceDetail(contentId, params),
    })),
  });

  return {
    data: results.every((r) => r.data) ? results.map((r) => r.data!) : undefined,
    isPending: results.some((r) => r.isPending),
  };
}
