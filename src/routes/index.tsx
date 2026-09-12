import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Brain, Zap, Moon, AlertTriangle, Info } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/atlas-shell";
import { GmailAlertFeed } from "@/components/GmailAlertFeed";
import { ZeppSyncBadge } from "@/components/ZeppSyncBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useActivity, formatActivityTime, categoryColors } from "@/context/ActivityContext";
import { useHealthSync } from "@/hooks/useHealthSync";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Mission Control — Atlas OS" },
      { name: "description", content: "Atlas OS Mission Control: your personal operating system home." },
    ],
  }),
  component: MissionControl,
} as any));

// Energy forecast — labeled as model, not live
const energyCurve = Array.from({ length: 24 }, (_, i) => ({
  h: i,
  v: 40 + 35 * Math.sin((i - 6) * (Math.PI / 12)) + (i === 10 ? 18 : 0) - (i > 20 ? 15 : 0),
}));

// TODAY — demo schedule, clearly marked
const todaySchedule = [
  { time: "07:00", title: "Morning run",       note: "45 min",           color: "var(--color-healthy)", done: true },
  { time: "09:30", title: "Daily review",      note: "30 min",           color: "var(--iris)",         done: true },
  { time: "10:00", title: "Deep work — Atlas", note: "90 min · ongoing", color: "var(--iris)",         now: true  },
  { time: "14:00", title: "1:1 with Maya",     note: "30 min",           color: "var(--color-live)",   done: false },
  { time: "18:30", title: "Push workout",      note: "60 min",           color: "var(--color-attention)", done: false },
  { time: "22:30", title: "Sleep target",      note: "8h",               color: "var(--color-healthy)", done: false },
];

