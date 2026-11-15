import { useEffect, useState } from 'react';
import type { Transport } from './transport';

/** Server-clock "now", refreshed a few times a second (for countdowns). */
export function useServerNow(transport: Transport | null, everyMs = 250): number {
  const [now, setNow] = useState(() => transport?.serverNow() ?? Date.now());
  useEffect(() => {
    if (!transport) return;
    const tick = () => setNow(transport.serverNow());
    tick();
    const id = window.setInterval(tick, everyMs);
    return () => window.clearInterval(id);
  }, [transport, everyMs]);
  return now;
}
