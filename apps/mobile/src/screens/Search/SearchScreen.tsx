import { useState } from "react";
import { FlatList, View } from "react-native";
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
import { Skeleton } from "../../components/Skeleton";
import { computeMatch } from "../../lib/matching";
import { usePetStore } from "../../store/petStore";
import { useSearchHistoryStore } from "../../store/searchHistoryStore";
import type { FacilityCategory, MatchStatus } from "../../types/facility";
import { useFacilities } from "../../hooks/useFacilities";
import { SEARCH_CATEGORIES } from "./constants";
import type { SearchScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2", "skeleton-3"];

const WALK_FRIENDLY_CATEGORIES: FacilityCategory[] = ["관광지", "레포츠"];

const MATCH_PRIORITY: Record<MatchStatus, number> = {
  입장가능: 0,
  조건부가능: 1,
  확인필요: 2,
};

export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const [category, setCategory] = useState<(typeof SEARCH_CATEGORIES)[number]["key"]>(
    (route.params?.category as (typeof SEARCH_CATEGORIES)[number]["key"] | undefined) ?? "all",
  );
  const [query, setQuery] = useState(route.params?.query ?? "");
  const [okOnly, setOkOnly] = useState(false);
  const [sortByMatch, setSortByMatch] = useState(false);
  const addRecentQuery = useSearchHistoryStore((state) => state.addQuery);
  const pet = usePetStore((state) => state.pets[0]);
  const { data: facilities, isPending } = useFacilities();
  const insets = useSafeAreaInsets();

  const withMatch =
    pet && facilities ? facilities.map((f) => ({ facility: f, match: computeMatch(pet, f) })) : [];

  const normalizedQuery = query.trim().toLowerCase();

  const matchesCategory = (facility: (typeof withMatch)[number]["facility"]) => {
    if (category === "all") return true;
    if (category === "walk") {
      return facility.outdoorAllowed && WALK_FRIENDLY_CATEGORIES.includes(facility.category);
    }
    return facility.category === category;
  };

  const matchesQuery = (facility: (typeof withMatch)[number]["facility"]) =>
    !normalizedQuery ||
    facility.name.toLowerCase().includes(normalizedQuery) ||
    facility.region.toLowerCase().includes(normalizedQuery) ||
    facility.type.toLowerCase().includes(normalizedQuery);

  const filtered = withMatch
    .filter(
      ({ facility, match }) =>
        matchesCategory(facility) && matchesQuery(facility) && (!okOnly || match.status === "입장가능"),
    )
    .sort((a, b) => (sortByMatch ? MATCH_PRIORITY[a.match.status] - MATCH_PRIORITY[b.match.status] : 0));

  const okCount = withMatch.filter((f) => f.match.status === "입장가능").length;
  const condCount = withMatch.filter((f) => f.match.status === "조건부가능").length;
  const checkCount = withMatch.filter((f) => f.match.status === "확인필요").length;

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
      <View className="mb-3.5">
        {isPending ? (
          <Skeleton width={40} height={12} radius={4} />
        ) : (
          <Text className="text-body text-ink-soft">{filtered.length}곳</Text>
        )}
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
      </View>
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
      ) : (
        <FadeIn className="flex-1">
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.facility.id}
            contentContainerClassName="pb-8"
            renderItem={({ item }) => (
              <FacilityListCard
                facility={item.facility}
                match={item.match}
                onPress={() => navigation.navigate("Detail", { facilityId: item.facility.id })}
              />
            )}
          />
        </FadeIn>
      )}
    </View>
  );
}
