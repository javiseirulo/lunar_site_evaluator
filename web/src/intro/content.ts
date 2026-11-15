/**
 * Words and facts for the intro page, in one place so the team can edit them without touching layout.
 * Every number here was checked against the repo on 2026-11-15 (again after #135) (see the comment next to each one);
 * if the data changes, change them here.
 */

export const CHALLENGE_URL =
  'https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/';

export const CHALLENGE = {
  title: 'The challenge',
  lead: 'NASA Space Apps 2026 asked teams for a Lunar Landing Site Navigator.',
  body: [
    'A mission to the lunar south pole depends on two things: sunlight for power and heat, and a clear line of sight to Earth. Both change hour by hour, and both swing a lot if you move a few kilometres or land a few days later.',
    'The data to answer that exists. Quickmap, Moon Trek and JPL Horizons all hold it. But those tools are built for specialists, and when a launch slips nobody wants to spend a week finding out which backup site still works.',
  ],
  briefTitle: 'The brief, in short',
  brief: [
    'A tool that mission planners, teachers and the public can all use to compare landing sites and dates.',
    'It shows where the Sun and Earth sit relative to the horizon, to judge solar power and direct communication windows.',
    'The focus is the south pole, where a small change of place or date changes the lighting a lot.',
    'The real case is a mission that slips: engineers have to check other sites or dates nearby, fast.',
  ],
};

export const WHY_HARD = {
  title: 'Why the south pole is hard',
  items: [
    {
      title: 'The Sun stays low.',
      text: "The Moon's axis is tilted only about 1.5 degrees, so near the pole the Sun circles along the horizon instead of climbing. Shadows get very long, and a ridge a few kilometres away can hide the Sun for days.",
    },
    {
      title: 'Earth is low too.',
      text: 'From the pole, Earth hangs near the horizon. The Moon wobbles slightly (libration), which moves Earth up and down by a few degrees and can tuck it behind terrain.',
    },
    {
      title: 'There is no atmosphere.',
      text: 'Nothing bends the light. The horizon is just the terrain plus the curve of the Moon, so you need real elevation data to know what is hidden.',
    },
    {
      title: 'Some ground never sees the Sun.',
      text: 'Deep craters near the pole have floors in permanent shadow. They are among the coldest places known and may hold water ice, which is part of why missions want to land close by.',
    },
  ],
};

/** Counts from web/public/data: sites.json (59), 8,760 hourly samples in 2027, horizon/ (41 files). */
export const STATS = [
  { value: '59', label: 'landing sites in the catalogue, each with a cited source' },
  { value: '8,760', label: 'hourly Sun and Earth positions per site, covering all of 2027' },
  { value: '41', label: 'polar sites with horizons built from NASA LOLA terrain' },
  { value: '0.0007°', label: 'largest gap between our angles and JPL Horizons' },
];

export const FEATURES = {
  title: 'What you can do with it',
  lead: 'It all runs in your browser. Normal view keeps things simple; Expert view adds the detail planners want.',
  items: [
    {
      title: 'Explore',
      text: "A 3D Moon with every site on it. Set what your mission needs and the matching sites update as you type. Press Simulate to run through 2027 an hour at a time, click anywhere for that spot's figures, or switch on the 32 past landings.",
      to: '/explore',
      cta: 'Open the map',
    },
    {
      title: 'Street View',
      text: 'Stand on a site and look around, with the Sun and Earth where they really are at the time you pick.',
      to: '/streetview',
      cta: 'Look around',
    },
    {
      title: 'Mission',
      text: 'A game: your landing site falls through and you pick another. Play the south pole or real historic landings, or run it with a whole class on their phones.',
      to: '/game',
      cta: 'Play',
    },
    {
      title: 'Learn',
      text: 'A plain-language explainer and glossary on why a few kilometres of ground matter so much.',
      to: '/learn',
      cta: 'Read it',
    },
  ],
};

