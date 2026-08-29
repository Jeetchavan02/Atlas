import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

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
  sendMessage: (text: string) => Promise<void>;
  toggleChat: () => void;
  closeChat: () => void;
  openChat: () => void;
  clearChat: () => void;
  setActiveModel: (model: string) => void;
  voiceOutputEnabled: boolean;
  toggleVoiceOutput: () => void;
  isSpeaking: boolean;
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>(["qwen3:latest", "cloud"]);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_VOICE) === "true";
    }
    return false;
  });

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

  const speakMessage = useCallback((text: string) => {
    if (!voiceOutputEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    
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

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [voiceOutputEnabled]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      setError(null);
      setLoading(true);

      const newMsg: Message = { role: "user", content: text.trim(), timestamp: new Date() };
      setMessages((prev) => [...prev, newMsg]);

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
          speakMessage(data.reply);
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
      } finally {
        setLoading(false);
      }
    },
    [loading, conversationId, activeModel, speakMessage],
  );

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
        isSpeaking,
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
