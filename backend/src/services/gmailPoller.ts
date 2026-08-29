import GmailAlert, { type GmailPriority } from "../models/GmailAlert.js";

// ─── Keyword priority map ─────────────────────────────────────────────────────
const KEYWORD_SCORES: Record<string, number> = {
  urgent: 40,
  asap: 38,
  "action required": 35,
  investor: 32,
  "term sheet": 30,
  deadline: 28,
  assignment: 22,
  meeting: 18,
  "follow up": 15,
  interview: 20,
  offer: 25,
  payment: 22,
  invoice: 18,
  overdue: 35,
  reminder: 10,
};

// ─── Mock sender pool (realistic names) ──────────────────────────────────────
const MOCK_SENDERS = [
  { name: "Rahul Sharma", email: "rahul.sharma@acmecorp.in" },
  { name: "Priya Mehta", email: "priya.mehta@ventures.io" },
  { name: "Prof. Desai", email: "n.desai@university.edu" },
  { name: "Atlas Noreply", email: "no-reply@atlasapp.io" },
  { name: "Yash Patel", email: "yash@startupxyz.com" },
  { name: "Shreya Kapoor", email: "shreya.kapoor@finance.co" },
  { name: "Dev Team", email: "dev@github.com" },
  { name: "Rohan Verma", email: "rohan.verma@client.net" },
];

const MOCK_SUBJECTS = [
  "URGENT: Investor demo prep — action required by EOD",
  "Assignment Submission Reminder — Due Friday",
  "Meeting Rescheduled: Q3 Planning sync",
  "Term sheet for review — needs your signature ASAP",
  "Quick catch-up? 15min call this week",
  "Invoice #INV-2048 is overdue",
  "New PR review request: feat/atlas-health-sync",
  "Follow up on yesterday's discussion",
  "Interview scheduled: Senior Engineer role — 2pm Thu",
  "Offer letter ready for review",
  "Deadline reminder: Project milestone due next Monday",
  "Payment confirmed — Atlas Pro subscription",
];

const MOCK_SNIPPETS = [
  "Hi Jeet, just following up on the slides for the investor demo. We need the deck updated before Thursday's...",
  "This is a reminder that your assignment is due this Friday at 11:59 PM IST. Please submit via the portal...",
  "Hi team, I'm rescheduling our planning meeting to 3pm on Thursday due to a conflict. Please confirm...",
  "Please find attached the term sheet from our partners. We need a countersignature by end of week to...",
  "Hey Jeet — would love to grab a quick 15 minute catch-up this week. Happy to work around your schedule...",
  "This is an automated reminder that invoice #INV-2048 for ₹14,500 is now 5 days overdue. Please process...",
  "A new PR has been opened requesting your review: feat/atlas-health-sync. 14 files changed...",
  "Following up on our conversation yesterday — did you get a chance to look at the proposal I sent...",
  "Your interview for the Senior Engineer role has been confirmed for this Thursday at 2:00 PM. Meeting link...",
  "Congratulations! Your offer letter is ready. Please log in to the portal to view and accept...",
  "Friendly reminder that your project milestone is due next Monday. Please update the status board...",
  "Your Atlas Pro subscription payment of ₹2,199 has been confirmed. Your next billing date is...",
];

/** Deterministic seeded pseudo-random for consistent mock data */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function computePriority(
  subject: string,
  snippet: string,
): {
  score: number;
  priority: GmailPriority;
  keywords: string[];
} {
  const combined = `${subject} ${snippet}`.toLowerCase();
  let score = 0;
  const found: string[] = [];

  for (const [kw, pts] of Object.entries(KEYWORD_SCORES)) {
    if (combined.includes(kw)) {
      score += pts;
      found.push(kw);
    }
  }

  let priority: GmailPriority = "medium";
  if (score >= 35) priority = "critical";
  else if (score >= 20) priority = "high";

  return { score, priority, keywords: found };
}

/** Generate a batch of mock emails that look realistic and timestamped */
export async function pollGmailInbox(userId = "default"): Promise<number> {
  // Determine how many new emails to simulate (0–3) based on time of day
  const hour = new Date().getHours();
  const seed = Date.now() % 1000;
  const count = hour >= 8 && hour <= 21 ? Math.floor(seededRandom(seed) * 3) + 1 : 0;

  let upserted = 0;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(seededRandom(seed + i * 7) * MOCK_SUBJECTS.length);
    const senderIdx = Math.floor(seededRandom(seed + i * 13) * MOCK_SENDERS.length);
    const subject = MOCK_SUBJECTS[idx];
    const snippet = MOCK_SNIPPETS[idx];
    const sender = MOCK_SENDERS[senderIdx];
    const { score, priority, keywords } = computePriority(subject, snippet);

    // Generate a unique-ish messageId (not actually from Gmail)
    const messageId = `mock_${userId}_${Date.now()}_${i}`;

    try {
      await GmailAlert.findOneAndUpdate(
        { messageId },
        {
          messageId,
          subject,
          sender: sender.name,
          senderEmail: sender.email,
          snippet,
          receivedAt: new Date(Date.now() - seededRandom(seed + i) * 3_600_000), // within last hour
          priority,
          priorityScore: score,
          keywords,
          isRead: false,
          userId,
        },
        { upsert: true, new: true },
      );
      upserted++;
    } catch {
      // duplicate key on race — harmless
    }
  }

  console.log(`[gmail-poller] Simulated ${upserted} new email(s) for user ${userId}`);
  return upserted;
}

/** Start background polling every 5 minutes */
export function startGmailPoller(intervalMs = 5 * 60 * 1000): void {
  pollGmailInbox("default").catch(console.error);
  setInterval(() => {
    pollGmailInbox("default").catch(console.error);
  }, intervalMs);
  console.log(`[gmail-poller] Started, polling every ${intervalMs / 60000} min`);
}
