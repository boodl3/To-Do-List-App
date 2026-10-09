import { getCurrentWindow } from '@tauri-apps/api/window';
import type { WindowControls } from '../ports';

export const tauriWindow: WindowControls = {
  /** Resolves to the state the OS really applied; `false` if the request was refused. */
  async setPinned(pinned) {
    const win = getCurrentWindow();
    try {
      await win.setAlwaysOnTop(pinned);
      return await win.isAlwaysOnTop();
    } catch {
      return false;
    }
  },
  isPinned: () => getCurrentWindow().isAlwaysOnTop(),
};
