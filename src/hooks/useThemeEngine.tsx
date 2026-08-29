import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react";
import {
  extractDominantColors,
  applyTheme,
  resetTheme,
  THEME_PRESETS,
  hexToOklch,
  type DominantColors,
} from "@/utils/themeEngine";

const STORAGE_KEY = "atlas-wallpaper-preset";
const CUSTOM_COLORS_KEY = "atlas-custom-colors";

interface ThemeEngineState {
  activePreset: string;
  isExtracting: boolean;
  currentColors: DominantColors;
  setPreset: (presetKey: string) => void;
  setCustomImage: (file: File) => Promise<void>;
  setCustomColors: (primaryHex: string, secondaryHex: string) => void;
  resetToDefault: () => void;
}

const ThemeEngineContext = createContext<ThemeEngineState | null>(null);

export function ThemeEngineProvider({ children }: { children: ReactNode }) {
  const [activePreset, setActivePreset] = useState<string>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) ?? "atlas";
    }
    return "atlas";
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentColors, setCurrentColors] = useState<DominantColors>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) ?? "atlas";
      if (saved === "custom-color") {
        const stored = localStorage.getItem(CUSTOM_COLORS_KEY);
        if (stored) {
          try {
            return JSON.parse(stored) as DominantColors;
          } catch {
            return THEME_PRESETS.atlas;
          }
        }
      }
    }
    return THEME_PRESETS[activePreset] ?? THEME_PRESETS.atlas;
  });

  // Apply saved preset on mount
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) ?? "atlas";
      if (saved === "custom-color") {
        const stored = localStorage.getItem(CUSTOM_COLORS_KEY);
        if (stored) {
          try {
            const colors = JSON.parse(stored) as DominantColors;
            setCurrentColors(colors);
            applyTheme(colors);
            return;
          } catch {
            // fallback
          }
        }
      }
      if (saved && THEME_PRESETS[saved]) {
        const colors = THEME_PRESETS[saved];
        setCurrentColors(colors);
        applyTheme(colors);
      }
    }
  }, []);

  const setPreset = useCallback((presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    setActivePreset(presetKey);
    setCurrentColors(preset);
    applyTheme(preset);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, presetKey);
    }
  }, []);

  const setCustomImage = useCallback(async (file: File) => {
    setIsExtracting(true);
    setActivePreset("custom");
    const url = URL.createObjectURL(file);
    try {
      const colors = await extractDominantColors(url);
      setCurrentColors(colors);
      applyTheme(colors);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, "custom");
      }
    } finally {
      URL.revokeObjectURL(url);
      setIsExtracting(false);
    }
  }, []);

  const setCustomColors = useCallback((primaryHex: string, secondaryHex: string) => {
    const primary = hexToOklch(primaryHex);
    const secondary = hexToOklch(secondaryHex);
    const colors = { primary, secondary };
    setActivePreset("custom-color");
    setCurrentColors(colors);
    applyTheme(colors);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "custom-color");
      localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
    }
  }, []);

  const resetToDefault = useCallback(() => {
    resetTheme();
    const def = THEME_PRESETS.atlas;
    setCurrentColors(def);
    setActivePreset("atlas");
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "atlas");
    }
  }, []);

  return (
    <ThemeEngineContext.Provider
      value={{
        activePreset,
        isExtracting,
        currentColors,
        setPreset,
        setCustomImage,
        setCustomColors,
        resetToDefault,
      }}
    >
      {children}
    </ThemeEngineContext.Provider>
  );
}

export function useThemeEngine(): ThemeEngineState {
  const ctx = useContext(ThemeEngineContext);
  if (!ctx) throw new Error("useThemeEngine must be inside <ThemeEngineProvider>");
  return ctx;
}