function getGreeting(h: number): string {
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function MissionControl() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Focus session — all API calls preserved exactly
  const [isDialogOpen, setIsDialogOpen]   = useState(false);
  const [focusStage, setFocusStage]       = useState<"setup" | "active" | "complete">("setup");
  const [focusTaskName, setFocusTaskName] = useState("Launch Atlas V1");
  const [focusSessionId, setFocusSessionId] = useState<string | null>(null);
  const [focusStartTime, setFocusStartTime] = useState<number | null>(null);
  const [focusElapsed, setFocusElapsed]   = useState(0);
  const [productivityScore, setProductivityScore] = useState<number[]>([8]);

  useEffect(() => {
    if (focusStage !== "active" || !focusStartTime) return;
    const iv = setInterval(() => setFocusElapsed(Math.floor((Date.now() - focusStartTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [focusStage, focusStartTime]);

  const handleStartFocus = async () => {
    if (!focusTaskName.trim()) return;
    try {
      const res = await fetch("http://localhost:4000/api/focus/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskName: focusTaskName }),
      });
      if (res.ok) {
        const data = await res.json();
        setFocusSessionId(data.session._id);
        setFocusStartTime(Date.now());
        setFocusElapsed(0);
        setFocusStage("active");
      }
    } catch (err) { console.error("Focus start failed", err); }
  };

  const handleSubmitComplete = async () => {
    if (!focusSessionId) return;
    try {
      await fetch("http://localhost:4000/api/focus/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: focusSessionId,
          durationMinutes: Math.floor(focusElapsed / 60),
          productivityScore: productivityScore[0],
        }),
      });
      setIsDialogOpen(false);
      setTimeout(() => setFocusStage("setup"), 500);
    } catch (err) { console.error("Focus complete failed", err); }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const { activities } = useActivity();
  const { metric, isLive, isLoading: healthLoading } = useHealthSync();

  const recovery   = metric?.sleepScore ?? null;
  const sleepHours = metric?.sleepHours ?? null;

  const greeting = getGreeting(time.getHours());
  const dateStr  = time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const timeStr  = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Show recommendation only when there is meaningful data to support it
  const showRecoveryRecommendation = recovery !== null && recovery < 70;

  // Activity feed — recent 5 meaningful events
  const recentActivity = activities.slice(0, 5);

  return (
    <>
      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="mb-6">
        <p className="atlas-label mb-2">Mission Control</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="atlas-heading">{greeting}, Jeet.</h1>
            <p className="mt-1 text-[12.5px] text-white/40">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Live watch badge — only when actually live */}
            {isLive && (
              <div className="glass-pill flex items-center gap-1.5 px-2.5 py-1.5 text-[11px]">
                <span className="live-indicator h-[5px] w-[5px]" />
                <span className="font-mono text-white/55">Watch Live</span>
              </div>
            )}
            <div className="glass-pill px-3 py-1.5">
              <span className="font-mono text-[12px] text-white/55">{timeStr}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── SYSTEM STATUS ROW — secondary info, not primary ── */}
      <div className="mb-7 flex flex-wrap items-center gap-1.5">
        {[
          {
            label: "Recovery",
            value: recovery != null ? `${recovery}` : healthLoading ? "—" : "—",
            unit: "/100",
            color: (recovery != null && recovery < 70) ? "var(--color-attention)" : "var(--color-healthy)",
            live: recovery != null,
          },
          {
            label: "Focus",
            value: focusStage === "active" ? fmt(focusElapsed) : "—",
            unit: focusStage === "active" ? "active" : "",
            color: "var(--iris)",
            live: focusStage === "active",
          },
          {
            label: "Sleep",
            value: sleepHours != null ? `${sleepHours.toFixed(1)}h` : "—",
            unit: "",
            color: "var(--color-live)",
            live: false,
          },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-2 glass-pill px-3 py-1.5">
            {m.live && <span className="live-indicator h-[5px] w-[5px]" style={{ background: m.color }} />}
            <span className="text-[11px] text-white/40">{m.label}</span>
            <span className="font-mono text-[12px] font-medium" style={{ color: m.color }}>
              {m.value}
              {m.unit && <span className="ml-0.5 text-[9px] font-normal text-white/30">{m.unit}</span>}
            </span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-white/25 font-mono">
          <span className="h-1 w-1 rounded-full bg-white/20" />
          All systems nominal
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">

        {/* ── PRIMARY: NOW + RECOMMENDATIONS ──────────────── */}
        <div className="col-span-12 lg:col-span-8 space-y-4">

          {/* ── NOW: What is happening ─────────────────────── */}
          {/* This is PRIMARY — elevated surface, clear action */}
          <div
            className="glass-card p-5"
            style={{ borderColor: "oklch(0.7 0.2 290 / 0.15)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="atlas-label" style={{ color: "var(--iris)" }}>Now</span>
                {focusStage === "active" && (
                  <span className="glass-pill px-2 py-0.5 text-[9px] font-mono" style={{ color: "var(--iris)" }}>
                    Focus active
                  </span>
                )}
              </div>
              <span className="atlas-label">10:00 – 11:30</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] font-semibold leading-tight text-white">{focusTaskName}</h2>
                <p className="mt-0.5 text-[12px] text-white/40">
                  Deep work · High priority
                  {focusStage === "active" && (
                    <span className="ml-2 font-mono" style={{ color: "var(--iris)" }}>
                      {fmt(focusElapsed)}
                    </span>
                  )}
                </p>
              </div>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(v) => {
                  if (!v && focusStage === "active") return;
                  setIsDialogOpen(v);
                  if (!v) setTimeout(() => setFocusStage("setup"), 500);
                }}
              >
                <DialogTrigger asChild>
                  <button
                    id="focus-engage-btn"
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--gradient-iris)] px-4 py-2 text-[12.5px] font-medium text-white transition-all hover:opacity-90"
                    style={{ boxShadow: "var(--shadow-glow-sm)" }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {focusStage === "active" ? "In focus" : "Start focus"}
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[380px]">
                  {focusStage === "setup" && (
                    <>
                      <DialogHeader>
                        <DialogTitle>Start Focus Session</DialogTitle>
                        <DialogDescription>What are you working on?</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 pt-4">
                        <Input value={focusTaskName} onChange={(e) => setFocusTaskName(e.target.value)} autoFocus />
                      </div>
                      <DialogFooter className="pt-4">
                        <Button onClick={handleStartFocus} className="w-full">Begin</Button>
                      </DialogFooter>
                    </>
                  )}
                  {focusStage === "active" && (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="font-display text-5xl font-light text-white">{fmt(focusElapsed)}</div>
                      <p className="mt-2 text-[12px] text-white/40">{focusTaskName}</p>
                      <Button variant="destructive" className="mt-8 w-full" onClick={() => setFocusStage("complete")}>
                        End Session
                      </Button>
                    </div>
                  )}
                  {focusStage === "complete" && (
                    <>
                      <DialogHeader>
                        <DialogTitle>Session complete</DialogTitle>
                        <DialogDescription>Log productivity for this session.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5 pt-4">
                        <div className="text-center font-display text-3xl text-iris">
                          {Math.floor(focusElapsed / 60)} min
                        </div>
                        <div className="space-y-2">
                          <Label className="flex justify-between text-[12px]">
                            <span>Productivity</span>
                            <span className="font-mono" style={{ color: "var(--color-attention)" }}>{productivityScore[0]}/10</span>
                          </Label>
                          <Slider value={productivityScore} onValueChange={setProductivityScore} max={10} min={1} step={1} />
                        </div>
                      </div>
                      <DialogFooter className="pt-4">
                        <Button onClick={handleSubmitComplete} className="w-full">Save</Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── ATLAS RECOMMENDS — only when there is real data ── */}
          {showRecoveryRecommendation && (
            <div
              className="glass-card p-5"
              style={{ borderColor: "oklch(0.82 0.16 75 / 0.2)" }}
            >
              <div className="mb-3 flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-attention)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white">Recovery below baseline</p>
                  <p className="mt-0.5 text-[12px] text-white/50">
                    Score: <span className="font-mono" style={{ color: "var(--color-attention)" }}>{recovery}/100</span>
                    {sleepHours && ` · Sleep: ${sleepHours.toFixed(1)}h`}
                  </p>
                </div>
              </div>
              <p className="mb-4 text-[12.5px] text-white/60 leading-relaxed">
                Today's planned workout may be too demanding. Consider reducing volume or switching to mobility work.
              </p>
              <div className="flex gap-2">
                <Link
                  to="/gym"
                  className="glass-pill px-3 py-1.5 text-[11px] transition-colors hover:bg-white/[0.06]"
                  style={{ color: "var(--color-attention)" }}
                >
                  Review workout
                </Link>
                <Link
                  to="/health"
                  className="glass-pill px-3 py-1.5 text-[11px] text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/55"
                >
                  See full recovery
                </Link>
              </div>
            </div>
          )}

          {/* ── ATLAS BRIEFING — secondary, collapsible if needed ── */}
          <div className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5" style={{ color: "var(--iris)" }} />
                <span className="text-[13px] font-medium text-white/80">Atlas Briefing</span>
              </div>
              <Link
                to="/ai"
                className="flex items-center gap-1 text-[11px] text-white/30 transition-colors hover:text-white/55"
              >
                Ask more <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-[13px] leading-relaxed text-white/60">
              Yesterday's workout was strong — protein goal met.
              Sleep was{" "}
              <span style={{ color: sleepHours && sleepHours < 7 ? "var(--color-attention)" : "var(--color-live)" }}>
                {sleepHours != null ? `${sleepHours.toFixed(1)} hours` : "unavailable"}
              </span>
              {sleepHours && sleepHours < 7 ? " — below your 8h target." : "."}{" "}
              You have 3 high-priority tasks due today.
              Energy peaks around{" "}
              <span style={{ color: "var(--color-attention)" }}>10:00 AM</span> — protect that block.
            </p>
          </div>

          {/* ── ENERGY — tertiary, reduced size ─────────────── */}
          <div className="px-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="atlas-label">Circadian energy model</span>
              <span className="atlas-label flex items-center gap-1">
                <Info className="h-2.5 w-2.5" />
                Demo forecast
              </span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energyCurve}>
                  <defs>
                    <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="oklch(0.7 0.2 290 / 0.5)" strokeWidth={1} fill="url(#eg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gmail alerts */}
          <GmailAlertFeed />
        </div>

        {/* ── SECONDARY: CONTEXT PANEL ─────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-4">

          {/* TODAY timeline — secondary */}
          <div className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-white/70">Today</span>
              <Link to="/calendar" className="text-[11px] text-white/30 transition-colors hover:text-white/55">
                Calendar →
              </Link>
            </div>

            <div className="space-y-0">
              {todaySchedule.map((e, i) => (
                <div key={i} className={`flex items-start gap-3 py-2 ${i < todaySchedule.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                  <span
                    className="mt-0.5 w-12 shrink-0 font-mono text-[10px] text-white/30"
                  >{e.time}</span>
                  <div
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: e.color,
                      boxShadow: e.now ? `0 0 6px ${e.color}` : undefined,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[12.5px] leading-tight ${
                      e.done ? "text-white/30 line-through" : e.now ? "font-medium text-white" : "text-white/65"
                    }`}>
                      {e.title}
                    </p>
                    <p className="text-[10px] text-white/25">{e.note}</p>
                  </div>
                  {e.now && (
                    <span className="atlas-label shrink-0" style={{ color: e.color }}>Now</span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 atlas-label text-right">Demo schedule</p>
          </div>

          {/* Zepp */}
          <ZeppSyncBadge />

          {/* Activity — tertiary */}
          {recentActivity.length > 0 && (
            <div>
              <p className="atlas-label mb-2 px-1">Recent activity</p>
              <div className="space-y-0">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 border-b border-white/[0.04] py-2 last:border-0">
                    <div
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                      style={{ background: categoryColors[a.category] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] text-white/55">{a.title}</p>
                    </div>
                    <span className="font-mono text-[9px] text-white/25 shrink-0">
                      {formatActivityTime(a.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
