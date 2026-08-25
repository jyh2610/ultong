export type Species = "강아지" | "고양이";
export type PetSize = "소형" | "중형" | "대형";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  weight: number;
  hasCage: boolean;
}
