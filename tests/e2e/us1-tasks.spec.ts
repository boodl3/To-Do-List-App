import { expect, test, type Page } from '@playwright/test';
import { openApp, reopenApp } from './helpers';

const addRow = (page: Page) => page.getByRole('textbox', { name: 'Add a task' });
const task = (page: Page, name: string) => page.getByRole('textbox', { name: `Task ${name}` });
const subtask = (page: Page, name: string) =>
  page.getByRole('textbox', { name: `Subtask ${name}` });
const estimate = (page: Page, name: string) =>
  page.getByRole('textbox', { name: `Estimate for ${name}` });

async function newSection(page: Page, title: string) {
  await page.getByRole('button', { name: 'New section' }).first().click();
  await expect(page.getByRole('textbox', { name: 'Section title' })).toBeFocused();
  await page.keyboard.type(title);
  await page.keyboard.press('Enter');
}

async function addTasks(page: Page, ...names: string[]) {
  await addRow(page).click();
  for (const name of names) {
    await page.keyboard.type(name);
    await page.keyboard.press('Enter');
  }
}

async function setEstimate(page: Page, name: string, value: string) {
  await estimate(page, name).fill(value);
  await estimate(page, name).press('Enter');
}

test.describe('US1 — capture tasks in a section', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('empty board shows a hint and creates an untitled section with focused title', async ({
    page,
  }) => {
    await expect(page.getByText('Your board is empty')).toBeVisible();
    await page.getByRole('button', { name: 'New section' }).last().click();
    const title = page.getByRole('textbox', { name: 'Section title' });
    await expect(title).toBeFocused();
    await expect(title).toHaveAttribute('placeholder', 'Untitled section');
    await expect(page.getByText('Your board is empty')).toBeHidden();
  });

  test('Calculus 2 walkthrough: subtasks, estimates, roll-ups, completion, persistence', async ({
    page,
  }) => {
    await newSection(page, 'Calculus 2');
    await addTasks(page, 'Problem set', 'Ratio test', 'Root test', 'Read chapter 11');
    await expect(addRow(page)).toBeFocused();

    await task(page, 'Ratio test').press('Tab');
    await task(page, 'Root test').press('Tab');
    await expect(subtask(page, 'Root test')).toBeVisible();

    await setEstimate(page, 'Ratio test', '30m');
    await setEstimate(page, 'Root test', '45');
    await setEstimate(page, 'Read chapter 11', '1.5h');
    await expect(estimate(page, 'Read chapter 11')).toHaveValue('1h 30m');

    const section = page.getByRole('group', { name: 'Calculus 2' });
    await expect(section.getByText('1h 15m')).toBeVisible(); // parent roll-up
    await expect(section.locator('header')).toContainText('2h 45m left');

    await page.getByRole('checkbox', { name: 'Done: Ratio test' }).check();
    await expect(section.locator('header')).toContainText('2h 15m left');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 of 3 done');

    await reopenApp(page);
    await expect(page.getByRole('textbox', { name: 'Section title' })).toHaveValue('Calculus 2');
    await expect(page.getByRole('checkbox', { name: 'Done: Ratio test' })).toBeChecked();
    await expect(estimate(page, 'Root test')).toHaveValue('45m');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 of 3 done');
  });

  test('invalid estimates are rejected and the previous value is kept', async ({ page }) => {
    await newSection(page, 'S');
    await addTasks(page, 'A');
    await setEstimate(page, 'A', '25m');
    for (const bad of ['abc', '-5', '100h']) {
      await estimate(page, 'A').fill(bad);
      await estimate(page, 'A').blur();
      await expect(estimate(page, 'A')).toHaveAttribute('aria-invalid', 'true');
      await expect(estimate(page, 'A')).toHaveValue('25m');
    }
  });

  test('parent and subtask completion stay consistent (FR-015)', async ({ page }) => {
    await newSection(page, 'S');
    await addTasks(page, 'P', 'x', 'y');
    await task(page, 'x').press('Tab');
    await task(page, 'y').press('Tab');
    await page.getByRole('checkbox', { name: 'Done: P' }).check();
    await expect(page.getByRole('checkbox', { name: 'Done: x' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Done: y' })).toBeChecked();
    await page.getByRole('checkbox', { name: 'Done: y' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'Done: P' })).not.toBeChecked();
    await page.getByRole('checkbox', { name: 'Done: y' }).check();
    await expect(page.getByRole('checkbox', { name: 'Done: P' })).toBeChecked();
  });

  test('delete a task with its subtasks, then undo', async ({ page }) => {
    await newSection(page, 'S');
    await addTasks(page, 'P', 'x');
    await task(page, 'x').press('Tab');
    await task(page, 'P').hover(); // row controls appear on hover/focus
    await page.getByRole('button', { name: 'Delete P' }).click();
    await expect(task(page, 'P')).toBeHidden();
    await page.locator('body').click({ position: { x: 5, y: 700 } });
    await page.keyboard.press('Control+z');
    await expect(task(page, 'P')).toBeVisible();
    await expect(subtask(page, 'x')).toBeVisible();
  });

  test('reorder with the keyboard persists', async ({ page }) => {
    await newSection(page, 'S');
    await addTasks(page, 'A', 'B', 'C');
    await task(page, 'C').click();
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Alt+ArrowUp');
    await expect(task(page, 'C')).toBeFocused();
    await reopenApp(page);
    const order = await page
      .getByRole('textbox', { name: /^Task / })
      .evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
    expect(order).toEqual(['C', 'A', 'B']);
  });

  test('long text wraps inside the card instead of overflowing', async ({ page }) => {
    await newSection(page, 'S');
    await addTasks(page, 'word '.repeat(40).trim());
    const card = page.getByRole('group', { name: 'S' });
    const box = await card.boundingBox();
    const text = await page.getByRole('textbox', { name: /^Task word/ }).boundingBox();
    expect(text!.x + text!.width).toBeLessThanOrEqual(box!.x + box!.width);
    expect(text!.height).toBeGreaterThan(40);
  });
});

test('an unreadable save file is set aside and the user is told (T121)', async ({ page }) => {
  await openApp(page, { fixture: 'corrupt' });
  await expect(page.getByRole('status')).toContainText("couldn't be read");
  await expect(page.getByText('Your board is empty')).toBeVisible();
  const kept = await page.evaluate(() => localStorage.getItem('focusboard.corrupt-0.json'));
  expect(kept).toContain('"schemaVersion": 1');
});
