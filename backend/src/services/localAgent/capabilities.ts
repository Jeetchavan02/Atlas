import { z } from "zod";
import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { resolveSafePath, checkSymlinkEscape } from "./workspace.js";
import type { AtlasAction } from "../actions.js";

const execAsync = promisify(exec);

export const localAgentCapabilities: AtlasAction[] = [];

// ── Filesystem Capabilities ──────────────────────────────────────────────

localAgentCapabilities.push({
  name: "files.read",
  description: "Read the contents of a file within the workspace. Refuses access to sensitive files like .env.",
  riskLevel: "LOW",
  parameters: z.object({
    path: z.string().describe("Relative path to the file to read"),
  }),
  handler: async (params) => {
    const safePath = resolveSafePath(params.path);
    await checkSymlinkEscape(safePath);
    const content = await fs.readFile(safePath, "utf-8");
    return {
      success: true,
      capability: "files.read",
      summary: `Read ${params.path}`,
      data: {
        path: params.path,
        content,
      },
    };
  },
});

localAgentCapabilities.push({
  name: "files.search",
  description: "Search for files by name or content inside the workspace, excluding node_modules and .git.",
  riskLevel: "LOW",
  parameters: z.object({
    query: z.string().describe("Text or regex to search for in files"),
    filePattern: z.string().optional().describe("Optional glob pattern to restrict search (e.g., *.ts)"),
  }),
  handler: async (params) => {
    // Basic ripgrep or find equivalent. Since we don't have rg guaranteed, we'll use a safe child process `grep` or `find`.
    // Actually, it's safer to just run an explicitly constructed find/grep command that only looks inside the workspace root.
    const root = resolveSafePath(".");
    let cmd = `grep -rnI "${params.query.replace(/(["'$`\\])/g, '\\$1')}" ${root} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build`;
    if (params.filePattern) {
      cmd += ` --include="${params.filePattern.replace(/(["'$`\\])/g, '\\$1')}"`;
    }

    try {
      const { stdout } = await execAsync(cmd);
      // Clean up the output to make paths relative
      const cleanStdout = stdout.split('\\n').slice(0, 50).map(line => line.replace(root + '/', '')).join('\\n');
      return {
        success: true,
        capability: "files.search",
        summary: `Found matches for "${params.query}"`,
        data: { matches: cleanStdout },
      };
    } catch (err: any) {
      // Grep exits with 1 if no lines were found
      if (err.code === 1) {
        return { success: true, capability: "files.search", summary: "No matches found.", data: { matches: "" } };
      }
      throw new Error(`Search failed: ${err.message}`);
    }
  },
});

localAgentCapabilities.push({
  name: "files.create",
  description: "Create a new file in the workspace. Will not overwrite existing files. Requires approval.",
  riskLevel: "HIGH", // Elevated as per user request
  parameters: z.object({
    path: z.string().describe("Relative path where the file should be created"),
    content: z.string().describe("Content of the new file"),
  }),
  handler: async (params) => {
    const safePath = resolveSafePath(params.path);
    await checkSymlinkEscape(safePath);
    
    try {
      await fs.access(safePath);
      throw new Error("File already exists. Use files.edit to modify an existing file.");
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
    
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, params.content, "utf-8");
    
    return {
      success: true,
      capability: "files.create",
      summary: `Created file ${params.path}`,
      metadata: { affectedFiles: [params.path] },
    };
  },
});

