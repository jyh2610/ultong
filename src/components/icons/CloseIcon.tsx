import Svg, { Path } from "react-native-svg";

export function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 8 8">
      <Path d="M1 1L7 7M7 1L1 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
