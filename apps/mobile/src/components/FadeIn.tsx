import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import Animated, { FadeIn as FadeInAnimation } from "react-native-reanimated";

type FadeInProps = PropsWithChildren<ViewProps>;

export function FadeIn({ children, ...props }: FadeInProps) {
  return (
    <Animated.View entering={FadeInAnimation.duration(220)} {...props}>
      {children}
    </Animated.View>
  );
}
