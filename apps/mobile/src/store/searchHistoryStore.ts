import { create } from "zustand";

const MAX_HISTORY = 8;

type SearchHistoryState = {
  recentQueries: string[];
  addQuery: (query: string) => void;
  removeQuery: (query: string) => void;
  clear: () => void;
};

export const useSearchHistoryStore = create<SearchHistoryState>((set) => ({
  recentQueries: [],
  addQuery: (query) =>
    set((state) => {
      const trimmed = query.trim();
      if (!trimmed) return state;
      const next = [trimmed, ...state.recentQueries.filter((q) => q !== trimmed)];
      return { recentQueries: next.slice(0, MAX_HISTORY) };
    }),
  removeQuery: (query) =>
    set((state) => ({ recentQueries: state.recentQueries.filter((q) => q !== query) })),
  clear: () => set({ recentQueries: [] }),
}));
