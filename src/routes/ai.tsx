/**
 * Atlas AI — Full intelligence panel
 *
 * This is the dedicated Atlas intelligence interface.
 * It is not a chatbot. It is the reasoning layer of Atlas OS.
 *
 * Three states:
 *   READY       — Atlas is waiting, suggested commands shown
 *   WORKING     — Atlas is processing (thinking indicator)
 *   RESPONDING  — Messages appearing
 *
 * All voice/TTS/STT logic is preserved from Phase 1.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Brain, Cpu, Send, Mic, MicOff, Trash2, Volume2, VolumeX, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useGlobalChat } from "@/context/ChatContext";
import { AudioReactingHUD } from "@/components/AudioReactingHUD";

interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string }; length: number }; length: number };
}
interface SpeechRecognition {
  continuous: boolean; interimResults: boolean;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: (e: Event & { error?: string }) => void;
  onend: () => void;
  start: () => void; stop: () => void;
}

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Atlas AI — Personal OS Intelligence" },
      { name: "description", content: "Atlas AI: the intelligence layer of Atlas OS." },
    ],
  }),
  component: AIPage,
});

// Commands displayed in the READY state
// These feel like directives to a personal OS, not chatbot suggestions
const COMMANDS = [
  { label: "Plan my day",                    prompt: "Plan my day based on my current tasks, habits and health." },
  { label: "What's important right now?",    prompt: "What's the most important thing I should focus on right now?" },
  { label: "Why is my recovery low?",        prompt: "Explain my current recovery status and what's affecting it." },
  { label: "What changed today?",            prompt: "What has changed today across my health, tasks, and habits?" },
  { label: "Prepare tomorrow",               prompt: "Help me prepare for tomorrow based on my schedule and current state." },
  { label: "Summarize my week",              prompt: "Give me a performance summary of this week." },
];

function AIPage() {
  const {
    messages, loading, sendMessage, activeModel, clearChat,
    voiceOutputEnabled, toggleVoiceOutput, availableModels, setActiveModel,
    voiceState, startListening, stopListening, transcript
  } = useGlobalChat();

  const [input, setInput]                   = useState("");
  const [hudVisible, setHudVisible]         = useState(false);
  const [modelMenuOpen, setModelMenuOpen]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (voiceState === "SPEAKING") setHudVisible(true); }, [voiceState]);

  // Update input with live transcript if listening, or clear it if a request is loading
  useEffect(() => {
    if (loading) {
      setInput("");
    } else if (voiceState === "LISTENING") {
      setInput(transcript);
    }
  }, [transcript, voiceState, loading]);

  const toggleListening = () => {
    if (voiceState === "LISTENING") {
      stopListening();
    } else {
      startListening();
      setHudVisible(true);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput("");
    if (voiceState === "LISTENING") { stopListening(); }
  };

  const hasMessages = messages.some((m) => m.role === "user");

  return (
    <div className="flex h-[calc(100vh-96px)] flex-col rounded-xl border border-white/[0.065] bg-[oklch(0.12_0.02_270/0.8)] backdrop-blur-2xl overflow-hidden">

      {/* ── Header bar ─────────────────────────────────────── */}
      <div className="flex flex-none items-center justify-between border-b border-white/[0.055] px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Status dot — real state */}
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: loading ? "var(--color-live)" : "var(--iris)",
                boxShadow: loading
                  ? "0 0 6px var(--color-live)"
                  : "0 0 6px oklch(0.7 0.2 290 / 0.5)",
              }}
            />
            <span className="text-[12.5px] font-medium text-white/70">Atlas AI</span>
          </div>
          <div className="atlas-label flex items-center gap-1.5">
            <Cpu className="h-2.5 w-2.5 text-iris/60" />
            {loading ? (
              <span style={{ color: "var(--color-live)" }}>Thinking…</span>
            ) : (
              <span>{activeModel}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setModelMenuOpen((v) => !v)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono text-white/25 transition-colors hover:bg-white/[0.04] hover:text-white/50"
              aria-haspopup="listbox"
            >
              {activeModel}
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
            {modelMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-white/[0.08] bg-[oklch(0.15_0.025_270/0.97)] py-1 shadow-xl backdrop-blur-2xl">
                {availableModels.map((m) => (
                  <button
                    key={m}
                    role="option"
                    onClick={() => { setActiveModel(m); setModelMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors ${
                      m === activeModel ? "text-iris" : "text-white/50 hover:bg-white/[0.04] hover:text-white/75"
                    }`}
                  >
                    {m === activeModel && <Check className="h-3 w-3" />}
                    <span className={m === activeModel ? "" : "ml-5"}>{m}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleVoiceOutput}
            className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
              voiceOutputEnabled ? "text-mint" : "text-white/25 hover:text-white/55"
            }`}
            title={voiceOutputEnabled ? "Mute voice" : "Enable voice"}
          >
            {voiceOutputEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={clearChat}
            className="flex h-7 w-7 items-center justify-center rounded text-white/25 transition-colors hover:text-white/55"
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Messages / READY state ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        {!hasMessages ? (
          /* READY — Atlas is waiting. Show command suggestions. */
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-iris/10 ring-1 ring-iris/20">
              <Brain className="h-5 w-5 text-iris" />
            </div>
            <p className="mb-1.5 text-[15px] font-medium text-white/70">Atlas is ready.</p>
            <p className="mb-8 text-[12px] text-white/30">Connected to your context. Ask anything.</p>

            <div className="w-full max-w-md space-y-1.5">
              {COMMANDS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => sendMessage(c.prompt)}
                  className="group flex w-full items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-[12.5px] text-white/45 transition-all hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white/70"
                >
                  <span className="flex-1">{c.label}</span>
                  <Send className="h-2.5 w-2.5 text-white/15 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* CONVERSATION — messages with clear roles */
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                    m.role === "user"
                      ? "bg-white/[0.07] text-white/60"
                      : "bg-iris/12 text-iris ring-1 ring-iris/15"
                  }`}
                >
                  {m.role === "user" ? "J" : "A"}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-white/[0.07] text-white"
                      : "border border-white/[0.055] bg-black/25 text-white/80"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  <div className={`mt-1.5 font-mono text-[9px] ${m.role === "user" ? "text-right text-white/20" : "text-white/20"}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {/* WORKING indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-iris/12 ring-1 ring-iris/15">
                  <span className="text-[10px] font-bold text-iris">A</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.055] bg-black/25 px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="h-1 w-1 animate-bounce rounded-full bg-iris/40"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] text-white/25">
                    {loading ? "Thinking…" : ""}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ─────────────────────────────────────────── */}
      <div className="flex-none border-t border-white/[0.055] p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-iris/25">
          <button
            onClick={toggleListening}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded transition-all ${
              voiceState === "LISTENING"
                ? "bg-red-500/12 text-red-400 ring-1 ring-red-500/25"
                : "text-white/25 hover:text-white/55"
            }`}
            title="Voice input"
          >
            {voiceState === "LISTENING" ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={voiceState === "LISTENING" ? "Listening…" : "Message Atlas…"}
            className="max-h-36 min-h-[32px] flex-1 resize-none bg-transparent py-1 text-[13px] text-white placeholder:text-white/25 focus:outline-none"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
              input.trim() && !loading
                ? "bg-iris text-white"
                : "bg-white/[0.05] text-white/20"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[9px] text-white/18">
          Enter to send · Shift+Enter for new line · Voice input with mic
        </p>
      </div>

      {/* Voice HUD — only when actively listening/speaking */}
      {hudVisible && (
        <AudioReactingHUD
          isListening={voiceState === "LISTENING"}
          isSpeaking={voiceState === "SPEAKING"}
          onToggleListening={toggleListening}
          onClose={() => setHudVisible(false)}
        />
      )}
    </div>
  );
}
