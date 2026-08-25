import { View } from "react-native";
import Slider from "@react-native-community/slider";

import { Text } from "./AppText";
import { TextInput } from "./AppTextInput";
import { PressableScale } from "./PressableScale";
import { ToggleSwitch } from "./ToggleSwitch";
import { sizeOf } from "../lib/petSize";
import type { Pet } from "../types/pet";

type PetProfileCardProps = {
  pet: Pet;
  onChange: (patch: Partial<Pet>) => void;
  onRemove: () => void;
};

export function PetProfileCard({ pet, onChange, onRemove }: PetProfileCardProps) {
  const size = sizeOf(pet.weight);

  return (
    <View className="mb-3.5 rounded-2xl border border-card-border bg-card p-4">
      <View className="mb-3.5 flex-row items-center justify-between gap-2">
        <TextInput
          value={pet.name}
          onChangeText={(name) => onChange({ name })}
          className="flex-1 text-title font-bold text-ink"
        />
        <PressableScale onPress={onRemove}>
          <Text className="text-footnote text-alert-text">삭제</Text>
        </PressableScale>
      </View>
      <View className="mb-3.5 flex-row gap-2.5">
        <PressableScale
          onPress={() => onChange({ species: pet.species === "강아지" ? "고양이" : "강아지" })}
          className="flex-1 rounded-xl border border-card-border-alt bg-quote-bg p-2.5"
        >
          <Text className="text-center text-body font-semibold text-ink">{pet.species}</Text>
        </PressableScale>
        <TextInput
          value={pet.breed}
          onChangeText={(breed) => onChange({ breed })}
          placeholder="견종/묘종"
          className="flex-1 rounded-xl border border-card-border-alt p-2.5 text-body text-ink"
        />
      </View>
      <View className="mb-3">
        <View className="mb-1.5 flex-row justify-between">
          <Text className="text-footnote text-ink-soft">체중</Text>
          <Text className="text-footnote font-bold text-ink">
            {pet.weight}kg · {size}견
          </Text>
        </View>
        <Slider
          minimumValue={1}
          maximumValue={40}
          step={1}
          value={pet.weight}
          onValueChange={(weight) => onChange({ weight })}
          minimumTrackTintColor="#7A4A2B"
        />
      </View>
      <View className="flex-row items-center justify-between border-t border-[#F1EEE7] pt-2.5">
        <Text className="text-body text-ink">이동장(케이지) 소지</Text>
        <ToggleSwitch value={pet.hasCage} onToggle={() => onChange({ hasCage: !pet.hasCage })} />
      </View>
    </View>
  );
}
