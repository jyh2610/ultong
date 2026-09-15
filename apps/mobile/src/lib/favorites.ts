import { apiFetch } from "./apiClient";

interface ApiFavorite {
  contentId: string;
  createdAt: string;
}

export async function listFavoriteIds(): Promise<string[]> {
  const res = await apiFetch<{ items: ApiFavorite[] }>("/favorites");
  return res.items.map((f) => f.contentId);
}

export function addFavorite(contentId: string): Promise<void> {
  return apiFetch<void>("/favorites", {
    method: "POST",
    body: JSON.stringify({ contentId }),
  });
}

export function removeFavorite(contentId: string): Promise<void> {
  return apiFetch<void>(`/favorites/${encodeURIComponent(contentId)}`, {
    method: "DELETE",
  });
}
