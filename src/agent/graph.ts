import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { AgentResult, AgentStep } from "../types";
import { agentTools } from "./tools";
import { createLLM } from "./llm";

const SYSTEM_PROMPT = `You are a proactive AI schedule manager for the app "fuckddl".
You help users manage their calendar through natural, friendly conversation. You take initiative to make scheduling effortless.

## Your capabilities:
- Create schedule events with start/end time, description, and reminders
- Create todo tasks with deadlines (no start time, only a "do by" date)
- Query schedules by date or keyword; query all todo tasks
- Update or cancel existing events and todos
- Delete events and todos
- Proactively summarize the user's day when appropriate

## Schedule vs Todo:
- **Schedule**: has a specific START time (e.g. "明天下午3点开会") → use create_schedule
- **Todo**: has only a DEADLINE, no specific start (e.g. "周五前完成报告", "记得买牛奶") → use create_todo
- When in doubt: if the user specifies a time → schedule. If they only specify a date or "before X" → todo.

## Core rules:
1. The current date context will be provided. Always use it to resolve relative dates like "tomorrow", "next Monday".
2. When creating events, always set a meaningful, concise title based on what the user said.
3. If the user specifies a time like "3pm", convert it to ISO 8601 (e.g. 2026-04-29T15:00:00).
4. If no end time is specified, default to 1 hour after start time.
5. When the user asks about their schedule without specifying a date, default to today.
6. When a user says "cancel X" or "remove X", first query to find matching events, then update or delete.
7. Keep responses concise and natural, in Chinese.
8. After completing an action, confirm in one short, natural sentence.

## Be proactive and smart:
9. When a user says something like "明天上午开会", you already have enough info — DO NOT ask for more. Create the event immediately with reasonable defaults:
  - Morning = 9:00-10:00, Afternoon = 14:00-15:00, Evening = 19:00-20:00
  - "开会" → title: "会议", "吃饭" → title: "晚餐", "健身" → title: "健身"
  - Default duration is 1 hour unless specified otherwise
10. Only ask a clarifying question when TRULY ambiguous:
  - "明天见人" → ask "上午还是下午？"
  - "下午有事" → this is querying, not creating. Query the schedule.
  - "明天开会" → create at 9:00-10:00 without asking
  - "下周找个时间" → ask "哪天比较方便？"
11. When the user says something like "今天有什么安排" or the app first opens, first query today's schedule, then present a natural summary.
12. After creating a schedule, also mention how many events are now on that day (e.g. "已添加。今天共3个日程").
13. If the user seems to be checking in (e.g. "我回来了", "开始工作"), proactively summarize today's remaining tasks.
14. Infer reminders: when user specifies a time like "3pm meeting", consider it important and add a 15-minute reminder. Don't ask — just do it.
15. For social events like "吃饭" or "聚会", set the duration to 2 hours instead of 1.

## Multi-turn behavior:
16. Only ask ONE clarifying question at a time. Never ask multiple questions.
17. If the user provides follow-up answers, use conversation history to fill in missing context and complete the original request.`;

function buildDateContext(): string {
  const now = new Date();
  return `Current date: ${now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })}`;
}

function buildMessages(
  userInput: string,
  history: Array<{ role: string; text: string }>,
  dateContext: string
) {
  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    new SystemMessage(dateContext),
  ];

  for (const entry of history) {
    if (entry.role === "user") {
      messages.push(new HumanMessage(entry.text));
    } else {
      messages.push(new AIMessage(entry.text));
    }
  }

  messages.push(new HumanMessage(userInput));
  return messages;
}

async function executeTools(
  toolCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }>
): Promise<ToolMessage[]> {
  const toolMessages: ToolMessage[] = [];

  for (const toolCall of toolCalls) {
    const tool = agentTools.find((t) => t.name === toolCall.name);
    if (tool) {
      try {
        const result = await (tool as any).invoke(toolCall.args);
        toolMessages.push(
          new ToolMessage({
            tool_call_id: toolCall.id!,
            content: result,
          })
        );
      } catch (e) {
        toolMessages.push(
          new ToolMessage({
            tool_call_id: toolCall.id!,
            content: JSON.stringify({
              success: false,
              error: String(e),
            }),
          })
        );
      }
    }
  }

  return toolMessages;
}

function getIntentLabel(toolName: string): string {
  if (toolName === "create_schedule") return "创建日程";
  if (toolName === "query_schedules") return "查询日程";
  if (toolName === "update_schedule") return "修改日程";
  if (toolName === "delete_schedule") return "删除日程";
  if (toolName === "create_todo") return "添加待办";
  if (toolName === "query_todos") return "查询待办";
  if (toolName === "update_todo") return "更新待办";
  if (toolName === "delete_todo") return "删除待办";
  return "处理中";
}

export async function runAgent(
  userInput: string,
  options?: {
    history?: Array<{ role: string; text: string }>;
    onProgress?: (step: AgentStep) => void;
  }
): Promise<AgentResult> {
  const { onProgress, history = [] } = options || {};
  const llm = createLLM();
  const llmWithTools = llm.bindTools(agentTools);
  const dateContext = buildDateContext();

  // Step 1: Understanding
  onProgress?.({ id: "understanding", label: "正在理解...", status: "active" });

  const messages = buildMessages(userInput, history, dateContext);
  const response = await llmWithTools.invoke(messages);
  const aiMsg = response as AIMessage;
  const toolCalls = aiMsg.tool_calls || [];

  onProgress?.({ id: "understanding", label: "已理解", status: "completed" });

  // No tool calls — chat or clarification, use response directly
  if (toolCalls.length === 0) {
    const content = typeof response.content === "string" ? response.content : "";
    const isQuestion =
      content.includes("?") ||
      content.includes("？") ||
      (content.length < 80 && content.length > 0);

    if (isQuestion) {
      return {
        intent: "clarify",
        action: "ask_question",
        question: content,
        requiresFollowUp: true,
        message: content,
        success: true,
      };
    }

    onProgress?.({ id: "completing", label: "已完成", status: "completed" });
    return {
      intent: "chat",
      action: "chat",
      message: content || "好的",
      success: true,
    };
  }

  // Step 2: Execute tools
  const intentTool = toolCalls[0];
  const intentLabel = getIntentLabel(intentTool.name);

  onProgress?.({ id: "executing", label: intentLabel, status: "active" });

  const toolMessages = await executeTools(toolCalls);

  onProgress?.({ id: "executing", label: intentLabel, status: "completed" });

  // Step 3: Build response from LLM's own text + tool results
  // The first LLM response already contains conversational text (e.g. "好的，我来创建明天上午的会议")
  // Use it directly instead of making a second LLM call — saves ~3-5 seconds
  const llmText = typeof response.content === "string" ? response.content : "";

  // If tool executed successfully, use the LLM's text as response
  // Otherwise make a quick second call for summary
  const firstToolResult = toolMessages[0];
  let finalContent: string;

  try {
    const parsed = JSON.parse(firstToolResult.content as string);
    if (parsed.success) {
      // Tool succeeded — use LLM's first response text directly
      finalContent = llmText || "已完成";
    } else {
      // Tool failed — compose error message
      finalContent = `操作失败：${parsed.error || "未知错误"}`;
    }
  } catch {
    finalContent = llmText || "已完成";
  }

  onProgress?.({ id: "completing", label: "已完成", status: "completed" });

  const intent = intentTool.name.replace("_schedule", "") as AgentResult["intent"];

  return {
    intent,
    action: intentTool.name,
    message: finalContent,
    success: true,
  };
}
