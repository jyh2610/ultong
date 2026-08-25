import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { PressableScale } from "../../components/PressableScale";
import { PetProfileCard } from "../../components/PetProfileCard";
import { usePetStore } from "../../store/petStore";
import { useReportStore } from "../../store/reportStore";
import { useToastStore } from "../../store/toastStore";
import type { MyPageScreenProps } from "./types";

const ACCOUNT_ITEMS = ["알림 설정", "데이터 출처 안내", "로그아웃"];

function formatReportDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function MyPageScreen(_props: MyPageScreenProps) {
  const pets = usePetStore((state) => state.pets);
  const addPet = usePetStore((state) => state.addPet);
  const updatePet = usePetStore((state) => state.updatePet);
  const removePet = usePetStore((state) => state.removePet);
  const reports = useReportStore((state) => state.reports);
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-screen"
      contentContainerClassName="px-5 pb-8 pt-4"
      style={{ paddingTop: insets.top }}
    >
      <Text className="mb-5 text-title font-bold text-ink">마이페이지</Text>
      <Text className="mb-2.5 text-footnote font-bold text-ink-soft">반려동물 프로필</Text>
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
      <PressableScale
        onPress={addPet}
        className="mb-2 w-full rounded-2xl border-[1.5px] border-dashed border-[#C9CABF] p-3.5"
      >
        <Text className="text-center text-body font-semibold text-ink-soft">+ 반려동물 추가</Text>
      </PressableScale>
      {reports.length > 0 && (
        <>
          <Text className="mb-2.5 mt-6 text-footnote font-bold text-ink-soft">
            내 제보 내역 {reports.length}
          </Text>
          <View className="overflow-hidden rounded-2xl border border-card-border bg-card">
            {reports.map((report, index) => (
              <View
                key={report.id}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  index < reports.length - 1 ? "border-b border-[#F4F1EA]" : ""
                }`}
              >
                <Text className="flex-1 text-body text-ink" numberOfLines={1}>
                  {report.facilityName}
                </Text>
                <Text className="ml-2 text-label text-ink-faint">
                  {formatReportDate(report.createdAt)} · 검토중
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text className="mb-2.5 mt-6 text-footnote font-bold text-ink-soft">계정</Text>
      <View className="overflow-hidden rounded-2xl border border-card-border bg-card">
        {ACCOUNT_ITEMS.map((label, index) => (
          <View
            key={label}
            className={`px-4 py-3.5 ${index < ACCOUNT_ITEMS.length - 1 ? "border-b border-[#F4F1EA]" : ""}`}
          >
            <Text className={`text-body ${label === "로그아웃" ? "text-alert-text" : "text-ink"}`}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
