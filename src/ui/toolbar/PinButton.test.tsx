import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Notice } from '../app/Notice';
import { renderWithApp } from '../test-utils';
import { PinButton } from './PinButton';

describe('PinButton', () => {
  it('pins and unpins, reflecting the state the OS applied', async () => {
    const { store, platform } = renderWithApp(<PinButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Pin on top' }));
    const unpin = await screen.findByRole('button', { name: 'Unpin from top' });
    expect(unpin).toHaveAttribute('aria-pressed', 'true');
    expect(await platform.window.isPinned()).toBe(true);
    expect(store.getState().doc.prefs.pinned).toBe(true);
    expect(store.getState().history.past).toHaveLength(0);

    await userEvent.click(unpin);
    expect(await screen.findByRole('button', { name: 'Pin on top' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(store.getState().doc.prefs.pinned).toBe(false);
  });

  it('stays unpinned and explains when the OS refuses', async () => {
    const { store, refusePin } = renderWithApp(
      <>
        <PinButton />
        <Notice />
      </>,
    );
    refusePin();
    await userEvent.click(screen.getByRole('button', { name: 'Pin on top' }));
    expect(await screen.findByText("Couldn't keep the window on top.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pin on top' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(store.getState().doc.prefs.pinned).toBe(false);
  });
});
