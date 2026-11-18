import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlaybackConductor } from '../audio/conductor';
import type { PlaybackConductor as Conductor } from '../audio/conductor';
import { FOREST_NOTE_MS, ForestPlayer } from '../audio/forestEngine';
import type { ForestTick } from '../audio/forestEngine';
import { useTrackPlayer } from '../hooks/useTrackPlayer';
import type { TrackStatus } from '../hooks/useTrackPlayer';
import type { ReactNode } from 'react';
import forestData from '../data/forest-amazon.json';
import regionOverlays from '../data/region-overlays.json';
import { TrackCard } from './PlayerSection';
import type { WorldMapSpec } from './WorldMapVisual';
import { normalize01 } from '../utils/normalize';

type ForestEvent = (typeof forestData.events)[number];

const FOREST_FIRST_YEAR = forestData.events[0].year;
const FOREST_LAST_YEAR = forestData.events[forestData.events.length - 1].year;

const FOREST_STILL = '/images/earth-forest-amazon.jpg';

const FOREST_WORLD_MAP: WorldMapSpec = {
  kind: 'overlay',
  values01: normalize01(forestData.events.map((e) => e.treeCoverPct)),
  region: {
    viewW: regionOverlays.forest.view[0],
    viewH: regionOverlays.forest.view[1],
    paths: regionOverlays.forest.paths,
    labelX: regionOverlays.forest.label.x,
    labelY: regionOverlays.forest.label.y,
    labelPlace: regionOverlays.forest.label.place as 'above' | 'below',
    mobileX: regionOverlays.forest.labelMobile.x,
    mobileY: regionOverlays.forest.labelMobile.y,
    label: 'Brazilian Legal Amazon',
  },
  contextPaths: regionOverlays.forest.contextPaths,
  choropleth: { fill: '#36A886', min: 0.3, max: 0.95 },
  credit: 'Tree cover: MODIS MOD44B C6.1 annual means. Boundary: IBGE.',
};

function atForestYear(events: { year: number }[], year: number): number {
  return events.findIndex((e) => e.year === year);
}

function forestReading(view: ForestTick): string {
  return `${view.treeCoverPct.toFixed(3)}% tree cover · ${view.note} · ${view.quantizedHz} Hz (raw ${view.linearHz.toFixed(1)} Hz)`;
}

