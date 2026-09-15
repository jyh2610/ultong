import type { Verdict, Confidence } from "../types/place";

export const VERDICT_LABEL: Record<Verdict, string> = {
  allowed: "입장가능",
  conditional: "조건부가능",
  denied: "입장불가",
  unknown: "확인필요",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  certain: "확실",
  estimated: "추정",
  unknown: "확인필요",
};

const VERDICT_CLASSES: Record<Verdict, { bg: string; fg: string }> = {
  allowed: { bg: "bg-status-ok-bg", fg: "text-status-ok-fg" },
  conditional: { bg: "bg-status-conditional-bg", fg: "text-status-conditional-fg" },
  denied: { bg: "bg-[#FBE3E3]", fg: "text-[#B23B3B]" },
  unknown: { bg: "bg-status-check-bg", fg: "text-status-check-fg" },
};

export function statusColor(verdict: Verdict): { bg: string; fg: string } {
  return VERDICT_CLASSES[verdict];
}
