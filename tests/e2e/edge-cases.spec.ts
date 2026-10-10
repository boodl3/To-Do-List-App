import { expect, test } from '@playwright/test';
import { newSection, openApp } from './helpers';

test.describe('edge cases', () => {
  test('a tiny window moves secondary controls into "More" (spec Edge Case "Tiny window")', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 520, height: 640 });
    await openApp(page);
    await newSection(page, 'A');
    await expect(page.getByRole('button', { name: 'Tidy up' })).toBeHidden();
    await page.getByRole('button', { name: 'More' }).click();
    const more = page.getByRole('dialog', { name: 'More' });
    await expect(more.getByRole('button', { name: 'Tidy up' })).toBeVisible();
    // The theme switch never collapses: it stays the rightmost toolbar control.
    await expect(more.getByRole('button', { name: 'Dark mode' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Dark mode' }).click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  });

  test('the timer stays inside the window when it shrinks', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openApp(page);
    await page.getByRole('button', { name: 'Timer', exact: true }).click();
    const handle = page.getByRole('button', { name: 'Move timer' });
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    await page.mouse.move(1270, 790, { steps: 5 });
    await page.mouse.up();
    await page.setViewportSize({ width: 600, height: 500 });
    await expect(page.getByRole('region', { name: 'Pomodoro timer' })).toBeInViewport({ ratio: 1 });
  });
});
