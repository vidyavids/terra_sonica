import { useId, useMemo, useState } from 'react';
import { PlaybackConductor } from '../audio/conductor';
import type { TrackEventBase } from '../audio/conductor';
import { NOTE_MS, TemperaturePlayer } from '../audio/temperatureEngine';
import { NINO_NOTE_MS, NinoPlayer } from '../audio/ninoEngine';
import { useTrackPlayer } from '../hooks/useTrackPlayer';
import type { TrackControls } from '../hooks/useTrackPlayer';
import type { ReactNode } from 'react';
import ninoData from '../data/nino34.json';
import tempData from '../data/global-temperature.json';

function formatAnomaly(a: number): string {
  return `${a >= 0 ? '+' : ''}${a.toFixed(2)} °C`;
}

function formatReading(e: TrackEventBase): string {
  return `${formatAnomaly(e.anomalyC)} · ${e.note} · ${e.quantizedHz} Hz (raw ${e.linearHz.toFixed(1)} Hz)`;
}

interface SparklineProps {
  values: number[];
  activeIndex: number | null;
  startLabel: string;
  endLabel: string;
  caption: string;
  description: string;
}

function Sparkline({
  values,
  activeIndex,
  startLabel,
  endLabel,
  caption,
  description,
}: SparklineProps) {
  const gid = useId().replace(/[^a-zA-Z0-9-_]/g, '');
  const geom = useMemo(() => {
    const w = 600;
    const h = 150;
    const pad = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const x = (i: number) => pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = (v: number) =>
      h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
    const points = values
      .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ');
    return { w, h, min, max, x, y, points };
  }, [values]);

  return (
    <>
      <svg
        viewBox={`0 0 ${geom.w} ${geom.h}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${description}, ranging from ${geom.min.toFixed(2)} to ${geom.max.toFixed(2)} degrees C`}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1264A3" />
            <stop offset="1" stopColor="#E9A45B" />
          </linearGradient>
        </defs>
        <line
          x1={0}
          x2={geom.w}
          y1={geom.y(0)}
          y2={geom.y(0)}
          stroke="#334155"
          strokeDasharray="4 4"
        />
        <polyline
          points={geom.points}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={1.5}
        />
        {activeIndex !== null && (
          <line
            x1={geom.x(activeIndex)}
            x2={geom.x(activeIndex)}
            y1={0}
            y2={geom.h}
            stroke="#f472b6"
            strokeWidth={1.5}
          />
        )}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-xs text-slate-400">
        <span>{startLabel}</span>
        <span>{caption}</span>
        <span>{endLabel}</span>
      </div>
    </>
  );
}

interface ScrubberProps<TEvent extends TrackEventBase> {
  events: TEvent[];
  viewIndex: number;
  scrub: (index: number) => void;
  tipFor: (ev: TEvent) => string;
  ariaLabel: string;
}

function Scrubber<TEvent extends TrackEventBase>({
  events,
  viewIndex,
  scrub,
  tipFor,
  ariaLabel,
}: ScrubberProps<TEvent>) {
  const [tip, setTip] = useState<number | null>(null);
  const shown = tip ?? viewIndex;
  const pct =
    events.length > 1 ? (shown / (events.length - 1)) * 100 : 0;
  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      {tip !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 rounded bg-slate-800 px-2 py-1 font-mono text-xs text-cloud"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        >
          {tipFor(events[shown])}
        </div>
      )}
      <input
        type="range"
        min={0}
        max={events.length - 1}
        value={viewIndex}
        onChange={(e) => {
          const i = Number(e.target.value);
          scrub(i);
          setTip(i);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const frac = Math.min(
            1,
            Math.max(0, (e.clientX - rect.left) / rect.width),
          );
          setTip(Math.round(frac * (events.length - 1)));
        }}
        onFocus={() => setTip(viewIndex)}
        onBlur={() => setTip(null)}
        className="w-full accent-atmos"
        aria-label={ariaLabel}
      />
    </div>
  );
}

interface Preset {
  label: string;
  index: number;
}

type TickView<TEvent extends TrackEventBase> = TEvent & {
  index: number;
  progress: number;
};

interface TrackCardProps<TEvent extends TrackEventBase> {
  anchorId: string;
  cardLabel: string;
  title: string;
  dateRange: string;
  description: string;
  measurement: string;
  events: TEvent[];
  noteMs: number;
  controls: TrackControls<TEvent>;
  presets: Preset[];
  presetHeading: string;
  contrastHeading?: string;
  contrast?: Preset[];
  stepUnit: string;
  bigFor: (view: TickView<TEvent>) => string;
  idleBig: string;
  idleSub: string;
  doneText: string;
  tipFor: (ev: TEvent) => string;
  scrubLabel: string;
  progressLabel: string;
  sparkStart: string;
  sparkEnd: string;
  sparkCaption: string;
  sparkDescription: string;
  visual?: ReactNode;
  explain: (view: TickView<TEvent>, untouched: boolean) => ReactNode;
}

