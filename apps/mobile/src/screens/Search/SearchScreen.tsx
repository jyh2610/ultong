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

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2", "skeleton-3"];

const MATCH_PRIORITY: Record<Verdict, number> = {
  allowed: 0,
  conditional: 1,
  denied: 2,
  unknown: 3,
};

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
      // enableDistanceSort는 await 이후에만 setState를 호출한다(동기 호출 아님) —
      // 규칙이 async 경계를 구분하지 못해 오탐 발생. 라우트 파라미터로 화면 진입 시
      // 1회 자동 실행하는 의도된 패턴이다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <View className="flex-1 bg-screen px-5" style={{ paddingTop: insets.top + 14 }}>
      <View className="mb-3 flex-row items-center gap-2.5">
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          className="h-[34px] w-[34px] items-center justify-center rounded-full border border-card-border-alt bg-card"
        >
          <BackIcon color="#1C1C1E" />
        </PressableScale>
        <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-card-border-alt bg-card px-4 py-2.5">
          <SearchIcon color="#9A9A9E" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => addRecentQuery(query)}
            placeholder="지역, 시설명으로 검색"
            autoFocus={!route.params?.category}
            returnKeyType="search"
            textAlignVertical="center"
            className="h-5 flex-1 text-body-lg text-ink"
          />
        </View>
      </View>
      <View className="mb-3.5 flex-row items-center justify-between">
        {isPending ? (
          <Skeleton width={40} height={12} radius={4} />
        ) : (
          <Text className="text-body text-ink-soft">{filtered.length}곳</Text>
        )}
        <View className="flex-row rounded-full border border-card-border-alt bg-card p-0.5">
          <PressableScale
            onPress={() => setViewMode("list")}
            className={`rounded-full px-3 py-1 ${viewMode === "list" ? "bg-primary" : ""}`}
          >
            <Text
              className={`text-label font-semibold ${viewMode === "list" ? "text-white" : "text-ink-soft"}`}
            >
              리스트
            </Text>
          </PressableScale>
          <PressableScale
            onPress={() => setViewMode("map")}
            className={`rounded-full px-3 py-1 ${viewMode === "map" ? "bg-primary" : ""}`}
          >
            <Text
              className={`text-label font-semibold ${viewMode === "map" ? "text-white" : "text-ink-soft"}`}
            >
              지도
            </Text>
          </PressableScale>
        </View>
      </View>
      <FlatList
        horizontal
        data={SEARCH_CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        className="flex-none"
        contentContainerClassName="items-start gap-2 mb-3.5"
        renderItem={({ item }) => {
          const active = item.key === category;
          return (
            <PressableScale
              onPress={() => setCategory(item.key)}
              className={`min-w-[84px] items-center justify-center rounded-xl border px-3 py-3 ${
                active ? "border-primary bg-primary" : "border-card-border-alt bg-card"
              }`}
            >
              <Text
                className={`text-center text-footnote font-bold ${active ? "text-white" : "text-ink"}`}
              >
                {item.label}
              </Text>
            </PressableScale>
          );
        }}
      />
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
      <View className="mb-4 flex-row flex-wrap gap-3">
        {isPending ? (
          <>
            <Skeleton width={70} height={11} radius={4} />
            <Skeleton width={80} height={11} radius={4} />
            <Skeleton width={70} height={11} radius={4} />
          </>
        ) : (
          <>
            <Text className="text-label text-ink-soft">입장가능 {okCount}</Text>
            <Text className="text-label text-ink-soft">조건부가능 {condCount}</Text>
            <Text className="text-label text-ink-soft">확인필요 {checkCount}</Text>
          </>
        )}
      </View>
      {isPending ? (
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          contentContainerClassName="pb-8"
          renderItem={() => <FacilityListCardSkeleton />}
        />
      ) : filtered.length === 0 ? (
        <FadeIn className="flex-1">
          <EmptyState
            title="조건에 맞는 시설이 없어요"
            description="다른 카테고리를 선택해보세요"
          />
        </FadeIn>
      ) : viewMode === "map" ? (
        <FadeIn className="flex-1">
          <PlacesMapView
            points={mapPoints}
            onMarkerPress={(contentId) => navigation.navigate("Detail", { facilityId: contentId })}
          />
        </FadeIn>
      ) : (
        <FadeIn className="flex-1">
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.contentId}
            contentContainerClassName="pb-8"
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator className="py-4" color="#7A4A2B" />
              ) : null
            }
            renderItem={({ item }) => (
              <FacilityListCard
                place={item}
                onPress={() => navigation.navigate("Detail", { facilityId: item.contentId })}
              />
            )}
          />
        </FadeIn>
      )}
    </View>
  );
}
