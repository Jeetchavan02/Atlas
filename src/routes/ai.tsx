import { createFileRoute } from "@tanstack/react-router";
import {
  Brain,
  Cpu,
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Settings2,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useGlobalChat } from "@/context/ChatContext";
import { AudioReactingHUD } from "@/components/AudioReactingHUD";

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

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Atlas AI — Conversational Interface" },
      { name: "description", content: "Atlas AI connects every signal in your life." },
    ],
  }),
  component: AIPage,
});

function AIPage() {
  const {
    messages,
    loading,
    sendMessage,
    activeModel,
    clearChat,
    voiceOutputEnabled,
    toggleVoiceOutput,
    availableModels,
    setActiveModel,
    isSpeaking,
  } = useGlobalChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hudVisible, setHudVisible] = useState(false);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const latestTranscriptRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sendMessageRef = useRef(sendMessage);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    // Auto-open HUD if J.A.R.V.I.S starts speaking
    if (isSpeaking) {
      setHudVisible(true);
    }
  }, [isSpeaking]);

  useEffect(() => {
    // Initialize Web Speech API
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
        setHudVisible(true);
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
    }
  };

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl overflow-hidden shadow-[var(--shadow-glow)]">
      {/* Header */}
      <header className="flex flex-none items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-iris/20 text-iris ring-1 ring-iris/30">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-white">Atlas AI</h1>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/50">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-iris" />
                {activeModel}
              </span>
              <span>·</span>
              <span className="text-mint">Live Sync</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoiceOutput}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              voiceOutputEnabled
                ? "bg-mint/20 text-mint hover:bg-mint/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            title={voiceOutputEnabled ? "Mute Voice Output" : "Enable Voice Output"}
          >
            {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            onClick={clearChat}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Clear Chat History"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user"
                    ? "bg-white/10 text-white"
                    : "bg-iris/20 text-iris ring-1 ring-iris/30"
                }`}
              >
                {msg.role === "user" ? (
                  <MessageSquare className="h-5 w-5" />
                ) : (
                  <Brain className="h-5 w-5" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl p-4 text-[15px] leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-white/10 text-white"
                    : "bg-black/50 text-white/90 border border-white/5"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`mt-2 text-[10px] ${
                    msg.role === "user" ? "text-white/40 text-right" : "text-white/30"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-iris/20 text-iris ring-1 ring-iris/30">
                <Brain className="h-5 w-5 animate-pulse" />
              </div>
              <div className="flex items-center rounded-2xl bg-black/50 border border-white/5 p-4">
                <div className="flex space-x-1.5">
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-iris/60"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-iris/60"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-iris/60"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none border-t border-white/5 bg-black/50 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 transition-colors focus-within:border-iris/50 focus-within:bg-white/10">
          <button
            onClick={toggleListening}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
              isListening
                ? "bg-red-500/20 text-red-400 animate-pulse ring-1 ring-red-500/50"
                : "bg-transparent text-white/50 hover:bg-white/10 hover:text-white"
            }`}
            title="Voice Chat"
          >
            {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Message Atlas AI..."}
            className="max-h-48 min-h-[44px] w-full resize-none bg-transparent py-3 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
            rows={1}
            style={{
              height: "44px",
            }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${
              input.trim() && !loading
                ? "bg-[var(--gradient-iris)] text-white shadow-[var(--shadow-glow)]"
                : "bg-white/5 text-white/30"
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {hudVisible && (
        <AudioReactingHUD
          isListening={isListening}
          isSpeaking={isSpeaking}
          onToggleListening={toggleListening}
          onClose={() => setHudVisible(false)}
        />
      )}
    </div>
  );
}
