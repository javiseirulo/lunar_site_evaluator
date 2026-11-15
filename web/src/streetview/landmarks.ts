import { surfaceDistance } from './navigation';
export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
  diameter_km: number;
  source: string;
}
export function nearbyLandmarks(features: Landmark[], observer: { lat: number; lon: number }) {
  return features
    .map((feature) => ({ ...feature, distance: surfaceDistance(observer, feature) }))
    .filter((feature) => feature.distance > 50 && feature.distance < 120_000)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 24);
}

export interface LabelPoint {
  id: string;
  name: string;
  x: number;
  y: number;
}
export interface LabelLayout extends LabelPoint {
  elbowX: number;
  elbowY: number;
  endX: number;
}
/** Greedy screen-space placement, nearest first, with room for the leader and text. */
export function layoutLabels(points: LabelPoint[], width: number, height: number): LabelLayout[] {
  const labels: LabelLayout[] = [];
  const boxes: { x: number; y: number; w: number }[] = [];
  for (const point of points) {
    const w = Math.max(80, Math.min(190, point.name.length * 7 + 12));
    if (point.x < -32 || point.x > width + 32 || point.y < 60 || point.y > height - 65) continue;
    const anchor = { ...point, x: Math.max(12, Math.min(width - 12, point.x)) };
    const preferred = anchor.x < width * 0.55 ? 1 : -1;
    let placed = false;
    for (const rise of [35, 85, 135]) {
      for (const side of [preferred, -preferred]) {
        const elbowX = anchor.x + side * 24;
        const elbowY = anchor.y - rise;
        const endX = elbowX + side * w;
        const x = Math.min(elbowX, endX);
        if (x < 12 || x + w > width - 12 || elbowY < 65) continue;
        if (
          boxes.some((b) => x < b.x + b.w + 14 && x + w + 14 > b.x && Math.abs(elbowY - b.y) < 40)
        )
          continue;
        boxes.push({ x, y: elbowY, w });
        labels.push({ ...anchor, elbowX, elbowY, endX });
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (labels.length === 6) break;
  }
  return labels;
}

/** Names describe feature areas, not peaks. A near slope within the feature's
 * radius must not hide its own label; unrelated foreground still occludes it.
 * The 20 km cap keeps very large named regions from labeling through the Moon.
 */
export function isLandmarkOccluded(distance: number, hitDistance: number, diameterKm: number) {
  const tolerance = Math.min(20_000, Math.max(150, diameterKm * 500, distance * 0.01));
  return hitDistance < distance - tolerance;
}
