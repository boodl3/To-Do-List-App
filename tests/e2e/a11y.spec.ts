import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { newSection, openApp } from './helpers';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

test.describe('accessibility (WCAG 2.2 AA, SC-007)', () => {
  test('empty board', async ({ page }) => {
    await openApp(page);
    await expectNoViolations(page);
  });

  test('populated board with timer and a connection', async ({ page }) => {
    await openApp(page, { fixture: 'v1' });
    await page.getByRole('button', { name: 'Fit all' }).click();
    await expectNoViolations(page);
  });

  test('section options, timer settings, delete dialog and connection toolbar', async ({
    page,
  }) => {
    await openApp(page, { fixture: 'v1' });
    await page.getByRole('button', { name: 'Section options' }).first().click();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Timer settings' }).click();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');

    await page.locator('.react-flow__node').first().focus();
    await page.keyboard.press('Delete');
    await expect(page.getByRole('dialog', { name: /Delete/ })).toBeVisible();
    await expectNoViolations(page);
    await page.keyboard.press('Escape');

    const edge = (await page.locator('.react-flow__edge-path').first().boundingBox())!;
    await page.mouse.click(edge.x + edge.width / 2, edge.y + edge.height / 2);
    await expect(page.getByRole('toolbar', { name: 'Connection' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('every feature works from the keyboard alone', async ({ page }) => {
    await openApp(page);
    // Toolbar: New section, then type a title and a task.
    const toolbar = page.getByRole('toolbar', { name: 'Board' });
    await page.keyboard.press('Tab');
    await expect(toolbar.getByRole('button', { name: 'New section' })).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Keys');
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'Add a task' }).focus();
    await page.keyboard.type('Only keyboard');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Task Only keyboard' })).toBeVisible();

    // Toolbar arrow-key navigation reaches the timer; Enter shows it, then start it.
    await toolbar.getByRole('button', { name: 'New section' }).focus();
    for (let i = 0; i < 8; i++) {
      if (
        await page
          .getByRole('button', { name: 'Timer', exact: true })
          .evaluate((b) => b === document.activeElement)
      )
        break;
      await page.keyboard.press('ArrowRight');
    }
    await expect(page.getByRole('button', { name: 'Timer', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await page
      .getByRole('region', { name: 'Pomodoro timer' })
      .getByRole('button', { name: 'Start' })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Second section + connection via the section menu.
    await newSection(page, 'Next');
    await page.getByRole('button', { name: 'Section options' }).first().focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Connect to Next' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  });

  test('focus is always visible', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(
      () => getComputedStyle(document.activeElement!).outlineStyle,
    );
    expect(outline).not.toBe('none');
  });

  test('reduced motion turns transitions off (T120)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page);
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .map((el) => getComputedStyle(el).transitionDuration)
        .filter((d) => d.split(',').some((part) => parseFloat(part) > 0)),
    );
    expect(durations).toEqual([]);
  });
});
