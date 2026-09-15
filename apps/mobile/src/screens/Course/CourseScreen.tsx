import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { ChecklistItem } from "../../components/ChecklistItem";
import { EmptyState } from "../../components/EmptyState";
import { FadeIn } from "../../components/FadeIn";
import { SavedFacilityRow } from "../../components/SavedFacilityRow";
import { SavedFacilityRowSkeleton } from "../../components/SavedFacilityRowSkeleton";
import { Skeleton } from "../../components/Skeleton";
import { useMyCourse, useReorderCourseItem, useToggleCourseItem } from "../../hooks/useCourse";
import { usePets } from "../../hooks/usePets";
import { usePlacesByIds } from "../../hooks/usePlaces";
import { mergeChecklists } from "../../lib/checklist";
import { pickDefaultPet } from "../../lib/pets";
import { placeDetailToSummary } from "../../lib/places";
import { PlacesMapView } from "../../components/PlacesMapView";
import type { MapPoint } from "../../components/PlacesMapView";
import { useCourseStore } from "../../store/courseStore";
import { useToastStore } from "../../store/toastStore";
import type { CourseScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1"];

export function CourseScreen({ navigation }: CourseScreenProps) {
  const { data: pets = [] } = usePets();
  const pet = pickDefaultPet(pets);
  const { course, isPending: coursePending } = useMyCourse();
  const toggleCourseItem = useToggleCourseItem();
  const reorderCourseItem = useReorderCourseItem();
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const showToast = useToastStore((state) => state.show);
  const items = course?.items ?? [];
  const { data: places, isPending: placesPending } = usePlacesByIds(
    items.map((item) => item.contentId),
    { weightKg: pet?.weightKg, hasCage: pet?.hasCage },
  );
  const isPending = coursePending || (items.length > 0 && placesPending);
  const insets = useSafeAreaInsets();

  const saved = places ?? [];
  const mergedChecklist = mergeChecklists(saved.map((p) => p.pet_tags));
  const mapPoints: MapPoint[] = saved
    .map((place) =>
      place.location
        ? { contentId: place.contentId, lat: place.location.lat, lon: place.location.lon }
        : null,
    )
    .filter((point): point is MapPoint => point !== null);

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
          renderItem={() => <SavedFacilityRowSkeleton withReorder />}
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
            keyExtractor={(item) => item.contentId}
            ListHeaderComponent={
              mapPoints.length > 0 ? (
                <View className="mb-5 h-[220px] overflow-hidden rounded-2xl border border-card-border bg-card">
                  <PlacesMapView points={mapPoints} showRoute />
                </View>
              ) : undefined
            }
            renderItem={({ item, index }) => (
              <SavedFacilityRow
                place={placeDetailToSummary(item)}
                order={index + 1}
                onPress={() =>
                  navigation.getParent()?.navigate("Detail", { facilityId: item.contentId })
                }
                onRemove={() => {
                  toggleCourseItem.mutate(
                    { course, contentId: item.contentId, title: item.title },
                    { onSuccess: () => showToast("코스에서 제거했어요") },
                  );
                }}
                onMoveUp={
                  index > 0
                    ? () =>
                        reorderCourseItem.mutate({
                          courseId: course!.id,
                          items,
                          contentId: item.contentId,
                          direction: "up",
                        })
                    : undefined
                }
                onMoveDown={
                  index < saved.length - 1
                    ? () =>
                        reorderCourseItem.mutate({
                          courseId: course!.id,
                          items,
                          contentId: item.contentId,
                          direction: "down",
                        })
                    : undefined
                }
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
