import Svg, { Path } from "react-native-svg";

export function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14">
      <Path
        d="M7 1L1 7l6 6"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
