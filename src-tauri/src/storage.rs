//! Atomic, backed-up JSON document storage (contracts/ipc-commands.md, Constitution I).

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_BYTES: usize = 10 * 1024 * 1024;

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum LoadResult {
    Ok {
        json: String,
    },
    Recovered {
        json: String,
        reason: String,
    },
    Empty {
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
    },
}

const MAIN: &str = "focusboard.json";
const BAK: &str = "focusboard.json.bak";
const TMP: &str = "focusboard.json.tmp";

/// Serializes saves (and quarantine renames) so two writers never interleave.
static LOCK: Mutex<()> = Mutex::new(());

/// Reads the document. A main file that is unreadable or not JSON — or that the caller rejects
/// via `quarantine` — is renamed to `focusboard.corrupt-<epoch>.json` and the backup promoted.
/// Nothing is ever deleted or overwritten.
pub fn load(dir: &Path, quarantine: bool) -> Result<LoadResult, String> {
    let _guard = LOCK.lock().map_err(|e| e.to_string())?;
    let main = dir.join(MAIN);
    let bak = dir.join(BAK);
    let mut reason: Option<String> = None;

    if quarantine && main.exists() {
        set_aside(dir, &main)?;
        reason = Some("the saved board failed validation".into());
    }
    loop {
        if !main.exists() {
            if bak.exists() {
                fs::rename(&bak, &main).map_err(|e| e.to_string())?;
                reason.get_or_insert_with(|| "the last save was interrupted".into());
                continue;
            }
            return Ok(LoadResult::Empty { reason });
        }
        let parsed = fs::read_to_string(&main)
            .map_err(|e| e.to_string())
            .and_then(
                |json| match serde_json::from_str::<serde_json::Value>(&json) {
                    Ok(_) => Ok(json),
                    Err(e) => Err(e.to_string()),
                },
            );
        match parsed {
            Ok(json) => {
                return Ok(match reason {
                    None => LoadResult::Ok { json },
                    Some(reason) => LoadResult::Recovered { json, reason },
                });
            }
            Err(e) => {
                set_aside(dir, &main)?;
                reason = Some(format!("the saved board could not be read ({e})"));
            }
        }
    }
}

/// write tmp → fsync → rotate main to .bak → rename tmp to main.
pub fn save(dir: &Path, json: &str) -> Result<(), String> {
    if json.len() > MAX_BYTES {
        return Err(format!(
            "document is {} bytes; the limit is {MAX_BYTES}",
            json.len()
        ));
    }
    let _guard = LOCK.lock().map_err(|e| e.to_string())?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let (main, tmp) = (dir.join(MAIN), dir.join(TMP));
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    file.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    if main.exists() {
        fs::rename(&main, dir.join(BAK)).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &main).map_err(|e| e.to_string())
}

fn set_aside(dir: &Path, file: &Path) -> Result<PathBuf, String> {
    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default();
    let mut target = dir.join(format!("focusboard.corrupt-{epoch}.json"));
    let mut n = 1;
    while target.exists() {
        target = dir.join(format!("focusboard.corrupt-{epoch}-{n}.json"));
        n += 1;
    }
    fs::rename(file, &target).map_err(|e| e.to_string())?;
    Ok(target)
}

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    app.path().app_data_dir().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_document(
    app: tauri::AppHandle,
    quarantine: Option<bool>,
) -> Result<LoadResult, String> {
    let dir = data_dir(&app)?;
    // The UI shows this text verbatim, so it names the folder (no path permission is granted).
    load(&dir, quarantine.unwrap_or(false))
        .map_err(|e| format!("{e} (data folder: {})", dir.display()))
}

