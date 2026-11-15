/**
 * Landing-date selector (issue #154), shared by Normal and Expert Explore.
 *
 * Writes `missionConfig` (design time mode) through the store's `requestLanding`, which resets the
 * clock to the start of the new window and asks the "End simulation?" confirm in Normal when a
 * simulation is running. Dates the Sun/Earth data cannot cover are refused with a message.
 */
import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatUtc, useAppStore, useSelectedSite } from '@/core';
import { useEphemIndex } from '@/ephem';
import { DEFAULT_MISSION_CONFIG } from './defaults';
import { landingTime, missionWindow } from './arrival';
import { landingBounds, windowIssue } from './landingWindow';

const DEFAULT_DAY = DEFAULT_MISSION_CONFIG.landing_utc.slice(0, 10);

export function LandingDate({
  precise = false,
  className,
}: {
  /** Expert: date + time (UTC). Normal: day precision, keeping the current time of day. */
  precise?: boolean;
  className?: string;
}) {
  const id = useId();
  const config = useAppStore((s) => s.missionConfig);
  const requestLanding = useAppStore((s) => s.requestLanding);
  const pending = useAppStore((s) => s.pendingLanding);
  const site = useSelectedSite();
  const idx = useEphemIndex();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const landing = landingTime(config, site);
  const win = missionWindow(config, site);
  const shown = precise ? landing.slice(0, 16) : landing.slice(0, 10);
  const isDefault =
    landing === new Date(DEFAULT_MISSION_CONFIG.landing_utc).toISOString() &&
    config.surface_days === DEFAULT_MISSION_CONFIG.surface_days;
  // "Keep simulating" in the confirm: the field goes back to the date still in force.
  const [hadPending, setHadPending] = useState(false);
  if (hadPending !== !!pending) {
    setHadPending(!!pending);
    if (!pending && !error) setDraft(null);
  }
  const bounds = idx ? landingBounds(idx, config.surface_days) : null;

  const apply = (landingUtc: string, surfaceDays: number) => {
    const next = {
      ...config,
      time_mode: 'design' as const,
      landing_utc: landingUtc,
      surface_days: surfaceDays,
    };
    const w = missionWindow(next, site);
    const issue = windowIssue(idx, w.start_utc, w.end_utc);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    setDraft(null);
    if (config.time_mode === 'design' && w.start_utc === win.start_utc && w.end_utc === win.end_utc)
      return;
    // The clock restarts at the start of the new window.
    requestLanding(
      { time_mode: 'design', landing_utc: landingUtc, surface_days: surfaceDays },
      w.start_utc,
    );
  };

  const onChange = (value: string) => {
    setDraft(value);
    if (!value) return;
    const hhmm = precise ? value.slice(11, 16) || '00:00' : landing.slice(11, 16);
    const at = new Date(`${value.slice(0, 10)}T${hhmm}:00Z`);
    if (Number.isNaN(at.getTime())) {
      setError('Enter a valid date.');
      return;
    }
    apply(at.toISOString(), config.surface_days);
  };

  return (
    <section
      className={cn('box flex flex-wrap items-end gap-x-4 gap-y-2 px-4 py-2', className)}
      aria-label="Landing date"
    >
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="label">
          {precise ? 'Landing (UTC)' : 'Landing date'}
        </label>
        <input
          id={id}
          type={precise ? 'datetime-local' : 'date'}
          className="field num"
          min={bounds ? (precise ? `${bounds.min}T00:00` : bounds.min) : undefined}
          max={bounds ? (precise ? `${bounds.max}T23:59` : bounds.max) : undefined}
          value={draft ?? shown}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      </div>
      <button
        type="button"
        className="btn"
        disabled={isDefault && !error}
        onClick={() =>
          apply(DEFAULT_MISSION_CONFIG.landing_utc, DEFAULT_MISSION_CONFIG.surface_days)
        }
      >
        Default ({DEFAULT_DAY})
      </button>
      <p className="text-ink-faint basis-full text-[12px]">
        {error ? (
          <span id={`${id}-err`} role="alert" className="text-warn">
            {error}
          </span>
        ) : (
          <>
            Simulates the {config.surface_days} days after landing:{' '}
            <span className="num">{formatUtc(win.start_utc).slice(0, 10)}</span> to{' '}
            <span className="num">{formatUtc(win.end_utc).slice(0, 10)}</span>.
          </>
        )}
      </p>
    </section>
  );
}
