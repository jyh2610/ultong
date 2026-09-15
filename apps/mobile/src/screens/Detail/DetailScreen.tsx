import { useState } from "react";
import { ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "../../components/icons/BackIcon";
import { ShareIcon } from "../../components/icons/ShareIcon";
import { Text } from "../../components/AppText";
import { PressableScale } from "../../components/PressableScale";
import { ChecklistItem } from "../../components/ChecklistItem";
import { EmptyState } from "../../components/EmptyState";
import { FadeIn } from "../../components/FadeIn";
import { FavoriteButton } from "../../components/FavoriteButton";
import { StatusBadge } from "../../components/StatusBadge";
import { useMyCourse, useToggleCourseItem } from "../../hooks/useCourse";
import { usePets } from "../../hooks/usePets";
import { usePlaceDetail } from "../../hooks/usePlaces";
import { useCreateReport, useReports } from "../../hooks/useReports";
import { checklistFor } from "../../lib/checklist";
import { pickDefaultPet } from "../../lib/pets";
import { REPORT_STATUS_LABEL, REPORT_TYPE_LABEL, REPORT_TYPE_ORDER } from "../../lib/reports";
import type { ReportType } from "../../lib/reports";
import { CONFIDENCE_LABEL } from "../../lib/statusColor";
import { useCourseStore } from "../../store/courseStore";
import { useToastStore } from "../../store/toastStore";
import { INTRO_FIELD_LABELS, INTRO_FIELD_ORDER, INTRO_SOURCE_LABEL } from "./constants";
import { DetailScreenSkeleton } from "./ui/DetailScreenSkeleton";
import type { DetailScreenProps } from "./types";

function formatIntroEntries(intro: Record<string, unknown> | null): { label: string; value: string }[] {
  if (!intro) return [];
  return INTRO_FIELD_ORDER.filter((key) => typeof intro[key] === "string" && intro[key] !== "").map(
    (key) => ({ label: INTRO_FIELD_LABELS[key], value: intro[key] as string }),
  );
}

export function DetailScreen({ navigation, route }: DetailScreenProps) {
  const { facilityId } = route.params;
  const [showTypePicker, setShowTypePicker] = useState(false);
  const { data: pets = [], isPending: petsPending } = usePets();
  const pet = pickDefaultPet(pets);
  const { data: place, isPending: placePending } = usePlaceDetail(facilityId, {
    weightKg: pet?.weightKg,
    hasCage: pet?.hasCage,
  });
  const { data: myReports = [] } = useReports(facilityId);
  const createReport = useCreateReport();
  const { course, isPending: coursePending } = useMyCourse();
  const toggleCourseItem = useToggleCourseItem();
  const isPending = petsPending || placePending || coursePending;
  const checkedPrep = useCourseStore((state) => state.checkedPrep);
  const togglePrep = useCourseStore((state) => state.togglePrep);
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  if (isPending) return <DetailScreenSkeleton />;

  if (!pet) {
    return (
      <View className="flex-1 bg-screen" style={{ paddingTop: insets.top }}>
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          className="ml-3.5 mt-3.5 h-[34px] w-[34px] items-center justify-center rounded-full border border-card-border-alt bg-card"
        >
          <BackIcon color="#1C1C1E" />
        </PressableScale>
        <EmptyState
          title="반려동물 프로필이 필요해요"
          description={"마이페이지에서 반려동물 정보를\n등록하면 조건 매칭 결과를 볼 수 있어요"}
        />
      </View>
    );
  }

  if (!place) {
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

  const checklist = checklistFor(place.pet_tags ?? {});
  const saved = !!course?.items?.some((item) => item.contentId === place.contentId);
  const reported = myReports.length > 0;
  const latestStatusLabel = myReports[0] ? REPORT_STATUS_LABEL[myReports[0].status] : null;
  const introEntries = formatIntroEntries(place.intro);
  const introCheckedAt = new Date(place.introCheckedAt);

  const handleReportType = (type: ReportType) => {
    createReport.mutate(
      { contentId: place.contentId, type },
      {
        onSuccess: () => {
          setShowTypePicker(false);
          showToast(
            reported ? "다시 제보했어요. 검토 후 반영할게요" : "제보가 접수되었어요. 검토 후 반영할게요",
          );
        },
      },
    );
  };

  const handleShare = () => {
    Share.share({
      message: `[멍냥로드] ${place.title}\n${place.category?.content_type ?? ""} · ${
        place.region?.sido ?? ""
      }\n${place.addr1 ?? ""}\n\n반려동반 조건 매칭 결과: ${CONFIDENCE_LABEL[place.match.confidence]}`,
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
                {place.category?.content_type ?? ""} · {place.region?.sido ?? ""}
              </Text>
              <Text className="text-headline font-bold text-ink">{place.title}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <StatusBadge verdict={place.match.verdict} />
              <FavoriteButton contentId={place.contentId} />
            </View>
          </View>
          <View className="mb-5.5 gap-1.5 rounded-2xl border border-card-border bg-card p-3.5">
            {place.addr1 && <Text className="text-footnote text-[#4A4A4C]">{place.addr1}</Text>}
            {introEntries.map((entry) => (
              <Text key={entry.label} className="text-footnote text-[#4A4A4C]">
                {entry.label} {entry.value}
              </Text>
            ))}
            <Text className="text-footnote text-ink-faint">
              {INTRO_SOURCE_LABEL[place.introSource]} 확인 ·{" "}
              {`${introCheckedAt.getMonth() + 1}.${introCheckedAt.getDate()} ${introCheckedAt.getHours()}:${String(
                introCheckedAt.getMinutes(),
              ).padStart(2, "0")}`}
            </Text>
          </View>
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="text-subtitle font-bold text-ink">조건 매칭 결과</Text>
            <Text className="text-caption font-bold text-ink-faint">
              {pet.name} 기준 · {CONFIDENCE_LABEL[place.match.confidence]}
            </Text>
          </View>
          <View className="mb-2 rounded-2xl border border-card-border bg-card">
            {place.match.reasons.map((reason, index) => (
              <View
                key={index}
                className={`flex-row items-center gap-2.5 px-3.5 py-2.5 ${
                  index < place.match.reasons.length - 1 ? "border-b border-[#F4F1EA]" : ""
                }`}
              >
                <Text className="flex-1 text-body text-ink">{reason}</Text>
              </View>
            ))}
            {place.match.areaRestricted && (
              <View className="border-t border-[#F4F1EA] px-3.5 py-2.5">
                <Text className="text-caption font-bold text-status-conditional-fg">
                  일부 구역 제한
                </Text>
              </View>
            )}
          </View>
          {(place.pet_raw?.possible_pet || place.pet_raw?.need_matter || place.pet_raw?.etc_info) && (
            <View className="mb-2.5 rounded-xl border border-dashed border-quote-border bg-quote-bg px-3.5 py-3">
              <Text className="mb-1.5 text-caption font-bold text-[#9A8B6E]">원문 근거</Text>
              <Text className="text-footnote italic leading-5 text-quote-text">
                &quot;
                {[place.pet_raw?.possible_pet, place.pet_raw?.need_matter, place.pet_raw?.etc_info]
                  .filter(Boolean)
                  .join(" · ")}
                &quot;
              </Text>
            </View>
          )}
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
          {showTypePicker ? (
            <View className="mb-3.5 rounded-2xl border border-card-border-alt bg-card p-3.5">
              <Text className="mb-2.5 text-body font-semibold text-ink-soft">어떤 문제인가요?</Text>
              <View className="flex-row flex-wrap gap-2">
                {REPORT_TYPE_ORDER.map((type) => (
                  <PressableScale
                    key={type}
                    onPress={() => handleReportType(type)}
                    className="rounded-full border border-card-border-alt bg-quote-bg px-3 py-1.5"
                  >
                    <Text className="text-label font-semibold text-ink">{REPORT_TYPE_LABEL[type]}</Text>
                  </PressableScale>
                ))}
                <PressableScale
                  onPress={() => setShowTypePicker(false)}
                  className="rounded-full px-3 py-1.5"
                >
                  <Text className="text-label text-ink-faint">취소</Text>
                </PressableScale>
              </View>
            </View>
          ) : (
            <PressableScale
              onPress={() => setShowTypePicker(true)}
              className="mb-3.5 rounded-2xl border border-card-border-alt bg-card p-3.5"
            >
              <Text className="text-center text-body font-semibold text-ink-soft">
                {reported
                  ? `제보 완료 · ${latestStatusLabel} (다시 제보하기)`
                  : "실제 규정이 다른가요? 제보하기"}
              </Text>
            </PressableScale>
          )}
        </View>
      </ScrollView>
      <View className="px-5 pt-3" style={{ paddingBottom: insets.bottom + 26 }}>
        <PressableScale
          onPress={() => {
            toggleCourseItem.mutate(
              { course, contentId: place.contentId, title: place.title },
              {
                onSuccess: (result) =>
                  showToast(result?.saved ? "코스에 담았어요" : "코스에서 제거했어요"),
              },
            );
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
