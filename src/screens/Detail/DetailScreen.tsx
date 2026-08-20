import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "../../components/icons/BackIcon";
import { CheckIcon } from "../../components/icons/CheckIcon";
import { CloseIcon } from "../../components/icons/CloseIcon";
import { Text } from "../../components/AppText";
import { ChecklistItem } from "../../components/ChecklistItem";
import { StatusBadge } from "../../components/StatusBadge";
import { checklistFor, computeMatch } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { usePetStore } from "../../store/petStore";
import { useToastStore } from "../../store/toastStore";
import { useFacility } from "./api/useFacility";
import { DetailScreenSkeleton } from "./ui/DetailScreenSkeleton";
import type { DetailScreenProps } from "./types";

export function DetailScreen({ navigation, route }: DetailScreenProps) {
  const { facilityId } = route.params;
  const { data: facility, isPending } = useFacility(facilityId);
  const pet = usePetStore((state) => state.pets[0]);
  const savedIds = useCourseStore((state) => state.savedIds);
  const toggleSaved = useCourseStore((state) => state.toggleSaved);
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  if (isPending || !pet) return <DetailScreenSkeleton />;
  if (!facility) return null;

  const match = computeMatch(pet, facility);
  const checklist = checklistFor(facility);
  const saved = savedIds.includes(facility.id);
  const alertFlag = facility.reportCount >= 3;

  return (
    <View className="flex-1 bg-screen">
      <ScrollView>
        <View>
          <View className="h-[210px] bg-[#EEE9E0]" />
          <Pressable
            onPress={() => navigation.goBack()}
            className="absolute left-3.5 h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90"
            style={{ top: insets.top + 14 }}
          >
            <BackIcon color="#1C1C1E" />
          </Pressable>
        </View>
        <View className="px-5 pt-4.5">
          <View className="mb-3 flex-row items-start justify-between gap-2.5">
            <View>
              <Text className="mb-1 text-[11.5px] text-ink-soft">
                {facility.category} · {facility.region}
              </Text>
              <Text className="text-xl font-bold text-ink">{facility.name}</Text>
              <Text className="mt-0.5 text-xs text-ink-soft">{facility.type}</Text>
            </View>
            <StatusBadge status={match.status} />
          </View>
          {alertFlag && (
            <View className="mb-3.5 flex-row items-center gap-2 rounded-xl border border-alert-border bg-alert-bg px-3.5 py-2.5">
              <Text className="flex-1 text-xs font-semibold text-alert-text">
                ⚠ 최근 제보가 누적된 시설이에요 — 방문 전 규정 변경 여부를 다시 확인해보세요
              </Text>
            </View>
          )}
          <View className="mb-5.5 gap-1.5 rounded-2xl border border-card-border bg-card p-3.5">
            <Text className="text-xs text-[#4A4A4C]">{facility.address}</Text>
            <Text className="text-xs text-[#4A4A4C]">{facility.hours}</Text>
            <Text className="text-xs text-ink-faint">최종 데이터 갱신일 {facility.updated}</Text>
          </View>
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="text-[15px] font-bold text-ink">조건 매칭 결과</Text>
            <Text className="text-[10.5px] text-ink-faint">{pet.name} 기준</Text>
          </View>
          <View className="mb-2 rounded-2xl border border-card-border bg-card">
            {match.reasons.map((reason, index) => (
              <View
                key={index}
                className="flex-row items-center gap-2.5 border-b border-[#F4F1EA] px-3.5 py-2.5 last:border-b-0"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full ${
                    reason.ok ? "bg-[#2FA968]" : "bg-[#D64545]"
                  }`}
                >
                  {reason.ok ? <CheckIcon color="#fff" /> : <CloseIcon color="#fff" />}
                </View>
                <Text className="flex-1 text-[13px] text-ink">{reason.label}</Text>
                <Text
                  className={`text-[9.5px] font-bold ${
                    reason.confidence === "확실" ? "text-status-ok-fg" : "text-status-conditional-fg"
                  }`}
                >
                  {reason.confidence}
                </Text>
              </View>
            ))}
          </View>
          <View className="mb-2.5 rounded-xl border border-dashed border-quote-border bg-quote-bg px-3.5 py-3">
            <Text className="mb-1.5 text-[10.5px] font-bold text-[#9A8B6E]">원문 근거</Text>
            <Text className="text-xs italic leading-5 text-quote-text">&quot;{facility.rawText}&quot;</Text>
          </View>
          <Text className="mb-6 text-[10.5px] leading-5 text-ink-faint">
            &apos;확실&apos;은 원문에 조건이 명시된 경우, &apos;추정&apos;은 원문이 모호해 일반 기준을
            적용한 경우예요.
          </Text>
          <Text className="mb-2.5 text-[15px] font-bold text-ink">동반 준비물</Text>
          <View className="mb-5 rounded-2xl border border-card-border bg-card p-1">
            {checklist.map((item) => (
              <ChecklistItem
                key={item}
                label={item}
                checked={!!checkedPrep[item]}
                onToggle={() => togglePrep(item)}
              />
            ))}
          </View>
          <Pressable
            onPress={() => showToast("제보가 접수되었어요. 검토 후 반영할게요")}
            className="mb-3.5 rounded-2xl border border-card-border-alt bg-card p-3.5"
          >
            <Text className="text-center text-[13px] font-semibold text-ink-soft">
              실제 규정이 다른가요? 제보하기
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <View className="px-5 pt-3" style={{ paddingBottom: insets.bottom + 26 }}>
        <Pressable
          onPress={() => {
            const nowSaved = toggleSaved(facility.id);
            showToast(nowSaved ? "코스에 담았어요" : "코스에서 제거했어요");
          }}
          className={`rounded-2xl p-4 ${saved ? "bg-status-check-bg" : "bg-primary"}`}
        >
          <Text className={`text-center text-[14.5px] font-bold ${saved ? "text-ink-soft" : "text-white"}`}>
            {saved ? "코스에서 제거하기" : "코스에 담기"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
