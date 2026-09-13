import "dotenv/config";
import { executeAiToolLoop } from "./src/services/aiExecutor.js";

// Mock buildSystemPrompt to return a minimal prompt so we don't blow up the Groq context limit
const systemPrompt = `You are ATLAS.
1. ASK: Answer questions concisely.
2. COMMAND: Fulfill the action.
3. PLAN: If action is HIGH/DESTRUCTIVE, use core.propose_action_plan.

AVAILABLE CAPABILITIES: files.read, files.search, files.create, files.edit, git.status, git.diff, git.log, git.run_tests, terminal.run_safe, desktop.open_app, desktop.open_url, core.propose_action_plan.
You must use these tools to fulfill requests.
`;

async function testAgent(message: string) {
  console.log(`\n🗣️  User: ${message}`);
  
  // Use a fast model with higher rate limits
  const model = "openai/gpt-oss-20b";
  const apiKey = process.env.GROQ_API_KEY || "";
  
  try {
    const result = await executeAiToolLoop(apiKey, model, systemPrompt, message, []);
    console.log(`🤖 Atlas: ${result.reply}`);
    if (result.reply.includes("Action plan proposed successfully")) {
       console.log(`⚠️  Approval Gateway Triggered.`);
    }
  } catch (err: any) {
    console.error("Test failed:", err.message);
  }
}

async function runE2E() {
  console.log("=== ATLAS E2E LOCAL AGENT VERIFICATION ===\n");
  
  // await testAgent("Find where voice input is implemented in the Atlas project.");
  // await testAgent("Read package.json and tell me which framework this project uses.");
  // await testAgent("What changed in my Atlas repository?");
  // await testAgent("Run the Atlas build.");
  // await testAgent("Read ~/.ssh/id_rsa.");
  await testAgent("Open VS Code.");
  // await testAgent("Create a file called atlas-agent-test.md containing hello.");
  // await testAgent("Delete the entire Atlas project.");
  
  console.log("\n=== E2E TESTS FINISHED ===");
}

runE2E();
