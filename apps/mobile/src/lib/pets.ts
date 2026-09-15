import { apiFetch } from "./apiClient";
import type { Pet, Species } from "../types/pet";

type ApiSpecies = "dog" | "cat" | "other";

const SPECIES_TO_API: Record<Species, ApiSpecies> = { 강아지: "dog", 고양이: "cat" };
const SPECIES_FROM_API: Record<ApiSpecies, Species> = { dog: "강아지", cat: "고양이", other: "강아지" };

interface ApiPet {
  id: string;
  name: string;
  species: ApiSpecies;
  breed: string | null;
  weightKg: number | null;
  hasCage: boolean;
  isDefault: boolean;
}

function fromApiPet(pet: ApiPet): Pet {
  return {
    id: pet.id,
    name: pet.name,
    species: SPECIES_FROM_API[pet.species],
    breed: pet.breed ?? "",
    weightKg: pet.weightKg ?? 5,
    hasCage: pet.hasCage,
    isDefault: pet.isDefault,
  };
}

export type PetInput = {
  name: string;
  species: Species;
  breed?: string;
  weightKg?: number;
  hasCage?: boolean;
};

function toApiPayload(input: Partial<PetInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.species !== undefined) payload.species = SPECIES_TO_API[input.species];
  if (input.breed !== undefined) payload.breed = input.breed;
  if (input.weightKg !== undefined) payload.weightKg = input.weightKg;
  if (input.hasCage !== undefined) payload.hasCage = input.hasCage;
  return payload;
}

export async function listPets(): Promise<Pet[]> {
  const res = await apiFetch<{ items: ApiPet[] }>("/pets");
  return res.items.map(fromApiPet);
}

export async function createPet(input: PetInput): Promise<Pet> {
  const pet = await apiFetch<ApiPet>("/pets", {
    method: "POST",
    body: JSON.stringify(toApiPayload(input)),
  });
  return fromApiPet(pet);
}

export async function updatePet(id: string, patch: Partial<PetInput>): Promise<Pet> {
  const pet = await apiFetch<ApiPet>(`/pets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(toApiPayload(patch)),
  });
  return fromApiPet(pet);
}

export function deletePet(id: string): Promise<void> {
  return apiFetch<void>(`/pets/${id}`, { method: "DELETE" });
}

export function pickDefaultPet(pets: Pet[]): Pet | undefined {
  return pets.find((pet) => pet.isDefault) ?? pets[0];
}
