import { ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "../../components/icons/BackIcon";
import { CheckIcon } from "../../components/icons/CheckIcon";
import { CloseIcon } from "../../components/icons/CloseIcon";
import { ShareIcon } from "../../components/icons/ShareIcon";
import { Text } from "../../components/AppText";
import { PressableScale } from "../../components/PressableScale";
import { ChecklistItem } from "../../components/ChecklistItem";
import { FadeIn } from "../../components/FadeIn";
import { StatusBadge } from "../../components/StatusBadge";
import { checklistFor, computeMatch } from "../../lib/matching";
import { useCourseStore } from "../../store/courseStore";
import { usePetStore } from "../../store/petStore";
import { useReportStore } from "../../store/reportStore";
import { useToastStore } from "../../store/toastStore";
import { useFacility } from "../../hooks/useFacilities";
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
  const addReport = useReportStore((state) => state.addReport);
  const hasReported = useReportStore((state) => state.hasReported);
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  if (isPending || !pet) return <DetailScreenSkeleton />;
  if (!facility) {
    return (
      <View className="flex-1 items-center justify-center bg-screen px-5" style={{ paddingTop: insets.top }}>
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          className="absolute left-3.5 h-[34px] w-[34px] items-center justify-center rounded-full border border-card-border-alt bg-card"
          style={{ top: insets.top + 14 }}
        >
          <BackIcon color="#1C1C1E" />
        </PressableScale>
        <Text className="text-subtitle font-bold text-ink">시설을 찾을 수 없어요</Text>
      </View>
    );
  }

  const match = computeMatch(pet, facility);
  const checklist = checklistFor(facility);
  const saved = savedIds.includes(facility.id);
  const alertFlag = facility.reportCount >= 3;
  const reported = hasReported(facility.id);

  const handleShare = () => {
    Share.share({
      message: `[멍냥로드] ${facility.name}\n${facility.category} · ${facility.region}\n${facility.address}\n${facility.hours}\n\n반려동반 조건 매칭 결과: ${match.status}`,
    }).catch(() => {});
  };

  return (
    <FadeIn className="flex-1 bg-screen">
      <ScrollView>
        <View>
          <View className="h-[210px] bg-[#EEE9E0]" />
          <PressableScale
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            className="absolute left-3.5 h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90"
            style={{ top: insets.top + 14 }}
          >
            <BackIcon color="#1C1C1E" />
          </PressableScale>
          <PressableScale
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="공유하기"
            className="absolute right-3.5 h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90"
            style={{ top: insets.top + 14 }}
          >
            <ShareIcon color="#1C1C1E" />
          </PressableScale>
        </View>
        <View className="px-5 pt-4.5">
          <View className="mb-3 flex-row items-start justify-between gap-2.5">
            <View>
              <Text className="mb-1 text-label text-ink-soft">
                {facility.category} · {facility.region}
              </Text>
              <Text className="text-headline font-bold text-ink">{facility.name}</Text>
              <Text className="mt-0.5 text-footnote text-ink-soft">{facility.type}</Text>
            </View>
            <StatusBadge status={match.status} />
          </View>
          {alertFlag && (
            <View className="mb-3.5 flex-row items-center gap-2 rounded-xl border border-alert-border bg-alert-bg px-3.5 py-2.5">
              <Text className="flex-1 text-footnote font-semibold text-alert-text">
                ⚠ 최근 제보가 누적된 시설이에요 — 방문 전 규정 변경 여부를 다시 확인해보세요
              </Text>
            </View>
          )}
          <View className="mb-5.5 gap-1.5 rounded-2xl border border-card-border bg-card p-3.5">
            <Text className="text-footnote text-[#4A4A4C]">{facility.address}</Text>
            <Text className="text-footnote text-[#4A4A4C]">{facility.hours}</Text>
            <Text className="text-footnote text-ink-faint">최종 데이터 갱신일 {facility.updated}</Text>
          </View>
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="text-subtitle font-bold text-ink">조건 매칭 결과</Text>
            <Text className="text-caption text-ink-faint">{pet.name} 기준</Text>
          </View>
          <View className="mb-2 rounded-2xl border border-card-border bg-card">
            {match.reasons.map((reason, index) => (
              <View
                key={index}
                className={`flex-row items-center gap-2.5 px-3.5 py-2.5 ${
                  index < match.reasons.length - 1 ? "border-b border-[#F4F1EA]" : ""
                }`}
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full ${
                    reason.ok ? "bg-[#2FA968]" : "bg-[#D64545]"
                  }`}
                >
                  {reason.ok ? <CheckIcon color="#fff" /> : <CloseIcon color="#fff" />}
                </View>
                <Text className="flex-1 text-body text-ink">{reason.label}</Text>
                <Text
                  className={`text-caption font-bold ${
                    reason.confidence === "확실" ? "text-status-ok-fg" : "text-status-conditional-fg"
                  }`}
                >
                  {reason.confidence}
                </Text>
              </View>
            ))}
          </View>
          <View className="mb-2.5 rounded-xl border border-dashed border-quote-border bg-quote-bg px-3.5 py-3">
            <Text className="mb-1.5 text-caption font-bold text-[#9A8B6E]">원문 근거</Text>
            <Text className="text-footnote italic leading-5 text-quote-text">&quot;{facility.rawText}&quot;</Text>
          </View>
          <Text className="mb-6 text-caption leading-5 text-ink-faint">
            &apos;확실&apos;은 원문에 조건이 명시된 경우, &apos;추정&apos;은 원문이 모호해 일반 기준을
            적용한 경우예요.
          </Text>
          <Text className="mb-2.5 text-subtitle font-bold text-ink">동반 준비물</Text>
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
          <PressableScale
            onPress={() => {
              addReport(facility.id, facility.name);
              showToast(
                reported ? "다시 제보했어요. 검토 후 반영할게요" : "제보가 접수되었어요. 검토 후 반영할게요",
              );
            }}
            className="mb-3.5 rounded-2xl border border-card-border-alt bg-card p-3.5"
          >
            <Text className="text-center text-body font-semibold text-ink-soft">
              {reported ? "제보 완료 · 검토중 (다시 제보하기)" : "실제 규정이 다른가요? 제보하기"}
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
      <View className="px-5 pt-3" style={{ paddingBottom: insets.bottom + 26 }}>
        <PressableScale
          onPress={() => {
            const nowSaved = toggleSaved(facility.id);
            showToast(nowSaved ? "코스에 담았어요" : "코스에서 제거했어요");
          }}
          className={`rounded-2xl p-4 ${saved ? "bg-status-check-bg" : "bg-primary"}`}
        >
          <Text className={`text-center text-body-lg font-bold ${saved ? "text-ink-soft" : "text-white"}`}>
            {saved ? "코스에서 제거하기" : "코스에 담기"}
          </Text>
        </PressableScale>
      </View>
    </FadeIn>
  );
}
