import { EventEmitter } from "events";

export type AtlasEventType = 
  | "SYSTEM_BOOT"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "HEALTH_SYNCED"
  | "MEMORY_CREATED"
  | "MEMORY_UPDATED"
  | "MEMORY_FORGOTTEN"
  | "AUTOMATION_TRIGGERED"
  | "AI_ACTION_EXECUTED"
  | "NOTIFICATION"
  | "ACTION_PLAN_APPROVED"
  | "ACTION_PLAN_EXECUTED"
  | "ACTION_PLAN_REJECTED"
  | "RECOMMENDATION_EXECUTED"
  | "LOCAL_ACTION_REQUESTED"
  | "LOCAL_ACTION_APPROVED"
  | "LOCAL_ACTION_STARTED"
  | "LOCAL_ACTION_COMPLETED"
  | "LOCAL_ACTION_FAILED";

export interface AtlasEvent<T = any> {
  id: string;
  type: AtlasEventType;
  payload: T;
  timestamp: Date;
  source: string; // e.g., 'SYSTEM', 'ZEPP_SYNC', 'AI_ROUTER', 'USER'
}

class AtlasEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow many listeners (SSE clients, automations, loggers)
    this.setMaxListeners(100);
  }

  /**
   * Fire an event across the OS.
   * This is the single entry point for all system-wide state changes.
   */
  emitEvent<T>(type: AtlasEventType, payload: T, source: string = "SYSTEM") {
    const event: AtlasEvent<T> = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: new Date(),
      source,
    };
    
    // Emit standard event
    this.emit(type, event);
    // Emit a generic catch-all event for SSE streams or generic loggers
    this.emit("*", event);
    
    console.log(`[event-bus] ⚡ ${type} emitted from ${source}`);
    return event;
  }
}

export const eventBus = new AtlasEventBus();

import { registry } from "./actions.js";

// -- Automation Evaluator Background Daemon --
// Wait a moment for DB connection before attaching listener
setTimeout(() => {
  eventBus.on("*", async (event: AtlasEvent) => {
    // Avoid recursive automation loops (don't trigger on its own actions if we want to be safe)
    if (event.type === "AUTOMATION_TRIGGERED") return;

    try {
      // Dynamic import to avoid circular dependencies
      const AutomationModel = (await import("../models/Automation.js")).default;
      
      const automations = await AutomationModel.find({ isActive: true, triggerEvent: event.type });
      
      for (const auto of automations) {
        let conditionMet = true;
        
        // Simple evaluator
        if (auto.condition && auto.condition.field) {
          const val = event.payload?.[auto.condition.field];
          const expected = auto.condition.value;
          
          switch (auto.condition.operator) {
            case "==": conditionMet = val == expected; break;
            case "!=": conditionMet = val != expected; break;
            case ">": conditionMet = val > expected; break;
            case "<": conditionMet = val < expected; break;
            case ">=": conditionMet = val >= expected; break;
            case "<=": conditionMet = val <= expected; break;
            case "includes": conditionMet = Array.isArray(val) && val.includes(expected); break;
          }
        }
        
        if (conditionMet && auto.action) {
          console.log(`[automation] Rule "${auto.name}" triggered by ${event.type}`);
          
          try {
            await registry.execute(auto.action.name, auto.action.params || {});
            
            // Mark last triggered
            auto.lastTriggered = new Date();
            await auto.save();
            
            eventBus.emitEvent("AUTOMATION_TRIGGERED", { automationId: auto._id }, "AUTOMATION_ENGINE");
          } catch (execErr) {
            console.error(`[automation] Action ${auto.action?.name} failed:`, execErr);
          }
        }
      }
    } catch (err) {
      console.error("[automation] Evaluator failed:", err);
    }
  });
}, 2000);
