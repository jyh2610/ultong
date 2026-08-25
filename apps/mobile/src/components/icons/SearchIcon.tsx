import Svg, { Circle, Path } from "react-native-svg";

export function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx={7} cy={7} r={5.5} stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M11 11L14.5 14.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
