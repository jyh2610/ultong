import { View } from "react-native";

import { Skeleton } from "./Skeleton";

export function FacilityCarouselCardSkeleton() {
  return (
    <View className="w-[172px]">
      <Skeleton width={172} height={112} radius={14} />
      <View className="mt-2 gap-1.5">
        <Skeleton width={60} height={16} radius={7} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}
