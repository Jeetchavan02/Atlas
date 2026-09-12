import type { AtlasContext, ContextInsight } from "./types.js";

export function detectInsights(context: AtlasContext): ContextInsight[] {
  const insights: ContextInsight[] = [];
  
  // 1. HEALTH RISKS
  const recovery = context.health?.recoveryScore;
  const trainedToday = context.fitness?.trainedToday;
  const todaySessions = context.fitness?.todaySessions || [];
  
  if (recovery !== undefined && recovery !== null && recovery < 40) {
    if (!trainedToday) {
      insights.push({
        type: "RISK",
        severity: "HIGH",
        description: "Recovery is critically low. High intensity training is not recommended today.",
        sourceEntities: ["health", "fitness"]
      });
    } else {
      insights.push({
        type: "CONSTRAINT_VIOLATION",
        severity: "HIGH",
        description: "Trained today despite critically low recovery.",
        sourceEntities: ["health", "fitness"]
      });
    }
  }

  // 2. CONSTRAINT VIOLATIONS (Overlaps)
  const activeConstraints = context.constraints?.active || [];
  const activeEvent = context.calendar?.activeEvent;

  for (const c of activeConstraints) {
    if (c.type === "HARD" && activeEvent) {
      // If there's an active calendar event during a hard constraint (like Sleep Window)
      // Note: We'd need finer granularity to know if the event violates the specific constraint,
      // but for Phase 3 we'll flag any Social/Deep event during a hard constraint.
      if (activeEvent.category !== "Health") {
         insights.push({
           type: "CONSTRAINT_VIOLATION",
           severity: "HIGH",
           description: `Active calendar event '${activeEvent.title}' violates HARD constraint: ${c.name}.`,
           sourceEntities: ["calendar", "constraints"]
         });
      }
    }
  }

  // 3. CONFLICTS (Calendar vs Tasks)
  const criticalTasks = context.tasks?.criticalTasks || [];
  if (criticalTasks.length > 3 && activeEvent && activeEvent.category === "Social") {
    insights.push({
      type: "CONFLICT",
      severity: "MEDIUM",
      description: `Social event '${activeEvent.title}' is active while you have ${criticalTasks.length} critical tasks pending.`,
      sourceEntities: ["calendar", "tasks"]
    });
  }

  // 4. OPPORTUNITIES
  if (criticalTasks.length === 0 && !activeEvent) {
    if (recovery && recovery >= 70 && !trainedToday) {
      insights.push({
        type: "OPPORTUNITY",
        severity: "LOW",
        description: "Schedule is clear and recovery is high. Great opportunity to train.",
        sourceEntities: ["health", "calendar", "tasks"]
      });
    }
  }

  // 5. RECOMMENDATIONS
  if (criticalTasks.length > 0) {
    const highestPriority = criticalTasks[0];
    insights.push({
      type: "RECOMMENDATION",
      severity: "MEDIUM",
      description: `Focus on highest priority task: '${highestPriority.title}'`,
      sourceEntities: ["tasks"]
    });
  }
  
  return insights;
}
