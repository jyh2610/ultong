import Svg, { Path } from "react-native-svg";

export function TabOfflineIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3V15M12 15L8 11M12 15L16 11"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 17V19A2 2 0 0 0 6 21H18A2 2 0 0 0 20 19V17"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
