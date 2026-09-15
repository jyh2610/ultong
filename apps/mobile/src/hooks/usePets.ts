import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createPet, deletePet, listPets, updatePet } from "../lib/pets";
import type { PetInput } from "../lib/pets";

const PETS_KEY = ["pets"];

export function usePets(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: PETS_KEY,
    queryFn: listPets,
    enabled: options.enabled ?? true,
  });
}

export function useCreatePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PetInput) => createPet(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PETS_KEY }),
  });
}

export function useUpdatePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PetInput> }) => updatePet(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PETS_KEY }),
  });
}

export function useDeletePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePet(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PETS_KEY }),
  });
}
