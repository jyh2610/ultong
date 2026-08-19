import { Pressable, View } from "react-native";

type ToggleSwitchProps = {
  value: boolean;
  onToggle: () => void;
};

export function ToggleSwitch({ value, onToggle }: ToggleSwitchProps) {
  return (
    <Pressable
      onPress={onToggle}
      className={`h-[26px] w-[46px] justify-center rounded-full ${value ? "bg-primary" : "bg-[#DADAD4]"}`}
    >
      <View
        className="h-5 w-5 rounded-full bg-white"
        style={{ marginLeft: value ? 23 : 3 }}
      />
    </Pressable>
  );
}
