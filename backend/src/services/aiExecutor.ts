import { registry } from "./actions.js";

interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export async function executeAiToolLoop(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  recentMessages: Array<{ role: string; content: string }>
): Promise<{ reply: string; voiceReply?: string; actionRequired?: boolean; planId?: string }> {
  const rawTools = registry.getToolDefinitions();
  
  // Intelligent Request-Scoped Tool Exposure (Saves ~1200+ schema tokens)
  const fullText = (userMessage + " " + recentMessages.map(m => m.content).join(" ")).toLowerCase();
  
  const tools = rawTools.filter(t => {
    const n = t.function.name;
    // Always expose core planning/capabilities tool
    if (n.startsWith("core.")) return true;
    
    // Filter desktop capabilities
    if (n.startsWith("desktop.") && fullText.match(/focus|open|app|type|press|key|url|browser|click|window|desktop|active/)) return true;
    
    // Filter file/git capabilities
    if (n.startsWith("files.") && fullText.match(/file|read|write|search|code|edit|folder|directory/)) return true;
    if (n.startsWith("git.") && fullText.match(/git|commit|diff|status|history|log|test|repository/)) return true;
    
    // Filter terminal capabilities
    if (n.startsWith("terminal.") && fullText.match(/run|terminal|command|build|lint|test|npm|execute|shell/)) return true;
    
    // If we couldn't match a specific domain, expose none of the dangerous/heavy tools
    return false;
  });

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...recentMessages.map(m => ({ role: m.role as "user"|"assistant", content: m.content })),
    { role: "user", content: userMessage }
  ];

  const maxTurns = 5;
  let turns = 0;

  while (turns < maxTurns) {
    turns++;
    const approxTokens = (str: string) => Math.ceil(str.length / 4);
    const sysTokens = approxTokens(systemPrompt);
    const histTokens = approxTokens(JSON.stringify(recentMessages));
    const toolSchemaTokens = approxTokens(JSON.stringify(tools));
    const msgTokens = approxTokens(JSON.stringify(messages));
    
    console.log(`[aiExecutor] TURN ${turns} TOKENS: System: ~${sysTokens}, History (initial): ~${histTokens}, Tool Schemas: ~${toolSchemaTokens}, Total Messages: ~${msgTokens}`);
    
    // Determine max tokens based on turn to save completion budget
    // The LLM is instructed to be concise (2-3 sentences), so 250 is plenty for the final answer,
    // and more than enough for a JSON tool call payload.
    const max_tokens = 250;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq tool-loop API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const responseMessage = data.choices[0].message;
    
    messages.push(responseMessage);

    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        let args;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          args = {};
        }

        console.log(`[AI] selected tool = ${toolCall.function.name}`);
        const sanitizedArgs = { ...args };
        if (sanitizedArgs.text) sanitizedArgs.text = "***redacted***";
        console.log(`[AI] tool arguments = ${JSON.stringify(sanitizedArgs)}`);

        let resultString: string;
        try {
          const rawResult = await registry.execute(toolCall.function.name, args);
          
          if (toolCall.function.name === "core.propose_action_plan" && rawResult.planId) {
            return {
              reply: "I have proposed an Action Plan for your request. Please review and approve it.",
              actionRequired: true,
              planId: rawResult.planId
            };
          }

          resultString = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
          
          // Token Optimization: If a tool result is massive (like reading a huge file), 
          // truncate it to prevent blowing the conversation history budget in subsequent turns.
          if (resultString.length > 1000) {
            resultString = resultString.substring(0, 1000) + "\n...[TRUNCATED FOR LENGTH]";
          }
        } catch (err: any) {
          resultString = err.message;
        }

        messages.push({
          role: "tool",
          content: resultString,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        });
        
        if (resultString.toLowerCase().includes("validation failed")) {
          return { reply: "I encountered an internal error while structuring the action plan. Please try rephrasing your request." };
        }
      }
      // Loop continues, sending the tool results back to the LLM
    } else {
      // No tool calls, we have our final response
      let content = responseMessage.content || "";
      console.log(`[AI] raw output content = ${JSON.stringify(content)}`);
      
      let voiceReply: string | undefined;

      const voiceMatch = content.match(/<voice>([\s\S]*?)<\/voice>/i);
      if (voiceMatch) {
        voiceReply = voiceMatch[1].trim();
        content = content.replace(/<\/?voice>/ig, "").trim();
      }

      // Instrumentation log as requested by user
      const approxTokens = (str: string) => Math.ceil(str.length / 4);
      console.log(`\n=== 🛠️  ATLAS OPTIMIZATION INSTRUMENTATION ===`);
      console.log(`Tools Exposed: ${tools.length} / ${rawTools.length}`);
      console.log(`Tool-Loop Iterations: ${turns}`);
      console.log(`Approx. Context Size: ~${approxTokens(systemPrompt)} tokens`);
      console.log(`Approx. History Size: ~${approxTokens(JSON.stringify(recentMessages))} tokens`);
      console.log(`Approx. Output Size: ~${approxTokens(content)} tokens`);
      console.log(`===============================================\n`);

      // Strip think tags just in case
      content = content.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").replace(/^[\s\n]+/, "").trim();
      return { reply: content || "Done.", voiceReply };
    }
  }
  
  return { reply: "Tool execution loop exceeded maximum turns." };
}
