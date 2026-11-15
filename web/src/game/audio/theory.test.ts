import { describe, expect, it } from 'vitest';
import { getAudio, unlock } from './engine';
import { sfx } from './sfx';
import {
  adsr,
  barEvents,
  barSeconds,
  BEATS_PER_BAR,
  blipMidi,
  countdownCue,
  midiToHz,
  MOODS,
  moodFor,
  MUSIC_KEY,
  MUTED_KEY,
  rateLimiter,
  readPrefs,
  writePrefs,
  type Mood,
} from './theory';

describe('midiToHz', () => {
  it('maps A4 to 440 Hz and octaves to doublings', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(81)).toBeCloseTo(880);
    expect(midiToHz(60)).toBeCloseTo(261.63, 1);
  });
});

describe('barEvents', () => {
  const moods = Object.keys(MOODS) as Mood[];

  it('keeps every note inside its bar and the tempo in a calm range', () => {
    for (const m of moods) {
      expect(MOODS[m].bpm).toBeGreaterThanOrEqual(60);
      expect(MOODS[m].bpm).toBeLessThanOrEqual(120);
      for (let bar = 0; bar < 8; bar++) {
        for (const e of barEvents(m, bar)) {
          expect(e.beat).toBeGreaterThanOrEqual(0);
          expect(e.beat).toBeLessThan(BEATS_PER_BAR);
          expect(e.beat + e.beats).toBeLessThanOrEqual(BEATS_PER_BAR + 1e-9);
          expect(e.vel).toBeGreaterThan(0);
          expect(e.vel).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('loops seamlessly every chords.length bars (negative bars too)', () => {
    for (const m of moods) {
      const n = MOODS[m].chords.length;
      expect(barEvents(m, n)).toEqual(barEvents(m, 0));
      expect(barEvents(m, -1)).toEqual(barEvents(m, n - 1));
    }
  });

  it('gives the alert its unease and the loss no arpeggio', () => {
    expect(barEvents('tense', 0).some((e) => e.voice === 'pulse')).toBe(true);
    expect(barEvents('calm', 0).some((e) => e.voice === 'pulse')).toBe(false);
    expect(barEvents('loss', 0).some((e) => e.voice === 'arp')).toBe(false);
  });

  it('bar length follows the tempo', () => {
    expect(barSeconds('calm')).toBeCloseTo((4 * 60) / 92);
  });
});

describe('moodFor', () => {
  it('maps the phases to moods', () => {
    expect(moodFor('menu', null)).toBe('calm');
    expect(moodFor('intro', null)).toBe('calm');
    expect(moodFor('alert', null)).toBe('tense');
    expect(moodFor('choosing', null)).toBe('tense');
    expect(moodFor('timelapse', null)).toBe('ambient');
    expect(moodFor('verdict', true)).toBe('win');
    expect(moodFor('verdict', false)).toBe('loss');
    expect(moodFor('timeout', null)).toBe('loss');
  });
});

describe('adsr', () => {
  it('rises, decays, holds and releases to zero', () => {
    const pts = adsr(1, 0.1, 0.2, 0.5, 0.3, 1);
    expect(pts.map((p) => p.v)).toEqual([0, 1, 0.5, 0.5, 0]);
    [0, 0.1, 0.3, 1, 1.3].forEach((t, i) => expect(pts[i]!.t).toBeCloseTo(t));
  });

  it('never goes negative and keeps time increasing for short notes', () => {
    const pts = adsr(-1, 0, 0.5, 2, 0, 0.1);
    for (const p of pts) expect(p.v).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.t).toBeGreaterThanOrEqual(pts[i - 1]!.t);
  });
});

describe('rateLimiter', () => {
  it('lets one call through per window', () => {
    const gate = rateLimiter(50);
    expect(gate(0)).toBe(true);
    expect(gate(20)).toBe(false);
    expect(gate(50)).toBe(true);
    expect(gate(99)).toBe(false);
  });
});

describe('blipMidi and countdownCue', () => {
  it('blips only on letters and digits', () => {
    expect(blipMidi(' ')).toBeNull();
    expect(blipMidi('.')).toBeNull();
    expect(blipMidi('a')).toBe(blipMidi('A'));
    expect(blipMidi('z')).toBeGreaterThan(70);
  });

  it('ticks in the last 10 s and fires at zero', () => {
    expect(countdownCue(11)).toBeNull();
    expect(countdownCue(10)).toBe('tick');
    expect(countdownCue(1)).toBe('tick');
    expect(countdownCue(0)).toBe('zero');
  });
});

describe('sound prefs', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      m,
    };
  };

  it('defaults to sound and music on', () => {
    expect(readPrefs(memory())).toEqual({ muted: false, musicOn: true });
    expect(readPrefs(null)).toEqual({ muted: false, musicOn: true });
  });

  it('round-trips through storage', () => {
    const s = memory();
    writePrefs(s, { muted: true, musicOn: false });
    expect(s.m.get(MUTED_KEY)).toBe('1');
    expect(s.m.get(MUSIC_KEY)).toBe('0');
    expect(readPrefs(s)).toEqual({ muted: true, musicOn: false });
  });

  it('never throws on a broken storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(readPrefs(broken)).toEqual({ muted: false, musicOn: true });
    expect(() => writePrefs(broken, { muted: true, musicOn: true })).not.toThrow();
  });
});

describe('engine without Web Audio', () => {
  it('is a silent no-op in node', () => {
    expect(() => unlock()).not.toThrow();
    expect(getAudio()).toBeNull();
    expect(() => {
      sfx.click();
      sfx.klaxon();
      sfx.failure('cold');
      sfx.starPop(2);
    }).not.toThrow();
  });
});
