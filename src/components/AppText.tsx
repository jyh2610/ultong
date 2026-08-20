import { Text as RNText } from "react-native";
import type { TextProps } from "react-native";

export function Text({ style, ...props }: TextProps) {
  // Inline style always wins over className in NativeWind's cascade — a future font-family
  // utility class would need !important to override this default.
  return <RNText style={[{ fontFamily: "Pretendard-Regular" }, style]} {...props} />;
}
