import type { Page } from '@playwright/test';

/** Fresh app with empty storage (or a fixture from tests/fixtures). */
export async function openApp(page: Page, { fixture }: { fixture?: string } = {}) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(fixture ? `/?fixture=${fixture}` : '/');
  await page.getByRole('toolbar', { name: 'Board' }).waitFor();
}

/** Simulates quitting and relaunching: reload with storage intact, after autosave flushed. */
export async function reopenApp(page: Page) {
  await page.waitForTimeout(1100); // autosave max wait is 1 s (FR-028)
  await page.reload();
  await page.getByRole('toolbar', { name: 'Board' }).waitFor();
}

export async function advanceClock(page: Page, ms: number) {
  await page.evaluate((delta) => {
    window.__focusboardFake?.clock.advance(delta);
  }, ms);
}

export async function refusePin(page: Page) {
  await page.evaluate(() => {
    window.__focusboardFake?.window.refusePin(true);
  });
}

/** The persisted document, after autosave has flushed. */
export async function readDoc(page: Page) {
  await page.waitForTimeout(1100);
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('focusboard.json') ?? 'null') as {
        board: {
          sections: {
            id: string;
            title: string;
            accent: string;
            x: number;
            y: number;
            width: number;
            height: number;
            tasks: unknown[];
          }[];
          connections: { from: string; to: string; style: string; shape: string; label: string }[];
          viewport: { x: number; y: number; zoom: number };
        };
        pomodoro: {
          mode: string;
          status: { kind: string };
          completedToday: { count: number };
          widget: { x: number; y: number; width: number; height: number; visible: boolean };
          settings: { focusMin: number };
        };
        prefs: { theme: string; pinned: boolean };
      },
  );
}

export async function newSection(page: Page, title: string) {
  await page.getByRole('button', { name: 'New section' }).first().click();
  await page.getByRole('textbox', { name: 'Section title' }).last().waitFor();
  await page.keyboard.type(title);
  await page.keyboard.press('Enter');
}

/** Drags a section by the empty top-left corner of its header. */
export async function dragSection(
  page: Page,
  title: string,
  dx: number,
  dy: number,
  { alt = false } = {},
) {
  const header = page.getByRole('group', { name: title }).locator('header');
  const box = (await header.boundingBox())!;
  await page.mouse.move(box.x + 6, box.y + 6);
  if (alt) await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(box.x + 6 + dx / 2, box.y + 6 + dy / 2, { steps: 5 });
  await page.mouse.move(box.x + 6 + dx, box.y + 6 + dy, { steps: 5 });
  await page.mouse.up();
  if (alt) await page.keyboard.up('Alt');
}
