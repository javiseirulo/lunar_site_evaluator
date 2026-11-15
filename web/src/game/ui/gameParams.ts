/**
 * Optional `/game` URL parameters for reproducible runs (demo capture):
 * `?seed=<uint32>&skipIntro=1&difficulty=expert`. Anything missing or invalid falls back to
 * the normal behaviour (clock seed, intro, current difficulty).
 */
import type { Difficulty } from '../engine/bars';
import type { GameConfig } from '../state/gameStore';

export interface GameParams extends GameConfig {
  difficulty: Difficulty | null;
}

const MAX_SEED = 4294967295;

export function parseGameParams(search: string): GameParams {
  const q = new URLSearchParams(search);
  const rawSeed = q.get('seed')?.trim() ?? '';
  const seedNum = /^\d{1,10}$/.test(rawSeed) ? Number(rawSeed) : NaN;
  const flag = q.get('skipIntro')?.trim().toLowerCase();
  const diff = q.get('difficulty')?.trim().toLowerCase();
  return {
    seed: seedNum <= MAX_SEED ? seedNum : null,
    skipIntro: flag === '1' || flag === 'true',
    difficulty: diff === 'expert' || diff === 'normal' ? diff : null,
  };
}
