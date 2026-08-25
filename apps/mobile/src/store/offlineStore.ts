import { create } from "zustand";

type OfflineState = {
  offlineSaved: boolean;
  setOfflineSaved: (v: boolean) => void;
};

export const useOfflineStore = create<OfflineState>((set) => ({
  offlineSaved: false,
  setOfflineSaved: (v) => set({ offlineSaved: v }),
}));
