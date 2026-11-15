/**
 * Renders the Moon as a lit sphere from an equirectangular texture (NASA/GSFC/SVS CGI Moon Kit).
 *
 * Everything that depends only on the view (which texel is under each pixel, and the pixel's
 * latitude/longitude) is computed once in `buildSphere`. Changing the phase afterwards is a cheap
 * pass over the buffers (`shadeInto`), so the terminator can follow the scroll position.
 *
 * Pure functions on typed arrays: no DOM, so they run in unit tests.
 */

const DEG = Math.PI / 180;

export interface TextureData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface SphereBuffers {
  /** Canvas side length in pixels. */
  size: number;
  /** Texture colour under every pixel, RGB. */
  rgb: Uint8Array;
  /** cos(lat)·cos(lon) and cos(lat)·sin(lon) of the surface point under every pixel. */
  cosLatCosLon: Float32Array;
  cosLatSinLon: Float32Array;
  /** Disc coverage, 0 outside the Moon and anti-aliased on the limb. */
  alpha: Uint8Array;
}

/**
 * Orthographic projection, inverse: unit-disc point (x east, y north) to [lat, lon] in radians for a
 * view centred on (lat0, lon0). Null outside the disc.
 */
export function orthoInverse(
  x: number,
  y: number,
  lat0: number,
  lon0: number,
): [number, number] | null {
  const rho = Math.hypot(x, y);
  if (rho > 1) return null;
  if (rho < 1e-9) return [lat0, lon0];
  const c = Math.asin(rho);
  const sinc = Math.sin(c);
  const cosc = Math.cos(c);
  const lat = Math.asin(
    Math.max(-1, Math.min(1, cosc * Math.sin(lat0) + (y * sinc * Math.cos(lat0)) / rho)),
  );
  const lon = lon0 + Math.atan2(x * sinc, rho * Math.cos(lat0) * cosc - y * Math.sin(lat0) * sinc);
  return [lat, lon];
}

/** Precomputes everything that does not change with the phase. */
export function buildSphere(
  tex: TextureData,
  size: number,
  viewLatDeg: number,
  viewLonDeg: number,
): SphereBuffers {
  const n = size * size;
  const rgb = new Uint8Array(n * 3);
  const cosLatCosLon = new Float32Array(n);
  const cosLatSinLon = new Float32Array(n);
  const alpha = new Uint8Array(n);
  const lat0 = viewLatDeg * DEG;
  const lon0 = viewLonDeg * DEG;
  const R = size / 2;
  const { data, width: W, height: H } = tex;

  for (let py = 0; py < size; py++) {
    const y = -(py + 0.5 - R) / R;
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5 - R) / R;
      const i = py * size + px;
      const rho = Math.hypot(x, y);
      // About one pixel of anti-aliasing on the limb.
      const cover = Math.max(0, Math.min(1, (1 - rho) * R));
      if (cover === 0) continue;
      const ll = orthoInverse(Math.min(x, 0.99999), Math.min(y, 0.99999), lat0, lon0);
      if (!ll) continue;
      const [lat, lon] = ll;
      const cl = Math.cos(lat);
      cosLatCosLon[i] = cl * Math.cos(lon);
      cosLatSinLon[i] = cl * Math.sin(lon);
      alpha[i] = Math.round(cover * 255);

      // Bilinear sample, wrapping in longitude.
      let u = (lon / (2 * Math.PI) + 0.5) % 1;
      if (u < 0) u += 1;
      const fx = u * W - 0.5;
      const fy = Math.max(0, Math.min(H - 1.001, (0.5 - lat / Math.PI) * H - 0.5));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const xa = ((x0 % W) + W) % W;
      const xb = (xa + 1) % W;
      const ya = y0;
      const yb = Math.min(H - 1, y0 + 1);
      const p00 = (ya * W + xa) * 4;
      const p10 = (ya * W + xb) * 4;
      const p01 = (yb * W + xa) * 4;
      const p11 = (yb * W + xb) * 4;
      for (let k = 0; k < 3; k++) {
        const top = data[p00 + k]! * (1 - tx) + data[p10 + k]! * tx;
        const bot = data[p01 + k]! * (1 - tx) + data[p11 + k]! * tx;
        rgb[i * 3 + k] = top * (1 - ty) + bot * ty;
      }
    }
  }
  return { size, rgb, cosLatCosLon, cosLatSinLon, alpha };
}

// d^0.6 lookup: a softer fall-off toward the terminator than a plain Lambert cosine, like the real
// Moon (it is much flatter than a billiard ball).
const POW_LUT = Float32Array.from({ length: 1025 }, (_, i) => Math.pow(i / 1024, 0.6));

/**
 * Lights the sphere with the Sun over longitude `sunLonDeg` (at the equator) and writes RGBA into
 * `out`. Lit side follows the cosine of the angle to the sub-solar point; the night side keeps a
 * faint cool earthshine so the full disc stays readable.
 */
export function shadeInto(b: SphereBuffers, sunLonDeg: number, out: Uint8ClampedArray): void {
  const cs = Math.cos(sunLonDeg * DEG);
  const sn = Math.sin(sunLonDeg * DEG);
  const n = b.size * b.size;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const a = b.alpha[i]!;
    if (a === 0) {
      out[j + 3] = 0;
      continue;
    }
    const d = b.cosLatCosLon[i]! * cs + b.cosLatSinLon[i]! * sn;
    let t = (d + 0.02) / 0.24;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const k = t * t * (3 - 2 * t);
    const dl = d <= 0 ? 0 : d >= 1 ? 1 : d;
    const lit = k * (0.6 + 0.4 * POW_LUT[(dl * 1024) | 0]!) * 1.3;
    const earth = 0.055 * (1 - k);
    const r = b.rgb[i * 3]!;
    const g = b.rgb[i * 3 + 1]!;
    const bl = b.rgb[i * 3 + 2]!;
    out[j] = r * lit + r * earth * 0.7;
    out[j + 1] = g * lit + g * earth * 0.85;
    out[j + 2] = bl * lit + bl * earth * 1.25;
    out[j + 3] = a;
  }
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Scroll progress 0..1 to sub-solar longitude: a left-lit quarter at the start, full by 85%. */
export function sunLonForProgress(t: number): number {
  return -100 * (1 - smoothstep(0, 0.85, t)) + 0;
}
