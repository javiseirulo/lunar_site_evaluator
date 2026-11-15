/** No 0/O/1/I so a token read off a projector is hard to mistype. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const TOKEN_LENGTH = 5;

export function generateToken(rnd: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) out += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return out;
}

/** Upper-cases and strips anything outside the alphabet; returns null unless it is a full token. */
export function normalizeToken(raw: string): string | null {
  const t = raw
    .toUpperCase()
    .split('')
    .filter((c) => ALPHABET.includes(c))
    .join('');
  return t.length === TOKEN_LENGTH ? t : null;
}

/** Random uint32 for a question's deal; the teacher never sees or picks it. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
