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
    .filter((feature) => feature.distance > 50 && feature.distance < 60_000)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);
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
    const side = point.x < width * 0.55 ? 1 : -1;
    const elbowX = point.x + side * 24;
    const elbowY = point.y - 35;
    const endX = elbowX + side * w;
    const x = Math.min(elbowX, endX);
    if (x < 12 || x + w > width - 12 || elbowY < 70 || point.y > height - 85) continue;
    if (boxes.some((b) => x < b.x + b.w + 14 && x + w + 14 > b.x && Math.abs(elbowY - b.y) < 40))
      continue;
    boxes.push({ x, y: elbowY, w });
    labels.push({ ...point, elbowX, elbowY, endX });
    if (labels.length === 4) break;
  }
  return labels;
}
