/**
 * One-shot sound effects, all synthesised (oscillators + a noise buffer). Every function is a
 * no-op until audio is unlocked and while it is muted or the tab is hidden. `delay` is in
 * seconds from now.
 */
import type { FailCause } from '../engine/simulate';
import { envelope, getAudio, noiseBuffer, type AudioGraph } from './engine';
import { blipMidi, midiToHz } from './theory';

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Glide target (exponential) reached at the end of `dur`. */
  to?: number;
  dur: number;
  peak: number;
  attack?: number;
  release?: number;
  delay?: number;
  /** Low-pass cutoff in Hz. */
  lowpass?: number;
  detune?: number;
}

function tone(g: AudioGraph, o: ToneOpts): void {
  const { ctx } = g;
  const at = ctx.currentTime + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(o.freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), at + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  const amp = ctx.createGain();
  const end = envelope(amp.gain, at, o.peak, o.attack ?? 0.004, 0, 1, o.release ?? 0.04, o.dur);
  let node: AudioNode = osc;
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    osc.connect(f);
    node = f;
  }
  node.connect(amp);
  amp.connect(g.sfx);
  osc.start(at);
  osc.stop(end + 0.02);
}

interface NoiseOpts {
  dur: number;
  peak: number;
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  attack?: number;
  release?: number;
  delay?: number;
}

function noiseHit(g: AudioGraph, o: NoiseOpts): void {
  const { ctx } = g;
  const at = ctx.currentTime + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.Q.value = o.q ?? 0.8;
  f.frequency.setValueAtTime(o.freq, at);
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), at + o.dur);
  const amp = ctx.createGain();
  const end = envelope(amp.gain, at, o.peak, o.attack ?? 0.005, 0, 1, o.release ?? 0.05, o.dur);
  src.connect(f);
  f.connect(amp);
  amp.connect(g.sfx);
  src.start(at, Math.random() * 0.5);
  src.stop(end + 0.02);
}

/** Runs `fn` with the audio graph, swallowing any Web Audio error. */
function play(fn: (g: AudioGraph) => void): void {
  const g = getAudio();
  if (!g) return;
  try {
    fn(g);
  } catch {
    // A sound must never break the game.
  }
}

