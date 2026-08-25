import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type SkeletonProps = {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
};

export function Skeleton({ width, height, radius = 8 }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className="bg-[#E8E4DC]"
      style={[{ width, height, borderRadius: radius }, animatedStyle]}
    />
  );
}
