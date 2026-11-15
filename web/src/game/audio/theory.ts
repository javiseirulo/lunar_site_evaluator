/**
 * Pure music/sound maths for the Mission audio (no Web Audio here, so it runs in node tests):
 * note → frequency, the original chiptune loop per mood, ADSR envelope points, the phase → mood
 * mapping, a rate limiter and the persisted sound preferences.
 */
import type { Phase } from '../state/gameStore';

/** MIDI note number → frequency in Hz (A4 = 69 = 440 Hz). */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export type Mood = 'calm' | 'tense' | 'ambient' | 'win' | 'loss';

export type Voice = 'bass' | 'arp' | 'pad' | 'pulse';

/** One note of the loop, in beats from the start of its bar. */
export interface NoteEvent {
  voice: Voice;
  beat: number;
  beats: number;
  midi: number;
  /** 0..1 */
  vel: number;
}

interface MoodDef {
  bpm: number;
  /** One chord (MIDI notes, ~A3–A4) per bar; the loop is `chords.length` bars long. */
  chords: number[][];
  arp: 'none' | 'quarters' | 'eighths';
  bass: 'half' | 'pulse' | 'drone';
  /** Adds a high minor-second stab on beats 1 and 3 (the alarm's unease). */
  dissonance: boolean;
}

export const BEATS_PER_BAR = 4;

/** All original: plain diatonic progressions, nothing quoted. */
export const MOODS: Record<Mood, MoodDef> = {
  // Am – F – C/G – G
  calm: {
    bpm: 92,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [55, 60, 64],
      [55, 59, 62],
    ],
    arp: 'eighths',
    bass: 'half',
    dissonance: false,
  },
  // Am – Bb – Am – E/G#: driving eighth-note bass and a dissonant stab.
  tense: {
    bpm: 116,
    chords: [
      [57, 60, 64],
      [58, 62, 65],
      [57, 60, 64],
      [56, 59, 64],
    ],
    arp: 'eighths',
    bass: 'pulse',
    dissonance: true,
  },
  // Dm – Bbmaj7 – F – C: slow pad, sparse arpeggio.
  ambient: {
    bpm: 76,
    chords: [
      [57, 62, 65],
      [58, 62, 65, 69],
      [57, 60, 65],
      [55, 60, 64],
    ],
    arp: 'quarters',
    bass: 'drone',
    dissonance: false,
  },
  // C – G/B – Am – F: the major lift.
  win: {
    bpm: 100,
    chords: [
      [60, 64, 67],
      [59, 62, 67],
      [60, 64, 69],
      [60, 65, 69],
    ],
    arp: 'eighths',
    bass: 'half',
    dissonance: false,
  },
  // Am – Dm/A over a low drone.
  loss: {
    bpm: 66,
    chords: [
      [57, 60, 64],
      [57, 62, 65],
    ],
    arp: 'none',
    bass: 'drone',
    dissonance: false,
  },
};

/** Seconds per bar for a mood. */
export function barSeconds(mood: Mood): number {
  return (BEATS_PER_BAR * 60) / MOODS[mood].bpm;
}

/** Up-down arpeggio over the chord plus its octave: 0 1 2 3 2 1 0 1 … */
function arpTone(chord: number[], step: number): number {
  const tones = [...chord, chord[0]! + 12];
  const cycle = tones.length * 2 - 2;
  const i = step % cycle;
  return tones[i < tones.length ? i : cycle - i]! + 12;
}

