/**
 * Background loop: bars from `theory.barEvents` scheduled ahead on the AudioContext clock (a
 * 50 ms pump, ~0.3 s lookahead), so timing does not depend on the main thread. A mood change
 * fades the bars already scheduled and starts the new mood on the next pump.
 */
import { getAudio, type AudioGraph } from './engine';
import {
  barEvents,
  barSeconds,
  BEATS_PER_BAR,
  midiToHz,
  type Mood,
  type NoteEvent,
} from './theory';

const LOOKAHEAD_S = 0.3;
const PUMP_MS = 50;
const FADE_S = 0.25;

let mood: Mood = 'calm';
let enabled = true;
let timer: ReturnType<typeof setInterval> | null = null;
let bar = 0;
let nextBarAt = 0;
/** Per-bar gain nodes still sounding (to fade on a mood change / music off). */
let live: { gain: GainNode; endsAt: number }[] = [];

function voiceNote(g: AudioGraph, out: GainNode, e: NoteEvent, at: number, beatS: number) {
  const { ctx } = g;
  const dur = e.beats * beatS;
  const amp = ctx.createGain();
  amp.connect(out);
  const oscs: OscillatorNode[] = [];
  const add = (type: OscillatorType, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = midiToHz(e.midi);
    o.detune.value = detune;
    oscs.push(o);
    return o;
  };
  let attack = 0.005;
  let release = 0.06;
  let peak = e.vel;
  let decayTo = 1;
  switch (e.voice) {
    case 'pad': {
      attack = Math.min(0.8, dur * 0.3);
      release = 0.9;
      peak *= 0.09;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1100;
      f.connect(amp);
      add('sawtooth', -6).connect(f);
      add('sawtooth', 6).connect(f);
      break;
    }
    case 'bass':
      peak *= 0.38;
      decayTo = 0.7;
      add('triangle').connect(amp);
      break;
    case 'arp': {
      peak *= 0.11;
      decayTo = 0.35;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2600;
      f.connect(amp);
      add('square').connect(f);
      break;
    }
    case 'pulse':
      peak *= 0.05;
      decayTo = 0.2;
      add('square').connect(amp);
      break;
  }
  const p = amp.gain;
  p.setValueAtTime(0, at);
  p.linearRampToValueAtTime(peak, at + attack);
  p.linearRampToValueAtTime(peak * decayTo, at + Math.max(attack + 0.01, dur * 0.6));
  p.linearRampToValueAtTime(0, at + dur + release);
  for (const o of oscs) {
    o.start(at);
    o.stop(at + dur + release + 0.05);
  }
}

function scheduleBar(g: AudioGraph, at: number): number {
  const length = barSeconds(mood);
  const beatS = length / BEATS_PER_BAR;
  const out = g.ctx.createGain();
  out.gain.value = 1;
  out.connect(g.music);
  for (const e of barEvents(mood, bar)) voiceNote(g, out, e, at + e.beat * beatS, beatS);
  live.push({ gain: out, endsAt: at + length + 1 });
  return length;
}

function fadeLive(g: AudioGraph) {
  const now = g.ctx.currentTime;
  for (const { gain } of live) {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + FADE_S);
  }
  live = [];
}

function pump() {
  const g = getAudio();
  if (!g || !enabled) return;
  try {
    const now = g.ctx.currentTime;
    live = live.filter((l) => l.endsAt > now);
    if (nextBarAt < now) nextBarAt = now + 0.05;
    while (nextBarAt < now + LOOKAHEAD_S) {
      nextBarAt += scheduleBar(g, nextBarAt);
      bar++;
    }
  } catch {
    // Music must never break the game.
  }
}

/** Starts the pump (idempotent). Sound only plays once audio is unlocked. */
export function startMusic(): void {
  if (timer !== null || typeof setInterval === 'undefined') return;
  timer = setInterval(pump, PUMP_MS);
}

/** Stops the pump and fades whatever is scheduled. */
export function stopMusic(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  const g = getAudio();
  if (g) fadeLive(g);
  live = [];
  nextBarAt = 0;
}

/** Switches the loop's mood, fading the current bars out (no-op if unchanged). */
export function setMood(next: Mood): void {
  if (next === mood) return;
  mood = next;
  bar = 0;
  const g = getAudio();
  if (g) {
    fadeLive(g);
    nextBarAt = g.ctx.currentTime + FADE_S * 0.6;
  } else {
    nextBarAt = 0;
  }
}

export function setMusicEnabled(on: boolean): void {
  if (on === enabled) return;
  enabled = on;
  if (!on) {
    const g = getAudio();
    if (g) fadeLive(g);
    live = [];
  }
  nextBarAt = 0;
  bar = 0;
}
