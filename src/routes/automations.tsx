import { createFileRoute } from "@tanstack/react-router";
import { Zap, GitBranch, Clock, Bell, Trash2, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/atlas-shell";

export const Route = createFileRoute("/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Atlas OS" },
      { name: "description", content: "Atlas Automations: event-driven actions for your daily life." },
    ],
  }),
  component: AutomationsPage,
});

interface AutomationItem {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerEvent: string;
  condition?: any;
  action: {
    name: string;
    params?: any;
  };
}

function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAutomations = () => {
    fetch("http://localhost:4000/api/automations")
      .then(res => res.json())
      .then(data => {
        setAutomations(data.automations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load automations", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const deleteAutomation = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/automations/${id}`, { method: "DELETE" });
      setAutomations(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error("Failed to delete automation", err);
    }
  };

  const toggleAutomation = async (id: string, current: boolean) => {
    try {
      await fetch(`http://localhost:4000/api/automations/${id}/toggle`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current })
      });
      loadAutomations();
    } catch (err) {
      console.error("Failed to toggle automation", err);
    }
  };

  const addExample = async () => {
    try {
      await fetch("http://localhost:4000/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Task Complete Notification",
          description: "Notifies when a high priority task is done.",
          triggerEvent: "TASK_COMPLETED",
          isActive: true,
          condition: {
            field: "priority",
            operator: "==",
            value: "HIGH"
          },
          action: {
            name: "remember_fact",
            params: { type: "FACT", content: "Completed a high priority task recently.", tags: ["productivity"] }
          }
        })
      });
      loadAutomations();
    } catch (err) {
      console.error("Failed to add example", err);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="System · Automations"
        title="Event-driven rules."
        subtitle="Atlas OS responds to state changes across your environment."
        right={
          <button 
            onClick={addExample}
            className="flex items-center gap-2 rounded-lg bg-[var(--gradient-iris)] px-4 py-2 text-[12.5px] font-medium text-white shadow-[var(--shadow-glow-sm)] transition-all hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Add Example
          </button>
        }
      />

      <div className="mx-auto max-w-4xl space-y-8">
        {/* ── System Status ───────────────────────────────────── */}
        <section className="glass-card p-6 border-l-2 border-l-[var(--iris)]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08]">
              <Zap className="h-5 w-5 text-iris" />
            </div>
            <div>
              <h2 className="text-[15px] font-medium text-white/90">Automations engine active</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                Automations allow Atlas to execute actions across your schedule, devices, and tasks automatically. 
                Instead of manually managing your digital life, you define the rules (EVENT → CONDITION → ACTION), 
                and the OS handles the execution via the EventBus.
              </p>
              <div className="mt-4 flex gap-3">
                <span className="glass-pill px-3 py-1 text-[11px] text-white/40">Status: {loading ? "Syncing..." : "Online"}</span>
                <span className="glass-pill px-3 py-1 text-[11px] text-white/40">Total Rules: {automations.length}</span>
                <span className="glass-pill px-3 py-1 text-[11px] text-white/40">Active: {automations.filter(a => a.isActive).length}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Active Rules ───────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <p className="atlas-label">Automation Rules</p>
            <div className="atlas-divider flex-1" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {automations.map((auto) => (
              <div key={auto._id} className={`surface-subtle p-5 ${!auto.isActive ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/[0.04]">
                      <GitBranch className="h-4 w-4 text-white/30" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-medium text-white/90">{auto.name}</h3>
                      {auto.description && <p className="text-[11px] text-white/40 mb-2">{auto.description}</p>}
                      
                      <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-1 mt-3">
                        On Event
                      </p>
                      <p className="text-[12.5px] font-medium text-white/80 mb-2">{auto.triggerEvent}</p>
                      
                      {auto.condition && (
                        <>
                          <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-1">
                            If Condition
                          </p>
                          <p className="text-[12px] text-white/60 mb-2 font-mono bg-white/[0.02] p-1.5 rounded">
                            {auto.condition.field} {auto.condition.operator} {String(auto.condition.value)}
                          </p>
                        </>
                      )}

                      <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-1">
                        Execute Action
                      </p>
                      <p className="text-[12.5px] text-white/60">{auto.action.name}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
                  <button
                    onClick={() => toggleAutomation(auto._id, auto.isActive)}
                    className={`font-mono text-[9px] uppercase tracking-widest ${auto.isActive ? "text-mint" : "text-white/20"} hover:text-white/50 transition-colors`}
                  >
                    {auto.isActive ? "● Active" : "○ Paused"}
                  </button>
                  <button 
                    onClick={() => deleteAutomation(auto._id)}
                    className="p-1 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {automations.length === 0 && !loading && (
              <div className="col-span-1 lg:col-span-2 text-center py-12 border border-white/[0.05] border-dashed rounded-xl">
                <p className="text-[13px] text-white/40">No automations configured.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
