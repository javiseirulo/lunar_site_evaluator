/**
 * South polar stereographic helpers matching layers.json:
 *   rho = 2R·tan((90° + lat)/2),  x = rho·sin(lon),  y = rho·cos(lon)
 */
import type { LayersManifest } from '@lunar/contracts';

const DEG = Math.PI / 180;

export function projectSouthPolar(lat: number, lon: number, radiusM: number): [number, number] {
  const rho = 2 * radiusM * Math.tan(((90 + lat) / 2) * DEG);
  return [rho * Math.sin(lon * DEG), rho * Math.cos(lon * DEG)];
}

/** Lat/lon → normalised image coords (u right, v down) in [0, 1] for a layers manifest. */
export function latLonToUv(lat: number, lon: number, m: LayersManifest): [number, number] {
  const [x, y] = projectSouthPolar(lat, lon, m.radius_m);
  const [minX, minY, maxX, maxY] = m.bounds_m;
  return [(x - minX) / (maxX - minX), (maxY - y) / (maxY - minY)];
}

/** Normalised image coords → lat/lon. Returns null outside the covered disc. */
export function uvToLatLon(u: number, v: number, m: LayersManifest): [number, number] | null {
  const [minX, minY, maxX, maxY] = m.bounds_m;
  const x = minX + u * (maxX - minX);
  const y = maxY - v * (maxY - minY);
  const rho = Math.hypot(x, y);
  const lat = -90 + (2 * Math.atan(rho / (2 * m.radius_m))) / DEG;
  if (lat > m.lat_limit) return null;
  const lon = Math.atan2(x, y) / DEG;
  return [lat, lon];
}
