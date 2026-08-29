import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Dumbbell, TrendingUp, Plus, Flame, X } from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/gym")({
  head: () => ({
    meta: [
      { title: "Gym — Atlas" },
      {
        name: "description",
        content:
          "Atlas Gym: training volume, progressive overload, PRs, and recovery in one calm view.",
      },
      { property: "og:title", content: "Gym — Atlas" },
      { property: "og:description", content: "Training tracked beautifully." },
    ],
  }),
  component: GymPage,
});

const splitColors = [
  "oklch(0.7 0.2 290)",
  "oklch(0.82 0.15 200)",
  "oklch(0.78 0.16 165)",
  "oklch(0.82 0.16 75)",
];

const todayPlan = [
  { name: "Bench Press", sets: "4 × 8", weight: "85kg", pr: true },
  { name: "Overhead Press", sets: "4 × 6", weight: "55kg", pr: false },
  { name: "Incline Dumbbell", sets: "3 × 10", weight: "30kg", pr: false },
  { name: "Cable Fly", sets: "3 × 12", weight: "20kg", pr: false },
  { name: "Tricep Pushdown", sets: "4 × 12", weight: "32kg", pr: true },
];

function GymPage() {
  const [volume, setVolume] = useState([
    { day: "Mon", v: 0 },
    { day: "Tue", v: 0 },
    { day: "Wed", v: 0 },
    { day: "Thu", v: 0 },
    { day: "Fri", v: 0 },
    { day: "Sat", v: 0 },
    { day: "Sun", v: 0 },
  ]);
  const [split, setSplit] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [totalKg, setTotalKg] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [prs, setPrs] = useState(0);
  const [prNames, setPrNames] = useState("");
  const [avgStrain, setAvgStrain] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sessionName, setSessionName] = useState("Push Day");
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionStrain, setSessionStrain] = useState(14.2);
  const [exercises, setExercises] = useState([
    { name: "Bench Press", sets: 4, reps: 8, weight: 85, pr: false },
  ]);

  const handleAddExercise = () => {
    setExercises([...exercises, { name: "", sets: 3, reps: 10, weight: 20, pr: false }]);
  };

  const handleUpdateExercise = (index: number, field: string, value: any) => {
    const newEx = [...exercises];
    newEx[index] = { ...newEx[index], [field]: value };
    setExercises(newEx);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim() || exercises.length === 0) return;

    try {
      const res = await fetch("http://localhost:4000/api/gym/log-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sessionName,
          duration: sessionDuration,
          strain: sessionStrain,
          exercises: exercises,
        }),
      });

      if (res.ok) {
        setIsSheetOpen(false);
        setSessionName("Push Day");
        setExercises([{ name: "Bench Press", sets: 4, reps: 8, weight: 85, pr: false }]);
        // Refresh data ideally, but we'll just log for now
        window.location.reload(); // Simple refresh to show updated graphs
      }
    } catch (err) {
      console.error("Failed to log session", err);
    }
  };

  useEffect(() => {
    fetch("http://localhost:4000/api/gym/weekly-volume")
      .then((r) => r.json())
      .then((data) => {
        setVolume(data.weeklyVolume);
        setTotalKg(data.totalKg);
      })
      .catch(() => {});

    fetch("http://localhost:4000/api/gym/stats")
      .then((r) => r.json())
      .then((data) => {
        const colored = data.split.map((s: { name: string; value: number }, i: number) => ({
          ...s,
          fill: splitColors[i % splitColors.length],
        }));
        setSplit(colored);
        setSessions(data.stats.sessionsThisWeek);
        setPrs(data.stats.prs);
        setPrNames(data.stats.prNames.slice(0, 2).join(" · "));
        setAvgStrain(data.stats.avgStrain);
        setSessionsCount(data.stats.sessionsThisWeek);
      })
      .catch(() => {});
  }, []);
  return (
    <>
      <PageHeader
        eyebrow="Push day · 60 min"
        title="Gym"
        subtitle="Progressive overload, one rep at a time."
        right={
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 rounded-2xl bg-[var(--gradient-iris)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] ring-1 ring-white/20">
                <Plus className="h-4 w-4" /> Log set
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px] overflow-y-auto sm:w-[600px] sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>Log Gym Session</SheetTitle>
                <SheetDescription>Record your sets, reps, and PRs.</SheetDescription>
              </SheetHeader>
              <form onSubmit={handleLogSession} className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionName">Session Name</Label>
                    <Input
                      id="sessionName"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Exercises</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddExercise}>
                      <Plus className="mr-2 h-3 w-3" /> Add Exercise
                    </Button>
                  </div>

                  {exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(i)}
                        className="absolute right-2 top-2 text-white/40 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Exercise Name</Label>
                          <Input
                            value={ex.name}
                            onChange={(e) => handleUpdateExercise(i, "name", e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              value={ex.sets}
                              onChange={(e) =>
                                handleUpdateExercise(i, "sets", Number(e.target.value))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              value={ex.reps}
                              onChange={(e) =>
                                handleUpdateExercise(i, "reps", Number(e.target.value))
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Weight (kg)</Label>
                            <Input
                              type="number"
                              value={ex.weight}
                              onChange={(e) =>
                                handleUpdateExercise(i, "weight", Number(e.target.value))
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <Checkbox
                            id={`pr-${i}`}
                            checked={ex.pr}
                            onCheckedChange={(c) => handleUpdateExercise(i, "pr", !!c)}
                          />
                          <Label
                            htmlFor={`pr-${i}`}
                            className="text-xs font-medium text-amber-glow"
                          >
                            Personal Record Target
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <SheetFooter className="pt-4 pb-10">
                  <Button type="submit" className="w-full">
                    Log Session
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {[
          {
            label: "Weekly volume",
            value: totalKg >= 1000 ? `${(totalKg / 1000).toFixed(1)}k` : `${totalKg}`,
            hint: "kg lifted",
            color: "iris",
          },
          { label: "Sessions", value: `${sessions} / 6`, hint: "this week", color: "mint" },
          { label: "PRs", value: `${prs}`, hint: prNames || "this week", color: "amber-glow" },
          { label: "Strain", value: avgStrain.toFixed(1), hint: "Whoop", color: "cyan-glow" },
        ].map((s) => (
          <section key={s.label} className="glass-card col-span-6 p-5 md:col-span-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
              {s.label}
            </div>
            <div className={`mt-2 font-display text-3xl font-light text-${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-white/60">{s.hint}</div>
          </section>
        ))}

        <section className="glass-card col-span-12 p-7 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-white">Weekly volume</h2>
              <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                Total kg moved
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-mint" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume}>
                <defs>
                  <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 290)" stopOpacity={1} />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "oklch(1 0 0 / 0.5)", fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                  contentStyle={{
                    background: "oklch(0.18 0.03 270 / 0.9)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="v" fill="url(#vg)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card col-span-12 p-7 lg:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Muscle split</h2>
            <Flame className="h-4 w-4 text-amber-glow" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
            Last 4 weeks
          </p>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={split}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={92}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {split.map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-3xl text-white">{sessionsCount}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                sessions
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {split.map((s) => (
              <div key={s.name}>
                <div className="mx-auto h-1 w-6 rounded-full" style={{ background: s.fill }} />
                <div className="mt-1.5 text-[10px] text-white/60">{s.name}</div>
                <div className="font-mono text-xs text-white">{s.value}%</div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card col-span-12 p-7">
          <div className="mb-4 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-iris" />
            <h2 className="text-base font-medium text-white">Today's session — Push</h2>
            <span className="ml-auto font-mono text-[11px] text-white/50">
              60 min · 5 exercises
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {todayPlan.map((e) => (
              <li key={e.name} className="flex items-center gap-4 py-3 text-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/70 ring-1 ring-white/10">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-white">
                    {e.name}
                    {e.pr && (
                      <span className="rounded-full bg-amber-glow/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-glow ring-1 ring-amber-glow/30">
                        PR target
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/50">{e.sets}</div>
                </div>
                <div className="font-mono text-sm text-white">{e.weight}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