export const sfx = {
  /** UI button press. */
  click: () => play((g) => tone(g, { freq: 1400, to: 900, dur: 0.025, peak: 0.08 })),

  /** Pointer over a card or menu tile. */
  hover: () => play((g) => tone(g, { type: 'sine', freq: 2200, to: 2600, dur: 0.02, peak: 0.035 })),

  /** Typewriter blip for one typed character. */
  blip: (ch: string) =>
    play((g) => {
      const m = blipMidi(ch);
      if (m === null) return;
      tone(g, { freq: midiToHz(m), dur: 0.03, peak: 0.035, lowpass: 3000 });
    }),

  /** Emergency klaxon: three rising sweeps, then silence. */
  klaxon: () =>
    play((g) => {
      for (let i = 0; i < 3; i++) {
        const delay = i * 0.55;
        tone(g, {
          type: 'sawtooth',
          freq: 440,
          to: 700,
          dur: 0.38,
          peak: 0.14,
          lowpass: 2200,
          delay,
        });
        tone(g, {
          type: 'square',
          freq: 446,
          to: 706,
          dur: 0.38,
          peak: 0.05,
          lowpass: 1600,
          delay,
        });
      }
    }),

  /** A card sliding onto the table. */
  slide: () =>
    play((g) =>
      noiseHit(g, {
        dur: 0.14,
        peak: 0.12,
        filter: 'bandpass',
        freq: 900,
        to: 3200,
        q: 1.2,
        attack: 0.03,
      }),
    ),

  /** A card flipping face-up. */
  flip: () =>
    play((g) => {
      noiseHit(g, { dur: 0.05, peak: 0.1, filter: 'highpass', freq: 2500 });
      tone(g, { type: 'triangle', freq: 700, to: 1300, dur: 0.06, peak: 0.07, delay: 0.02 });
    }),

  /** Countdown tick (last 10 s); `urgent` for the last 3 s. */
  tick: (urgent = false) =>
    play((g) =>
      tone(g, {
        type: 'square',
        freq: urgent ? 1320 : 990,
        dur: 0.035,
        peak: urgent ? 0.1 : 0.07,
        lowpass: 4000,
      }),
    ),

  /** The countdown hit zero. */
  zero: () =>
    play((g) => {
      tone(g, { type: 'sawtooth', freq: 110, dur: 0.7, peak: 0.18, lowpass: 1400, release: 0.2 });
      tone(g, { type: 'sawtooth', freq: 116.5, dur: 0.7, peak: 0.14, lowpass: 1400, release: 0.2 });
    }),

  /** Site locked in: quick rising arpeggio. */
  lockIn: () =>
    play((g) => {
      [72, 76, 79, 84].forEach((m, i) =>
        tone(g, {
          type: 'triangle',
          freq: midiToHz(m),
          dur: 0.07,
          peak: 0.12,
          delay: i * 0.055,
        }),
      );
    }),

  /** Descent engine burn for `dur` seconds. */
  rumble: (dur: number) =>
    play((g) => {
      noiseHit(g, {
        dur,
        peak: 0.22,
        filter: 'lowpass',
        freq: 160,
        to: 420,
        attack: 0.4,
        release: 0.35,
      });
      tone(g, { type: 'sine', freq: 48, to: 62, dur, peak: 0.12, attack: 0.4, release: 0.3 });
    }),

  /** Touchdown thud after `delay` seconds. */
  thud: (delay = 0) =>
    play((g) => {
      tone(g, { type: 'sine', freq: 130, to: 38, dur: 0.32, peak: 0.45, delay, release: 0.12 });
      noiseHit(g, { dur: 0.22, peak: 0.16, filter: 'lowpass', freq: 500, to: 120, delay });
    }),

  /** A new mission day in the timelapse: soft bell. */
  dayChime: () =>
    play((g) => {
      tone(g, { type: 'sine', freq: 1318.5, dur: 0.05, peak: 0.05, release: 0.7 });
      tone(g, { type: 'sine', freq: 1975.5, dur: 0.04, peak: 0.025, release: 0.5 });
    }),

  /** The timelapse froze on a failure: one sting per cause. */
  failure: (cause: FailCause) =>
    play((g) => {
      switch (cause) {
        case 'cold':
          // Descending icy shimmer.
          for (let i = 0; i < 8; i++) {
            tone(g, {
              type: 'sine',
              freq: midiToHz(96 - i * 2),
              dur: 0.05,
              peak: 0.05,
              release: 0.4,
              delay: i * 0.09,
            });
          }
          noiseHit(g, { dur: 0.9, peak: 0.04, filter: 'highpass', freq: 6000, attack: 0.3 });
          break;
        case 'blackout':
          // Static bursts.
          for (let i = 0; i < 4; i++) {
            noiseHit(g, {
              dur: 0.12 + (i % 2) * 0.1,
              peak: 0.14,
              filter: 'bandpass',
              freq: 2400,
              q: 0.6,
              delay: i * 0.17,
            });
          }
          break;
        case 'slope':
          // Crash: noise collapsing downwards plus a heavy thud.
          noiseHit(g, { dur: 0.9, peak: 0.3, filter: 'lowpass', freq: 2200, to: 150 });
          tone(g, { type: 'sine', freq: 110, to: 32, dur: 0.5, peak: 0.4 });
          break;
        default:
          // low_sun / low_comm: warning buzzer.
          for (let i = 0; i < 3; i++) {
            tone(g, {
              type: 'square',
              freq: 196,
              dur: 0.16,
              peak: 0.09,
              lowpass: 1200,
              delay: i * 0.24,
            });
          }
      }
    }),

  /** Mission success fanfare. */
  fanfare: () =>
    play((g) => {
      const notes: [number, number, number][] = [
        [72, 0, 0.12],
        [76, 0.13, 0.12],
        [79, 0.26, 0.12],
        [84, 0.39, 0.55],
      ];
      for (const [m, delay, dur] of notes) {
        tone(g, { type: 'square', freq: midiToHz(m), dur, peak: 0.07, lowpass: 3500, delay });
        tone(g, { type: 'triangle', freq: midiToHz(m - 12), dur, peak: 0.1, delay });
      }
    }),

  /** One star appearing on the verdict (`i` = 0, 1, 2 rises in pitch). */
  starPop: (i: number) =>
    play((g) => {
      tone(g, { type: 'sine', freq: 660 * 1.25 ** i, to: 1320 * 1.25 ** i, dur: 0.09, peak: 0.12 });
      noiseHit(g, { dur: 0.04, peak: 0.05, filter: 'highpass', freq: 5000 });
    }),

  /** Ran out of time: long falling tone. */
  timeout: () =>
    play((g) => {
      // Starts after the countdown's zero buzz.
      tone(g, {
        type: 'sawtooth',
        freq: 220,
        to: 55,
        dur: 1.1,
        peak: 0.14,
        lowpass: 900,
        delay: 0.5,
      });
      noiseHit(g, { dur: 0.8, peak: 0.08, filter: 'lowpass', freq: 600, to: 100, delay: 0.7 });
    }),

  modalOpen: () =>
    play((g) => tone(g, { type: 'triangle', freq: 520, to: 880, dur: 0.07, peak: 0.08 })),

  modalClose: () =>
    play((g) => tone(g, { type: 'triangle', freq: 880, to: 520, dur: 0.07, peak: 0.07 })),
};
