/** Check the actual binary handoff as a JS consumer. AI-assisted: OpenAI Codex. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(
  process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../web/public/data'),
);
const read = (file) => {
  const path = resolve(root, file);
  assert(path.startsWith(root + sep), 'File must be inside the data directory');
  return readFileSync(path);
};
const json = (file) => JSON.parse(read(file).toString('utf8'));
const meta = json('terrain/heightmap.json');
const shared = json('layers.json');
if (existsSync(resolve(root, 'terrain/delivery.json'))) {
  const delivery = json('terrain/delivery.json');
  const processing = json(delivery.production_settings.file);
  assert.equal(
    createHash('sha256').update(read(delivery.production_settings.file)).digest('hex'),
    delivery.production_settings.sha256,
  );
  assert.equal(
    createHash('sha256').update(read('terrain/heightmap.json')).digest('hex'),
    delivery.heightmap.sha256,
  );
  assert.equal(delivery.heightmap.observer_offset_applied, false);
  assert.equal(processing.observer_height_m, 5);
  assert.equal(processing.horizon.curated.sample_count, 3600);
  assert.equal(processing.horizon.heatmap.sample_count, 360);
  assert.equal(processing.horizon.max_range_km, 300);
  if (delivery.horizon.ready_profiles === 0) {
    assert.equal(delivery.horizon.status, 'pending_computation_and_validation');
  } else {
    assert.equal(delivery.horizon.status, 'sampled_terrain_not_flight_certified');
    const catalogue = json(delivery.site_terrain.file);
    const summary = json(delivery.horizon.validation_file);
    assert.equal(catalogue.mock, false);
    assert.equal(catalogue.sites.length, 59);
    const polar = catalogue.sites.filter((site) => Math.abs(site.lat) >= 80);
    assert.equal(polar.length, 41);
    assert.equal(delivery.horizon.ready_profiles, polar.length);
    assert.equal(summary.ready_profiles, polar.length);
    assert.equal(summary.angular_midpoint_validation, 'passed for all published profiles');
    for (const site of polar) {
      const profile = json(site.horizon_file);
      assert.equal(profile.site_id, site.id);
      assert.deepEqual([profile.lat, profile.lon], [site.lat, site.lon]);
      assert.equal(profile.observer_height_m, 5);
      assert.equal(profile.max_range_km, 310);
      assert.equal(profile.elev_deg.length * profile.az_step_deg, 360);
      assert(profile.az_step_deg <= 0.1);
      assert(profile.elev_deg.every((value) => Number.isFinite(value) && Math.abs(value) <= 90));
      assert.equal(profile.complete.length, profile.elev_deg.length);
      assert(profile.complete.every(Boolean));
      assert(profile.validation.radial_max_delta_deg <= 0.05);
      assert(profile.validation.angular_max_delta_deg <= 0.05);
      assert(Object.keys(profile.source_integrity).length > 0);
    }
  }
}
for (const key of ['projection', 'radius_m', 'bounds_m', 'lat_limit']) {
  assert.deepEqual(meta[key], shared[key], `Shared grid mismatch: ${key}`);
}
assert.equal(meta.version, 1);
assert.equal(meta.mock, false);
assert.equal(meta.frame, 'MOON_ME_DE421');
assert.equal(meta.registration, 'vertices');
assert.equal(meta.row_order, 'max_y_to_min_y');
assert.equal(meta.height_unit, 'm');
assert.equal(meta.heights.encoding, 'float32-le');
assert.equal(meta.heights.scale, 1);
assert.equal(meta.heights.offset, 0);
assert.equal(meta.mask.valid, 1);
assert.equal(meta.mask.nodata, 0);
const [left, bottom, right, top] = meta.bounds_m;
assert.deepEqual(meta.sample_0_0_m, [left, top]);
const dx = (right - left) / (meta.width_px - 1);
const dy = (top - bottom) / (meta.height_px - 1);
assert.deepEqual(meta.sample_step_col_m, [dx, 0]);
assert.deepEqual(meta.sample_step_row_m, [0, -dy]);

for (const [name, expected] of Object.entries(meta.sha256)) {
  const actual = createHash('sha256')
    .update(read(`terrain/${name}`))
    .digest('hex');
  assert.equal(actual, expected, `SHA-256 mismatch: ${name}`);
}
const heightBuffer = read(meta.heights.file);
const mask = read(meta.mask.file);
const count = meta.width_px * meta.height_px;
assert.equal(meta.total_samples, count);
assert.equal(heightBuffer.byteLength, count * 4);
assert.equal(mask.byteLength, count);
const heights = new DataView(heightBuffer.buffer, heightBuffer.byteOffset, heightBuffer.byteLength);
const capRadius = 2 * meta.radius_m * Math.tan(((90 + meta.lat_limit) * Math.PI) / 360);
let validCount = 0;
let min = Infinity;
let max = -Infinity;
for (let index = 0; index < count; index++) {
  const value = heights.getFloat32(index * 4, true);
  assert(mask[index] === 0 || mask[index] === 1, `Invalid mask byte: ${index}`);
  if (mask[index] === 0) {
    assert(Number.isNaN(value), `NoData must be NaN: ${index}`);
    continue;
  }
  assert(Number.isFinite(value), `Invalid height: ${index}`);
  const x = left + (index % meta.width_px) * dx;
  const y = top - Math.floor(index / meta.width_px) * dy;
  assert(x * x + y * y <= capRadius * capRadius + 0.001, `Outside polar cap: ${index}`);
  min = Math.min(min, value);
  max = Math.max(max, value);
  validCount++;
}
assert.equal(validCount, meta.valid_samples);
assert.deepEqual([min, max], meta.height_range_m);
const layers = json('terrain/layers.json');
assert.equal(layers.mock, false);
for (const layer of layers.layers) {
  const png = read(layer.file);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), layers.width_px);
  assert.equal(png.readUInt32BE(20), layers.height_px);
  assert.equal(png[24], 8, 'PNG must be 8 bit');
  assert.equal(png[25], 4, 'PNG must be gray + alpha');
}
console.log(
  JSON.stringify(
    {
      samples: count,
      valid_samples: validCount,
      height_range_m: [min, max],
      spacing_m: [dx, dy],
      checks: 'hashes, JS little-endian decoding, mask, footprint, grid alignment, PNG encoding',
    },
    null,
    2,
  ),
);
