import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckSquare, Plus, Clock, Inbox, Circle } from "lucide-react";
import { PageHeader } from "@/components/atlas-shell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Atlas OS" },
      { name: "description", content: "Atlas Tasks: priorities and deep work, organized." },
      { property: "og:title", content: "Tasks — Atlas OS" },
    ],
  }),
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  project: string;
  priority: "high" | "med" | "low";
  due: string;
  done: boolean;
};

const priColor: Record<Task["priority"], string> = {
  high: "var(--color-attention)",
  med: "var(--iris)",
  low: "var(--color-healthy)",
};

const priLabel: Record<Task["priority"], string> = {
  high: "High",
  med: "Med",
  low: "Low",
};

type Tab = "today" | "upcoming" | "all";

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<Tab>("today");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("Personal");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "med" | "low">("med");
  const [newTaskDueLabel, setNewTaskDueLabel] = useState("Today");

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch("http://localhost:4000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          project: newTaskProject,
          priority: newTaskPriority,
          dueLabel: newTaskDueLabel,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const mappedTask: Task = {
          id: data.task._id,
          title: data.task.title,
          project: data.task.project,
          priority: data.task.priority,
          due: data.task.dueLabel,
          done: data.task.done,
        };
        setTasks((prev) => [mappedTask, ...prev]);
        setNewTaskTitle("");
        setNewTaskProject("Personal");
        setNewTaskPriority("med");
        setNewTaskDueLabel("Today");
        setIsDialogOpen(false);
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  useEffect(() => {
    fetch("http://localhost:4000/api/tasks")
      .then((r) => r.json())
      .then((data) => { setTasks(data.tasks); })
      .catch(() => {});
  }, []);

  const toggle = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/tasks/${id}/toggle`, { method: "PATCH" });
      const data = await res.json();
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: data.task.done } : x)));
    } catch { /* silent */ }
  };

  const today    = tasks.filter((t) => t.due === "Today");
  const upcoming = tasks.filter((t) => t.due !== "Today" && !t.done);
  const completed = tasks.filter((t) => t.done);

  const tabLists: Record<Tab, Task[]> = {
    today: today,
    upcoming: upcoming,
    all: tasks,
  };

  const displayTasks = tabLists[tab];
  const tabCounts: Record<Tab, number> = {
    today: today.length,
    upcoming: upcoming.length,
    all: tasks.length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Tasks"
        title="Execution layer."
        subtitle="Priorities, actions, and pipeline management."
        right={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                id="new-task-btn"
                className="flex items-center gap-2 rounded-lg bg-[var(--gradient-iris)] px-4 py-2 text-[12.5px] font-medium text-white shadow-[var(--shadow-glow-sm)] hover:opacity-90 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Create task
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
                <DialogDescription>Add a task to your pipeline.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="What needs doing?"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newTaskProject} onValueChange={setNewTaskProject}>
                      <SelectTrigger id="project"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Atlas">Atlas</SelectItem>
                        <SelectItem value="Work">Work</SelectItem>
                        <SelectItem value="Health">Health</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={newTaskPriority} onValueChange={(val: "high" | "med" | "low") => setNewTaskPriority(val)}>
                      <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="med">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due">When</Label>
                  <Select value={newTaskDueLabel} onValueChange={setNewTaskDueLabel}>
                    <SelectTrigger id="due"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="Someday">Someday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Add Task</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* Main List */}
        <div className="col-span-12 lg:col-span-8">
          {/* Tab bar */}
          <div className="mb-4 flex items-center gap-1 rounded-md bg-white/[0.03] p-1 w-fit border border-white/[0.06]">
            {(["today", "upcoming", "all"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] capitalize transition-all ${
                  tab === t
                    ? "bg-white/[0.08] text-white font-medium shadow-sm"
                    : "text-white/40 hover:text-white/65 hover:bg-white/[0.02]"
                }`}
              >
                {t === "today" ? "Today" : t === "upcoming" ? "Upcoming" : "All Tasks"}
                <span className="font-mono text-[10px] text-white/35">
                  {tabCounts[t]}
                </span>
              </button>
            ))}
          </div>

          <section className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-3.5 w-3.5 text-iris" />
                <p className="text-[13px] font-medium text-white capitalize">
                  {tab === "today" ? "Today" : tab === "upcoming" ? "Upcoming" : "All Tasks"}
                </p>
              </div>
              <span className="atlas-label">
                {displayTasks.filter((t) => t.done).length}/{displayTasks.length} done
              </span>
            </div>

            {displayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-6 w-6 text-white/20 mb-3" />
                <p className="text-[13px] font-medium text-white/60">
                  {tab === "today" ? "No tasks due today." : "No tasks found."}
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {displayTasks.map((t) => (
                  <div key={t.id} className="surface-row flex items-center gap-3 px-1 py-2.5">
                    <button
                      onClick={() => toggle(t.id)}
                      aria-label={t.done ? "Mark incomplete" : "Mark complete"}
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] transition-all ${
                        t.done
                          ? "bg-iris text-white"
                          : "border border-white/20 hover:border-white/40 bg-transparent"
                      }`}
                    >
                      {t.done && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12.5px] ${t.done ? "text-white/35 line-through" : "text-white"}`}>
                        {t.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/35">
                        <span>{t.project}</span>
                        <span className="opacity-50">·</span>
                        <Clock className="h-2.5 w-2.5" />
                        <span>{t.due}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Circle className="h-1.5 w-1.5 fill-current" style={{ color: priColor[t.priority] }} />
                      <span className="font-mono text-[9px] uppercase text-white/40 w-8 text-right">
                        {priLabel[t.priority]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <section className="surface-subtle p-5">
            <p className="atlas-label mb-3">Projects</p>
            <div className="space-y-0">
              {["Atlas", "Work", "Health", "Personal"].map((project) => {
                const count = tasks.filter((t) => t.project === project && !t.done).length;
                return (
                  <div
                    key={project}
                    className="flex items-center justify-between border-b border-white/[0.04] py-2.5 last:border-0 last:pb-0"
                  >
                    <span className="text-[12.5px] text-white/70">{project}</span>
                    <span className="font-mono text-[10px] text-white/35">{count} active</span>
                  </div>
                );
              })}
            </div>
          </section>

          {completed.length > 0 && (
            <section className="surface-subtle p-5">
              <p className="atlas-label mb-3">Completed Today</p>
              <div className="space-y-2">
                {completed.slice(0, 5).map((t) => (
                  <div key={t.id} className="text-[12px] text-white/30 line-through truncate">
                    {t.title}
                  </div>
                ))}
                {completed.length > 5 && (
                  <div className="text-[10px] font-mono text-white/20 pt-2">
                    + {completed.length - 5} more
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
