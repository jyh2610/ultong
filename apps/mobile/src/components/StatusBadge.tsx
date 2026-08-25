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
    <View
      className={`min-w-[66px] items-center justify-center self-start rounded-md px-2 py-1 ${bg}`}
    >
      <Text className={`text-center text-caption font-bold ${fg}`}>{status}</Text>
    </View>
  );
}