/** The notes of bar `bar` (any integer; the loop repeats seamlessly). */
export function barEvents(mood: Mood, bar: number): NoteEvent[] {
  const def = MOODS[mood];
  const n = def.chords.length;
  const chord = def.chords[((bar % n) + n) % n]!;
  const root = chord[0]! - 24;
  const out: NoteEvent[] = chord.map((midi) => ({
    voice: 'pad',
    beat: 0,
    beats: BEATS_PER_BAR,
    midi,
    vel: 0.5,
  }));

  if (def.bass === 'half') {
    out.push({ voice: 'bass', beat: 0, beats: 1.8, midi: root, vel: 0.9 });
    out.push({ voice: 'bass', beat: 2, beats: 1.8, midi: root, vel: 0.75 });
  } else if (def.bass === 'pulse') {
    for (let b = 0; b < BEATS_PER_BAR; b += 0.5) {
      out.push({ voice: 'bass', beat: b, beats: 0.4, midi: root, vel: b % 1 === 0 ? 0.9 : 0.6 });
    }
  } else {
    out.push({ voice: 'bass', beat: 0, beats: BEATS_PER_BAR, midi: root, vel: 0.7 });
  }

  const step = def.arp === 'eighths' ? 0.5 : def.arp === 'quarters' ? 1 : 0;
  if (step > 0) {
    for (let i = 0; i * step < BEATS_PER_BAR; i++) {
      out.push({
        voice: 'arp',
        beat: i * step,
        beats: step * 0.9,
        midi: arpTone(chord, i),
        vel: i % 2 === 0 ? 0.8 : 0.55,
      });
    }
  }

  if (def.dissonance) {
    for (const beat of [0, 2]) {
      out.push({ voice: 'pulse', beat, beats: 0.25, midi: chord[0]! + 25, vel: 0.6 });
    }
  }
  return out;
}

/** Background mood for a game phase (`win` = the chosen card's verdict). */
export function moodFor(phase: Phase, win: boolean | null): Mood {
  switch (phase) {
    case 'alert':
    case 'briefing':
    case 'approach':
    case 'dealing':
    case 'choosing':
    case 'descent':
    case 'recon':
      return 'tense';
    case 'timelapse':
      return 'ambient';
    case 'verdict':
      return win ? 'win' : 'loss';
    case 'timeout':
      return 'loss';
    default:
      return 'calm';
  }
}

export interface EnvPoint {
  /** Seconds from the note start. */
  t: number;
  v: number;
}

/**
 * ADSR breakpoints for a note held `hold` seconds: 0 → peak (attack) → peak·sustain (decay),
 * held, then → 0 (release). Linear ramps between the points; values are never negative.
 */
export function adsr(
  peak: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  hold: number,
): EnvPoint[] {
  const a = Math.max(0.001, attack);
  const d = Math.max(0, decay);
  const p = Math.max(0, peak);
  const s = p * Math.min(1, Math.max(0, sustain));
  const end = Math.max(a + d, hold);
  return [
    { t: 0, v: 0 },
    { t: a, v: p },
    { t: a + d, v: s },
    { t: end, v: s },
    { t: end + Math.max(0.005, release), v: 0 },
  ];
}

/** Returns a gate that lets a call through at most once per `minMs` (time passed in). */
export function rateLimiter(minMs: number): (nowMs: number) => boolean {
  let last = -Infinity;
  return (now) => {
    if (now - last < minMs) return false;
    last = now;
    return true;
  };
}

/** Typewriter blip pitch for a character (spaces/punctuation are silent → null). */
export function blipMidi(ch: string): number | null {
  if (!/[a-z0-9]/i.test(ch)) return null;
  const code = ch.toLowerCase().charCodeAt(0);
  return 76 + (code % 5) * 2;
}

/** Countdown cues: which second (if any) gets a tick / an announcement. */
export function countdownCue(secondsLeft: number): 'tick' | 'zero' | null {
  if (secondsLeft <= 0) return 'zero';
  if (secondsLeft <= 10) return 'tick';
  return null;
}

export const MUTED_KEY = 'mission.muted';
export const MUSIC_KEY = 'mission.music';

export interface SoundPrefs {
  muted: boolean;
  musicOn: boolean;
}

type ReadStore = Pick<Storage, 'getItem'>;
type WriteStore = Pick<Storage, 'setItem'>;

/** Reads the prefs; sound and music are on unless stored otherwise (never throws). */
export function readPrefs(storage: ReadStore | null | undefined): SoundPrefs {
  try {
    return {
      muted: storage?.getItem(MUTED_KEY) === '1',
      musicOn: storage?.getItem(MUSIC_KEY) !== '0',
    };
  } catch {
    return { muted: false, musicOn: true };
  }
}

/** Persists the prefs; storage errors (private mode, quota) are ignored. */
export function writePrefs(storage: WriteStore | null | undefined, prefs: SoundPrefs): void {
  try {
    storage?.setItem(MUTED_KEY, prefs.muted ? '1' : '0');
    storage?.setItem(MUSIC_KEY, prefs.musicOn ? '1' : '0');
  } catch {
    // ignore
  }
}
