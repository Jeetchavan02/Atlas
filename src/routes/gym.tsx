import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell, Plus, Flame, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/atlas-shell";

export const Route = createFileRoute("/gym")({
  head: () => ({
    meta: [
      { title: "Gym — Atlas OS" },
      { name: "description", content: "Atlas Gym: physical training log and metrics." },
    ],
  }),
  component: GymPage,
});

// Demo data
const TODAY_SESSION = {
  title: "Push Day — Hypertrophy",
  status: "pending", // pending, active, completed
  exercises: [
    { name: "Incline Bench Press", sets: "3 × 8-10", weight: "75kg" },
    { name: "Shoulder Press (DB)", sets: "3 × 10", weight: "24kg" },
    { name: "Lateral Raises", sets: "4 × 15", weight: "12kg" },
    { name: "Tricep Pushdown", sets: "3 × 12", weight: "27.5kg" },
  ],
};

const MUSCLE_SPLIT = [
  { group: "Chest",   recovery: 100, status: "Ready" },
  { group: "Back",    recovery: 45,  status: "Recovering" },
  { group: "Legs",    recovery: 80,  status: "Good" },
  { group: "Shoulders", recovery: 100, status: "Ready" },
];

function GymPage() {
  const [sessionStatus, setSessionStatus] = useState(TODAY_SESSION.status);

  return (
    <>
      <PageHeader
        eyebrow="Health · Gym"
        title="Physical training."
        subtitle="Workout tracking, muscular recovery, and programming."
        right={
          <button 
            disabled
            title="Coming in Phase 2"
            className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-4 py-2 text-[12.5px] font-medium text-white/40 cursor-not-allowed transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Log custom
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        
        {/* ── TODAY'S SESSION (Primary Focus) ────────────────── */}
        <div className="col-span-12 lg:col-span-8">
          <section className="glass-card p-6" style={sessionStatus === "active" ? { borderColor: "var(--iris)", boxShadow: "var(--shadow-glow-sm)" } : {}}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="atlas-label mb-1">Today's Program</p>
                <h2 className="text-[20px] font-semibold text-white">{TODAY_SESSION.title}</h2>
                <div className="mt-1 flex items-center gap-3 text-[11.5px] text-white/40">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~60 min</span>
                  <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> ~450 kcal</span>
                  <span className="font-mono bg-white/[0.04] px-1.5 py-0.5 rounded text-white/30">Demo Plan</span>
                </div>
              </div>
              
              {sessionStatus === "pending" && (
                <button
                  onClick={() => setSessionStatus("active")}
                  className="rounded-lg bg-white/[0.08] px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-white/[0.12]"
                >
                  Start Session
                </button>
              )}
              {sessionStatus === "active" && (
                <button
                  onClick={() => setSessionStatus("completed")}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-healthy)] px-4 py-2 text-[12.5px] font-medium text-black transition-colors hover:brightness-110"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </button>
              )}
              {sessionStatus === "completed" && (
                <span className="flex items-center gap-1.5 rounded-lg border border-[var(--color-healthy)]/30 bg-[var(--color-healthy)]/10 px-4 py-2 text-[12.5px] font-medium text-[var(--color-healthy)]">
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </span>
              )}
            </div>

            <div className="space-y-0 border-t border-white/[0.05]">
              {TODAY_SESSION.exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-white/20 w-4">{i + 1}.</span>
                    <span className="text-[13px] text-white/80">{ex.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[12px] font-mono text-white/40">
                    <span className="w-16 text-right">{ex.sets}</span>
                    <span className="w-12 text-right">{ex.weight}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {sessionStatus === "active" && (
              <div className="mt-4 flex items-center justify-between rounded-md bg-[color-mix(in_oklab,var(--iris)_10%,transparent)] px-4 py-3 border border-[color-mix(in_oklab,var(--iris)_20%,transparent)]">
                <div className="flex items-center gap-2">
                  <span className="live-indicator h-1.5 w-1.5" style={{ background: "var(--iris)" }} />
                  <span className="text-[12px] font-medium text-[var(--iris)]">Session active in background</span>
                </div>
                <span className="font-mono text-[11px] text-[var(--iris)]/60">00:14:22</span>
              </div>
            )}
          </section>
        </div>

        {/* ── SIDEBAR (Secondary info) ───────────────────────── */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          
          <section className="surface-subtle p-5">
            <p className="atlas-label mb-3">Muscle Recovery</p>
            <div className="space-y-3.5">
              {MUSCLE_SPLIT.map((m) => (
                <div key={m.group}>
                  <div className="flex justify-between text-[11.5px] mb-1">
                    <span className="text-white/70">{m.group}</span>
                    <span style={{ color: m.recovery > 80 ? "var(--color-healthy)" : "var(--color-attention)" }}>
                      {m.status}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${m.recovery}%`,
                        background: m.recovery > 80 ? "var(--color-healthy)" : "var(--color-attention)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-subtle p-5">
            <p className="atlas-label mb-3">Recent Logs</p>
            <div className="space-y-3">
              {[
                { d: "Yesterday", t: "Legs — Volume", info: "55 min" },
                { d: "Thu", t: "Pull — Strength", info: "65 min" },
                { d: "Wed", t: "Active Recovery", info: "30 min run" },
              ].map((log) => (
                <div key={log.d} className="flex justify-between items-center text-[12px]">
                  <div className="flex gap-2">
                    <span className="font-mono text-white/30 w-16">{log.d}</span>
                    <span className="text-white/70">{log.t}</span>
                  </div>
                  <span className="text-white/30 text-[11px]">{log.info}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full text-center text-[11px] text-white/30 hover:text-white/60 transition-colors">
              View all history
            </button>
          </section>

        </div>
      </div>
    </>
  );
}
