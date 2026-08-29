import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wind, Flame, Plus, Check } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "Habits — Atlas" },
      {
        name: "description",
        content: "Atlas Habits: build consistency with calm streaks and weekly heatmaps.",
      },
      { property: "og:title", content: "Habits — Atlas" },
      { property: "og:description", content: "Streaks, consistency, momentum." },
    ],
  }),
  component: HabitsPage,
});

const initialHabits = [
  { _id: "1", name: "Morning Run", icon: "🏃", streak: 5, color: "mint", today: true },
  { _id: "2", name: "Meditation", icon: "🧘", streak: 3, color: "amber-glow", today: false },
  { _id: "3", name: "Reading", icon: "📖", streak: 12, color: "iris", today: true },
  { _id: "4", name: "Cold Plunge", icon: "❄️", streak: 2, color: "cyan-glow", today: false },
  { _id: "5", name: "Journal", icon: "✍️", streak: 7, color: "iris", today: true },
  { _id: "6", name: "No Sugar", icon: "🍯", streak: 18, color: "mint", today: true },
];

const trend = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1,
  v: 50 + Math.round(Math.sin(i / 3) * 20) + (i > 18 ? 15 : 0),
}));

const categoryMeta: Record<string, { icon: string; color: string }> = {
  Wellness: { icon: "🧘", color: "mint" },
  Fitness: { icon: "🏃", color: "cyan-glow" },
  Productivity: { icon: "⚡", color: "amber-glow" },
  Learning: { icon: "📖", color: "iris" },
  Diet: { icon: "🍯", color: "mint" },
  Other: { icon: "✨", color: "iris" },
};

function HabitsPage() {
  const [habits, setHabits] = useState(initialHabits);
  const [done, setDone] = useState<Record<string, boolean>>(
    Object.fromEntries(initialHabits.map((h) => [h._id, h.today])),
  );

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("Wellness");

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      const res = await fetch("http://localhost:4000/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHabitName, category: newHabitCategory }),
      });
      if (res.ok) {
        const data = await res.json();
        const meta = categoryMeta[newHabitCategory] || categoryMeta["Other"];
        const mappedHabit = {
          _id: data.habit._id,
          name: data.habit.name,
          icon: meta.icon,
          streak: 0,
          color: meta.color,
          today: false,
        };
        setHabits((prev) => [...prev, mappedHabit]);
        setDone((prev) => ({ ...prev, [mappedHabit._id]: false }));
        setNewHabitName("");
        setIsSheetOpen(false);
      }
    } catch (err) {
      console.error("Failed to create habit", err);
    }
  };

  const toggleHabit = (id: string) => {
    setDone((d) => ({ ...d, [id]: !d[id] }));
    // Ideally, we would also call POST /api/habits/toggle here
  };

  return (
    <>
      <PageHeader
        eyebrow="6 active habits"
        title="Habits"
        subtitle="Compounding rituals. Small inputs, large lives."
        right={
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 rounded-2xl bg-[var(--gradient-iris)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] ring-1 ring-white/20">
                <Plus className="h-4 w-4" /> New habit
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>New Habit</SheetTitle>
                <SheetDescription>
                  Start tracking a new habit to build consistency.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleCreateHabit} className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Habit Name</Label>
                  <Input
                    id="name"
                    placeholder="E.g. 10 mins meditation"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newHabitCategory} onValueChange={setNewHabitCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Wellness">Wellness</SelectItem>
                      <SelectItem value="Fitness">Fitness</SelectItem>
                      <SelectItem value="Productivity">Productivity</SelectItem>
                      <SelectItem value="Learning">Learning</SelectItem>
                      <SelectItem value="Diet">Diet</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <SheetFooter className="pt-4">
                  <Button type="submit">Create Habit</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <section className="glass-card col-span-12 p-7 lg:col-span-8">
          <div className="mb-4 flex items-center gap-2">
            <Wind className="h-4 w-4 text-cyan-glow" />
            <h2 className="text-base font-medium text-white">Today's check-in</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {habits.map((h) => (
              <button
                key={h._id}
                onClick={() => toggleHabit(h._id)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  done[h._id]
                    ? `border-${h.color}/40 bg-${h.color}/10`
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-2xl">{h.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{h.name}</div>
                  <div className={`text-[11px] font-mono text-${h.color}`}>
                    {h.streak} day streak
                  </div>
                </div>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    done[h._id] ? `bg-${h.color} text-black` : "bg-white/5 text-white/30"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card col-span-12 p-7 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">Consistency</h2>
            <Flame className="h-4 w-4 text-amber-glow" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
            Last 30 days
          </p>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 290)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide />
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
                  dataKey="v"
                  stroke="oklch(0.82 0.15 200)"
                  strokeWidth={2}
                  fill="url(#hg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 text-center">
            <div>
              <div className="font-display text-2xl text-mint">82%</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                avg
              </div>
            </div>
            <div>
              <div className="font-display text-2xl text-iris">18</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                best
              </div>
            </div>
            <div>
              <div className="font-display text-2xl text-amber-glow">+12%</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                wow
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card col-span-12 p-7">
          <h2 className="mb-4 text-base font-medium text-white">7-day heatmap</h2>
          <div className="space-y-2">
            {habits.map((h) => (
              <div key={h._id} className="flex items-center gap-3">
                <span className="w-32 truncate text-sm text-white">
                  {h.icon} {h.name}
                </span>
                <div
                  className="grid flex-1 grid-cols-28 gap-1"
                  style={{ gridTemplateColumns: "repeat(28, 1fr)" }}
                >
                  {Array.from({ length: 28 }).map((_, i) => {
                    const intensity = Math.random();
                    return (
                      <div
                        key={i}
                        className="h-5 rounded-sm"
                        style={{
                          background:
                            intensity > 0.7
                              ? `var(--color-${h.color})`
                              : intensity > 0.4
                                ? `color-mix(in oklab, var(--color-${h.color}) 50%, transparent)`
                                : "oklch(1 0 0 / 0.05)",
                          boxShadow:
                            intensity > 0.7 ? `0 0 8px var(--color-${h.color})` : undefined,
                        }}
                      />
                    );
                  })}
                </div>
                <span className={`w-12 text-right font-mono text-xs text-${h.color}`}>
                  {h.streak}d
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
