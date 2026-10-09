import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

// Font rendering differs per OS, so baselines are only recorded and compared on Windows.
test.skip(process.platform !== 'win32', 'visual baselines are recorded on Windows');

test('board, connection and timer look right in each theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, { fixture: 'v1' });
  await page.getByRole('button', { name: 'Fit all' }).click();
  await expect(page).toHaveScreenshot('board.png', {
    mask: [page.getByRole('timer'), page.getByText(/^Today \d+$/)],
    maxDiffPixelRatio: 0.002, // a font change is ~0.5% of pixels; keep this below that
  });
});
