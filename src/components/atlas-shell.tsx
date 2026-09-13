import { Link, useRouterState } from "@tanstack/react-router";
import {
  Brain,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Command,
  Cpu,
  Home,
  Bell,
  RefreshCw,
  Settings,
  Sparkles,
  Zap,
  Circle,
} from "lucide-react";
import React, { useState } from "react";
import type { ReactNode } from "react";
import meshBg from "@/assets/atlas-mesh.jpg";
import { WallpaperThemeSelector } from "@/components/WallpaperThemeSelector";
import { useZeppSync } from "@/hooks/useZeppSync";
import { useActivity } from "@/context/ActivityContext";
import { ActivityCenter } from "@/components/ActivityCenter";
import { useGlobalChat } from "@/context/ChatContext";

// ── Navigation structure ──────────────────────────────────────────
const primaryNav = [
  { to: "/", icon: Home, label: "Home", exact: true },
  { to: "/ai", icon: Brain, label: "Chat", exact: false },
  { to: "/tasks", icon: CheckSquare, label: "Tasks", exact: false },
  { to: "/calendar", icon: Calendar, label: "Calendar", exact: false },
  // File management omitted until it has a route, but added structurally
  { to: "/memory", icon: Cpu, label: "Memory", exact: false },
  { to: "/automations", icon: Zap, label: "Automations", exact: false },
  { to: "/sync", icon: RefreshCw, label: "Devices", exact: false },
];

