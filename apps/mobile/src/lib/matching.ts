import type { Pet } from "../types/pet";
import type { Facility, MatchReason, MatchResult } from "../types/facility";
import { sizeOf } from "./petSize";

export function computeMatch(pet: Pet, facility: Facility): MatchResult {
  const size = sizeOf(pet.weight);
  const reasons: MatchReason[] = [];
  let hardFail = false;

  const sizeOk = facility.allowedSizes.includes(size);
  reasons.push({ label: `견종 크기: ${size}견 기준`, ok: sizeOk, confidence: facility.confidence });
  if (!sizeOk) hardFail = true;

  if (facility.weightLimitKg != null) {
    const weightOk = pet.weight <= facility.weightLimitKg;
    reasons.push({
      label: `체중 제한 ${facility.weightLimitKg}kg 이하`,
      ok: weightOk,
      confidence: facility.confidence,
    });
    if (!weightOk) hardFail = true;
  } else {
    reasons.push({ label: "체중 제한 없음", ok: true, confidence: "확실" });
  }

  if (facility.cageRequired) {
    const cageOk = pet.hasCage;
    reasons.push({ label: "이동장(케이지) 필수", ok: cageOk, confidence: facility.confidence });
    if (!cageOk) hardFail = true;
  }

  if (facility.leashRequired) {
    reasons.push({ label: "목줄 착용 필수", ok: true, confidence: facility.confidence });
  }

  reasons.push({
    label: facility.indoorAllowed ? "실내 동반 가능" : "실내 동반 불가",
    ok: true,
    confidence: facility.confidence,
  });
  reasons.push({
    label: facility.outdoorAllowed ? "실외 동반 가능" : "실외 동반 불가",
    ok: true,
    confidence: facility.confidence,
  });

  const softIssue = facility.confidence === "추정";
  const status = hardFail ? "확인필요" : softIssue ? "조건부가능" : "입장가능";

  return { status, reasons };
}

export function checklistFor(facility: Facility): string[] {
  const items = ["배변봉투", "접종증명서"];
  if (facility.leashRequired) items.push("목줄");
  if (facility.cageRequired) items.push("이동장(케이지)");
  return items;
}

export function mergeChecklists(facilities: Facility[]): string[] {
  return Array.from(new Set(facilities.flatMap(checklistFor)));
}
