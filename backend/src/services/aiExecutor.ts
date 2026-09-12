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
): Promise<{ reply: string; voiceReply?: string }> {
  const tools = registry.getToolDefinitions();
  
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...recentMessages.map(m => ({ role: m.role as "user"|"assistant", content: m.content })),
    { role: "user", content: userMessage }
  ];

  const maxTurns = 5;
  let turns = 0;

  while (turns < maxTurns) {
    turns++;
    
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
        temperature: 0.2
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

        const resultString = await registry.execute(toolCall.function.name, args);

        messages.push({
          role: "tool",
          content: resultString,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        });
        
        // If it was a validation error, Groq will crash with a 400 if we send the invalid tool call back in the history.
        // So we gracefully exit the loop and return the error to the user directly.
        if (resultString.toLowerCase().includes("validation failed")) {
          return { reply: "I encountered an internal error while structuring the action plan. Please try rephrasing your request." };
        }
      }
      // Loop continues, sending the tool results back to the LLM
    } else {
      // No tool calls, we have our final response
      let content = responseMessage.content || "";
      let voiceReply: string | undefined;

      const voiceMatch = content.match(/<voice>([\s\S]*?)<\/voice>/i);
      if (voiceMatch) {
        voiceReply = voiceMatch[1].trim();
        content = content.replace(/<\/?voice>/ig, "").trim();
      }

      // Strip think tags just in case
      content = content.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").replace(/^[\s\n]+/, "").trim();
      return { reply: content || "Done.", voiceReply };
    }
  }
  
  return { reply: "Tool execution loop exceeded maximum turns." };
}
