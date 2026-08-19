import { View } from "react-native";

import { Skeleton } from "./Skeleton";

export function FacilityListCardSkeleton() {
  return (
    <View className="mb-3 flex-row gap-3 rounded-2xl border border-card-border bg-card p-3">
      <Skeleton width={68} height={68} radius={12} />
      <View className="flex-1 justify-center gap-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="30%" height={10} />
      </View>
    </View>
  );
}
