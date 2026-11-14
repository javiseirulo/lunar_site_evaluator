/**
 * Keyframes and effect classes for the Mission game, scoped by the `mission-` prefix so the
 * game does not depend on the (still changing) global stylesheet. React hoists and dedupes it.
 */
const CSS = `
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
@media (prefers-reduced-motion: reduce) {
  .mission-frame[data-flash='true'], .mission-blink { animation: none; }
}
`;

export function MissionFx() {
  return (
    <style href="mission-fx" precedence="default">
      {CSS}
    </style>
  );
}
