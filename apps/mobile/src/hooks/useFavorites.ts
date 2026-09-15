import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addFavorite, listFavoriteIds, removeFavorite } from "../lib/favorites";

const FAVORITES_KEY = ["favorites"];

export function useFavoriteIds() {
  return useQuery({ queryKey: FAVORITES_KEY, queryFn: listFavoriteIds });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => addFavorite(contentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => removeFavorite(contentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
  });
}
