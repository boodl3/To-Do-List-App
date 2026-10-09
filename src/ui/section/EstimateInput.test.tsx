import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EstimateInput } from './EstimateInput';

function Stateful({
  initial,
  onCommit,
}: {
  initial: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <EstimateInput
      value={value}
      label="Estimate for Read"
      onCommit={(v) => {
        onCommit(v);
        setValue(v);
      }}
    />
  );
}

function setup(value: number | null = 25) {
  const onCommit = vi.fn();
  render(<Stateful initial={value} onCommit={onCommit} />);
  return { onCommit, input: screen.getByRole('textbox', { name: 'Estimate for Read' }) };
}

describe('EstimateInput', () => {
  it('shows the formatted value', () => {
    expect(setup(90).input).toHaveValue('1h 30m');
  });

  it('commits a valid entry on blur and normalizes it', async () => {
    const { input, onCommit } = setup();
    await userEvent.clear(input);
    await userEvent.type(input, '1.5h');
    await userEvent.tab();
    expect(onCommit).toHaveBeenCalledWith(90);
    expect(input).toHaveValue('1h 30m');
  });

  it('marks invalid input, explains it, and keeps the previous value', async () => {
    const { input, onCommit } = setup(25);
    await userEvent.clear(input);
    await userEvent.type(input, 'abc');
    await userEvent.tab();
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/25m, 1h or 1h 30m/);
    expect(input).toHaveValue('25m');
  });

  it('clears the error on the next edit and Escape reverts a draft', async () => {
    const { input, onCommit } = setup(25);
    await userEvent.clear(input);
    await userEvent.type(input, 'abc');
    await userEvent.tab();
    await userEvent.type(input, '{Backspace}');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    await userEvent.clear(input);
    await userEvent.type(input, '2h{Escape}');
    expect(input).toHaveValue('25m');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('clears the estimate when emptied', async () => {
    const { input, onCommit } = setup(25);
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onCommit).toHaveBeenCalledWith(null);
  });
});
