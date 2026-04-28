use crate::store::json_store;
use crate::store::schema::Reminder;

#[tauri::command]
pub fn schedule_reminder(event_id: String, remind_at: String) -> Result<Reminder, String> {
    json_store::ensure_dirs().map_err(|e| e.to_string())?;

    let reminder = Reminder {
        id: uuid::Uuid::new_v4().to_string(),
        event_id,
        remind_at,
        reminder_type: "notification".to_string(),
        triggered: false,
    };

    json_store::save_reminder(&reminder).map_err(|e| e.to_string())?;
    Ok(reminder)
}

#[tauri::command]
pub fn cancel_reminder(reminder_id: String) -> Result<bool, String> {
    json_store::delete_reminder(&reminder_id).map_err(|e| e.to_string())?;
    Ok(true)
}
