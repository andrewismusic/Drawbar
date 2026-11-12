// Note pulses for visuals that react to the music (the Glitch strokes). The scheduler records each note it plays;
// the picture reads a decaying "energy" from the recent ones. One-way: nothing here ever feeds back into the music.
const P = [];
export function notePulse(S, w, drum, id) { P.push([S, w, drum, id]); if (P.length > 64) P.shift(); }
// Energy right now (S = the picture's clock, in session seconds): drum hits overall, and tone notes per stroke id
export function pulseFrame(S) {
  let drum = 0;
  const by = new Map();
  for (const p of P) {
    const d = S - p[0];
    if (d < 0 || d > 0.6) continue;
    const v = p[1] * Math.exp(-d / 0.14);
    if (p[2]) drum += v; else by.set(p[3], Math.min((by.get(p[3]) || 0) + v, 1.5));
  }
  return { drum: Math.min(drum, 1.5), by };
}
