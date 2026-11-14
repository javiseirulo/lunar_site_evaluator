/**
 * Project mark: a half-lit Moon — the subject of the tool is exactly where light ends.
 * Original artwork; deliberately no orbits, chevrons or agency-style insignia.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#2a2d33" />
      <path d="M20 2 A18 18 0 0 1 20 38 A9 18 0 0 1 20 2 Z" fill="#f3efe4" />
      <circle cx="27" cy="14" r="2.4" fill="#c9c3b6" />
      <circle cx="29" cy="25" r="3" fill="#c9c3b6" />
      <circle cx="23" cy="30" r="1.6" fill="#c9c3b6" />
    </svg>
  );
}
