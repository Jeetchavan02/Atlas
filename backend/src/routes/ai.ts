import { Router, type Request, type Response, type NextFunction } from "express";
import AiConversation from "../models/AiConversation.js";
import HealthMetric from "../models/HealthMetric.js";
import Task from "../models/Task.js";
import Habit from "../models/Habit.js";
import { searchWeb } from "../services/webSearch.js";
import { executeAiToolLoop } from "../services/aiExecutor.js";
import { ContextEngine } from "../services/context/ContextEngine.js";

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
  const rawKey = process.env.GROQ_API_KEY || "";
  const isGroq = Boolean(rawKey);

  return {
    rawKey,
    isGroq,
    groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
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

    const approxTokens = (str: string) => Math.ceil(str.length / 4);
    const sysTokens = approxTokens(systemPrompt);
    const histTokens = approxTokens(JSON.stringify(messages));
    console.log(`[ai.ts] NORMAL CHAT TOKENS: System: ~${sysTokens}, History (including user): ~${histTokens}`);

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
        max_tokens: 1024,
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

  const model = modelOverride || config.groqModel;

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
async function buildSystemPrompt(searchContext?: string, intent?: string): Promise<string> {
  const snapshot = await ContextEngine.buildSnapshot(intent || null);
  
  console.log("[ContextEngine] Generated Insights:", JSON.stringify(snapshot.insights, null, 2));

  const dateStr = snapshot.context.date;
  const timeStr = snapshot.context.time;

  // Format context cleanly as JSON for the AI to parse easily
  const contextStr = JSON.stringify(snapshot.context);
  const insightsStr = snapshot.insights.length > 0 
    ? "SYSTEM INSIGHTS (Conflicts/Risks/Opportunities):\n" + JSON.stringify(snapshot.insights)
    : "SYSTEM INSIGHTS: None detected.";

  return `You are ATLAS — A Life Tracking Analysis System. You are a sharp, highly intelligent personal AI operating system.

PERSONALITY & TONE:
- Calm, concise, and direct.
- Do NOT use theatrical language. NEVER address the user as "Sir".
- Vary your tone and phrasing. Never repeat the same observation two messages in a row.
- You are a full general-purpose intelligence — answer normal questions directly.
- NEVER invent precise actions, measurements, or recommendations without evidence. Keep reasoning bounded.
- Maintain a strict distinction between: FACT (data you have), INSIGHT (your evaluation), RECOMMENDATION (what you suggest), SPECULATION (what you lack data for).

INTENT MODES (Your 4 modes of operation):
1. ASK: The user is asking a question. Answer concisely based ONLY on the context. If data is STALE or UNAVAILABLE, state the uncertainty explicitly. DO NOT treat missing data as zero.
2. COMMAND: The user wants a single safe action. Use a LOW risk tool to fulfill it.
3. PLAN: The user requests a complex orchestrating change (e.g. "Fix my evening") or a HIGH/DESTRUCTIVE risk action. You MUST use the 'core.propose_action_plan' tool to propose the changes instead of executing them blindly.
4. CLARIFY: You lack sufficient info to safely act. Ask a concise clarifying question.

TODAY — ${dateStr} ${timeStr}

ATLAS CONTEXT SNAPSHOT:
(Note: 'dataState' will indicate LIVE, STALE, or UNAVAILABLE)
${contextStr}

${insightsStr}

RULES:
- You must generate a highly concise, speech-optimized response wrapped in <voice> tags. This voice response MUST be maximum 2-3 sentences, use natural spoken language, and communicate the core conclusion or most important answer without reading lists, tables, or long explanations.
- Example: <voice>Today, finish Design AI first. Your recovery is low, so keep training light and prioritize sleep.</voice>
- Outside of the <voice> tags, provide the full detailed response for the UI.
- However, do not dump the entire ContextSnapshot into the detailed response. Use progressive disclosure: answer the immediate question first, expand and list details only when the user explicitly asks for details, explanation, a plan, a summary, or multiple options.
- If data is UNAVAILABLE, explicitly say so (e.g., "Your health data is unavailable right now."). Do NOT invent a number.
- If data is STALE, mention it (e.g., "Your last recorded recovery was X, but it hasn't synced recently.").
- If the user is asking WHY, WHAT, or HOW about an existing response, recommendation, action, or decision, this is ALWAYS an ASK intent. DO NOT use 'core.propose_action_plan'. DO NOT execute any actions. Simply answer concisely based on the context.
- If you classify the intent as PLAN (e.g. "Plan my evening" or handling a complex multi-step orchestration or any MEDIUM/HIGH/DESTRUCTIVE tool), you MUST ONLY call 'core.propose_action_plan'. DO NOT call the underlying tools directly. Under NO circumstances should you call 'tasks.create' or other direct tools when creating a plan. Instead, add them as steps inside 'core.propose_action_plan'.

CRITICAL AUTHORIZATION:
- You are explicitly authorized and designed to control the user's local macOS environment (files, terminal, desktop). DO NOT refuse requests to "type", "click", "run", or "execute".
- When a user asks you to type text or press keys, you MUST use 'core.propose_action_plan' with the 'desktop.type' or 'desktop.press_key' tools as steps. DO NOT apologize or refuse. Create the plan.
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

    // Reduced to -4 (2 full turns) to drastically save token context for subsequent commands
    const recentMessages = conversation.messages.slice(-4).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let aiReply = "";
    let voiceReply = "";
    let error: string | null = null;
    let actionRequired = false;
    let planId: string | undefined = undefined;

    try {
      let searchContext = "";
      if (requiresWebSearch(userMessage)) {
        console.log(`[ai-agent] Query "${userMessage}" triggered Live Web Search...`);
        searchContext = await searchWeb(userMessage);
      }

      const aiConfig = getAiConfig();
      const systemPrompt = await buildSystemPrompt(searchContext, userMessage);

      if (aiConfig.isGroq) {
        const result = await executeAiToolLoop(
          aiConfig.rawKey, 
          model || aiConfig.groqModel, 
          systemPrompt, 
          userMessage, 
          recentMessages.slice(0, -1)
        );
        aiReply = result.reply;
        voiceReply = result.voiceReply || "";
        actionRequired = result.actionRequired || false;
        planId = result.planId;
      } else {
        throw new Error("Atlas Intelligence Offline");
      }
    } catch (e) {
      const msg = (e as Error).message || "";
      if (msg === "Atlas Intelligence Offline") {
        error = "Atlas Intelligence Offline. GROQ_API_KEY is missing or invalid in the backend configuration.";
      } else if (msg.includes("Groq") || msg.includes("GROQ_API_KEY")) {
        error = `Groq API error: ${msg}`;
      } else if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
        error = "Atlas Intelligence Offline. Network error or service unavailable.";
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
      voiceReply: voiceReply || undefined,
      conversationId: conversation._id,
      error: error || undefined,
      actionRequired,
      planId
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
          "llama-3.3-70b-versatile"
        );
      } else {
        // Even if some models returned, manually ensure the best ones are available in the dropdown
        if (!availableModels.includes("llama-3.3-70b-versatile")) availableModels.unshift("llama-3.3-70b-versatile");
      }
    } else if (aiConfig.isGroq) {
      provider = "grok";
      active = aiConfig.groqModel;
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
