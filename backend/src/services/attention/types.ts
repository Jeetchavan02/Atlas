export type AttentionLevel = "SILENT" | "ACTIVITY" | "SURFACE" | "NOTIFY";

export interface AttentionDecision {
  decision: AttentionLevel;
  reason: string;
  triggerEventId?: string;
  dedupeKey?: string;
  expiresAt?: Date;
  suggestedActionId?: string;
  suggestedActionPayload?: any;
  title?: string;
  description?: string;
  evidence?: string[];
}
