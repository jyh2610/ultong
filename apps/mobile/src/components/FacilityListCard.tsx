import { View } from "react-native";

import { Text } from "./AppText";
import { PressableScale } from "./PressableScale";
import { StatusBadge } from "./StatusBadge";
import type { Facility, MatchResult } from "../types/facility";

type FacilityListCardProps = {
  facility: Facility;
  match: MatchResult;
  onPress: () => void;
};

export function FacilityListCard({ facility, match, onPress }: FacilityListCardProps) {
  const alertFlag = facility.reportCount >= 3;
  return (
    <PressableScale
      onPress={onPress}
      className="mb-3 flex-row gap-3 rounded-2xl border border-card-border bg-card p-3"
    >
      <View className="h-[68px] w-[68px] rounded-xl bg-[#EEE9E0]" />
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="text-body-lg font-bold text-ink">{facility.name}</Text>
          <StatusBadge status={match.status} />
        </View>
        <Text className="my-1 text-footnote text-ink-soft">
          {facility.type} · {facility.region}
        </Text>
        <Text className="text-caption text-ink-faint">최종 갱신 {facility.updated}</Text>
        {alertFlag && (
          <Text className="mt-1 text-caption font-semibold text-alert-text">
            ⚠ 최근 규정 변경 가능성 (제보 누적)
          </Text>
        )}
      </View>
    </PressableScale>
  );
}
