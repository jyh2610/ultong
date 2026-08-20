import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PetProfileCard } from "../../components/PetProfileCard";
import { usePetStore } from "../../store/petStore";
import { useToastStore } from "../../store/toastStore";
import type { MyPageScreenProps } from "./types";

const ACCOUNT_ITEMS = ["알림 설정", "데이터 출처 안내", "로그아웃"];

export function MyPageScreen(_props: MyPageScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const addPet = usePetStore((state) => state.addPet);
  const updatePet = usePetStore((state) => state.updatePet);
  const removePet = usePetStore((state) => state.removePet);
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-screen"
      contentContainerClassName="px-5 pb-8 pt-4"
      style={{ paddingTop: insets.top }}
    >
      <Text className="mb-5 text-lg font-bold text-ink">마이페이지</Text>
      <Text className="mb-2.5 text-xs font-bold text-ink-soft">반려동물 프로필</Text>
      {pets.map((pet) => (
        <PetProfileCard
          key={pet.id}
          pet={pet}
          onChange={(patch) => updatePet(pet.id, patch)}
          onRemove={() => {
            if (pets.length <= 1) {
              showToast("최소 1마리는 등록되어 있어야 해요");
              return;
            }
            removePet(pet.id);
          }}
        />
      ))}
      <Pressable
        onPress={addPet}
        className="mb-2 w-full rounded-2xl border-[1.5px] border-dashed border-[#C9CABF] p-3.5"
      >
        <Text className="text-center text-[13px] font-semibold text-ink-soft">+ 반려동물 추가</Text>
      </Pressable>
      <Text className="mb-2.5 mt-6 text-xs font-bold text-ink-soft">계정</Text>
      <View className="overflow-hidden rounded-2xl border border-card-border bg-card">
        {ACCOUNT_ITEMS.map((label, index) => (
          <View
            key={label}
            className={`px-4 py-3.5 ${index < ACCOUNT_ITEMS.length - 1 ? "border-b border-[#F4F1EA]" : ""}`}
          >
            <Text className={`text-[13.5px] ${label === "로그아웃" ? "text-alert-text" : "text-ink"}`}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