// ── Shell ─────────────────────────────────────────────────────────
export function AtlasShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const { status: zeppStatus } = useZeppSync();
  const { unreadCount } = useActivity();
  const { loading: aiLoading, error: aiError } = useGlobalChat();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const sidebarW = collapsed ? 52 : 208;

  // Derive Atlas system state from real application state
  const atlasState: "online" | "processing" | "degraded" =
    aiError ? "degraded" : aiLoading ? "processing" : "online";

  const stateColor =
    atlasState === "online"     ? "var(--color-healthy)" :
    atlasState === "processing" ? "var(--color-live)"    :
                                  "var(--color-attention)";

  const stateLabel =
    atlasState === "online"     ? "Online"     :
    atlasState === "processing" ? "Working…"  :
                                  "Degraded";

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      {/* Ambient background — subtle, not dominant */}
      <img
        src={meshBg}
        alt=""
        width={1920}
        height={1280}
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-[0.55] transition-all duration-700"
        style={{ filter: "var(--bg-image-filter, none)" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--bg-glow-1),transparent_65%),radial-gradient(ellipse_at_bottom_left,var(--bg-glow-2),transparent_60%)]" />
      <div className="pointer-events-none fixed inset-0 bg-background/72 backdrop-blur-3xl" />

      <div className="relative flex min-h-screen">
        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside
          className="sticky top-0 z-30 flex h-screen flex-col border-r border-white/[0.055] bg-[oklch(0.13_0.022_270/0.85)] backdrop-blur-2xl transition-[width] duration-200 ease-in-out"
          style={{ width: sidebarW }}
        >
          {/* Identity row */}
          <div
            className={`flex items-center border-b border-white/[0.055] px-3 py-[14px] ${
              collapsed ? "justify-center" : "gap-2.5"
            }`}
          >
            <Link
              to="/"
              aria-label="Atlas"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gradient-iris)]"
              style={{ boxShadow: "0 0 12px -3px oklch(0.7 0.2 290 / 0.5)" }}
            >
              <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
            </Link>
            {!collapsed && (
              <span className="text-[13px] font-semibold tracking-tight text-white/90">
                Atlas
              </span>
            )}
          </div>

          {/* Ask Atlas shortcut */}
          {!collapsed && (
            <div className="px-2.5 pt-2.5">
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
                  );
                }}
                className="flex w-full items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.03] px-2.5 py-[7px] text-[11px] text-white/30 transition-all hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/50"
                aria-label="Ask Atlas"
              >
                <Command className="h-2.5 w-2.5 shrink-0" />
                <span className="flex-1 text-left">Ask Atlas</span>
                <kbd className="font-mono text-[9px] text-white/20">⌘K</kbd>
              </button>
            </div>
          )}

          {collapsed && (
            <div className="px-2 pt-2.5">
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
                  );
                }}
                className="group relative flex w-full items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] py-[7px] text-white/30 transition-all hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/50"
                aria-label="Ask Atlas"
              >
                <Command className="h-3 w-3" />
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded border border-white/10 bg-[oklch(0.14_0.025_270/0.97)] px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 z-50">
                  Ask Atlas  ⌘K
                </span>
              </button>
            </div>
          )}

          {/* Primary Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Atlas navigation">
            <div className="space-y-0.5">
              {primaryNav.map((item) => {
                const isActive = item.exact
                  ? pathname === item.to
                  : pathname.startsWith(item.to) && item.to !== "/";

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-label={item.label}
                    className={`
                      group relative flex items-center rounded-md px-2 py-[7px] text-[12.5px] transition-all duration-150
                      ${isActive
                        ? "bg-white/[0.07] text-white"
                        : "text-white/38 hover:bg-white/[0.04] hover:text-white/65"
                      }
                      ${collapsed ? "justify-center" : "gap-2.5"}
                    `}
                  >
                    {isActive && (
                      <span className="nav-indicator absolute left-0 top-1.5 bottom-1.5" />
                    )}
                    <item.icon
                      className={`h-[14px] w-[14px] shrink-0 transition-colors ${
                        isActive ? "text-iris" : ""
                      }`}
                    />
                    {!collapsed && (
                      <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                    )}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded border border-white/10 bg-[oklch(0.14_0.025_270/0.97)] px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 z-50">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom system tray */}
          <div className="border-t border-white/[0.055] px-2 py-2 space-y-0.5">

            {/* Activity */}
            <button
              onClick={() => setActivityOpen(true)}
              className={`group relative flex w-full items-center rounded-md px-2 py-[7px] text-[12.5px] text-white/38 transition-all hover:bg-white/[0.04] hover:text-white/65 ${collapsed ? "justify-center" : "gap-2.5"}`}
              aria-label="Activity"
            >
              <div className="relative shrink-0">
                <Bell className="h-[14px] w-[14px]" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-iris text-[7px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1 text-left">Activity</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded border border-white/10 bg-[oklch(0.14_0.025_270/0.97)] px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 z-50">
                  Activity
                </span>
              )}
            </button>

            {/* Settings / theme */}
            <div className="relative">
              <button
                onClick={() => setThemeOpen((v) => !v)}
                aria-label="Settings"
                className={`group relative flex w-full items-center rounded-md px-2 py-[7px] text-[12.5px] transition-all ${themeOpen ? "bg-white/[0.07] text-iris" : "text-white/38 hover:bg-white/[0.04] hover:text-white/65"} ${collapsed ? "justify-center" : "gap-2.5"}`}
              >
                <Settings className="h-[14px] w-[14px] shrink-0" />
                {!collapsed && <span className="flex-1 text-left">Settings</span>}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded border border-white/10 bg-[oklch(0.14_0.025_270/0.97)] px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 z-50">
                    Settings
                  </span>
                )}
              </button>
              {themeOpen && (
                <div className="absolute bottom-12 left-0 z-50">
                  <WallpaperThemeSelector onClose={() => setThemeOpen(false)} />
                </div>
              )}
            </div>

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand" : "Collapse"}
              className={`flex w-full items-center rounded-md px-2 py-[7px] text-[12.5px] text-white/22 transition-all hover:bg-white/[0.04] hover:text-white/45 ${collapsed ? "justify-center" : "gap-2.5"}`}
            >
              {collapsed ? (
                <ChevronRight className="h-[14px] w-[14px]" />
              ) : (
                <>
                  <ChevronLeft className="h-[14px] w-[14px] shrink-0" />
                  <span className="flex-1 text-left text-[11px]">Collapse</span>
                </>
              )}
            </button>

            {/* Atlas system status — bottom-most, derived from real state */}
            <div
              className={`flex items-center rounded-md px-2 py-2 ${collapsed ? "justify-center" : "gap-2"}`}
              title={`Atlas ${stateLabel}`}
            >
              {atlasState === "processing" ? (
                <span className="live-indicator h-[5px] w-[5px]" style={{ animationDuration: "1.2s" }} />
              ) : (
                <Circle
                  className="h-[5px] w-[5px] shrink-0 fill-current"
                  style={{ color: stateColor }}
                />
              )}
              {!collapsed && (
                <span className="font-mono text-[9px]" style={{ color: stateColor, opacity: 0.7 }}>
                  Atlas {stateLabel}
                </span>
              )}
            </div>

            {/* Zepp live dot */}
            {zeppStatus && !collapsed && (
              <div
                className="flex items-center gap-2 px-2 py-1"
                title={`${zeppStatus.deviceModel} · ${zeppStatus.isLive ? "Live" : "Offline"}`}
              >
                {zeppStatus.isLive ? (
                  <span className="live-indicator h-[5px] w-[5px]" />
                ) : (
                  <Circle className="h-[5px] w-[5px] fill-current text-white/15" />
                )}
                <span className="font-mono text-[9px] text-white/30">
                  {zeppStatus.isLive ? "Watch live" : "Watch offline"}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto px-6 py-6 md:px-8 lg:px-10 xl:px-12">
          {children}
        </main>
      </div>

      {/* Activity center */}
      <ActivityCenter open={activityOpen} onOpenChange={setActivityOpen} />
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────
// Deliberately minimal. Pages establish their own hierarchy.
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
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="atlas-label mb-2">{eyebrow}</p>
        )}
        <h1 className="atlas-heading">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[12.5px] text-white/40">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
