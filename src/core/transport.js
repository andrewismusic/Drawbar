// Clock and transport: tempo-anchored beats, and play/stop as a virtual clock
import { cellDims, cycleBeats } from '../canvas/index.js';
import { TAU, mod } from './math.js';
import { score } from './state.js';
import { syncSound } from './ui.js';
import { actx, applyAudio, applyTone, buildAudio } from '../sound/graph.js';
import { N } from '../sound/nodes.js';

export const perfOrigin = performance.now() / 1000;
export let audioReady = false, audioOffset = 0, playing = false, lastEnd = 0;
export const setLastEnd = S => { lastEnd = S; };
export const tempo = { aS: 0, aB: 0, bpm: score.tempo };
export function rawNow() { return audioReady && actx.state === 'running' ? actx.currentTime + audioOffset : performance.now() / 1000 - perfOrigin; }
// Play / stop freezes the whole piece in place (music and motion) and picks up from the same spot
export let paused = false, pauseAt = 0, pausedTotal = 0;
export function sessionNow() { return paused ? pauseAt : rawNow() - pausedTotal; }
export function visNow() { return sessionNow() - (audioReady ? (actx.outputLatency || actx.baseLatency || 0) : 0); }
export const beatAt = S => tempo.aB + (S - tempo.aS) * tempo.bpm / 60;
export const secAt = B => tempo.aS + (B - tempo.aB) * 60 / tempo.bpm;
export function setBpm(b) { const S = playing ? Math.max(lastEnd, sessionNow()) : sessionNow(); tempo.aB = beatAt(S); tempo.aS = S; tempo.bpm = b; }
export const rotAt = B => score.mode === 'kaleido' || (score.mode === 'free' && score.frot) ? TAU * B / 24 : 0;
export function scrollAt(B) { const cd = cellDims(); return cd ? mod(cd[1] * B / cycleBeats(), cd[1]) : 0; }
// Sound starts on the first touch (browser autoplay rules)
export function startAudio() {
  if (!actx) buildAudio();
  const go = () => {
    if (!audioReady) { audioOffset = (performance.now() / 1000 - perfOrigin) - actx.currentTime; audioReady = true; applyAudio(); applyTone(0.01); }
    playing = true;
    lastEnd = sessionNow() + 0.03;
    N.master.gain.cancelScheduledValues(actx.currentTime);
    N.master.gain.setTargetAtTime(0.85, actx.currentTime, 0.15);
    syncSound();
  };
  if (actx.state !== 'running') return actx.resume().then(go).catch(() => {});
  go();
  return Promise.resolve();
}
export function setPaused(on) {
  if (on === paused) return;
  if (on) { pauseAt = sessionNow(); paused = true; }
  else { pausedTotal = rawNow() - pauseAt; paused = false; lastEnd = sessionNow() + 0.03; if (!playing) startAudio(); }
  if (audioReady) N.droneBus.gain.setTargetAtTime(on ? 0 : 1, actx.currentTime, 0.2);
  syncSound();
}
export function stopAudio() { playing = false; if (actx) N.master.gain.setTargetAtTime(0, actx.currentTime, 0.1); syncSound(); }
