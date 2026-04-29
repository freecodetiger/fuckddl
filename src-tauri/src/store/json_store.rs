use crate::store::schema::{AppConfig, Reminder, ScheduleEvent, SyncMeta, TodoItem};
use chrono::Datelike;
use std::fs;
use std::path::PathBuf;

fn app_data_dir() -> PathBuf {
    dirs::data_dir()
        .expect("Failed to find app data directory")
        .join("fuckddl")
}

fn events_dir() -> PathBuf {
    app_data_dir().join("events")
}

fn reminders_dir() -> PathBuf {
    app_data_dir().join("reminders")
}

fn todos_dir() -> PathBuf {
    app_data_dir().join("todos")
}

fn event_path(year: i32, month: u32, event_id: &str) -> PathBuf {
    events_dir()
        .join(year.to_string())
        .join(format!("{:02}", month))
        .join(format!("{}.json", event_id))
}

fn reminder_path(reminder_id: &str) -> PathBuf {
    reminders_dir().join(format!("{}.json", reminder_id))
}

pub fn ensure_dirs() -> std::io::Result<()> {
    fs::create_dir_all(events_dir())?;
    fs::create_dir_all(reminders_dir())?;
    fs::create_dir_all(todos_dir())?;
    Ok(())
}

// --- Events ---

pub fn save_event(event: &ScheduleEvent) -> std::io::Result<()> {
    let dt = chrono::NaiveDateTime::parse_from_str(&event.start_time, "%Y-%m-%dT%H:%M:%S")
        .or_else(|_| chrono::NaiveDate::parse_from_str(&event.start_time, "%Y-%m-%d")
            .map(|d| d.and_hms_opt(0, 0, 0).unwrap()))
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()))?;
    let path = event_path(dt.year(), dt.month(), &event.id);
    fs::create_dir_all(path.parent().unwrap())?;
    let json = serde_json::to_string_pretty(event)?;
    fs::write(&path, json)?;
    Ok(())
}

pub fn read_event(event_id: &str) -> Option<ScheduleEvent> {
    // Search through year/month directories
    let events_root = events_dir();
    if !events_root.exists() { return None; }

    for year_entry in fs::read_dir(&events_root).ok()? {
        let year_dir = year_entry.ok()?.path();
        if !year_dir.is_dir() { continue; }
        for month_entry in fs::read_dir(&year_dir).ok()? {
            let month_dir = month_entry.ok()?.path();
            if !month_dir.is_dir() { continue; }
            let file_path = month_dir.join(format!("{}.json", event_id));
            if file_path.exists() {
                let content = fs::read_to_string(&file_path).ok()?;
                return serde_json::from_str(&content).ok();
            }
        }
    }
    None
}

pub fn read_events_by_date(date_str: &str) -> Vec<ScheduleEvent> {
    let dt = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d");
    if dt.is_err() { return vec![]; }
    let dt = dt.unwrap();
    let path = event_path(dt.year(), dt.month(), "");
    let dir = path.parent().unwrap();
    if !dir.exists() { return vec![]; }

    let mut events: Vec<ScheduleEvent> = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(event) = serde_json::from_str::<ScheduleEvent>(&content) {
                    // Check if event falls on the given date
                    let event_date = event.start_time[..10].to_string();
                    if event_date == date_str {
                        events.push(event);
                    }
                }
            }
        }
    }
    events.sort_by_key(|e| e.start_time.clone());
    events
}

