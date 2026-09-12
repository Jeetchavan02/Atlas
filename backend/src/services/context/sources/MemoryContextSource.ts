import type { IContextSource, ContextFreshness } from "../types.js";
import Memory from "../../../models/Memory.js";

export class MemoryContextSource implements IContextSource {
  id = "memory";
  name = "Memory Core";
  
  async getContext(intent: string | null) {
    if (!intent) return null;
    
    // Deterministic retrieval:
    // 1. Break intent into lowercase keywords (ignoring common stop words)
    const stopWords = new Set(["the", "a", "an", "is", "are", "do", "does", "should", "i", "my", "to", "for", "with", "on", "at", "what", "how", "why"]);
    const rawWords = intent.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
    const keywords = rawWords.filter(w => w.length > 2 && !stopWords.has(w));
    
    if (keywords.length === 0) return null;

    // 2. Query MongoDB for tags intersecting with these keywords OR content matching regex
    // We only want PREFERENCE, FACT, DECISION, PATTERN
    const regexPattern = keywords.join("|");
    
    const relevantMemories = await Memory.find({
      userId: "default",
      $or: [
        { tags: { $in: keywords } },
        { content: { $regex: new RegExp(regexPattern, "i") } }
      ]
    })
    .sort({ confidence: -1, lastRecalled: -1 })
    .limit(5);

    if (relevantMemories.length === 0) return null;

    // Update last recalled for relevance decay later
    const ids = relevantMemories.map(m => m._id);
    await Memory.updateMany({ _id: { $in: ids } }, { $set: { lastRecalled: new Date() } });

    return {
      relevantMemories: relevantMemories.map(m => ({
        type: m.type,
        content: m.content,
        confidence: m.confidence
      }))
    };
  }

  getFreshness(): ContextFreshness {
    return "LIVE"; // Computed live against intent
  }
}
