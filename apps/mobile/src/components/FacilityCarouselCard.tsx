import { View } from "react-native";

import { Text } from "./AppText";
import { PressableScale } from "./PressableScale";
import { StatusBadge } from "./StatusBadge";
import type { Facility, MatchResult } from "../types/facility";

type FacilityCarouselCardProps = {
  facility: Facility;
  match: MatchResult;
  onPress: () => void;
};

export function FacilityCarouselCard({ facility, match, onPress }: FacilityCarouselCardProps) {
  const alertFlag = facility.reportCount >= 3;
  return (
    <PressableScale onPress={onPress} className="w-[172px]">
      <View className="mb-2 h-[112px] w-[172px] rounded-2xl bg-[#EEE9E0]" />
      <StatusBadge status={match.status} />
      <Text className="mt-1.5 text-body-lg font-bold text-ink">
        {facility.name} · {facility.type}
      </Text>
      <Text className="text-label text-ink-soft">{facility.region}</Text>
      {alertFlag && (
        <Text className="mt-1 text-caption font-semibold text-alert-text">⚠ 규정 변경 가능성</Text>
      )}
    </PressableScale>
  );
}
