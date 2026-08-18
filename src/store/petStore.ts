import { create } from "zustand";
import type { Pet } from "../types/pet";

type PetState = {
  pets: Pet[];
  addPet: () => void;
  updatePet: (id: string, patch: Partial<Pet>) => void;
  removePet: (id: string) => void;
};

export const usePetStore = create<PetState>((set) => ({
  pets: [{ id: "1", name: "뽀삐", species: "강아지", breed: "몰티즈", weight: 3, hasCage: true }],
  addPet: () =>
    set((state) => ({
      pets: [
        ...state.pets,
        {
          id: String(Date.now()),
          name: `반려동물 ${state.pets.length + 1}`,
          species: "강아지",
          breed: "",
          weight: 5,
          hasCage: false,
        },
      ],
    })),
  updatePet: (id, patch) =>
    set((state) => ({
      pets: state.pets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removePet: (id) => set((state) => ({ pets: state.pets.filter((p) => p.id !== id) })),
}));
