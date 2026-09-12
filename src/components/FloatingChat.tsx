/**
 * FloatingChat — Ask Atlas quick-access panel
 *
 * This is one entrance to Atlas intelligence, not a separate product.
 * It shares context with the /ai page and Command Palette.
 * Hidden on /ai route (the full AI page takes precedence).
 *
 * Visual identity: matches the Atlas shell — no competing brand.
 */
import { useState, useRef, useEffect } from "react";
import {
  X, Send, Trash2, Cpu, ShieldAlert, Volume2, VolumeX, Mic, MicOff, Command,
} from "lucide-react";
import { useGlobalChat } from "@/context/ChatContext";
import { useRouterState } from "@tanstack/react-router";

export function FloatingChat() {
  const {
    messages, isOpen, activeModel, loading, error,
    sendMessage, toggleChat, clearChat,
    voiceOutputEnabled, toggleVoiceOutput,
    voiceState, stopTTS, startListening, stopListening, transcript
  } = useGlobalChat();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
    }
  };

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, loading]);

  // Don't render on the full AI page
  if (pathname === "/ai") return null;

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput("");
    if (voiceState === "LISTENING") { 
      stopListening(); 
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Expanded panel */}
      {isOpen && (
        <div
          className="glass-card mb-3 flex h-[460px] w-[340px] flex-col"
          style={{ boxShadow: "0 8px 40px -8px oklch(0 0 0 / 0.6), inset 0 1px 0 0 oklch(1 0 0 / 0.06)" }}
        >
          {/* Header */}
          <div className="flex flex-none items-center justify-between border-b border-white/[0.055] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-iris" style={{ boxShadow: "0 0 6px oklch(0.7 0.2 290 / 0.6)" }} />
                <span className="text-[12px] font-medium text-white/80">Ask Atlas</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleVoiceOutput}
                title={voiceOutputEnabled ? "Mute voice" : "Enable voice"}
                className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                  voiceOutputEnabled ? "text-mint" : "text-white/30 hover:text-white/55"
                }`}
              >
                {voiceOutputEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              </button>
              <button
                onClick={clearChat}
                title="Clear"
                className="flex h-6 w-6 items-center justify-center rounded text-white/30 transition-colors hover:text-white/55"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <button
                onClick={toggleChat}
                className="flex h-6 w-6 items-center justify-center rounded text-white/30 transition-colors hover:text-white/55"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-iris/15 text-iris">
                    <span className="text-[8px] font-bold">A</span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-iris/20 text-white ring-1 ring-iris/20"
                      : "bg-white/[0.04] text-white/80 ring-1 ring-white/[0.06]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {voiceState === "THINKING" && (
              <div className="flex gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-iris/15">
                  <span className="text-[8px] font-bold text-iris">A</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06]">
                  <span className="text-[11px] text-white/50 italic mr-2">Thinking...</span>
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="h-1 w-1 rounded-full bg-iris/40 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {voiceState === "ACTING" && (
              <div className="flex gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-iris/15">
                  <span className="text-[8px] font-bold text-iris">A</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06]">
                  <span className="text-[11px] text-mint italic mr-2">Executing action...</span>
                </div>
              </div>
            )}
            {voiceState === "SPEAKING" && (
              <div className="flex gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-iris/15">
                  <span className="text-[8px] font-bold text-iris">A</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06]">
                   <span className="text-[11px] text-iris italic flex gap-1 items-center">
                     <Volume2 className="h-3 w-3 animate-pulse" /> Speaking...
                     <button onClick={() => { stopTTS(); }} className="ml-2 text-white/40 hover:text-red-400">Stop</button>
                   </span>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/8 border border-red-500/15 px-3 py-2 text-[11px] text-red-400">
                <ShieldAlert className="h-3 w-3 shrink-0" />
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Model / footer */}
          <div className="flex-none border-t border-white/[0.055] px-4 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[9px]">
                <Cpu className="h-2.5 w-2.5 text-iris/60" />
                <span className="font-mono text-white/30 uppercase tracking-wider">{activeModel}</span>
              </div>
              <div className="flex items-center text-[9px]">
                 <span className="text-white/30 uppercase tracking-wider">STATE: {voiceState}</span>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="flex-none border-t border-white/[0.055] p-3">
            <div className="flex items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 transition-colors focus-within:border-iris/25">
              <button
                onClick={toggleListening}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all ${
                  voiceState === "LISTENING"
                    ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30 animate-pulse"
                    : "text-white/25 hover:text-white/50"
                }`}
                title="Voice input"
              >
                {voiceState === "LISTENING" ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={voiceState === "LISTENING" ? "Listening…" : "Message Atlas…"}
                className="flex-1 bg-transparent text-[12.5px] text-white placeholder:text-white/25 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex h-6 w-6 items-center justify-center rounded bg-iris/80 text-white transition-all hover:bg-iris disabled:opacity-30"
                aria-label="Send"
              >
                <Send className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger button — minimal, matches sidebar aesthetic */}
      <button
        onClick={toggleChat}
        aria-label={isOpen ? "Close Atlas" : "Ask Atlas"}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${
          isOpen
            ? "border-iris/30 bg-iris/15 text-iris"
            : "border-white/[0.08] bg-[oklch(0.16_0.025_270/0.85)] text-white/40 hover:border-white/[0.12] hover:text-white/65"
        }`}
        style={isOpen ? { boxShadow: "0 0 16px -4px oklch(0.7 0.2 290 / 0.4)" } : {}}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Command className="h-4 w-4" />}
      </button>
    </div>
  );
}