function explainForest(
  view: ForestTick,
  untouched: boolean,
  status: TrackStatus,
): ReactNode {
  return (
    <section
      aria-label="Explain My Sound: Hear the Forest — Amazon Tree Cover"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Explain My Sound</h4>
      <p className="mt-1 font-mono text-sm text-atmos">
        {untouched
          ? 'Press Play — live values appear here as each note sounds.'
          : status === 'playing'
            ? `Now playing: ${view.year} · ${forestReading(view)}`
            : status === 'paused'
              ? `Paused: ${view.year} · ${forestReading(view)}`
              : status === 'done'
                ? `Done — ${view.year} · ${forestReading(view)}`
                : `Selected: ${view.year} · ${forestReading(view)}`}
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
            <dd className="break-words">
              Provided as{' '}
              <a
                className="text-atmos hover:underline"
                href="https://github.com/vidyavids/terra_sonica/blob/main/data/terrasonica_modis_forest_2001_2024.csv"
                target="_blank"
                rel="noreferrer"
              >
                terrasonica_modis_forest_2001_2024.csv
              </a>
              : {forestData.events.length} authentic yearly values,
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
              Only the supplied mean cover drives the sound. Annual means
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

function ForestCompare({
  events,
  conductor,
}: {
  events: ForestEvent[];
  conductor: Conductor;
}) {
  const [aYear, setAYear] = useState(FOREST_FIRST_YEAR);
  const [bYear, setBYear] = useState(FOREST_LAST_YEAR);
  const evA = events.find((e) => e.year === aYear) ?? events[0];
  const evB = events.find((e) => e.year === bYear) ?? events[0];
  const diff = Math.abs(evA.treeCoverPct - evB.treeCoverPct);
  const direction =
    evB.treeCoverPct === evA.treeCoverPct
      ? 'the same measured mean tree cover'
      : evB.treeCoverPct < evA.treeCoverPct
        ? `${evB.year} is ${diff.toFixed(2)} pp below ${evA.year}`
        : `${evB.year} is ${diff.toFixed(2)} pp above ${evA.year}`;
  const playerRef = useRef<ForestPlayer | null>(null);
  useEffect(
    () =>
      conductor.register(() => {
        playerRef.current?.stop();
      }),
    [conductor],
  );
  useEffect(
    () => () => {
      playerRef.current?.stop();
    },
    [],
  );
  const listen = (evts: ForestEvent[]) => {
    void conductor.exclusive(async () => {
      await conductor.settle();
      const player = new ForestPlayer(evts);
      playerRef.current = player;
      await conductor.track(player.play(() => {}));
    });
  };
  const selectClass =
    'mt-1 block w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200';
  const buttonClass =
    'rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400';
  return (
    <section
      aria-label="Two-year comparison"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Compare two years</h4>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          First year (A)
          <select
            aria-label="First year"
            className={selectClass}
            value={aYear}
            onChange={(e) => setAYear(Number(e.target.value))}
          >
            {events.map((e) => (
              <option key={e.year} value={e.year}>
                {e.year}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Second year (B)
          <select
            aria-label="Second year"
            className={selectClass}
            value={bYear}
            onChange={(e) => setBYear(Number(e.target.value))}
          >
            {events.map((e) => (
              <option key={e.year} value={e.year}>
                {e.year}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 font-mono text-sm text-atmos">
        A · {evA.year} · {evA.treeCoverPct.toFixed(3)}% · {evA.note} ·{' '}
        {evA.quantizedHz} Hz (raw {evA.linearHz.toFixed(1)} Hz)
      </p>
      <p className="mt-1 font-mono text-sm text-atmos">
        B · {evB.year} · {evB.treeCoverPct.toFixed(3)}% · {evB.note} ·{' '}
        {evB.quantizedHz} Hz (raw {evB.linearHz.toFixed(1)} Hz)
      </p>
      <p className="mt-3 text-sm text-slate-200">
        Difference in measured mean tree cover: {diff.toFixed(2)} pp (
        {direction}).
      </p>
      <p className="mt-1 text-sm text-slate-300">
        The difference is a change in measured mean tree cover, NOT an
        estimate of deforested area.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => listen([evA])} className={buttonClass}>
          Listen to Year A
        </button>
        <button type="button" onClick={() => listen([evB])} className={buttonClass}>
          Listen to Year B
        </button>
        <button
          type="button"
          onClick={() => listen([evA, evB])}
          className={buttonClass}
        >
          Listen to the Difference
        </button>
      </div>
    </section>
  );
}

function ForestQuiz({ events, done }: { events: ForestEvent[]; done: boolean }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const shown = open || done;
  const ev2011 = events.find((e) => e.year === 2011) ?? events[0];
  const ev2016 = events.find((e) => e.year === 2016) ?? events[0];
  const diff = Math.abs(ev2011.treeCoverPct - ev2016.treeCoverPct);
  const buttonClass =
    'rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400';
  if (!shown) {
    return (
      <section
        aria-label="Listening check"
        className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
      >
        <h4 className="text-lg font-semibold text-cloud">Listening check</h4>
        <p className="mt-1 text-sm text-slate-300">
          A one-question listening check for learning, not a test. It
          appears after playback — or take it now.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${buttonClass} mt-3`}
        >
          Take the listening check
        </button>
      </section>
    );
  }
  return (
    <section
      aria-label="Listening check"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Listening check</h4>
      <p className="mt-1 text-sm text-slate-300">
        One question, for learning — not a test.
      </p>
      <p className="mt-3 text-sm text-slate-200">
        Which year had higher measured tree cover — 2011 or 2016?
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setPicked(2011)}
          className={buttonClass}
        >
          2011
        </button>
        <button
          type="button"
          onClick={() => setPicked(2016)}
          className={buttonClass}
        >
          2016
        </button>
      </div>
      {picked !== null && (
        <div className="mt-3">
          <p className="text-sm text-slate-200">
            {picked === 2011 ? 'Correct.' : 'Not quite.'} 2011 had higher
            measured tree cover.
          </p>
          <p className="mt-1 font-mono text-sm text-atmos">
            2011 · {ev2011.treeCoverPct.toFixed(3)}% · {ev2011.note} ·{' '}
            {ev2011.quantizedHz} Hz
          </p>
          <p className="mt-1 font-mono text-sm text-atmos">
            2016 · {ev2016.treeCoverPct.toFixed(3)}% · {ev2016.note} ·{' '}
            {ev2016.quantizedHz} Hz
          </p>
          <p className="mt-1 text-sm text-slate-200">
            Difference: {diff.toFixed(3)} percentage points of measured
            mean tree cover.
          </p>
        </div>
      )}
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
    <>
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
      didYouHearThat={{
        body: "The forest's voice follows its cover. 2011 had the highest mean tree cover (57.705%) and 2016 the lowest (54.496%). Listen to both years — the higher cover sounds higher.",
        actionLabel: 'Replay 2011 vs 2016',
        action: {
          kind: 'compareAB',
          a: {
            label: '2011',
            from: atForestYear(forestEvents, 2011),
            to: atForestYear(forestEvents, 2011),
          },
          b: {
            label: '2016',
            from: atForestYear(forestEvents, 2016),
            to: atForestYear(forestEvents, 2016),
          },
        },
      }}
      dataTable={{
        caption:
          'Each row is one sounded year. Denser canopy maps to higher pitches over a narrow 220–660 Hz span, snapped to E natural minor; pitch is stretched to keep small differences audible.',
        head: ['Year', 'Tree cover', 'Unit', 'Note', 'Frequency'],
        row: (e) => [
          String(e.year),
          e.treeCoverPct.toFixed(3),
          '%',
          e.note,
          `${e.quantizedHz} Hz`,
        ],
      }}
      tipFor={(e) => `${e.year} · ${e.treeCoverPct.toFixed(3)}%`}
      readingFor={(v) => forestReading(v)}
      scrubLabel="Scrub tree-cover timeline"
      progressLabel="Track 5 playback progress"
      sparkStart={String(FOREST_FIRST_YEAR)}
      sparkEnd={String(FOREST_LAST_YEAR)}
      sparkCaption="mean tree cover %"
      sparkDescription={`Annual mean tree cover over the Brazilian Legal Amazon, ${FOREST_FIRST_YEAR} to ${FOREST_LAST_YEAR}`}
      sparkUnit="%"
      worldMap={FOREST_WORLD_MAP}
      visual={
        <figure className="mt-5">
          <img
            src={FOREST_STILL}
            alt="Amazon rainforest in northern Brazil, MODIS satellite image"
            loading="lazy"
            className="w-full rounded border border-slate-800"
          />
          <figcaption className="mt-1 font-mono text-sm text-slate-300">
            Amazon rainforest, northern Brazil, MODIS, 1 Jul 2002 ·
            contextual visual, not synchronized with the sound
          </figcaption>
        </figure>
      }
      explain={explainForest}
    />
    <ForestCompare events={forestEvents} conductor={conductor} />
    <ForestQuiz events={forestEvents} done={controls.status === 'done'} />
    </>
  );
}
