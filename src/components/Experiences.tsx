import ninoData from '../data/nino34.json';
import tempData from '../data/global-temperature.json';

interface SubExperience {
  label: string;
  detail?: string;
  status: 'playable' | 'planned';
  href?: string;
}

interface Element {
  element: string;
  experience: string;
  strapline: string;
  image: string;
  imageAlt: string;
  subs: SubExperience[];
}

const tempYears = tempData.events.map((e) => e.year);
const ninoYears = ninoData.events.map((e) => e.year);
const tempRange = `${Math.min(...tempYears)}–${Math.max(...tempYears)}`;
const ninoRange = `${Math.min(...ninoYears)}–${Math.max(...ninoYears)}`;

const ELEMENTS: Element[] = [
  {
    element: 'AIR',
    experience: 'Hear the Atmosphere',
    strapline:
      "Experience Earth's changing climate and atmospheric phenomena through sound.",
    image: '/images/air-hurricane-katrina.jpg',
    imageAlt: 'Hurricane Katrina over the Gulf Coast, MODIS satellite image',
    subs: [
      {
        label: `Global Surface Temperature (${tempRange})`,
        status: 'playable',
        href: '#track-1',
      },
      { label: 'Hear the Storm', status: 'planned' },
    ],
  },
  {
    element: 'WATER',
    experience: 'Hear the Ocean',
    strapline: "Listen to changes in the tropical Pacific and Earth's oceans.",
    image:
      '/media/elnino_2026_ssta_avw_ssha_1010_nolabels.02200_preview.jpg',
    imageAlt:
      'Still frame from NASA SVS 5683 showing tropical Pacific conditions in 2025 versus 2026',
    subs: [
      {
        label: `El Niño (${ninoRange})`,
        status: 'playable',
        href: '#track-2',
      },
      { label: 'Sea Level Rise', status: 'planned' },
      { label: 'Ocean Currents', status: 'planned' },
    ],
  },
  {
    element: 'EARTH',
    experience: 'Hear the Forest',
    strapline: 'Explore the living landscapes of our planet.',
    image: '/images/earth-forest-amazon.jpg',
    imageAlt: 'Amazon rainforest in northern Brazil, MODIS satellite image',
    subs: [
      { label: 'Annual Forest Loss', status: 'planned' },
      { label: 'Forest Canopy Height', status: 'planned' },
      { label: 'Forest Structure and Biomass', status: 'planned' },
    ],
  },
  {
    element: 'FIRE',
    experience: 'Hear the Fire',
    strapline: "Hear the changing patterns of fire across Earth's surface.",
    image: '/images/fire-greece-modis.jpg',
    imageAlt:
      'Fires in Greece with a smoke plume over the Aegean Sea, MODIS satellite image',
    subs: [
      {
        label: 'Wildfire Detections',
        detail: 'NASA FIRMS',
        status: 'planned',
      },
      { label: 'Fire Radiative Power', status: 'planned' },
    ],
  },
  {
    element: 'AETHER (SKY)',
    experience: 'Hear the Lights',
    strapline:
      "Discover the human footprint visible in Earth's nighttime lights.",
    image: '/images/aether-night-lights-asia.jpg',
    imageAlt: 'Asia and Australia at night, Black Marble composite of city lights',
    subs: [
      {
        label: 'Earth at Night — India, 2012–2025',
        detail: 'becomes Playable in the Sky milestone',
        status: 'planned',
      },
      { label: 'Global Nighttime Radiance', status: 'planned' },
    ],
  },
];

export default function Experiences() {
  return (
    <section aria-label="Experiences" className="mx-auto max-w-5xl px-4 py-10">
      <h2 className="text-2xl font-bold text-cloud">
        THE EARTH JUKEBOX — Hear Our Planet
      </h2>
      <p className="mt-1 text-lg text-atmos">
        Terra Sonica — The Five Elements of Earth
      </p>
      <p className="mt-3 max-w-3xl text-slate-300">
        Explore Earth through sound. Each experience turns real NASA Earth
        observations into music, revealing a different story about our changing
        planet.
      </p>
      <ul
        className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm"
        aria-label="Legend"
      >
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full bg-atmos"
          />
          <span>
            <strong className="text-cloud">Playable Now</strong>{' '}
            <span className="text-slate-300">
              — Explore a working sonification
            </span>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full bg-slate-500"
          />
          <span>
            <strong className="text-cloud">Planned</strong>{' '}
            <span className="text-slate-300">
              — Part of our full Earth Jukebox vision
            </span>
          </span>
        </li>
      </ul>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {ELEMENTS.map((el, i) => (
          <article
            key={el.element}
            aria-label={`${el.element}: ${el.experience}`}
            className="overflow-hidden rounded-lg border border-atmos/20 bg-slate-900/40 shadow-[0_0_18px_rgba(86,199,245,0.10)]"
          >
            <img
              src={el.image}
              alt={el.imageAlt}
              loading="lazy"
              className="h-44 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="text-lg font-semibold text-cloud">
                {i + 1}. {el.element} — {el.experience}
              </h3>
              <p className="mt-1 text-sm text-slate-300">{el.strapline}</p>
              <ul className="mt-3 space-y-2">
                {el.subs.map((s) =>
                  s.status === 'playable' ? (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        className="text-atmos hover:underline"
                      >
                        {s.label}
                      </a>{' '}
                      <span className="rounded bg-atmos/15 px-2 py-0.5 font-mono text-xs text-atmos">
                        Playable now
                      </span>
                    </li>
                  ) : (
                    <li
                      key={s.label}
                      data-planned="true"
                      className="text-slate-300"
                    >
                      {s.label}
                      {s.detail ? ` — ${s.detail}` : ''}{' '}
                      <span className="rounded bg-slate-700/50 px-2 py-0.5 font-mono text-xs text-slate-300">
                        Planned — coming soon
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