function TrackCard<TEvent extends TrackEventBase>(
  props: TrackCardProps<TEvent>,
) {
  const { controls, events } = props;
  const totalSeconds = Math.round((events.length * props.noteMs) / 1000);
  const view = controls.view;
  return (
    <section
      id={props.anchorId}
      aria-label={props.cardLabel}
      className="rounded-lg border border-atmos/20 bg-slate-900/40 p-5 shadow-[0_0_18px_rgba(86,199,245,0.10)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-semibold text-cloud">
          {props.title}, {props.dateRange}
        </h3>
        <p className="font-mono text-xs text-slate-400">
          {events.length} notes · about {totalSeconds} seconds
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-300">{props.description}</p>
      <p className="mt-1 font-mono text-xs text-atmos">{props.measurement}</p>

      <p
        className="mt-4 font-mono text-5xl font-bold text-atmos"
        aria-live="polite"
      >
        {controls.untouched ? props.idleBig : props.bigFor(view)}
      </p>
      <p className="mt-1 font-mono text-sm text-slate-300">
        {controls.untouched ? props.idleSub : formatReading(view)}
      </p>

      <div
        className="mt-4 h-2 w-full overflow-hidden rounded bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(view.progress * 100)}
        aria-label={props.progressLabel}
      >
        <div
          className="ts-progress h-full bg-atmos transition-[width]"
          style={{ width: `${view.progress * 100}%` }}
        />
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3 md:pt-6">
          <Sparkline
            values={events.map((e) => e.anomalyC)}
            activeIndex={controls.untouched ? null : view.index}
            startLabel={props.sparkStart}
            endLabel={props.sparkEnd}
            caption={props.sparkCaption}
            description={props.sparkDescription}
          />
        </div>
        <div className="md:col-span-2">
          {props.explain(view, controls.untouched)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={controls.play}
          disabled={controls.status === 'playing'}
          className="rounded bg-atmos px-6 py-2 font-semibold text-slate-950 hover:brightness-110 disabled:opacity-40"
        >
          {controls.status === 'done'
            ? '▶ Play again'
            : controls.status === 'paused'
              ? '▶ Resume'
              : '▶ Play'}
        </button>
        <button
          type="button"
          onClick={controls.pause}
          disabled={controls.status !== 'playing'}
          className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
        >
          ❚❚ Pause
        </button>
        <button
          type="button"
          onClick={controls.replay}
          disabled={controls.status === 'playing'}
          className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
        >
          ↺ Replay
        </button>
        <button
          type="button"
          onClick={controls.stop}
          disabled={
            controls.status !== 'playing' && controls.status !== 'paused'
          }
          className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
        >
          ■ Stop
        </button>
        <span
          className="flex gap-2"
          role="group"
          aria-label={`Step one ${props.stepUnit}`}
        >
          <button
            type="button"
            onClick={() => controls.scrub(view.index - 1)}
            disabled={view.index === 0}
            aria-label={`Previous ${props.stepUnit}`}
            className="rounded border border-slate-700 px-3 py-2 text-sm font-semibold text-atmos hover:border-atmos disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={() => controls.scrub(view.index + 1)}
            disabled={view.index === events.length - 1}
            aria-label={`Next ${props.stepUnit}`}
            className="rounded border border-slate-700 px-3 py-2 text-sm font-semibold text-atmos hover:border-atmos disabled:opacity-40"
          >
            Next ›
          </button>
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs text-slate-400">{props.presetHeading}</p>
        <Scrubber
          events={events}
          viewIndex={view.index}
          scrub={controls.scrub}
          tipFor={props.tipFor}
          ariaLabel={props.scrubLabel}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {props.presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => controls.scrub(p.index)}
              className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold text-atmos hover:border-atmos"
            >
              {p.label}
            </button>
          ))}
        </div>
        {props.contrast && props.contrastHeading && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">
              {props.contrastHeading}
            </span>
            {props.contrast.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => controls.scrub(p.index)}
                className="rounded border border-amber/60 px-3 py-1 text-xs font-semibold text-amber hover:border-amber"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {props.visual}
    </section>
  );
}

type TempEvent = (typeof tempData.events)[number];
type NinoEvent = (typeof ninoData.events)[number];

const TEMP_FIRST_YEAR = tempData.events[0].year;
const TEMP_LAST_YEAR = tempData.events[tempData.events.length - 1].year;
const NINO_FIRST_LABEL = ninoData.events[0].label;
const NINO_LAST_LABEL = ninoData.events[ninoData.events.length - 1].label;

