import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  userInput: Annotation<string>({
    reducer: (_, newValue) => newValue,
    default: () => "",
  }),
  intent: Annotation<"create" | "query" | "update" | "delete" | "chat" | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
  extractedEntities: Annotation<{
    title?: string;
    datetime?: string;
    end_datetime?: string;
    duration?: number;
    eventId?: string;
    keyword?: string;
    date?: string;
    reminderBefore?: number;
    description?: string;
    newStatus?: string;
  }>({
    reducer: (_, newValue) => newValue,
    default: () => ({}),
  }),
  actionResult: Annotation<{
    success: boolean;
    message: string;
    data?: unknown;
  }>({
    reducer: (_, newValue) => newValue,
    default: () => ({ success: false, message: "" }),
  }),
  response: Annotation<string>({
    reducer: (_, newValue) => newValue,
    default: () => "",
  }),
});
