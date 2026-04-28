use crate::store::json_store;
use crate::store::schema::TodoItem;
use chrono::Local;
use uuid::Uuid;

#[tauri::command]
pub fn get_todos() -> Vec<TodoItem> {
    json_store::read_all_todos()
}

#[tauri::command]
pub fn create_todo(
    title: String,
    deadline: String,
    priority: Option<String>,
    estimated_minutes: Option<i64>,
    description: Option<String>,
) -> Result<TodoItem, String> {
    json_store::ensure_dirs().map_err(|e| e.to_string())?;

    let now = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let todo = TodoItem {
        id: Uuid::new_v4().to_string(),
        title,
        description,
        deadline,
        priority: priority.unwrap_or_else(|| "medium".to_string()),
        status: "pending".to_string(),
        estimated_minutes,
        created_at: now.clone(),
        updated_at: now,
        source: "voice".to_string(),
    };

    json_store::save_todo(&todo).map_err(|e| e.to_string())?;
    Ok(todo)
}

#[tauri::command]
pub fn update_todo(
    todo_id: String,
    title: Option<String>,
    deadline: Option<String>,
    priority: Option<String>,
    status: Option<String>,
    estimated_minutes: Option<i64>,
    description: Option<String>,
) -> Result<TodoItem, String> {
    let mut todo = json_store::read_todo(&todo_id)
        .ok_or_else(|| format!("Todo not found: {}", todo_id))?;

    if let Some(t) = title { todo.title = t; }
    if let Some(d) = deadline { todo.deadline = d; }
    if let Some(p) = priority { todo.priority = p; }
    if let Some(s) = status { todo.status = s; }
    if let Some(e) = estimated_minutes { todo.estimated_minutes = Some(e); }
    if let Some(d) = description { todo.description = Some(d); }
    todo.updated_at = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    json_store::save_todo(&todo).map_err(|e| e.to_string())?;
    Ok(todo)
}

#[tauri::command]
pub fn delete_todo(todo_id: String) -> Result<bool, String> {
    json_store::delete_todo(&todo_id).map_err(|e| e.to_string())
}