localAgentCapabilities.push({
  name: "files.edit",
  description: "Overwrite the contents of an existing file. Returns previous and new content hashes. Requires approval.",
  riskLevel: "HIGH", // Elevated as per user request
  parameters: z.object({
    path: z.string().describe("Relative path to the file to edit"),
    content: z.string().describe("New content for the file"),
  }),
  handler: async (params) => {
    const safePath = resolveSafePath(params.path);
    await checkSymlinkEscape(safePath);
    
    const prevContent = await fs.readFile(safePath, "utf-8");
    const prevHash = crypto.createHash("sha256").update(prevContent).digest("hex");
    
    await fs.writeFile(safePath, params.content, "utf-8");
    const newHash = crypto.createHash("sha256").update(params.content).digest("hex");
    
    // We can also generate a unified diff here, but to keep dependencies light, we return hashes and paths.
    // For a real diff, we'd use the `diff` package or a simple git diff if it's a tracked file.
    let diff = "";
    try {
      const { stdout } = await execAsync(`git diff --no-index --color=never -U3 <(echo "${prevContent.replace(/(["'$`\\])/g, '\\$1')}") <(echo "${params.content.replace(/(["'$`\\])/g, '\\$1')}") || true`, { shell: "/bin/bash" });
      diff = stdout;
    } catch(e) {
      diff = "Diff unavailable";
    }

    return {
      success: true,
      capability: "files.edit",
      summary: `Edited file ${params.path}`,
      data: { path: params.path, prevHash, newHash, diff },
      metadata: { affectedFiles: [params.path] },
    };
  },
});

// ── Git Capabilities ─────────────────────────────────────────────────────

localAgentCapabilities.push({
  name: "git.status",
  description: "Get the current git status of the workspace.",
  riskLevel: "LOW",
  parameters: z.object({}),
  handler: async () => {
    const root = "/Users/jeetchavan/Downloads/atlas";
    const { stdout } = await execAsync("git status -s", { cwd: root });
    return { success: true, capability: "git.status", summary: "Git status retrieved", data: { status: stdout } };
  },
});

localAgentCapabilities.push({
  name: "git.diff",
  description: "Get the current git diff of the workspace.",
  riskLevel: "LOW",
  parameters: z.object({
    cached: z.boolean().optional().default(false).describe("If true, returns the staged diff"),
  }),
  handler: async (params) => {
    const root = "/Users/jeetchavan/Downloads/atlas";
    const cmd = params.cached ? "git diff --cached" : "git diff";
    const { stdout } = await execAsync(cmd, { cwd: root });
    return { success: true, capability: "git.diff", summary: "Git diff retrieved", data: { diff: stdout } };
  },
});

localAgentCapabilities.push({
  name: "git.log",
  description: "Get the recent git commit log.",
  riskLevel: "LOW",
  parameters: z.object({
    maxCount: z.number().optional().default(10).describe("Maximum number of commits to retrieve"),
  }),
  handler: async (params) => {
    const root = "/Users/jeetchavan/Downloads/atlas";
    const { stdout } = await execAsync(`git log -n ${params.maxCount} --oneline`, { cwd: root });
    return { success: true, capability: "git.log", summary: "Git log retrieved", data: { log: stdout } };
  },
});

localAgentCapabilities.push({
  name: "git.run_tests",
  description: "Run the approved test suite for the repository.",
  riskLevel: "LOW",
  parameters: z.object({}),
  handler: async () => {
    const root = "/Users/jeetchavan/Downloads/atlas";
    // We map this semantic capability to the explicit test command.
    try {
      const { stdout, stderr } = await execAsync("npm test", { cwd: root });
      return { success: true, capability: "git.run_tests", summary: "Tests passed", data: { output: stdout } };
    } catch (err: any) {
      return { success: false, capability: "git.run_tests", summary: "Tests failed", data: { error: err.message, output: err.stdout, stderr: err.stderr } };
    }
  },
});

// ── Terminal Capabilities ────────────────────────────────────────────────

const TERMINAL_ALLOWLIST = [
  "npm run build",
  "npm test",
  "npm run lint",
  "git status",
  "git diff",
  "git log",
  "node --version",
  "npm --version"
];

localAgentCapabilities.push({
  name: "terminal.run_safe",
  description: `Run an explicitly allowlisted terminal command. Available commands: ${TERMINAL_ALLOWLIST.join(", ")}`,
  riskLevel: "HIGH", // Requires approval
  parameters: z.object({
    command: z.string().describe("The exact allowlisted command to run"),
  }),
  handler: async (params) => {
    const cmd = params.command.trim();
    if (!TERMINAL_ALLOWLIST.includes(cmd)) {
      throw new Error(`Command "${cmd}" is not in the explicit allowlist. Allowed commands: ${TERMINAL_ALLOWLIST.join(", ")}`);
    }

    // Double check for chaining operators just in case a future allowlist item is weird
    if (/[;&|`]|\$\(/.test(cmd)) {
      throw new Error("Shell chaining operators are explicitly forbidden.");
    }

    const root = "/Users/jeetchavan/Downloads/atlas";
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: root });
      return { success: true, capability: "terminal.run_safe", summary: `Command executed: ${cmd}`, data: { stdout, stderr } };
    } catch (err: any) {
      return { success: false, capability: "terminal.run_safe", summary: `Command failed: ${cmd}`, error: err.message, data: { stdout: err.stdout, stderr: err.stderr } };
    }
  },
});

// ── Desktop Capabilities ─────────────────────────────────────────────────

const APP_ALLOWLIST = ["VS Code", "Visual Studio Code", "Code", "Cursor", "Chrome", "Safari", "Arc", "Terminal", "iTerm", "Warp", "Brave"];

localAgentCapabilities.push({
  name: "desktop.open_app",
  description: "Open an allowlisted desktop application.",
  riskLevel: "LOW",
  parameters: z.object({
    appName: z.string().describe("Name of the application to open (e.g. VS Code)"),
  }),
  handler: async (params) => {
    const isAllowed = APP_ALLOWLIST.some(allowed => params.appName.toLowerCase().includes(allowed.toLowerCase()));
    if (!isAllowed) {
      throw new Error(`App "${params.appName}" is not in the allowlist.`);
    }
    
    let safeName = params.appName;
    if (params.appName.toLowerCase().includes("code") || params.appName.toLowerCase().includes("vs code")) safeName = "Visual Studio Code";
    if (params.appName.toLowerCase().includes("cursor")) safeName = "Cursor";
    
    const root = "/Users/jeetchavan/Downloads/atlas";
    try {
      // Don't pass root to arbitrary apps, just open them
      await execAsync(`open -a "${safeName}"`);
      return { success: true, capability: "desktop.open_app", summary: `Opened ${safeName}` };
    } catch (err: any) {
      throw new Error(`Failed to open app: ${err.message}`);
    }
  },
});

