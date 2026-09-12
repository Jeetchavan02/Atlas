import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock, Zap } from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Atlas OS" },
      { name: "description", content: "Atlas Calendar: schedule and time blocks." },
    ],
  }),
  component: CalendarPage,
});

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const events = [
  { day: 1, start: 9, duration: 1, title: "Daily Review", type: "system" },
  { day: 1, start: 10, duration: 1.5, title: "Deep Work — Atlas", type: "focus" },
  { day: 1, start: 14, duration: 0.5, title: "Sync with Maya", type: "meeting" },
  { day: 1, start: 18.5, duration: 1, title: "Gym: Push", type: "health" },
  { day: 3, start: 10, duration: 2, title: "Development", type: "focus" },
  { day: 5, start: 15, duration: 1, title: "Weekly Planning", type: "system" },
];

function CalendarPage() {
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const currentDay = (new Date().getDay() + 6) % 7; // Monday = 0

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Time orchestration."
        subtitle="Your schedule, focus blocks, and integrated events."
        right={
          <div className="glass-pill px-3 py-1.5 text-[11px] font-mono text-white/40">
            Demo Schedule
          </div>
        }
      />

      <div className="glass-card overflow-hidden">
        {/* Header Row */}
        <div className="flex border-b border-white/[0.05]">
          <div className="w-12 shrink-0 border-r border-white/[0.05] bg-white/[0.02] p-2" />
          {DAYS.map((day, i) => {
            const isToday = i === currentDay;
            return (
              <div
                key={day}
                className={`flex-1 border-r border-white/[0.05] p-2 text-center text-[12px] last:border-0 ${
                  isToday ? "bg-white/[0.04] text-white font-medium" : "text-white/50"
                }`}
              >
                {day}
                {isToday && (
                  <div className="mx-auto mt-1 h-0.5 w-4 rounded-full bg-iris" />
                )}
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        <div className="relative flex h-[600px] overflow-y-auto overflow-x-hidden">
          {/* Time Column */}
          <div className="w-12 shrink-0 border-r border-white/[0.05] bg-white/[0.01]">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex h-[60px] items-start justify-center border-b border-white/[0.03] pt-1"
              >
                <span className="font-mono text-[9px] text-white/30">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="relative flex flex-1">
            {/* Current time indicator line */}
            {currentHour >= 7 && currentHour <= 21 && (
              <div
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                style={{ top: `${(currentHour - 7) * 60}px` }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] -ml-[3px]" />
                <div className="h-[1px] w-full bg-red-500/50" />
              </div>
            )}

            {DAYS.map((_, dayIdx) => (
              <div
                key={dayIdx}
                className={`relative flex-1 border-r border-white/[0.03] last:border-0 ${
                  dayIdx === currentDay ? "bg-white/[0.015]" : ""
                }`}
              >
                {/* Hourly grid lines */}
                {HOURS.map((h) => (
                  <div key={h} className="h-[60px] border-b border-white/[0.03]" />
                ))}

                {/* Events for this day */}
                {events
                  .filter((e) => e.day === dayIdx)
                  .map((e, i) => {
                    const top = (e.start - 7) * 60;
                    const height = e.duration * 60;
                    
                    let bgClass = "bg-white/[0.06] border-white/10 text-white/70";
                    if (e.type === "focus") bgClass = "bg-[color-mix(in_oklab,var(--iris)_15%,transparent)] border-[color-mix(in_oklab,var(--iris)_30%,transparent)] text-[var(--iris)]";
                    if (e.type === "system") bgClass = "bg-white/[0.08] border-white/20 text-white";
                    if (e.type === "health") bgClass = "bg-[color-mix(in_oklab,var(--color-healthy)_15%,transparent)] border-[color-mix(in_oklab,var(--color-healthy)_30%,transparent)] text-[var(--color-healthy)]";

                    return (
                      <div
                        key={i}
                        className={`absolute left-1 right-1 rounded-[4px] border px-2 py-1 text-[11px] leading-tight overflow-hidden transition-all hover:brightness-110 ${bgClass}`}
                        style={{ top: `${top}px`, height: `${height - 2}px` }}
                      >
                        <div className="font-medium truncate">{e.title}</div>
                        {height > 30 && (
                          <div className="mt-0.5 font-mono text-[9px] opacity-70 truncate">
                            {e.duration * 60}m
                          </div>
                        )}
                        {e.type === "focus" && height > 45 && (
                          <Zap className="absolute bottom-1 right-1.5 h-3 w-3 opacity-50" />
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
