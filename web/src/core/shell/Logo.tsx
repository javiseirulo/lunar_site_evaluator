/** Project mark: a lunar limb with a low Sun on the horizon. Original artwork, no agency branding. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <radialGradient id="logo-moon" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#f1efe9" />
          <stop offset="1" stopColor="#8d8f99" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="#131722" stroke="#343b52" />
      <path d="M3 21a13 13 0 0 0 26 0c-4-2.2-8.4-3.2-13-3.2S7 18.8 3 21Z" fill="url(#logo-moon)" />
      <circle cx="22.5" cy="13.2" r="2.6" fill="#f5b74a" />
      <circle cx="9" cy="10" r="1.3" fill="#5aaeff" />
    </svg>
  );
}
