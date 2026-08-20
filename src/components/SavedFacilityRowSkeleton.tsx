import { View } from "react-native";

import { Skeleton } from "./Skeleton";

export function SavedFacilityRowSkeleton() {
  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-card-border bg-card p-3.5">
      <Skeleton width={26} height={26} radius={8} />
      <View className="flex-1">
        <Skeleton width="50%" height={20} />
        <View className="mt-0.5">
          <Skeleton width="35%" height={16} />
        </View>
      </View>
    </View>
  );
}
