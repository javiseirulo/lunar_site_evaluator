import { useData } from '@/core';

/**
 * Data, method and credits. Keep in sync with docs/04-resources-data.md and the submission's
 * References + AI disclosure. No agency logos or mission insignia.
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

const TOC = [
  { id: 'how', label: 'How it works' },
  { id: 'sources', label: 'Data sources' },
  { id: 'ai', label: 'Use of AI' },
  { id: 'credits', label: 'Credits' },
];

export default function AboutPage() {
  const manifest = useData((s) => s.manifest);
  const isMock = useData((s) => s.isMock);

  return (
    <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
      <nav className="box self-start" aria-label="On this page">
        <div className="box-head-dark">On this page</div>
        <ul className="box-body space-y-1 text-[11px]">
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="lnk more">
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="box">
        <div className="box-head">Data &amp; Method</div>
        <div className="box-body max-w-[72ch] space-y-4 text-[12px]">
          <h1 className="text-[18px] font-bold text-white">Data, method and credits</h1>

          {isMock && (
            <p className="border-warn/60 bg-warn/10 text-warn border px-2 py-1.5 text-[11px]">
              <b>Notice:</b> the site is currently showing <b>mock data</b> generated for
              development. The numbers are not real measurements.
            </p>
          )}

          <section id="how">
            <h2 className="border-edge mb-1 border-b text-[13px] font-bold text-white">
              How it works
            </h2>
            <p className="text-ink-muted">
              For each candidate site we compute where the Sun and Earth are in the sky over time
              and compare that with the local horizon built from lunar terrain. The Moon has no
              atmosphere, so there is no refraction: the horizon is the terrain plus the curvature
              of the lunar sphere. From that we derive how often a site is sunlit, how often Earth
              is visible, and the longest stretch of darkness.
            </p>
          </section>

          <section id="sources">
            <h2 className="border-edge mb-1 border-b text-[13px] font-bold text-white">
              Data sources
            </h2>
            <ul className="text-ink-muted list-[square] space-y-1 pl-5">
              {DATA_SOURCES.map((d) => (
                <li key={d.name}>
                  <a href={d.href} target="_blank" rel="noreferrer" className="lnk">
                    {d.name}
                  </a>{' '}
                  — {d.use}
                </li>
              ))}
            </ul>
            {manifest && (
              <p className="text-ink-faint mt-1.5 text-[10px]">
                Loaded data: {manifest.sources.join(' · ')} (generated{' '}
                <span className="num">{manifest.generated_utc}</span>)
              </p>
            )}
          </section>

          <section id="ai">
            <h2 className="border-edge mb-1 border-b text-[13px] font-bold text-white">
              Use of AI
            </h2>
            <p className="text-ink-muted">
              The project idea comes from the team. AI coding assistants were used to help write
              parts of the code and documentation; the full log is in the repository
              (docs/si-usage-log.md).
            </p>
          </section>

          <section id="credits">
            <h2 className="border-edge mb-1 border-b text-[13px] font-bold text-white">Credits</h2>
            <p className="text-ink-muted">
              Built for the NASA Space Apps Challenge 2026 (Lunar Landing Site Navigator) by a team
              at the Madrid local event. Independent project, not affiliated with or endorsed by
              NASA.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
