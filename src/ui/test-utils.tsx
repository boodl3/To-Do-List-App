import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { emptyDocument } from '../domain/defaults';
import type { AppDocument } from '../domain/schema';
import { fakeClock, fakeDocumentStore, fakeTimer, fakeWindow } from '../platform/fake';
import type { Platform } from '../platform/ports';
import { createAppStore } from '../state/store';
import { Providers } from './app/PlatformProvider';

/** Renders `ui` inside a hydrated store and a fake platform. */
export function renderWithApp(ui: ReactElement, { doc }: { doc?: AppDocument } = {}) {
  const clock = fakeClock();
  const win = fakeWindow();
  const platform: Platform = {
    store: fakeDocumentStore(localStorage),
    window: win.controls,
    timer: fakeTimer(clock).timer,
    clock,
    systemTheme: { prefersDark: () => false, onChange: () => () => undefined },
  };
  const store = createAppStore(platform);
  store.getState().hydrate(doc ?? emptyDocument(0));
  const view = render(
    <Providers platform={platform} store={store}>
      {ui}
    </Providers>,
  );
  return { ...view, store, platform, refusePin: win.refusePin };
}
