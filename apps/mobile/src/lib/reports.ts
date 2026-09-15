import { apiFetch } from "./apiClient";

export type ReportType = "denied_entry" | "rule_changed" | "closed" | "incorrect_info" | "other";
export type ReportStatus = "pending" | "reviewing" | "resolved" | "rejected";

export interface Report {
  id: string;
  contentId: string;
  type: ReportType;
  detail: string | null;
  status: ReportStatus;
  reportedOn: string;
  createdAt: string;
}

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  denied_entry: "입장을 거부당했어요",
  rule_changed: "규정이 바뀌었어요",
  closed: "폐업/운영종료됐어요",
  incorrect_info: "정보가 틀려요",
  other: "기타",
};

export const REPORT_TYPE_ORDER: ReportType[] = [
  "denied_entry",
  "rule_changed",
  "closed",
  "incorrect_info",
  "other",
];

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "검토중",
  reviewing: "확인중",
  resolved: "반영완료",
  rejected: "반영 안 됨",
};

export function listReports(contentId?: string): Promise<Report[]> {
  const qs = contentId ? `?contentId=${encodeURIComponent(contentId)}` : "";
  return apiFetch<{ items: Report[] }>(`/reports${qs}`).then((res) => res.items);
}

export function createReport(
  contentId: string,
  type: ReportType,
  detail?: string,
): Promise<Report> {
  return apiFetch<Report>("/reports", {
    method: "POST",
    body: JSON.stringify({ contentId, type, detail }),
  });
}
