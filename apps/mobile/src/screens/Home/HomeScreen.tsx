import { useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { PressableScale } from "../../components/PressableScale";
import { TextInput } from "../../components/AppTextInput";
import { FacilityCarouselCard } from "../../components/FacilityCarouselCard";
import { FacilityCarouselCardSkeleton } from "../../components/FacilityCarouselCardSkeleton";
import { FadeIn } from "../../components/FadeIn";
import { CloseIcon } from "../../components/icons/CloseIcon";
import { LocationPinIcon } from "../../components/icons/LocationPinIcon";
import { SearchIcon } from "../../components/icons/SearchIcon";
import { computeMatch } from "../../lib/matching";
import { sizeOf } from "../../lib/petSize";
import { usePetStore } from "../../store/petStore";
import { useSearchHistoryStore } from "../../store/searchHistoryStore";
import { useFacilities } from "../../hooks/useFacilities";
import { HOME_CATEGORIES, POPULAR_REGIONS } from "./constants";
import type { HomeScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2"];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const pet = pets[0];
  const { data: facilities, isPending } = useFacilities();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const recentQueries = useSearchHistoryStore((state) => state.recentQueries);
  const addRecentQuery = useSearchHistoryStore((state) => state.addQuery);
  const removeRecentQuery = useSearchHistoryStore((state) => state.removeQuery);
  const clearRecentQueries = useSearchHistoryStore((state) => state.clear);

  const goToSearch = (q: string) => {
    addRecentQuery(q);
    navigation.getParent()?.navigate("Search", { query: q });
  };

  const recommendations =
    pet && facilities
      ? facilities
          .map((facility) => ({ facility, match: computeMatch(pet, facility) }))
          .slice(0, 3)
      : [];

  return (
    <View className="flex-1 bg-screen" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4">
        <View className="mb-4.5 flex-row items-start justify-between">
          <View>
            <Text className="mb-1 text-footnote text-ink-soft">반가워요</Text>
            <Text className="text-headline font-bold leading-7 text-ink">
              {pet?.name ?? "반려동물"}와 함께{"\n"}어디로 떠나볼까요?
            </Text>
          </View>
          <PressableScale
            onPress={() => navigation.navigate("MyPage")}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#EEF5F0]"
          >
            <Text className="text-title font-bold text-primary">{pet?.name.charAt(0) ?? "멍"}</Text>
          </PressableScale>
        </View>
        <View className="mb-2.5 w-full flex-row items-center gap-2.5 rounded-2xl border border-card-border-alt bg-card p-4">
          <SearchIcon color="#9A9A9E" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => goToSearch(query)}
            returnKeyType="search"
            placeholder="지역, 시설명으로 검색"
            textAlignVertical="center"
            className="h-5 flex-1 text-body-lg text-ink"
          />
        </View>
        {!query && recentQueries.length > 0 && (
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-label font-bold text-ink-soft">최근 검색어</Text>
              <PressableScale onPress={clearRecentQueries}>
                <Text className="text-label text-ink-faint">전체삭제</Text>
              </PressableScale>
            </View>
            <FlatList
              horizontal
              data={recentQueries}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
              renderItem={({ item }) => (
                <View className="flex-row items-center gap-1.5 rounded-full border border-card-border-alt bg-card py-1.5 pl-3 pr-2.5">
                  <PressableScale onPress={() => goToSearch(item)}>
                    <Text className="text-label text-ink">{item}</Text>
                  </PressableScale>
                  <PressableScale
                    onPress={() => removeRecentQuery(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item} 검색 기록 삭제`}
                    hitSlop={8}
                  >
                    <CloseIcon color="#9A9A9E" />
                  </PressableScale>
                </View>
              )}
            />
          </View>
        )}
        <PressableScale
          onPress={() => navigation.getParent()?.navigate("Search", {})}
          className="mb-4 w-full flex-row items-center gap-2 rounded-2xl border border-card-border-alt bg-[#EEF5F0] px-4 py-3"
        >
          <LocationPinIcon color="#7A4A2B" />
          <Text className="text-body font-semibold text-primary">
            내 주변 반려동반 가능 시설 보기
          </Text>
        </PressableScale>
        <FlatList
          horizontal
          data={HOME_CATEGORIES}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 mb-6.5"
          renderItem={({ item }) => (
            <PressableScale
              onPress={() => navigation.getParent()?.navigate("Search", { category: item.key })}
              className="min-w-[84px] items-center justify-center rounded-xl border border-card-border-alt bg-card px-3 py-3"
            >
              <Text className="text-center text-footnote font-semibold text-ink">{item.label}</Text>
            </PressableScale>
          )}
        />
        <Text className="mb-1 text-subtitle font-bold text-ink">우리 아이 조건에 맞는 추천</Text>
        {pet && (
          <Text className="mb-3.5 text-footnote text-ink-soft">
            {pet.name}({sizeOf(pet.weight)}견 · {pet.weight}kg) 기준
          </Text>
        )}
        {isPending ? (
          <FlatList
            horizontal
            data={SKELETON_KEYS}
            keyExtractor={(key) => key}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 mb-6.5"
            renderItem={() => <FacilityCarouselCardSkeleton />}
          />
        ) : (
          <FadeIn>
            <FlatList
              horizontal
              data={recommendations}
              keyExtractor={(item) => item.facility.id}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 mb-6.5"
              renderItem={({ item }) => (
                <FacilityCarouselCard
                  facility={item.facility}
                  match={item.match}
                  onPress={() =>
                    navigation.getParent()?.navigate("Detail", { facilityId: item.facility.id })
                  }
                />
              )}
            />
          </FadeIn>
        )}
        <Text className="mb-3 mt-6.5 text-subtitle font-bold text-ink">인기 지역</Text>
        <View className="flex-row flex-wrap gap-2">
          {POPULAR_REGIONS.map((region) => (
            <PressableScale
              key={region}
              onPress={() => navigation.getParent()?.navigate("Search", {})}
              className="w-[23%] rounded-xl border border-card-border-alt bg-card py-3.5"
            >
              <Text className="text-center text-footnote font-semibold text-ink">{region}</Text>
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
