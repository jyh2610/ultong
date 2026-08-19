import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { FacilityCarouselCard } from "../../components/FacilityCarouselCard";
import { FacilityCarouselCardSkeleton } from "../../components/FacilityCarouselCardSkeleton";
import { computeMatch } from "../../lib/matching";
import { sizeOf } from "../../lib/petSize";
import { usePetStore } from "../../store/petStore";
import { useHomeFacilities } from "./api/useHomeFacilities";
import { HOME_CATEGORIES, POPULAR_REGIONS } from "./constants";
import type { HomeScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2"];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const pet = pets[0];
  const { data: facilities, isPending } = useHomeFacilities();

  const recommendations =
    pet && facilities
      ? facilities
          .map((facility) => ({ facility, match: computeMatch(pet, facility) }))
          .slice(0, 3)
      : [];

  return (
    <View className="flex-1 bg-screen">
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4">
        <View className="mb-4.5 flex-row items-start justify-between">
          <View>
            <Text className="mb-1 text-xs text-ink-soft">반가워요</Text>
            <Text className="text-[21px] font-bold leading-7 text-ink">
              {pet?.name ?? "반려동물"}와 함께{"\n"}어디로 떠나볼까요?
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("MyPage")}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#EEF5F0]"
          >
            <Text className="text-[17px] font-bold text-primary">{pet?.name.charAt(0) ?? "멍"}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => navigation.getParent()?.navigate("Search", {})}
          className="mb-2.5 w-full flex-row items-center gap-2.5 rounded-2xl border border-card-border-alt bg-card p-4"
        >
          <TextInput
            editable={false}
            placeholder="지역, 시설명으로 검색"
            className="flex-1 text-[14.5px] text-ink-faint"
            pointerEvents="none"
          />
        </Pressable>
        <Pressable
          onPress={() => navigation.getParent()?.navigate("Search", {})}
          className="mb-4 w-full flex-row items-center gap-2 rounded-2xl border border-card-border-alt bg-[#EEF5F0] px-4 py-3"
        >
          <Text className="text-[13.5px] font-semibold text-primary">
            내 주변 반려동반 가능 시설 보기
          </Text>
        </Pressable>
        <FlatList
          horizontal
          data={HOME_CATEGORIES}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 mb-6.5"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.getParent()?.navigate("Search", { category: item.key })}
              className="rounded-xl border border-card-border-alt bg-card px-3.5 py-2.5"
            >
              <Text className="text-xs font-semibold text-ink">{item.label}</Text>
            </Pressable>
          )}
        />
        <Text className="mb-1 text-[15.5px] font-bold text-ink">우리 아이 조건에 맞는 추천</Text>
        {pet && (
          <Text className="mb-3.5 text-xs text-ink-soft">
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
        )}
        <Text className="mb-3 mt-6.5 text-[15.5px] font-bold text-ink">인기 지역</Text>
        <View className="flex-row flex-wrap gap-2">
          {POPULAR_REGIONS.map((region) => (
            <Pressable
              key={region}
              onPress={() => navigation.getParent()?.navigate("Search", {})}
              className="w-[23%] rounded-xl border border-card-border-alt bg-card py-3.5"
            >
              <Text className="text-center text-xs font-semibold text-ink">{region}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
