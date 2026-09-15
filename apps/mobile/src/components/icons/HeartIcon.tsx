import Svg, { Path } from "react-native-svg";

export function HeartIcon({ color, filled = false }: { color: string; filled?: boolean }) {
  return (
    <Svg width={16} height={15} viewBox="0 0 16 15">
      <Path
        d="M8 13C8 13 2 9.4 2 5.6C2 3.6 3.6 2 5.5 2C6.5 2 7.4 2.5 8 3.3C8.6 2.5 9.5 2 10.5 2C12.4 2 14 3.6 14 5.6C14 9.4 8 13 8 13Z"
        stroke={color}
        strokeWidth={1.5}
        fill={filled ? color : "none"}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
