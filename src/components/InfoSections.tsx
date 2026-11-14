import ninoData from '../data/nino34.json';
import tempData from '../data/global-temperature.json';

const PROJECT_SUMMARY =
  'Terra Sonica transforms NASA Earth observation data into interactive sound, allowing people to hear, explore, and understand our changing planet. By combining scientific sonification, paired visualizations, and accessible learning experiences, we aim to make Earth science more engaging, intuitive, and inclusive.';

const sectionClass = 'mx-auto max-w-5xl px-4 py-10';
const headingClass = 'text-2xl font-bold text-cloud';

export default function InfoSections() {
  return (
    <>
      <section id="project" aria-label="The Project" className={sectionClass}>
        <h2 className={headingClass}>The Project</h2>
        <p className="mt-3 max-w-3xl text-slate-300">{PROJECT_SUMMARY}</p>
      </section>

      <section
        id="how-it-works"
        aria-label="How It Works"
        className={sectionClass}
      >
        <h2 className={headingClass}>How It Works</h2>
        <ol className="mt-3 max-w-3xl list-decimal space-y-2 pl-5 text-slate-300">
          <li>
            <strong className="text-cloud">Measure.</strong> NASA missions
            and global observing networks record the planet — surface
            temperature fields, sea-surface temperatures, and more.
          </li>
          <li>
            <strong className="text-cloud">Map.</strong> Each validated
            observation becomes one musical note: warmer anomalies map to
            higher pitches on a shared scale, so change over time becomes
            melody.
          </li>
          <li>
            <strong className="text-cloud">Play.</strong> Press play on any
            track — or scrub the timeline and jump between contrast moments
            — and hear the whole record in about a minute.
          </li>
        </ol>
      </section>

      <section
        id="data-methods"
        aria-label="Data and Methods"
        className={sectionClass}
      >
        <h2 className={headingClass}>Data &amp; Methods</h2>
        <h3 className="mt-4 font-semibold text-cloud">
          Global Surface Temperature citation
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          {tempData.provenance.dataset} ({tempData.provenance.column},
          source {tempData.provenance.sourceFile}).{' '}
          {tempData.provenance.referencePeriod}
        </p>
        <p className="mt-1 max-w-3xl break-all font-mono text-xs text-slate-400">
          <a
            className="text-atmos hover:underline"
            href={tempData.provenance.sourceUrl}
          >
            {tempData.provenance.sourceUrl}
          </a>
        </p>
        <h3 className="mt-4 font-semibold text-cloud">El Niño citation</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          {ninoData.provenance.dataset}
        </p>
        <h3 className="mt-4 font-semibold text-cloud">Mapping formulas</h3>
        <p className="mt-1 font-mono text-[13px] text-slate-300">
          Track 1: f = 220 + ((T + 0.50) / 1.80) × 660, snapped to E natural
          minor.
        </p>
        <p className="mt-1 font-mono text-[13px] text-slate-300">
          Track 2: f = 220 + ((A + 1.5) / 4.0) × 660, A clamped to [−1.5,
          +2.5], then snapped to E natural minor.
        </p>
        <h3 className="mt-4 font-semibold text-cloud">Limitations</h3>
        <ul className="mt-1 max-w-3xl list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>
            Track 1 values are Lowess(5)-smoothed annual means, so brief
            spikes are softened relative to raw annual means.
          </li>
          <li>
            Track 2 sonifies the SST anomaly only; timbre and volume are
            not ocean colour or sea height.
          </li>
          <li>
            The SVS visual shows Jan 29–Oct 10, 2025 vs 2026 (verified on
            the SVS 5683 page, Nov 2026). It is contextual, not synchronized
            with the sound, which covers Jan 2020–Aug 2026 monthly (80
            months).
          </li>
          <li>
            Reference periods follow each dataset&apos;s methodology (
            {tempData.provenance.referencePeriod} /{' '}
            {ninoData.provenance.referencePeriod}).
          </li>
        </ul>
      </section>

      <section
        id="accessibility"
        aria-label="Accessibility"
        className={sectionClass}
      >
        <h2 className={headingClass}>Accessibility</h2>
        <ul className="mt-3 max-w-3xl list-disc space-y-1 pl-5 text-slate-300">
          <li>
            Every control is a native button, link, or slider: Tab to move,
            Enter or Space to activate, arrow keys on sliders.
          </li>
          <li>Focused controls show a visible cyan outline.</li>
          <li>
            Progress animation and smooth scrolling switch off when your
            system requests reduced motion.
          </li>
          <li>
            Every sounded value also appears as text, and every chart
            carries a text description.
          </li>
        </ul>
      </section>
    </>
  );
}
