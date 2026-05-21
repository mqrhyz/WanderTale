"use client";

import { useEffect, useLayoutEffect } from "react";
import { applyThemeClass } from "@/lib/theme";
import { useUiStore } from "@/stores/uiStore";

/**
 * Syncs `html.dark` with the zustand store.
 * Before persist hydration, the inline script in layout.tsx owns the DOM class
 * so we must not apply the default "light" store value and wipe dark mode.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useLayoutEffect(() => {
    if (!useUiStore.persist.hasHydrated()) return;
    applyThemeClass(theme);
  }, [theme]);

  useEffect(() => {
    const applyFromStore = () => applyThemeClass(useUiStore.getState().theme);

    if (useUiStore.persist.hasHydrated()) {
      applyFromStore();
    }

    return useUiStore.persist.onFinishHydration(applyFromStore);
  }, []);

  return <>{children}</>;
}