const NINO_STILL =
  '/media/elnino_2026_ssta_avw_ssha_1010_nolabels.02200_preview.jpg';

function explainTemperature(
  view: TickView<TempEvent>,
  untouched: boolean,
): ReactNode {
  return (
    <section
      aria-label="Explain My Sound: Global Surface Temperature"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Explain My Sound</h4>
      <p className="mt-1 font-mono text-sm text-atmos" aria-live="polite">
        {untouched
          ? 'Press Play — live values appear here as each note sounds.'
          : `Now playing: ${view.year} · ${formatReading(view)}`}
      </p>
      <dl className="mt-3 space-y-3 text-sm text-slate-300">
        <div>
          <dt className="font-semibold text-atmos">What you hear</dt>
          <dd>
            One {NOTE_MS} ms sine note per year from {TEMP_FIRST_YEAR} to{' '}
            {TEMP_LAST_YEAR}. Pitch rises as the planet warms: colder years
            sound low, hotter years high.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">What it measures</dt>
          <dd>
            Global Surface Temperature uses NASA GISTEMP&apos;s combined
            land–ocean surface temperature anomalies, not direct atmospheric
            temperature measurements.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">The data</dt>
          <dd>
            NASA GISTEMP Global Mean Estimates based on Land and Ocean Data,
            official Lowess(5) series ({tempData.provenance.column}, source{' '}
            {tempData.provenance.sourceFile}). {tempData.events.length}{' '}
            authentic yearly values, {tempData.provenance.referencePeriod}{' '}
            Nothing interpolated, nothing fabricated.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">The mapping</dt>
          <dd className="font-mono text-[13px]">
            220 + (anomaly + 0.50) / 1.80 × 660 → nearest E-minor note by
            log-frequency distance (ties up, clamped E3–B5).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">What it is not</dt>
          <dd>
            Not raw annual means: these values are the official Lowess(5)
            smoothing, so brief spikes are softened; the graph.txt
            No_Smoothing column carries the unsmoothed means. See{' '}
            <span className="font-mono">docs/temperature-mapping.md</span>{' '}
            for the full audit.
          </dd>
        </div>
      </dl>
    </section>
  );
}

