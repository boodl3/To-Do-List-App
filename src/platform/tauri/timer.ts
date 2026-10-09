import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import type { CompletionPayload, TimerScheduler } from '../ports';

let permissionAsked = false;

/** Native completion scheduling (contracts/ipc-commands.md); see src-tauri/src/timer.rs. */
export const tauriTimer: TimerScheduler = {
  async schedule(args) {
    if (!permissionAsked) {
      permissionAsked = true;
      // A refusal only loses the OS notification; the in-app alert still shows (spec Edge Cases).
      if (!(await isPermissionGranted())) await requestPermission();
    }
    await invoke('schedule_timer_completion', args);
  },
  cancel: (sessionId) => invoke('cancel_timer_completion', { sessionId }),
  onCompleted: (handler) =>
    listen<CompletionPayload>('pomodoro://completed', (e) => {
      handler(e.payload);
    }),
};
