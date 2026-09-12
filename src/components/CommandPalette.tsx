/**
 * Command Palette — ⌘K
 *
 * Atlas system command interface. Three groups:
 *   ATLAS       — questions and commands to Atlas intelligence
 *   NAVIGATION  — go to a page
 *   (RECENT)    — future: recently used commands
 *
 * Extensible: add entries to the registry objects, not to the JSX.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home, Brain, CheckSquare, Wind, Dumbbell, Activity,
  Calendar, RefreshCw, Cpu, Zap, ArrowRight,
} from "lucide-react";
import { useGlobalChat } from "@/context/ChatContext";

// ── Command registry — add commands here, not in JSX ─────────────

type NavCommand = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
};

type AtlasCommand = {
  id: string;
  label: string;      // shown in list
  prompt: string;     // what actually gets sent to Atlas
};

const NAV_COMMANDS: NavCommand[] = [
  { id: "mission-control", label: "Mission Control", hint: "Home",        icon: Home       },
  { id: "atlas-ai",        label: "Atlas AI",        hint: "Intelligence", icon: Brain      },
  { id: "tasks",           label: "Tasks",           hint: "Priorities",   icon: CheckSquare },
  { id: "habits",          label: "Habits",          hint: "Rituals",      icon: Wind       },
  { id: "gym",             label: "Gym",             hint: "Training",     icon: Dumbbell   },
  { id: "health",          label: "Health",          hint: "Body",         icon: Activity   },
  { id: "calendar",        label: "Calendar",        hint: "Schedule",     icon: Calendar   },
  { id: "devices",         label: "Devices",         hint: "Hardware",     icon: RefreshCw  },
  { id: "memory",          label: "Memory",          hint: "Context",      icon: Cpu        },
  { id: "automations",     label: "Automations",     hint: "Rules",        icon: Zap        },
];

const NAV_ROUTES: Record<string, string> = {
  "mission-control": "/",
  "atlas-ai":        "/ai",
  "tasks":           "/tasks",
  "habits":          "/habits",
  "gym":             "/gym",
  "health":          "/health",
  "calendar":        "/calendar",
  "devices":         "/sync",
  "memory":          "/memory",
  "automations":     "/automations",
};

const ATLAS_COMMANDS: AtlasCommand[] = [
  { id: "plan-day",        label: "Plan my day",                  prompt: "Plan my day based on my current tasks, habits and health." },
  { id: "whats-next",      label: "What's important right now?",  prompt: "What's the most important thing I should focus on right now?" },
  { id: "recovery",        label: "Why is my recovery low?",      prompt: "Explain my current recovery status and what's affecting it." },
  { id: "what-changed",    label: "What changed today?",          prompt: "What has changed today across my health, tasks, and habits?" },
  { id: "prep-tomorrow",   label: "Prepare tomorrow",             prompt: "Help me prepare for tomorrow based on my schedule and current state." },
  { id: "week-summary",    label: "Summarize my week",            prompt: "Summarize my progress this week across health, habits, and tasks." },
];

// ── Component ─────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { sendMessage, openChat } = useGlobalChat();

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const runNavigate = useCallback(
    (id: string) => {
      setOpen(false);
      navigate({ to: NAV_ROUTES[id] as any });
    },
    [navigate],
  );

  const runAtlas = useCallback(
    (prompt: string) => {
      setOpen(false);
      // Open Atlas AI page and send message
      navigate({ to: "/ai" as any });
      // Slight delay so page can mount
      setTimeout(() => sendMessage(prompt), 120);
    },
    [navigate, sendMessage],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Navigate or ask Atlas…" />
      <CommandList>
        <CommandEmpty className="py-6 text-center text-[12px] text-white/30">
          No matches. Type a question to send to Atlas AI.
        </CommandEmpty>

        {/* ATLAS group */}
        <CommandGroup
          heading="Atlas"
          className="[&_[cmdk-group-heading]]:atlas-label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2"
        >
          {ATLAS_COMMANDS.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.label}
              onSelect={() => runAtlas(cmd.prompt)}
              className="group flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[12.5px] text-white/65 transition-colors aria-selected:bg-white/[0.06] aria-selected:text-white"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-iris/12 text-iris"
                aria-hidden
              >
                <span className="text-[9px] font-bold">A</span>
              </span>
              <span className="flex-1">{cmd.label}</span>
              <ArrowRight className="h-3 w-3 text-white/20 opacity-0 transition-opacity group-aria-selected:opacity-100" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="bg-white/[0.055]" />

        {/* NAVIGATION group */}
        <CommandGroup
          heading="Navigation"
          className="[&_[cmdk-group-heading]]:atlas-label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2"
        >
          {NAV_COMMANDS.map((cmd) => (
            <CommandItem
              key={cmd.id}
              value={cmd.label}
              onSelect={() => runNavigate(cmd.id)}
              className="group flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[12.5px] text-white/55 transition-colors aria-selected:bg-white/[0.06] aria-selected:text-white"
            >
              <cmd.icon className="h-3.5 w-3.5 shrink-0 text-white/30" />
              <span className="flex-1">{cmd.label}</span>
              {cmd.hint && (
                <span className="font-mono text-[10px] text-white/22">{cmd.hint}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Keyboard hints */}
      <div className="border-t border-white/[0.055] px-4 py-2">
        <p className="font-mono text-[9px] text-white/20">
          <kbd className="rounded bg-white/[0.06] px-1 py-0.5">↑↓</kbd> navigate ·{" "}
          <kbd className="rounded bg-white/[0.06] px-1 py-0.5">↵</kbd> select ·{" "}
          <kbd className="rounded bg-white/[0.06] px-1 py-0.5">esc</kbd> close
        </p>
      </div>
    </CommandDialog>
  );
}
