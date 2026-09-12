import type { ContextInsight } from "../context/types.js";
import type { AttentionDecision } from "./types.js";

interface AttentionPolicyRules {
  quietHours?: {
    startHour: number;
    endHour: number;
  };
}

export function evaluateAttention(insight: ContextInsight, rules: AttentionPolicyRules = {}): AttentionDecision {
  const currentHour = new Date().getHours();
  let isQuietHour = false;

  // 1. Quiet Hours check (minimal foundation)
  if (rules.quietHours) {
    const { startHour, endHour } = rules.quietHours;
    if (startHour <= endHour) {
      if (currentHour >= startHour && currentHour < endHour) isQuietHour = true;
    } else {
      if (currentHour >= startHour || currentHour < endHour) isQuietHour = true;
    }
  }

  // 2. Base mapping logic
  let decision: AttentionDecision["decision"] = "SILENT";

  if (insight.type === "RISK" || insight.type === "CONSTRAINT_VIOLATION") {
    decision = insight.severity === "HIGH" ? "NOTIFY" : "SURFACE";
  } else if (insight.type === "CONFLICT") {
    decision = insight.severity === "HIGH" ? "NOTIFY" : "SURFACE";
  } else if (insight.type === "OPPORTUNITY" || insight.type === "RECOMMENDATION") {
    decision = "SURFACE";
  }

  // 3. Apply Quiet Hours Dampening
  if (isQuietHour) {
    if (decision === "NOTIFY" && insight.severity !== "HIGH") {
      decision = "SURFACE"; // downgrade
    } else if (decision === "SURFACE") {
      decision = "ACTIVITY"; // downgrade
    }
  }

  // Create deterministic dedupe key based on insight content
  const todayStr = new Date().toISOString().split("T")[0];
  const dedupeKey = `${insight.type}:${insight.sourceEntities.join("_")}:${todayStr}`;

  return {
    decision,
    reason: insight.description,
    dedupeKey,
    title: `Proactive: ${insight.type}`,
    description: insight.description,
    evidence: insight.sourceEntities,
  };
}
