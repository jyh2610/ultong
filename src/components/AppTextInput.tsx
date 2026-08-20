import { TextInput as RNTextInput } from "react-native";
import type { TextInputProps } from "react-native";

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput style={[{ fontFamily: "Pretendard-Regular" }, style]} {...props} />;
}
