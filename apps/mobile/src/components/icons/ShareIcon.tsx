import Svg, { Path } from "react-native-svg";

export function ShareIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Path d="M8 1v9" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path
        d="M5 4L8 1L11 4"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 8v4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
