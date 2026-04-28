import { useState, useCallback, useRef } from "react";
import { runAgent } from "../agent/graph";
import { useSchedule } from "./useSchedule";
import { useTodos } from "./useTodos";
import type { AgentStep } from "../types";

export function useAgent() {
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const historyRef = useRef<Array<{ role: string; text: string }>>([]);
  const { fetchToday } = useSchedule();

  const sendMessage = useCallback(
    async (text: string, options?: { followUp?: boolean }) => {
      setProcessing(true);
      setResponse("");
      setCurrentQuestion(null);
      setSteps([]);

      try {
        const history = options?.followUp ? historyRef.current : [];

        const result = await runAgent(text, {
          history,
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

        if (result.requiresFollowUp && result.question) {
          setCurrentQuestion(result.question);
          historyRef.current = [
            ...history,
            { role: "user", text },
            { role: "assistant", text: result.question },
          ];
          setResponse(result.question);
        } else {
          setResponse(result.message || "好了");
          historyRef.current = [];
          await fetchToday();
          // Also refresh todos in case a todo was created/updated
          if (
            result.intent === "create_todo" ||
            result.intent === "update_todo" ||
            result.intent === "delete_todo"
          ) {
            useTodos.getState().fetchAll();
          }
        }
        return result;
      } catch (e) {
        const errMsg = `出错了：${String(e)}`;
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

  return {
    processing,
    response,
    steps,
    currentQuestion,
    sendMessage,
    resetConversation,
  };
}
