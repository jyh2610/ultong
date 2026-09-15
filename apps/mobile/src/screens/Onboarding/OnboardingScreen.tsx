import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { PressableScale } from "../../components/PressableScale";
import { PetProfileCard } from "../../components/PetProfileCard";
import { useCreatePet, useDeletePet, usePets, useUpdatePet } from "../../hooks/usePets";
import { useToastStore } from "../../store/toastStore";
import type { OnboardingScreenProps } from "./types";

export function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { data: pets = [] } = usePets();
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const deletePet = useDeletePet();
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-screen" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="px-5 pb-32 pt-4">
        <View className="mb-5.5">
          <Text className="mb-2 text-footnote font-bold tracking-wide text-primary">멍냥로드</Text>
          <Text className="text-display font-bold leading-9 text-ink">
            반려동물 프로필을{"\n"}등록해주세요
          </Text>
          <Text className="mt-2 text-body leading-5 text-ink-soft">
            체중과 크기를 기준으로 시설별 입장 가능 여부를 자동으로 확인해드려요
          </Text>
        </View>
        {pets.map((pet) => (
          <PetProfileCard
            key={pet.id}
            pet={pet}
            onCommit={(patch) => updatePet.mutate({ id: pet.id, patch })}
            onRemove={() => deletePet.mutate(pet.id)}
          />
        ))}
        <PressableScale
          onPress={() =>
            createPet.mutate({
              name: `반려동물 ${pets.length + 1}`,
              species: "강아지",
              weightKg: 5,
              hasCage: false,
            })
          }
          className="w-full rounded-2xl border-[1.5px] border-dashed border-[#C9CABF] p-3.5"
        >
          <Text className="text-center text-body font-semibold text-ink-soft">
            + 반려동물 추가
          </Text>
        </PressableScale>
      </ScrollView>
      <View
        className="absolute bottom-0 left-0 right-0 px-5 pt-3.5"
        style={{ paddingBottom: insets.bottom + 32 }}
      >
        <Text className="mb-2.5 text-center text-label text-ink-soft">
          입력한 조건으로 바로 맞는 장소를 추천해드려요
        </Text>
        <PressableScale
          onPress={() => {
            if (pets.length === 0) {
              showToast("반려동물을 최소 1마리 등록해주세요");
              return;
            }
            navigation.replace("MainTabs");
          }}
          className="w-full rounded-2xl bg-primary p-4"
        >
          <Text className="text-center text-subtitle font-bold text-white">시작하기</Text>
        </PressableScale>
      </View>
    </View>
  );
}
