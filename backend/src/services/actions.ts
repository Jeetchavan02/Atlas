import { z } from "zod";
import Task from "../models/Task.js";
import { eventBus } from "./eventBus.js";

export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "DESTRUCTIVE";

// Action structure
export interface AtlasAction {
  name: string;
  description: string;
  parameters: z.ZodType<any, any>;
  riskLevel: ActionRiskLevel;
  handler: (params: any) => Promise<any>;
}

import { zodToJsonSchema } from "zod-to-json-schema";

export class ActionRegistry {
  private actions = new Map<string, AtlasAction>();

  register(action: AtlasAction) {
    this.actions.set(action.name, action);
  }

  getToolDefinitions() {
    return Array.from(this.actions.values()).map(action => {
      // Map zod schemas to JSON schema format for OpenAI/Groq function calling
      const schema = zodToJsonSchema(action.parameters, { target: "jsonSchema7" }) as any;
      
      // Cleanup unsupported properties
      if (schema.$schema) delete schema.$schema;
      if (schema.additionalProperties) delete schema.additionalProperties;

      return {
        type: "function",
        function: {
          name: action.name,
          description: `[Risk: ${action.riskLevel}] ${action.description}`,
          parameters: schema
        }
      };
    });
  }

  async execute(name: string, params: any): Promise<any> {
    const action = this.actions.get(name);
    if (!action) throw new Error(`Action ${name} not found`);

    let parsed;
    try {
      parsed = action.parameters.parse(params);
    } catch (e) {
      if (e instanceof z.ZodError) {
        const missingFields = e.errors.map(err => err.path.join('.')).join(', ');
        throw new Error(`Validation failed. Missing or invalid fields: ${missingFields}. You must provide all required fields.`);
      }
      throw e;
    }

    const result = await action.handler(parsed);

    eventBus.emitEvent("AI_ACTION_EXECUTED", { action: name, params: parsed, result }, "ACTION_REGISTRY");
    return result;
  }
}

export const registry = new ActionRegistry();

// ── Default Actions ──────────────────────────────────────────────────────────

registry.register({
  name: "tasks.create",
  description: "Create a new task in the user's todo list. DO NOT ask for due dates or projects. Only provide the title and priority.",
  riskLevel: "LOW",
  parameters: z.object({
    title: z.string().describe("REQUIRED. The title of the task."),
    priority: z.string().optional().default("med").describe("Priority level. Use 'high', 'med', or 'low'"),
    project: z.string().optional().describe("Only provide if user explicitly mentions: Atlas, Work, Health, or Personal"),
  }).passthrough(),
  handler: async (params) => {
    if (!params.title) {
      throw new Error("Missing required field: title");
    }

    let p = String(params.priority).toLowerCase();
    if (p.includes("high") || p.includes("urgent") || p.includes("important")) p = "high";
    else if (p.includes("low") || p.includes("minor")) p = "low";
    else p = "med";
    
    let proj = "Personal";
    if (params.project) {
      const parsedProj = String(params.project).toLowerCase();
      if (parsedProj.includes("atlas")) proj = "Atlas";
      else if (parsedProj.includes("work")) proj = "Work";
      else if (parsedProj.includes("health")) proj = "Health";
    }

    const task = await Task.create({
      userId: "default",
      title: params.title,
      priority: p,
      project: proj,
      dueDate: new Date(),
      category: params.category || proj,
      done: false,
    });
    eventBus.emitEvent("TASK_CREATED", task, "AI_ROUTER");
    return { success: true, taskId: task._id, message: "Task created." };
  },
});

registry.register({
  name: "tasks.complete",
  description: "Mark a specific task as complete. Provide EITHER the taskId OR the taskName.",
  riskLevel: "LOW",
  parameters: z.object({
    taskId: z.string().optional().describe("The MongoDB ObjectId of the task"),
    taskName: z.string().optional().describe("The name of the task if the ID is unknown"),
  }).passthrough(),
  handler: async (params) => {
    let task = null;
    if (params.taskId && params.taskId.length === 24) {
      task = await Task.findById(params.taskId);
    } else if (params.taskName || params.task) {
      const name = params.taskName || params.task;
      // Find the most recent incomplete task with this title
      task = await Task.findOne({ title: { $regex: new RegExp(name, 'i') }, done: false }).sort({ createdAt: -1 });
    }
    
    if (!task) throw new Error("Task not found to complete");
    
    task.done = true;
    await task.save();
    
    eventBus.emitEvent("TASK_COMPLETED", task, "AI_ROUTER");
    return { success: true, message: "Task completed." };
  },
});

registry.register({
  name: "memory.remember",
  description: "Save a persistent memory, fact, or preference about the user.",
  riskLevel: "LOW",
  parameters: z.object({
    type: z.enum(["PREFERENCE", "GOAL", "FACT", "PATTERN", "DECISION"]).describe("The category of the memory"),
    content: z.string().describe("The actual memory or fact to store"),
    tags: z.array(z.string()).describe("Keywords for easy retrieval"),
  }),
  handler: async (params) => {
    const MemoryModel = (await import("../models/Memory.js")).default;
    const memory = await MemoryModel.create({
      userId: "default",
      type: params.type,
      content: params.content,
      tags: params.tags,
    });
    eventBus.emitEvent("MEMORY_CREATED", memory, "AI_ROUTER");
    return { success: true, memoryId: memory._id, message: "Fact remembered." };
  },
});

registry.register({
  name: "memory.forget",
  description: "Delete a persistent memory by its ID.",
  riskLevel: "MEDIUM",
  parameters: z.object({
    memoryId: z.string().describe("The MongoDB ObjectId of the memory to delete"),
  }),
  handler: async (params) => {
    const MemoryModel = (await import("../models/Memory.js")).default;
    const memory = await MemoryModel.findByIdAndDelete(params.memoryId);
    if (!memory) throw new Error("Memory not found");
    eventBus.emitEvent("MEMORY_FORGOTTEN", memory, "AI_ROUTER");
    return { success: true, message: "Fact forgotten." };
  },
});

registry.register({
  name: "core.propose_action_plan",
  description: "Propose a multi-step action plan for the user to review. Use this when the user requests a complex orchestrating action (PLAN intent) or when executing HIGH/DESTRUCTIVE risk actions.",
  riskLevel: "LOW",
  parameters: z.object({
    title: z.string().describe("Short title of the plan"),
    description: z.string().describe("Explanation of why this plan is proposed and what it achieves"),
    steps: z.array(z.object({
      toolName: z.string().describe("The exact name of the registered tool to call"),
      parameters: z.any().optional().default({}).describe("The parameters to pass to the tool (use {} if none)"),
      description: z.string().describe("Human readable description of what this step does")
    })).describe("The sequence of actions to execute")
  }),
  handler: async (params) => {
    const { default: ActionPlan } = await import("../models/ActionPlan.js");
    
    const plan = await ActionPlan.create({
      userId: "default",
      title: params.title,
      description: params.description,
      steps: params.steps,
      status: "PROPOSED"
    });
    
    return {
      message: "Action plan proposed successfully. Waiting for user approval.",
      planId: plan._id
    };
  }
});
