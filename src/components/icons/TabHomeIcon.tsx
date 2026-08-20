import Svg, { Path } from "react-native-svg";

export function TabHomeIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11L12 4L20 11V19A1 1 0 0 1 19 20H5A1 1 0 0 1 4 19V11Z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
