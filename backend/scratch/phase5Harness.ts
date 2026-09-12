import mongoose from "mongoose";
import "dotenv/config";
import { executeAiToolLoop } from "../src/services/aiExecutor.js";
import { ContextEngine } from "../src/services/context/ContextEngine.js";
import HealthMetric from "../src/models/HealthMetric.js";
import { registry } from "../src/services/actions.js";

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/atlas");
  console.log("[test] Connected to MongoDB.");

  const snapshot = await ContextEngine.buildSnapshot("train");
  const systemPrompt = `You are ATLAS...
  
  CONTEXT:
  ${JSON.stringify(snapshot.context, null, 2)}
  
  RULES:
  - Keep responses to 1-3 sentences.
  - If data is UNAVAILABLE, explicitly say so.
  - If the user is asking WHY, WHAT, or HOW about an existing response, recommendation, action, or decision (e.g., "Why should I skip training?", "Explain your recommendation"), this is ALWAYS an ASK intent. DO NOT use 'core.propose_action_plan'. DO NOT execute any actions. Simply answer concisely based on the context.
  - If you classify the intent as PLAN (e.g. "Plan my evening"), you MUST ONLY call 'core.propose_action_plan'. DO NOT call the underlying tools directly. Under NO circumstances should you call 'tasks.create' or other direct tools when creating a plan. Instead, add them as steps inside 'core.propose_action_plan'.
  `;

  console.log("\n--- TEST A: WHY SHOULD I SKIP TRAINING (ASK Intent) ---");
  console.log("Query: 'Why should I skip training?'");
  let reply = await executeAiToolLoop(
    process.env.GROQ_API_KEY!,
    process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    systemPrompt,
    "Why should I skip training?",
    []
  );
  console.log("Response:", reply);

  console.log("\n--- TEST B: WHY ARE YOU RECOMMENDING THAT (ASK Intent) ---");
  console.log("Query: 'Why are you recommending that?'");
  reply = await executeAiToolLoop(
    process.env.GROQ_API_KEY!,
    process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    systemPrompt,
    "Why are you recommending that?",
    []
  );
  console.log("Response:", reply);

  console.log("\n--- TEST C: PLAN Intent ---");
  console.log("Query: 'Plan my evening around my meeting and unfinished tasks.'");
  reply = await executeAiToolLoop(
    process.env.GROQ_API_KEY!,
    process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    systemPrompt,
    "Plan my evening around my meeting and unfinished tasks.",
    []
  );
  console.log("Response:", reply);

  console.log("\n--- TEST D: Simulate core.propose_action_plan with {} ---");
  try {
    const result = await registry.execute("core.propose_action_plan", {});
    console.log("Response:", result);
  } catch (e) {
    console.log("Expected validation error caught:", (e as Error).message);
  }

  console.log("\n--- TEST E: COMMAND Intent ---");
  console.log("Query: 'Create a task called Finish Atlas testing.'");
  reply = await executeAiToolLoop(
    process.env.GROQ_API_KEY!,
    process.env.GROQ_MODEL || "openai/gpt-oss-20b",
    systemPrompt,
    "Create a task called Finish Atlas testing.",
    []
  );
  console.log("Response:", reply);

  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
