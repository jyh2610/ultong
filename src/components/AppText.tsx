import { Text as RNText } from "react-native";
import type { TextProps } from "react-native";

export function Text({ style, ...props }: TextProps) {
  return <RNText style={[{ fontFamily: "Pretendard-Regular" }, style]} {...props} />;
}
