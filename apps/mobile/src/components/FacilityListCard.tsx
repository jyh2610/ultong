import { View } from "react-native";

import { FavoriteButton } from "./FavoriteButton";
import { Text } from "./AppText";
import { PressableScale } from "./PressableScale";
import { StatusBadge } from "./StatusBadge";
import type { PlaceSummary } from "../types/place";

type FacilityListCardProps = {
  place: PlaceSummary;
  onPress: () => void;
};

export function FacilityListCard({ place, onPress }: FacilityListCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      className="mb-3 flex-row gap-3 rounded-2xl border border-card-border bg-card p-3"
    >
      <View className="h-[68px] w-[68px] rounded-xl bg-[#EEE9E0]" />
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-body-lg font-bold text-ink">{place.title}</Text>
          <View className="flex-row items-center gap-2">
            <StatusBadge verdict={place.match.verdict} />
            <FavoriteButton contentId={place.contentId} />
          </View>
        </View>
        <Text className="my-1 text-footnote text-ink-soft">
          {place.typeLabel} · {place.regionLabel}
        </Text>
      </View>
    </PressableScale>
  );
}
