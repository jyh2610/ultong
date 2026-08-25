import { View } from "react-native";

import { Skeleton } from "./Skeleton";

export function FacilityCarouselCardSkeleton() {
  return (
    <View className="w-[172px]">
      <Skeleton width={172} height={112} radius={14} />
      <View className="mt-2">
        <Skeleton width={60} height={16} radius={7} />
        <View className="mt-1.5">
          <Skeleton width="80%" height={18} />
        </View>
        <Skeleton width="50%" height={16} />
      </View>
    </View>
  );
}
