import { Router, type Request, type Response, type NextFunction } from "express";
import AiConversation from "../models/AiConversation.js";
import HealthMetric from "../models/HealthMetric.js";
import Task from "../models/Task.js";
import Habit from "../models/Habit.js";
import { searchWeb } from "../services/webSearch.js";

const router = Router();

/** Strip <think>...</think> blocks that some models leak into content */
function stripThinkTags(text: string): string {
  return text
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
    .replace(/^[\s\n]+/, "")
    .trim();
}

/** Simple regex classifier to detect queries requiring real-time web search */
function requiresWebSearch(query: string): boolean {
  const q = query.toLowerCase();
  
  const searchKeywords = [
    "score", "match", "vs", "versus", "playing", "game", "who won", "winner of",
    "odds", "betting", "payout", "weather", "stock", "price of", "latest news",
    "morocco", "canada", "football", "soccer", "championship", "tournament",
    "world cup", "round of 16", "won", "played", "playing today", "who is",
    "current state", "real time"
  ];
  
  // Exclude purely personal dashboard metrics
  const isPersonalQueryOnly = 
    (q.includes("my sleep") || q.includes("my weight") || q.includes("my steps") || q.includes("my tasks") || q.includes("my habits")) &&
    !searchKeywords.some(kw => q.includes(kw));

  if (isPersonalQueryOnly) return false;
  
  return searchKeywords.some(kw => q.includes(kw));
}

/** Call Ollama native /api/chat (not /v1/ compat) with think:false */
async function callOllama(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  modelOverride?: string,
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL?.replace("/v1", "") || "http://localhost:11434";
  const model = modelOverride || process.env.OLLAMA_MODEL || "qwen3:latest";

  const body = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: false,
    think: false,
    options: {
      temperature: 0.6,
      num_predict: 200, // Keep it tight — max ~150 words output
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama responded ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const raw = data?.message?.content || "";
    return stripThinkTags(raw) || "I received an empty response. Try again.";
  } finally {
    clearTimeout(timeout);
  }
}

/** Helper to detect configured AI keys */
function getAiConfig() {
  const rawKey =
    process.env.GROQ_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    "";

  const isGroq = rawKey.startsWith("gsk_") || Boolean(process.env.GROQ_API_KEY);
  const isGrok = rawKey.startsWith("xai-") || Boolean(process.env.XAI_API_KEY);

  return {
    rawKey,
    isGroq,
    isGrok,
    groqModel: process.env.GROQ_MODEL || "llama3-70b-8192",
    grokModel: process.env.GROK_MODEL || "grok-beta",
  };
}

/** Call Groq API endpoint (Ultra-fast LPU inference) */
async function callGroq(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  modelOverride?: string,
): Promise<string> {
  const config = getAiConfig();
  const apiKey = config.rawKey;
  if (!apiKey) {
    throw new Error("No GROQ_API_KEY found in backend environment.");
  }

  // Sanitize model override if user or previous config requested grok-*, default to high-end model
  let model = modelOverride || config.groqModel;
  if (model.includes("grok-")) {
    model = "openai/gpt-oss-120b"; // Fallback to an available Groq model
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.6,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API responded ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim();
    return stripThinkTags(reply || "") || "Empty response from Groq.";
  } finally {
    clearTimeout(timeout);
  }
}

