import { create } from "zustand";

type CourseState = {
  checkedPrep: Record<string, boolean>;
  togglePrep: (name: string) => void;
};

export const useCourseStore = create<CourseState>((set) => ({
  checkedPrep: {},
  togglePrep: (name) =>
    set((state) => ({ checkedPrep: { ...state.checkedPrep, [name]: !state.checkedPrep[name] } })),
}));
