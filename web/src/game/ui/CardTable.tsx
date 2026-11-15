/**
 * The table of landing-site cards during `dealing` and `choosing`. Runs the deal animation
 * (then `revealed()`), and on a pick fades the other cards before calling `choose(slot)`.
 */
import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useAppStore, useData } from '@/core';
import { useGame } from '../state/gameStore';
import { handSiteImages } from './assets';
import { dealTimeline } from './format';
import { SiteCard } from './SiteCard';

/** Time the pick animation plays before the game moves on. */
const PICK_MS = 650;

export function CardTable() {
  const phase = useGame((s) => s.phase);
  const hand = useGame((s) => s.hand);
  const seed = useGame((s) => s.seed);
  const difficulty = useGame((s) => s.difficulty);
  const sites = useData((s) => s.sites);
  const reduced = useReducedMotion() ?? false;

  // Deal animation only if the table mounted while dealing (retry shows cards face-up).
  const [dealt] = useState(() => phase === 'dealing');
  // The pick lives in the store so the countdown cannot expire during the pick animation.
  const picked = useGame((s) => s.pendingSlot);
  const pick = useGame((s) => s.pick);

  const cards = useMemo(() => hand?.cards ?? [], [hand]);
  const images = useMemo(() => handSiteImages(cards, seed), [cards, seed]);
  const timeline = useMemo(() => dealTimeline(cards.length, reduced), [cards.length, reduced]);

  useEffect(() => {
    if (phase !== 'dealing') return;
    const id = window.setTimeout(() => useGame.getState().revealed(), timeline.totalMs);
    return () => window.clearTimeout(id);
  }, [phase, timeline.totalMs]);

  useEffect(() => {
    if (picked === null || !hand) return;
    const id = window.setTimeout(
      () => {
        useGame.getState().choose(picked);
        const after = useGame.getState();
        if (after.phase !== 'travel' || after.chosenSlot !== picked) return;
        const card = hand.cards.find((c) => c.slot === picked);
        if (!card) return;
        // Share the choice with the rest of the app (map, globe, timeline).
        const app = useAppStore.getState();
        app.selectSite(card.siteId);
        app.setTime(hand.landingUtc);
      },
      reduced ? 0 : PICK_MS,
    );
    return () => window.clearTimeout(id);
  }, [picked, hand, reduced]);

  const choosing = phase === 'choosing' && picked === null;

  return (
    <div className="flex flex-1 flex-col gap-2">
      <p className="text-ink-muted text-center font-mono text-[11px] tracking-widest uppercase">
        {phase === 'dealing'
          ? 'Scanning reachable landing sites…'
          : picked !== null
            ? `Landing site ${picked} locked in. Engines burning!`
            : 'Pick one landing site: read the bars, trust the data.'}
      </p>
      <div className="grid grid-cols-2 gap-3 px-1 pt-5 pb-2 md:grid-cols-4">
        {cards.map((card, i) => (
          <SiteCard
            key={card.slot}
            card={card}
            site={sites?.find((s) => s.id === card.siteId)}
            difficulty={difficulty}
            image={images[card.slot] ?? null}
            index={i}
            dealt={dealt}
            timeline={timeline}
            state={picked === null ? 'idle' : picked === card.slot ? 'picked' : 'dismissed'}
            clickable={choosing}
            onPick={pick}
          />
        ))}
      </div>
    </div>
  );
}
