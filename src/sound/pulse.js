// Note pulses for visuals that react to the music (the Glitch effects). The scheduler records each note it plays;
// the picture reads a decaying "energy" from the recent ones. One-way: nothing here ever feeds back into the music.
const P = [];
export function notePulse(S, w, drum) { P.push([S, w, drum]); if (P.length > 64) P.shift(); }
// Energy right now (S = the picture's clock, in session seconds): tone and drum, each 0 to about 1.5
export function pulseEnergy(S) {
  let tone = 0, drum = 0;
  for (const p of P) {
    const d = S - p[0];
    if (d < 0 || d > 0.6) continue;
    const v = p[1] * Math.exp(-d / 0.14);
    if (p[2]) drum += v; else tone += v;
  }
  return { tone: Math.min(tone, 1.5), drum: Math.min(drum, 1.5) };
}
