import { Pressable, View } from "react-native";

import { Text } from "./AppText";
import { CheckIcon } from "./icons/CheckIcon";

type ChecklistItemProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

export function ChecklistItem({ label, checked, onToggle }: ChecklistItemProps) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center gap-2.5 px-2.5 py-2.5">
      <View
        className={`h-[19px] w-[19px] items-center justify-center rounded-md border-[1.5px] ${
          checked ? "border-primary bg-primary" : "border-[#DADAD4] bg-white"
        }`}
      >
        {checked && <CheckIcon color="#fff" />}
      </View>
      <Text className={`text-[13.5px] ${checked ? "text-ink-faint line-through" : "text-ink"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
