import { create } from "zustand";

type ToastState = {
  message: string;
  show: (message: string) => void;
  clear: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: "",
  show: (message) => set({ message }),
  clear: () => set({ message: "" }),
}));
