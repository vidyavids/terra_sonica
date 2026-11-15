import { useCallback, useMemo, useRef } from 'react';
import { PlaybackConductor } from '../audio/conductor';
import { SKY_NOTE_MS, SkyPlayer } from '../audio/skyEngine';
import type { SkyTick } from '../audio/skyEngine';
import { useTrackPlayer } from '../hooks/useTrackPlayer';
import type { ReactNode } from 'react';
import skyData from '../data/nightlights-india.json';
import { TrackCard } from './PlayerSection';

type SkyEvent = (typeof skyData.events)[number];

const SKY_FIRST_YEAR = skyData.events[0].year;
const SKY_LAST_YEAR = skyData.events[skyData.events.length - 1].year;

const SKY_STILL = '/images/aether-night-lights-asia.jpg';

function atSkyYear(events: { year: number }[], year: number): number {
  return events.findIndex((e) => e.year === year);
}

function skyReading(view: SkyTick): string {
  return `${view.radianceC.toFixed(4)} nW/(cm²·sr) · ${view.note} · ${view.quantizedHz} Hz (raw ${view.linearHz.toFixed(1)} Hz)`;
}

function skyGrowthText(view: SkyTick): string | null {
  if (view.growthRate === null) return null;
  const sign = view.growthRate >= 0 ? '+' : '';
  return `Growth vs previous year: ${sign}${(view.growthRate * 100).toFixed(1)}%`;
}

