import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Bookmark, Target, History, Network, FileText, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/atlas-shell";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory — Atlas OS" },
      { name: "description", content: "Atlas Memory: persistent preferences, goals, and learned context." },
    ],
  }),
  component: MemoryPage,
});

interface MemoryItem {
  _id: string;
  type: string;
  content: string;
  tags: string[];
  confidence: number;
}

function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/api/memory")
      .then(res => res.json())
      .then(data => {
        setMemories(data.memories || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load memories", err);
        setLoading(false);
      });
  }, []);

  const deleteMemory = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/memory/${id}`, { method: "DELETE" });
      setMemories(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error("Failed to delete memory", err);
    }
  };

  const getCount = (type: string) => memories.filter(m => m.type === type).length;

  return (
    <>
      <PageHeader
        eyebrow="System · Memory"
        title="Atlas Memory"
        subtitle="Persistent context layer. What the OS knows about you."
      />

      <div className="mx-auto max-w-4xl space-y-8">
        {/* ── System Status ───────────────────────────────────── */}
        <section className="glass-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08]">
              <Cpu className="h-5 w-5 text-iris" />
            </div>
            <div>
              <h2 className="text-[15px] font-medium text-white/90">Memory subsystem active</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                Atlas Memory allows the operating system to retain context across sessions.
                It continuously extracts and organizes preferences, goals, and facts from your interactions,
                ensuring Atlas acts as a persistent personal intelligence rather than a stateless chatbot.
              </p>
              <div className="mt-4 flex gap-3">
                <span className="glass-pill px-3 py-1 text-[11px] text-white/40">Status: {loading ? "Syncing..." : "Online"}</span>
                <span className="glass-pill px-3 py-1 text-[11px] text-white/40">Storage: MongoDB</span>
                <span className="glass-pill px-3 py-1 text-[11px] text-white/40">Total facts: {memories.length}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Memory Categories ───────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <p className="atlas-label">Memory Categories</p>
            <div className="atlas-divider flex-1" />
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                type: "PREFERENCE",
                label: "Preferences",
                desc: "Workout splits, sleep targets, dietary protocols.",
                icon: Bookmark,
              },
              {
                type: "GOAL",
                label: "Goals",
                desc: "Short and long-term objectives you've shared.",
                icon: Target,
              },
              {
                type: "FACT",
                label: "Facts",
                desc: "Static information about your environment or constraints.",
                icon: FileText,
              },
              {
                type: "PATTERN",
                label: "Patterns",
                desc: "Learned behavioral rhythms and habit tendencies.",
                icon: History,
              },
              {
                type: "DECISION",
                label: "Decisions",
                desc: "Past choices Atlas should reference in the future.",
                icon: Network,
              },
            ].map((cat) => (
              <div key={cat.label} className="surface-subtle p-5">
                <cat.icon className="mb-3 h-4 w-4 text-white/30" />
                <h3 className="mb-1 text-[13px] font-medium text-white/80">{cat.label}</h3>
                <p className="text-[11px] text-white/40 leading-relaxed">{cat.desc}</p>
                <div className="mt-4 border-t border-white/[0.04] pt-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white/20">
                    {getCount(cat.type)} entries
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Extracted Memories ───────────────────────────────── */}
        {memories.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-3">
              <p className="atlas-label">Extracted Memory Graph</p>
              <div className="atlas-divider flex-1" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {memories.map(m => (
                <div key={m._id} className="surface-row flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="glass-pill px-2 py-0.5 text-[9px] font-mono text-iris">{m.type}</span>
                      <span className="font-mono text-[9px] text-white/30">CONF: {m.confidence}%</span>
                    </div>
                    <p className="text-[12.5px] text-white/80">{m.content}</p>
                    {m.tags && m.tags.length > 0 && (
                      <p className="mt-2 flex gap-2">
                        {m.tags.map(t => <span key={t} className="text-[10px] text-white/30">#{t}</span>)}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => deleteMemory(m._id)}
                    className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
