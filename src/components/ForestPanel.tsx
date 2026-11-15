import { useCallback, useMemo, useRef } from 'react';
import { PlaybackConductor } from '../audio/conductor';
import { FOREST_NOTE_MS, ForestPlayer } from '../audio/forestEngine';
import type { ForestTick } from '../audio/forestEngine';
import { useTrackPlayer } from '../hooks/useTrackPlayer';
import type { ReactNode } from 'react';
import forestData from '../data/forest-amazon.json';
import { TrackCard } from './PlayerSection';

type ForestEvent = (typeof forestData.events)[number];

const FOREST_FIRST_YEAR = forestData.events[0].year;
const FOREST_LAST_YEAR = forestData.events[forestData.events.length - 1].year;

const FOREST_STILL = '/images/earth-forest-amazon.jpg';

function atForestYear(events: { year: number }[], year: number): number {
  return events.findIndex((e) => e.year === year);
}

function forestReading(view: ForestTick): string {
  return `${view.treeCoverPct.toFixed(3)}% tree cover · ${view.note} · ${view.quantizedHz} Hz (raw ${view.linearHz.toFixed(1)} Hz)`;
}

function explainForest(view: ForestTick, untouched: boolean): ReactNode {
  return (
    <section
      aria-label="Explain My Sound: Hear the Forest — Amazon Tree Cover"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Explain My Sound</h4>
      <p className="mt-1 font-mono text-sm text-atmos">
        {untouched
          ? 'Press Play — live values appear here as each note sounds.'
          : `Now playing: ${view.year} · ${forestReading(view)}`}
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer font-semibold text-atmos">
          Scientific Details
        </summary>
        <dl className="mt-3 space-y-3 text-sm text-slate-300">
          <div>
            <dt className="font-semibold text-atmos">The story</dt>
            <dd>
              The track peaks in 2011 (57.705%, its highest note) and
              dips to 54.496% in 2016, its lowest. It ends at 55.245% in
              2024 — 1.18 percentage points below 2001, a change in mean
              canopy cover, not a measure of deforested area.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">What you hear</dt>
            <dd>
              One {FOREST_NOTE_MS} ms sine note per year from{' '}
              {FOREST_FIRST_YEAR} to {FOREST_LAST_YEAR}. Pitch follows
              mean tree cover: sparser-canopy years sound low,
              denser-canopy years high.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">What it measures</dt>
            <dd>
              Mean Percent_Tree_Cover over the Brazilian Legal Amazon
              from NASA MODIS MOD44B Collection 6.1. In plain words: the
              average percent of each pixel covered by tree canopy,
              area-weighted over the Legal Amazon. It is NOT the share
              of the Amazon that is forest, and it is NOT a measure of
              clearing: a lower % means sparser estimated canopy.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The data</dt>
            <dd>
              Provided as terrasonica_modis_forest_2001_2024.csv:{' '}
              {forestData.events.length} authentic yearly values,
              area-weighted annual means at 2000 m analysis scale over
              the Brazilian Legal Amazon (IBGE 2024 boundary per the
              provider). Valid land area ~4.99M km², stable within 0.1%.
              Quality filtering: none documented in the supplied file —
              no quality columns and no export script were provided, so
              no quality claim is made. Nothing interpolated, nothing
              fabricated.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The mapping</dt>
            <dd className="font-mono text-[13px]">
              220 + (value − 54.496) / (57.705 − 54.496) × 440 → nearest
              E-minor note by log-frequency distance (ties up, clamped
              E3–B5).
            </dd>
            <dd className="mt-2">
              The data spans only 54.5%–57.7%, about 3 percentage
              points. Pitch is stretched so these small year-to-year
              differences are audible: the size of the pitch swing does
              not mean the forest changed by that much.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The visual</dt>
            <dd>
              Amazon rainforest, northern Brazil, MODIS Terra, 1 Jul
              2002. It is a single contextual still, not synchronized
              with the sound, while the sound covers 2001–2024 yearly
              (24 values). Frame and data share one sensor family
              (MODIS): this is a photographic-style view of the forest,
              not the Percent_Tree_Cover data product — the still shows
              one day in 2002 while the sound plays yearly means through
              2024.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">Limitations</dt>
            <dd>
              Only the verified mean cover drives the sound. Annual means
              smooth over short events, and one regional mean collapses
              local variation; the still shows one day of one year. The
              1.18-point 2001–2024 change is a change in mean canopy
              cover, not deforested area. See{' '}
              <span className="font-mono">docs/forest-mapping.md</span> for
              the full audit.
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

export function ForestTrackPanel() {
  const conductor = useMemo(() => new PlaybackConductor(), []);
  const forestEvents = forestData.events;
  const playerRef = useRef<ForestPlayer | null>(null);
  const tap = useCallback(
    () => playerRef.current?.getAnalyser() ?? null,
    [],
  );
  const controls = useTrackPlayer(
    forestEvents,
    (evts) => {
      const p = new ForestPlayer(evts);
      playerRef.current = p;
      return p;
    },
    conductor,
  );

  if (forestEvents.length !== 24) {
    return (
      <p className="text-red-300" role="alert">
        Track data failed validation
      </p>
    );
  }

  const forestRange = `${FOREST_FIRST_YEAR}–${FOREST_LAST_YEAR}`;

  return (
    <TrackCard<ForestEvent>
      anchorId="track-5"
      cardLabel="Track 5: Hear the Forest — Amazon Tree Cover"
      title="Track 5 · Hear the Forest — Amazon Tree Cover"
      dateRange={`${FOREST_FIRST_YEAR} – ${FOREST_LAST_YEAR}`}
      measurement="Mean tree cover over the Brazilian Legal Amazon · NASA MODIS"
      description="One note per year; sparser-canopy years sound low, denser years high."
      events={forestEvents}
      noteMs={FOREST_NOTE_MS}
      controls={controls}
      presets={[
        { label: 'Jump to 2011 (peak cover)', index: atForestYear(forestEvents, 2011) },
        {
          label: 'Jump to 2016 (lowest cover)',
          index: atForestYear(forestEvents, 2016),
        },
      ]}
      presetHeading="Scrub the timeline, or jump straight to a year"
      compare={{
        a: {
          label: '2001–2004',
          from: atForestYear(forestEvents, 2001),
          to: atForestYear(forestEvents, 2004),
        },
        b: {
          label: '2021–2024',
          from: atForestYear(forestEvents, 2021),
          to: atForestYear(forestEvents, 2024),
        },
      }}
      guidance="Listen as each year becomes a note. Years with sparser canopy sound low; years with denser canopy sound high."
      getTap={tap}
      stepUnit="year"
      bigFor={(v) => String(v.year)}
      idleBig={forestRange}
      idleSub="Press Play to hear twenty-four years of Amazon canopy."
      doneText={`Done — ${FOREST_FIRST_YEAR} to ${FOREST_LAST_YEAR}.`}
      tipFor={(e) => `${e.year} · ${e.treeCoverPct.toFixed(3)}%`}
      readingFor={(v) => forestReading(v)}
      scrubLabel="Scrub tree-cover timeline"
      progressLabel="Track 5 playback progress"
      sparkStart={String(FOREST_FIRST_YEAR)}
      sparkEnd={String(FOREST_LAST_YEAR)}
      sparkCaption="mean tree cover %"
      sparkDescription={`Annual mean tree cover over the Brazilian Legal Amazon, ${FOREST_FIRST_YEAR} to ${FOREST_LAST_YEAR}`}
      sparkUnit="%"
      visual={
        <figure className="mt-5">
          <img
            src={FOREST_STILL}
            alt="Amazon rainforest in northern Brazil, MODIS satellite image"
            loading="lazy"
            className="w-full rounded border border-slate-800"
          />
          <figcaption className="mt-1 font-mono text-xs text-slate-400">
            Amazon rainforest, northern Brazil, MODIS, 1 Jul 2002 ·
            contextual visual, not synchronized with the sound
          </figcaption>
        </figure>
      }
      explain={explainForest}
    />
  );
}
