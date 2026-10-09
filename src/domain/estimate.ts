/** Estimate grammar (data-model "Estimate input grammar", FR-012). Values are whole minutes. */
export const MAX_ESTIMATE_MIN = 5940; // 99 h

export type ParseEstimateResult =
  { ok: true; value: number | null } | { ok: false; message: string };

const H = '(?:h|hr|hrs|hour|hours)';
const M = '(?:m|min|mins|minute|minutes)';
const MINUTES = /^(\d+)$/;
const ONLY_M = new RegExp(`^(\\d+)${M}$`);
const ONLY_H = new RegExp(`^(\\d+(?:\\.\\d+)?)${H}$`);
const H_AND_M = new RegExp(`^(\\d+)${H}(\\d+)${M}$`);

const FORMAT_HINT = 'Use a time like 25m, 1h or 1h 30m';

export function parseEstimate(input: string): ParseEstimateResult {
  const s = input.toLowerCase().replace(/\s+/g, '');
  if (s === '') return { ok: true, value: null };

  let minutes: number | undefined;
  let m: RegExpMatchArray | null;
  if ((m = MINUTES.exec(s) ?? ONLY_M.exec(s))) minutes = Number(m[1]);
  else if ((m = ONLY_H.exec(s))) minutes = Math.round(Number(m[1]) * 60);
  else if ((m = H_AND_M.exec(s)) && Number(m[2]) < 60) minutes = Number(m[1]) * 60 + Number(m[2]);

  if (minutes === undefined) return { ok: false, message: FORMAT_HINT };
  if (minutes > MAX_ESTIMATE_MIN) return { ok: false, message: 'Estimates can be at most 99h' };
  return { ok: true, value: minutes === 0 ? null : minutes };
}

export function formatEstimate(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
