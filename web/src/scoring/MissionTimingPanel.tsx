/**
 * Time mode selector for Explore (owner: Javi; docs/10 §5 Javi, J0 #8).
 *
 * - Design: the user picks the landing time directly.
 * - Mission: the user picks the launch; the landing is computed with the simple orbital model.
 *
 * Writes `missionConfig` in the store and moves the shared clock (`currentTimeUTC`) to the landing,
 * so the map, the Mission Clock and the site detail show the conditions on arrival.
 */
import type { MissionConfig, TimeMode, Trajectory } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { formatUtc, useAppStore, useData, useSelectedSite } from '@/core';
import { computeArrival, landingTime, TRAJECTORY_LABEL } from './arrival';

/** `<input type="datetime-local">` value (treated as UTC) ⇄ ISO 8601 UTC. */
const toInput = (iso: string) => new Date(iso).toISOString().slice(0, 16);
const fromInput = (value: string) => new Date(`${value}:00Z`).toISOString();

const MODES: { id: TimeMode; label: string }[] = [
  { id: 'design', label: 'Design' },
  { id: 'mission', label: 'Mission' },
];

function daysAfter(fromIso: string, toIso: string): string {
  const d = (Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000;
  return d < 2 ? `+${(d * 24).toFixed(1)} h` : `+${d.toFixed(1)} d`;
}

export function MissionTimingPanel({ className }: { className?: string }) {
  const config = useAppStore((s) => s.missionConfig);
  const setMissionConfig = useAppStore((s) => s.setMissionConfig);
  const setTime = useAppStore((s) => s.setTime);
  const range = useData((s) => s.manifest?.time_range);
  const site = useSelectedSite();

  /** Apply a change and move the clock to the resulting landing time. */
  const update = (patch: Partial<MissionConfig>) => {
    const next = { ...config, ...patch };
    setMissionConfig(patch);
    setTime(landingTime(next, site));
  };

  const arrival = config.time_mode === 'mission' ? computeArrival(config, site) : null;
  const landing = landingTime(config, site);
  const outOfRange = range && (landing < range.start_utc || landing > range.end_utc) ? range : null;

  return (
    <section className={cn('box', className)} aria-label="Mission timing">
      <div className="box-head">
        Mission Timing
        <span className="ml-auto flex gap-px" role="group" aria-label="Time mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => update({ time_mode: m.id })}
              className={cn(
                'border px-1.5 text-[10px] leading-[14px]',
                config.time_mode === m.id
                  ? 'border-white bg-white text-black'
                  : 'border-white/50 text-white hover:border-white',
              )}
              aria-pressed={config.time_mode === m.id}
            >
              {m.label.toUpperCase()}
            </button>
          ))}
        </span>
      </div>

      <div className="box-body flex flex-col gap-2 text-[11px]">
        <p className="text-ink-faint text-[10px]">
          {config.time_mode === 'design'
            ? 'Design: pick the landing time and see the site conditions on arrival.'
            : 'Mission: pick the launch; the landing time is computed from a simple orbit model.'}
        </p>

        <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
          {config.time_mode === 'design' ? (
            <label className="flex flex-col gap-0.5">
              <span className="label">Landing (UTC)</span>
              <input
                type="datetime-local"
                className="field num"
                value={toInput(config.landing_utc)}
                onChange={(e) =>
                  e.target.value && update({ landing_utc: fromInput(e.target.value) })
                }
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-0.5">
                <span className="label">Launch (UTC)</span>
                <input
                  type="datetime-local"
                  className="field num"
                  value={toInput(config.launch_utc)}
                  onChange={(e) =>
                    e.target.value && update({ launch_utc: fromInput(e.target.value) })
                  }
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="label">Trajectory</span>
                <select
                  className="field"
                  value={config.trajectory}
                  onChange={(e) => update({ trajectory: e.target.value as Trajectory })}
                >
                  {(Object.keys(TRAJECTORY_LABEL) as Trajectory[]).map((t) => (
                    <option key={t} value={t}>
                      {TRAJECTORY_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="label">Lunar orbit (km)</span>
                <input
                  type="number"
                  className="field num w-20"
                  min={20}
                  max={500}
                  step={10}
                  value={config.llo_alt_km}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 20 && v <= 500) update({ llo_alt_km: v });
                  }}
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-0.5">
            <span className="label">Surface stay (days)</span>
            <input
              type="number"
              className="field num w-16"
              min={1}
              max={60}
              value={config.surface_days}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 60) update({ surface_days: v });
              }}
            />
          </label>
        </div>

        {arrival && (
          <ol className="border-edge-lo bg-navy-950 flex flex-col gap-0.5 border p-1.5">
            <li className="flex justify-between gap-2">
              <span>Launch</span>
              <span className="num">{formatUtc(arrival.launch_utc)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>
                Lunar orbit{' '}
                <span className="text-ink-faint">
                  {daysAfter(arrival.launch_utc, arrival.lunar_orbit_utc)}
                  {arrival.earth_moon_km !== null &&
                    ` · Earth–Moon ${Math.round(arrival.earth_moon_km).toLocaleString('en-US')} km`}
                </span>
              </span>
              <span className="num">{formatUtc(arrival.lunar_orbit_utc)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>
                <b>Landing</b>{' '}
                <span className="text-ink-faint">
                  {daysAfter(arrival.lunar_orbit_utc, arrival.landing_utc)} (wait in orbit +
                  descent)
                </span>
              </span>
              <b className="num text-ink">{formatUtc(arrival.landing_utc)}</b>
            </li>
            <li className="flex justify-between gap-2">
              <span>Surface stay ends</span>
              <span className="num">{formatUtc(arrival.surface_end_utc)}</span>
            </li>
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => setTime(landing)}>
            Go to landing
          </button>
          <span className="text-ink-faint text-[10px]">
            Landing <span className="num">{formatUtc(landing)}</span>
            {site ? ` · ${site.name}` : ''}
          </span>
        </div>

        {outOfRange && (
          <p className="text-warn text-[10px]" role="status">
            Landing is outside the data window ({outOfRange.start_utc.slice(0, 10)} to{' '}
            {outOfRange.end_utc.slice(0, 10)}); the clock shows the nearest available sample.
          </p>
        )}

        {config.time_mode === 'mission' && (
          <p className="text-ink-faint text-[10px]">
            Simplified model: Hohmann transfer from a 200 km Earth orbit using the Earth–Moon
            distance on arrival, polar low lunar orbit (up to one orbit of waiting), ~1 h descent.
            No Δv budget or launch windows.
          </p>
        )}
      </div>
    </section>
  );
}