export const HOW = {
  title: 'How it works',
  lead: 'The heavy maths runs once, ahead of time, and the website only reads the results. There is no server to wait for.',
  steps: [
    {
      title: 'Sun and Earth positions',
      text: "We work out where the Sun and Earth are, as seen from each site, for every hour of 2027. The calculation uses NASA's SPICE toolkit with the DE440 ephemeris and the Moon's orientation data, so libration is included.",
    },
    {
      title: 'Checking against NASA',
      text: 'We asked JPL Horizons for the same angles at seven places, including Apollo 11 and Chang’e 4. Our largest difference was 0.0007 degrees, about fifteen times tighter than the 0.01 degrees we aimed for.',
    },
    {
      title: 'Terrain and horizons',
      text: "NASA's LOLA elevation maps give slopes, permanently shadowed regions and the local skyline. For 41 polar sites we trace the real horizon in every direction, so a hill that blocks the Sun counts.",
    },
    {
      title: 'Scores for your mission',
      text: 'For your landing window we measure how much of the time each site has sunlight and a view of Earth, its longest dark stretch, its slope and its distance to shadowed craters, then combine them into a score. The same code runs in your browser, which is why the filters answer instantly.',
    },
    {
      title: 'A plain website',
      text: 'The results are published as ordinary files. The interface is React and TypeScript, with three.js for the globe and CesiumJS for Street View.',
    },
  ],
};

export const DATA = {
  title: 'The data behind it',
  lead: 'Nothing on the site is made up. These are the NASA datasets and tools we used, and what each one is for.',
  nasa: [
    {
      name: 'NASA/NAIF SPICE kernels',
      use: 'Sun and Earth positions and the Moon’s orientation',
      href: 'https://naif.jpl.nasa.gov/naif/data.html',
    },
    {
      name: 'JPL Horizons',
      use: 'An independent check of our angles',
      href: 'https://ssd.jpl.nasa.gov/horizons/',
    },
    {
      name: 'LOLA south pole topography (PGDA 90)',
      use: 'Elevation, slope and permanently shadowed regions',
      href: 'https://pgda.gsfc.nasa.gov/products/90',
    },
    {
      name: 'LOLA north pole topography (PGDA 98)',
      use: 'The same, for the north',
      href: 'https://pgda.gsfc.nasa.gov/products/98',
    },
    {
      name: 'LOLA global elevation (LDEM_64)',
      use: 'Terrain for Street View away from the poles',
      href: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_64.lbl',
    },
    {
      name: 'CGI Moon Kit (NASA Scientific Visualization Studio)',
      use: 'The colour of the Moon’s surface, on the globe and on this page',
      href: 'https://svs.gsfc.nasa.gov/4720',
    },
    {
      name: 'Spacecraft on the Moon (NASA NSSDCA)',
      use: 'Where and when earlier missions landed',
      href: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html',
    },
  ],
  note: 'The landing sites themselves come from published studies, each cited in the app: Wueller et al. 2026 (JGR Planets), De Rosa et al. 2012 and Flahaut et al. 2020 (Planetary and Space Science).',
};

export const FUTURE = {
  title: 'What we would build next',
  lead: 'The weekend ran out before the list did.',
  items: [
    'Real terrain horizons for every site. Today 41 polar sites have them; the other 18 use a flat horizon, so their sunlight and Earth figures are best case.',
    'More than one year. The data covers 2027, one value per hour; other years and finer steps would cover longer missions.',
    'Distance to shadowed craters for the 18 sites that still show "pending".',
    'Your own lander settings. We assume an observer 5 metres above the ground and a 2 degree antenna margin; these should be yours to change.',
    'Checks against flight-grade tools, so the numbers could back a real mission plan and not only a first look.',
  ],
};

export const AUDIENCE = {
  title: 'Who it is for',
  items: [
    {
      title: 'Mission planners',
      text: 'A fast way to re-check sites and dates when plans change.',
    },
    {
      title: 'Teachers and students',
      text: 'The same numbers in plain language, plus a game that shows why a few kilometres matter.',
    },
    {
      title: 'Anyone curious',
      text: 'Open the 3D Moon and watch the light move.',
    },
  ],
};

export const TEAM = {
  title: 'Who made it',
  body: 'Five of us built this over one weekend at the Madrid event of the NASA Space Apps Challenge 2026. Between us we covered the ephemerides and scoring, the 3D globe and mission requirements, terrain and Street View, the Mission game, and the web platform and design.',
  disclaimer:
    'An independent project for the NASA Space Apps Challenge, not affiliated with or endorsed by NASA.',
};

export const FINAL = {
  title: 'Pick a landing site.',
  text: 'Open the map, press Simulate, and see which spot still has light when the others go dark.',
};
