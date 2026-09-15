import type { PetTags } from "../types/place";

export function checklistFor(petTags: PetTags): string[] {
  const items = ["배변봉투", "접종증명서"];
  if (petTags.leash_required) items.push("목줄");
  if (petTags.cage_required) items.push("이동장(케이지)");
  if (petTags.manner_belt_required) items.push("매너벨트");
  return items;
}

export function mergeChecklists(petTagsList: (PetTags | undefined)[]): string[] {
  return Array.from(
    new Set(petTagsList.filter((t): t is PetTags => !!t).flatMap(checklistFor)),
  );
}
