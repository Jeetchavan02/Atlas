import { createFileRoute } from "@tanstack/react-router";
import { Wind, Plus, Target, CheckCircle2, Flame } from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "Habits — Atlas OS" },
      { name: "description", content: "Atlas Habits: pattern tracking and consistency." },
    ],
  }),
  component: HabitsPage,
});

// Demo heatmap data (30 days)
const HEATMAP_DAYS = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
  intensity: Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 1 : 0,
}));

// Demo habits
const HABITS = [
  { name: "Morning Sunlight", category: "Health", streak: 12, done: true },
  { name: "Read 20 pages", category: "Mind", streak: 4, done: false },
  { name: "No sugar", category: "Health", streak: 1, done: true },
  { name: "Evening review", category: "System", streak: 0, done: false },
];

function HabitsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Life · Habits"
        title="Behavioral patterns."
        subtitle="Track consistency and build routines."
        right={
          <button 
            disabled
            title="Coming in Phase 2"
            className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-4 py-2 text-[12.5px] font-medium text-white/40 cursor-not-allowed transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> New habit
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        
        {/* ── TODAY'S HABITS ──────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-8">
          <section className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-medium text-white">Daily Checklist</p>
              <span className="atlas-label">
                {HABITS.filter(h => h.done).length}/{HABITS.length} completed
              </span>
            </div>

            <div className="space-y-0">
              {HABITS.map((h, i) => (
                <div key={i} className="surface-row flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <button
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] transition-all ${
                        h.done ? "bg-[var(--color-healthy)] text-black border-none" : "border border-white/20 bg-transparent"
                      }`}
                    >
                      {h.done && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                    <div>
                      <p className={`text-[13px] ${h.done ? "text-white/40 line-through" : "text-white/90"}`}>
                        {h.name}
                      </p>
                      <p className="text-[10px] text-white/30">{h.category}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Flame className={`h-3 w-3 ${h.streak >= 3 ? "text-amber-glow" : "text-white/20"}`} />
                    <span className="font-mono text-[11px] text-white/40">{h.streak}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          
          <section className="surface-subtle p-5">
            <p className="atlas-label mb-3">30-Day Activity</p>
            <div className="flex flex-wrap gap-1">
              {HEATMAP_DAYS.map((d, i) => (
                <div
                  key={i}
                  className="h-[14px] w-[14px] rounded-sm transition-colors"
                  style={{
                    backgroundColor: 
                      d.intensity === 0 ? "rgba(255,255,255,0.03)" :
                      d.intensity === 1 ? "oklch(0.7 0.2 290 / 0.3)" :
                      d.intensity === 2 ? "oklch(0.7 0.2 290 / 0.6)" :
                      "oklch(0.7 0.2 290 / 0.9)",
                  }}
                  title={new Date(d.date).toLocaleDateString()}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-between font-mono text-[9px] text-white/20 uppercase">
              <span>Less</span>
              <span>More</span>
            </div>
          </section>

          <section className="surface-subtle p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-3.5 w-3.5 text-white/30" />
              <p className="atlas-label">Atlas Insights</p>
            </div>
            <p className="text-[12px] leading-relaxed text-white/50">
              Pattern analysis requires more data. Atlas will begin suggesting habit optimizations once a baseline is established.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
