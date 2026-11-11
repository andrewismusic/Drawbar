// DOM helpers
export const $ = id => document.getElementById(id);
let toastT = 0;
export function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
