/** Warms the browser cache for images that will be swapped in later (e.g. talk ↔ neutral). */
import { useEffect } from 'react';

const preloaded = new Set<string>();

export function usePreloadImages(srcs: readonly string[]): void {
  const key = srcs.join('|');
  useEffect(() => {
    for (const src of key.split('|')) {
      if (!src || preloaded.has(src)) continue;
      preloaded.add(src);
      const img = new Image();
      img.src = src;
    }
  }, [key]);
}
