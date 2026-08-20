import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "../../components/icons/BackIcon";
import { Text } from "../../components/AppText";
import { FacilityListCard } from "../../components/FacilityListCard";
import { FacilityListCardSkeleton } from "../../components/FacilityListCardSkeleton";
import { Skeleton } from "../../components/Skeleton";
import { computeMatch } from "../../lib/matching";
import { usePetStore } from "../../store/petStore";
import type { FacilityCategory } from "../../types/facility";
import { useFacilities } from "./api/useFacilities";
import { SEARCH_CATEGORIES } from "./constants";
import type { SearchScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2", "skeleton-3"];

const WALK_FRIENDLY_CATEGORIES: FacilityCategory[] = ["관광지", "레포츠"];

export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const [category, setCategory] = useState<(typeof SEARCH_CATEGORIES)[number]["key"]>(
    (route.params?.category as (typeof SEARCH_CATEGORIES)[number]["key"] | undefined) ?? "all",
  );
  const pet = usePetStore((state) => state.pets[0]);
  const { data: facilities, isPending } = useFacilities();
  const insets = useSafeAreaInsets();

  const withMatch =
    pet && facilities ? facilities.map((f) => ({ facility: f, match: computeMatch(pet, f) })) : [];

  const filtered = withMatch.filter(({ facility }) => {
    if (category === "all") return true;
    if (category === "walk") {
      return facility.outdoorAllowed && WALK_FRIENDLY_CATEGORIES.includes(facility.category);
    }
    return facility.category === category;
  });

  const okCount = withMatch.filter((f) => f.match.status === "입장가능").length;
  const condCount = withMatch.filter((f) => f.match.status === "조건부가능").length;
  const checkCount = withMatch.filter((f) => f.match.status === "확인필요").length;

  return (
    <View className="flex-1 bg-screen px-5" style={{ paddingTop: insets.top + 14 }}>
      <View className="mb-4 flex-row items-center gap-2.5">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-[34px] w-[34px] items-center justify-center rounded-full border border-card-border-alt bg-card"
        >
          <BackIcon color="#1C1C1E" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-ink">
          검색결과{" "}
          {isPending ? (
            <Skeleton width={40} height={14} radius={4} />
          ) : (
            <Text className="text-[13.5px] font-normal text-ink-soft">· {filtered.length}곳</Text>
          )}
        </Text>
      </View>
      <FlatList
        horizontal
        data={SEARCH_CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 mb-3.5"
        renderItem={({ item }) => {
          const active = item.key === category;
          return (
            <Pressable
              onPress={() => setCategory(item.key)}
              className={`rounded-xl border px-3.5 py-2 ${
                active ? "border-primary bg-primary" : "border-card-border-alt bg-card"
              }`}
            >
              <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink"}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
      <View className="mb-4 flex-row flex-wrap gap-3">
        {isPending ? (
          <>
            <Skeleton width={70} height={11} radius={4} />
            <Skeleton width={80} height={11} radius={4} />
            <Skeleton width={70} height={11} radius={4} />
          </>
        ) : (
          <>
            <Text className="text-[11px] text-ink-soft">입장가능 {okCount}</Text>
            <Text className="text-[11px] text-ink-soft">조건부가능 {condCount}</Text>
            <Text className="text-[11px] text-ink-soft">확인필요 {checkCount}</Text>
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
      ) : (
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
      )}
    </View>
  );
}
