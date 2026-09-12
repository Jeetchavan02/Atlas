import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

export interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string }; length: number }; length: number };
}
export interface SpeechRecognition {
  continuous: boolean; interimResults: boolean;
  onresult: (e: SpeechRecognitionEvent) => void;
  onerror: (e: Event & { error?: string }) => void;
  onend: () => void;
  start: () => void; stop: () => void;
}

export type VoiceState = "IDLE" | "LISTENING" | "THINKING" | "ACTING" | "SPEAKING" | "ERROR";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatContextType {
  messages: Message[];
  isOpen: boolean;
  activeModel: string;
  conversationId: string | null;
  loading: boolean;
  error: string | null;
  availableModels: string[];
  sendMessage: (text: string, options?: { isVoice?: boolean }) => Promise<void>;
  toggleChat: () => void;
  closeChat: () => void;
  openChat: () => void;
  clearChat: () => void;
  setActiveModel: (model: string) => void;
  voiceOutputEnabled: boolean;
  toggleVoiceOutput: () => void;
  voiceState: VoiceState;
  setVoiceState: (state: VoiceState) => void;
  stopTTS: () => void;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
}

const ChatContext = createContext<ChatContextType | null>(null);

const STORAGE_KEY_CONV = "atlas-chat-conv-id";
const STORAGE_KEY_MODEL = "atlas-chat-model";
const STORAGE_KEY_MSGS = "atlas-chat-messages";
const STORAGE_KEY_VOICE = "atlas-chat-voice";

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_CONV);
    }
    return null;
  });
  const [activeModel, setActiveModel] = useState<string>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_MODEL) ?? "qwen3:latest";
    }
    return "qwen3:latest";
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_MSGS);
      if (stored) {
        try {
          return JSON.parse(stored).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        } catch {
          // ignore
        }
      }
    }
    return [
      {
        role: "assistant",
        content:
          "Hello! I am Atlas AI, your personal OS companion. How can I help you optimize your schedule, check hardware sync status, or look up habits today?",
        timestamp: new Date(),
      },
    ];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [availableModels, setAvailableModels] = useState<string[]>(["qwen3:latest", "cloud"]);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_VOICE) === "true";
    }
    return false;
  });

  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const latestTranscriptRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // We use a ref to sendMessage so STT can call it without re-binding
  // but we can't do that yet because sendMessage is defined later.
  // Instead, we define a callback that reads a ref or we just define startListening later.

  const toggleVoiceOutput = useCallback(() => setVoiceOutputEnabled((v) => !v), []);

  // Automatically minimize on route change (navigation)
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Sync state to local storage
  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      if (conversationId) {
        localStorage.setItem(STORAGE_KEY_CONV, conversationId);
      } else {
        localStorage.removeItem(STORAGE_KEY_CONV);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_MODEL, activeModel);
    }
  }, [activeModel]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_VOICE, voiceOutputEnabled.toString());
    }
  }, [voiceOutputEnabled]);

  // Fetch available models from backend on mount
  useEffect(() => {
    fetch("http://localhost:4000/api/models")
      .then((r) => r.json())
      .then((d) => {
        if (d.available?.length) {
          setAvailableModels(d.available);
          if (d.active) {
            setActiveModel((current) => {
              if (current === "qwen3:latest" || !d.available.includes(current)) {
                return d.active;
              }
              return current;
            });
          }
        }
      })
      .catch(() => {
        // Fallback if backend is down
      });
  }, []);

  const speakMessage = useCallback((text: string, forceSpeak: boolean = false) => {
    if ((!voiceOutputEnabled && !forceSpeak) || typeof window === "undefined" || !window.speechSynthesis) return false;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find a J.A.R.V.I.S-like British male voice
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => 
      v.name.includes("Daniel") || 
      v.name.includes("Arthur") || 
      (v.lang === "en-GB" && v.name.includes("Male")) ||
      v.name.includes("Google UK English Male")
    ) || voices.find(v => v.lang === "en-GB");
    
    if (jarvisVoice) {
      utterance.voice = jarvisVoice;
    }
    
    // J.A.R.V.I.S tonal tweaks: slightly lower pitch, calm pacing
    utterance.pitch = 0.9;
    utterance.rate = 1.05;

    utterance.onstart = () => setVoiceState("SPEAKING");
    utterance.onend = () => setVoiceState("IDLE");
    utterance.onerror = () => setVoiceState("IDLE");
    
    window.speechSynthesis.speak(utterance);
    return true;
  }, [voiceOutputEnabled]);

  const stopTTS = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setVoiceState("IDLE");
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string, options?: { isVoice?: boolean }) => {
      if (!text.trim() || loading) return;

      setError(null);
      setLoading(true);
      setVoiceState("THINKING");

      // Check if user is asking to stop
      if (text.trim().toLowerCase() === "atlas, stop" || text.trim().toLowerCase() === "stop") {
        stopTTS();
        setVoiceState("IDLE");
        setLoading(false);
        return;
      }

      const newMsg: Message = { role: "user", content: text.trim(), timestamp: new Date() };
      setMessages((prev) => [...prev, newMsg]);

      let didSpeak = false;

      try {
        const res = await fetch("http://localhost:4000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: text,
            conversationId: conversationId || undefined,
            model: activeModel,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }

        const data = await res.json();
        if (data.error) {
          setError(data.error);
        }

        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply, timestamp: new Date() },
          ]);
          didSpeak = speakMessage(data.voiceReply || data.reply, options?.isVoice);
        }
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      } catch (e) {
        setError("AI Service Offline");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm currently unable to reach the AI engine. Please ensure your local Ollama daemon or MERN backend is running.",
            timestamp: new Date(),
          },
        ]);
        setVoiceState("ERROR");
      } finally {
        setLoading(false);
        // Transition back to IDLE if we are not actively speaking and no error occurred
        if (!didSpeak) {
           setVoiceState((current) => current === "THINKING" ? "IDLE" : current);
        }
      }
    },
    [loading, conversationId, activeModel, speakMessage, stopTTS],
  );

  const sendMessageRef = useRef(sendMessage);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SRC = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRC) return;
    recognitionRef.current = new SRC();
    if (!recognitionRef.current) return;
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (e: SpeechRecognitionEvent) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTranscript(t);
      latestTranscriptRef.current = t;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (latestTranscriptRef.current.trim()) {
          sendMessageRef.current(latestTranscriptRef.current, { isVoice: true });
          setTranscript("");
          latestTranscriptRef.current = "";
          recognitionRef.current?.stop();
        }
      }, 1800);
    };
    recognitionRef.current.onerror = () => {
      setVoiceState("IDLE");
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
    recognitionRef.current.onend = () => {
      setVoiceState((current) => current === "LISTENING" ? "IDLE" : current);
    };

    return () => {
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript("");
      latestTranscriptRef.current = "";
      recognitionRef.current.start();
      setVoiceState("LISTENING");
    } else {
      alert("Speech recognition is not available in this browser.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setVoiceState((current) => current === "LISTENING" ? "IDLE" : current);
    if (latestTranscriptRef.current.trim()) {
      sendMessage(latestTranscriptRef.current, { isVoice: true });
      setTranscript("");
      latestTranscriptRef.current = "";
    }
  }, [sendMessage]);

  const toggleChat = useCallback(() => setIsOpen((o) => !o), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const openChat = useCallback(() => setIsOpen(true), []);
  const clearChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "Thread reset. How can I help you next?",
        timestamp: new Date(),
      },
    ]);
    setConversationId(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isOpen,
        activeModel,
        conversationId,
        loading,
        error,
        availableModels,
        sendMessage,
        toggleChat,
        closeChat,
        openChat,
        clearChat,
        setActiveModel,
        voiceOutputEnabled,
        toggleVoiceOutput,
        voiceState,
        setVoiceState,
        stopTTS,
        startListening,
        stopListening,
        transcript,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useGlobalChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useGlobalChat must be inside <ChatProvider>");
  return ctx;
}
