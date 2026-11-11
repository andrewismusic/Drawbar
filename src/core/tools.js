export const TOOLS = [
  { id: 'glow', name: 'Brush', kind: 'static', icon: '<path d="M4 16c4-8 12 0 16-8" stroke-width="3.2"/>' },
  { id: 'beads', name: 'Beads', kind: 'static', icon: '<g fill="currentColor" stroke="none"><circle cx="5" cy="16" r="2.6"/><circle cx="10.5" cy="12" r="2.2"/><circle cx="15.5" cy="10.2" r="2"/><circle cx="20" cy="7.6" r="2.4"/></g>' },
  { id: 'loop', name: 'Loop', kind: 'anim', icon: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M17.5 3.5v4h-4"/>' },
  { id: 'ripple', name: 'Ripple', kind: 'drone', icon: '<path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>' },
  { id: 'erase', name: 'Erase', kind: 'erase', icon: '<path d="M8 19h12"/><path d="M4.5 15.5l8-8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H7z"/>' },
];
export const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));
export const brushSize = v => 1.5 * Math.pow(8, v / 100);        // 1.5x to 12x the original line
export const eraseRadius = v => 0.025 * Math.pow(6, v / 100);    // 0.025 to 0.15 of the drawing radius
