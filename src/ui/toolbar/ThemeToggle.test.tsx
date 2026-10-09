import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../test-utils';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('has labelled sun and moon buttons; the OS theme is active until the user chooses', () => {
    renderWithApp(<ThemeToggle />); // test platform reports a light OS theme
    expect(screen.getByRole('button', { name: 'Light mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switches theme without adding an undo step', async () => {
    const { store } = renderWithApp(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(store.getState().doc.prefs.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(store.getState().history.past).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Light mode' }));
    expect(store.getState().doc.prefs.theme).toBe('light');
  });
});
