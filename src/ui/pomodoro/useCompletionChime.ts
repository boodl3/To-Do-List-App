import { useEffect, useRef } from 'react';
import { useApp } from '../../state/selectors';

/** A short two-note chime via Web Audio: no audio file to bundle. */
function playChime() {
  const Ctx = window.AudioContext as typeof AudioContext | undefined;
  if (!Ctx) return;
  const ctx = new Ctx();
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + i * 0.18;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
  setTimeout(() => void ctx.close(), 1500);
}

/** Plays the chime when a session completes and sound is on (FR-022). */
export function useCompletionChime() {
  const signal = useApp((s) => s.completionSignal);
  const sound = useApp((s) => s.doc.pomodoro.settings.sound);
  const seen = useRef(signal);
  useEffect(() => {
    if (signal === seen.current) return;
    seen.current = signal;
    if (sound) playChime();
  }, [signal, sound]);
}
