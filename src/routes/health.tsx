import { createFileRoute } from "@tanstack/react-router";
import { Activity, Heart, Droplet, Moon, Footprints, Flame, Wifi, Database, Scale } from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";
import { ZeppSyncBadge } from "@/components/ZeppSyncBadge";
import { SectionLabel } from "@/components/atlas/index";
import { useHealthSync } from "@/hooks/useHealthSync";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Health — Atlas OS" },
      { name: "description", content: "Atlas Health: your biology, clearly interpreted." },
      { property: "og:title", content: "Health — Atlas OS" },
    ],
  }),
  component: HealthPage,
});

function formatTime(lastSync: Date | null): string {
  if (!lastSync) return "Never";
  const diff = Date.now() - lastSync.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

const tooltipStyle = {
  background: "oklch(0.16 0.025 270 / 0.96)",
  border: "1px solid oklch(1 0 0 / 0.08)",
  borderRadius: 8,
  color: "white",
  fontSize: 11,
};

function HealthPage() {
  const { metric, weightTrend, isLive, isLoading, lastSyncedAt } = useHealthSync();

  const rhr        = metric?.restingHeartRate ?? null;
  const steps      = metric?.steps ?? null;
  const calories   = metric?.caloriesBurned ?? null;
  const water      = metric?.waterLiters ?? null;
  const sleepHours = metric?.sleepHours ?? null;
  const sleepScore = metric?.sleepScore ?? null;
  const macros     = metric?.macros ?? [];
  const hrData     = metric?.heartRate ?? [];
  const totalCalories = metric?.totalCalories ?? null;

  const hasData = rhr !== null || steps !== null || sleepScore !== null;

  const hrMin = hrData.length > 0 ? Math.min(...hrData.map((r) => r.bpm)) : null;
  const hrMax = hrData.length > 0 ? Math.max(...hrData.map((r) => r.bpm)) : null;
  const hrAvg =
    hrData.length > 0
      ? Math.round(hrData.reduce((s, r) => s + r.bpm, 0) / hrData.length)
      : null;

  const recoveryInterpretation =
    sleepScore === null ? null :
    sleepScore > 85 ? "Optimal" :
    sleepScore > 70 ? "Good" :
    sleepScore > 55 ? "Below baseline" :
    sleepScore > 0  ? "Poor — rest recommended" :
    null;

  return (
    <>
      <PageHeader
        eyebrow="Health"
        title="Body status."
        subtitle="The body is the operating system underneath everything else."
        right={
          <div className="flex items-center gap-2.5">
            {isLive && (
              <div className="glass-pill flex items-center gap-2 px-2.5 py-1.5 text-[11px]">
                <Wifi className="h-3 w-3 text-mint" />
                <span className="text-mint">Live</span>
                <span className="text-white/35">· {formatTime(lastSyncedAt)}</span>
              </div>
            )}
            <ZeppSyncBadge compact />
          </div>
        }
      />

      {!hasData && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08]">
            <Activity className="h-6 w-6 text-white/30" />
          </div>
          <h2 className="text-[15px] font-medium text-white/80">No health data available.</h2>
          <p className="mt-2 max-w-sm text-[12.5px] text-white/40">
            Connect a supported device or sync a service to begin building your biological baseline.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-5">
          {/* ── RECOVERY SUMMARY (top priority) ─────────────────── */}
          <section
            className="glass-card col-span-12 p-6 lg:col-span-4"
            style={
              sleepScore !== null && sleepScore < 70
                ? { borderColor: "oklch(0.82 0.16 75 / 0.15)" }
                : {}
            }
          >
            <SectionLabel label="Recovery" />
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`font-display text-5xl font-light text-white ${sleepScore ? "text-glow" : ""}`}>
                {sleepScore !== null ? sleepScore : "—"}
              </span>
              <span className="text-[13px] text-white/40">/ 100</span>
            </div>
            {recoveryInterpretation && (
              <p className="mt-2 text-[13px]" style={{
                color: (sleepScore !== null && sleepScore < 70) ? "var(--color-attention)" : "var(--color-healthy)"
              }}>
                {recoveryInterpretation}
              </p>
            )}

            <div className="atlas-divider my-5" />

            <p className="atlas-label mb-3">Evidence</p>
            <div className="space-y-2.5 text-[12px]">
              {[
                {
                  label: "Sleep duration",
                  value: sleepHours !== null ? `${Math.floor(sleepHours)}h ${Math.round((sleepHours % 1) * 60)}m` : null,
                  color: sleepHours !== null && sleepHours < 7 ? "amber-glow" : "mint",
                },
                {
                  label: "Resting HR",
                  value: rhr !== null ? `${rhr} bpm` : null,
                  color: rhr !== null && rhr > 60 ? "amber-glow" : "mint",
                },
                {
                  label: "Last sync",
                  value: lastSyncedAt ? formatTime(lastSyncedAt) : null,
                  color: "cyan-glow",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between border-b border-white/[0.04] pb-2.5 last:border-0 last:pb-0">
                  <span className="text-white/60">{label}</span>
                  {value ? (
                    <span className="font-mono" style={{ color: `var(--color-${color})` }}>{value}</span>
                  ) : (
                    <span className="font-mono text-white/25">—</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── METRICS ROW ─────────────────────────────────────── */}
          <div className="col-span-12 grid grid-cols-2 gap-4 self-start lg:col-span-8 md:grid-cols-4">
            {[
              { label: "Resting HR",  value: rhr !== null ? `${rhr}` : "—",                     unit: "bpm",   icon: Heart,       color: "iris" },
              { label: "Steps",       value: steps !== null ? steps.toLocaleString() : "—",     unit: "today", icon: Footprints,  color: "mint" },
              { label: "Calories",    value: calories !== null ? calories.toLocaleString() : "—", unit: "kcal",  icon: Flame,       color: "amber-glow" },
              { label: "Water",       value: water !== null ? `${water.toFixed(1)}L` : "—",     unit: "of 3L", icon: Droplet,     color: "cyan-glow" },
            ].map((s) => (
              <div key={s.label} className="glass-card flex items-center gap-3.5 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
                  style={{
                    background: `color-mix(in oklab, var(--color-${s.color}) 12%, transparent)`,
                    color: `var(--color-${s.color})`,
                  }}
                >
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="atlas-label mb-0.5">{s.label}</p>
                  <p className="font-display text-[20px] leading-none text-white">{s.value}</p>
                  <p className="mt-0.5 text-[10px] text-white/35">{s.unit}</p>
                </div>
              </div>
            ))}

            {/* Heart rate chart */}
            <div className="glass-card col-span-2 p-5 md:col-span-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-white">Heart Rate</p>
                  <p className="atlas-label mt-1">
                    {hrData.length > 0 ? `${hrData.length} readings · live` : "No data available"}
                  </p>
                </div>
                {hrData.length > 0 && (
                  <div className="flex gap-2 text-[11px]">
                    <span className="glass-pill px-2.5 py-1 text-iris">Min {hrMin}</span>
                    <span className="glass-pill px-2.5 py-1 text-amber-glow">Max {hrMax}</span>
                    <span className="glass-pill px-2.5 py-1 text-mint">Avg {hrAvg}</span>
                  </div>
                )}
              </div>
              <div className="h-40">
                {hrData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hrData}>
                      <XAxis dataKey="t" hide />
                      <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="bpm" stroke="var(--iris)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.01]">
                    <Database className="h-5 w-5 text-white/10 mb-2" />
                    <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Awaiting Sync</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── MACROS ──────────────────────────────────────────── */}
          <section className="glass-card col-span-12 p-6 lg:col-span-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-medium text-white">Macros Today</p>
              <Activity className="h-3.5 w-3.5 text-mint" />
            </div>
            <div className="mb-4 flex items-baseline gap-1.5">
              <span className="font-display text-3xl text-white">
                {totalCalories !== null ? totalCalories.toLocaleString() : "—"}
              </span>
              <span className="text-[11px] text-white/40">kcal</span>
            </div>
            {macros.length > 0 ? (
              <div className="space-y-4">
                {macros.map((m) => (
                  <div key={m.name}>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-white/65">{m.name}</span>
                      <span className="font-mono text-white/45">{m.value}/{m.target}g</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                          background: m.fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center py-6 text-center">
                <span className="font-mono text-[10px] text-white/20 uppercase tracking-widest mb-1">No macros logged</span>
                <span className="text-[11px] text-white/40">Log meals via Atlas AI</span>
              </div>
            )}
          </section>

          {/* ── WEIGHT TREND ────────────────────────────────────── */}
          <section className="glass-card col-span-12 p-6 lg:col-span-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-medium text-white">Weight Trend</p>
              <p className="atlas-label">
                {weightTrend.length > 0 ? `${weightTrend.length} data points · 90d` : "No data available"}
              </p>
            </div>
            <div className="h-44">
              {weightTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightTrend}>
                    <defs>
                      <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-healthy)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-healthy)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" hide />
                    <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="w" stroke="var(--color-healthy)" strokeWidth={1.5} fill="url(#wg)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.01]">
                  <Scale className="h-5 w-5 text-white/10 mb-2" />
                  <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Connect OKOK Scale</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
