import { useData } from '@/core';
import { Figure, figureSrc } from '@/core/shell/Figure';

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

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="border-edge mb-2 scroll-mt-4 border-b pb-1 text-[18px] font-bold text-heading"
    >
      {children}
    </h2>
  );
}

/** Text on one side, the picture on the other. The first picture sits on the right. */
function Beside({
  id,
  title,
  imageFirst,
  src,
  alt,
  caption,
  children,
}: {
  id: string;
  title: string;
  imageFirst?: boolean;
  src: string;
  alt: string;
  caption: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <H id={id}>{title}</H>
      <div
        className={`mt-3 grid items-start gap-x-8 gap-y-4 ${
          imageFirst
            ? 'md:grid-cols-[minmax(200px,0.72fr)_minmax(0,1.4fr)]'
            : 'md:grid-cols-[minmax(0,1.4fr)_minmax(200px,0.72fr)]'
        }`}
      >
        <div className={`text-ink text-[16px] leading-[1.65] ${imageFirst ? 'md:order-2' : ''}`}>
          {children}
        </div>
        <Figure
          src={src}
          alt={alt}
          className={`border-edge border ${imageFirst ? 'md:order-1' : ''}`}
        >
          {caption}
        </Figure>
      </div>
    </section>
  );
}

export default function AboutPage() {
  const manifest = useData((s) => s.manifest);
  const isMock = useData((s) => s.isMock);

  return (
    <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
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
        <div className="box-body space-y-10 text-[16px] leading-[1.65]">
          <h1 className="text-[22px] font-bold text-heading">Data, method and credits</h1>

          {isMock && (
            <p className="border-warn/60 bg-warn/10 text-warn border px-2 py-1.5 text-[11px]">
              <b>Notice:</b> the site is currently showing <b>mock data</b> generated for
              development. The numbers are not real measurements.
            </p>
          )}

          <Beside
            id="how"
            title="How it works"
            src={figureSrc('shackleton-rim.png')}
            alt="A sunlit arc of Shackleton crater's rim, with the crater floor left in darkness."
            caption={
              <>
                Shackleton's rim, seen by the Lunar Reconnaissance Orbiter Camera. The Sun stays so
                low that the floor never lights up while parts of the rim do. The horizon at a
                landing site is this kind of terrain, plus the curve of the Moon. NASA/GSFC/Arizona
                State University.
              </>
            }
          >
            <p className="text-ink-muted">
              For each candidate site we compute where the Sun and Earth are in the sky over time
              and compare that with the local horizon built from lunar terrain. The Moon has no
              atmosphere, so there is no refraction: the horizon is the terrain plus the curvature
              of the lunar sphere. From that we derive how often a site is sunlit, how often Earth
              is visible, and the longest stretch of darkness.
            </p>
          </Beside>

          <Beside
            id="sources"
            title="Data sources"
            imageFirst
            src={figureSrc('lola-south-pole.jpg')}
            alt="The lunar south pole colored by height, with Shackleton and de Gerlache labeled near the center."
            caption={
              <>
                South polar heights from LOLA. Low ground is blue, high ground is red and white.
                Shackleton and de Gerlache, two of the places scored here, are labeled near the
                middle. NASA Scientific Visualization Studio.
              </>
            }
          >
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
              <p className="text-ink-muted mt-3 text-[14px]">
                Loaded data: {manifest.sources.join('; ')} (generated{' '}
                <span className="num">{manifest.generated_utc}</span>)
              </p>
            )}
          </Beside>

          <section id="ai">
            <h2 className="border-edge mb-2 border-b pb-1 text-[18px] font-bold text-heading">
              Use of AI
            </h2>
            <p className="text-ink-muted">
              The project idea comes from the team. AI tools helped build it: Claude Code
              (Anthropic) and OpenAI Codex helped write parts of the code and documentation, and the
              Mission game illustrations were generated with OpenAI Codex image generation and the
              3D lander model was generated with Claude. The full log is in the repository
              (docs/si-usage-log.md). The scientific data come from NASA and other public sources
              listed above; none of the AI output uses NASA logos or mission identifiers.
            </p>
          </section>

          <section id="credits">
            <h2 className="border-edge mb-2 border-b pb-1 text-[18px] font-bold text-heading">
              Credits
            </h2>
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
