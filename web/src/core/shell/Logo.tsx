/**
 * Project mark: a glossy lunar sphere lit from one side with a low Sun glint — the south pole's
 * grazing light. Original artwork; deliberately no orbits, chevrons or agency-style insignia.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <radialGradient id="lse-moon" cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#c9ced8" />
          <stop offset="0.8" stopColor="#5d6577" />
          <stop offset="1" stopColor="#2a3040" />
        </radialGradient>
        <linearGradient id="lse-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000814" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="lse-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="0.4" stopColor="#ffb43c" />
          <stop offset="1" stopColor="#ffb43c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="25" r="19" fill="url(#lse-moon)" stroke="#0b1a33" />
      <circle cx="24" cy="25" r="19" fill="url(#lse-shade)" />
      <circle cx="17" cy="19" r="3" fill="#00000022" />
      <circle cx="27" cy="31" r="4.5" fill="#00000026" />
      <circle cx="15" cy="31" r="2" fill="#0000001f" />
      <ellipse cx="18" cy="14" rx="7" ry="3.5" fill="#ffffff" opacity="0.45" />
      <circle cx="9" cy="39" r="7" fill="url(#lse-sun)" />
    </svg>
  );
}
