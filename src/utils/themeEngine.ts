/**
 * Atlas Theme Engine — Dynamic Wallpaper Color Extraction & OKLCH Injection
 *
 * Extracts dominant accent colors from an image using canvas sampling + k-means clustering,
 * then injects them as OKLCH CSS custom properties onto :root.
 *
 * CRITICAL: Only --iris, --mint, --cyan-glow, --amber-glow, --shadow-glow,
 * and --gradient-iris are modified. All glass/blur/layout CSS is untouched.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OklchColor {
  l: number; // lightness  0–1
  c: number; // chroma     0–0.4
  h: number; // hue        0–360
}

export interface DominantColors {
  primary: OklchColor;
  secondary: OklchColor;
}

// ─── Preset palettes ──────────────────────────────────────────────────────────

export const THEME_PRESETS: Record<string, DominantColors & { name: string }> = {
  atlas: {
    name: "Atlas Default",
    primary: { l: 0.7, c: 0.2, h: 290 }, // iris — violet
    secondary: { l: 0.78, c: 0.16, h: 165 }, // mint — teal-green
  },
  nebula: {
    name: "Nebula",
    primary: { l: 0.72, c: 0.22, h: 310 }, // electric violet-pink
    secondary: { l: 0.75, c: 0.18, h: 220 }, // cerulean
  },
  ember: {
    name: "Ember",
    primary: { l: 0.72, c: 0.2, h: 35 }, // warm amber
    secondary: { l: 0.68, c: 0.22, h: 15 }, // deep coral
  },
  forest: {
    name: "Forest",
    primary: { l: 0.7, c: 0.18, h: 145 }, // deep green
    secondary: { l: 0.74, c: 0.16, h: 195 }, // sage-teal
  },
  ocean: {
    name: "Ocean",
    primary: { l: 0.68, c: 0.2, h: 220 }, // deep blue
    secondary: { l: 0.74, c: 0.17, h: 190 }, // seafoam
  },
};

// ─── Default values (matches styles.css) ─────────────────────────────────────

const DEFAULT_COLORS: DominantColors = THEME_PRESETS.atlas;

// ─── Math: RGB → Linear RGB → XYZ → OKLab → OKLCH ───────────────────────────

function toLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  // Linear RGB → LMS (Oklab matrix)
  const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
  const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
  const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function rgbToOklch(r: number, g: number, b: number): OklchColor {
  const [L, a, ab] = rgbToOklab(r, g, b);
  const c = Math.sqrt(a * a + ab * ab);
  let h = (Math.atan2(ab, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

// ─── Canvas color sampling ────────────────────────────────────────────────────

async function loadImageData(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Sample at reduced resolution for performance
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 64, 64);
      resolve(ctx.getImageData(0, 0, 64, 64));
    };
    img.onerror = reject;
    img.src = src;
  });
}

type RGB = [number, number, number];

function kMeans(pixels: RGB[], k = 4, iterations = 10): RGB[] {
  // Initialize centroids with first k pixels (spread across array)
  let centroids: RGB[] = Array.from(
    { length: k },
    (_, i) => pixels[Math.floor((i * pixels.length) / k)],
  );

  for (let iter = 0; iter < iterations; iter++) {
    const clusters: RGB[][] = Array.from({ length: k }, () => []);

    for (const px of pixels) {
      let minDist = Infinity;
      let nearest = 0;
      for (let j = 0; j < k; j++) {
        const dr = px[0] - centroids[j][0];
        const dg = px[1] - centroids[j][1];
        const db = px[2] - centroids[j][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < minDist) {
          minDist = d;
          nearest = j;
        }
      }
      clusters[nearest].push(px);
    }

    centroids = clusters.map((cluster) => {
      if (!cluster.length) return centroids[0];
      const r = Math.round(cluster.reduce((s, p) => s + p[0], 0) / cluster.length);
      const g = Math.round(cluster.reduce((s, p) => s + p[1], 0) / cluster.length);
      const b = Math.round(cluster.reduce((s, p) => s + p[2], 0) / cluster.length);
      return [r, g, b] as RGB;
    });
  }

  return centroids;
}

function isValidAccentColor(oklch: OklchColor): boolean {
  // Reject near-blacks, near-whites, and desaturated grays
  if (oklch.l < 0.25 || oklch.l > 0.92) return false;
  if (oklch.c < 0.08) return false;
  return true;
}

function clampToDashboardRange(oklch: OklchColor): OklchColor {
  return {
    l: Math.max(0.6, Math.min(0.82, oklch.l)),
    c: Math.max(0.14, Math.min(0.3, oklch.c)),
    h: oklch.h,
  };
}

export async function extractDominantColors(src: string): Promise<DominantColors> {
  try {
    const imageData = await loadImageData(src);
    const pixels: RGB[] = [];

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      if (a < 128) continue; // skip transparent pixels
      pixels.push([r, g, b]);
    }

    if (!pixels.length) return DEFAULT_COLORS;

    // K-means clustering → 4 dominant colors
    const centroids = kMeans(pixels, 4, 12);

    // Convert to OKLCH and filter to valid accent colors
    const candidates = centroids
      .map(([r, g, b]) => rgbToOklch(r, g, b))
      .filter(isValidAccentColor)
      .map(clampToDashboardRange)
      .sort((a, b) => b.c - a.c); // sort by chroma (most vibrant first)

    if (candidates.length === 0) return DEFAULT_COLORS;

    const primary = candidates[0];
    // Secondary: most different hue from primary, or shift by 120° if only one candidate
    let secondary = candidates.find((c) => Math.abs(c.h - primary.h) > 60) ?? {
      ...primary,
      h: (primary.h + 120) % 360,
    };
    secondary = clampToDashboardRange(secondary);

    return { primary, secondary };
  } catch {
    return DEFAULT_COLORS;
  }
}

// ─── CSS injection ────────────────────────────────────────────────────────────

export function oklchString(c: OklchColor): string {
  return `oklch(${c.l.toFixed(3)} ${c.c.toFixed(3)} ${c.h.toFixed(1)})`;
}

export function applyTheme(colors: DominantColors): void {
  const { primary, secondary } = colors;

  // Derive complementary variants
  const cyanGlow: OklchColor = {
    l: Math.min(0.84, secondary.l + 0.04),
    c: Math.max(0.12, secondary.c - 0.02),
    h: (secondary.h + 25) % 360,
  };
  const amberGlow: OklchColor = {
    l: Math.min(0.84, secondary.l + 0.04),
    c: Math.max(0.12, secondary.c - 0.02),
    h: (secondary.h + 110) % 360,
  };

  const root = document.documentElement;

  // Modify OKLCH accent tokens
  root.style.setProperty("--iris", oklchString(primary));
  root.style.setProperty("--mint", oklchString(secondary));
  root.style.setProperty("--cyan-glow", oklchString(cyanGlow));
  root.style.setProperty("--amber-glow", oklchString(amberGlow));
  
  root.style.setProperty(
    "--shadow-glow",
    `0 0 40px -8px oklch(${primary.l.toFixed(3)} ${primary.c.toFixed(3)} ${primary.h.toFixed(1)} / 0.5)`,
  );
  root.style.setProperty(
    "--gradient-iris",
    `linear-gradient(135deg, ${oklchString(primary)}, oklch(${primary.l.toFixed(3)} ${(primary.c + 0.02).toFixed(3)} ${((primary.h - 30 + 360) % 360).toFixed(1)}))`,
  );

  // Dynamic Background & Glow customization based on the chosen color
  root.style.setProperty(
    "--bg-glow-1",
    `oklch(0.35 0.15 ${primary.h.toFixed(1)} / 0.35)`
  );
  root.style.setProperty(
    "--bg-glow-2",
    `oklch(0.30 0.12 ${secondary.h.toFixed(1)} / 0.40)`
  );
  root.style.setProperty(
    "--background",
    `oklch(0.12 0.02 ${primary.h.toFixed(1)})`
  );
  root.style.setProperty(
    "--card",
    `oklch(0.16 0.02 ${primary.h.toFixed(1)} / 0.45)`
  );
  root.style.setProperty(
    "--popover",
    `oklch(0.14 0.02 ${primary.h.toFixed(1)} / 0.9)`
  );
  root.style.setProperty(
    "--secondary",
    `oklch(0.18 0.02 ${primary.h.toFixed(1)} / 0.5)`
  );
  root.style.setProperty(
    "--muted",
    `oklch(0.18 0.02 ${primary.h.toFixed(1)} / 0.4)`
  );

  // Dynamic Wallpaper hue rotation filter
  const hueDiff = primary.h - 290;
  root.style.setProperty(
    "--bg-image-filter",
    `hue-rotate(${hueDiff.toFixed(1)}deg) saturate(1.2)`
  );
}

export function resetTheme(): void {
  const root = document.documentElement;
  const defaults = [
    ["--iris", "oklch(0.7 0.2 290)"],
    ["--mint", "oklch(0.78 0.16 165)"],
    ["--cyan-glow", "oklch(0.82 0.15 200)"],
    ["--amber-glow", "oklch(0.82 0.16 75)"],
    ["--shadow-glow", "0 0 40px -8px oklch(0.7 0.2 290 / 0.5)"],
    ["--gradient-iris", "linear-gradient(135deg, oklch(0.7 0.2 290), oklch(0.65 0.22 260))"],
    ["--bg-glow-1", "oklch(0.5 0.25 310 / 0.35)"],
    ["--bg-glow-2", "oklch(0.4 0.22 240 / 0.4)"],
    ["--background", "oklch(0.14 0.03 270)"],
    ["--card", "oklch(0.2 0.03 270 / 0.45)"],
    ["--popover", "oklch(0.18 0.03 270 / 0.9)"],
    ["--secondary", "oklch(0.25 0.04 270 / 0.5)"],
    ["--muted", "oklch(0.25 0.03 270 / 0.4)"],
    ["--bg-image-filter", "none"],
  ] as const;

  for (const [prop, val] of defaults) {
    root.style.setProperty(prop, val);
  }
}

// ─── Direct Color Wheel Support ──────────────────────────────────────────────

export function hexToOklch(hex: string): OklchColor {
  // Parse #rrggbb
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return clampToDashboardRange(rgbToOklch(r, g, b));
}

function fromLinear(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function oklchToHex(color: OklchColor): string {
  // OKLCH to OKLab
  const hRad = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hRad);
  const b = color.c * Math.sin(hRad);
  const L = color.l;

  // OKLab to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  // LMS cubed
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS to Linear RGB
  const rL = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gL = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bL = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Linear RGB to sRGB
  const r = Math.max(0, Math.min(255, Math.round(fromLinear(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(fromLinear(gL) * 255)));
  const blueVal = Math.max(0, Math.min(255, Math.round(fromLinear(bL) * 255)));

  // Convert to hex
  const rHex = r.toString(16).padStart(2, "0");
  const gHex = g.toString(16).padStart(2, "0");
  const bHex = blueVal.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}
