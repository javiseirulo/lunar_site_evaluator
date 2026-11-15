/**
 * Globe geometry helpers (owner: Marta, src/globe).
 *
 * Frame: y up (north pole at +Y), lon 0 on +X, lon +90° (east) on −Z. This matches the UVs of
 * THREE.SphereGeometry, so an equirectangular texture centred on lon 0 lines up with the pins.
 */
const DEG = Math.PI / 180;

export type Vec3Tuple = [x: number, y: number, z: number];

/** Planetocentric lat/lon in degrees → cartesian point on a sphere of radius r. */
export function latLonToVec3(lat: number, lon: number, r = 1): Vec3Tuple {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  const c = Math.cos(phi);
  return [r * c * Math.cos(lambda), r * Math.sin(phi), -r * c * Math.sin(lambda)];
}

/** Inverse of latLonToVec3: cartesian point (any radius) → [lat, lon] in degrees, lon in [-180, 180]. */
export function vec3ToLatLon(x: number, y: number, z: number): [lat: number, lon: number] {
  const r = Math.hypot(x, y, z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, y / r))) / DEG;
  const lon = Math.atan2(-z, x) / DEG;
  return [lat, lon];
}

/**
 * Parses one coordinate typed by a person: "-89.5", "89.5 S", "45.2E", "12,5" (comma decimal).
 * N/E are positive, S/W negative. Returns null if invalid or out of range.
 */
export function parseCoordinate(text: string, axis: 'lat' | 'lon'): number | null {
  const m = text
    .trim()
    .replace(',', '.')
    .replace('°', '')
    .match(/^([+-]?\d+(?:\.\d+)?)\s*([NSEWnsew])?$/);
  if (!m) return null;
  let value = Number(m[1]);
  const hemi = m[2]?.toUpperCase();
  if (hemi) {
    if ((axis === 'lat' && 'EW'.includes(hemi)) || (axis === 'lon' && 'NS'.includes(hemi)))
      return null;
    if (value < 0) return null; // "−10 S" is ambiguous
    if (hemi === 'S' || hemi === 'W') value = -value;
  }
  const limit = axis === 'lat' ? 90 : 180;
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

/** Plain decimal "lat, lon" for the clipboard (4 decimals ≈ 3 m on the Moon). */
export function coordsForClipboard(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}
