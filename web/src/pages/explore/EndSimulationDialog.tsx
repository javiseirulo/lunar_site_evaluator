/**
 * "End simulation?" confirm for Normal Explore: shown when a site/point switch arrives while a
 * simulation is running (store `pendingSelection`). Modal, Esc or "Keep simulating" cancels.
 */
import { useEffect, useRef } from 'react';
import { formatLatLon, useAppStore, useData } from '@/core';
import { useCustomPins } from '@/globe/customPins';

export function EndSimulationDialog() {
  const pending = useAppStore((s) => s.pendingSelection);
  const proMode = useAppStore((s) => s.proMode);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectedPoint = useAppStore((s) => s.selectedPoint);
  const sites = useData((s) => s.sites);
  const startUtc = useData((s) => s.manifest?.time_range.start_utc);
  const pendingLanding = useAppStore((s) => s.pendingLanding);
  const confirmLanding = useAppStore((s) => s.confirmLanding);
  const pins = useCustomPins((s) => s.pins);
  const confirmPending = useAppStore((s) => s.confirmPending);
  const cancelPending = useAppStore((s) => s.cancelPending);

  if (pendingLanding && !proMode) {
    const date = (pendingLanding.patch.landing_utc ?? pendingLanding.startUtc).slice(0, 10);
    return (
      <EndSimulationPanel
        current="the current landing date"
        next={`landing on ${date}`}
        onKeep={cancelPending}
        onEnd={confirmLanding}
      />
    );
  }
  if (!pending || proMode || !startUtc) return null;

  const current = selectedSiteId
    ? (sites?.find((s) => s.id === selectedSiteId)?.name ?? selectedSiteId)
    : selectedPoint
      ? (pins.find((p) => p.lat === selectedPoint.lat && p.lon === selectedPoint.lon)?.name ??
        formatLatLon(selectedPoint.lat, selectedPoint.lon))
      : 'the current spot';

  return (
    <EndSimulationPanel
      current={current}
      next={pending.target.name}
      onKeep={cancelPending}
      onEnd={() => confirmPending(startUtc)}
    />
  );
}

function EndSimulationPanel({
  current,
  next,
  onKeep,
  onEnd,
}: {
  current: string;
  next: string;
  onKeep: () => void;
  onEnd: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLButtonElement>(null);

  // Focus the safe choice on open; give focus back to whatever had it when the dialog closes.
  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    safeRef.current?.focus();
    return () => returnTo?.focus?.();
  }, []);

  // Esc cancels; Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onKeep();
        return;
      }
      if (e.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0]!;
      const last = buttons[buttons.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKeep]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onKeep();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-sim-title"
        aria-describedby="end-sim-text"
        className="box w-full max-w-[420px] p-5"
      >
        <h2 id="end-sim-title" className="text-heading text-[18px] font-medium">
          End simulation?
        </h2>
        <p id="end-sim-text" className="text-ink mt-2 text-[14px] leading-relaxed">
          A simulation is running for <b className="text-heading">{current}</b>. End it to switch to{' '}
          <b className="text-heading">{next}</b>?
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button ref={safeRef} type="button" className="btn" onClick={onKeep}>
            Keep simulating
          </button>
          <button type="button" className="btn btn-go" onClick={onEnd}>
            End simulation
          </button>
        </div>
      </div>
    </div>
  );
}
