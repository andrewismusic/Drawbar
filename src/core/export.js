// Export: recorded in real time (video and sound, sound, picture)
import { $, toast } from './dom.js';
import { mix, score } from './state.js';
import { audioReady, beatAt, secAt, sessionNow, startAudio } from './transport.js';
import { cv } from '../render/compose.js';
import { LANES } from '../sound/arranger.js';
import { actx } from '../sound/graph.js';
import { N } from '../sound/nodes.js';

export let downloadsCap, downloadsReady;
export async function saveFile(name, blob) {
  const d = await downloadsReady;
  if (!d) { toast('Saving files is not available in this view'); return; }
  try { await d.save({ filename: name, data: blob }); }
  catch (e) {
    const code = e && e.code;
    if (code === 'declined') return;
    toast(code === 'too_large' ? 'That file is too large to save here. Try a shorter length.' : code === 'rate_limited' ? 'Another save is still open. Try again in a moment.' : 'The file could not be saved here.');
  }
}
export function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
// When everything is clocked and nothing is left to chance, the piece repeats: find how long one full cycle is
export function cycleInfo() {
  if (mix.prob < 1 || !LANES.length) return null;
  let l = 1;
  for (const lane of LANES) {
    if (lane.base !== 'beat') return null;
    for (const p of [lane.period, lane.gateBeats || 0]) {
      if (!p) continue;
      const q = Math.round(p * 4);
      if (Math.abs(q - p * 4) > 1e-6) return null;
      l = l / gcd(l, q) * q;
      if (l > 4 * 256) return null;
    }
  }
  const beats = l / 4, bars = Math.ceil(beats / 4), secs = bars * 240 / score.tempo;
  return secs > 600 ? null : { bars, secs };
}
export const exState = { kind: 'video', len: '60' };
export function openExport() {
  const ci = cycleInfo();
  const lens = [];
  if (ci) lens.push(['cycle', `One full cycle (${ci.bars} bars, ${Math.round(ci.secs)} s)`]);
  lens.push(['30', '30 seconds'], ['60', '1 minute'], ['120', '2 minutes'], ['300', '5 minutes'], ['live', 'Until I stop']);
  if (!lens.some(l => l[0] === exState.len)) exState.len = ci ? 'cycle' : '60';
  $('exLen').innerHTML = '';
  for (const [v, label] of lens) { const b = document.createElement('button'); b.dataset.v = v; b.textContent = label; if (v === 'cycle') b.style.gridColumn = '1 / -1'; $('exLen').appendChild(b); }
  syncExport();
  $('exportDlg').hidden = false;
}
export function syncExport() {
  for (const b of $('exKind').children) b.setAttribute('aria-pressed', String(b.dataset.v === exState.kind));
  for (const b of $('exLen').children) b.setAttribute('aria-pressed', String(b.dataset.v === exState.len));
  $('exLen').hidden = exState.kind === 'png';
  const ci = cycleInfo();
  $('exNote').textContent = exState.kind === 'png' ? 'Saves the picture as it looks right now.'
    : (ci ? 'This piece repeats exactly, so one full cycle loops seamlessly. ' : 'With Probability below 100 or hand-drawn timing, this piece never repeats exactly, so pick a length. ')
      + 'Recording happens as it plays, and you can keep drawing while it records.';
  $('exGo').textContent = exState.kind === 'png' ? 'Save picture' : 'Start recording';
}
export const fileBase = () => `drawbar-${String(score.map).padStart(3, '0')}`;
export let rec = null;
export async function startRecording(kind, len) {
  if (rec) return;
  if (typeof MediaRecorder === 'undefined') { toast('Recording is not supported in this browser'); return; }
  await startAudio();
  if (!audioReady) { toast('Sound could not start, so nothing was recorded'); return; }
  const dest = actx.createMediaStreamDestination();
  N.out.connect(dest);
  const tracks = [...dest.stream.getAudioTracks()];
  if (kind === 'video') { const vs = cv.captureStream(30); tracks.unshift(...vs.getVideoTracks()); }
  const types = kind === 'video' ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'] : ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  let mr;
  try { mr = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 8e6, audioBitsPerSecond: 256000 } : undefined); }
  catch (e) { N.out.disconnect(dest); toast('Recording is not supported in this browser'); return; }
  const chunks = [];
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const ci = len === 'cycle' ? cycleInfo() : null;
  const total = len === 'live' ? 0 : ci ? ci.secs : +len;
  rec = { mr, dest, chunks, total, t0: 0, kind, fadeAt: 0, timer: 0 };
  mr.onstop = () => {
    clearInterval(rec.timer);
    try { N.out.disconnect(dest); } catch (e) {}
    N.out.gain.cancelScheduledValues(actx.currentTime); N.out.gain.setTargetAtTime(1, actx.currentTime, 0.05);
    const type = mr.mimeType || mime || (kind === 'video' ? 'video/webm' : 'audio/webm');
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type });
    rec = null; $('recPill').hidden = true;
    saveFile(fileBase() + (kind === 'audio' ? '-sound' : '') + '.' + ext, blob);
  };
  // A full cycle starts on the next bar line so the file loops cleanly
  const startIn = ci ? Math.max(0.02, secAt(Math.ceil(beatAt(sessionNow()) / 4) * 4) - sessionNow()) : 0;
  setTimeout(() => {
    if (!rec) return;
    mr.start(500); rec.t0 = performance.now();
    if (total && !ci) { const at = actx.currentTime + total - 1.5; N.out.gain.setValueAtTime(1, at); N.out.gain.linearRampToValueAtTime(0, at + 1.4); }
    rec.timer = setInterval(tickRec, 200);
  }, startIn * 1000);
  $('recPill').hidden = false; tickRec();
}
export const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
export function tickRec() {
  if (!rec) return;
  const el = rec.t0 ? (performance.now() - rec.t0) / 1000 : 0;
  $('recTime').textContent = rec.total ? fmtTime(el) + ' / ' + fmtTime(rec.total) : fmtTime(el);
  if (rec.total && el >= rec.total && rec.mr.state === 'recording') rec.mr.stop();
}
// Export dialog and recording controls
export function initExport() {
  downloadsReady = (async () => { try { return window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { return null; } })().then(d => downloadsCap = d);
  $('exKind').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v) { exState.kind = v; syncExport(); } });
  $('exLen').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v) { exState.len = v; syncExport(); } });
  $('exCancel').addEventListener('click', () => $('exportDlg').hidden = true);
  $('exportDlg').addEventListener('pointerdown', e => { if (e.target === $('exportDlg')) $('exportDlg').hidden = true; });
  $('exGo').addEventListener('click', async () => {
    $('exportDlg').hidden = true;
    if (exState.kind === 'png') { cv.toBlob(b => b && saveFile(fileBase() + '.png', b), 'image/png'); return; }
    await startRecording(exState.kind, exState.len);
  });
  $('recStop').addEventListener('click', () => { if (rec) { if (rec.mr.state === 'recording') rec.mr.stop(); else { try { N.out.disconnect(rec.dest); } catch (e) {} rec = null; $('recPill').hidden = true; } } });
}
