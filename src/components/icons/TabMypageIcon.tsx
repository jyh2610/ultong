import Svg, { Circle, Path } from "react-native-svg";

export function TabMypageIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 20C5 16.5 8.1 14 12 14C15.9 14 19 16.5 19 20"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
