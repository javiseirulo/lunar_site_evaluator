/**
 * The default timelapse view: inside the lander, a window on top (real Sun/Earth positions at
 * the current mission hour) above a control panel (clock, power, Earth link, temperature,
 * tilt). When the timelapse stops on a failure, the failing instrument goes red and the cockpit
 * dramatises the cause (frost, no signal, tilt and shake, "below mission minimum").
 */
import { useMemo } from 'react';
import type { Timeseries } from '@lunar/contracts';
import { useMissionRules } from '../../state/useMissionRules';
import { isLinkUp, type Verdict } from '../../engine/simulate';
import type { Terrain } from '../assets';
import { missionTemperatures, valueAtHour } from '../thermal';
import type { MissionRuns } from '../timelapse';
import { dayOfMission } from '../timelapse';
import { CauseStamp, WindowFx } from './FailureFx';
import { faultsFor, type CockpitFx } from './faults';
import { ClockGauge, Lamp, LinkGauge, PowerGauge, TempGauge, TiltGauge } from './Gauges';
import { BAD, GOOD } from './palette';
import { signalBars, skyAt, viewHeading } from './sky';
import { WindowScene } from './WindowScene';

const BELOW_MINIMUM = 'Below mission minimum';

interface CockpitViewProps {
  ts: Timeseries;
  startIndex: number;
  /** Fractional mission hour (smooth sky motion). */
  hourF: number;
  /** Whole mission hour shown on the instruments. */
  hour: number;
  ended: boolean;
  verdict: Verdict;
  terrain: Terrain;
  runs: MissionRuns | null;
}

/** Thin mission-time bar along the bottom edge of the window. */
function WindowTimeBar({ day, days, progress }: { day: number; days: number; progress: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div
      role="progressbar"
      aria-label="Mission time"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`Day ${day} of ${days}`}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/55"
    >
      <span className="absolute -top-3.5 right-1.5 font-mono text-[9px] leading-none font-bold text-[#8fe39a] [text-shadow:0_1px_0_#000]">
        Day {day} of {days}
      </span>
      <span className="block h-1 bg-[#8fe39a]" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

const RIVETS = ['top-1 left-1', 'top-1 right-1', 'bottom-1 left-1', 'bottom-1 right-1'];

export function CockpitView({
  ts,
  startIndex,
  hourF,
  hour,
  ended,
  verdict,
  terrain,
  runs,
}: CockpitViewProps) {
  const REQ = useMissionRules();
  const DAYS = REQ.surface_days;
  const MISSION_HOURS = DAYS * 24;
  // One fixed heading per mission: half-way between the Sun and the Earth at mid-mission.
  const heading = useMemo(() => {
    const mid = skyAt(ts, startIndex, MISSION_HOURS / 2) ?? skyAt(ts, startIndex, 0);
    return mid ? viewHeading(mid.sunAz, mid.earthAz) : 0;
  }, [ts, startIndex, MISSION_HOURS]);
  const temps = useMemo(
    () => missionTemperatures(ts, startIndex, MISSION_HOURS),
    [ts, startIndex, MISSION_HOURS],
  );

  const sky = skyAt(ts, startIndex, hourF);
  const linkUp = sky ? isLinkUp(sky.earthVisible, sky.earthEl, REQ.antenna_margin_deg) : null;
  const fx: CockpitFx = ended ? (verdict.win ? 'win' : verdict.cause) : null;
  const faults = faultsFor(fx);
  const lost = ended && !verdict.win;
  const won = ended && verdict.win;
  const shownHour = won ? MISSION_HOURS : hour;
  const day = dayOfMission(hour, DAYS);
  const progress = won ? 1 : Math.min(1, (hourF + 1) / MISSION_HOURS);

  return (
    <div
      data-fx={fx ?? undefined}
      className="mission-cockpit flex w-full min-w-0 flex-1 flex-col items-center gap-2"
    >
      {/* Window. */}
      <div className="mission-bezel relative w-full max-w-[760px] min-w-0 p-2.5 sm:p-3">
        {RIVETS.map((pos) => (
          <span key={pos} aria-hidden className={`mission-rivet ${pos}`} />
        ))}
        <div className="mission-window relative aspect-[2/1] w-full overflow-hidden bg-black">
          {sky ? (
            <WindowScene sky={sky} heading={heading} terrain={terrain} />
          ) : (
            <div className="flex size-full items-center justify-center font-mono text-[11px] text-[#8b97ad]">
              NO TELEMETRY
            </div>
          )}
          <div aria-hidden className="mission-scanlines pointer-events-none absolute inset-0" />
          <WindowFx fx={fx} />
          <WindowTimeBar day={day} days={DAYS} progress={progress} />
          <CauseStamp fx={fx} when={`Day ${day} · hour ${shownHour}`} />
        </div>
        <p className="mt-1 text-right font-mono text-[10px] leading-none text-[#8b97ad]">
          Sky not to scale — height exaggerated
        </p>
      </div>

      {/* Control panel. */}
      <div className="mission-panel mission-bezel flex w-full max-w-[760px] min-w-0 flex-col gap-1.5 p-2">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase">
          <Lamp on color={lost ? BAD : GOOD} alarm={lost} />
          <span style={{ color: lost ? BAD : won ? GOOD : '#8b97ad' }}>
            {lost
              ? 'Master alarm'
              : won
                ? `All systems nominal — ${DAYS} days survived`
                : 'Systems nominal'}
          </span>
        </div>
        {/* 2 columns on phones (clock full width); 3 from sm with the clock spanning two rows,
            so five gauges fill a 3×2 grid with no empty cell and nothing overflows at 760 px. */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 [&>*]:min-w-0">
          <ClockGauge
            className="col-span-2 sm:col-span-1 sm:row-span-2"
            day={day}
            days={DAYS}
            hour={shownHour}
            hours={MISSION_HOURS}
            progress={progress}
          />
          <PowerGauge
            sunUp={sky ? sky.lit : null}
            darkRun={runs?.dark[hour] ?? 0}
            limit={REQ.max_dark_h.threshold}
            fault={faults.power}
            stamp={faults.minimum === 'power' ? BELOW_MINIMUM : null}
          />
          <LinkGauge
            linkUp={linkUp}
            bars={
              sky && linkUp !== null ? signalBars(linkUp, sky.earthEl, REQ.antenna_margin_deg) : 0
            }
            blackoutRun={runs?.blackout[hour] ?? 0}
            limit={REQ.max_blackout_h.threshold}
            fault={faults.link}
            noSignal={fx === 'blackout'}
            stamp={faults.minimum === 'link' ? BELOW_MINIMUM : null}
          />
          <TempGauge tempK={valueAtHour(temps, hourF)} fault={faults.temp} />
          <TiltGauge
            slopeDeg={verdict.metrics.slope_deg}
            limit={REQ.slope_max_deg}
            fault={faults.tilt}
          />
        </div>
      </div>
    </div>
  );
}
