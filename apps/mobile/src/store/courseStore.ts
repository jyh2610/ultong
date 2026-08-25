import { create } from "zustand";

type CourseState = {
  savedIds: string[];
  checkedPrep: Record<string, boolean>;
  toggleSaved: (id: string) => boolean;
  togglePrep: (name: string) => void;
  moveSaved: (id: string, direction: "up" | "down") => void;
};

export const useCourseStore = create<CourseState>((set, get) => ({
  savedIds: [],
  checkedPrep: {},
  toggleSaved: (id) => {
    const has = get().savedIds.includes(id);
    set((state) => ({
      savedIds: has ? state.savedIds.filter((x) => x !== id) : [...state.savedIds, id],
    }));
    return !has;
  },
  togglePrep: (name) =>
    set((state) => ({ checkedPrep: { ...state.checkedPrep, [name]: !state.checkedPrep[name] } })),
  moveSaved: (id, direction) =>
    set((state) => {
      const index = state.savedIds.indexOf(id);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= state.savedIds.length) return state;
      const next = [...state.savedIds];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return { savedIds: next };
    }),
}));
