import { useData } from '@/core';

/**
 * About / data / credits. Keep this in sync with docs/04-resources-data.md and the
 * submission's References + AI disclosure. No agency logos or mission insignia.
 */
const DATA_SOURCES = [
  {
    name: 'LOLA south polar DEMs (LRO)',
    use: 'Terrain, slopes and local horizons.',
    href: 'https://pgda.gsfc.nasa.gov/products/90',
  },
  {
    name: 'NAIF SPICE generic kernels (DE440, lunar PA/ME frames)',
    use: 'Sun and Earth positions seen from each site, including libration.',
    href: 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/',
  },
  {
    name: 'JPL Horizons',
    use: 'Spot checks of Sun/Earth azimuth and elevation.',
    href: 'https://ssd.jpl.nasa.gov/horizons/',
  },
  {
    name: 'LOLA average Sun/Earth visibility maps',
    use: 'Sanity check for our illumination and Earth-visibility fractions.',
    href: 'https://pgda.gsfc.nasa.gov/products/69',
  },
];

export default function AboutPage() {
  const manifest = useData((s) => s.manifest);
  const isMock = useData((s) => s.isMock);

  return (
    <div className="flex-1 overflow-y-auto">
      <article className="mx-auto max-w-3xl space-y-10 px-5 py-12">
        <header>
          <p className="eyebrow mb-3">About</p>
          <h1 className="text-3xl font-semibold tracking-tight">Data, method and credits</h1>
          <p className="text-ink-muted mt-3 leading-relaxed">
            Built for the NASA Space Apps Challenge 2026 (Lunar Landing Site Navigator) by a team at
            the Madrid local event. This is an independent project, not affiliated with or endorsed
            by NASA.
          </p>
        </header>

        {isMock && (
          <div className="border-warn/40 bg-warn/5 text-warn rounded-xl border px-4 py-3 text-sm">
            The app is currently showing <strong>mock data</strong> generated for development. The
            numbers are not real measurements.
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-medium">How it works</h2>
          <p className="text-ink-muted leading-relaxed">
            For each candidate site we compute where the Sun and Earth are in the sky over time and
            compare that with the local horizon built from lunar terrain. The Moon has no
            atmosphere, so there is no refraction: the horizon is the terrain plus the curvature of
            the lunar sphere. From that we derive how often a site is sunlit, how often Earth is
            visible, and the longest stretch of darkness.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Data sources</h2>
          <ul className="divide-line border-line divide-y rounded-xl border">
            {DATA_SOURCES.map((d) => (
              <li key={d.name} className="px-4 py-3">
                <a
                  href={d.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent font-medium"
                >
                  {d.name}
                </a>
                <p className="text-ink-muted text-sm">{d.use}</p>
              </li>
            ))}
          </ul>
          {manifest && (
            <p className="text-ink-faint mt-3 font-mono text-[11px]">
              Loaded data: {manifest.sources.join(' · ')} (generated {manifest.generated_utc})
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Use of AI</h2>
          <p className="text-ink-muted leading-relaxed">
            The project idea comes from the team. AI coding assistants were used to help write parts
            of the code and documentation; the full log is in the repository (docs/si-usage-log.md).
          </p>
        </section>
      </article>
    </div>
  );
}
