import { Pressable, ScrollView, Text, View } from "react-native";

import { PetProfileCard } from "../../components/PetProfileCard";
import { usePetStore } from "../../store/petStore";
import type { OnboardingScreenProps } from "./types";

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const addPet = usePetStore((state) => state.addPet);
  const updatePet = usePetStore((state) => state.updatePet);
  const removePet = usePetStore((state) => state.removePet);

  return (
    <View className="flex-1 bg-screen">
      <ScrollView contentContainerClassName="px-5 pb-24 pt-4">
        <View className="mb-5.5">
          <Text className="mb-2 text-xs font-bold tracking-wide text-primary">멍냥로드</Text>
          <Text className="text-[25px] font-bold leading-9 text-ink">
            반려동물 프로필을{"\n"}등록해주세요
          </Text>
          <Text className="mt-2 text-[13.5px] leading-5 text-ink-soft">
            체중과 크기를 기준으로 시설별 입장 가능 여부를 자동으로 확인해드려요
          </Text>
        </View>
        {pets.map((pet) => (
          <PetProfileCard
            key={pet.id}
            pet={pet}
            onChange={(patch) => updatePet(pet.id, patch)}
            onRemove={() => removePet(pet.id)}
          />
        ))}
        <Pressable
          onPress={addPet}
          className="w-full rounded-2xl border-[1.5px] border-dashed border-[#C9CABF] p-3.5"
        >
          <Text className="text-center text-[13.5px] font-semibold text-ink-soft">
            + 반려동물 추가
          </Text>
        </Pressable>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3.5">
        <Pressable
          onPress={() => navigation.replace("MainTabs")}
          className="w-full rounded-2xl bg-primary p-4"
        >
          <Text className="text-center text-[15.5px] font-bold text-white">시작하기</Text>
        </Pressable>
      </View>
    </View>
  );
}
