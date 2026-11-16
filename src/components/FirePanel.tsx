import { useCallback, useMemo, useRef } from 'react';
import { PlaybackConductor } from '../audio/conductor';
import { FIRE_NOTE_MS, FirePlayer } from '../audio/fireEngine';
import type { FireTick } from '../audio/fireEngine';
import { useTrackPlayer } from '../hooks/useTrackPlayer';
import type { TrackStatus } from '../hooks/useTrackPlayer';
import type { ReactNode } from 'react';
import fireData from '../data/fire-brazil.json';
import { TrackCard } from './PlayerSection';
import type { WorldMapSpec } from './WorldMapVisual';
import { normalize01 } from '../utils/normalize';

type FireEvent = (typeof fireData.events)[number];

const FIRE_FIRST_LABEL = fireData.events[0].label;
const FIRE_LAST_LABEL = fireData.events[fireData.events.length - 1].label;

const FIRE_STILL = '/images/fire-greece-modis.jpg';

const FIRE_WORLD_MAP: WorldMapSpec = {
  kind: 'overlay',
  baseSrc: '/images/hero-blue-marble.jpg',
  values01: normalize01(fireData.events.map((e) => e.count)),
  credit: 'The Blue Marble (Apollo 17, 1972). Credit: NASA.',
};

function atFireMonth(
  events: { year: number; month: number }[],
  year: number,
  month: number,
): number {
  return events.findIndex((e) => e.year === year && e.month === month);
}

function fireReading(view: FireTick): string {
  return `${view.count.toLocaleString('en-US')} detections · ${view.note} · ${view.quantizedHz} Hz (raw ${view.linearHz.toFixed(1)} Hz)`;
}

function fireFRPText(view: FireTick): string {
  return `Mean FRP: ${view.meanFRP_MW.toFixed(1)} MW`;
}

