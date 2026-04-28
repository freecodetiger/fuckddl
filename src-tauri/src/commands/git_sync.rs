use crate::git::sync;
use crate::store::json_store;
use crate::store::schema::SyncMeta;

#[tauri::command]
pub fn sync_status() -> SyncMeta {
    json_store::read_sync_meta().unwrap_or_else(|| SyncMeta {
        last_sync_at: "never".to_string(),
        last_commit_sha: String::new(),
        repo_url: String::new(),
        branch: "main".to_string(),
    })
}

#[tauri::command]
pub fn sync_now(repo_url: String, branch: String, token: String) -> Result<SyncMeta, String> {
    // Pull first
    sync::pull(&repo_url, &branch, &token)?;

    // Then commit and push local changes
    sync::commit_and_push(&repo_url, &branch, &token)
}
