import { expect, test } from '@playwright/test';
import { newSection, openApp, readDoc, reopenApp } from './helpers';

const theme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.theme);
const boardBackground = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('US4 — light and dark mode', () => {
  test('first launch follows the OS setting', async ({ page }, info) => {
    await openApp(page);
    expect(await theme(page)).toBe(info.project.name); // projects emulate light / dark OS
    // Nothing is saved until the user changes something, so the stored choice stays "system".
    const doc = (await readDoc(page)) as { prefs: { theme: string } } | null;
    expect(doc?.prefs.theme ?? 'system').toBe('system');
  });

  test('moon and sun switch the whole UI without losing state, and the choice persists', async ({
    page,
  }) => {
    await openApp(page);
    await newSection(page, 'Keep me');
    await page.getByRole('button', { name: 'Dark mode' }).click();
    expect(await theme(page)).toBe('dark');
    await expect.poll(() => boardBackground(page)).toBe('rgb(10, 10, 12)');
    await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('textbox', { name: 'Section title' })).toHaveValue('Keep me');

    await page.getByRole('button', { name: 'Light mode' }).click();
    expect(await theme(page)).toBe('light');
    await expect.poll(() => boardBackground(page)).toBe('rgb(242, 242, 240)');

    await page.getByRole('button', { name: 'Dark mode' }).click();
    await reopenApp(page);
    expect(await theme(page)).toBe('dark');
    await expect(page.locator('.react-flow')).toHaveClass(/dark/);
  });
});
