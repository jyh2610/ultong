import Svg, { Circle, Path } from "react-native-svg";

export function LocationPinIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 5 14.5 5 9.5C5 5.9 8.1 3 12 3C15.9 3 19 5.9 19 9.5C19 14.5 12 21 12 21Z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
      />
      <Circle cx={12} cy={9.5} r={2.3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
