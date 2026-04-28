use crate::store::json_store;
use crate::store::schema::SyncMeta;
use git2::{Cred, RemoteCallbacks, Repository, Signature};
use std::path::PathBuf;

fn data_dir() -> PathBuf {
    json_store::ensure_dirs().ok();
    dirs::data_dir()
        .expect("Failed to find app data directory")
        .join("fuckddl")
}

fn git_dir() -> PathBuf {
    data_dir().join(".git")
}

fn format_url_with_token(repo_url: &str, token: &str) -> String {
    if repo_url.starts_with("https://") {
        repo_url.replace(
            "https://",
            &format!("https://x-access-token:{}@", token),
        )
    } else {
        format!("https://x-access-token:{}@github.com/{}", token, repo_url)
    }
}

fn open_or_init_repo() -> Result<Repository, String> {
    let data = data_dir();
    if git_dir().exists() {
        Repository::open(&data).map_err(|e| format!("Failed to open repo: {}", e))
    } else {
        Repository::init(&data).map_err(|e| format!("Failed to init repo: {}", e))
    }
}

fn setup_remote(repo: &Repository, repo_url: &str, token: &str) -> Result<(), String> {
    let url = format_url_with_token(repo_url, token);
    match repo.find_remote("origin") {
        Ok(_) => {
            repo.remote_set_url("origin", &url)
                .map_err(|e| format!("Failed to update remote URL: {}", e))
        }
        Err(_) => {
            repo.remote("origin", &url)
                .map_err(|e| format!("Failed to add remote: {}", e))
                .map(|_| ())
        }
    }
}

fn get_head_sha(repo: &Repository) -> String {
    repo.head()
        .ok()
        .and_then(|h| h.target())
        .map(|oid| oid.to_string())
        .unwrap_or_default()
}

fn build_sync_meta(repo: &Repository, repo_url: &str, branch: &str) -> SyncMeta {
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    SyncMeta {
        last_sync_at: now,
        last_commit_sha: get_head_sha(repo),
        repo_url: repo_url.to_string(),
        branch: branch.to_string(),
    }
}

/// Pull latest changes from remote
pub fn pull(repo_url: &str, branch: &str, token: &str) -> Result<SyncMeta, String> {
    let data = data_dir();

    if !git_dir().exists() {
        // Clone the repo into data dir
        let parent = data
            .parent()
            .ok_or("No parent dir available")?
            .to_path_buf();
        let temp_dir = parent.join("fuckddl_tmp");
        if temp_dir.exists() {
            std::fs::remove_dir_all(&temp_dir)
                .map_err(|e| format!("Failed to clean temp: {}", e))?;
        }

        let mut callbacks = RemoteCallbacks::new();
        callbacks.credentials(|_url, _username_from_url, _allowed_types| {
            Cred::userpass_plaintext(token, "")
        });

        let mut builder = git2::build::RepoBuilder::new();
        let mut fetch_options = git2::FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);
        builder.fetch_options(fetch_options);

        builder
            .branch(branch)
            .clone(&format_url_with_token(repo_url, token), &temp_dir)
            .map_err(|e| format!("Clone failed: {}", e))?;

        // Move .git to data dir
        let temp_git = temp_dir.join(".git");
        let target_git = data.join(".git");
        if target_git.exists() {
            std::fs::remove_dir_all(&target_git).ok();
        }
        std::fs::rename(&temp_git, &target_git)
            .map_err(|e| format!("Failed to move .git: {}", e))?;
        std::fs::remove_dir_all(&temp_dir).ok();

        // Re-open the repo at data dir
        let repo = Repository::open(&data)
            .map_err(|e| format!("Failed to open cloned repo: {}", e))?;
        let meta = build_sync_meta(&repo, repo_url, branch);
        json_store::save_sync_meta(&meta)
            .map_err(|e| format!("Save meta failed: {}", e))?;
        return Ok(meta);
    }

    // Repo exists, pull
    let repo = open_or_init_repo()?;
    setup_remote(&repo, repo_url, token)?;

    // Fetch
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, _username_from_url, _allowed_types| {
        Cred::userpass_plaintext(token, "")
    });

    let mut fetch_options = git2::FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);

    let mut remote = repo.find_remote("origin")
        .map_err(|e| format!("No remote 'origin': {}", e))?;

    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote
        .fetch(&[&refspec], Some(&mut fetch_options), None)
        .map_err(|e| format!("Fetch failed: {}", e))?;

    // Merge
    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .map_err(|e| format!("No FETCH_HEAD: {}", e))?;
    let fetch_commit = repo
        .reference_to_annotated_commit(&fetch_head)
        .map_err(|e| format!("Failed to get fetch commit: {}", e))?;

    let (analysis, _) = repo
        .merge_analysis(&[&fetch_commit])
        .map_err(|e| format!("Merge analysis failed: {}", e))?;

    if analysis.is_fast_forward() {
        let mut reference = repo
            .find_reference(&format!("refs/heads/{}", branch))
            .map_err(|e| format!("Failed to find branch ref: {}", e))?;
        reference
            .set_target(fetch_commit.id(), "Fast-forward merge")
            .map_err(|e| format!("Fast-forward failed: {}", e))?;
        repo.set_head(&format!("refs/heads/{}", branch))
            .map_err(|e| format!("Set HEAD failed: {}", e))?;
        repo.checkout_head(Some(
            git2::build::CheckoutBuilder::default().force(),
        ))
        .map_err(|e| format!("Checkout failed: {}", e))?;
    } else if analysis.is_normal() {
        return Err("Merge conflicts detected. Please resolve manually.".to_string());
    }
    // up_to_date: nothing to do

    let meta = build_sync_meta(&repo, repo_url, branch);
    json_store::save_sync_meta(&meta)
        .map_err(|e| format!("Save meta failed: {}", e))?;
    Ok(meta)
}

/// Commit all local changes and push
pub fn commit_and_push(repo_url: &str, branch: &str, token: &str) -> Result<SyncMeta, String> {
    let repo = open_or_init_repo()?;
    setup_remote(&repo, repo_url, token)?;

    // Stage all files
    let mut index = repo.index().map_err(|e| format!("Index error: {}", e))?;
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Stage files failed: {}", e))?;
    index.write().map_err(|e| format!("Write index failed: {}", e))?;

    let tree_id = index
        .write_tree()
        .map_err(|e| format!("Write tree failed: {}", e))?;
    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("Find tree failed: {}", e))?;

    let parent = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let signature =
        Signature::now("fuckddl", "fuckddl@local").map_err(|e| format!("Signature: {}", e))?;

    let commit_msg = format!(
        "Auto-commit: {}",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
    );

    let parents: Vec<&git2::Commit> = parent.iter().collect();
    repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &commit_msg,
        &tree,
        &parents,
    )
    .map_err(|e| format!("Commit failed: {}", e))?;

    // Push
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| format!("No remote: {}", e))?;

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, _username_from_url, _allowed_types| {
        Cred::userpass_plaintext(token, "")
    });

    let mut push_options = git2::PushOptions::new();
    push_options.remote_callbacks(callbacks);

    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    remote
        .push(&[&refspec], Some(&mut push_options))
        .map_err(|e| format!("Push failed: {}", e))?;

    let meta = build_sync_meta(&repo, repo_url, branch);
    json_store::save_sync_meta(&meta)
        .map_err(|e| format!("Save meta failed: {}", e))?;
    Ok(meta)
}
