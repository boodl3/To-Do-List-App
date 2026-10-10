import { expect, test } from '@playwright/test';
import { openApp, readDoc, refusePin, reopenApp } from './helpers';

// Real always-on-top needs the native shell (manual check in quickstart.md); these run the
// same UI against the fake window adapter.
test.describe('US5 — keep the app on top', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('pin, unpin, and the pinned state survives a restart', async ({ page }) => {
    await page.getByRole('button', { name: 'Pin on top' }).click();
    const unpin = page.getByRole('button', { name: 'Unpin from top' });
    await expect(unpin).toHaveAttribute('aria-pressed', 'true');
    await expect(unpin).toHaveAttribute('title', 'Unpin from top');
    expect((await readDoc(page)).prefs.pinned).toBe(true);

    await reopenApp(page);
    await expect(page.getByRole('button', { name: 'Unpin from top' })).toBeVisible();

    await page.getByRole('button', { name: 'Unpin from top' }).click();
    await expect(page.getByRole('button', { name: 'Pin on top' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('when the OS refuses, the button stays off and says why', async ({ page }) => {
    await refusePin(page);
    await page.getByRole('button', { name: 'Pin on top' }).click();
    await expect(page.getByRole('status')).toContainText("Couldn't keep the window on top.");
    await expect(page.getByRole('button', { name: 'Pin on top' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
