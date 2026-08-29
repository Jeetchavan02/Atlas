import { useRef } from "react";
import { Palette, RotateCcw, Upload, Check } from "lucide-react";
import { useThemeEngine } from "@/hooks/useThemeEngine";
import { THEME_PRESETS, oklchString, oklchToHex } from "@/utils/themeEngine";

const PRESET_KEYS = ["atlas", "nebula", "ember", "forest", "ocean"] as const;

export function WallpaperThemeSelector({ onClose }: { onClose: () => void }) {
  const {
    activePreset,
    isExtracting,
    currentColors,
    setPreset,
    setCustomImage,
    setCustomColors,
    resetToDefault,
  } = useThemeEngine();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await setCustomImage(file);
    e.target.value = "";
  };

  const primaryHex = oklchToHex(currentColors.primary);
  const secondaryHex = oklchToHex(currentColors.secondary);

  const handlePrimaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColors(e.target.value, secondaryHex);
  };

  const handleSecondaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColors(primaryHex, e.target.value);
  };

  return (
    <div className="glass-card w-72 overflow-hidden p-5 shadow-[0_24px_64px_-12px_oklch(0_0_0/0.8)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-iris" />
          <span className="text-sm font-medium text-white">Theme</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white/40 hover:text-white/80 transition-colors"
          aria-label="Close theme panel"
        >
          ✕
        </button>
      </div>

      {/* Live color preview */}
      <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-white/40">
          Active Palette
        </p>
        <div className="flex gap-2">
          {[
            { label: "Iris", color: currentColors.primary },
            { label: "Mint", color: currentColors.secondary },
            {
              label: "Cyan",
              color: {
                ...currentColors.secondary,
                h: (currentColors.secondary.h + 25) % 360,
              },
            },
            {
              label: "Amber",
              color: {
                ...currentColors.secondary,
                h: (currentColors.secondary.h + 110) % 360,
              },
            },
          ].map((sw) => (
            <div key={sw.label} className="flex-1 text-center">
              <div
                className="mx-auto mb-1 h-8 w-full rounded-lg ring-1 ring-white/10"
                style={{
                  background: oklchString(sw.color),
                  boxShadow: `0 0 12px ${oklchString(sw.color)}`,
                }}
              />
              <div className="font-mono text-[8px] text-white/40">{sw.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Preset buttons */}
      <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-white/40 font-semibold text-white/60">
        Presets
      </p>
      <div className="mb-4 grid grid-cols-1 gap-1.5">
        {PRESET_KEYS.map((key) => {
          const preset = THEME_PRESETS[key];
          const isActive = activePreset === key;
          return (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all ${
                isActive
                  ? "bg-white/10 text-white ring-1 ring-white/20"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {/* Colour swatch pair */}
              <div className="flex gap-1">
                <div
                  className="h-4 w-4 rounded-full ring-1 ring-white/20"
                  style={{ background: oklchString(preset.primary) }}
                />
                <div
                  className="h-4 w-4 rounded-full ring-1 ring-white/20"
                  style={{ background: oklchString(preset.secondary) }}
                />
              </div>
              <span className="flex-1">{preset.name}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-mint" />}
            </button>
          );
        })}
      </div>

      {/* Custom Color Wheel / Picker */}
      <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-white/40 font-semibold text-white/60">
        Custom Colors
      </p>
      <div className="mb-4 flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative h-7 w-7 overflow-hidden rounded-lg border border-white/20">
            <input
              type="color"
              value={primaryHex}
              onChange={handlePrimaryChange}
              className="absolute -inset-1 h-9 w-9 cursor-pointer border-0 bg-transparent p-0"
              aria-label="Primary custom accent color"
            />
          </div>
          <div>
            <span className="block text-[11px] text-white/60 leading-none">Primary</span>
            <span className="font-mono text-[9px] uppercase text-white/40">{primaryHex}</span>
          </div>
        </div>
        <div className="h-7 w-px bg-white/10" />
        <div className="flex flex-1 items-center gap-2">
          <div className="relative h-7 w-7 overflow-hidden rounded-lg border border-white/20">
            <input
              type="color"
              value={secondaryHex}
              onChange={handleSecondaryChange}
              className="absolute -inset-1 h-9 w-9 cursor-pointer border-0 bg-transparent p-0"
              aria-label="Secondary custom accent color"
            />
          </div>
          <div>
            <span className="block text-[11px] text-white/60 leading-none">Secondary</span>
            <span className="font-mono text-[9px] uppercase text-white/40">{secondaryHex}</span>
          </div>
        </div>
      </div>

      {/* Custom image upload */}
      <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-white/40 font-semibold text-white/60">
        Custom Wallpaper
      </p>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isExtracting}
        className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-[12px] transition-all ${
          isExtracting
            ? "cursor-not-allowed border-white/10 text-white/30"
            : "border-white/15 text-white/60 hover:border-iris/40 hover:text-iris"
        }`}
      >
        <Upload className="h-3.5 w-3.5" />
        {isExtracting ? "Extracting colors…" : "Upload image to extract palette"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        aria-label="Upload wallpaper image"
      />

      {/* Reset */}
      <button
        onClick={resetToDefault}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[12px] text-white/40 hover:text-white/70 transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Reset to Atlas Default
      </button>
    </div>
  );
}