pub fn read_all_events() -> Vec<ScheduleEvent> {
    let mut events = Vec::new();
    let events_root = events_dir();
    if !events_root.exists() { return events; }

    if let Ok(year_entries) = fs::read_dir(&events_root) {
        for year_entry in year_entries.flatten() {
            if let Ok(month_entries) = fs::read_dir(year_entry.path()) {
                for month_entry in month_entries.flatten() {
                    if let Ok(file_entries) = fs::read_dir(month_entry.path()) {
                        for file_entry in file_entries.flatten() {
                            if let Ok(content) = fs::read_to_string(file_entry.path()) {
                                if let Ok(event) = serde_json::from_str::<ScheduleEvent>(&content) {
                                    events.push(event);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    events.sort_by_key(|e| e.start_time.clone());
    events
}

pub fn read_recent_events(days: i64) -> Vec<ScheduleEvent> {
    let cutoff = chrono::Local::now() - chrono::Duration::days(days);
    let mut events = Vec::new();
    let events_root = events_dir();
    if !events_root.exists() { return events; }

    if let Ok(year_entries) = fs::read_dir(&events_root) {
        for year_entry in year_entries.flatten() {
            if let Ok(month_entries) = fs::read_dir(year_entry.path()) {
                for month_entry in month_entries.flatten() {
                    if let Ok(file_entries) = fs::read_dir(month_entry.path()) {
                        for file_entry in file_entries.flatten() {
                            if let Ok(content) = fs::read_to_string(file_entry.path()) {
                                if let Ok(event) = serde_json::from_str::<ScheduleEvent>(&content) {
                                    if let Ok(updated) = chrono::NaiveDateTime::parse_from_str(
                                        &event.updated_at,
                                        "%Y-%m-%dT%H:%M:%S",
                                    ) {
                                        if updated >= cutoff.naive_local() {
                                            events.push(event);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    events.sort_by_key(|e| e.updated_at.clone());
    events.reverse(); // most recent first
    events
}

pub fn delete_event(event_id: &str) -> std::io::Result<bool> {
    let events_root = events_dir();
    if !events_root.exists() { return Ok(false); }

    for year_entry in fs::read_dir(&events_root)? {
        let year_dir = year_entry?.path();
        if !year_dir.is_dir() { continue; }
        for month_entry in fs::read_dir(&year_dir)? {
            let month_dir = month_entry?.path();
            if !month_dir.is_dir() { continue; }
            let file_path = month_dir.join(format!("{}.json", event_id));
            if file_path.exists() {
                fs::remove_file(&file_path)?;
                return Ok(true);
            }
        }
    }
    Ok(false)
}

// --- Reminders ---

pub fn save_reminder(reminder: &Reminder) -> std::io::Result<()> {
    let path = reminder_path(&reminder.id);
    fs::create_dir_all(path.parent().unwrap())?;
    let json = serde_json::to_string_pretty(reminder)?;
    fs::write(&path, json)?;
    Ok(())
}

pub fn read_reminder(reminder_id: &str) -> Option<Reminder> {
    let path = reminder_path(reminder_id);
    if path.exists() {
        let content = fs::read_to_string(&path).ok()?;
        return serde_json::from_str(&content).ok();
    }
    None
}

pub fn read_pending_reminders() -> Vec<Reminder> {
    let mut reminders = Vec::new();
    let dir = reminders_dir();
    if !dir.exists() { return reminders; }

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(reminder) = serde_json::from_str::<Reminder>(&content) {
                    if !reminder.triggered {
                        reminders.push(reminder);
                    }
                }
            }
        }
    }
    reminders
}

pub fn delete_reminder(reminder_id: &str) -> std::io::Result<()> {
    let path = reminder_path(reminder_id);
    if path.exists() {
        fs::remove_file(&path)?;
    }
    Ok(())
}

// --- Sync Meta ---

pub fn save_sync_meta(meta: &SyncMeta) -> std::io::Result<()> {
    let path = app_data_dir().join("sync_meta.json");
    let json = serde_json::to_string_pretty(meta)?;
    fs::write(&path, json)?;
    Ok(())
}

pub fn read_sync_meta() -> Option<SyncMeta> {
    let path = app_data_dir().join("sync_meta.json");
    if path.exists() {
        let content = fs::read_to_string(&path).ok()?;
        return serde_json::from_str(&content).ok();
    }
    None
}

// --- Todos ---

fn todo_path(todo_id: &str) -> PathBuf {
    todos_dir().join(format!("{}.json", todo_id))
}

pub fn save_todo(todo: &TodoItem) -> std::io::Result<()> {
    let path = todo_path(&todo.id);
    fs::create_dir_all(path.parent().unwrap())?;
    let json = serde_json::to_string_pretty(todo)?;
    fs::write(&path, json)?;
    Ok(())
}

pub fn read_todo(todo_id: &str) -> Option<TodoItem> {
    let path = todo_path(todo_id);
    if path.exists() {
        let content = fs::read_to_string(&path).ok()?;
        return serde_json::from_str(&content).ok();
    }
    None
}

pub fn read_all_todos() -> Vec<TodoItem> {
    let mut todos = Vec::new();
    let dir = todos_dir();
    if !dir.exists() {
        return todos;
    }
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if let Ok(todo) = serde_json::from_str::<TodoItem>(&content) {
                    todos.push(todo);
                }
            }
        }
    }
    todos.sort_by_key(|t| t.deadline.clone());
    todos
}

pub fn delete_todo(todo_id: &str) -> std::io::Result<bool> {
    let path = todo_path(todo_id);
    if path.exists() {
        fs::remove_file(&path)?;
        Ok(true)
    } else {
        Ok(false)
    }
}

// --- Config ---

pub fn save_config(config: &AppConfig) -> std::io::Result<()> {
    let path = app_data_dir().join("config.json");
    fs::create_dir_all(path.parent().unwrap())?;
    let json = serde_json::to_string_pretty(config)?;
    fs::write(&path, json)?;
    Ok(())
}

pub fn read_config() -> Option<AppConfig> {
    let path = app_data_dir().join("config.json");
    if path.exists() {
        let content = fs::read_to_string(&path).ok()?;
        return serde_json::from_str(&content).ok();
    }
    None
}
