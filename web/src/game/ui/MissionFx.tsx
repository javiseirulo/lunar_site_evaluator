/**
 * Keyframes and effect classes for the Mission game, scoped by the `mission-` prefix so the
 * game does not depend on the (still changing) global stylesheet. React hoists and dedupes it.
 */
const CSS = `
/* Mission keeps its own dark arcade palette: the site theme redefines these tokens (light paper). */
.mission-root {
  --color-navy-950: #02050c;
  --color-navy-900: #061022;
  --color-navy-850: #0a1830;
  --color-navy-800: #0e2040;
  --color-navy-700: #15305c;
  --color-heading: #ffffff;
  --color-ink: #e6edf7;
  --color-ink-muted: #9fb2d0;
  --color-ink-faint: #6a7fa3;
  --color-edge: #24406e;
  --color-good: #8fe39a;
  --color-warn: #ffcc4d;
  --color-bad: #ff7a6b;
  --color-sun: #ffb43c;
  --color-earth: #5ab4ff;
  /* Global .btn / .btn-go read these: dark buttons, orange main action. */
  --color-pale: #15305c;
  --color-panel-2: #1e4380;
  --color-panel-3: #0e2040;
  --color-edge-hi: #4c74b4;
  --color-edge-lo: #8cc4ff;
  --color-pink: #f08a1d;
  --color-pink-dark: #c86500;
  color: var(--color-ink);
}
@keyframes mission-alarm-frame {
  0%, 100% { border-color: #ff3b30; box-shadow: inset 0 0 28px #ff3b3060; }
  50% { border-color: #5a0f0f; box-shadow: inset 0 0 0 transparent; }
}
@keyframes mission-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.25; }
}
.mission-frame { border-color: #ff3b30; }
.mission-frame[data-flash='true'] { animation: mission-alarm-frame 0.9s steps(2, jump-none) infinite; }
.mission-blink { animation: mission-blink 1s steps(1) infinite; }
.mission-pixel { box-shadow: 4px 4px 0 #000; }
.mission-scan {
  background-image: repeating-linear-gradient(0deg, #ffffff06 0 1px, transparent 1px 3px);
}
/* Cockpit (timelapse): chunky bezel, rivets, cut-corner window, instrument faults. */
.mission-bezel {
  background: linear-gradient(180deg, #3a3f4d 0%, #262a35 60%, #1b1e27 100%);
  border: 4px solid #000;
  box-shadow: inset 0 0 0 2px #555c70, inset 0 -4px 0 2px #12141a;
}
.mission-window {
  clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px),
    calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
}
.mission-rivet {
  position: absolute; width: 6px; height: 6px; background: #9aa0b2;
  box-shadow: inset -2px -2px 0 #4a4f5e, 0 0 0 1px #000;
}
.mission-scanlines {
  background-image: repeating-linear-gradient(0deg, #00000038 0 1px, transparent 1px 3px);
}
.mission-cockpit { transition: transform 0.5s ease-out; transform-origin: 50% 80%; }
.mission-cockpit .mission-panel { transition: filter 1.2s ease-out; }
.mission-cockpit[data-fx='cold'] .mission-panel { filter: brightness(0.7) saturate(0.7); }
.mission-cockpit[data-fx='slope'] { transform: rotate(-7deg); animation: mission-shake 0.3s linear 5; }
@keyframes mission-shake {
  0%, 100% { transform: rotate(-7deg) translate(0, 0); }
  25% { transform: rotate(-9deg) translate(-4px, 2px); }
  50% { transform: rotate(-5.5deg) translate(3px, -2px); }
  75% { transform: rotate(-8deg) translate(-2px, -1px); }
}
@keyframes mission-fault {
  0%, 49% { border-color: #ff3b30; box-shadow: 0 0 12px #ff3b30aa; }
  50%, 100% { border-color: #6a1010; box-shadow: none; }
}
.mission-instrument[data-fault='true'] {
  border-color: #ff3b30; animation: mission-fault 0.7s steps(1) infinite;
}
@keyframes mission-static {
  0% { background-position: 0 0; }
  100% { background-position: 0 -24px; }
}
.mission-static {
  background-image: repeating-linear-gradient(0deg, #ffffff30 0 1px, transparent 1px 2px,
    #ffffff14 2px 4px, transparent 4px 6px);
  animation: mission-static 0.2s steps(3) infinite;
}
.mission-alarm-lamp { animation: mission-blink 0.5s steps(1) infinite; }
/* Countdown: red pulse in the last 30 s. */
@keyframes mission-pulse {
  0%, 100% { transform: scale(1); box-shadow: 4px 4px 0 #000; }
  50% { transform: scale(1.07); box-shadow: 4px 4px 0 #000, 0 0 18px #ff3b3088; }
}
.mission-timer[data-low='true'] { animation: mission-pulse 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .mission-frame[data-flash='true'], .mission-blink, .mission-instrument[data-fault='true'],
  .mission-static, .mission-alarm-lamp, .mission-cockpit[data-fx='slope'],
  .mission-timer[data-low='true'] { animation: none; }
  .mission-cockpit, .mission-cockpit .mission-panel { transition: none; }
}
`;

export function MissionFx() {
  return (
    <style href="mission-fx" precedence="default">
      {CSS}
    </style>
  );
}
