import ninoData from './nino34.json';
import tempData from './global-temperature.json';

export type ElementSlug = 'air' | 'water' | 'earth' | 'fire' | 'aether';
export type PanelTrack = 'temp' | 'nino' | 'fire' | 'sky' | 'forest';

export interface SubExperience {
  label: string;
  detail?: string;
  status: 'playable' | 'planned';
  statusLabel?: string;
  href?: string;
  track?: PanelTrack;
}

export interface Element {
  slug: ElementSlug;
  element: string;
  experience: string;
  strapline: string;
  description: string;
  context: string;
  image: string;
  imageAlt: string;
  subs: SubExperience[];
}

const tempYears = tempData.events.map((e) => e.year);
const ninoYears = ninoData.events.map((e) => e.year);
const tempRange = `${Math.min(...tempYears)}–${Math.max(...tempYears)}`;
const ninoRange = `${Math.min(...ninoYears)}–${Math.max(...ninoYears)}`;

export const ELEMENTS: Element[] = [
  {
    slug: 'air',
    element: 'AIR',
    experience: 'Hear the Atmosphere',
    strapline:
      "Experience Earth's changing climate and atmospheric phenomena through sound.",
    description:
      'Air is where Terra Sonica begins: 146 years of global surface temperature, one year per note, so that a century of warming becomes a melody you can hear.',
    context:
      'Global Surface Temperature is built from NASA GISTEMP combined land–ocean surface temperature anomalies — a measure of the planet\u2019s surface, not direct atmospheric temperature. Open the playable track to hear it.',
    image: '/images/air-hurricane-katrina.jpg',
    imageAlt: 'Hurricane Katrina over the Gulf Coast, MODIS satellite image',
    subs: [
      {
        label: `Global Surface Temperature (${tempRange})`,
        status: 'playable',
        href: '#/air',
        track: 'temp',
      },
      { label: 'Hear the Storm', status: 'planned' },
    ],
  },
  {
    slug: 'water',
    element: 'WATER',
    experience: 'Hear the Ocean',
    strapline: "Listen to changes in the tropical Pacific and Earth's oceans.",
    description:
      'Water listens to the tropical Pacific as it swings between cool La Niña and warm El Niño: 80 months of ocean temperature, one month per note.',
    context:
      'El Niño is driven only by verified Niño 3.4 sea-surface temperature anomalies. The map changes with the data as the track plays.',
    image:
      '/media/elnino_2026_ssta_avw_ssha_1010_nolabels.02200_preview.jpg',
    imageAlt:
      'Still frame from NASA SVS 5683 showing tropical Pacific conditions in 2025 versus 2026',
    subs: [
      {
        label: `El Niño (${ninoRange})`,
        status: 'playable',
        href: '#/water',
        track: 'nino',
      },
      { label: 'Sea Level Rise', status: 'planned' },
      { label: 'Ocean Currents', status: 'planned' },
    ],
  },
  {
    slug: 'earth',
    element: 'EARTH',
    experience: 'Hear the Forest',
    strapline: 'Explore the living landscapes of our planet.',
    description:
      'Earth listens to the Amazon: twenty-four years of MODIS tree-cover estimates over the Brazilian Legal Amazon, one year per note; denser-canopy years sound high.',
    context:
      'Hear the Forest is driven only by annual means from the supplied export — mean canopy-cover percentages, satellite estimates of canopy, not a measure of clearing. The map changes with the data as the track plays.',
    image: '/images/earth-forest-amazon.jpg',
    imageAlt: 'Amazon rainforest in northern Brazil, MODIS satellite image',
    subs: [
      {
        label: 'Hear the Forest — Amazon Tree Cover (2001–2024)',
        status: 'playable',
        href: '#/earth',
        track: 'forest',
      },
      { label: 'Annual Forest Loss', status: 'planned' },
      { label: 'Forest Canopy Height', status: 'planned' },
      { label: 'Forest Structure and Biomass', status: 'planned' },
    ],
  },
  {
    slug: 'fire',
    element: 'FIRE',
    experience: 'Hear the Fire',
    strapline: "Hear the changing patterns of fire across Earth's surface.",
    description:
      'Fire listens to burning: six years of MODIS active-fire detections over Brazil, one month per note; higher pitch means more detections.',
    context:
      'Hear the Fire is driven only by verified monthly detection counts. The map changes with the data as the track plays.',
    image: '/images/fire-greece-modis.jpg',
    imageAlt:
      'Fires in Greece with a smoke plume over the Aegean Sea, MODIS satellite image',
    subs: [
      {
        label: 'Hear the Fire — Brazil (2020–2025)',
        status: 'playable',
        href: '#/fire',
        track: 'fire',
      },
      { label: 'Fire Radiative Power', status: 'planned' },
    ],
  },
  {
    slug: 'aether',
    element: 'AETHER (SKY)',
    experience: 'Hear the Lights',
    strapline:
      "Discover the human footprint visible in Earth's nighttime lights.",
    description:
      'Aether listens to the lights of human civilization as seen from orbit — cities glowing against the dark side of the planet.',
    context:
      'Earth at Night — India is built from fourteen years of NASA Black Marble nighttime imagery over India. Open the playable track to hear it.',
    image: '/images/aether-night-lights-asia.jpg',
    imageAlt: 'Asia and Australia at night, Black Marble composite of city lights',
    subs: [
      {
        label: 'Hear the Lights — Earth at Night — India (2012–2025)',
        status: 'playable',
        href: '#/aether',
        track: 'sky',
      },
      { label: 'Global Nighttime Radiance', status: 'planned' },
    ],
  },
];

export const TRACK_TITLES: Record<PanelTrack, string> = {
  temp: 'Global Surface Temperature',
  nino: 'El Niño',
  fire: 'Hear the Fire — Brazil (2020–2025)',
  sky: 'Hear the Lights — Earth at Night — India (2012–2025)',
  forest: 'Hear the Forest — Amazon Tree Cover (2001–2024)',
};

export function trackRouteId(
  track: PanelTrack,
): 'track-1' | 'track-2' | 'track-3' | 'track-4' | 'track-5' {
  if (track === 'temp') return 'track-1';
  if (track === 'nino') return 'track-2';
  if (track === 'fire') return 'track-3';
  if (track === 'sky') return 'track-4';
  return 'track-5';
}

export function trackFromRouteId(id: string): PanelTrack | null {
  if (id === 'track-1') return 'temp';
  if (id === 'track-2') return 'nino';
  if (id === 'track-3') return 'fire';
  if (id === 'track-4') return 'sky';
  if (id === 'track-5') return 'forest';
  return null;
}

export function elementHash(slug: ElementSlug): string {
  return `#/${slug}`;
}

export function playerHash(slug: ElementSlug, track: PanelTrack): string {
  return `#/${slug}/${trackRouteId(track)}`;
}

export function findElement(slug: string): Element | null {
  return ELEMENTS.find((e) => e.slug === slug) ?? null;
}
