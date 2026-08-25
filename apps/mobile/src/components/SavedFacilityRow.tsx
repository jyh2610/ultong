import { View } from "react-native";

import { Text } from "./AppText";
import { PressableScale } from "./PressableScale";
import { StatusBadge } from "./StatusBadge";
import type { Facility, MatchResult } from "../types/facility";

type SavedFacilityRowProps = {
  facility: Facility;
  match: MatchResult;
  order: number;
  onPress?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

export function SavedFacilityRow({
  facility,
  match,
  order,
  onPress,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
}: SavedFacilityRowProps) {
  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-card-border bg-card p-3.5">
      <View className="h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#EEF5F0]">
        <Text className="text-footnote font-bold text-primary">{order}</Text>
      </View>
      <PressableScale onPress={onPress} disabled={!onPress} className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-body-lg font-bold text-ink" numberOfLines={1}>
            {facility.name}
          </Text>
          <View className="flex-row items-center gap-2">
            <StatusBadge status={match.status} />
            {onRemove && (
              <PressableScale
                onPress={onRemove}
                hitSlop={8}
                className="rounded-md px-2 py-1"
                accessibilityRole="button"
                accessibilityLabel="코스에서 제거"
              >
                <Text className="text-footnote text-alert-text">제거</Text>
              </PressableScale>
            )}
          </View>
        </View>
        <Text className="mt-0.5 text-label text-ink-soft">
          {facility.type} · {facility.region}
        </Text>
      </PressableScale>
      {(onMoveUp || onMoveDown) && (
        <View className="gap-1">
          <PressableScale
            onPress={onMoveUp}
            disabled={!onMoveUp || !canMoveUp}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="순서 위로 이동"
            className="h-6 w-6 items-center justify-center rounded-md"
          >
            <Text className={`text-label ${canMoveUp ? "text-ink-soft" : "text-ink-faint opacity-40"}`}>
              ▲
            </Text>
          </PressableScale>
          <PressableScale
            onPress={onMoveDown}
            disabled={!onMoveDown || !canMoveDown}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="순서 아래로 이동"
            className="h-6 w-6 items-center justify-center rounded-md"
          >
            <Text className={`text-label ${canMoveDown ? "text-ink-soft" : "text-ink-faint opacity-40"}`}>
              ▼
            </Text>
          </PressableScale>
        </View>
      )}
    </View>
  );
}
