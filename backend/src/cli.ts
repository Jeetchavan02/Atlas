import fetch from "node-fetch";
import readline from "readline";

const API_URL = process.env.ATLAS_API_URL || "http://localhost:4000/api";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  const args = process.argv.slice(2);
  const prompt = args.join(" ");

  if (!prompt.trim()) {
    console.log("Usage: atlas \"<your command>\"");
    process.exit(1);
  }

  try {
    // 1. Initial chat request
    const chatRes = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: prompt }),
    });

    if (!chatRes.ok) {
      console.error(`Atlas backend responded with error ${chatRes.status}:`, await chatRes.text());
      process.exit(1);
    }

    let data = (await chatRes.json()) as any;
    console.log(`\n🤖 Atlas: ${data.reply}\n`);

    // 2. Handle Action Plan Approval if required
    while (data.actionRequired && data.planId) {
      console.log(`⚠️  Action Plan Proposed [ID: ${data.planId}]`);
      
      // Fetch plan details to display them
      const planRes = await fetch(`${API_URL}/plans/${data.planId}`);
      if (planRes.ok) {
        const planData = (await planRes.json()) as any;
        const plan = planData.plan;
        if (plan) {
          console.log(`\nTitle: ${plan.title}`);
          console.log(`Description: ${plan.description}\nSteps:`);
          plan.steps.forEach((step: any, i: number) => {
            console.log(`  ${i + 1}. [${step.toolName}] ${step.description}`);
            console.log(`     Args: ${JSON.stringify(step.parameters)}`);
          });
          console.log("");
        }
      }

      const answer = await question("Approve and execute this plan? (y/N): ");
      
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        // Approve plan
        const approveRes = await fetch(`${API_URL}/plans/${data.planId}/approve`, {
          method: "POST"
        });
        
        if (!approveRes.ok) {
          console.error("Failed to approve plan:", await approveRes.text());
          process.exit(1);
        }
        
        console.log("\nExecuting plan...\n");
        
        // Follow up to continue the conversation after approval
        const followUpRes = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage: "I have approved the plan. Please execute it." }),
        });
        
        if (!followUpRes.ok) {
          console.error(`Atlas backend error: ${followUpRes.status}`, await followUpRes.text());
          process.exit(1);
        }
        
        data = (await followUpRes.json()) as any;
        console.log(`🤖 Atlas: ${data.reply}\n`);
      } else {
        console.log("Plan rejected.");
        
        // Notify Atlas of the rejection
        const rejectRes = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage: "I rejected the proposed plan." }),
        });
        
        if (rejectRes.ok) {
          const rejectData = (await rejectRes.json()) as any;
          console.log(`🤖 Atlas: ${rejectData.reply}\n`);
        }
        
        break;
      }
    }

    process.exit(0);
  } catch (err: any) {
    if (err.code === "ECONNREFUSED") {
      console.error("\n❌ Atlas backend is offline. Please start it using `npm run dev` in the backend directory.\n");
    } else {
      console.error("\n❌ CLI Error:", err.message, "\n");
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
