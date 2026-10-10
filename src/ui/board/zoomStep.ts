/** Next zoom on the 10 % grid in `dir`: 100 % → 110 %, and an off-grid 115 % → 120 % / 110 %. */
export function zoomStep(zoom: number, dir: 1 | -1): number {
  const tens = Math.round(zoom * 100) / 10;
  return (dir > 0 ? Math.floor(tens) + 1 : Math.ceil(tens) - 1) / 10;
}
