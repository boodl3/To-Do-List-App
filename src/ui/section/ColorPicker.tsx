import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { hexToHsv, hsvToHex, parseHex, type Hsv } from '../../domain/color';
import styles from './ColorPicker.module.css';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pct = (n: number) => Math.round(n * 100);

/**
 * Custom section colour (FR-007): saturation/brightness area, hue slider, hex field. Opaque only.
 * `onChange` fires live; drags are bracketed by `onGestureStart`/`onGestureEnd` (one undo step).
 */
export function ColorPicker({
  value,
  onChange,
  onGestureStart,
  onGestureEnd,
}: {
  value: string;
  onChange: (hex: string) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  // Follow outside changes (undo, hex field) but keep our own hue when the hex is the same:
  // a grey or black hex carries no hue, and the slider shouldn't jump back to red.
  if (hsvToHex(hsv) !== value) setHsv(hexToHsv(value));
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const area = useRef<HTMLDivElement>(null);

  const apply = (next: Hsv) => {
    setHsv(next);
    onChange(hsvToHex(next));
  };
  const startGesture = () => {
    onGestureStart?.();
    window.addEventListener('pointerup', () => onGestureEnd?.(), { once: true });
  };

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    apply({
      ...hsv,
      s: clamp01((e.clientX - r.left) / r.width),
      v: 1 - clamp01((e.clientY - r.top) / r.height),
    });
  };
  const onAreaKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    const step = e.shiftKey ? 0.1 : 0.01;
    apply({ ...hsv, s: clamp01(hsv.s + d[0]! * step), v: clamp01(hsv.v + d[1]! * step) });
  };

  const commitHex = () => {
    if (draft === null) return;
    const hex = parseHex(draft);
    setInvalid(!hex);
    if (!hex) return;
    setDraft(null);
    if (hex !== value) onChange(hex);
  };

  return (
    <div className={styles.picker}>
      <div
        ref={area}
        className={styles.area}
        style={{ '--hue': hsv.h } as React.CSSProperties}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct(hsv.s)}
        aria-valuetext={`Saturation ${pct(hsv.s)}%, brightness ${pct(hsv.v)}%`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          startGesture();
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
        }}
        onKeyDown={onAreaKey}
      >
        <span
          className={styles.thumb}
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>
      <div className={styles.row}>
        <input
          type="range"
          className={styles.hue}
          min={0}
          max={360}
          value={Math.round(hsv.h)}
          aria-label="Hue"
          onPointerDown={startGesture}
          onChange={(e) => {
            apply({ ...hsv, h: e.target.valueAsNumber });
          }}
        />
        <input
          type="text"
          className={`${styles.hex} tabular-nums`}
          aria-label="Hex colour"
          aria-invalid={invalid}
          spellCheck={false}
          maxLength={9}
          value={draft ?? value}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onBlur={commitHex}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitHex();
            if (e.key === 'Escape' && draft !== null) {
              e.stopPropagation(); // first Escape cancels the edit, not the popover
              setDraft(null);
              setInvalid(false);
            }
          }}
        />
      </div>
    </div>
  );
}
