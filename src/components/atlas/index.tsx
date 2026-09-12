import type { ReactNode } from "react";

// ── SectionLabel ────────────────────────────────────────────────
export function SectionLabel({
  label,
  description,
  right,
}: {
  label: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="atlas-label">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-white/40">{description}</p>
        )}
      </div>
      {right}
    </div>
  );
}

// ── MetricRow ───────────────────────────────────────────────────
export function MetricRow({
  metrics,
}: {
  metrics: {
    label: string;
    value: string | number;
    unit?: string;
    color?: string;
  }[];
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="flex flex-col gap-0.5">
          <span className="atlas-label">{m.label}</span>
          <span
            className="font-display text-xl font-light leading-none text-white"
            style={m.color ? { color: `var(--color-${m.color})` } : {}}
          >
            {m.value}
            {m.unit && (
              <span className="ml-1 text-[11px] font-mono text-white/40">
                {m.unit}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── TimelineItem ────────────────────────────────────────────────
export function TimelineItem({
  time,
  title,
  subtitle,
  color = "iris",
  isNow = false,
}: {
  time: string;
  title: string;
  subtitle?: string;
  color?: string;
  isNow?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-2 ${isNow ? "opacity-100" : "opacity-70"}`}
    >
      <span className="w-12 shrink-0 font-mono text-[11px] text-white/50 text-right">
        {time}
      </span>
      <div
        className="h-6 w-0.5 shrink-0 rounded-full"
        style={{ background: `var(--color-${color})`, opacity: isNow ? 1 : 0.4 }}
      />
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] truncate ${isNow ? "text-white font-medium" : "text-white/80"}`}>
          {title}
        </div>
        {subtitle && (
          <div className="text-[11px] text-white/40">{subtitle}</div>
        )}
      </div>
      {isNow && (
        <span className="glass-pill px-2 py-0.5 text-[10px] atlas-label" style={{ color: `var(--color-${color})` }}>
          NOW
        </span>
      )}
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/30">
          {icon}
        </div>
      )}
      <p className="text-[14px] font-medium text-white/60">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-[12px] text-white/35">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── DataUnavailable ─────────────────────────────────────────────
export function DataUnavailable({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-white/30">
      <span className="font-mono">—</span>
      <span>{label} unavailable</span>
    </div>
  );
}

// ── StatusBadge ─────────────────────────────────────────────────
export type StatusLevel = "live" | "ok" | "warning" | "error" | "offline";

const statusConfig: Record<StatusLevel, { label: string; color: string }> = {
  live:    { label: "Live",    color: "var(--color-mint)" },
  ok:      { label: "OK",     color: "var(--color-mint)" },
  warning: { label: "Warning",color: "var(--color-amber-glow)" },
  error:   { label: "Error",  color: "oklch(0.65 0.22 25)" },
  offline: { label: "Offline",color: "oklch(1 0 0 / 0.25)" },
};

export function StatusBadge({ status }: { status: StatusLevel }) {
  const cfg = statusConfig[status];
  return (
    <span className="glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px]" style={{ color: cfg.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}
