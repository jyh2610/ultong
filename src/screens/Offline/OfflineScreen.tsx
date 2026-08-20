import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChecklistItem } from "../../components/ChecklistItem";
import { EmptyState } from "../../components/EmptyState";
import { SavedFacilityRow } from "../../components/SavedFacilityRow";
import { SavedFacilityRowSkeleton } from "../../components/SavedFacilityRowSkeleton";
import { ToggleSwitch } from "../../components/ToggleSwitch";
import { computeMatch, mergeChecklists } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { useOfflineStore } from "../../store/offlineStore";
import { usePetStore } from "../../store/petStore";
import { useOfflineFacilities } from "./api/useOfflineFacilities";
import type { OfflineScreenProps } from "./types";

const SKELETON_KEYS = ["skeleton-0", "skeleton-1"];

export function OfflineScreen(_props: OfflineScreenProps) {
  const pet = usePetStore((state) => state.pets[0]);
  const savedIds = useCourseStore((state) => state.savedIds);
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const offlineSaved = useOfflineStore((state) => state.offlineSaved);
  const setOfflineSaved = useOfflineStore((state) => state.setOfflineSaved);
  const { data: facilities, isPending } = useOfflineFacilities();
  const insets = useSafeAreaInsets();

  const saved = facilities ? facilities.filter((f) => savedIds.includes(f.id)) : [];
  const mergedChecklist = mergeChecklists(saved);

  return (
    <View className="flex-1 bg-screen px-5" style={{ paddingTop: insets.top + 16 }}>
      <Text className="mb-1.5 text-lg font-bold text-ink">오프라인 보관함</Text>
      <Text className="mb-4.5 text-[12.5px] leading-5 text-ink-soft">
        여행 현장에서 네트워크 없이도 코스와 준비물을 확인할 수 있어요
      </Text>
      <View className="mb-5 flex-row items-center justify-between rounded-2xl border border-card-border bg-card p-4">
        <View>
          <Text className="mb-1 text-sm font-bold text-ink">기기에 저장</Text>
          <Text className="text-[11.5px] text-ink-soft">
            {offlineSaved ? "오프라인에 저장됨 · 네트워크 없이 확인 가능" : "아직 오프라인에 저장하지 않았어요"}
          </Text>
        </View>
        <ToggleSwitch value={offlineSaved} onToggle={() => setOfflineSaved(!offlineSaved)} />
      </View>
      {isPending ? (
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          renderItem={() => <SavedFacilityRowSkeleton />}
        />
      ) : saved.length === 0 || !pet ? (
        <EmptyState
          title="저장할 코스가 아직 없어요"
          description={"코스 탭에서 시설을 담으면\n여기서 오프라인으로 저장할 수 있어요"}
        />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SavedFacilityRow facility={item} match={computeMatch(pet, item)} order={index + 1} />
          )}
          ListFooterComponent={
            <>
              <Text className="mb-1.5 mt-5 text-[15px] font-bold text-ink">통합 준비물</Text>
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
