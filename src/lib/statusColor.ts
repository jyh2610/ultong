import type { MatchStatus } from "../types/facility";

const STATUS_CLASSES: Record<MatchStatus, { bg: string; fg: string }> = {
  입장가능: { bg: "bg-status-ok-bg", fg: "text-status-ok-fg" },
  조건부가능: { bg: "bg-status-conditional-bg", fg: "text-status-conditional-fg" },
  확인필요: { bg: "bg-status-check-bg", fg: "text-status-check-fg" },
};

export function statusColor(status: MatchStatus): { bg: string; fg: string } {
  return STATUS_CLASSES[status];
}
