import { View } from "react-native";

import { Text } from "./AppText";
import { statusColor, VERDICT_LABEL } from "../lib/statusColor";
import type { Verdict } from "../types/place";

type StatusBadgeProps = {
  verdict: Verdict;
};

export function StatusBadge({ verdict }: StatusBadgeProps) {
  const { bg, fg } = statusColor(verdict);
  return (
    <View
      className={`min-w-[66px] items-center justify-center self-start rounded-md px-2 py-1 ${bg}`}
    >
      <Text className={`text-center text-caption font-bold ${fg}`}>{VERDICT_LABEL[verdict]}</Text>
    </View>
  );
}
