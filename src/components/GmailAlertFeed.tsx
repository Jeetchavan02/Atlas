import { X, Mail, AlertTriangle, Info } from "lucide-react";
import { useGmailAlerts } from "@/hooks/useGmailAlerts";

const PRIORITY_CONFIG = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.6)]",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    icon: AlertTriangle,
    iconColor: "text-red-400",
  },
  high: {
    label: "High",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.5)]",
    border: "border-amber-400/30",
    bg: "bg-amber-400/10",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
  },
  medium: {
    label: "Medium",
    dot: "bg-cyan-400",
    glow: "",
    border: "border-white/10",
    bg: "bg-white/5",
    icon: Info,
    iconColor: "text-cyan-400",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function GmailAlertFeed() {
  const { alerts, totalUnread, isLoading, error, markRead } = useGmailAlerts();

  if (error || (isLoading && alerts.length === 0)) {
    return (
      <section className="glass-card col-span-12 p-6 lg:col-span-4">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-iris" />
          <h2 className="text-sm font-medium text-white">Inbox Alerts</h2>
        </div>
        <div className="flex h-24 items-center justify-center text-[11px] text-white/40">
          {isLoading ? "Connecting to backend…" : "Backend offline — start the server"}
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card col-span-12 p-6 lg:col-span-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Mail className="h-4 w-4 text-iris" />
            {totalUnread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
          <h2 className="text-sm font-medium text-white">Inbox Alerts</h2>
        </div>
        {totalUnread > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {totalUnread} unread
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center gap-2 text-center">
          <Mail className="h-6 w-6 text-white/20" />
          <p className="text-[12px] text-white/40">All clear — no priority emails</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((alert) => {
            const cfg = PRIORITY_CONFIG[alert.priority];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.messageId}
                className={`group relative overflow-hidden rounded-2xl border p-3.5 transition-all ${cfg.border} ${cfg.bg} ${cfg.glow}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ring-1 ${cfg.border}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot} ${cfg.glow}`}
                      />
                      <span className="truncate text-[11px] font-medium text-white">
                        {alert.sender}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-white/40">
                        {timeAgo(alert.receivedAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-white/90">
                      {alert.subject}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/50">{alert.snippet}</p>
                    {alert.keywords.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {alert.keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${cfg.bg} ${cfg.iconColor} ring-1 ${cfg.border}`}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => markRead(alert.messageId)}
                    aria-label="Dismiss alert"
                    className="shrink-0 rounded-lg p-1 text-white/30 opacity-0 transition-all hover:text-white/80 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
