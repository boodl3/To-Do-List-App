import { expect, test, type Page } from '@playwright/test';
import { advanceClock, newSection, openApp, readDoc, reopenApp } from './helpers';

const MIN = 60_000;
const widget = (page: Page) => page.getByRole('region', { name: 'Pomodoro timer' });
const time = (page: Page) => page.getByRole('timer', { name: 'Time remaining' });
const button = (page: Page, name: string) =>
  widget(page).getByRole('button', { name, exact: true });

async function showTimer(page: Page) {
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await expect(widget(page)).toBeVisible();
}

test.describe('US3 — focus with a movable Pomodoro timer', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('the toolbar button shows an idle focus timer', async ({ page }) => {
    await showTimer(page);
    await expect(widget(page)).toContainText('Focus');
    await expect(time(page)).toHaveText('25:00');
    await expect(page.getByRole('button', { name: 'Timer', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('start, pause, resume, reset and skip', async ({ page }) => {
    await showTimer(page);
    await button(page, 'Start').click();
    await advanceClock(page, 61_000);
    await expect(time(page)).toHaveText('23:59');
    await button(page, 'Pause').click();
    await advanceClock(page, 10 * MIN);
    await expect(time(page)).toHaveText('23:59');
    await button(page, 'Resume').click();
    await button(page, 'Reset').click();
    await expect(time(page)).toHaveText('25:00');
    await button(page, 'Skip').click();
    await expect(widget(page)).toContainText('Short break');
    await expect(time(page)).toHaveText('05:00');
  });

  test('a finished focus session alerts, counts, and prepares a break without starting it', async ({
    page,
  }) => {
    await showTimer(page);
    await button(page, 'Start').click();
    await advanceClock(page, 25 * MIN);
    await expect(page.getByRole('status')).toContainText('Focus session complete');
    await expect(widget(page)).toContainText('Short break');
    await expect(widget(page)).toContainText('Today 1');
    await expect(button(page, 'Start')).toBeVisible();
  });

  test('every 4th focus session is followed by a long break', async ({ page }) => {
    await showTimer(page);
    for (let i = 0; i < 4; i++) {
      await button(page, 'Start').click();
      await advanceClock(page, 25 * MIN);
      await expect(widget(page)).toContainText(`Today ${i + 1}`);
      if (i < 3) await button(page, 'Skip').click(); // skip the short break
    }
    await expect(widget(page)).toContainText('Long break');
    await expect(time(page)).toHaveText('15:00');
  });

  test('changed durations apply from the next session', async ({ page }) => {
    await showTimer(page);
    await button(page, 'Start').click();
    const gear = widget(page).getByRole('button', { name: 'Timer settings' });
    await gear.click();
    // Anchored right under its gear, not the window's top-left corner.
    const g = (await gear.boundingBox())!;
    const menu = (await page.getByRole('dialog', { name: 'Timer settings' }).boundingBox())!;
    expect(menu.y).toBeGreaterThanOrEqual(g.y + g.height);
    expect(menu.y).toBeLessThan(g.y + g.height + 16);
    expect(menu.x).toBeLessThanOrEqual(g.x);
    expect(menu.x + menu.width).toBeGreaterThanOrEqual(g.x + g.width);
    await page.getByRole('spinbutton', { name: 'Focus (minutes)' }).fill('2');
    await page.keyboard.press('Escape');
    await expect(time(page)).toHaveText('25:00');
    await button(page, 'Reset').click();
    await expect(time(page)).toHaveText('02:00');
  });

  test('the widget can be dragged and keeps its position across restarts', async ({ page }) => {
    await showTimer(page);
    const handle = page.getByRole('button', { name: 'Move timer' });
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    await page.mouse.move(box.x + 305, box.y + 205, { steps: 5 });
    await page.mouse.up();
    const { widget: pos } = (await readDoc(page)).pomodoro;
    await reopenApp(page);
    const after = (await widget(page).boundingBox())!;
    expect([Math.round(after.x), Math.round(after.y)]).toEqual([pos.x, pos.y]);
  });

  test('a task can be linked to the focus session', async ({ page }) => {
    await newSection(page, 'S');
    await page.getByRole('textbox', { name: 'Add a task' }).fill('Problem set');
    await page.getByRole('textbox', { name: 'Add a task' }).press('Enter');
    await page.getByRole('textbox', { name: 'Task Problem set' }).hover();
    await page.getByRole('button', { name: 'Focus on Problem set' }).click();
    await expect(widget(page)).toContainText('Focusing on Problem set');
  });

  test('a session that ended while the app was closed shows as completed on launch', async ({
    page,
  }) => {
    await showTimer(page);
    await button(page, 'Start').click();
    await readDoc(page); // wait for autosave
    await page.evaluate(() => {
      const doc = JSON.parse(localStorage.getItem('focusboard.json')!) as {
        pomodoro: { status: { endsAt: number } };
      };
      doc.pomodoro.status.endsAt = Date.now() - 1000;
      localStorage.setItem('focusboard.json', JSON.stringify(doc));
    });
    await page.reload();
    await expect(widget(page)).toContainText('Short break');
    await expect(widget(page)).toContainText('Today 1');
  });

  test('a running session survives a restart with the right remaining time', async ({ page }) => {
    await showTimer(page);
    await button(page, 'Start').click();
    await reopenApp(page);
    await expect(button(page, 'Pause')).toBeVisible();
    await expect(time(page)).toHaveText(/^24:5\d$/);
  });
});
