import { View } from "react-native";

import { Text } from "./AppText";
import { PressableScale } from "./PressableScale";
import { StatusBadge } from "./StatusBadge";
import type { PlaceSummary } from "../types/place";

type FacilityCarouselCardProps = {
  place: PlaceSummary;
  onPress: () => void;
};

export function FacilityCarouselCard({ place, onPress }: FacilityCarouselCardProps) {
  return (
    <PressableScale onPress={onPress} className="w-[172px]">
      <View className="mb-2 h-[112px] w-[172px] rounded-2xl bg-[#EEE9E0]" />
      <StatusBadge verdict={place.match.verdict} />
      <Text className="mt-1.5 text-body-lg font-bold text-ink">
        {place.title} · {place.typeLabel}
      </Text>
      <Text className="text-label text-ink-soft">{place.regionLabel}</Text>
    </PressableScale>
  );
}
