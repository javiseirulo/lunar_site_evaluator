/** Pointer gestures shared by mouse, pen and touch. AI-assisted: OpenAI Codex. */
export type Gesture =
  | { type: 'look'; dx: number; dy: number }
  | { type: 'zoom'; factor: number }
  | { type: 'tap'; x: number; y: number };

interface Contact {
  x: number;
  y: number;
  startX: number;
  startY: number;
}

export class NavigationGestures {
  private contacts = new Map<number, Contact>();
  private tapBlocked = false;
  private dragging = false;

  down(id: number, x: number, y: number, button = 0) {
    if (button !== 0) return false;
    this.contacts.set(id, { x, y, startX: x, startY: y });
    if (this.contacts.size > 1) this.tapBlocked = true;
    return true;
  }

  move(id: number, x: number, y: number): Gesture | null {
    const point = this.contacts.get(id);
    if (!point) return null;
    const before = [...this.contacts.values()];
    const separation =
      before.length === 2
        ? Math.hypot(before[0]!.x - before[1]!.x, before[0]!.y - before[1]!.y)
        : 0;
    const dx = point.x - x,
      dy = y - point.y;
    point.x = x;
    point.y = y;
    if (this.contacts.size === 2) {
      const after = [...this.contacts.values()];
      const distance = Math.hypot(after[0]!.x - after[1]!.x, after[0]!.y - after[1]!.y);
      return separation > 8 && distance > 8
        ? { type: 'zoom', factor: separation / distance }
        : null;
    }
    if (this.contacts.size !== 1) return null;
    if (Math.hypot(x - point.startX, y - point.startY) > 6) {
      this.tapBlocked = true;
      this.dragging = true;
    }
    return this.dragging ? { type: 'look', dx, dy } : null;
  }

  up(id: number, x: number, y: number): Gesture | null {
    const point = this.contacts.get(id);
    const tap =
      point &&
      this.contacts.size === 1 &&
      !this.tapBlocked &&
      Math.hypot(x - point.startX, y - point.startY) <= 6;
    this.contacts.delete(id);
    if (!this.contacts.size) {
      this.tapBlocked = false;
      this.dragging = false;
    }
    return tap ? { type: 'tap', x, y } : null;
  }

  cancel() {
    this.contacts.clear();
    this.tapBlocked = false;
    this.dragging = false;
  }
  get active() {
    return this.contacts.size > 0;
  }
}

export const MAX_WALK_DISTANCE_M = 200;
export const MIN_WALK_DISTANCE_M = 1;
export const MOON_RADIUS_M = 1_737_400;

export function surfaceDistance(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dlat = (b.lat - a.lat) * rad,
    dlon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
  return 2 * MOON_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function canWalk(distance: number) {
  return (
    Number.isFinite(distance) && distance >= MIN_WALK_DISTANCE_M && distance <= MAX_WALK_DISTANCE_M
  );
}

export function limitFov(degrees: number) {
  return Math.max(25, Math.min(90, degrees));
}
export function wheelFactor(delta: number, mode: number, height: number) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? height : 1);
  return Math.exp(Math.max(-200, Math.min(200, pixels)) * 0.002);
}

export function lightingState(sample: { sun_el: number; lit: boolean } | null) {
  return !sample ? 'unknown' : sample.lit ? 'sunlight' : sample.sun_el <= 0 ? 'night' : 'shadow';
}

/** Distinguish bookmarking double taps from walking, without moving on tap one. */
export const DOUBLE_TAP_MS = 400;
export class SurfaceTap {
  private pending: { x: number; y: number; time: number } | null = null;
  tap(x: number, y: number, time: number): 'wait' | 'save' {
    const previous = this.pending;
    this.pending = { x, y, time };
    if (
      previous &&
      time - previous.time <= DOUBLE_TAP_MS &&
      Math.hypot(x - previous.x, y - previous.y) <= 28
    ) {
      this.pending = null;
      return 'save';
    }
    return 'wait';
  }
  clear() {
    this.pending = null;
  }
}