function explainFire(
  view: FireTick,
  untouched: boolean,
  status: TrackStatus,
): ReactNode {
  const frpText = !untouched ? fireFRPText(view) : null;
  return (
    <section
      aria-label="Explain My Sound: Hear the Fire — Brazil"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Explain My Sound</h4>
      <p className="mt-1 font-mono text-sm text-atmos">
        {untouched
          ? 'Press Play — live values appear here as each note sounds.'
          : status === 'playing'
            ? `Now playing: ${view.label} · ${fireReading(view)}`
            : status === 'paused'
              ? `Paused: ${view.label} · ${fireReading(view)}`
              : status === 'done'
                ? `Done — ${view.label} · ${fireReading(view)}`
                : `Selected: ${view.label} · ${fireReading(view)}`}
      </p>
      {frpText && (
        <p className="mt-1 font-mono text-sm text-atmos">{frpText}</p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer font-semibold text-atmos">
          Scientific Details
        </summary>
        <dl className="mt-3 space-y-3 text-sm text-slate-300">
          <div>
            <dt className="font-semibold text-atmos">The story</dt>
            <dd>
              2024 brings the two highest months in the data — 126,365
              detections in August and 164,682 in September — then the
              count falls to 2,914 by April 2025, the lowest month.
              Listen for the 2024 peak towering over the rest of the
              track.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">What you hear</dt>
            <dd>
              One {FIRE_NOTE_MS} ms sine note per month from {FIRE_FIRST_LABEL}{' '}
              to {FIRE_LAST_LABEL}. The main note is the monthly detection
              count: higher pitch means more MODIS active-fire detections.
              Under every note, a low fixed drone swells with the monthly
              mean FRP (how intensely they burned, in MW).
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">What it measures</dt>
            <dd>
              MODIS active-fire detections over Brazil, from NASA FIRMS
              (Terra and Aqua): satellite-detected thermal anomalies.
              Counts are detection observations, not unique wildfires and
              not area burned: burned area is a different product
              (MCD64A1). FRP is fire radiative power, a measure of
              radiant energy output — not burned area, not a wildfire
              count.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The data</dt>
            <dd>
              NASA FIRMS API, MODIS_SP monthly detections masked to the
              GADM Brazil boundary, {fireData.events.length} authentic
              monthly values. Nothing interpolated, nothing fabricated.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The mapping</dt>
            <dd className="font-mono text-[13px]">
              220 + (count − 2,914) / (164,682 − 2,914) × 660 → nearest
              E-minor note by log-frequency distance (ties up, clamped
              E3–B5). Drone gain: 0.03 + 0.09 × (FRP − 21.6736) /
              (63.2162 − 21.6736); fixed E3 (164.81 Hz).
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The visual</dt>
            <dd>
              Fires in Greece, MODIS on Aqua, Aug 2009. It is a single
              contextual still, not synchronized with the sound, while the
              sound covers Jan 2020–Dec 2025 monthly (72 months). Frame
              and data share one sensor: every red marker here is a MODIS
              active-fire detection of the kind counted into this track —
              the still shows Greece in 2009, while the sound counts
              Brazil from 2020 to 2025.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">Limitations</dt>
            <dd>
              Only verified observations drive the sound: counts set the
              pitch, mean FRP sets the drone&apos;s loudness. Burned area
              (MCD64A1) is a different product and is not sonified.
              Detection counts vary with cloud and smoke cover, and the
              Greece still shows a different place and day than the data.
              See <span className="font-mono">docs/fire-mapping.md</span> for
              the full audit.
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

export function FireTrackPanel() {
  const conductor = useMemo(() => new PlaybackConductor(), []);
  const fireEvents = fireData.events;
  const playerRef = useRef<FirePlayer | null>(null);
  const tap = useCallback(
    () => playerRef.current?.getAnalyser() ?? null,
    [],
  );
  const controls = useTrackPlayer(
    fireEvents,
    (evts) => {
      const p = new FirePlayer(evts);
      playerRef.current = p;
      return p;
    },
    conductor,
  );

  if (fireEvents.length !== 72) {
    return (
      <p className="text-red-300" role="alert">
        Track data failed validation
      </p>
    );
  }

  const fireRange = `${fireData.events[0].year}–${fireData.events[fireData.events.length - 1].year}`;

  return (
    <TrackCard<FireEvent>
      anchorId="track-3"
      cardLabel="Track 3: Hear the Fire — Brazil"
      title="Track 3 · Hear the Fire — Brazil"
      dateRange={`${FIRE_FIRST_LABEL} – ${FIRE_LAST_LABEL}`}
      measurement="Monthly MODIS active-fire detections · NASA FIRMS"
      description="One note per month; higher pitch means more MODIS active-fire detections across Brazil."
      events={fireEvents}
      noteMs={FIRE_NOTE_MS}
      controls={controls}
      presets={[
        {
          label: 'Jump to the quietest month',
          index: atFireMonth(fireEvents, 2025, 4),
        },
        {
          label: 'Jump to the peak fire month',
          index: atFireMonth(fireEvents, 2024, 9),
        },
      ]}
      presetHeading="Scrub the timeline, or jump straight to a contrast moment"
      compare={{
        a: {
          label: 'Wet months 2025',
          from: atFireMonth(fireEvents, 2025, 1),
          to: atFireMonth(fireEvents, 2025, 4),
        },
        b: {
          label: 'Peak season 2024',
          from: atFireMonth(fireEvents, 2024, 7),
          to: atFireMonth(fireEvents, 2024, 10),
        },
      }}
      didYouHearThat={{
        body: 'Did You Hear That? Higher notes represent more satellite-detected active-fire observations. Listen for the peaks during periods of increased fire activity.',
        actionLabel: 'Jump to the September 2024 detection peak',
        action: { kind: 'jump', index: atFireMonth(fireEvents, 2024, 9) },
      }}
      guidance="Listen as each month becomes a note. Higher pitch means more MODIS active-fire detections."
      getTap={tap}
      stepUnit="month"
      bigFor={(v) => v.label}
      idleBig={fireRange}
      idleSub="Press Play to hear six fire seasons play out month by month."
      doneText={`Done — ${FIRE_FIRST_LABEL} to ${FIRE_LAST_LABEL}.`}
      dataTable={{
        caption:
          'Each row is one sounded month. More detections map to higher pitches, 220–880 Hz snapped to E natural minor.',
        head: ['Month', 'Detections', 'Unit', 'Note', 'Frequency'],
        row: (e) => [
          e.label,
          e.count.toLocaleString('en-US'),
          'detections',
          e.note,
          `${e.quantizedHz} Hz`,
        ],
      }}
      tipFor={(e) => `${e.label} · ${e.count.toLocaleString('en-US')} detections`}
      readingFor={(v) => fireReading(v)}
      readingExtra={(v) => fireFRPText(v)}
      scrubLabel="Scrub fire timeline"
      progressLabel="Track 3 playback progress"
      sparkStart={FIRE_FIRST_LABEL}
      sparkEnd={FIRE_LAST_LABEL}
      sparkCaption="detections per month"
      sparkDescription={`Monthly MODIS active-fire detections, ${FIRE_FIRST_LABEL} to ${FIRE_LAST_LABEL}`}
      sparkUnit="detections"
      worldMap={FIRE_WORLD_MAP}
      visual={
        <>
          <figure className="mt-5">
            <img
              src={FIRE_STILL}
              alt="Fires in Greece with a smoke plume over the Aegean Sea, MODIS satellite image"
              loading="lazy"
              className="w-full rounded border border-slate-800"
            />
            <figcaption className="mt-1 font-mono text-sm text-slate-300">
              NASA MODIS Greece fires, Aug 2009 · contextual visual, not
              synchronized with the sound
            </figcaption>
          </figure>
          <p className="mt-3 text-sm">
            <a
              href="https://svs.gsfc.nasa.gov/10831/"
              target="_blank"
              rel="noreferrer"
              className="text-atmos hover:text-cloud hover:underline"
            >
              Watch the NASA visualisation: The Geography of Fire (SVS
              10831) ↗
            </a>
          </p>
          <p className="mt-1 font-mono text-sm text-slate-300">
            A global MODIS fire tour from 2002–2011 — earlier years than
            this track (2020–2025), shown for context. Opens in a new tab,
            not synchronized with the sound.
          </p>
        </>
      }
      explain={explainFire}
    />
  );
}
