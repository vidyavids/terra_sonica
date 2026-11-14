import { useMemo } from 'react';
import { PlaybackConductor } from './audio/conductor';
import { NOTE_MS, TemperaturePlayer } from './audio/temperatureEngine';
import { NINO_NOTE_MS, NinoPlayer } from './audio/ninoEngine';
import { useTrackPlayer } from './hooks/useTrackPlayer';
import tempData from './data/global-temperature.json';
import ninoData from './data/nino34.json';

const NINO_VIDEO =
  '/media/elnino_2026_ssta_avw_ssha_1010_nolabels_1080p60.mp4';
const NINO_STILL =
  '/media/elnino_2026_ssta_avw_ssha_1010_nolabels.02200_preview.jpg';

const T1_PRESETS = [
  { label: '1910s', year: 1910 },
  { label: '2020s', year: 2020 },
];
const T2_PRESETS = [
  { label: 'La Niña 2021', year: 2021, month: 2 },
  { label: 'El Niño 2023', year: 2023, month: 7 },
];

function Sparkline({
  values,
  activeIndex,
  startLabel,
  endLabel,
  caption,
  description,
}: {
  values: number[];
  activeIndex: number | null;
  startLabel: string;
  endLabel: string;
  caption: string;
  description: string;
}) {
  const geom = useMemo(() => {
    const w = 600;
    const h = 120;
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
          stroke="#22d3ee"
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

function formatAnomaly(a: number): string {
  return `${a >= 0 ? '+' : ''}${a.toFixed(2)} °C`;
}

export default function App() {
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

  const t1Valid = tempEvents.length === 146;
  const t2Valid = ninoEvents.length === 80;
  const t1Seconds = Math.round((tempEvents.length * NOTE_MS) / 1000);
  const t2Seconds = Math.round((ninoEvents.length * NINO_NOTE_MS) / 1000);

  if (!t1Valid || !t2Valid) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-red-300">
          Track data failed validation
        </h1>
        <p className="mt-2 font-mono text-sm text-slate-300">
          {!t1Valid &&
            `Track 1: expected 146 events, found ${tempEvents.length}. `}
          {!t2Valid &&
            `Track 2: expected 80 events, found ${ninoEvents.length}. `}
          Regenerate with the scripts/validate_*.py validators.
        </p>
      </main>
    );
  }

  const t1PresetIndex = (year: number) =>
    tempEvents.findIndex((e) => e.year === year);
  const t2PresetIndex = (year: number, month: number) =>
    ninoEvents.findIndex((e) => e.year === year && e.month === month);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header>
        <p className="text-sm text-cyan-300">
          NASA Space Apps Challenge 2026 · The Earth Information Jukebox
        </p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-white">
          Terra Sonica
        </h1>
        <p className="mt-2 text-slate-300">
          Authentic Earth observations, converted to sound. Two tracks: a
          warming century and an El Niño cycle.
        </p>
      </header>

      <section
        aria-label="Track 1: Global Temperature"
        className="mt-8 rounded-lg border border-slate-800 bg-slate-900/60 p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-white">
            Track 1 · Global Temperature, 1880–2025
          </h2>
          <p className="font-mono text-xs text-slate-400">
            {tempEvents.length} notes · about {t1Seconds} seconds
          </p>
        </div>

        <p
          className="mt-4 font-mono text-5xl font-bold text-cyan-300"
          aria-live="polite"
        >
          {t1.untouched ? '1880–2025' : t1.view.year}
        </p>
        <p className="mt-1 font-mono text-sm text-slate-300">
          {t1.untouched
            ? 'Press Play to hear 146 years of warming.'
            : `${formatAnomaly(t1.view.anomalyC)} · ${t1.view.note} · ${t1.view.quantizedHz} Hz (raw ${t1.view.linearHz.toFixed(1)} Hz)`}
        </p>

        <div
          className="mt-4 h-2 w-full overflow-hidden rounded bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(t1.view.progress * 100)}
          aria-label="Track 1 playback progress"
        >
          <div
            className="ts-progress h-full bg-cyan-400 transition-[width]"
            style={{ width: `${t1.view.progress * 100}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={t1.play}
            disabled={t1.status === 'playing'}
            className="rounded bg-cyan-400 px-6 py-2 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
          >
            {t1.status === 'done'
              ? '▶ Play again'
              : t1.status === 'paused'
                ? '▶ Resume'
                : '▶ Play'}
          </button>
          <button
            type="button"
            onClick={t1.pause}
            disabled={t1.status !== 'playing'}
            className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
          >
            ❚❚ Pause
          </button>
          <button
            type="button"
            onClick={t1.replay}
            disabled={t1.status === 'playing'}
            className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
          >
            ↺ Replay
          </button>
          <button
            type="button"
            onClick={t1.stop}
            disabled={t1.status !== 'playing' && t1.status !== 'paused'}
            className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
          >
            ■ Stop
          </button>
        </div>
        {t1.status === 'done' && (
          <p className="mt-3 text-sm text-slate-300">Done — 1880 to 2025.</p>
        )}

        <div className="mt-4">
          <p className="mb-1 text-xs text-slate-400">
            Scrub the timeline, or jump straight to a decade
          </p>
          <input
            type="range"
            min={0}
            max={tempEvents.length - 1}
            value={t1.view.index}
            onChange={(e) => t1.scrub(Number(e.target.value))}
            className="w-full accent-cyan-400"
            aria-label="Scrub Global Temperature timeline"
          />
          <div className="mt-2 flex gap-2">
            {T1_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => t1.scrub(t1PresetIndex(p.year))}
                className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold text-cyan-200 hover:border-cyan-400"
              >
                Jump to the {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Sparkline
            values={tempEvents.map((e) => e.anomalyC)}
            activeIndex={t1.untouched ? null : t1.view.index}
            startLabel="1880"
            endLabel="2025"
            caption="anomaly °C, dashed line = 0"
            description="Annual temperature anomaly, 1880 to 2025"
          />
        </div>
      </section>

      <section
        aria-label="Explain My Sound: Global Temperature"
        className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-5"
      >
        <h2 className="text-lg font-semibold text-white">Explain My Sound</h2>
        <dl className="mt-3 space-y-3 text-sm text-slate-300">
          <div>
            <dt className="font-semibold text-cyan-200">What you hear</dt>
            <dd>
              One 400 ms sine note per year from 1880 to 2025. Pitch rises as
              the planet warms: colder years sound low, hotter years high.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cyan-200">The data</dt>
            <dd>
              NASA GISTEMP Global Mean Estimates based on Land and Ocean Data,
              official Lowess(5) series ({tempData.provenance.column}, source{' '}
              {tempData.provenance.sourceFile}). {tempEvents.length} authentic
              yearly values, 1951–1980 reference period. Nothing interpolated,
              nothing fabricated.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cyan-200">The mapping</dt>
            <dd className="font-mono text-[13px]">
              220 + (anomaly + 0.50) / 1.80 × 660 → nearest E-minor note by
              log-frequency distance (ties up, clamped E3–B5).
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cyan-200">What it is not</dt>
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

      <section
        aria-label="Track 2: El Niño"
        className="mt-8 rounded-lg border border-slate-800 bg-slate-900/60 p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-white">
            Track 2 · El Niño, Jan 2020 – Aug 2026
          </h2>
          <p className="font-mono text-xs text-slate-400">
            {ninoEvents.length} notes · about {t2Seconds} seconds
          </p>
        </div>

        <p
          className="mt-4 font-mono text-5xl font-bold text-cyan-300"
          aria-live="polite"
        >
          {t2.untouched ? '2020–2026' : t2.view.label}
        </p>
        <p className="mt-1 font-mono text-sm text-slate-300">
          {t2.untouched
            ? 'Press Play to hear six and a half years of El Niño and La Niña.'
            : `${formatAnomaly(t2.view.anomalyC)} · ${t2.view.note} · ${t2.view.quantizedHz} Hz (raw ${t2.view.linearHz.toFixed(1)} Hz)`}
        </p>

        <div
          className="mt-4 h-2 w-full overflow-hidden rounded bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(t2.view.progress * 100)}
          aria-label="Track 2 playback progress"
        >
          <div
            className="ts-progress h-full bg-cyan-400 transition-[width]"
            style={{ width: `${t2.view.progress * 100}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={t2.play}
            disabled={t2.status === 'playing'}
            className="rounded bg-cyan-400 px-6 py-2 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
          >
            {t2.status === 'done'
              ? '▶ Play again'
              : t2.status === 'paused'
                ? '▶ Resume'
                : '▶ Play'}
          </button>
          <button
            type="button"
            onClick={t2.pause}
            disabled={t2.status !== 'playing'}
            className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
          >
            ❚❚ Pause
          </button>
          <button
            type="button"
            onClick={t2.replay}
            disabled={t2.status === 'playing'}
            className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
          >
            ↺ Replay
          </button>
          <button
            type="button"
            onClick={t2.stop}
            disabled={t2.status !== 'playing' && t2.status !== 'paused'}
            className="rounded border border-slate-600 px-6 py-2 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
          >
            ■ Stop
          </button>
        </div>
        {t2.status === 'done' && (
          <p className="mt-3 text-sm text-slate-300">
            Done — Jan 2020 to Aug 2026.
          </p>
        )}

        <div className="mt-4">
          <p className="mb-1 text-xs text-slate-400">
            Scrub the timeline, or jump straight to a contrast moment
          </p>
          <input
            type="range"
            min={0}
            max={ninoEvents.length - 1}
            value={t2.view.index}
            onChange={(e) => t2.scrub(Number(e.target.value))}
            className="w-full accent-cyan-400"
            aria-label="Scrub El Niño timeline"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {T2_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => t2.scrub(t2PresetIndex(p.year, p.month))}
                className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold text-cyan-200 hover:border-cyan-400"
              >
                Jump to {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Sparkline
            values={ninoEvents.map((e) => e.anomalyC)}
            activeIndex={t2.untouched ? null : t2.view.index}
            startLabel="Jan 2020"
            endLabel="Aug 2026"
            caption="anomaly °C, dashed line = 0"
            description="Monthly Niño 3.4 SST anomaly, Jan 2020 to Aug 2026"
          />
        </div>

        <figure className="mt-5">
          <img
            src={NINO_STILL}
            alt="Still frame from NASA SVS 5683 showing tropical Pacific conditions in 2025 versus 2026"
            className="w-full rounded border border-slate-800"
          />
          <figcaption className="mt-1 font-mono text-xs text-slate-400">
            NASA SVS 5683 · contextual visual, not synchronized with the sound
          </figcaption>
        </figure>

        <div className="mt-4">
          <p className="mb-1 text-xs text-slate-400">
            Watch the NASA animation (20 s) — covers Jan–Oct 2026 only, plays
            independently of the track
          </p>
          <video
            className="w-full rounded border border-slate-800"
            controls
            preload="none"
            poster={NINO_STILL}
            aria-label="NASA SVS 5683 animation comparing tropical Pacific conditions in 2025 and 2026. Contextual visual, not synchronized with the sound."
          >
            <source src={NINO_VIDEO} type="video/mp4" />
          </video>
        </div>
      </section>

      <section
        aria-label="Explain My Sound: El Niño"
        className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-5"
      >
        <h2 className="text-lg font-semibold text-white">Explain My Sound</h2>
        <dl className="mt-3 space-y-3 text-sm text-slate-300">
          <div>
            <dt className="font-semibold text-cyan-200">What you hear</dt>
            <dd>
              One 500 ms sine note per month from Jan 2020 to Aug 2026.
              Pitch follows the Niño 3.4 SST anomaly: cool La Niña months
              sound low, warm El Niño months high.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cyan-200">The data</dt>
            <dd>
              {ninoData.provenance.dataset} {ninoEvents.length} authentic
              monthly values, {ninoData.provenance.referencePeriod} Nothing
              interpolated, nothing fabricated.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cyan-200">The mapping</dt>
            <dd className="font-mono text-[13px]">
              clamp(A, −1.5, +2.5); 220 + (A + 1.5) / 4.0 × 660 → nearest
              E-minor note by log-frequency distance (ties up, clamped
              E3–B5).
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cyan-200">The visual</dt>
            <dd>
              {ninoData.provenance.visual} It shows{' '}
              {ninoData.provenance.visualCoverage} while the sound covers{' '}
              {ninoData.provenance.soundCoverage} The visual is context, not
              synchronization.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-cyan-200">Limitations</dt>
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

      <footer className="mt-6 space-y-1 font-mono text-xs text-slate-500">
        <p>
          {tempData.provenance.dataset} · {tempData.provenance.sourceFile}
        </p>
        <p>{ninoData.provenance.dataset}</p>
        <p>{ninoData.provenance.visual}</p>
      </footer>
    </main>
  );
}
