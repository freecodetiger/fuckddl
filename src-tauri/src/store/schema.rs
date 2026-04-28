use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub event_id: String,
    pub remind_at: String,
    #[serde(rename = "type")]
    pub reminder_type: String,
    pub triggered: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleEvent {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub start_time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_time: Option<String>,
    pub all_day: bool,
    pub status: String, // "pending" | "done" | "cancelled"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reminder: Option<Reminder>,
    pub created_at: String,
    pub updated_at: String,
    pub source: String, // "voice" | "manual"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncMeta {
    pub last_sync_at: String,
    pub last_commit_sha: String,
    pub repo_url: String,
    pub branch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodoItem {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub deadline: String,       // ISO 8601 — required deadline
    pub priority: String,       // "high" | "medium" | "low"
    pub status: String,         // "pending" | "done" | "cancelled"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_minutes: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    pub source: String,         // "voice" | "manual"
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub github_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub github_repo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codex_api_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub codex_api_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", alias = "aliyun_stt_appkey")]
    pub aliyun_stt_key: Option<String>,
}
