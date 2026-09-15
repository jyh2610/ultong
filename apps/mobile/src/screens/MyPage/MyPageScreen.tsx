import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { PressableScale } from "../../components/PressableScale";
import { PetProfileCard } from "../../components/PetProfileCard";
import { getErrorMessage } from "../../lib/apiClient";
import { useCreatePet, useDeletePet, usePets, useUpdatePet } from "../../hooks/usePets";
import { usePlacesByIds } from "../../hooks/usePlaces";
import { useReports } from "../../hooks/useReports";
import { REPORT_STATUS_LABEL } from "../../lib/reports";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { logout } from "./api/logout";
import type { MyPageScreenProps } from "./types";

const ACCOUNT_ITEMS = ["알림 설정", "데이터 출처 안내"];

function formatReportDate(iso: string) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function MyPageScreen(_props: MyPageScreenProps) {
  const { data: pets = [] } = usePets();
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const deletePet = useDeletePet();
  const { data: reports = [] } = useReports();
  const { data: reportedPlaces } = usePlacesByIds(
    Array.from(new Set(reports.map((report) => report.contentId))),
  );
  const titleByContentId = new Map(reportedPlaces?.map((place) => [place.contentId, place.title]));
  const showToast = useToastStore((state) => state.show);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearAuth = useAuthStore((state) => state.clear);
  const insets = useSafeAreaInsets();

  async function handleLogout() {
    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch (error) {
      showToast(getErrorMessage(error, "로그아웃 요청에 실패했어요"));
    } finally {
      await clearAuth();
    }
  }

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
                  {titleByContentId.get(report.contentId) ?? report.contentId}
                </Text>
                <Text className="ml-2 text-label text-ink-faint">
                  {formatReportDate(report.createdAt)} · {REPORT_STATUS_LABEL[report.status]}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text className="mb-2.5 mt-6 text-footnote font-bold text-ink-soft">계정</Text>
      <View className="overflow-hidden rounded-2xl border border-card-border bg-card">
        {ACCOUNT_ITEMS.map((label) => (
          <View key={label} className="border-b border-[#F4F1EA] px-4 py-3.5">
            <Text className="text-body text-ink">{label}</Text>
          </View>
        ))}
        <PressableScale onPress={handleLogout} className="px-4 py-3.5">
          <Text className="text-body text-alert-text">로그아웃</Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}
