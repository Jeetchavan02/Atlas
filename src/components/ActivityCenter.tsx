import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useActivity,
  formatActivityTime,
  categoryColors,
  type Activity,
  type ActivityCategory,
} from "@/context/ActivityContext";
import { Bell, Trash2, CheckCircle2 } from "lucide-react";

const categoryLabels: Record<ActivityCategory, string> = {
  SYSTEM:      "System",
  HEALTH:      "Health",
  TASK:        "Task",
  CALENDAR:    "Calendar",
  FITNESS:     "Fitness",
  AI:          "AI",
  INTEGRATION: "Integration",
};

function ActivityItem({ activity }: { activity: Activity }) {
  const color = categoryColors[activity.category];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01] transition-colors -mx-2 px-2 rounded-md">
      <div className="mt-1 shrink-0">
        <div
          className="h-[6px] w-[6px] rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color }}
          >
            {categoryLabels[activity.category]}
          </span>
          <span className="font-mono text-[9px] text-white/30">
            {formatActivityTime(activity.timestamp)}
          </span>
        </div>
        <p className="text-[12.5px] leading-snug text-white/90">{activity.title}</p>
        {activity.description && (
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">{activity.description}</p>
        )}
      </div>
    </div>
  );
}

export function ActivityCenter({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { activities, unreadCount, markAllRead, clearAll } = useActivity();

  const handleOpen = (v: boolean) => {
    if (v) markAllRead();
    onOpenChange(v);
  };

  const today = activities.filter((a) => {
    const diff = Date.now() - a.timestamp.getTime();
    return diff < 24 * 60 * 60 * 1000;
  });
  const earlier = activities.filter((a) => {
    const diff = Date.now() - a.timestamp.getTime();
    return diff >= 24 * 60 * 60 * 1000;
  });

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent
        side="right"
        className="w-[340px] border-l border-white/[0.06] bg-[oklch(0.14_0.025_270/0.95)] backdrop-blur-2xl p-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-white/50" />
            <SheetTitle className="text-[13px] font-medium text-white/90">
              System Events
            </SheetTitle>
            {unreadCount > 0 && (
              <span className="ml-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-iris px-1.5 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={clearAll}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/70"
            title="Clear all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {activities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="mb-3 h-6 w-6 text-white/10" />
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">No events pending</p>
            </div>
          )}

          {today.length > 0 && (
            <div className="mb-6">
              <p className="atlas-label mb-2 border-b border-white/[0.04] pb-2">Today</p>
              {today.map((a) => (
                <ActivityItem key={a.id} activity={a} />
              ))}
            </div>
          )}

          {earlier.length > 0 && (
            <div>
              <p className="atlas-label mb-2 border-b border-white/[0.04] pb-2">Earlier</p>
              {earlier.map((a) => (
                <ActivityItem key={a.id} activity={a} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
