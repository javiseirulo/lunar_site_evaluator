/**
 * The Mission's single AudioContext: master → (music bus, sfx bus) → speakers.
 *
 * The context is created only by `unlock()`, which the game calls from its first click or
 * keypress (browsers block audio before a user gesture). Muting, a hidden tab or leaving the
 * game suspend the context. Without Web Audio (SSR, tests, old browsers) every call is a no-op
 * and `getAudio()` returns null.
 */
import { adsr } from './theory';

/** Conservative levels: music sits clearly under the effects. */
const MASTER_GAIN = 0.55;
const MUSIC_GAIN = 0.16;
const SFX_GAIN = 0.75;

export interface AudioGraph {
  ctx: AudioContext;
  music: GainNode;
  sfx: GainNode;
}

let graph: AudioGraph | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
let hidden = false;
let active = false;

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function shouldRun(): boolean {
  return active && !muted && !hidden;
}

function sync(): void {
  const ctx = graph?.ctx;
  if (!ctx) return;
  try {
    if (shouldRun()) {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    } else if (ctx.state === 'running') {
      void ctx.suspend().catch(() => {});
    }
  } catch {
    // ignore
  }
}

/** Creates (first call) and resumes the context. Call only from a user gesture. */
export function unlock(): void {
  active = true;
  if (!graph) {
    const Ctor = audioCtor();
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
      const music = ctx.createGain();
      music.gain.value = MUSIC_GAIN;
      music.connect(master);
      const sfx = ctx.createGain();
      sfx.gain.value = SFX_GAIN;
      sfx.connect(master);
      graph = { ctx, music, sfx };
    } catch {
      graph = null;
      return;
    }
  }
  sync();
}

/** True once a gesture has unlocked audio and it is not muted/hidden. */
export function isUnlocked(): boolean {
  return graph !== null;
}

export function setMuted(value: boolean): void {
  muted = value;
  sync();
}

export function setHidden(value: boolean): void {
  hidden = value;
  sync();
}

/** The game unmounted: suspend until the next `unlock()`. */
export function deactivate(): void {
  active = false;
  sync();
}

/** The graph if sound can play right now, else null (callers then skip the sound). */
export function getAudio(): AudioGraph | null {
  if (!graph || !shouldRun()) return null;
  return graph;
}

/** One second of white noise, shared by every noise effect. */
export function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}

/** Applies `adsr(...)` to `param` starting at `at`; returns the time the envelope ends. */
export function envelope(
  param: AudioParam,
  at: number,
  peak: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  hold: number,
): number {
  const pts = adsr(peak, attack, decay, sustain, release, hold);
  param.cancelScheduledValues(at);
  param.setValueAtTime(0, at);
  for (const p of pts.slice(1)) param.linearRampToValueAtTime(p.v, at + p.t);
  return at + pts[pts.length - 1]!.t;
}
