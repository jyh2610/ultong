import { cssInterop } from "nativewind";
import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

// Apply cssInterop to the base Pressable BEFORE wrapping it with
// Animated.createAnimatedComponent — applying it after (to the already-animated
// component) causes NativeWind's resolved className style to never reach the
// underlying element, dropping every visual utility class (bg-*, border-*,
// rounded-*, padding, width, ...) at runtime.
const StyledPressable = cssInterop(Pressable, { className: "style" });
const AnimatedPressable = Animated.createAnimatedComponent(StyledPressable);

type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: Exclude<PressableProps["style"], Function>;
};

export function PressableScale({ onPressIn, onPressOut, style, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        // eslint-disable-next-line react-hooks/immutability -- reanimated shared values are mutable refs; the react-compiler lint doesn't recognize this pattern
        scale.value = withTiming(0.97, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        // eslint-disable-next-line react-hooks/immutability -- reanimated shared values are mutable refs; the react-compiler lint doesn't recognize this pattern
        scale.value = withTiming(1, { duration: 120 });
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}
      {...props}
    />
  );
}
