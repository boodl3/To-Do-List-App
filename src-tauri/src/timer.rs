//! Pomodoro completion scheduler (research R6). Webviews throttle background JS timers, so the
//! alert is fired from Rust: sleep until `endsAt`, then notify and emit `pomodoro://completed`.

use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::task::JoinHandle;

/// Never sleep longer than this before re-checking the wall clock (survives system sleep).
const MAX_SLEEP: Duration = Duration::from_secs(30);

/// Windows' alarm-clock tone (`ms-winsoundevent:Notification.Looping.Alarm`, played once).
/// macOS has no such named sound, so it keeps the default notification sound.
#[cfg(windows)]
const ALARM_SOUND: &str = "Alarm";
#[cfg(not(windows))]
const ALARM_SOUND: &str = "Default";

pub type Clock = Arc<dyn Fn() -> u64 + Send + Sync>;

pub fn wall_clock_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or_default()
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Completed {
    pub session_id: String,
    pub fired_at_ms: u64,
}

/// Only one timer exists: scheduling replaces the previous one.
pub struct Scheduler {
    clock: Clock,
    current: Mutex<Option<(String, JoinHandle<()>)>>,
}

impl Scheduler {
    pub fn new(clock: Clock) -> Self {
        Self {
            clock,
            current: Mutex::new(None),
        }
    }

    pub fn schedule(
        &self,
        session_id: String,
        ends_at_ms: u64,
        fire: impl FnOnce(Completed) + Send + 'static,
    ) {
        let clock = self.clock.clone();
        let id = session_id.clone();
        let handle = tokio::spawn(async move {
            loop {
                let now = clock();
                if now >= ends_at_ms {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(ends_at_ms - now).min(MAX_SLEEP)).await;
            }
            fire(Completed {
                session_id: id,
                fired_at_ms: clock(),
            });
        });
        if let Some((_, old)) = self.current.lock().unwrap().replace((session_id, handle)) {
            old.abort();
        }
    }

    /// No-op unless `session_id` is the scheduled one (a late cancel must not kill a newer session).
    pub fn cancel(&self, session_id: &str) {
        let mut current = self.current.lock().unwrap();
        if current.as_ref().is_some_and(|(id, _)| id == session_id)
            && let Some((_, handle)) = current.take()
        {
            handle.abort();
        }
    }
}

#[tauri::command]
pub async fn schedule_timer_completion(
    app: tauri::AppHandle,
    scheduler: tauri::State<'_, Scheduler>,
    session_id: String,
    ends_at_ms: u64,
    title: String,
    body: String,
    sound: bool,
) -> Result<(), String> {
    scheduler.schedule(session_id, ends_at_ms, move |done| {
        use tauri::Emitter;
        use tauri_plugin_notification::NotificationExt;
        let mut notification = app.notification().builder().title(title).body(body);
        // Windows toasts are silent unless a sound is named. Follows the user's system sound and
        // Do Not Disturb settings.
        if sound {
            notification = notification.sound(ALARM_SOUND);
        }
        // A denied permission only loses the OS notification; the event still drives the UI alert.
        let _ = notification.show();
        let _ = app.emit("pomodoro://completed", done);
    });
    Ok(())
}

#[tauri::command]
pub fn cancel_timer_completion(scheduler: tauri::State<'_, Scheduler>, session_id: String) {
    scheduler.cancel(&session_id);
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::mpsc;
    use tokio::time::{Instant, advance};

    /// A clock that follows tokio's paused time, starting at epoch-ms 1_000_000.
    fn test_clock() -> Clock {
        let start = Instant::now();
        Arc::new(move || 1_000_000 + start.elapsed().as_millis() as u64)
    }

    fn channel() -> (
        mpsc::UnboundedSender<Completed>,
        mpsc::UnboundedReceiver<Completed>,
    ) {
        mpsc::unbounded_channel()
    }

    #[tokio::test(start_paused = true)]
    async fn fires_once_at_ends_at() {
        let s = Scheduler::new(test_clock());
        let (tx, mut rx) = channel();
        s.schedule("a".into(), 1_000_000 + 90_000, move |c| tx.send(c).unwrap());
        advance(Duration::from_millis(89_999)).await;
        tokio::task::yield_now().await;
        assert!(rx.try_recv().is_err());
        advance(Duration::from_millis(1)).await;
        let done = rx.recv().await.unwrap();
        assert_eq!(done.session_id, "a");
        assert!(done.fired_at_ms >= 1_090_000);
        assert!(rx.recv().await.is_none());
    }

    #[tokio::test(start_paused = true)]
    async fn past_end_fires_immediately() {
        let s = Scheduler::new(test_clock());
        let (tx, mut rx) = channel();
        s.schedule("a".into(), 5, move |c| tx.send(c).unwrap());
        assert_eq!(rx.recv().await.unwrap().session_id, "a");
    }

    #[tokio::test(start_paused = true)]
    async fn a_new_schedule_replaces_the_previous_one() {
        let s = Scheduler::new(test_clock());
        let (tx, mut rx) = channel();
        let tx2 = tx.clone();
        s.schedule("a".into(), 1_010_000, move |c| tx.send(c).unwrap());
        s.schedule("b".into(), 1_020_000, move |c| tx2.send(c).unwrap());
        advance(Duration::from_secs(30)).await;
        assert_eq!(rx.recv().await.unwrap().session_id, "b");
        assert!(rx.recv().await.is_none());
    }

    #[tokio::test(start_paused = true)]
    async fn cancel_only_affects_the_matching_session() {
        let s = Scheduler::new(test_clock());
        let (tx, mut rx) = channel();
        s.schedule("a".into(), 1_010_000, move |c| tx.send(c).unwrap());
        s.cancel("stale");
        advance(Duration::from_secs(11)).await;
        assert_eq!(rx.recv().await.unwrap().session_id, "a");

        let (tx, mut rx) = channel();
        s.schedule("b".into(), 1_100_000, move |c| tx.send(c).unwrap());
        s.cancel("b");
        advance(Duration::from_secs(200)).await;
        assert!(rx.recv().await.is_none());
    }

    #[test]
    fn completion_payload_is_camel_case() {
        let json = serde_json::to_value(Completed {
            session_id: "a".into(),
            fired_at_ms: 1,
        })
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "sessionId": "a", "firedAtMs": 1 })
        );
    }
}
