/**
 * Raster helpers for layers.json PNGs (gray8 = gray value + alpha mask).
 * Colorizes on a canvas so both the 2D map and the 3D globe (as a CanvasTexture) can use it.
 */
import type { LayerDef, PaletteStop } from '@lunar/contracts';
import { dataUrl } from './data';

function parseColor(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length <= 4 ? [...h].map((c) => c + c).join('') : h;
  const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), full.length >= 8 ? n(6) : 255];
}

/** RGBA at position t ∈ [0, 1] along a palette (linear interpolation). */
export function samplePalette(stops: PaletteStop[], t: number): [number, number, number, number] {
  if (stops.length === 0) return [0, 0, 0, 0];
  const x = Math.min(1, Math.max(0, t));
  let lo = stops[0]!;
  let hi = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++) {
    if (x >= stops[i]![0] && x <= stops[i + 1]![0]) {
      lo = stops[i]!;
      hi = stops[i + 1]!;
      break;
    }
  }
  const a = parseColor(lo[1]);
  const b = parseColor(hi[1]);
  const span = hi[0] - lo[0] || 1;
  const f = (x - lo[0]) / span;
  return [0, 1, 2, 3].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * f)) as [
    number,
    number,
    number,
    number,
  ];
}

/** CSS linear-gradient for legends. */
export function paletteCss(stops: PaletteStop[], direction = 'to right'): string {
  return `linear-gradient(${direction}, ${stops.map(([p, c]) => `${c} ${p * 100}%`).join(', ')})`;
}

function buildLut(layer: LayerDef): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 4);
  const categorical = layer.kind === 'categorical';
  const [min, max] = layer.value_range;
  for (let g = 0; g < 256; g++) {
    // Categorical: map the raw value to its normalised position in value_range.
    const value = min + (g / 255) * (max - min);
    const t = categorical ? (Math.round(value) - min) / (max - min || 1) : g / 255;
    lut.set(samplePalette(layer.palette, t), g * 4);
  }
  return lut;
}

export function colorizeGray(
  img: HTMLImageElement | ImageBitmap,
  layer: LayerDef,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  const lut = buildLut(layer);
  for (let i = 0; i < px.length; i += 4) {
    const g = px[i]!; // gray PNGs decode with r = g = b
    const alpha = px[i + 3]!;
    const o = g * 4;
    px[i] = lut[o]!;
    px[i + 1] = lut[o + 1]!;
    px[i + 2] = lut[o + 2]!;
    px[i + 3] = Math.round((lut[o + 3]! * alpha) / 255);
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

const cache = new Map<string, Promise<HTMLCanvasElement>>();

/** Load a layer PNG and return it colorized with its palette (cached per layer id). */
export function loadLayerTexture(layer: LayerDef): Promise<HTMLCanvasElement> {
  const key = `${layer.id}:${layer.file}`;
  let p = cache.get(key);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${layer.file}`));
      img.src = dataUrl(layer.file);
    }).then((img) => colorizeGray(img, layer));
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}
