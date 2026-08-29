import { useState } from "react";
import { Watch, RefreshCw, Heart, Footprints, Droplets, Zap, Wifi, WifiOff } from "lucide-react";
import { useZeppSync } from "@/hooks/useZeppSync";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ago`;
}

export function ZeppSyncBadge({ compact = false }: { compact?: boolean }) {
  const { status, triggerMockSync } = useZeppSync();
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await triggerMockSync();
    setSyncing(false);
  };

  const isLive = status?.isLive ?? false;

  if (compact) {
    return (
      <button
        onClick={() => setExpanded((v) => !v)}
        className="glass-pill flex items-center gap-2 px-3 py-1.5 text-xs text-white/80 hover:text-white transition-all"
        title={`Amazfit Bip 6 · ${timeAgo(status?.lastSync ?? null)}`}
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? "animate-ping bg-mint" : "bg-white/30"}`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? "bg-mint" : "bg-white/30"}`}
          />
        </span>
        <Watch className="h-3.5 w-3.5" />
        {status?.liveHeartRate ? (
          <span className="font-mono text-[11px] text-iris">{status.liveHeartRate} bpm</span>
        ) : (
          <span className="font-mono text-[11px] text-white/40">
            {timeAgo(status?.lastSync ?? null)}
          </span>
        )}
      </button>
    );
  }

  return (
    <section className="glass-card p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-iris/15 ring-1 ring-iris/30">
            <Watch className="h-4 w-4 text-iris" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {status?.deviceModel ?? "Amazfit Bip 6"}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              Zepp OS · {status?.source ?? "mock"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <Wifi className="h-3.5 w-3.5 text-mint" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-white/30" />
          )}
          <span className={`font-mono text-[11px] ${isLive ? "text-mint" : "text-white/40"}`}>
            {isLive ? "Live" : "Last: " + timeAgo(status?.lastSync ?? null)}
          </span>
        </div>
      </div>

      {/* Live metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Live HR",
            value: status?.liveHeartRate ? `${status.liveHeartRate} bpm` : "—",
            icon: Heart,
            color: "iris",
            active: !!status?.liveHeartRate,
          },
          {
            label: "Steps",
            value: status?.steps ? status.steps.toLocaleString() : "0",
            icon: Footprints,
            color: "mint",
            active: (status?.steps ?? 0) > 0,
          },
          {
            label: "SpO₂",
            value: status?.spo2 ? `${status.spo2}%` : "—",
            icon: Droplets,
            color: "cyan-glow",
            active: !!status?.spo2,
          },
          {
            label: "Recovery",
            value: status?.recoveryScore ? `${status.recoveryScore}/100` : "—",
            icon: Zap,
            color: "amber-glow",
            active: !!status?.recoveryScore,
          },
        ].map((m) => (
          <div
            key={m.label}
            className={`flex items-center gap-2.5 rounded-xl border p-3 transition-all ${
              m.active
                ? `border-${m.color}/20 bg-${m.color}/10`
                : "border-white/5 bg-white/5 opacity-50"
            }`}
          >
            <m.icon className={`h-3.5 w-3.5 text-${m.color}`} />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                {m.label}
              </div>
              <div
                className={`font-mono text-sm ${m.active ? `text-${m.color}` : "text-white/30"}`}
              >
                {m.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stress bar */}
      {status?.stressScore !== null && status?.stressScore !== undefined && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px]">
            <span className="text-white/50">Stress</span>
            <span className="font-mono text-amber-glow">{status.stressScore}/100</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${status.stressScore}%`,
                background:
                  status.stressScore > 60
                    ? "oklch(0.7 0.2 25)"
                    : status.stressScore > 35
                      ? "oklch(0.82 0.16 75)"
                      : "oklch(0.78 0.16 165)",
              }}
            />
          </div>
        </div>
      )}

      {/* Manual sync button */}
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-medium transition-all ${
          syncing
            ? "cursor-not-allowed bg-white/5 text-white/30"
            : "bg-iris/15 text-iris ring-1 ring-iris/25 hover:bg-iris/25"
        }`}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Force Sync"}
      </button>
    </section>
  );
}
