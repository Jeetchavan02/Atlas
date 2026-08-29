import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckSquare, Plus, Flag, Clock } from "lucide-react";
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
      { title: "Tasks — Atlas" },
      {
        name: "description",
        content:
          "Atlas Tasks: priorities, projects, and deep work — organized so today is obvious.",
      },
      { property: "og:title", content: "Tasks — Atlas" },
      { property: "og:description", content: "Priorities and deep work, organized." },
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
  high: "iris",
  med: "amber-glow",
  low: "mint",
};

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectCounts, setProjectCounts] = useState<number[]>([0, 0, 0, 0]);

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
        // Add task with mapped schema fields (due => dueLabel mapped in backend get route, we just manually map here)
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

        // Refresh project counts
        const pIndex = ["Atlas", "Work", "Health", "Personal"].indexOf(newTaskProject);
        if (pIndex !== -1) {
          setProjectCounts((prev) => {
            const next = [...prev];
            next[pIndex] = (next[pIndex] || 0) + 1;
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  useEffect(() => {
    fetch("http://localhost:4000/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks);
        if (data.stats?.projects) {
          setProjectCounts(data.stats.projects.map((p: { count: number }) => p.count));
        }
      })
      .catch(() => {});
  }, []);

  const toggle = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/tasks/${id}/toggle`, {
        method: "PATCH",
      });
      const data = await res.json();
      setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: data.task.done } : x)));
    } catch {
      // silently fail
    }
  };

  const completed = tasks.filter((t) => t.done).length;
  const today = tasks.filter((t) => t.due === "Today");
  const tomorrow = tasks.filter((t) => t.due === "Tomorrow");

  return (
    <>
      <PageHeader
        eyebrow="Today · 7 tasks"
        title="Tasks"
        subtitle="What deserves your attention now — nothing more."
        right={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 rounded-2xl bg-[var(--gradient-iris)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] ring-1 ring-white/20">
                <Plus className="h-4 w-4" /> New task
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to your pipeline. Organize by project and priority.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    placeholder="E.g. Ship v1.0 of Atlas dashboard"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newTaskProject} onValueChange={setNewTaskProject}>
                      <SelectTrigger id="project">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
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
                    <Select
                      value={newTaskPriority}
                      onValueChange={(val: "high" | "med" | "low") => setNewTaskPriority(val)}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
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
                    <SelectTrigger id="due">
                      <SelectValue placeholder="When is this due?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                      <SelectItem value="This Week">This Week</SelectItem>
                      <SelectItem value="Someday">Someday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Task</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        {/* Stats */}
        {[
          { label: "Today", value: today.length, hint: `${completed} done`, color: "iris" },
          {
            label: "High priority",
            value: tasks.filter((t) => t.priority === "high").length,
            hint: "Focus blocks",
            color: "amber-glow",
          },
          {
            label: "Active projects",
            value: 4,
            hint: "Atlas · Work · Health · Personal",
            color: "cyan-glow",
          },
          { label: "Streak", value: "12d", hint: "Daily review", color: "mint" },
        ].map((s) => (
          <section key={s.label} className="glass-card col-span-6 p-5 md:col-span-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
              {s.label}
            </div>
            <div className={`mt-2 font-display text-3xl font-light text-${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-white/60">{s.hint}</div>
          </section>
        ))}

        {/* Lists */}
        <section className="glass-card col-span-12 p-6 lg:col-span-8">
          <div className="mb-4 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-iris" />
            <h2 className="text-base font-medium text-white">Today</h2>
            <span className="ml-auto font-mono text-[11px] text-white/50">
              {completed}/{today.length} complete
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {today.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => toggle(t.id)}
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    t.done ? "border-iris bg-iris" : "border-white/20 hover:border-white/50"
                  }`}
                >
                  {t.done && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-6"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[14px] ${
                      t.done ? "text-white/40 line-through" : "text-white"
                    }`}
                  >
                    {t.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
                    <span>{t.project}</span>
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    <span>{t.due}</span>
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full bg-${priColor[t.priority]}/15 px-2.5 py-1 text-[10px] uppercase tracking-wider text-${priColor[t.priority]} ring-1 ring-${priColor[t.priority]}/30`}
                >
                  <Flag className="h-2.5 w-2.5" />
                  {t.priority}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card col-span-12 p-6 lg:col-span-4">
          <h2 className="mb-4 text-base font-medium text-white">Up next</h2>
          <ul className="space-y-3">
            {tomorrow.map((t) => (
              <li key={t.id} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-[13px] text-white">{t.title}</div>
                <div className="mt-1 text-[11px] text-white/50">
                  {t.project} · {t.due}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-mono uppercase tracking-widest text-white/50">
              Projects
            </h3>
            {["Atlas", "Work", "Health", "Personal"].map((p, i) => (
              <div key={p} className="flex items-center justify-between py-1.5 text-sm text-white">
                <span>{p}</span>
                <span className="font-mono text-[11px] text-white/50">
                  {projectCounts[i] ?? 0} active
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
