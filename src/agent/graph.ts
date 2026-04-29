import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import type { AgentResult, AgentStep } from "../types";
import { agentTools } from "./tools";

function createLLM(): ChatOpenAI {
  const baseURL = localStorage.getItem("codex_api_url") || "";
  const apiKey = localStorage.getItem("codex_api_key") || "";
  if (!baseURL || !apiKey) {
    console.warn("[LLM] Config missing — use settings to configure AI service");
  }
  return new ChatOpenAI({ model: "gpt-5.4", temperature: 0.3, apiKey, configuration: { baseURL } });
}

const SYSTEM_PROMPT = `你是日程管理助手。直接调用工具，不要解释。

规则：
- 创建日程 startTime/endTime 用 ISO 8601 格式。未指定则默认 1h，上午=9:00，下午=14:00，晚上=19:00
- 取消/修改：先 query_schedules 查找，再用 update_schedule 逐个处理。取消=status:"cancelled"
- 删除：用 delete_schedule，仅用户明确说"删除"时
- 回复简短友好，中文。完成后说一句确认，如"已创建~"`;

function buildDateContext(): string {
  const now = new Date();
  return now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

async function executeTools(
  toolCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }>
): Promise<ToolMessage[]> {
  const toolMessages: ToolMessage[] = [];
  for (const tc of toolCalls) {
    const tool = agentTools.find((t) => t.name === tc.name);
    if (tool) {
      try {
        const result = await (tool as any).invoke(tc.args);
        toolMessages.push(new ToolMessage({ tool_call_id: tc.id!, content: result }));
      } catch (e) {
        toolMessages.push(new ToolMessage({ tool_call_id: tc.id!, content: JSON.stringify({ success: false, error: String(e) }) }));
      }
    }
  }
  return toolMessages;
}

function getIntentLabel(toolName: string): string {
  const map: Record<string, string> = {
    create_schedule: "创建日程", query_schedules: "查询日程",
    update_schedule: "修改日程", delete_schedule: "删除日程",
    create_todo: "添加待办", query_todos: "查询待办",
    update_todo: "更新待办", delete_todo: "删除待办",
  };
  return map[toolName] || "处理中";
}

export interface ConversationStep {
  type: "user" | "ai-text" | "ai-tool";
  text: string;
  detail?: string;
}

