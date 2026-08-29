import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Dumbbell, Flame, Moon, Sun, Target, Wind, Zap, ArrowUpRight } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { PageHeader } from "@/components/atlas-shell";
import { GmailAlertFeed } from "@/components/GmailAlertFeed";
import { ZeppSyncBadge } from "@/components/ZeppSyncBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas — Mission Control" },
      {
        name: "description",
        content:
          "Atlas Mission Control: your AI-powered personal operating system for focus, health, and the metrics that compose your day.",
      },
      { property: "og:title", content: "Atlas — Mission Control" },
      {
        property: "og:description",
        content: "Personal operating system. Mission Control.",
      },
    ],
  }),
  component: AtlasDashboard,
});

const focusData = [
  { name: "Deep", value: 62, fill: "oklch(0.7 0.2 290)" },
  { name: "Meetings", value: 18, fill: "oklch(0.7 0.18 250)" },
  { name: "Admin", value: 12, fill: "oklch(0.78 0.16 165)" },
  { name: "Breaks", value: 8, fill: "oklch(0.82 0.16 75)" },
];

const sleepStages = [
  { name: "Deep", value: 1.4, fill: "oklch(0.55 0.22 280)" },
  { name: "REM", value: 1.6, fill: "oklch(0.7 0.2 290)" },
  { name: "Light", value: 2.8, fill: "oklch(0.82 0.15 200)" },
  { name: "Awake", value: 0.4, fill: "oklch(0.82 0.16 75)" },
];

const energyCurve = Array.from({ length: 24 }, (_, i) => ({
  h: i,
  v: 40 + 35 * Math.sin((i - 6) * (Math.PI / 12)) + (i === 10 ? 18 : 0) - (i > 20 ? 15 : 0),
}));

