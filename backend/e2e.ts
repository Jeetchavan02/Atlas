import fetch from "node-fetch";

const API_URL = "http://localhost:4000/api/chat";

async function chat(message: string) {
  console.log(`\n🗣️  User: ${message}`);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: message, model: "openai/gpt-oss-20b" })
    });
    
    if (!res.ok) {
      console.error(`API Error ${res.status}:`, await res.text());
      return;
    }
    
    const data = await res.json() as any;
    console.log(`🤖 Atlas: ${data.reply}`);
    if (data.actionRequired) {
      console.log(`⚠️  Action Plan Proposed: ${data.planId}`);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

async function runE2E() {
  console.log("=== ATLAS E2E TOKEN LIMIT OPTIMIZATION VERIFICATION ===\n");
  
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  await chat("Hello Atlas.");
  await delay(22000);
  
  await chat("Read package.json and tell me the framework.");
  await delay(22000);
  
  await chat("Find where voice input is implemented.");
  await delay(22000);
  
  await chat("Open VS Code.");
  await delay(22000);
  
  await chat("Run the Atlas build.");
  
  console.log("\n=== E2E TESTS FINISHED ===");
}

runE2E();
