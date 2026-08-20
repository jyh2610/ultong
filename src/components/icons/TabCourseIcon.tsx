import Svg, { Path } from "react-native-svg";

export function TabCourseIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19V7C4 5.9 4.9 5 6 5H10L12 8H18C19.1 8 20 8.9 20 10V19"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
