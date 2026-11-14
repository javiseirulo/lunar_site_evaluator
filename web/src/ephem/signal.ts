/**
 * Tiny change counter for module-level caches, so hooks re-render through useSyncExternalStore
 * when a file finishes loading (no React state, no zustand store needed for a cache).
 */
export interface Signal {
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  bump: () => void;
}

export function createSignal(): Signal {
  const listeners = new Set<() => void>();
  let v = 0;
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => v,
    bump() {
      v++;
      for (const l of listeners) l();
    },
  };
}

/**
 * The response is the real file and not the SPA's index.html (Vite dev serves index.html with
 * HTTP 200 for missing paths under public/).
 */
export function isHtmlFallback(res: Response): boolean {
  return (res.headers.get('content-type') ?? '').includes('text/html');
}