localAgentCapabilities.push({
  name: "desktop.focus_app",
  description: "Bring an allowlisted application to the foreground.",
  riskLevel: "LOW",
  parameters: z.object({
    appName: z.string().describe("Name of the app to focus"),
  }),
  handler: async (params) => {
    const isAllowed = APP_ALLOWLIST.some(allowed => params.appName.toLowerCase().includes(allowed.toLowerCase()));
    if (!isAllowed) {
      throw new Error(`App "${params.appName}" is not in the allowlist.`);
    }
    try {
      await execAsync(`osascript -e 'tell application "${params.appName}" to activate'`);
      return { success: true, capability: "desktop.focus_app", summary: `Focused ${params.appName}` };
    } catch (err: any) {
      throw new Error(`Failed to focus app: ${err.message}`);
    }
  },
});

localAgentCapabilities.push({
  name: "desktop.get_active_app",
  description: "Get the name of the currently focused macOS application.",
  riskLevel: "LOW",
  parameters: z.object({}),
  handler: async () => {
    try {
      const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`);
      return { success: true, capability: "desktop.get_active_app", summary: `Active app is ${stdout.trim()}`, data: { activeApp: stdout.trim() } };
    } catch (err: any) {
      throw new Error(`Failed to get active app: ${err.message}`);
    }
  },
});

localAgentCapabilities.push({
  name: "desktop.type",
  description: "Simulate typing text into the currently active window. High Risk.",
  riskLevel: "HIGH",
  parameters: z.object({
    text: z.string().describe("The exact text to type"),
  }),
  handler: async (params) => {
    try {
      const safeText = params.text.replace(/(["\\])/g, '\\$1');
      await execAsync(`osascript -e 'tell application "System Events" to keystroke "${safeText}"'`);
      return { success: true, capability: "desktop.type", summary: `Typed ${params.text.length} characters` };
    } catch (err: any) {
      throw new Error(`Failed to type: ${err.message}`);
    }
  },
});

localAgentCapabilities.push({
  name: "desktop.press_key",
  description: "Simulate pressing a specific key (e.g. Return, Tab, Escape). High Risk.",
  riskLevel: "HIGH",
  parameters: z.object({
    key: z.enum(["return", "tab", "escape", "space", "delete"]).describe("The key to press"),
  }),
  handler: async (params) => {
    const keyCodes: Record<string, number> = {
      "return": 36,
      "tab": 48,
      "space": 49,
      "delete": 51,
      "escape": 53
    };
    try {
      await execAsync(`osascript -e 'tell application "System Events" to key code ${keyCodes[params.key]}'`);
      return { success: true, capability: "desktop.press_key", summary: `Pressed ${params.key}` };
    } catch (err: any) {
      throw new Error(`Failed to press key: ${err.message}`);
    }
  },
});

localAgentCapabilities.push({
  name: "desktop.hotkey",
  description: "Simulate pressing a keyboard shortcut. High Risk.",
  riskLevel: "HIGH",
  parameters: z.object({
    key: z.string().describe("The character key to press (e.g., 'c', 'v', 't')"),
    modifiers: z.array(z.enum(["command", "option", "control", "shift"])).describe("List of modifier keys"),
  }),
  handler: async (params) => {
    try {
      const safeKey = params.key.replace(/(["\\])/g, '\\$1');
      const mods = params.modifiers.map((m: string) => `${m} down`).join(", ");
      await execAsync(`osascript -e 'tell application "System Events" to keystroke "${safeKey}" using {${mods}}'`);
      return { success: true, capability: "desktop.hotkey", summary: `Pressed ${params.modifiers.join('+')}+${params.key}` };
    } catch (err: any) {
      throw new Error(`Failed to press hotkey: ${err.message}`);
    }
  },
});

localAgentCapabilities.push({
  name: "desktop.open_url",
  description: "Open a safe HTTPS URL in the default browser.",
  riskLevel: "LOW",
  parameters: z.object({
    url: z.string().describe("The URL to open"),
  }),
  handler: async (params) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(params.url);
    } catch (e) {
      throw new Error("Invalid URL format");
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error(`Unsafe protocol rejected: ${parsedUrl.protocol}`);
    }

    try {
      await execAsync(`open "${parsedUrl.href}"`);
      return { success: true, capability: "desktop.open_url", summary: `Opened ${parsedUrl.href}` };
    } catch (err: any) {
      throw new Error(`Failed to open URL: ${err.message}`);
    }
  },
});