function explainSky(view: SkyTick, untouched: boolean): ReactNode {
  const growthText = !untouched ? skyGrowthText(view) : null;
  return (
    <section
      aria-label="Explain My Sound: Hear the Lights — Earth at Night — India"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Explain My Sound</h4>
      <p className="mt-1 font-mono text-sm text-atmos">
        {untouched
          ? 'Press Play — live values appear here as each note sounds.'
          : `Now playing: ${view.year} · ${skyReading(view)}`}
      </p>
      {growthText && (
        <p className="mt-1 font-mono text-sm text-atmos">{growthText}</p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer font-semibold text-atmos">
          Scientific Details
        </summary>
        <dl className="mt-3 space-y-3 text-sm text-slate-300">
          <div>
            <dt className="font-semibold text-atmos">The story</dt>
            <dd>
              India brightens in almost every year of the track, with a
              small dip in 2020 (−3.9%, during the pandemic lockdowns)
              and the fastest growth in 2022 (+25.5%). 2025 is the
              brightest year, at two and a half times the 2013 level.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">What you hear</dt>
            <dd>
              One {SKY_NOTE_MS} ms sine note per year from {SKY_FIRST_YEAR} to{' '}
              {SKY_LAST_YEAR}. Pitch follows mean nighttime radiance:
              dimmer years sound low, brighter years high. A second voice
              a fifth above follows year-over-year growth — derived from
              the same values, not a second measurement.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">What it measures</dt>
            <dd>
              Nighttime radiance over India: light reaching the satellite
              sensor. It is NOT a direct measurement of electricity
              consumption or population; it is affected by illumination,
              sensor characteristics, atmosphere, seasonal conditions, and
              data processing.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The data</dt>
            <dd>
              NASA Black Marble VNP46A4, Collection 002, DOI
              10.5067/VIIRS/VNP46A4.002, Suomi NPP only, single collection
              across all 14 years. 2020 dips slightly (0.6051→0.5814),
              consistent with documented lockdown dimming. Nothing
              interpolated, nothing fabricated.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The mapping</dt>
            <dd className="font-mono text-[13px]">
              220 + (R − 0.4417) / (1.1153 − 0.4417) × 660 → nearest
              E-minor note by log-frequency distance (ties up, clamped
              E3–B5).
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">The visual</dt>
            <dd>
              Black Marble night lights over Asia, Apr–Oct 2012. It is a
              single contextual still, not synchronized with the sound,
              while the sound covers 2012–2025 yearly (14 values). Frame
              and data share one measurement: every glowing pixel here is
              nighttime radiance of the kind averaged into this track —
              the still shows one season of 2012, the track's first year,
              while the sound plays yearly means through 2025.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-atmos">Limitations</dt>
            <dd>
              Only the verified mean radiance drives the sound. Annual
              means smooth over short events, and one national mean
              collapses city-level variation; the still shows one season
              of one year. See{' '}
              <span className="font-mono">docs/sky-mapping.md</span> for
              the full audit.
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

export function SkyTrackPanel() {
  const conductor = useMemo(() => new PlaybackConductor(), []);
  const skyEvents = skyData.events;
  const playerRef = useRef<SkyPlayer | null>(null);
  const tap = useCallback(
    () => playerRef.current?.getAnalyser() ?? null,
    [],
  );
  const controls = useTrackPlayer(
    skyEvents,
    (evts) => {
      const p = new SkyPlayer(evts);
      playerRef.current = p;
      return p;
    },
    conductor,
  );

  if (skyEvents.length !== 14) {
    return (
      <p className="text-red-300" role="alert">
        Track data failed validation
      </p>
    );
  }

  const skyRange = `${SKY_FIRST_YEAR}–${SKY_LAST_YEAR}`;

  return (
    <TrackCard<SkyEvent>
      anchorId="track-4"
      cardLabel="Track 4: Hear the Lights — Earth at Night — India"
      title="Track 4 · Hear the Lights — Earth at Night — India"
      dateRange={`${SKY_FIRST_YEAR} – ${SKY_LAST_YEAR}`}
      measurement="Mean nighttime radiance over India · NASA Black Marble"
      description="One note per year; dimmer years sound low, brighter years high."
      events={skyEvents}
      noteMs={SKY_NOTE_MS}
      controls={controls}
      presets={[
        { label: 'Jump to 2013 (dimmest)', index: atSkyYear(skyEvents, 2013) },
        {
          label: 'Jump to 2025 (brightest)',
          index: atSkyYear(skyEvents, 2025),
        },
      ]}
      presetHeading="Scrub the timeline, or jump straight to a year"
      compare={{
        a: {
          label: '2012–2014',
          from: atSkyYear(skyEvents, 2012),
          to: atSkyYear(skyEvents, 2014),
        },
        b: {
          label: '2023–2025',
          from: atSkyYear(skyEvents, 2023),
          to: atSkyYear(skyEvents, 2025),
        },
      }}
      didYouHearThat={{
        body: 'Did You Hear That? Changes in the melody reflect changes in satellite-measured nighttime radiance over India. Higher notes represent brighter measured radiance.',
        actionLabel: 'Compare 2020 with 2025, without assuming what caused the change',
        action: {
          kind: 'compareRange',
          label: '2020–2025',
          from: atSkyYear(skyEvents, 2020),
          to: atSkyYear(skyEvents, 2025),
        },
      }}
      guidance="Listen as each year becomes a note. Dimmer years with fainter lights sound low; brighter years sound high."
      getTap={tap}
      stepUnit="year"
      bigFor={(v) => String(v.year)}
      idleBig={skyRange}
      idleSub="Press Play to hear fourteen years of city lights brighten."
      doneText={`Done — ${SKY_FIRST_YEAR} to ${SKY_LAST_YEAR}.`}
      tipFor={(e) => `${e.year} · ${e.radianceC.toFixed(4)} nW/(cm²·sr)`}
      readingFor={(v) => skyReading(v)}
      readingExtra={(v) => skyGrowthText(v)}
      scrubLabel="Scrub night-lights timeline"
      progressLabel="Track 4 playback progress"
      sparkStart={String(SKY_FIRST_YEAR)}
      sparkEnd={String(SKY_LAST_YEAR)}
      sparkCaption="mean radiance nW/(cm²·sr)"
      sparkDescription={`Annual mean nighttime radiance over India, ${SKY_FIRST_YEAR} to ${SKY_LAST_YEAR}`}
      sparkUnit="nW/(cm²·sr)"
      visual={
        <>
          <figure className="mt-5">
            <img
              src={SKY_STILL}
              alt="Asia and Australia at night, Black Marble composite of city lights"
              loading="lazy"
              className="w-full rounded border border-slate-800"
            />
            <figcaption className="mt-1 font-mono text-xs text-slate-400">
              NASA Black Marble Asia, 2012 · contextual visual, not
              synchronized with the sound
            </figcaption>
          </figure>
          <p className="mt-3 text-sm">
            <a
              href="https://svs.gsfc.nasa.gov/5475/"
              target="_blank"
              rel="noreferrer"
              className="text-atmos hover:text-cloud hover:underline"
            >
              Watch the NASA visualisation: Change in Night Lights,
              2012–2023 (SVS 5475) ↗
            </a>
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400">
            Covers 2012–2023 while the sound covers 2012–2025;
            contextual, not synchronized with the sound.
          </p>
        </>
      }
      explain={explainSky}
    />
  );
}
