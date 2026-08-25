import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { ChecklistItem } from "../../components/ChecklistItem";
import { EmptyState } from "../../components/EmptyState";
import { FadeIn } from "../../components/FadeIn";
import { SavedFacilityRow } from "../../components/SavedFacilityRow";
import { SavedFacilityRowSkeleton } from "../../components/SavedFacilityRowSkeleton";
import { Skeleton } from "../../components/Skeleton";
import { computeMatch, mergeChecklists } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { usePetStore } from "../../store/petStore";
import { useToastStore } from "../../store/toastStore";
import { useFacilities } from "../../hooks/useFacilities";
import type { CourseScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1"];

export function CourseScreen({ navigation }: CourseScreenProps) {
  const pet = usePetStore((state) => state.pets[0]);
  const savedIds = useCourseStore((state) => state.savedIds);
  const toggleSaved = useCourseStore((state) => state.toggleSaved);
  const moveSaved = useCourseStore((state) => state.moveSaved);
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const showToast = useToastStore((state) => state.show);
  const { data: facilities, isPending } = useFacilities();
  const insets = useSafeAreaInsets();

  const facilityById = new Map(facilities?.map((f) => [f.id, f]));
  const saved = savedIds
    .map((id) => facilityById.get(id))
    .filter((f): f is NonNullable<typeof f> => !!f);
  const mergedChecklist = mergeChecklists(saved);

  return (
    <View className="flex-1 bg-screen px-5" style={{ paddingTop: insets.top + 16 }}>
      <Text className="mb-1 text-title font-bold text-ink">내 여행 코스</Text>
      <View className="mb-4.5">
        {isPending ? (
          <Skeleton width={80} height={14} radius={4} />
        ) : (
          <Text className="text-footnote text-ink-soft">담은 시설 {saved.length}곳</Text>
        )}
      </View>
      {isPending ? (
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          renderItem={() => <SavedFacilityRowSkeleton />}
        />
      ) : saved.length === 0 || !pet ? (
        <FadeIn className="flex-1">
          <EmptyState
            title="아직 담은 시설이 없어요"
            description={"검색결과에서 마음에 드는 시설을\n코스에 담아보세요"}
          />
        </FadeIn>
      ) : (
        <FadeIn className="flex-1">
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
                onRemove={() => {
                  toggleSaved(item.id);
                  showToast("코스에서 제거했어요");
                }}
                onMoveUp={index > 0 ? () => moveSaved(item.id, "up") : undefined}
                onMoveDown={index < saved.length - 1 ? () => moveSaved(item.id, "down") : undefined}
              />
            )}
            ListFooterComponent={
              <>
                <Text className="mb-1.5 mt-5.5 text-subtitle font-bold text-ink">통합 준비물</Text>
                <Text className="mb-2.5 text-label text-ink-soft">
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
        </FadeIn>
      )}
    </View>
  );
}