/** Call xAI Grok API endpoint */
async function callGrok(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  modelOverride?: string,
): Promise<string> {
  const config = getAiConfig();
  const apiKey = config.rawKey;
  if (!apiKey) {
    throw new Error("No GROK_API_KEY or XAI_API_KEY found in backend environment.");
  }

  const model = modelOverride || config.grokModel;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.6,
        max_tokens: 512,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`xAI Grok API responded ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim();
    return stripThinkTags(reply || "") || "Empty response from Grok.";
  } finally {
    clearTimeout(timeout);
  }
}

/** Call cloud OpenAI endpoint if API key configured */
async function callCloud(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No OPENAI_API_KEY set in backend environment.");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI responded ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || "Empty response from cloud provider.";
}

/** Build a rich, real-time system prompt from live DB data */
async function buildSystemPrompt(searchContext?: string): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pull richer context — gym sessions, weight, HRV too
  const [health, tasks, habits] = await Promise.allSettled([
    HealthMetric.findOne({ date: today }),
    Task.find({ done: false }).sort({ priority: -1 }).limit(5),
    Habit.find({}).sort({ currentStreak: -1 }).limit(6),
  ]);

  const h = health.status === "fulfilled" ? health.value : null;
  const t = tasks.status === "fulfilled" ? tasks.value : [];
  const hb = habits.status === "fulfilled" ? habits.value : [];

  // Build rich health context string
  let healthCtx = "";
  if (h) {
    const parts: string[] = [];
    if (h.sleepHours) parts.push(`Sleep: ${h.sleepHours}h (score ${h.sleepScore}/100)`);
    if (h.restingHeartRate) parts.push(`RHR: ${h.restingHeartRate} bpm`);
    if (h.hrv) parts.push(`HRV: ${h.hrv} ms`);
    if (h.steps) parts.push(`Steps: ${h.steps.toLocaleString()}`);
    if (h.caloriesBurned) parts.push(`Cals burned: ${h.caloriesBurned}`);
    if (h.weight) parts.push(`Weight: ${h.weight} kg`);
    if (h.liveHeartRate) parts.push(`Live HR: ${h.liveHeartRate} bpm`);
    if (h.spo2) parts.push(`SpO2: ${h.spo2}%`);
    if (h.recoveryScore) parts.push(`Recovery: ${h.recoveryScore}/100`);
    if (h.waterLiters) parts.push(`Water: ${h.waterLiters}L`);
    if (h.activeSessions && h.activeSessions.length > 0) {
      const lastSession = h.activeSessions[h.activeSessions.length - 1];
      parts.push(`Last workout: ${lastSession.type} (${lastSession.durationMin} min, ${lastSession.caloriesBurned ?? "?"} cals)`);
    }
    healthCtx = parts.length > 0 ? parts.join(". ") + "." : "Sensors synced but no specific metrics recorded today.";
  } else {
    healthCtx = "Health sensors not synced today — data unavailable.";
  }

  const taskCtx =
    t.length > 0
      ? `Pending tasks: ${t.map((x) => `"${x.title}" [${x.priority} priority]`).join(", ")}.`
      : "No pending tasks. Either everything is done, or nothing was added.";

  const habitCtx =
    hb.length > 0
      ? `Active habits: ${hb.map((x) => `${x.name} (${x.currentStreak}-day streak)`).join(", ")}.`
      : "No habits being tracked yet.";

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are ATLAS — A Life Tracking Analysis System. You are a sharp, highly intelligent personal AI operating system. You address the user as "Sir".

PERSONALITY:
- You have dry, sophisticated wit — like J.A.R.V.I.S from Iron Man. Occasionally deadpan, occasionally sarcastic, but always substantive.
- Vary your tone and phrasing. Never repeat the same observation two messages in a row.
- You are NOT a wellness bot. Do NOT suggest "cold plunge", "journaling", or generic wellness advice unprompted. Only suggest specific actions if the data clearly calls for it.
- When the user asks a general question (e.g. sports, tech, news), answer it directly. You are a full general-purpose intelligence — not just a health tracker.
- Reference actual numbers from the context when relevant — not vague summaries.
- When data is missing, note it with dry humour once, then move on.
- NEVER hallucinate live sports scores, betting odds, or real-time facts. If the LIVE SEARCH RESULTS do not specify the exact score, odds, or status, state clearly and politely that the live search data did not contain the current details, and do NOT make up numbers or guess.

TODAY — ${dateStr}
HEALTH: ${healthCtx}
TASKS: ${taskCtx}
HABITS: ${habitCtx}

RULES:
- Keep responses to 1–3 sentences maximum. Under 60 words unless explicitly asked for more detail.
- Plain text only. No markdown, no bullet points, no headers.
- If asked about something outside health/tasks, just answer it normally like a smart assistant would.
- NEVER start two consecutive responses with the same phrase.
` + (searchContext ? `\n\nLIVE SEARCH RESULTS (Real-time Internet Data):\n${searchContext}` : "");
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────
router.post("/chat", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userMessage, conversationId, model } = req.body;

    if (!userMessage?.trim()) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }

    // Load or create conversation
    let conversation = conversationId ? await AiConversation.findById(conversationId) : null;

    if (!conversation) {
      conversation = await AiConversation.create({ userId: "default", messages: [] });
    }

    conversation.messages.push({
      role: "user",
      content: userMessage.trim(),
      timestamp: new Date(),
    });

    const recentMessages = conversation.messages.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let aiReply = "";
    let error: string | null = null;

    try {
      let searchContext = "";
      if (requiresWebSearch(userMessage)) {
        console.log(`[ai-agent] Query "${userMessage}" triggered Live Web Search...`);
        searchContext = await searchWeb(userMessage);
      }

      const aiConfig = getAiConfig();
      const systemPrompt = await buildSystemPrompt(searchContext);

      if (aiConfig.isGroq || model?.toLowerCase().includes("groq") || model?.toLowerCase().includes("llama")) {
        aiReply = await callGroq(recentMessages, systemPrompt, model);
      } else if (aiConfig.isGrok || model?.toLowerCase().includes("grok")) {
        aiReply = await callGrok(recentMessages, systemPrompt, model);
      } else if (model === "cloud" || model === "openai") {
        try {
          aiReply = await callCloud(recentMessages, systemPrompt);
        } catch (cloudErr) {
          if (aiConfig.isGroq) {
            console.warn("[ai-router] Cloud query failed, falling back to Groq:", (cloudErr as Error).message);
            aiReply = await callGroq(recentMessages, systemPrompt);
          } else if (aiConfig.isGrok) {
            console.warn("[ai-router] Cloud query failed, falling back to Grok:", (cloudErr as Error).message);
            aiReply = await callGrok(recentMessages, systemPrompt);
          } else {
            console.warn("[ai-router] Cloud query failed, falling back to local Ollama:", (cloudErr as Error).message);
            aiReply = await callOllama(recentMessages, systemPrompt);
          }
        }
      } else {
        try {
          aiReply = await callOllama(recentMessages, systemPrompt, model);
        } catch (ollamaErr) {
          if (aiConfig.isGroq) {
            console.warn("[ai-router] Ollama unavailable, falling back to Groq:", (ollamaErr as Error).message);
            aiReply = await callGroq(recentMessages, systemPrompt);
          } else if (aiConfig.isGrok) {
            console.warn("[ai-router] Ollama unavailable, falling back to Grok:", (ollamaErr as Error).message);
            aiReply = await callGrok(recentMessages, systemPrompt);
          } else {
            throw ollamaErr;
          }
        }
      }
    } catch (e) {
      const msg = (e as Error).message || "";
      if (msg.includes("Groq") || msg.includes("GROQ_API_KEY")) {
        error = `Groq API error: ${msg}`;
      } else if (msg.includes("GROK_API_KEY") || msg.includes("xAI Grok")) {
        error = `Grok API error: ${msg}`;
      } else if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
        error = "AI service offline. Please check your network or local AI configuration.";
      } else if (msg.includes("not found")) {
        const modelTag = model || "configured model";
        error = `Model '${modelTag}' was not found.`;
      } else if (msg.includes("aborted") || msg.includes("AbortError")) {
        error = "Request timed out after 30 seconds.";
      } else {
        error = `AI engine error: ${msg}`;
      }
      aiReply = error;
    }

    conversation.messages.push({
      role: "assistant",
      content: aiReply,
      timestamp: new Date(),
    });

    await conversation.save();

    res.json({
      reply: aiReply,
      conversationId: conversation._id,
      error: error || undefined,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/conversations ───────────────────────────────────────────────────
router.get("/conversations", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const conversations = await AiConversation.find({ userId: "default" })
      .sort({ updatedAt: -1 })
      .limit(10);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/conversations/:id ───────────────────────────────────────────────
router.get("/conversations/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = await AiConversation.findById(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/models ─────────────────────────────────────────────────────────
router.get("/models", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const aiConfig = getAiConfig();
    const availableModels: string[] = [];
    let provider = "ollama";
    let active = process.env.OLLAMA_MODEL || "qwen3:latest";

    if (aiConfig.isGroq) {
      provider = "groq";
      active = aiConfig.groqModel;
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${aiConfig.rawKey}` },
        });
        if (groqRes.ok) {
          const data = (await groqRes.json()) as { data: Array<{ id: string }> };
          if (data.data?.length) {
            availableModels.push(...data.data.map((m) => m.id));
          }
        }
      } catch (e) {
        console.warn("Failed to fetch Groq models:", e);
      }
      if (availableModels.length === 0) {
        availableModels.push(
          "llama-3.3-70b-versatile",
          "llama3-8b-8192",
          "mixtral-8x7b-32768"
        );
      } else {
        // Even if some models returned, manually ensure the best ones are available in the dropdown
        if (!availableModels.includes("llama-3.3-70b-versatile")) availableModels.unshift("llama-3.3-70b-versatile");
        if (!availableModels.includes("llama3-8b-8192")) availableModels.push("llama3-8b-8192");
        if (!availableModels.includes("mixtral-8x7b-32768")) availableModels.push("mixtral-8x7b-32768");
      }
    } else if (aiConfig.isGrok) {
      provider = "grok";
      active = aiConfig.grokModel;
      availableModels.push("grok-beta", "grok-2-1212", "grok-2-vision-1212");
    }

    const baseUrl = process.env.OLLAMA_BASE_URL?.replace("/v1", "") || "http://localhost:11434";
    try {
      const ollamaRes = await fetch(`${baseUrl}/api/tags`);
      if (ollamaRes.ok) {
        const data = (await ollamaRes.json()) as { models: Array<{ name: string }> };
        if (data.models?.length) {
          availableModels.push(...data.models.map((m) => m.name));
        }
      }
    } catch {
      // Ollama not running - safe to ignore
    }

    res.json({
      active,
      available: availableModels.length > 0 ? availableModels : [active],
      provider,
    });
  } catch (err) {
    res.json({
      active: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      available: [process.env.GROQ_MODEL || "llama-3.3-70b-versatile"],
      provider: "groq",
    });
  }
});

export default router;