export async function runAgent(
  userInput: string,
  options?: {
    history?: Array<{ role: string; text: string }>;
    onProgress?: (step: AgentStep) => void;
    onConversation?: (step: ConversationStep) => void;
    signal?: AbortSignal;
  }
): Promise<AgentResult> {
  const { onProgress, history = [], onConversation, signal } = options || {};
  const checkAborted = () => { if (signal?.aborted) throw new DOMException("Aborted", "AbortError"); };

  try {
    checkAborted();
    const llm = createLLM();
    const llmWithTools = llm.bindTools(agentTools);
    const dateContext = buildDateContext();

    onConversation?.({ type: "user", text: userInput });

    let messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
      new SystemMessage(SYSTEM_PROMPT),
      new SystemMessage(`当前日期：${dateContext}`),
      ...history.map(e => e.role === "user" ? new HumanMessage(e.text) : new AIMessage(e.text)),
      new HumanMessage(userInput),
    ];

    let primaryIntent = "chat";
    let firstAction = "";
    let allText = "";
    let pendingConfirmation: AgentResult["pendingConfirmation"];
    let pendingTodo: AgentResult["pendingTodo"];

    const MAX_LOOPS = 5;
    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      checkAborted();

      onProgress?.({ id: "understanding", label: loop === 0 ? "正在理解..." : "继续处理...", status: "active" });

      const response = await llmWithTools.invoke(messages, { signal });
      const aiMsg = response as AIMessage;
      const toolCalls = aiMsg.tool_calls || [];
      const content = (typeof response.content === "string" ? response.content : "") ||
                      ((response as any).reasoning_content as string)?.slice(-120) || "";
      console.log(`[Agent] loop=${loop} content="${content.slice(0,60)}" tools=${toolCalls.length}`);

      onProgress?.({ id: "understanding", label: "已理解", status: "completed" });

      // No tool calls — done
      if (toolCalls.length === 0) {
        const isQuestion = content.includes("?") || content.includes("？");
        const reply = content || (primaryIntent !== "chat" ? getIntentLabel(firstAction) + "完成~" : "有什么可以帮你的？");
        if (reply && reply !== allText) {
          onConversation?.({ type: "ai-text", text: reply });
        }
        onProgress?.({ id: "completing", label: "已完成", status: "completed" });
        return {
          intent: isQuestion ? "clarify" : primaryIntent as any,
          action: firstAction || "chat",
          question: isQuestion ? content : undefined,
          requiresFollowUp: isQuestion,
          message: reply,
          success: true,
          pendingConfirmation, pendingTodo,
        };
      }

      // Check for delete confirmation
      for (const tc of toolCalls) {
        if (tc.name === "delete_schedule" || tc.name === "delete_todo") {
          const args = tc.args as any;
          onProgress?.({ id: "completing", label: "需要确认", status: "completed" });
          return {
            intent: "delete" as any, action: tc.name,
            message: `确认删除？`, success: true,
            pendingConfirmation: { type: tc.name === "delete_schedule" ? "delete_schedule" : "delete_todo", id: args.eventId || args.todoId || "", title: args.eventId || args.todoId || "" },
          };
        }
        // Cancel (update with status="cancelled") — needs confirmation too
        if (tc.name === "update_schedule" && (tc.args as any)?.status === "cancelled") {
          const args = tc.args as any;
          onProgress?.({ id: "completing", label: "需要确认", status: "completed" });
          return {
            intent: "update" as any, action: tc.name,
            message: "确认取消这个日程？", success: true,
            pendingConfirmation: { type: "cancel_schedule", id: args.eventId || "", title: args.eventId || "" },
          };
        }
        if (tc.name === "create_todo" && !pendingTodo) {
          const args = tc.args as any;
          onProgress?.({ id: "completing", label: "请确认", status: "completed" });
          return {
            intent: "create_todo" as any, action: tc.name,
            message: "请确认待办信息", success: true,
            pendingTodo: { title: args.title || "", deadline: args.deadline || "", priority: args.priority || "medium", estimatedMinutes: args.estimatedMinutes, description: args.description },
          };
        }
      }

      // Track intent
      const curIntent = toolCalls[0].name.replace("_schedule", "").replace("_todo", "");
      if (!firstAction) { primaryIntent = curIntent; firstAction = toolCalls[0].name; }
      if (curIntent === "create" || curIntent === "update" || curIntent === "delete") primaryIntent = curIntent;

      // Show tool calls in conversation
      for (const tc of toolCalls) {
        const args = tc.args as any;
        onConversation?.({ type: "ai-tool", text: getIntentLabel(tc.name), detail: args.title || args.eventId || args.todoId || "" });
      }

      // Execute
      const label = getIntentLabel(toolCalls[0].name);
      onProgress?.({ id: "executing", label: `${label} (${toolCalls.length}项)`, status: "active" });
      const toolMessages = await executeTools(toolCalls);
      console.log("[Agent] executed", toolCalls.length, "tools:", toolMessages.map(tm => { try { const p = JSON.parse(tm.content as string); return p.success ? "OK" : "FAIL:"+p.error; } catch { return "?"; } }));
      onProgress?.({ id: "executing", label: `${label} (${toolCalls.length}项)`, status: "completed" });

      // Feed back to LLM for next loop
      messages.push(aiMsg);
      for (const tm of toolMessages) messages.push(tm);
    }

    // Max loops
    onProgress?.({ id: "completing", label: "已完成", status: "completed" });
    return { intent: primaryIntent as any, action: firstAction || "chat", message: allText || "已完成", success: true, pendingConfirmation, pendingTodo };
  } catch (e: any) {
    if (e?.name === "AbortError") throw e;
    throw e;
  }
}
