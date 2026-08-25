import { View } from "react-native";

import { Skeleton } from "../../../components/Skeleton";

const REASON_SKELETON_KEYS = ["reason-0", "reason-1", "reason-2", "reason-3"];

export function DetailScreenSkeleton() {
  return (
    <View className="flex-1 bg-screen">
      <Skeleton width="100%" height={210} radius={0} />
      <View className="px-5 pt-4.5">
        <View className="mb-3 gap-1.5">
          <Skeleton width={120} height={11} />
          <Skeleton width={180} height={20} />
          <Skeleton width={100} height={12} />
        </View>
        <View className="mb-5.5 gap-2 rounded-2xl border border-card-border bg-card p-3.5">
          <Skeleton width="80%" height={12} />
          <Skeleton width="60%" height={12} />
          <Skeleton width="50%" height={11} />
        </View>
        <Skeleton width={120} height={15} radius={4} />
        <View className="mb-2 mt-2.5 rounded-2xl border border-card-border bg-card">
          {REASON_SKELETON_KEYS.map((key, index) => (
            <View
              key={key}
              className={`flex-row items-center gap-2.5 px-3.5 py-2.5 ${
                index < REASON_SKELETON_KEYS.length - 1 ? "border-b border-[#F4F1EA]" : ""
              }`}
            >
              <Skeleton width={20} height={20} radius={10} />
              <Skeleton width="60%" height={13} />
            </View>
          ))}
        </View>
        <Skeleton width="100%" height={70} radius={12} />
      </View>
    </View>
  );
}
