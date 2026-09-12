import type { ContextInsight } from "../context/types.js";
import { evaluateAttention } from "./attentionPolicy.js";
import Recommendation from "../../models/Recommendation.js";
import { eventBus } from "../eventBus.js";

class AttentionEngineImpl {
  public async processInsights(insights: ContextInsight[], triggerEventId?: string) {
    for (const insight of insights) {
      const decision = evaluateAttention(insight);

      if (decision.decision === "SILENT" || decision.decision === "ACTIVITY") {
        console.log(`[AttentionEngine] Suppressing ${insight.type} insight (Decision: ${decision.decision})`);
        continue;
      }

      // SURFACE or NOTIFY
      // Deduplication check in MongoDB
      const existing = await Recommendation.findOne({ 
        dedupeKey: decision.dedupeKey, 
        status: { $in: ["PENDING", "APPROVED"] } 
      });

      if (existing) {
        console.log(`[AttentionEngine] Duplicate suppressed for dedupeKey: ${decision.dedupeKey}`);
        
        // Update the existing recommendation slightly so it's fresh
        existing.description = decision.description || existing.description;
        existing.evidence = decision.evidence || existing.evidence;
        await existing.save();
        
        continue;
      }

      // Create new Recommendation
      const expirationDate = new Date();
      expirationDate.setHours(23, 59, 59, 999); // default expire at midnight today

      const newRec = await Recommendation.create({
        userId: "default",
        triggerEventId,
        dedupeKey: decision.dedupeKey!,
        attentionLevel: decision.decision,
        title: decision.title,
        description: decision.description,
        evidence: decision.evidence,
        expiresAt: expirationDate
      });

      console.log(`[AttentionEngine] Created new recommendation: ${newRec._id}`);
      
      // Notify the system
      eventBus.emitEvent("NOTIFICATION", {
        type: "RECOMMENDATION",
        recommendation: newRec,
      }, "ATTENTION_ENGINE");
    }
  }
}

export const AttentionEngine = new AttentionEngineImpl();
