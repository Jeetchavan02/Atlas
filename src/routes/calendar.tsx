import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalIcon, Plus, Clock } from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Atlas" },
      {
        name: "description",
        content:
          "Atlas Calendar: a calm view of today, this week, and the focus windows that matter.",
      },
      { property: "og:title", content: "Calendar — Atlas" },
      { property: "og:description", content: "Today, with intention." },
    ],
  }),
  component: CalendarPage,
});

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 12 }, (_, i) => 7 + i);

type Event = {
  day: number;
  start: number;
  end: number;
  title: string;
  color: string;
};

const events: Event[] = [
  { day: 0, start: 7, end: 8, title: "Morning run", color: "mint" },
  { day: 0, start: 10, end: 12, title: "Deep work · Atlas", color: "iris" },
  { day: 0, start: 14, end: 15, title: "1:1 — Maya", color: "cyan-glow" },
  { day: 1, start: 9, end: 10.5, title: "Investor call", color: "amber-glow" },
  { day: 1, start: 13, end: 15, title: "Design review", color: "iris" },
  { day: 2, start: 7.5, end: 8.5, title: "Gym · push", color: "mint" },
  { day: 2, start: 11, end: 13, title: "Deep work", color: "iris" },
  { day: 3, start: 10, end: 11, title: "Standup", color: "cyan-glow" },
  { day: 3, start: 16, end: 18, title: "Atlas demo prep", color: "iris" },
  { day: 4, start: 9, end: 10, title: "Yoga", color: "mint" },
  { day: 4, start: 14, end: 17, title: "Ship V1", color: "amber-glow" },
  { day: 5, start: 11, end: 13, title: "Coffee with Sam", color: "cyan-glow" },
  { day: 6, start: 18, end: 20, title: "Dinner — Mira", color: "iris" },
];

const today = [
  { time: "07:00", title: "Morning run", color: "mint" },
  { time: "09:30", title: "Daily review · Atlas", color: "iris" },
  { time: "10:00", title: "Deep work block", color: "iris" },
  { time: "14:00", title: "1:1 with Maya", color: "cyan-glow" },
  { time: "18:30", title: "Push workout", color: "amber-glow" },
];

function CalendarPage() {
  return (
    <>
      <PageHeader
        eyebrow="Week 27 · June 28 – Jul 4"
        title="Calendar"
        subtitle="Today, this week, and the focus windows that matter."
        right={
          <button className="flex items-center gap-2 rounded-2xl bg-[var(--gradient-iris)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] ring-1 ring-white/20">
            <Plus className="h-4 w-4" /> New event
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <section className="glass-card col-span-12 p-6 lg:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-iris" />
            <h2 className="text-base font-medium text-white">Today</h2>
            <span className="ml-auto font-mono text-[11px] text-white/50">
              5 events
            </span>
          </div>
          <ul className="space-y-3">
            {today.map((e) => (
              <li
                key={e.time}
                className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10"
              >
                <div className="text-center">
                  <div className="font-mono text-sm text-white">{e.time}</div>
                </div>
                <div
                  className={`h-10 w-0.5 rounded-full bg-${e.color}`}
                  style={{ boxShadow: `0 0 12px var(--color-${e.color})` }}
                />
                <div className="flex-1">
                  <div className="text-sm text-white">{e.title}</div>
                  <div className="flex items-center gap-1 text-[11px] text-white/50">
                    <Clock className="h-3 w-3" /> 60 min
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card col-span-12 p-6 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-white">This week</h2>
            <div className="flex gap-2 text-[11px]">
              <span className="glass-pill px-2.5 py-1 text-iris">Deep</span>
              <span className="glass-pill px-2.5 py-1 text-mint">Health</span>
              <span className="glass-pill px-2.5 py-1 text-cyan-glow">Social</span>
              <span className="glass-pill px-2.5 py-1 text-amber-glow">Priority</span>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px text-[11px]">
              <div />
              {days.map((d) => (
                <div
                  key={d}
                  className="pb-2 text-center font-mono uppercase tracking-widest text-white/50"
                >
                  {d}
                </div>
              ))}
              {hours.map((h) => (
                <div key={h} className="contents">
                  <div className="pr-2 text-right font-mono text-white/30">
                    {h.toString().padStart(2, "0")}
                  </div>
                  {days.map((_, di) => (
                    <div
                      key={di}
                      className="relative h-10 border-t border-white/5"
                    >
                      {events
                        .filter((e) => e.day === di && Math.floor(e.start) === h)
                        .map((e, i) => {
                          const top = (e.start - h) * 40;
                          const height = (e.end - e.start) * 40 - 2;
                          return (
                            <div
                              key={i}
                              className={`absolute inset-x-0.5 z-10 rounded-md bg-${e.color}/20 px-1.5 py-1 ring-1 ring-${e.color}/40`}
                              style={{
                                top,
                                height,
                                boxShadow: `0 4px 12px -4px var(--color-${e.color})`,
                              }}
                            >
                              <div className={`text-[10px] font-medium text-${e.color} truncate`}>
                                {e.title}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
