import type { RootStackScreenProps } from "../../navigation/types";

export type SearchScreenProps = RootStackScreenProps<"Search">;

// 서버에 보내는 PlacesSortOption(relevance/recent)과는 별개 — "거리순"은
// 서버에 좌표를 보내지 않고 클라이언트에서만 재정렬/필터링하는 화면 전용 모드다.
export type SearchSortMode = "relevance" | "distance";
