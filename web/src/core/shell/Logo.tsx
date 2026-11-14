/**
 * Project mark: a half-lit Moon — the subject of the tool is exactly where light ends.
 * Original artwork; deliberately no orbits, chevrons or agency-style insignia.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#000000" />
      <path d="M20 2 A18 18 0 0 1 20 38 A9 18 0 0 1 20 2 Z" fill="#c9ccd2" />
      <circle cx="27" cy="14" r="2.4" fill="#a7abb3" />
      <circle cx="29" cy="25" r="3" fill="#a7abb3" />
      <circle cx="23" cy="30" r="1.6" fill="#a7abb3" />
    </svg>
  );
}
