import { Pressable, Text, View } from "react-native";

import { StatusBadge } from "./StatusBadge";
import type { Facility, MatchResult } from "../types/facility";

type SavedFacilityRowProps = {
  facility: Facility;
  match: MatchResult;
  order: number;
  onPress?: () => void;
  onRemove?: () => void;
};

export function SavedFacilityRow({ facility, match, order, onPress, onRemove }: SavedFacilityRowProps) {
  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-card-border bg-card p-3.5">
      <View className="h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#EEF5F0]">
        <Text className="text-xs font-bold text-primary">{order}</Text>
      </View>
      <Pressable onPress={onPress} disabled={!onPress} className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-sm font-bold text-ink">{facility.name}</Text>
          <StatusBadge status={match.status} />
        </View>
        <Text className="mt-0.5 text-[11.5px] text-ink-soft">
          {facility.type} · {facility.region}
        </Text>
      </Pressable>
      {onRemove && (
        <Pressable onPress={onRemove}>
          <Text className="text-xs text-alert-text">제거</Text>
        </Pressable>
      )}
    </View>
  );
}
