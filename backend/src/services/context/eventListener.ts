import { eventBus } from "../eventBus.js";
import { ContextEngine } from "./ContextEngine.js";
import { AttentionEngine } from "../attention/AttentionEngine.js";

async function processEvent(intentKeyword: string, eventId?: string) {
  try {
    const snapshot = await ContextEngine.buildSnapshot(intentKeyword);
    if (snapshot.insights.length > 0) {
      await AttentionEngine.processInsights(snapshot.insights, eventId);
    }
  } catch (err) {
    console.error("[eventListener] Failed to process event:", err);
  }
}

export function initializeContextEngine() {
  eventBus.on("TASK_CREATED", (e) => {
    ContextEngine.getSource("tasks")?.markUpdated();
    processEvent("task", e?.id);
  });
  
  eventBus.on("TASK_COMPLETED", (e) => {
    ContextEngine.getSource("tasks")?.markUpdated();
    processEvent("task", e?.id);
  });
  
  eventBus.on("HEALTH_SYNCED", (e) => {
    ContextEngine.getSource("health")?.markUpdated();
    ContextEngine.getSource("fitness")?.markUpdated();
    processEvent("health", e?.id);
  });
  
  eventBus.on("MEMORY_CREATED", () => ContextEngine.getSource("memory")?.markUpdated());
  eventBus.on("MEMORY_UPDATED", () => ContextEngine.getSource("memory")?.markUpdated());
  
  // Note: Calendar sync and other events would also trigger their respective sources here
}
