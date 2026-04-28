import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import type { ScheduleEvent } from "../types";

export const createScheduleTool = tool(
  async ({ title, startTime, endTime, allDay, description, reminderBefore }) => {
    try {
      const event = await invoke<ScheduleEvent>("create_schedule", {
        title,
        startTime,
        endTime: endTime || null,
        allDay: allDay || false,
        description: description || null,
        reminderBefore: reminderBefore || null,
      });
      return JSON.stringify({ success: true, event });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "create_schedule",
    description:
      "Create a new schedule event. Use this when the user wants to add a new event to their calendar. Always infer the title, time, and any reminder preferences from the user's natural language.",
    schema: z.object({
      title: z.string().describe("Event title, concise and descriptive"),
      startTime: z
        .string()
        .describe(
          "Start time in ISO 8601 format, e.g. 2026-04-29T15:00:00. Infer the correct date and time from the user's words."
        ),
      endTime: z
        .string()
        .optional()
        .describe(
          "End time in ISO 8601. If not specified, default to 1 hour after start."
        ),
      allDay: z.boolean().optional().describe("Whether this is an all-day event"),
      description: z
        .string()
        .optional()
        .describe("Additional details, location, or notes"),
      reminderBefore: z
        .number()
        .optional()
        .describe("Minutes before the event to send a reminder"),
    }),
  }
);

export const querySchedulesTool = tool(
  async ({ date, keyword }) => {
    try {
      if (date) {
        const events = await invoke<ScheduleEvent[]>("get_schedules_by_date", {
          date,
        });
        return JSON.stringify({ success: true, events, total: events.length });
      }
      // For keyword search, get all events and filter (simplified)
      const events = await invoke<ScheduleEvent[]>("get_today_schedules");
      if (keyword) {
        const filtered = events.filter(
          (e: ScheduleEvent) =>
            e.title.includes(keyword) ||
            (e.description && e.description.includes(keyword))
        );
        return JSON.stringify({ success: true, events: filtered, total: filtered.length });
      }
      return JSON.stringify({ success: true, events, total: events.length });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "query_schedules",
    description:
      "Query schedule events. Use this when the user asks about their schedule, wants to know what's planned, or checks availability. Can query by date or by keyword.",
    schema: z.object({
      date: z
        .string()
        .optional()
        .describe("Date to query in YYYY-MM-DD format. Infer from user's words."),
      keyword: z
        .string()
        .optional()
        .describe("Keyword to search in event titles and descriptions"),
    }),
  }
);

export const updateScheduleTool = tool(
  async ({ eventId, title, startTime, endTime, status, description }) => {
    try {
      const event = await invoke<ScheduleEvent>("update_schedule", {
        eventId,
        title: title || null,
        startTime: startTime || null,
        endTime: endTime || null,
        status: status || null,
        description: description || null,
      });
      return JSON.stringify({ success: true, event });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "update_schedule",
    description:
      "Update an existing schedule event. Use this when the user wants to change, reschedule, cancel, or mark as done an existing event. First query to find the event ID if not provided.",
    schema: z.object({
      eventId: z.string().describe("The UUID of the event to update"),
      title: z.string().optional().describe("New title for the event"),
      startTime: z.string().optional().describe("New start time in ISO 8601"),
      endTime: z.string().optional().describe("New end time in ISO 8601"),
      status: z
        .enum(["pending", "done", "cancelled"])
        .optional()
        .describe("New status: 'done' for completed, 'cancelled' for cancelled"),
      description: z.string().optional().describe("New description"),
    }),
  }
);

export const deleteScheduleTool = tool(
  async ({ eventId }) => {
    try {
      const result = await invoke<boolean>("delete_schedule", { eventId });
      return JSON.stringify({ success: result });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "delete_schedule",
    description:
      "Delete a schedule event permanently. Use this when the user explicitly wants to remove an event.",
    schema: z.object({
      eventId: z.string().describe("The UUID of the event to delete"),
    }),
  }
);

// --- Todo tools ---

export const createTodoTool = tool(
  async ({ title, deadline, priority, estimatedMinutes, description }) => {
    try {
      const todo = await invoke<any>("create_todo", {
        title,
        deadline,
        priority: priority || null,
        estimatedMinutes: estimatedMinutes || null,
        description: description || null,
      });
      return JSON.stringify({ success: true, todo });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "create_todo",
    description:
      "Create a new todo task with a deadline. Use this when the user mentions a task that has a deadline but NO specific start time. E.g. '周五前完成报告' means deadline is Friday. Infer priority from urgency words like 'urgent', 'ASAP', '重要', '尽快'.",
    schema: z.object({
      title: z.string().describe("Todo title, concise and descriptive"),
      deadline: z
        .string()
        .describe("Deadline in ISO 8601 format. Infer from words like 'by Friday', 'before 5pm', '这周内'."),
      priority: z
        .enum(["high", "medium", "low"])
        .optional()
        .describe("Priority. Use 'high' for urgent/ASAP, 'medium' default, 'low' for trivial."),
      estimatedMinutes: z
        .number()
        .optional()
        .describe("Estimated completion time in minutes. Infer from words like 'quick', '大概一小时'."),
      description: z.string().optional().describe("Additional details"),
    }),
  }
);

export const queryTodosTool = tool(
  async ({}) => {
    try {
      const todos = await invoke<any[]>("get_todos");
      return JSON.stringify({ success: true, todos, total: todos.length });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "query_todos",
    description:
      "Query all todo tasks. Use this when the user asks about their todo list, pending tasks, or what they need to do.",
    schema: z.object({}),
  }
);

export const updateTodoTool = tool(
  async ({ todoId, title, deadline, priority, status, estimatedMinutes, description }) => {
    try {
      const todo = await invoke<any>("update_todo", {
        todoId,
        title: title || null,
        deadline: deadline || null,
        priority: priority || null,
        status: status || null,
        estimatedMinutes: estimatedMinutes || null,
        description: description || null,
      });
      return JSON.stringify({ success: true, todo });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "update_todo",
    description:
      "Update a todo task. Use this to mark as done, change deadline, update priority, etc. Query todos first to find the ID.",
    schema: z.object({
      todoId: z.string().describe("The UUID of the todo to update"),
      title: z.string().optional(),
      deadline: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      status: z.enum(["pending", "done", "cancelled"]).optional(),
      estimatedMinutes: z.number().optional(),
      description: z.string().optional(),
    }),
  }
);

export const deleteTodoTool = tool(
  async ({ todoId }) => {
    try {
      const result = await invoke<boolean>("delete_todo", { todoId });
      return JSON.stringify({ success: result });
    } catch (e) {
      return JSON.stringify({ success: false, error: String(e) });
    }
  },
  {
    name: "delete_todo",
    description: "Delete a todo task permanently.",
    schema: z.object({
      todoId: z.string().describe("The UUID of the todo to delete"),
    }),
  }
);

export const agentTools = [
  createScheduleTool,
  querySchedulesTool,
  updateScheduleTool,
  deleteScheduleTool,
  createTodoTool,
  queryTodosTool,
  updateTodoTool,
  deleteTodoTool,
];
