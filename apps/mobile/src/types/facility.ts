import type { PetSize } from "./pet";

export type FacilityCategory = "관광지" | "문화시설" | "레포츠" | "숙박" | "음식";

export type Confidence = "확실" | "추정";
export type MatchStatus = "입장가능" | "조건부가능" | "확인필요";

export interface Facility {
  id: string;
  name: string;
  category: FacilityCategory;
  type: string;
  region: string;
  address: string;
  hours: string;
  updated: string;
  allowedSizes: PetSize[];
  weightLimitKg: number | null;
  cageRequired: boolean;
  leashRequired: boolean;
  indoorAllowed: boolean;
  outdoorAllowed: boolean;
  confidence: Confidence;
  reportCount: number;
  rawText: string;
}

export interface MatchReason {
  label: string;
  ok: boolean;
  confidence: Confidence;
}

export interface MatchResult {
  status: MatchStatus;
  reasons: MatchReason[];
}
