"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyThemeClass, type Theme } from "@/lib/theme";

interface UiState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        set({ theme });
        applyThemeClass(theme);
      },
    }),
    {
      name: "wander-tale-ui",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyThemeClass(state.theme);
      },
    }
  )
);
