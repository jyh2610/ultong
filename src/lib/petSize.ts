import type { PetSize } from "../types/pet";

export function sizeOf(weightKg: number): PetSize {
  if (weightKg <= 5) return "소형";
  if (weightKg <= 15) return "중형";
  return "대형";
}
