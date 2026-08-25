import { create } from "zustand";

export type FacilityReport = {
  id: string;
  facilityId: string;
  facilityName: string;
  createdAt: number;
};

type ReportState = {
  reports: FacilityReport[];
  addReport: (facilityId: string, facilityName: string) => void;
  hasReported: (facilityId: string) => boolean;
};

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  addReport: (facilityId, facilityName) =>
    set((state) => ({
      reports: [
        { id: String(Date.now()), facilityId, facilityName, createdAt: Date.now() },
        ...state.reports,
      ],
    })),
  hasReported: (facilityId) => get().reports.some((r) => r.facilityId === facilityId),
}));
