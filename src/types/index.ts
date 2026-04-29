export interface Reminder {
  id: string;
  event_id: string;
  remind_at: string; // ISO 8601
  type: "notification";
  triggered: boolean;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string; // ISO 8601
  end_time?: string; // ISO 8601
  all_day: boolean;
  status: "pending" | "done" | "cancelled";
  reminder: Reminder | null;
  created_at: string;
  updated_at: string;
  source: "voice" | "manual";
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  deadline: string;       // ISO 8601
  priority: "high" | "medium" | "low";
  status: "pending" | "done" | "cancelled";
  estimated_minutes?: number;
  created_at: string;
  updated_at: string;
  source: "voice" | "manual";
}

export interface SyncMeta {
  last_sync_at: string;
  last_commit_sha: string;
  repo_url: string;
  branch: string;
}

export interface AppConfig {
  github_token?: string;
  github_repo?: string;
  github_branch?: string;
  codex_api_url?: string;
  codex_api_key?: string;
  deepseek_api_key?: string;
  aliyun_stt_appkey?: string;
  aliyun_stt_token?: string;
}

export type ViewState = "today" | "calendar" | "settings" | "todos";

export type VoiceOrbState =
  | "idle"
  | "recording"
  | "processing"
  | "success"
  | "error";

// Step-flow visualization types
export type StepId = "listening" | "understanding" | "executing" | "completing";
export type StepStatus = "pending" | "active" | "completed" | "failed";

export interface AgentStep {
  id: StepId;
  label: string;
  status: StepStatus;
}

export interface AgentResult {
  intent: "create" | "query" | "update" | "delete" | "chat" | "clarify" | "create_todo" | "query_todos" | "update_todo" | "delete_todo";
  action: string;
  event?: ScheduleEvent;
  events?: ScheduleEvent[];
  message: string;
  success: boolean;
  question?: string;
  requiresFollowUp?: boolean;
  pendingConfirmation?: {
    type: "delete_schedule" | "delete_todo" | "cancel_schedule";
    id: string;
    title: string;
  };
  pendingTodo?: {
    title: string;
    deadline: string;
    priority: string;
    estimatedMinutes?: number;
    description?: string;
  };
}
