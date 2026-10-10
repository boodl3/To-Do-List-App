import { expect, test, type Page } from '@playwright/test';
import { dragSection, newSection, openApp, readDoc } from './helpers';

const nodeOf = (page: Page, title: string) =>
  page.locator('.react-flow__node', { has: page.getByRole('group', { name: title }) });
const edgePath = (page: Page) => page.locator('.react-flow__edge-path').first();

async function connectByMenu(page: Page, from: string, to: string) {
  await nodeOf(page, from).getByRole('button', { name: 'Section options' }).click();
  await page.getByRole('button', { name: `Connect to ${to}` }).click();
}

async function selectEdge(page: Page) {
  const box = (await edgePath(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('toolbar', { name: 'Connection' })).toBeVisible();
}

test.describe('US6 — connect sections', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await newSection(page, 'Study');
    await newSection(page, 'Mock exam');
  });

  test('dragging from an edge handle to another section creates an arrow', async ({ page }) => {
    const from = nodeOf(page, 'Study').locator('.react-flow__handle-right');
    const to = nodeOf(page, 'Mock exam').locator('.react-flow__handle-left');
    await nodeOf(page, 'Study').hover();
    await from.dragTo(to, { force: true });
    const { connections, sections } = (await readDoc(page)).board;
    const id = (title: string) => sections.find((s) => s.title === title)!.id;
    expect(connections).toEqual([
      expect.objectContaining({ from: id('Study'), to: id('Mock exam'), style: 'arrow' }),
    ]);
    await expect(edgePath(page)).toHaveAttribute('marker-end', /url/);
  });

  test('the connection follows a moved section', async ({ page }) => {
    await connectByMenu(page, 'Study', 'Mock exam');
    const before = await edgePath(page).getAttribute('d');
    await dragSection(page, 'Mock exam', 0, 200);
    await expect.poll(() => edgePath(page).getAttribute('d')).not.toBe(before);
  });

  test('switch to a line, reverse, label and delete from the connection toolbar', async ({
    page,
  }) => {
    await connectByMenu(page, 'Study', 'Mock exam');
    await selectEdge(page);
    const toolbar = page.getByRole('toolbar', { name: 'Connection' });
    await toolbar.getByRole('button', { name: 'Line' }).click();
    await expect(edgePath(page)).not.toHaveAttribute('marker-end', /url/);
    await toolbar.getByRole('button', { name: 'Reverse direction' }).click();
    await toolbar.getByRole('textbox', { name: 'Label' }).fill('then');
    await toolbar.getByRole('textbox', { name: 'Label' }).press('Enter');
    await expect(page.locator('.react-flow__edgelabel-renderer')).toContainText('then');
    let c = (await readDoc(page)).board;
    const id = (title: string) => c.sections.find((s) => s.title === title)!.id;
    expect(c.connections[0]).toMatchObject({ style: 'line', label: 'then', from: id('Mock exam') });

    await toolbar.getByRole('button', { name: 'Delete connection' }).click();
    c = (await readDoc(page)).board;
    expect(c.connections).toEqual([]);
  });

  test('a connection can be curved like the drag preview, and back', async ({ page }) => {
    await connectByMenu(page, 'Study', 'Mock exam');
    await expect(edgePath(page)).toHaveAttribute('d', /L/); // straight segment
    await selectEdge(page);
    const toolbar = page.getByRole('toolbar', { name: 'Connection' });
    await toolbar.getByRole('button', { name: 'Curved' }).click();
    await expect(edgePath(page)).toHaveAttribute('d', /C/); // cubic bezier, as the preview
    await expect(edgePath(page)).toHaveAttribute('marker-end', /url/); // still an arrow
    expect((await readDoc(page)).board.connections[0]).toMatchObject({ shape: 'curved' });
    await expect(toolbar.getByRole('button', { name: 'Curved' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await toolbar.getByRole('button', { name: 'Curved' }).click();
    await expect(edgePath(page)).toHaveAttribute('d', /L/);
  });

  test('self and duplicate connections are not offered', async ({ page }) => {
    await connectByMenu(page, 'Study', 'Mock exam');
    await nodeOf(page, 'Study').getByRole('button', { name: 'Section options' }).click();
    await expect(page.getByRole('button', { name: 'Connect to Study' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Connect to Mock exam' })).toBeDisabled();
  });

  test('deleting a section removes its connections; undo restores both', async ({ page }) => {
    await connectByMenu(page, 'Study', 'Mock exam');
    await nodeOf(page, 'Mock exam').getByRole('button', { name: 'Section options' }).click();
    await page.getByRole('button', { name: 'Delete section' }).click();
    expect((await readDoc(page)).board.connections).toEqual([]);
    await page.keyboard.press('Control+z');
    const b = (await readDoc(page)).board;
    expect(b.sections).toHaveLength(2);
    expect(b.connections).toHaveLength(1);
  });

  test('a connection can be made with the keyboard only', async ({ page }) => {
    await nodeOf(page, 'Study').getByRole('button', { name: 'Section options' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Connect to Mock exam' }).focus();
    await page.keyboard.press('Enter');
    expect((await readDoc(page)).board.connections).toHaveLength(1);
  });
});
