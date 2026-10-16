import { expect, test, type Page } from '@playwright/test';
import { openApp, readDoc, reopenApp } from './helpers';

/** A solid w×h PNG drawn in the page, as base64. */
const png = (page: Page, w: number, h: number) =>
  page.evaluate(
    ({ w, h }) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.fillRect(0, 0, w, h);
      return c.toDataURL('image/png').split(',')[1]!;
    },
    { w, h },
  );

const paste = (page: Page, base64: string, type: string) =>
  page.evaluate(
    ({ base64, type }) => {
      const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], 'pasted', { type }));
      document.body.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true }),
      );
    },
    { base64, type },
  );

interface ImageSection {
  width: number;
  height: number;
  image?: { src: string; width: number; height: number };
}
const images = async (page: Page) =>
  ((await readDoc(page)).board.sections as ImageSection[]).filter((s) => s.image);

test.describe('Images', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('upload and paste add re-encoded pictures; resizing keeps the aspect ratio', async ({
    page,
  }) => {
    await page.getByLabel('Image file').setInputFiles({
      name: 'wide.png',
      mimeType: 'image/png',
      buffer: Buffer.from(await png(page, 3200, 1800), 'base64'),
    });
    const card = page.getByRole('group', { name: 'Untitled image' });
    await expect(card).toHaveCount(1);
    await expect(card.getByRole('img')).toBeVisible();
    const [uploaded] = await images(page);
    expect(uploaded!.image).toMatchObject({ width: 1600, height: 900 }); // scaled down
    expect(uploaded!.image!.src).toMatch(/^data:image\/webp;base64,/);
    expect([uploaded!.width, uploaded!.height]).toEqual([320, 180]);

    await card.click({ position: { x: 100, y: 60 } }); // the picture selects it
    const handle = page.locator('.react-flow__resize-control.handle.bottom.right');
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 20, { steps: 8 });
    await page.mouse.up();
    const [resized] = await images(page);
    expect(resized!.width).toBeGreaterThan(400);
    expect(resized!.width / resized!.height).toBeCloseTo(16 / 9, 1);

    await page.locator('main').click({ position: { x: 5, y: 5 } }); // focus leaves any text field
    await paste(page, await png(page, 300, 600), 'image/png');
    await expect(page.getByRole('group', { name: 'Untitled image' })).toHaveCount(2);

    await paste(page, btoa('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml');
    await expect(page.getByRole('status')).toContainText("That image can't be added");
    await expect(page.getByRole('group', { name: 'Untitled image' })).toHaveCount(2);

    await reopenApp(page);
    await expect(page.getByRole('group', { name: 'Untitled image' }).getByRole('img')).toHaveCount(
      2,
    );
  });

  test('an image card confirms before delete', async ({ page }) => {
    await paste(page, await png(page, 400, 300), 'image/png');
    await page.getByRole('button', { name: 'Image options' }).click();
    await page.getByRole('button', { name: 'Delete image' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete "Untitled image"?' });
    await expect(dialog).toContainText('Its picture will be deleted.');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Untitled image' })).toHaveCount(0);
  });
});
