import { View } from "react-native";

import { Text } from "./AppText";
import { statusColor } from "../lib/statusColor";
import type { MatchStatus } from "../types/facility";

type StatusBadgeProps = {
  status: MatchStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, fg } = statusColor(status);
  return (
    <View className={`rounded-md px-2 py-0.5 ${bg}`}>
      <Text className={`text-[10px] font-bold ${fg}`}>{status}</Text>
    </View>
  );
}
