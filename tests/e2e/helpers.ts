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
