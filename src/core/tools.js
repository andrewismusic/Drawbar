export const TOOLS = [
  { id: 'glow', name: 'Brush', kind: 'static', icon: '<path d="M4 16c4-8 12 0 16-8" stroke-width="3.2"/>' },
  { id: 'beads', name: 'Beads', kind: 'static', icon: '<g fill="currentColor" stroke="none"><circle cx="5" cy="16" r="2.6"/><circle cx="10.5" cy="12" r="2.2"/><circle cx="15.5" cy="10.2" r="2"/><circle cx="20" cy="7.6" r="2.4"/></g>' },
  { id: 'loop', name: 'Loop', kind: 'anim', icon: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M17.5 3.5v4h-4"/>' },
  // Trace (Glitch): a loop that leaves nothing behind: only the moving tip of the gesture shows, going round and round.
  // Stored as a loop stroke with head: true, so the music treats it exactly as a loop.
  { id: 'trace', name: 'Trace', kind: 'anim', as: 'loop', icon: '<path d="M19 12a7 7 0 1 1-2.1-5" stroke-dasharray="1.5 3.2"/><circle cx="17" cy="7" r="2.6" fill="currentColor" stroke="none"/>' },
  { id: 'ripple', name: 'Ripple', kind: 'drone', icon: '<path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>' },
  // Stamps (Geometric): tap to stamp at the size bar's size, or press and drag to set size and turn. stamp: the shape;
  // voice: which tool's instrument plays them (stamps borrow Beads', so maps need no new choices)
  { id: 'circle', name: 'Circle', kind: 'static', stamp: 'circle', voice: 'beads', icon: '<circle cx="12" cy="12" r="7.5" fill="currentColor" stroke="none"/>' },
  { id: 'square', name: 'Square', kind: 'static', stamp: 'square', voice: 'beads', icon: '<rect x="5" y="5" width="14" height="14" fill="currentColor" stroke="none"/>' },
  { id: 'triangle', name: 'Triangle', kind: 'static', stamp: 'triangle', voice: 'beads', icon: '<path d="M12 4l8.5 15h-17z" fill="currentColor" stroke="none"/>' },
  { id: 'hexagon', name: 'Hexagon', kind: 'static', stamp: 'hexagon', voice: 'beads', icon: '<path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z" fill="currentColor" stroke="none"/>' },
  { id: 'star', name: 'Star', kind: 'static', stamp: 'star', voice: 'beads', icon: '<path d="M12 3.5l2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.1-5.3 3.1 1.3-6-4.6-4.1 6.1-.6z" fill="currentColor" stroke="none"/>' },
  { id: 'erase', name: 'Erase', kind: 'erase', icon: '<path d="M8 19h12"/><path d="M4.5 15.5l8-8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H7z"/>' },
];
export const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));
// Brush size: 1.5x the original line up to brushMax x. brushMax is set by the layout so the largest brush is as big
// on screen as the size control (v26; it was a fixed 24x, far bigger than the control could show at real size).
export const LINE = 0.0068 * 1.1;   // a 1x line's half-width, in drawing units (NEON_W x 1.1)
let brushMax = 12;
export const setBrushMax = m => { brushMax = Math.min(24, Math.max(3, m)); };
export const brushSize = v => 1.5 * Math.pow(brushMax / 1.5, v / 100);
export const eraseRadius = v => 0.025 * Math.pow(6, v / 100);    // 0.025 to 0.15 of the drawing radius
// Stamp size from the size control, in drawing units: the same width on screen as a brush at that setting
// (drag while stamping for anything bigger)
export const stampRadius = v => LINE * brushSize(v);
