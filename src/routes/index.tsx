import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Mic, MicOff, Command, ArrowRight, X, ArrowUpRight, Maximize2, Minimize2
} from "lucide-react";
import { AtlasSphere } from "@/components/atlas/AtlasSphere";
import { useGlobalChat, type VoiceState } from "@/context/ChatContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas" },
      { name: "description", content: "Atlas — your personal AI operating layer." },
    ],
  }),
  component: AtlasHome,
});

/* ── Greeting ────────────────────────────────────────────────────── */
function getGreeting(h: number): string {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ── Top priority tasks (real data) ──────────────────────────────── */
interface TopTask {
  title: string;
  subtitle: string;
  priority: string;
}

function useTopTasks(): TopTask[] {
  const [tasks, setTasks] = useState<TopTask[]>([]);

  useEffect(() => {
    fetch("http://localhost:4000/api/tasks")
      .then((r) => r.json())
      .then((all: any[]) => {
        if (!Array.isArray(all)) return;
        const incomplete = all.filter((t: any) => t.status !== "completed" && t.status !== "done");
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        incomplete.sort((a: any, b: any) => {
          const pa = priorityOrder[a.priority?.toLowerCase()] ?? 2;
          const pb = priorityOrder[b.priority?.toLowerCase()] ?? 2;
          return pa - pb;
        });
        setTasks(
          incomplete.slice(0, 3).map((t: any) => {
            const parts: string[] = [];
            if (t.dueDate) {
              const due = new Date(t.dueDate);
              const today = new Date();
              const isToday = due.toDateString() === today.toDateString();
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              if (isToday) parts.push("Due today");
              else if (due.toDateString() === tomorrow.toDateString()) parts.push("Due tomorrow");
              else parts.push(`Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
            }
            return {
              title: t.title || t.name || "Untitled",
              subtitle: parts.join(" · "),
              priority: (t.priority || "medium").toLowerCase(),
            };
          })
        );
      })
      .catch(() => {});
  }, []);

  return tasks;
}

/* ══════════════════════════════════════════════════════════════════
   ATLAS HOME
   ══════════════════════════════════════════════════════════════════ */
function AtlasHome() {
  const {
    voiceState, sendMessage, startListening, stopListening,
    transcript, loading, stopTTS, messages
  } = useGlobalChat();

  const [time, setTime] = useState(new Date());
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"PRESENCE" | "CONVERSATION">("PRESENCE");
  
  const topTasks = useTopTasks();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Time update
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Sync live transcript into the command bar and trigger CONVERSATION mode
  useEffect(() => {
    if (voiceState === "LISTENING" && transcript) {
      setInput(transcript);
      if (interactionMode === "PRESENCE") {
        setInteractionMode("CONVERSATION");
      }
    }
  }, [transcript, voiceState, interactionMode]);

  // Clear input when loading starts
  useEffect(() => {
    if (loading) {
      setInput("");
    }
  }, [loading]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (interactionMode === "CONVERSATION") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, interactionMode, voiceState]);

  const greeting = getGreeting(time.getHours());
  const dateStr = time.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isListening = voiceState === "LISTENING";

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    
    // Switch mode immediately
    setInteractionMode("CONVERSATION");
    
    sendMessage(text);
    setInput("");
    if (isListening) stopListening();
  }, [input, loading, sendMessage, isListening, stopListening]);

  const toggleVoice = useCallback(() => {
    if (voiceState === "SPEAKING") {
      stopTTS();
    } else if (isListening) {
      stopListening();
    } else {
      setInteractionMode("CONVERSATION");
      startListening();
    }
  }, [voiceState, startListening, stopListening, stopTTS, isListening]);

  const toggleMode = useCallback(() => {
    setInteractionMode(prev => prev === "PRESENCE" ? "CONVERSATION" : "PRESENCE");
  }, []);

  // ── Layout Rendering ──────────────────────────────────────────────

  return (
    <div className={`atlas-home atlas-home--${interactionMode.toLowerCase()}`}>
      {/* ── Atmospheric background glow ─────────────────────── */}
      <div className="atlas-home__ambient" />

      {/* ── Topbar (Always visible, adapts to mode) ─────────── */}
      <div className="atlas-home__topbar">
        <div className="atlas-home__topbar-left">
          {interactionMode === "PRESENCE" && (
            <span className="atlas-home__topbar-date">{dateStr}</span>
          )}
          {interactionMode === "CONVERSATION" && (
            <button onClick={toggleMode} className="atlas-home__collapse-btn" aria-label="Return to Presence">
              <Minimize2 className="h-4 w-4" />
              <span>Presence</span>
            </button>
          )}
        </div>
        
        {interactionMode === "PRESENCE" && (
          <span className="atlas-home__topbar-time">{timeStr}</span>
        )}

        <div className="atlas-home__topbar-right">
          <button
            onClick={() => {
              setInteractionMode("CONVERSATION");
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            }}
            className="atlas-home__topbar-search"
          >
            <Command className="h-3 w-3" />
            <span>Ask Atlas…</span>
            <kbd>⌘K</kbd>
          </button>
        </div>
      </div>

      {/* ── Main Stage ──────────────────────────────────────── */}
      <div className="atlas-home__stage">
        
        {/* ── Sphere Container (Animates between center and top-right) ── */}
        <div className="atlas-home__sphere-area">
          <div className="atlas-home__sphere-wrap">
            <AtlasSphere />
            {interactionMode === "PRESENCE" && !isListening && (
              <span className="atlas-home__sphere-label">ATLAS</span>
            )}
          </div>
          
          {/* Greeting (Only in Presence) */}
          {interactionMode === "PRESENCE" && (
            <div className="atlas-home__greeting-wrap">
              <h1 className="atlas-home__greeting">{greeting}, Jeet.</h1>
              {isListening ? (
                <p className="atlas-home__subtitle atlas-home__subtitle--listening">I'm listening…</p>
              ) : voiceState === "THINKING" ? (
                <p className="atlas-home__subtitle">Thinking…</p>
              ) : voiceState === "SPEAKING" ? (
                <p className="atlas-home__subtitle">Speaking…</p>
              ) : (
                <p className="atlas-home__subtitle">Everything is in sync.</p>
              )}
            </div>
          )}
        </div>

        {/* ── Conversation View ───────────────────────────────── */}
        {interactionMode === "CONVERSATION" && (
          <div className="atlas-home__conversation">
            <div className="atlas-home__chat-scroll">
              <div className="atlas-home__chat-content">
                {messages.length === 1 && messages[0].role === "assistant" ? (
                  // Initial empty state greeting
                  <div className="atlas-home__chat-intro">
                    <p>{messages[0].content}</p>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    // Skip the default system greeting if there are other messages
                    if (i === 0 && m.role === "assistant" && messages.length > 1) return null;
                    return (
                      <div key={i} className={`atlas-home__chat-msg atlas-home__chat-msg--${m.role}`}>
                        {m.role === "assistant" && (
                          <div className="atlas-home__chat-msg-avatar">
                            <div className="atlas-home__chat-msg-orb" />
                          </div>
                        )}
                        <div className="atlas-home__chat-msg-bubble">
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                
                {loading && voiceState === "THINKING" && (
                  <div className="atlas-home__chat-msg atlas-home__chat-msg--assistant">
                    <div className="atlas-home__chat-msg-avatar">
                      <div className="atlas-home__chat-msg-orb atlas-home__chat-msg-orb--thinking" />
                    </div>
                    <div className="atlas-home__chat-msg-bubble atlas-home__chat-msg-bubble--loading">
                      Thinking...
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* ── What Matters (Only in Presence) ─────────────────── */}
        {interactionMode === "PRESENCE" && topTasks.length > 0 && (
          <div className="atlas-home__matters-area">
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-header">
                <span className="atlas-home__panel-title">
                  What matters now
                  <span className="atlas-home__panel-count">{topTasks.length}</span>
                </span>
                <Link to="/tasks" className="atlas-home__panel-link">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="atlas-home__panel-body">
                {topTasks.map((t, i) => (
                  <div key={i} className="atlas-home__matter-item">
                    <span className={`atlas-home__matter-dot atlas-home__matter-dot--${t.priority}`} />
                    <div className="atlas-home__matter-text">
                      <span className="atlas-home__matter-title">{t.title}</span>
                      {t.subtitle && <span className="atlas-home__matter-sub">{t.subtitle}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Command Bar (Always fixed at bottom) ────────────── */}
      <div className="atlas-home__bottom">
        <div className={`atlas-home__cmdbar ${focused ? "atlas-home__cmdbar--focused" : ""} ${isListening ? "atlas-home__cmdbar--listening" : ""}`}>
          <button onClick={toggleVoice} className="atlas-home__cmdbar-mic" aria-label="Voice">
            {isListening ? (
              <span className="atlas-home__live-dot" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={isListening ? "Listening..." : "Ask Atlas anything…"}
            className="atlas-home__cmdbar-input"
            disabled={loading || voiceState === "SPEAKING"}
          />
          
          {input.trim() || isListening ? (
            <button 
              onClick={isListening ? stopListening : handleSend} 
              className={`atlas-home__cmdbar-action ${isListening ? 'atlas-home__cmdbar-action--stop' : 'atlas-home__cmdbar-action--send'}`} 
              aria-label={isListening ? "Stop" : "Send"}
            >
              {isListening ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          ) : (
            <button onClick={() => setInteractionMode("CONVERSATION")} className="atlas-home__cmdbar-orb" aria-label="Voice">
              <div className="atlas-home__cmdbar-orb-inner" />
            </button>
          )}
        </div>
        
        {interactionMode === "PRESENCE" && (
          <div className="atlas-home__quick-actions">
            {[
              { label: "Plan my day", action: () => { setInput("Plan my day"); setInteractionMode("CONVERSATION"); } },
              { label: "Create a task", action: () => { setInput("Create a task"); setInteractionMode("CONVERSATION"); } },
              { label: "System health", action: () => { setInput("Check system health"); setInteractionMode("CONVERSATION"); } },
            ].map((qa) => (
              <button key={qa.label} onClick={qa.action} className="atlas-home__quick-btn">
                <Command className="h-3 w-3" />
                {qa.label}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
