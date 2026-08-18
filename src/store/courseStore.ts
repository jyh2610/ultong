import { create } from "zustand";

type CourseState = {
  savedIds: string[];
  checkedPrep: Record<string, boolean>;
  toggleSaved: (id: string) => boolean;
  togglePrep: (name: string) => void;
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
}));
