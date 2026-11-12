// Colour helpers
export const DISC = [21, 25, 39];
export const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const rgbStr = c => 'rgb(' + c.map(v => Math.round(v)).join(',') + ')';
export const toRgb = c => c[0] === '#' ? hexRgb(c) : c.match(/\d+/g).map(Number);
export const tint = (h, k) => rgbStr(toRgb(h).map(v => v + (255 - v) * k));
export const shade = (h, k) => rgbStr(toRgb(h).map(v => v * (1 - k)));
export const rgba = (c, a) => { const v = toRgb(c); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; };
