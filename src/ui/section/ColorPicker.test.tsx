import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { hexToHsv } from '../../domain/color';
import { ColorPicker } from './ColorPicker';

function setup(value = '#ff0000') {
  const onChange = vi.fn();
  const utils = render(<ColorPicker value={value} onChange={onChange} />);
  return { onChange, ...utils };
}

describe('ColorPicker', () => {
  it('applies a typed hex value on Enter, normalised', async () => {
    const { onChange } = setup();
    const hex = screen.getByRole('textbox', { name: 'Hex colour' });
    await userEvent.clear(hex);
    await userEvent.type(hex, '7038F4{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('#7038f4');
  });

  it('rejects an invalid hex value and keeps the colour', async () => {
    const { onChange } = setup();
    const hex = screen.getByRole('textbox', { name: 'Hex colour' });
    await userEvent.clear(hex);
    await userEvent.type(hex, '#7038f408{Enter}');
    expect(hex).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(hex).toHaveValue('#ff0000');
  });

  it('changes hue with the hue slider, keeping saturation and brightness', () => {
    const { onChange } = setup('#ff8080');
    fireEvent.change(screen.getByRole('slider', { name: 'Hue' }), { target: { value: '240' } });
    expect(onChange).toHaveBeenLastCalledWith('#8080ff');
  });

  it('moves saturation with ←/→ and brightness with ↑/↓ on the colour area (Shift = 10)', async () => {
    const { onChange } = setup('#808080'); // s 0, v ~0.5
    const area = screen.getByRole('slider', { name: 'Saturation and brightness' });
    area.focus();
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(hexToHsv(onChange.mock.lastCall![0] as string).s).toBeCloseTo(0.1, 2);
    await userEvent.keyboard('{ArrowDown}');
    expect(hexToHsv(onChange.mock.lastCall![0] as string).v).toBeCloseTo(0.49, 2);
  });

  it('follows a value changed from outside (e.g. undo)', () => {
    const { onChange, rerender } = setup('#ff0000');
    rerender(<ColorPicker value="#0000ff" onChange={onChange} />);
    expect(screen.getByRole('slider', { name: 'Hue' })).toHaveValue('240');
    expect(screen.getByRole('textbox', { name: 'Hex colour' })).toHaveValue('#0000ff');
  });

  it('keeps the chosen hue while the colour is grey (hex alone has no hue)', () => {
    const { onChange, rerender } = setup('#808080');
    fireEvent.change(screen.getByRole('slider', { name: 'Hue' }), { target: { value: '200' } });
    expect(onChange).toHaveBeenLastCalledWith('#808080');
    rerender(<ColorPicker value="#808080" onChange={onChange} />); // the parent echoes it back
    expect(screen.getByRole('slider', { name: 'Hue' })).toHaveValue('200');
  });
});
