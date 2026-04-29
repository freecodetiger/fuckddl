import { useState, useCallback, useRef } from "react";
import { runAgent } from "../agent/graph";
import { useSchedule } from "./useSchedule";
import { useTodos } from "./useTodos";
import type { AgentStep, AgentResult } from "../types";

interface ConversationItem {
  type: "user" | "ai-text" | "ai-tool";
  text: string;
  detail?: string;
  id: string;
}

export function useAgent() {
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<AgentResult["pendingConfirmation"]>(null);
  const [pendingTodo, setPendingTodo] = useState<AgentResult["pendingTodo"]>(null);
  const convRef = useRef<ConversationItem[]>([]);
  const historyRef = useRef<Array<{ role: string; text: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { fetchToday } = useSchedule();

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setProcessing(false);
    setSteps([]);
    setCurrentQuestion(null);
    historyRef.current = [];
    setShowDialog(false);
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string, options?: { followUp?: boolean }) => {
      // Abort any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setProcessing(true);
      setResponse("");
      setCurrentQuestion(null);
      setSteps([]);
      convRef.current = [];
      // Force React to render empty dialog before adding new items
      setConversation([]);
      setShowDialog(false);
      setTimeout(() => {
        setShowDialog(true);
      }, 50);

      try {
        const history = options?.followUp ? historyRef.current : [];

        const result = await runAgent(text, {
          history,
          signal: controller.signal,
          onConversation: (item) => {
            const ci: ConversationItem = { ...item, id: Math.random().toString(36).slice(2) };
            convRef.current = [...convRef.current, ci];
            setConversation([...convRef.current]);
          },
          onProgress: (step) => {
            setSteps((prev) => {
              const idx = prev.findIndex((s) => s.id === step.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = step;
                return updated;
              }
              return [...prev, step];
            });
          },
        });

        if (result.pendingConfirmation) {
          // Look up actual title from store — don't show UUID
          const pending = { ...result.pendingConfirmation };
          if (pending.type === "delete_schedule" || pending.type === "cancel_schedule") {
            const evt = useSchedule.getState().recentEvents.find(e => e.id === pending.id);
            if (evt) pending.title = evt.title;
          } else {
            const todo = useTodos.getState().todos.find(t => t.id === pending.id);
            if (todo) pending.title = todo.title;
          }
          setPendingConfirmation(pending);
          setResponse(pending.title ? `确认删除「${pending.title}」？` : "确认删除？");
          return result;
        }

        if (result.pendingTodo) {
          setPendingTodo(result.pendingTodo);
          setResponse(result.message || "请确认待办");
          return result;
        }

        if (result.requiresFollowUp && result.question) {
          setCurrentQuestion(result.question);
          historyRef.current = [
            ...history,
            { role: "user", text },
            { role: "assistant", text: result.question },
          ];
          setResponse(result.question);
          // Don't auto-close for follow-up questions
        } else {
          setResponse(result.message || "好了");
          historyRef.current = [];
          await fetchToday();
          setTimeout(() => setShowDialog(false), 8000);
          if (
            result.intent === "create_todo" ||
            result.intent === "update_todo" ||
            result.intent === "delete_todo"
          ) {
            useTodos.getState().fetchAll();
          }
        }
        return result;
      } catch (e: any) {
        if (e?.name === "AbortError" || e?.message?.includes("Aborted")) {
          setResponse("");
          setShowDialog(false);
          return { intent: "chat" as const, action: "abort", message: "", success: false };
        }
        const msg = String(e?.message || e);
        const errMsg = msg.includes("401") ? "API Key 无效，请更新设置中的 AI Key" : msg.includes("ENOTFOUND") || msg.includes("fetch") ? "无法连接 AI 服务" : `出错了：${msg}`;
        setResponse(errMsg);
        throw e;
      } finally {
        setProcessing(false);
      }
    },
    [fetchToday]
  );

  const resetConversation = useCallback(() => {
    historyRef.current = [];
    setCurrentQuestion(null);
    setSteps([]);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingConfirmation) return;
    try {
      if (pendingConfirmation.type === "cancel_schedule") {
        // Cancel = update status to "cancelled", NOT delete
        await useSchedule.getState().updateEvent(pendingConfirmation.id, { status: "cancelled" });
        await useSchedule.getState().fetchRecent();
        setResponse("已取消");
      } else if (pendingConfirmation.type === "delete_schedule") {
        await useSchedule.getState().deleteEvent(pendingConfirmation.id);
        await useSchedule.getState().fetchRecent();
        setResponse("已删除");
      } else {
        await useTodos.getState().deleteTodo(pendingConfirmation.id);
        useTodos.getState().fetchAll();
        setResponse("已删除");
      }
    } catch (e) {
      setResponse(`操作失败：${String(e)}`);
    }
    setPendingConfirmation(null);
  }, [pendingConfirmation, fetchToday]);

  const dismissConfirmation = useCallback(() => {
    setPendingConfirmation(null);
    setSteps([]);
  }, []);

  const confirmTodo = useCallback(async (data: {
    title: string;
    deadline: string;
    priority: string;
    estimatedMinutes?: number;
    description?: string;
  }) => {
    try {
      await useTodos.getState().createTodo(data);
      useTodos.getState().fetchAll();
      setResponse("已添加待办");
    } catch (e) {
      setResponse(`添加失败：${String(e)}`);
    }
    setPendingTodo(null);
  }, []);

  const dismissTodo = useCallback(() => {
    setPendingTodo(null);
    setSteps([]);
  }, []);

  return {
    processing,
    response,
    steps,
    conversation,
    showDialog,
    currentQuestion,
    pendingConfirmation,
    pendingTodo,
    sendMessage,
    cancel,
    closeDialog,
    confirmDelete,
    dismissConfirmation,
    confirmTodo,
    dismissTodo,
    resetConversation,
  };
}