function AtlasDashboard() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
  const [focusStage, setFocusStage] = useState<"setup" | "active" | "complete">("setup");
  const [focusTaskName, setFocusTaskName] = useState("Launch Atlas V1");
  const [focusSessionId, setFocusSessionId] = useState<string | null>(null);
  const [focusStartTime, setFocusStartTime] = useState<number | null>(null);
  const [focusElapsed, setFocusElapsed] = useState(0);
  const [productivityScore, setProductivityScore] = useState<number[]>([8]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (focusStage === "active" && focusStartTime) {
      interval = setInterval(() => {
        setFocusElapsed(Math.floor((Date.now() - focusStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
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
    } catch (err) {
      console.error("Failed to start focus session", err);
    }
  };

  const handleEndFocus = () => {
    setFocusStage("complete");
  };

  const handleSubmitComplete = async () => {
    if (!focusSessionId) return;
    const durationMinutes = Math.floor(focusElapsed / 60);
    try {
      await fetch("http://localhost:4000/api/focus/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: focusSessionId,
          durationMinutes,
          productivityScore: productivityScore[0],
        }),
      });
      setIsFocusDialogOpen(false);
      // Reset for next time
      setTimeout(() => setFocusStage("setup"), 500);
    } catch (err) {
      console.error("Failed to complete session", err);
    }
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Atlas Online"
        title="Mission Control"
        subtitle="Good morning, Jeet. Ready to own today?"
        right={
          <div className="glass-card flex items-center gap-4 px-5 py-3">
            <Moon className="h-4 w-4 text-iris" />
            <div className="text-xs">
              <div className="font-mono text-white/50">PHASE</div>
              <div className="font-medium text-white">Waxing Crescent</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <Sun className="h-4 w-4 text-amber-glow" />
            <div className="text-xs">
              <div className="font-mono text-white/50">LOCAL</div>
              <div className="font-medium text-white font-mono">
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* AI Briefing */}
        <section className="glass-card col-span-12 p-7 lg:col-span-8">
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-iris/20 text-iris ring-1 ring-iris/30">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-medium text-white">Atlas Daily Briefing</h2>
                <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                  Synthesized · 8 min ago
                </p>
              </div>
            </div>
            <Link
              to="/ai"
              className="glass-pill flex items-center gap-1.5 px-3 py-1 text-[11px] text-white/80 hover:text-white"
            >
              Ask Atlas <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="max-w-2xl text-[15px] leading-relaxed text-white/85">
            Yesterday you crushed your workout and hit your protein goal. Sleep dropped to{" "}
            <span className="text-iris">6.2 hours</span>—consider an early bedtime tonight. You have{" "}
            <span className="text-cyan-glow">3 high-priority tasks</span> and 2 habits pending. Your
            energy peaks around <span className="text-amber-glow">10:00 AM</span>—reserve that
            window for deep work.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { label: "Productivity", value: 84, color: "iris" },
              { label: "Health", value: 76, color: "mint" },
              { label: "Recovery", value: 62, color: "cyan-glow" },
              { label: "Focus", value: 91, color: "amber-glow" },
            ].map((m) => (
              <div
                key={m.label}
                className="glass-pill flex items-center gap-2 px-3 py-1.5 text-xs text-white/90"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-${m.color}`}
                  style={{ boxShadow: `0 0 8px var(--color-${m.color})` }}
                />
                <span className="text-white/60">{m.label}</span>
                <span className="font-mono font-medium">{m.value}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Gmail Alerts Feed */}
        <GmailAlertFeed />

        <section className="glass-card col-span-12 p-7 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Today's Focus</h2>
            <Target className="h-4 w-4 text-iris" />
          </div>
          <span className="glass-pill mb-4 inline-flex px-3 py-1 text-[11px] text-iris">
            Deep Work Session
          </span>
          <h3 className="font-display text-3xl font-light leading-tight text-white text-glow">
            Launch Atlas V1
          </h3>
          <p className="mt-1 text-sm text-white/60">90 minutes · High priority</p>

          <Dialog
            open={isFocusDialogOpen}
            onOpenChange={(open) => {
              if (!open && focusStage === "active") return; // Prevent closing while active
              setIsFocusDialogOpen(open);
              if (!open) setTimeout(() => setFocusStage("setup"), 500);
            }}
          >
            <DialogTrigger asChild>
              <button className="group relative mt-6 w-full overflow-hidden rounded-2xl bg-[var(--gradient-iris)] px-5 py-3.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] ring-1 ring-white/20 transition-all hover:scale-[1.02]">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4" /> Engage Focus Mode
                </span>
                <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              {focusStage === "setup" && (
                <>
                  <DialogHeader>
                    <DialogTitle>Engage Focus Mode</DialogTitle>
                    <DialogDescription>
                      Enter deep work. Distractions will be minimized.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="focusTask">What are you working on?</Label>
                      <Input
                        id="focusTask"
                        value={focusTaskName}
                        onChange={(e) => setFocusTaskName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button onClick={handleStartFocus} className="w-full">
                      Initiate Sequence
                    </Button>
                  </DialogFooter>
                </>
              )}

              {focusStage === "active" && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-iris/20 ring-1 ring-iris/30">
                    <Zap className="h-8 w-8 text-iris animate-pulse" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-white">{focusTaskName}</h3>
                  <div className="mt-2 font-display text-5xl font-light text-white text-glow">
                    {formatElapsed(focusElapsed)}
                  </div>
                  <p className="mt-2 text-sm text-white/50">Deep work session active</p>
                  <Button variant="destructive" className="mt-8 w-full" onClick={handleEndFocus}>
                    End Session
                  </Button>
                </div>
              )}

              {focusStage === "complete" && (
                <>
                  <DialogHeader>
                    <DialogTitle>Session Complete</DialogTitle>
                    <DialogDescription>
                      Log your performance for this deep work session.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 pt-4 text-center">
                    <div className="font-display text-4xl text-iris">
                      {Math.floor(focusElapsed / 60)} min
                    </div>
                    <div className="space-y-3">
                      <Label className="flex justify-between">
                        <span>Productivity Score</span>
                        <span className="font-mono text-amber-glow">{productivityScore[0]}/10</span>
                      </Label>
                      <Slider
                        value={productivityScore}
                        onValueChange={setProductivityScore}
                        max={10}
                        min={1}
                        step={1}
                      />
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/40">
                        <span>Distracted</span>
                        <span>Flow State</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      onClick={handleSubmitComplete}
                      className="w-full bg-[var(--gradient-iris)]"
                    >
                      Log Session
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </section>

        {/* Sleep Pie */}
        <section className="glass-card col-span-12 p-7 md:col-span-6 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Sleep & Recovery</h2>
            <Moon className="h-4 w-4 text-iris" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
            Last night · 6h 12m
          </p>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sleepStages}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {sleepStages.map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-4xl font-light text-white text-glow">6.2</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                hrs sleep
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {sleepStages.map((s) => (
              <div key={s.name}>
                <div className="mx-auto h-1 w-6 rounded-full" style={{ background: s.fill }} />
                <div className="mt-1.5 text-[10px] text-white/60">{s.name}</div>
                <div className="font-mono text-xs text-white">{s.value}h</div>
              </div>
            ))}
          </div>
        </section>

        {/* Time allocation pie */}
        <section className="glass-card col-span-12 p-7 md:col-span-6 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Time Allocation</h2>
            <Flame className="h-4 w-4 text-amber-glow" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
            Today · projected
          </p>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={focusData}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={92}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {focusData.map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-3xl font-light text-white">62%</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                deep work
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {focusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                  <span className="text-white/60">{s.name}</span>
                </div>
                <span className="font-mono">{s.value}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recovery radial */}
        <section className="glass-card col-span-12 p-7 md:col-span-6 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Gym & Recovery</h2>
            <Dumbbell className="h-4 w-4 text-mint" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
            Strain · 14.2
          </p>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="55%"
                outerRadius="100%"
                data={[
                  { name: "HRV", value: 78, fill: "oklch(0.78 0.16 165)" },
                  { name: "Strain", value: 62, fill: "oklch(0.7 0.2 290)" },
                  { name: "Recovery", value: 88, fill: "oklch(0.82 0.15 200)" },
                ]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-3xl font-light text-white">88</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                recovery
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="font-mono text-white/50">HRV</div>
              <div className="font-medium text-mint">78ms</div>
            </div>
            <div>
              <div className="font-mono text-white/50">RHR</div>
              <div className="font-medium text-iris">52</div>
            </div>
            <div>
              <div className="font-mono text-white/50">VO₂</div>
              <div className="font-medium text-cyan-glow">48.3</div>
            </div>
          </div>
        </section>

        {/* Energy curve */}
        <section className="glass-card col-span-12 p-7 lg:col-span-8">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-medium text-white">Circadian Energy</h2>
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                AI forecast · next 24h
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="glass-pill px-3 py-1 text-amber-glow">Peak 10:00</span>
              <span className="glass-pill px-3 py-1 text-iris">Dip 14:30</span>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={energyCurve}>
                <defs>
                  <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="oklch(0.82 0.15 200)"
                  strokeWidth={2}
                  fill="url(#eg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-6 font-mono text-[10px] uppercase tracking-widest text-white/50">
            {["00", "04", "08", "12", "16", "20"].map((t) => (
              <span key={t}>{t}:00</span>
            ))}
          </div>
        </section>

        {/* Habits */}
        <section className="glass-card col-span-12 p-7 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Habit Streaks</h2>
            <Wind className="h-4 w-4 text-cyan-glow" />
          </div>
          <div className="space-y-4">
            {[
              { name: "Morning Run", days: 5, max: 7, color: "mint" },
              { name: "Meditation", days: 3, max: 7, color: "amber-glow" },
              { name: "Reading", days: 12, max: 14, color: "iris" },
              { name: "Cold Plunge", days: 2, max: 7, color: "cyan-glow" },
            ].map((h) => (
              <div key={h.name}>
                <div className="mb-1.5 flex items-center justify-between text-xs text-white">
                  <span>{h.name}</span>
                  <span className={`font-mono text-${h.color}`}>{h.days} days</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(h.days / h.max) * 100}%`,
                      background: `linear-gradient(90deg, transparent, var(--color-${h.color}))`,
                      boxShadow: `0 0 12px var(--color-${h.color})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        <span>Atlas OS · v1.0.0</span>
        <span>↳ All systems nominal</span>
      </footer>
    </>
  );
}
