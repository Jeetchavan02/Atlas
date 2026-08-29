import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  Sparkles,
  Cpu,
  ShieldAlert,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
} from "lucide-react";
import { useGlobalChat } from "@/context/ChatContext";
import { useRouterState } from "@tanstack/react-router";

interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string } }; length: number };
}
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event & { error?: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function FloatingChat() {
  const {
    messages,
    isOpen,
    activeModel,
    loading,
    error,
    availableModels,
    sendMessage,
    toggleChat,
    clearChat,
    setActiveModel,
    voiceOutputEnabled,
    toggleVoiceOutput,
  } = useGlobalChat();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const latestTranscriptRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sendMessageRef = useRef(sendMessage);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionConstructor =
        (window as unknown as { SpeechRecognition: any }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition: any }).webkitSpeechRecognition;
      if (SpeechRecognitionConstructor) {
        recognitionRef.current = new SpeechRecognitionConstructor();
        if (recognitionRef.current) {
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;

          recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            setInput(transcript);
            latestTranscriptRef.current = transcript;

            // Reset silence timer for auto-send
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              if (latestTranscriptRef.current.trim()) {
                sendMessageRef.current(latestTranscriptRef.current);
                setInput("");
                latestTranscriptRef.current = "";
                recognitionRef.current?.stop();
                setIsListening(false);
              }
            }, 1800);
          };

          recognitionRef.current.onerror = (event: Event & { error?: string }) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          };

          recognitionRef.current.onend = () => {
            setIsListening(false);
          };
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
      setIsListening(false);
      // If user stopped manually, send whatever we got
      if (latestTranscriptRef.current.trim()) {
        sendMessage(latestTranscriptRef.current);
        setInput("");
        latestTranscriptRef.current = "";
      }
    } else {
      if (recognitionRef.current) {
        setInput(""); // clear previous input for clean dictation
        latestTranscriptRef.current = "";
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  if (pathname === "/ai") {
    return null;
  }

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput("");
    latestTranscriptRef.current = "";
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="glass-card mb-4 flex h-[500px] w-[360px] flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--gradient-iris)] shadow-[var(--shadow-glow)]">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-white leading-tight">
                  Atlas Assistant
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                  Persistent OS
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleVoiceOutput}
                title={voiceOutputEnabled ? "Mute Voice Output" : "Enable Voice Output"}
                className={`rounded-lg p-1 transition-all ${
                  voiceOutputEnabled
                    ? "bg-mint/20 text-mint"
                    : "text-white/40 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {voiceOutputEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white/80 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={toggleChat}
                className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white/80 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--gradient-iris)] shadow-[var(--shadow-glow)]">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-iris/25 text-white ring-1 ring-iris/30"
                      : "bg-white/5 text-white/90 ring-1 ring-white/10"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--gradient-iris)] animate-pulse">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] bg-white/5 text-white/40 ring-1 ring-white/10 flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            {error && (
              <div className="flex gap-2.5 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Model Indicator in Footer */}
          <div className="border-t border-white/10 px-4 py-2 bg-black/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-white/45">
              <Cpu className="h-3.5 w-3.5 text-iris" />
              <span className="text-[10px] font-mono uppercase text-white/60">{activeModel}</span>
            </div>
          </div>

          {/* Input Box */}
          <div className="border-t border-white/10 p-3 bg-white/5">
            <div className="glass-pill flex items-center gap-2 px-2.5 py-1.5">
              <button
                onClick={toggleListening}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                  isListening
                    ? "bg-red-500/20 text-red-400 animate-pulse ring-1 ring-red-500/50"
                    : "bg-transparent text-white/50 hover:bg-white/10 hover:text-white"
                }`}
                title="Voice Dictation"
              >
                {isListening ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={isListening ? "Listening..." : "Message Atlas…"}
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gradient-iris)] text-white shadow-[var(--shadow-glow)] hover:scale-105 transition-all disabled:opacity-40 disabled:scale-100"
                aria-label="Send message"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Breathing Glass Circle) */}
      <button
        onClick={toggleChat}
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 shadow-glass hover:scale-105 transition-all duration-300 relative ${
          isOpen ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
        }`}
        style={{
          boxShadow: "0 8px 32px -8px oklch(0 0 0 / 0.5), var(--shadow-glow)",
        }}
      >
        <span className="absolute inset-0 rounded-full bg-iris/5 animate-ping opacity-60 pointer-events-none" />
        <MessageSquare className="h-5 w-5" />
      </button>
    </div>
  );
}
