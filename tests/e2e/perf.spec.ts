import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

// Rough CI version of Constitution V (≥ 60 fps dragging with 50 sections + 100 connections).
// The real gate is measured on the native release build (quickstart.md → Performance check).
// Runs in its own Playwright project after the others, so parallel tests don't steal frames.
test('dragging a section on the large board stays smooth', async ({ page }) => {
  await openApp(page, { fixture: 'large-board-50x100' });
  await page.getByRole('button', { name: 'Fit all' }).click();
  const header = page.getByRole('group', { name: 'Section 23' }).locator('header');
  const box = (await header.boundingBox())!;

  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __sampling: boolean };
    w.__frames = [];
    w.__sampling = true;
    let last = performance.now();
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      if (w.__sampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.mouse.move(box.x + 6, box.y + 6);
  await page.mouse.down();
  const start = Date.now();
  for (let i = 0; Date.now() - start < 3000; i++) {
    await page.mouse.move(box.x + 6 + 120 * Math.sin(i / 10), box.y + 6 + 80 * Math.cos(i / 10));
  }
  await page.mouse.up();

  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __sampling: boolean };
    w.__sampling = false;
    return w.__frames.slice(5).sort((a, b) => a - b);
  });
  const at = (q: number) => frames[Math.floor(frames.length * q)]!;
  console.log(
    `frames=${frames.length} median=${at(0.5).toFixed(1)}ms p95=${at(0.95).toFixed(1)}ms`,
  );
  expect(frames.length).toBeGreaterThan(60);
  expect(at(0.5)).toBeLessThanOrEqual(16.7 + 1); // vsync jitter
  expect(at(0.95)).toBeLessThanOrEqual(33);
});
