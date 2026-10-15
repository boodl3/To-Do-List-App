import { expect, test } from '@playwright/test';
import { dragSection, openApp, readDoc, reopenApp } from './helpers';

test.describe('Notes', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('a note keeps its formatting, moves like a section and confirms before delete', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'New note' }).click();
    await page.keyboard.type('Ideas');
    await page.keyboard.press('Enter');

    const text = page.getByRole('textbox', { name: 'Note', exact: true });
    await text.click();
    await page.keyboard.type('plain ');
    await page.getByRole('button', { name: /^Bold/ }).click();
    await page.keyboard.type('bold');
    await page.getByRole('button', { name: /^Bold/ }).click();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Bulleted list' }).click();
    await page.keyboard.type('one');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab'); // nests the bullet instead of leaving the note
    await page.keyboard.type('two');
    await expect(text).toBeFocused();

    const card = page.getByRole('group', { name: 'Ideas' });
    const before = (await card.boundingBox())!;
    await dragSection(page, 'Ideas', 120, 80);
    expect((await card.boundingBox())!.x).toBeGreaterThan(before.x + 100);
    const [note] = (await readDoc(page)).board.sections as { note?: string }[];
    expect(note!.note).toBe(
      'plain <b>bold</b><div><ul><li>one</li><ul><li>two</li></ul></ul></div>',
    );

    await reopenApp(page);
    await expect(text.locator('b')).toHaveText('bold');
    await expect(text.locator('ul ul li')).toHaveText('two');

    await page.getByRole('button', { name: 'Note options' }).click();
    await page.getByRole('button', { name: 'Delete note' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete "Ideas"?' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Ideas' })).toHaveCount(0);
  });

  test('pasted HTML is stored as plain text', async ({ page }) => {
    await page.getByRole('button', { name: 'New note' }).click();
    await page.keyboard.press('Enter');
    const text = page.getByRole('textbox', { name: 'Note', exact: true });
    await text.click();
    await text.evaluate((el) => {
      const data = new DataTransfer();
      data.setData('text/html', '<img src=x onerror="window.pwned=1"><b>hi</b>');
      data.setData('text/plain', 'hi');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    });
    await expect(text).toHaveText('hi');
    expect(await text.innerHTML()).toBe('hi');
  });
});
