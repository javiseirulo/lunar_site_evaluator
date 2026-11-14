/**
 * Project mark: a pale Moon with craters in front of a neon starburst, with a small Sun glint.
 * Original artwork; deliberately no orbits, chevrons or agency-style insignia.
 */
export function Logo({ className }: { className?: string }) {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const r = i % 2 ? 19 : 24;
    return { x: 26 + Math.cos(a) * r, y: 26 + Math.sin(a) * r, i };
  });
  return (
    <svg viewBox="0 0 52 52" className={className} aria-hidden>
      <defs>
        <linearGradient id="lse-ray" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3fa4" />
          <stop offset="1" stopColor="#9b5cff" />
        </linearGradient>
        <radialGradient id="lse-moon" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#d9c8ff" />
          <stop offset="1" stopColor="#8f74d6" />
        </radialGradient>
      </defs>
      <g stroke="url(#lse-ray)" strokeWidth="2.6" strokeLinecap="round">
        {rays.map((r) => (
          <line key={r.i} x1="26" y1="26" x2={r.x} y2={r.y} />
        ))}
      </g>
      {rays
        .filter((r) => r.i % 2 === 0)
        .map((r) => (
          <circle key={r.i} cx={r.x} cy={r.y} r="2.1" fill="#ffe3f3" />
        ))}
      <circle cx="26" cy="26" r="13.5" fill="url(#lse-moon)" stroke="#07040f" strokeWidth="2" />
      <circle cx="21" cy="21" r="2.6" fill="#b49ff0" />
      <circle cx="28" cy="31" r="3.2" fill="#b49ff0" />
      <circle cx="31" cy="20" r="1.6" fill="#b49ff0" />
      <circle cx="40" cy="40" r="5" fill="#ff8a3d" stroke="#07040f" strokeWidth="1.8" />
    </svg>
  );
}
