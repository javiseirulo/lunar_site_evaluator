/**
 * Cockpit control-panel instruments: mission clock, power/Sun, Earth link, external temperature
 * (simplified model, labelled "est.") and tilt. Each one can be put in `fault` (flashing red
 * frame) with an optional stamp when the mission fails because of it.
 */
import type { ReactNode } from 'react';
import { Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { kelvinToCelsius } from '../thermal';
import { BAD, GOOD, runColor, WARN } from './palette';

const OFF = '#26222e';

export function Lamp({ on, color, alarm }: { on: boolean; color: string; alarm?: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'inline-block size-3 shrink-0 rounded-full border-2 border-black',
        alarm && 'mission-alarm-lamp',
      )}
      style={{ background: on ? color : OFF, boxShadow: on ? `0 0 8px ${color}` : 'none' }}
    />
  );
}

function Instrument({
  label,
  unit,
  fault = false,
  stamp,
  className,
  children,
}: {
  label: string;
  unit?: string;
  fault?: boolean;
  stamp?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      data-fault={fault}
      className={clsx(
        'mission-instrument relative flex min-w-0 flex-col gap-1 border-2 border-black bg-[#0b0e16] p-1.5 shadow-[inset_0_0_0_1px_#2c3242]',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-1 font-mono text-[9px] leading-none font-bold tracking-widest text-[#8b97ad] uppercase">
        <span className="truncate">{label}</span>
        {unit && <span className="shrink-0 text-[#5d6880]">{unit}</span>}
      </header>
      {children}
      {stamp && (
        <span
          role="status"
          className="absolute inset-x-1 top-1/2 -translate-y-1/2 -rotate-6 border-2 border-[#ff3b30] bg-black/85 px-1 py-0.5 text-center font-mono text-[9px] leading-tight font-bold tracking-wider text-[#ff3b30] uppercase"
        >
          {stamp}
        </span>
      )}
    </section>
  );
}

/** LED-style readout. */
function Led({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={clsx('font-mono leading-none font-bold tabular-nums', className)}
      style={{ color, textShadow: `0 0 6px ${color}88` }}
    >
      {children}
    </span>
  );
}

export function ClockGauge({
  day,
  days,
  hour,
  hours,
  progress,
  className,
}: {
  day: number;
  days: number;
  hour: number;
  hours: number;
  /** 0..1 of the mission elapsed. */
  progress: number;
  className?: string;
}) {
  return (
    <Instrument label="Mission clock" className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <Led color="#8fe39a" className="text-[18px]">
          Day {day} of {days}
        </Led>
        <Led color="#8fe39a" className="text-[11px]">
          H {String(hour).padStart(3, '0')}/{hours}
        </Led>
      </div>
      {/* One block per mission day. */}
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: days }, (_, d) => {
          const fill = Math.min(1, Math.max(0, progress * days - d));
          return (
            <span key={d} className="h-2 flex-1 border border-black bg-[#1a2020]">
              <span className="block h-full bg-[#8fe39a]" style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>
    </Instrument>
  );
}

export function PowerGauge({
  sunUp,
  darkRun,
  limit,
  fault,
  stamp,
}: {
  sunUp: boolean | null;
  darkRun: number;
  limit: number;
  fault?: boolean;
  stamp?: string | null;
}) {
  const charge = Math.min(1, Math.max(0, 1 - darkRun / limit));
  const color = fault ? BAD : runColor(darkRun, limit);
  const cells = 5;
  const lit = Math.ceil(charge * cells);
  return (
    <Instrument label="Power · Sun" fault={fault} stamp={stamp}>
      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase">
        <Lamp on={sunUp === true} color={WARN} />
        <span style={{ color: sunUp ? WARN : '#8b97ad' }}>
          {sunUp === null ? 'Sun —' : sunUp ? 'Sun up' : 'Sun down'}
        </span>
        {sunUp && <Zap className="size-3 text-[#ffd23f]" aria-label="charging" />}
      </div>
      {/* Battery: drains during the night. */}
      <div className="flex items-center gap-0.5" aria-hidden>
        <span className="flex h-3.5 flex-1 gap-0.5 border-2 border-[#8b97ad] p-0.5">
          {Array.from({ length: cells }, (_, i) => (
            <span key={i} className="flex-1" style={{ background: i < lit ? color : '#1b1f29' }} />
          ))}
        </span>
        <span className="h-1.5 w-1 bg-[#8b97ad]" />
      </div>
      <p className="font-mono text-[10px] leading-none" style={{ color }}>
        Night {darkRun} h / {limit} h
      </p>
    </Instrument>
  );
}

export function LinkGauge({
  linkUp,
  bars,
  blackoutRun,
  limit,
  fault,
  noSignal,
  stamp,
}: {
  linkUp: boolean | null;
  bars: number;
  blackoutRun: number;
  limit: number;
  fault?: boolean;
  noSignal?: boolean;
  stamp?: string | null;
}) {
  const color = fault ? BAD : runColor(blackoutRun, limit);
  return (
    <Instrument label="Earth link" fault={fault} stamp={stamp}>
      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase">
        <Lamp on={linkUp !== null} color={linkUp ? GOOD : BAD} />
        <span style={{ color: linkUp ? GOOD : linkUp === false ? BAD : '#8b97ad' }}>
          {linkUp === null ? 'Link —' : linkUp ? 'Link up' : 'Link down'}
        </span>
        <span className="ml-auto flex h-3.5 items-end gap-0.5" aria-hidden>
          {[1, 2, 3, 4].map((b) => (
            <span
              key={b}
              className="w-1 border border-black"
              style={{ height: `${b * 25}%`, background: b <= bars ? GOOD : '#1b1f29' }}
            />
          ))}
        </span>
      </div>
      <div className="relative h-3.5 border-2 border-black bg-black/60">
        <div
          className="h-full"
          style={{ width: `${Math.min(100, (blackoutRun / limit) * 100)}%`, background: color }}
        />
        {noSignal && (
          <span className="mission-static absolute inset-0 flex items-center justify-center bg-black/70 font-mono text-[9px] font-bold tracking-widest text-white">
            NO SIGNAL
          </span>
        )}
      </div>
      <p className="font-mono text-[10px] leading-none" style={{ color }}>
        Blackout {blackoutRun} h / {limit} h
      </p>
    </Instrument>
  );
}

const DIAL_MIN_K = 80;
const DIAL_MAX_K = 400;

export function TempGauge({ tempK, fault }: { tempK: number | null; fault?: boolean }) {
  const t = tempK ?? DIAL_MIN_K;
  const f = Math.min(1, Math.max(0, (t - DIAL_MIN_K) / (DIAL_MAX_K - DIAL_MIN_K)));
  const angle = Math.PI * (1 - f); // left (cold) → right (hot)
  const nx = 30 + 22 * Math.cos(angle);
  const ny = 30 - 22 * Math.sin(angle);
  const color = fault ? BAD : f < 0.15 ? '#8fd3ff' : f > 0.8 ? '#ffb43c' : '#e6edf7';
  return (
    <Instrument label="Ext. temp (est.)" unit="°C" fault={fault}>
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 60 34" className="h-8 w-14 shrink-0" aria-hidden>
          <path d="M6 30 A24 24 0 0 1 30 6" stroke="#5ab4ff" strokeWidth="5" fill="none" />
          <path d="M30 6 A24 24 0 0 1 54 30" stroke="#ff9a3c" strokeWidth="5" fill="none" />
          <line x1="30" y1="30" x2={nx} y2={ny} stroke={color} strokeWidth="2.5" />
          <circle cx="30" cy="30" r="3" fill="#000" stroke={color} />
        </svg>
        <div className="flex min-w-0 flex-col">
          <Led color={color} className="text-[16px]">
            {tempK === null ? '—' : `${Math.round(kelvinToCelsius(tempK))}°C`}
          </Led>
          <span className="font-mono text-[9px] text-[#8b97ad]">
            {tempK === null ? '' : `${Math.round(tempK)} K`}
          </span>
        </div>
      </div>
      <p className="font-mono text-[10px] leading-none text-[#8b97ad] italic">simplified model</p>
    </Instrument>
  );
}

export function TiltGauge({
  slopeDeg,
  limit,
  fault,
}: {
  /** null = pending terrain data (never show the placeholder). */
  slopeDeg: number | null;
  limit: number;
  fault?: boolean;
}) {
  if (slopeDeg === null) {
    return (
      <Instrument label="Tilt" unit="deg">
        <Led color={WARN} className="text-[14px]">
          NO DATA
        </Led>
        <p className="font-mono text-[9px] leading-tight text-[#8b97ad]">terrain pending</p>
      </Instrument>
    );
  }
  const over = slopeDeg > limit;
  const color = fault || over ? BAD : slopeDeg >= limit * 0.75 ? WARN : GOOD;
  return (
    <Instrument label="Tilt" unit="deg" fault={fault}>
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 40 24" className="h-6 w-10 shrink-0" aria-hidden>
          <line x1="2" y1="20" x2="38" y2="20" stroke="#5d6880" strokeWidth="1" />
          <g transform={`rotate(${-Math.min(45, slopeDeg)} 20 20)`}>
            <line x1="6" y1="20" x2="34" y2="20" stroke={color} strokeWidth="2.5" />
            <rect x="14" y="10" width="12" height="8" fill="none" stroke={color} strokeWidth="2" />
          </g>
        </svg>
        <Led color={color} className="text-[16px]">
          {slopeDeg.toFixed(1)}°
        </Led>
      </div>
      <p className="font-mono text-[10px] leading-none text-[#8b97ad]">limit {limit}°</p>
    </Instrument>
  );
}
