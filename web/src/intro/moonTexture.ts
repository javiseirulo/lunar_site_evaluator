/** Loads a Moon texture from public/landing into pixel data once, and caches it. */
import type { TextureData } from './moonSphere';

const cache = new Map<string, Promise<TextureData>>();

export function loadMoonTexture(file: 'moon-1k.jpg' | 'moon-2k.jpg'): Promise<TextureData> {
  let p = cache.get(file);
  if (!p) {
    p = new Promise<TextureData>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return reject(new Error('2d canvas unavailable'));
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height);
        resolve({ data: d.data, width: d.width, height: d.height });
      };
      img.onerror = () => reject(new Error(`Moon texture ${file} failed to load`));
      img.src = `${import.meta.env.BASE_URL}landing/${file}`;
    });
    cache.set(file, p);
    p.catch(() => cache.delete(file));
  }
  return p;
}
