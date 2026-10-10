import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

// Font rendering differs per OS, so baselines are only recorded and compared on Windows.
test.skip(process.platform !== 'win32', 'visual baselines are recorded on Windows');

test('board, connection and timer look right in each theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The v1 fixture's focus session ends at 2026-10-10T12:25Z; freeze Date before that so the
  // timer always renders "running" (timers still run, so autosave etc. behave normally).
  await page.clock.setFixedTime(new Date('2026-10-10T12:00:00Z'));
  await openApp(page, { fixture: 'v1' });
  await page.getByRole('button', { name: 'Fit all' }).click();
  await expect(page).toHaveScreenshot('board.png', {
    mask: [page.getByRole('timer')],
    maxDiffPixelRatio: 0.002, // a font change is ~0.5% of pixels; keep this below that
  });
});
