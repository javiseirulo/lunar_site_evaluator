#!/usr/bin/env node
/**
 * Generates web/public/landing/mist.png: soft, wispy night mist for the intro page.
 * Original artwork made from procedural noise, no external image involved.
 *
 * The PNG is gray + alpha with a constant white gray channel; only the alpha varies. The page uses it
 * as a CSS mask over a cool blue gradient, so the colour can change without regenerating the file.
 *
 * Usage (from web/):  node scripts/gen-landing-mist.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'landing', 'mist.png');
const W = 1024;
const H = 400;

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2027);
const G = 128;
const lattice = Float32Array.from({ length: G * G }, () => rand());
const smooth = (t) => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const g = (i, j) => lattice[(((j % G) + G) % G) * G + (((i % G) + G) % G)];
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  const a = g(xi, yi);
  const b = g(xi + 1, yi);
  const c = g(xi, yi + 1);
  const d = g(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let f = 0;
  let amp = 0.5;
  let fr = 1;
  for (let o = 0; o < 5; o++) {
    f += amp * vnoise(x * fr, y * fr);
    amp *= 0.5;
    fr *= 2.03;
  }
  return f;
}
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const raw = Buffer.alloc(H * (1 + W * 2));
for (let y = 0; y < H; y++) {
  const row = y * (1 + W * 2);
  raw[row] = 0;
  for (let x = 0; x < W; x++) {
    // Domain-warped, horizontally stretched noise gives long wisps instead of round blobs.
    const warp = fbm(x / 260 + 11, y / 120 + 3) * 2.2;
    const n = fbm(x / 210 + warp, y / 80 + warp * 0.6);
    const body = smoothstep(0.4, 0.78, n);
    const fx = smoothstep(0, 0.28, x / W) * smoothstep(0, 0.28, 1 - x / W);
    const fy = smoothstep(0, 0.4, y / H) * smoothstep(0, 0.45, 1 - y / H);
    const a = clamp(body * fx * fy * 1.1);
    const o = row + 1 + x * 2;
    raw[o] = 255;
    raw[o + 1] = Math.round(a * 235);
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 4; // gray + alpha
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
console.log(`mist written to ${OUT} (${Math.round(png.length / 1024)} kB)`);