function explainNino(
  view: TickView<NinoEvent>,
  untouched: boolean,
): ReactNode {
  return (
    <section
      aria-label="Explain My Sound: El Niño"
      className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <h4 className="text-lg font-semibold text-cloud">Explain My Sound</h4>
      <p className="mt-1 font-mono text-sm text-atmos" aria-live="polite">
        {untouched
          ? 'Press Play — live values appear here as each note sounds.'
          : `Now playing: ${view.label} · ${formatReading(view)}`}
      </p>
      <dl className="mt-3 space-y-3 text-sm text-slate-300">
        <div>
          <dt className="font-semibold text-atmos">What you hear</dt>
          <dd>
            One {NINO_NOTE_MS} ms sine note per month from {NINO_FIRST_LABEL}{' '}
            to {NINO_LAST_LABEL}. Pitch follows the Niño 3.4 SST anomaly:
            cool La Niña months sound low, warm El Niño months high.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">The data</dt>
          <dd>
            {ninoData.provenance.dataset} {ninoData.events.length} authentic
            monthly values, {ninoData.provenance.referencePeriod} Nothing
            interpolated, nothing fabricated.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">The mapping</dt>
          <dd className="font-mono text-[13px]">
            clamp(A, −1.5, +2.5); 220 + (A + 1.5) / 4.0 × 660 → nearest
            E-minor note by log-frequency distance (ties up, clamped
            E3–B5).
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">The visual</dt>
          <dd>
            {ninoData.provenance.visual} It shows{' '}
            {ninoData.provenance.visualCoverage} while the sound covers{' '}
            {ninoData.provenance.soundCoverage} The visual is context, not
            synchronization.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-atmos">Limitations</dt>
          <dd>
            Only the verified SST anomaly drives the sound. Timbre and
            volume are not ocean colour or sea height: the SVS visual
            also shows apparent visible wavelength and sea surface height
            anomaly, but those products are not sonified. See{' '}
            <span className="font-mono">docs/nino34-mapping.md</span> for
            the full audit.
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default function PlayerSection() {
  const conductor = useMemo(() => new PlaybackConductor(), []);
  const tempEvents = tempData.events;
  const ninoEvents = ninoData.events;
  const t1 = useTrackPlayer(
    tempEvents,
    (evts) => new TemperaturePlayer(evts),
    conductor,
  );
  const t2 = useTrackPlayer(
    ninoEvents,
    (evts) => new NinoPlayer(evts),
    conductor,
  );

  if (tempEvents.length !== 146 || ninoEvents.length !== 80) {
    return (
      <section
        id="player"
        aria-label="The Earth Jukebox"
        className="mx-auto max-w-5xl px-4 py-10"
      >
        <h2 className="text-2xl font-bold text-red-300">
          Track data failed validation
        </h2>
      </section>
    );
  }

  const tempRange = `${TEMP_FIRST_YEAR}–${TEMP_LAST_YEAR}`;
  const ninoRange = `${ninoEvents[0].year}–${ninoEvents[ninoEvents.length - 1].year}`;
  const atTempYear = (year: number) =>
    tempEvents.findIndex((e) => e.year === year);
  const atNinoMonth = (year: number, month: number) =>
    ninoEvents.findIndex((e) => e.year === year && e.month === month);

  return (
    <section
      id="player"
      aria-label="The Earth Jukebox"
      className="mx-auto max-w-5xl px-4 py-10"
    >
      <h2 className="text-2xl font-bold text-cloud">The Earth Jukebox</h2>
      <div className="mt-6 space-y-8">
        <TrackCard<TempEvent>
          anchorId="track-1"
          cardLabel="Track 1: Global Surface Temperature"
          title="Track 1 · Global Surface Temperature"
          dateRange={tempRange}
          measurement="Combined land–ocean surface temperature anomaly · NASA GISTEMP"
          description="One note per year; pitch rises as the planet warms."
          events={tempEvents}
          noteMs={NOTE_MS}
          controls={t1}
          presets={[
            { label: 'Jump to the 1910s', index: atTempYear(1910) },
            { label: 'Jump to the 2020s', index: atTempYear(2020) },
          ]}
          presetHeading="Scrub the timeline, or jump straight to a decade"
          contrastHeading="Contrast:"
          contrast={[
            { label: 'Early 1900s (cooler)', index: atTempYear(1900) },
            { label: '2020s (hotter)', index: atTempYear(2020) },
          ]}
          stepUnit="year"
          bigFor={(v) => String(v.year)}
          idleBig={tempRange}
          idleSub={`Press Play to hear ${tempEvents.length} years of warming.`}
          doneText={`Done — ${TEMP_FIRST_YEAR} to ${TEMP_LAST_YEAR}.`}
          tipFor={(e) => `${e.year} · ${formatAnomaly(e.anomalyC)}`}
          scrubLabel="Scrub Global Surface Temperature timeline"
          progressLabel="Track 1 playback progress"
          sparkStart={String(TEMP_FIRST_YEAR)}
          sparkEnd={String(TEMP_LAST_YEAR)}
          sparkCaption="anomaly °C, dashed line = 0"
          sparkDescription={`Annual temperature anomaly, ${tempRange}`}
          explain={explainTemperature}
        />
        <TrackCard<NinoEvent>
          anchorId="track-2"
          cardLabel="Track 2: El Niño"
          title="Track 2 · El Niño"
          dateRange={`${NINO_FIRST_LABEL} – ${NINO_LAST_LABEL}`}
          measurement="Niño 3.4 sea-surface temperature anomaly · NOAA ERSSTv6"
          description="One note per month; cool La Niña months sound low, warm El Niño months high."
          events={ninoEvents}
          noteMs={NINO_NOTE_MS}
          controls={t2}
          presets={[
            { label: 'Jump to La Niña 2021', index: atNinoMonth(2021, 2) },
            { label: 'Jump to El Niño 2023', index: atNinoMonth(2023, 7) },
          ]}
          presetHeading="Scrub the timeline, or jump straight to a contrast moment"
          stepUnit="month"
          bigFor={(v) => v.label}
          idleBig={ninoRange}
          idleSub="Press Play to hear El Niño and La Niña play out month by month."
          doneText={`Done — ${NINO_FIRST_LABEL} to ${NINO_LAST_LABEL}.`}
          tipFor={(e) => `${e.label} · ${formatAnomaly(e.anomalyC)}`}
          scrubLabel="Scrub El Niño timeline"
          progressLabel="Track 2 playback progress"
          sparkStart={NINO_FIRST_LABEL}
          sparkEnd={NINO_LAST_LABEL}
          sparkCaption="anomaly °C, dashed line = 0"
          sparkDescription={`Monthly Niño 3.4 SST anomaly, ${NINO_FIRST_LABEL} to ${NINO_LAST_LABEL}`}
          visual={
            <figure className="mt-5">
              <img
                src={NINO_STILL}
                alt="Still frame from NASA SVS 5683 showing tropical Pacific conditions in 2025 versus 2026"
                loading="lazy"
                className="w-full rounded border border-slate-800"
              />
              <figcaption className="mt-1 font-mono text-xs text-slate-400">
                NASA SVS 5683 · contextual visual, not synchronized with the
                sound
              </figcaption>
            </figure>
          }
          explain={explainNino}
        />
      </div>
    </section>
  );
}
