import { Link } from "@tanstack/react-router";
import {
  Activity,
  Brain,
  Calendar,
  CheckSquare,
  Dumbbell,
  Home,
  Sparkles,
  Wind,
  Settings,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import meshBg from "@/assets/atlas-mesh.jpg";
import { WallpaperThemeSelector } from "@/components/WallpaperThemeSelector";
import { useZeppSync } from "@/hooks/useZeppSync";

const nav = [
  { to: "/", icon: Home, label: "Mission" },
  { to: "/ai", icon: Brain, label: "Atlas AI" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/habits", icon: Wind, label: "Habits" },
  { to: "/gym", icon: Dumbbell, label: "Gym" },
  { to: "/health", icon: Activity, label: "Health" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/sync", icon: RefreshCw, label: "Sync Data" },
] as const;

export function AtlasShell({ children }: { children: ReactNode }) {
  const [themeOpen, setThemeOpen] = useState(false);
  const { status: zeppStatus } = useZeppSync();

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      {/* Ambient background */}
      <img
        src={meshBg}
        alt=""
        width={1920}
        height={1280}
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-90 transition-all duration-700"
        style={{ filter: "var(--bg-image-filter, none)" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--bg-glow-1),transparent_60%),radial-gradient(ellipse_at_bottom_left,var(--bg-glow-2),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 bg-background/60 backdrop-blur-3xl" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,oklch(0.08_0.03_270/0.75))]" />

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 z-30 flex h-screen w-[72px] flex-col items-center gap-1.5 py-5">
          <Link
            to="/"
            aria-label="Atlas Home"
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_24px_-8px_oklch(0_0_0/0.6)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--gradient-iris)] shadow-[0_0_18px_oklch(0.7_0.2_290/0.7)]">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
          </Link>

          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              aria-label={n.label}
              activeOptions={n.to === "/" ? { exact: true } : { exact: false }}
              activeProps={{ className: "is-active bg-white/10 text-white" }}
              inactiveProps={{ className: "text-white/50 hover:bg-white/5 hover:text-white/80" }}
              className="group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all"
            >
              <span className="absolute -left-2 h-5 w-[3px] rounded-r-full bg-iris shadow-[0_0_12px_var(--color-iris)] hidden group-[.is-active]:block" />
              <n.icon className="h-[18px] w-[18px]" />
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 z-50">
                {n.label}
              </span>
            </Link>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Zepp sync status dot */}
          {zeppStatus && (
            <div
              className="group relative flex h-11 w-11 cursor-default items-center justify-center rounded-xl"
              title={`Amazfit Bip 6 · ${zeppStatus.isLive ? "Live" : "Offline"}`}
            >
              <span className="relative flex h-2.5 w-2.5">
                {zeppStatus.isLive && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    zeppStatus.isLive ? "bg-mint shadow-[0_0_8px_var(--color-mint)]" : "bg-white/20"
                  }`}
                />
              </span>
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                {zeppStatus.isLive ? "Watch Live" : "Watch Offline"}
              </span>
            </div>
          )}

          {/* Settings / Theme button */}
          <div className="relative">
            <button
              onClick={() => setThemeOpen((v) => !v)}
              aria-label="Theme settings"
              className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                themeOpen
                  ? "bg-white/10 text-iris"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              <Settings className="h-[18px] w-[18px]" />
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                Theme
              </span>
            </button>

            {/* Theme panel — anchored above the settings button */}
            {themeOpen && (
              <div className="absolute bottom-14 left-14 z-50">
                <WallpaperThemeSelector onClose={() => setThemeOpen(false)} />
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-6 py-8 md:px-10 lg:px-14">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        {eyebrow && (
          <span className="glass-pill mb-3 inline-flex items-center gap-2 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_var(--color-mint)]" />
            {eyebrow}
          </span>
        )}
        <h1 className="font-display text-4xl font-light tracking-tight text-white text-glow md:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-base text-white/60">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
