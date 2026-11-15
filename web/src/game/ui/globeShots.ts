/**
 * Which globe shot the game shows behind each phase (pure, tested). The globe itself is only
 * reached through `GameGlobe.tsx`.
 *
 * Hidden-name rule: markers carry only the card number ("1".."4") and a slot id, never the site
 * id or name. The real name appears only in the verdict's `reveal` shot.
 */
import type { Phase } from '../state/gameStore';
import { DESCENT_MS } from '../state/gameStore';

/** The game's view of the globe's cinematic shots (GameGlobe passes them on to the globe). */
export interface LatLon {
  lat: number;
  lon: number;
}
export interface GlobeMarker extends LatLon {
  id: string;
  label: string;
}
export type GlobeShot =
  | { kind: 'spin' }
  | { kind: 'pole'; markers: readonly GlobeMarker[] }
  | { kind: 'dive'; target: LatLon; durationMs: number }
  | { kind: 'reveal'; target: LatLon; label: string };

interface CardRef {
  slot: number;
  siteId: string;
}

interface SiteRef {
  id: string;
  lat: number;
  lon: number;
}

/** Anonymous, numbered markers for the cards of a hand (cards whose site is unknown are skipped). */
export function markersForHand(
  cards: readonly CardRef[],
  sites: readonly SiteRef[] | null,
): GlobeMarker[] {
  if (!sites) return [];
  const out: GlobeMarker[] = [];
  for (const c of cards) {
    const s = sites.find((x) => x.id === c.siteId);
    if (s) out.push({ id: `slot-${c.slot}`, lat: s.lat, lon: s.lon, label: String(c.slot) });
  }
  return out;
}

/** Coordinates of the chosen card's site, or null. */
export function chosenTarget(
  cards: readonly CardRef[],
  chosenSlot: number | null,
  sites: readonly SiteRef[] | null,
): LatLon | null {
  const card = cards.find((c) => c.slot === chosenSlot);
  const site = card && sites?.find((s) => s.id === card.siteId);
  return site ? { lat: site.lat, lon: site.lon } : null;
}

/**
 * The full-screen background shot for a phase, or null when the background globe is not shown
 * (recon onwards: other screens take over and the verdict has its own small reveal).
 */
export function backgroundShot(
  phase: Phase,
  cards: readonly CardRef[],
  chosenSlot: number | null,
  sites: readonly SiteRef[] | null,
): GlobeShot | null {
  switch (phase) {
    case 'menu':
    case 'intro':
    case 'alert':
    case 'briefing':
      return { kind: 'spin' };
    case 'approach':
    case 'dealing':
    case 'choosing':
      return { kind: 'pole', markers: markersForHand(cards, sites) };
    case 'descent': {
      const target = chosenTarget(cards, chosenSlot, sites);
      return target
        ? { kind: 'dive', target, durationMs: DESCENT_MS }
        : { kind: 'pole', markers: markersForHand(cards, sites) };
    }
    default:
      return null;
  }
}
