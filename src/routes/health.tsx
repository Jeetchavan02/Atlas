import { createFileRoute } from "@tanstack/react-router";
import { Activity, Heart, Droplet, Moon, Footprints, Flame, Wifi } from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";
import { ZeppSyncBadge } from "@/components/ZeppSyncBadge";
import { useHealthSync } from "@/hooks/useHealthSync";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Health — Atlas" },
      {
        name: "description",
        content:
          "Atlas Health: sleep, heart rate, recovery, nutrition — your biology, beautifully tracked.",
      },
      { property: "og:title", content: "Health — Atlas" },
      { property: "og:description", content: "Your biology, beautifully tracked." },
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

function HealthPage() {
  const { metric, weightTrend, isLive, isLoading, lastSyncedAt } = useHealthSync();

  const rhr = metric?.restingHeartRate || 0;
  const steps = metric?.steps || 0;
  const calories = metric?.caloriesBurned || 0;
  const water = metric?.waterLiters || 0;
  const sleepHours = metric?.sleepHours || 0;
  const sleepScore = metric?.sleepScore || 0;
  const macros = metric?.macros || [];
  const macroPie = metric?.macrosPie || [];
  const hrData = metric?.heartRate || [];
  const totalCalories = metric?.totalCalories || 0;

  // Fallback spark data when no HR readings yet
  const hrDisplay =
    hrData.length > 0
      ? hrData
      : Array.from({ length: 48 }, (_, i) => ({
          t: i,
          bpm: 60 + Math.round(Math.sin(i / 4) * 8 + (i > 30 ? 20 : 0)),
        }));

  const weightDisplay =
    weightTrend.length > 0
      ? weightTrend
      : Array.from({ length: 30 }, (_, i) => ({
          d: i + 1,
          w: 78 - i * 0.04 + Math.sin(i / 4) * 0.3,
        }));

  const hrMin = hrDisplay.length > 0 ? Math.min(...hrDisplay.map((r) => r.bpm)) : 48;
  const hrMax = hrDisplay.length > 0 ? Math.max(...hrDisplay.map((r) => r.bpm)) : 168;
  const hrAvg =
    hrDisplay.length > 0
      ? Math.round(hrDisplay.reduce((s, r) => s + r.bpm, 0) / hrDisplay.length)
      : 64;

  return (
    <>
      <PageHeader
        eyebrow={`Health score · ${sleepScore || 76}`}
        title="Health"
        subtitle="The body is the operating system underneath everything else."
        right={
          <div className="flex items-center gap-3">
            {isLive && (
              <div className="glass-pill flex items-center gap-2 px-3 py-1.5 text-xs">
                <Wifi className="h-3 w-3 text-mint" />
                <span className="text-mint">Live</span>
                <span className="text-white/40">· {formatTime(lastSyncedAt)}</span>
              </div>
            )}
            <ZeppSyncBadge compact />
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* Stat cards */}
        {[
          {
            label: "Resting HR",
            value: rhr > 0 ? `${rhr}` : isLoading ? "—" : "52",
            unit: "bpm",
            icon: Heart,
            color: "iris",
          },
          {
            label: "Steps",
            value: steps > 0 ? steps.toLocaleString() : isLoading ? "—" : "0",
            unit: "today",
            icon: Footprints,
            color: "mint",
          },
          {
            label: "Calories",
            value: calories > 0 ? calories.toLocaleString() : isLoading ? "—" : "0",
            unit: "burned",
            icon: Flame,
            color: "amber-glow",
          },
          {
            label: "Water",
            value: water > 0 ? `${water.toFixed(1)}L` : isLoading ? "—" : "0L",
            unit: "of 3L",
            icon: Droplet,
            color: "cyan-glow",
          },
        ].map((s) => (
          <section
            key={s.label}
            className="glass-card col-span-6 flex items-center gap-4 p-5 md:col-span-3"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${s.color}/15 text-${s.color} ring-1 ring-${s.color}/30`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                {s.label}
              </div>
              <div className="font-display text-2xl text-white">{s.value}</div>
              <div className="text-[11px] text-white/50">{s.unit}</div>
            </div>
          </section>
        ))}

        {/* Heart rate chart */}
        <section className="glass-card col-span-12 p-7 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-white">Heart rate</h2>
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                {hrData.length > 0 ? `${hrData.length} readings · live` : "Last 24 hours · demo"}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="glass-pill px-3 py-1 text-iris">Min {hrMin}</span>
              <span className="glass-pill px-3 py-1 text-amber-glow">Max {hrMax}</span>
              <span className="glass-pill px-3 py-1 text-mint">Avg {hrAvg}</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hrDisplay}>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[40, 180]} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 270 / 0.9)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bpm"
                  stroke="oklch(0.7 0.2 290)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Macros pie */}
        <section className="glass-card col-span-12 p-7 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Macros today</h2>
            <Activity className="h-4 w-4 text-mint" />
          </div>
          <div className="relative mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    macroPie.length > 0
                      ? macroPie
                      : [
                          { name: "Protein", value: 138, fill: "oklch(0.7 0.2 290)" },
                          { name: "Carbs", value: 210, fill: "oklch(0.82 0.15 200)" },
                          { name: "Fat", value: 62, fill: "oklch(0.82 0.16 75)" },
                        ]
                  }
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {(macroPie.length > 0 ? macroPie : []).map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-2xl text-white">
                {totalCalories > 0 ? totalCalories.toLocaleString() : "—"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                kcal
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {(macros.length > 0
              ? macros
              : [
                  { name: "Protein", value: 138, target: 180, fill: "oklch(0.7 0.2 290)" },
                  { name: "Carbs", value: 210, target: 280, fill: "oklch(0.82 0.15 200)" },
                  { name: "Fat", value: 62, target: 80, fill: "oklch(0.82 0.16 75)" },
                ]
            ).map((m) => (
              <div key={m.name}>
                <div className="flex justify-between text-xs text-white">
                  <span>{m.name}</span>
                  <span className="font-mono text-white/60">
                    {m.value}/{m.target}g
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                      background: m.fill,
                      boxShadow: `0 0 12px ${m.fill}`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weight trend */}
        <section className="glass-card col-span-12 p-7 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-white">Weight trend</h2>
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                {weightTrend.length > 0
                  ? `${weightTrend.length} data points · 90 days`
                  : "30 days · demo"}
              </p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightDisplay}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 165)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 165)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 270 / 0.9)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="w"
                  stroke="oklch(0.78 0.16 165)"
                  strokeWidth={2}
                  fill="url(#wg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sleep + Zepp panel */}
        <section className="col-span-12 space-y-5 lg:col-span-4">
          <div className="glass-card p-7">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-medium text-white">Sleep score</h2>
              <Moon className="h-4 w-4 text-iris" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-5xl text-white text-glow">
                {sleepScore > 0 ? sleepScore : "—"}
              </span>
              <span className="text-sm text-white/60">/ 100</span>
            </div>
            <p className="mt-1 text-sm text-white/60">
              {sleepHours > 0
                ? `${sleepHours.toFixed(1)}h last night`
                : "No sleep data yet — sync your Amazfit Bip 6"}
            </p>
            <div className="mt-5 space-y-2.5 text-xs">
              {[
                [
                  "Duration",
                  sleepHours > 0
                    ? `${Math.floor(sleepHours)}h ${Math.round((sleepHours % 1) * 60)}m`
                    : "—",
                  "iris",
                ],
                ["Score", sleepScore > 0 ? `${sleepScore}/100` : "—", "mint"],
                ["Watch Sync", lastSyncedAt ? formatTime(lastSyncedAt) : "Not synced", "cyan-glow"],
                ["Status", isLive ? "Live data" : "Polling…", "amber-glow"],
              ].map(([k, v, c]) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0"
                >
                  <span className="text-white/80">{k}</span>
                  <span className={`font-mono text-${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zepp sync badge */}
          <ZeppSyncBadge />
        </section>
      </div>
    </>
  );
}
