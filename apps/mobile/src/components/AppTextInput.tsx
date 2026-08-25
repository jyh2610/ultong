import { TextInput as RNTextInput } from "react-native";
import type { TextInputProps } from "react-native";

export function TextInput({ style, ...props }: TextInputProps) {
  // Inline style always wins over className in NativeWind's cascade — a future font-family
  // utility class would need !important to override this default.
  return <RNTextInput style={[{ fontFamily: "Pretendard-Regular" }, style]} {...props} />;
}
