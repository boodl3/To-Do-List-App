import { expect, test, type Page } from '@playwright/test';
import { dragSection, newSection, openApp, readDoc, reopenApp } from './helpers';

const node = (page: Page, title: string) =>
  page.locator('.react-flow__node', { has: page.getByRole('group', { name: title }) });

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function addTask(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Add a task' }).last().fill(text);
  await page.getByRole('textbox', { name: 'Add a task' }).last().press('Enter');
}

test.describe('US2 — arrange sections freely', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('new sections never overlap and keep the standard gap', async ({ page }) => {
    for (const t of ['A', 'B', 'C']) await newSection(page, t);
    const { sections } = (await readDoc(page)).board;
    expect(sections).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const a = sections[i]!;
        const grown = { x: a.x - 24, y: a.y - 24, width: a.width + 48, height: a.height + 48 };
        expect(overlaps(grown, sections[j]!)).toBe(false);
      }
    }
  });

  test('dragging snaps to the 8 px grid; holding Alt skips snapping', async ({ page }) => {
    await newSection(page, 'A');
    const before = (await readDoc(page)).board.sections[0]!;
    await dragSection(page, 'A', 101, 53);
    const snapped = (await readDoc(page)).board.sections[0]!;
    expect(snapped.x % 8).toBe(0);
    expect(snapped.y % 8).toBe(0);
    expect(snapped.x).not.toBe(before.x);

    await dragSection(page, 'A', 13, 0, { alt: true });
    const free = (await readDoc(page)).board.sections[0]!;
    // Off-grid, roughly where the pointer went (React Flow's drag threshold eats a pixel or two).
    expect(free.x % 8).not.toBe(0);
    expect(Math.abs(free.x - snapped.x - 13)).toBeLessThanOrEqual(3);
  });

  test('keyboard moves and resizes the focused section; resize keeps the minimum', async ({
    page,
  }) => {
    await newSection(page, 'A');
    const start = (await readDoc(page)).board.sections[0]!;
    await node(page, 'A').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Control+ArrowRight');
    for (let i = 0; i < 20; i++) await page.keyboard.press('Control+ArrowUp');
    const s = (await readDoc(page)).board.sections[0]!;
    expect([s.x - start.x, s.y - start.y]).toEqual([8, 24]);
    expect(s.width).toBe(start.width + 8);
    expect(s.height).toBe(160);
  });

  test('the header stays visible while the task list scrolls', async ({ page }) => {
    await newSection(page, 'Long');
    for (let i = 0; i < 12; i++) await addTask(page, `Item ${i}`);
    const header = page.getByRole('group', { name: 'Long' }).locator('header');
    const before = await header.boundingBox();
    await page.getByRole('textbox', { name: 'Task Item 11' }).scrollIntoViewIfNeeded();
    expect(await header.boundingBox()).toEqual(before);
    await expect(header).toBeInViewport();
  });

  test('Tidy up gives equal gaps and can be undone', async ({ page }) => {
    for (const t of ['A', 'B']) await newSection(page, t);
    await dragSection(page, 'B', 37, 61, { alt: true });
    const messy = (await readDoc(page)).board.sections;
    await page.getByRole('button', { name: 'Tidy up' }).click();
    const [a, b] = (await readDoc(page)).board.sections.sort((p, q) => p.x - q.x);
    expect(b!.y).toBe(a!.y);
    expect(b!.x - (a!.x + a!.width)).toBe(24);
    await page.keyboard.press('Control+z');
    const restored = (await readDoc(page)).board.sections;
    expect(restored.map((s) => [s.x, s.y])).toEqual(messy.map((s) => [s.x, s.y]));
  });

  test('Fit all brings every section into view', async ({ page }) => {
    await newSection(page, 'A');
    const pane = page.locator('.react-flow__pane');
    const box = (await pane.boundingBox())!;
    await page.mouse.move(box.x + 50, box.y + box.height - 50);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(box.x + box.width - 50, box.y + 50, { steps: 5 });
    await page.mouse.up({ button: 'middle' });
    await expect(page.getByRole('group', { name: 'A' })).not.toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Fit all' }).click();
    await expect(page.getByRole('group', { name: 'A' })).toBeInViewport({ ratio: 1 });
  });

  test('deleting a non-empty section asks first and can be undone', async ({ page }) => {
    await newSection(page, 'A');
    await addTask(page, 'x');
    await page.getByRole('button', { name: 'Section options' }).click();
    await page.getByRole('button', { name: 'Delete section' }).click();
    const dialog = page.getByRole('dialog', { name: /Delete "A"/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('group', { name: 'A' })).toBeHidden();
    await page.keyboard.press('Control+z');
    await expect(page.getByRole('group', { name: 'A' })).toBeVisible();
  });

  test('an empty section is deleted without asking', async ({ page }) => {
    await newSection(page, 'A');
    await page.getByRole('button', { name: 'Section options' }).click();
    await page.getByRole('button', { name: 'Delete section' }).click();
    await expect(page.getByRole('group', { name: 'A' })).toBeHidden();
  });

  test('the accent colour persists across a restart', async ({ page }) => {
    await newSection(page, 'A');
    await page.getByRole('button', { name: 'Section options' }).click();
    await page.getByRole('radio', { name: 'Sky' }).check();
    await page.keyboard.press('Escape');
    await reopenApp(page);
    await expect(page.getByRole('group', { name: 'A' })).toHaveAttribute('data-accent', 'sky');
  });

  test('zoom is remembered across a restart', async ({ page }) => {
    await newSection(page, 'A');
    await page.getByRole('button', { name: 'Zoom in' }).click();
    const { zoom } = (await readDoc(page)).board.viewport;
    expect(zoom).toBeGreaterThan(1);
    await reopenApp(page);
    await expect(page.getByTestId('zoom-level')).toHaveText(`${Math.round(zoom * 100)}%`);
  });
});