#[tauri::command]
pub async fn save_document(app: tauri::AppHandle, json: String) -> Result<(), String> {
    save(&data_dir(&app)?, &json)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn names(dir: &Path) -> Vec<String> {
        let mut v: Vec<String> = fs::read_dir(dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        v.sort();
        v
    }

    fn corrupt_count(dir: &Path) -> usize {
        names(dir)
            .iter()
            .filter(|n| n.starts_with("focusboard.corrupt-"))
            .count()
    }

    #[test]
    fn missing_file_is_empty() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(
            load(dir.path(), false),
            Ok(LoadResult::Empty { reason: None })
        );
    }

    #[test]
    fn save_then_load_round_trips() {
        let dir = tempfile::tempdir().unwrap();
        save(dir.path(), r#"{"a":1}"#).unwrap();
        assert_eq!(
            load(dir.path(), false),
            Ok(LoadResult::Ok {
                json: r#"{"a":1}"#.into()
            })
        );
    }

    #[test]
    fn second_save_rotates_previous_file_to_bak() {
        let dir = tempfile::tempdir().unwrap();
        save(dir.path(), "1").unwrap();
        save(dir.path(), "2").unwrap();
        assert_eq!(
            fs::read_to_string(dir.path().join("focusboard.json.bak")).unwrap(),
            "1"
        );
        assert_eq!(
            fs::read_to_string(dir.path().join("focusboard.json")).unwrap(),
            "2"
        );
    }

    #[test]
    fn corrupt_main_recovers_from_bak_and_keeps_damaged_file() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("focusboard.json"), "{trunc").unwrap();
        fs::write(dir.path().join("focusboard.json.bak"), "[1]").unwrap();
        match load(dir.path(), false).unwrap() {
            LoadResult::Recovered { json, .. } => assert_eq!(json, "[1]"),
            other => panic!("expected recovered, got {other:?}"),
        }
        assert_eq!(corrupt_count(dir.path()), 1);
        assert_eq!(
            fs::read_to_string(dir.path().join("focusboard.json")).unwrap(),
            "[1]"
        );
    }

    #[test]
    fn corrupt_main_without_bak_is_empty_with_reason() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("focusboard.json"), "{trunc").unwrap();
        assert!(matches!(
            load(dir.path(), false).unwrap(),
            LoadResult::Empty { reason: Some(_) }
        ));
        assert_eq!(corrupt_count(dir.path()), 1);
    }

    #[test]
    fn interrupted_save_promotes_bak() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("focusboard.json.bak"), "[2]").unwrap();
        fs::write(dir.path().join("focusboard.json.tmp"), "[half").unwrap();
        assert!(matches!(
            load(dir.path(), false).unwrap(),
            LoadResult::Recovered { json, .. } if json == "[2]"
        ));
    }

    #[test]
    fn oversized_payload_is_rejected() {
        let dir = tempfile::tempdir().unwrap();
        assert!(save(dir.path(), &"x".repeat(MAX_BYTES + 1)).is_err());
        assert!(names(dir.path()).is_empty());
    }

    #[test]
    fn quarantine_sets_main_aside_and_promotes_bak() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("focusboard.json"), r#"{"bad":true}"#).unwrap();
        fs::write(dir.path().join("focusboard.json.bak"), r#"{"good":true}"#).unwrap();
        match load(dir.path(), true).unwrap() {
            LoadResult::Recovered { json, .. } => assert_eq!(json, r#"{"good":true}"#),
            other => panic!("expected recovered, got {other:?}"),
        }
        assert_eq!(corrupt_count(dir.path()), 1);
        assert!(!dir.path().join("focusboard.json.bak").exists());
    }

    #[test]
    fn quarantine_twice_keeps_every_file() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("focusboard.json"), r#"{"bad":1}"#).unwrap();
        fs::write(dir.path().join("focusboard.json.bak"), r#"{"bad":2}"#).unwrap();
        load(dir.path(), true).unwrap();
        assert!(matches!(
            load(dir.path(), true).unwrap(),
            LoadResult::Empty { reason: Some(_) }
        ));
        assert_eq!(corrupt_count(dir.path()), 2);
        // Starting fresh afterwards must not touch the quarantined files.
        save(dir.path(), "{}").unwrap();
        save(dir.path(), "{}").unwrap();
        assert_eq!(corrupt_count(dir.path()), 2);
    }

    #[test]
    fn quarantine_without_bak_is_empty() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("focusboard.json"), "{}").unwrap();
        assert!(matches!(
            load(dir.path(), true).unwrap(),
            LoadResult::Empty { reason: Some(_) }
        ));
    }

    #[test]
    fn serializes_to_the_contract_shape() {
        let ok = serde_json::to_value(LoadResult::Ok { json: "{}".into() }).unwrap();
        assert_eq!(ok, serde_json::json!({ "kind": "ok", "json": "{}" }));
        let empty = serde_json::to_value(LoadResult::Empty { reason: None }).unwrap();
        assert_eq!(empty, serde_json::json!({ "kind": "empty" }));
    }
}
