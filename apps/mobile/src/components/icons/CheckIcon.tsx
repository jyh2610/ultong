import Svg, { Path } from "react-native-svg";

export function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={10} height={8} viewBox="0 0 10 8">
      <Path
        d="M1 4L3.5 6.5L9 1"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
