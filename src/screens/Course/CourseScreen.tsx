import { FlatList, Text, View } from "react-native";

import { ChecklistItem } from "../../components/ChecklistItem";
import { EmptyState } from "../../components/EmptyState";
import { SavedFacilityRow } from "../../components/SavedFacilityRow";
import { SavedFacilityRowSkeleton } from "../../components/SavedFacilityRowSkeleton";
import { computeMatch, mergeChecklists } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { usePetStore } from "../../store/petStore";
import { useCourseFacilities } from "./api/useCourseFacilities";
import type { CourseScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1"];

export function CourseScreen({ navigation }: CourseScreenProps) {
  const pet = usePetStore((state) => state.pets[0]);
  const savedIds = useCourseStore((state) => state.savedIds);
  const toggleSaved = useCourseStore((state) => state.toggleSaved);
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const { data: facilities, isPending } = useCourseFacilities();

  const saved = facilities ? facilities.filter((f) => savedIds.includes(f.id)) : [];
  const mergedChecklist = mergeChecklists(saved);

  if (isPending) {
    return (
      <View className="flex-1 bg-screen px-5 pt-4">
        <Text className="mb-1 text-lg font-bold text-ink">내 여행 코스</Text>
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          renderItem={() => <SavedFacilityRowSkeleton />}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-screen px-5 pt-4">
      <Text className="mb-1 text-lg font-bold text-ink">내 여행 코스</Text>
      <Text className="mb-4.5 text-[12.5px] text-ink-soft">담은 시설 {saved.length}곳</Text>
      {saved.length === 0 || !pet ? (
        <EmptyState
          title="아직 담은 시설이 없어요"
          description={"검색결과에서 마음에 드는 시설을\n코스에 담아보세요"}
        />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SavedFacilityRow
              facility={item}
              match={computeMatch(pet, item)}
              order={index + 1}
              onPress={() =>
                navigation.getParent()?.navigate("Detail", { facilityId: item.id })
              }
              onRemove={() => toggleSaved(item.id)}
            />
          )}
          ListFooterComponent={
            <>
              <Text className="mb-1.5 mt-5.5 text-[15px] font-bold text-ink">통합 준비물</Text>
              <Text className="mb-2.5 text-[11.5px] text-ink-soft">
                담은 시설의 조건을 합쳐 중복 없이 정리했어요
              </Text>
              <View className="mb-8 rounded-2xl border border-card-border bg-card p-1">
                {mergedChecklist.map((item) => (
                  <ChecklistItem
                    key={item}
                    label={item}
                    checked={!!checkedPrep[item]}
                    onToggle={() => togglePrep(item)}
                  />
                ))}
              </View>
            </>
          }
        />
      )}
    </View>
  );
}
