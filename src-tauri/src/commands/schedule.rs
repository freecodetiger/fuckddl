use crate::store::json_store;
use crate::store::schema::{Reminder, ScheduleEvent};
use chrono::Local;
use uuid::Uuid;

#[tauri::command]
pub fn get_today_schedules() -> Vec<ScheduleEvent> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    json_store::read_events_by_date(&today)
}

#[tauri::command]
pub fn get_schedules_by_date(date: String) -> Vec<ScheduleEvent> {
    json_store::read_events_by_date(&date)
}

#[tauri::command]
pub fn create_schedule(
    title: String,
    start_time: String,
    end_time: Option<String>,
    all_day: Option<bool>,
    description: Option<String>,
    reminder_before: Option<i64>, // minutes before event
) -> Result<ScheduleEvent, String> {
    json_store::ensure_dirs().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let event_id = Uuid::new_v4().to_string();

    let mut event = ScheduleEvent {
        id: event_id.clone(),
        title,
        start_time: start_time.clone(),
        end_time,
        all_day: all_day.unwrap_or(false),
        description,
        status: "pending".to_string(),
        reminder: None,
        created_at: now.clone(),
        updated_at: now,
        source: "voice".to_string(),
    };

    // Create reminder if requested
    if let Some(minutes_before) = reminder_before {
        if let Ok(start_dt) = chrono::NaiveDateTime::parse_from_str(
            &event.start_time,
            "%Y-%m-%dT%H:%M:%S",
        )
        .or_else(|_| {
            chrono::NaiveDate::parse_from_str(&event.start_time, "%Y-%m-%d")
                .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
        }) {
            let remind_dt = start_dt - chrono::Duration::minutes(minutes_before);
            let reminder = Reminder {
                id: Uuid::new_v4().to_string(),
                event_id: event_id.clone(),
                remind_at: remind_dt.format("%Y-%m-%dT%H:%M:%S").to_string(),
                reminder_type: "notification".to_string(),
                triggered: false,
            };
            json_store::save_reminder(&reminder).map_err(|e| e.to_string())?;
            event.reminder = Some(reminder);
        }
    }

    json_store::save_event(&event).map_err(|e| e.to_string())?;
    Ok(event)
}

#[tauri::command]
pub fn update_schedule(
    event_id: String,
    title: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    status: Option<String>,
    description: Option<String>,
) -> Result<ScheduleEvent, String> {
    let mut event = json_store::read_event(&event_id)
        .ok_or_else(|| format!("Event not found: {}", event_id))?;

    if let Some(t) = title { event.title = t; }
    if let Some(s) = start_time { event.start_time = s; }
    if let Some(e) = end_time { event.end_time = Some(e); }
    if let Some(s) = status { event.status = s; }
    if let Some(d) = description { event.description = Some(d); }
    event.updated_at = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    json_store::save_event(&event).map_err(|e| e.to_string())?;
    Ok(event)
}

#[tauri::command]
pub fn delete_schedule(event_id: String) -> Result<bool, String> {
    // Also delete associated reminder
    if let Some(event) = json_store::read_event(&event_id) {
        if let Some(reminder) = &event.reminder {
            let _ = json_store::delete_reminder(&reminder.id);
        }
    }
    json_store::delete_event(&event_id).map_err(|e| e.to_string())
}
