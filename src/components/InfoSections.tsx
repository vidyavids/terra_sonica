import fireData from '../data/fire-brazil.json';
import ninoData from '../data/nino34.json';
import skyData from '../data/nightlights-india.json';
import tempData from '../data/global-temperature.json';

const PROJECT_SUMMARY =
  'Terra Sonica transforms Earth observation data into interactive sound, allowing people to hear, explore, and understand our changing planet. By combining scientific sonification, paired visualizations, and accessible learning experiences, we aim to make Earth science more engaging, intuitive, and inclusive.';

const sectionClass = 'mx-auto max-w-7xl px-4 py-10';
const headingClass = 'text-2xl font-bold text-cloud';
const REPO_DOCS = 'https://github.com/vidyavids/terra_sonica/blob/main/docs';

function DocLink({ file, children }: { file: string; children: string }) {
  return (
    <a
      className="text-atmos hover:underline"
      href={`${REPO_DOCS}/${file}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

function ProviderLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      className="text-atmos hover:underline"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

export default function InfoSections() {
  const tempEvents = tempData.events;
  const ninoEvents = ninoData.events;
  const fireEvents = fireData.events;
  const skyEvents = skyData.events;
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
            observation becomes one musical note: higher data values map
            to higher pitches on a shared scale (each track documents
            its own mapping below), so change over time becomes melody.
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
        <h3 className="mt-8 border-t border-slate-800/60 pt-4 font-semibold text-cloud">
          Global Surface Temperature citation
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-300 md:text-base">
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
        <h3 className="mt-8 border-t border-slate-800/60 pt-4 font-semibold text-cloud">El Niño citation</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-300 md:text-base">
          {ninoData.provenance.dataset}
        </p>
        <h3 className="mt-8 border-t border-slate-800/60 pt-4 font-semibold text-cloud">Mapping formulas</h3>
        <p className="mt-1 font-mono text-[13px] text-slate-300 md:text-sm">
          Track 1: f = 220 + ((T + 0.50) / 1.80) × 660, snapped to E natural
          minor.
        </p>
        <p className="mt-1 font-mono text-[13px] text-slate-300 md:text-sm">
          Track 2: f = 220 + ((A + 1.5) / 4.0) × 660, A clamped to [−1.5,
          +2.5], then snapped to E natural minor.
        </p>
        <h3 className="mt-8 border-t border-slate-800/60 pt-4 font-semibold text-cloud">
          Track sources and methods
        </h3>
        <div className="mt-2 max-w-3xl space-y-5 text-sm text-slate-300">
          <div>
            <h4 className="font-semibold text-cloud">
              Track 1 · Global Surface Temperature
            </h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Provider:{' '}
                <ProviderLink href="https://data.giss.nasa.gov/gistemp/">
                  NASA GISS
                </ProviderLink>
                . Product: GISTEMP Global Mean Estimates, Lowess(5) annual
                means.
              </li>
              <li>
                Range: {tempEvents[0].year}–
                {tempEvents[tempEvents.length - 1].year} (146 yearly
                values). Region: global land + ocean combined. Units: °C
                anomaly ({tempData.provenance.referencePeriod}).
              </li>
              <li>
                Input snapshot: {tempData.provenance.sourceFile} (146
                values, no exclusions).
              </li>
              <li>Aggregation: annual Lowess(5) smoothed means as published.</li>
              <li>
                Sound mapping: each year one note; higher pitch = warmer
                anomaly; 220–880 Hz, E natural minor.{' '}
                <DocLink file="temperature-mapping.md">Mapping audit</DocLink>.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-cloud">Track 2 · El Niño</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Provider: NOAA ERSSTv6 via McNoldy (Univ. of Miami),{' '}
                <ProviderLink href="https://bmcnoldy.earth.miami.edu/tropics/oni/ONI_NINO34_v6.txt">
                  ONI_NINO34_v6.txt
                </ProviderLink>
                . Product: monthly NINO34_ANOM column.
              </li>
              <li>
                Range: {ninoEvents[0].label} –{' '}
                {ninoEvents[ninoEvents.length - 1].label} (80 values).
                Region: Niño 3.4 (5°S–5°N, 170°W–120°W). Units: °C anomaly
                ({ninoData.provenance.referencePeriod}).
              </li>
              <li>
                Input snapshot: {ninoData.provenance.sourceFile} as
                retrieved Nov 2026, sha256{' '}
                {ninoData.provenance.inputSha256.slice(0, 12)}… (full hash
                in the dataset file).
              </li>
              <li>Aggregation: none — monthly values as published.</li>
              <li>
                Sound mapping: each month one note; higher pitch = warmer
                SST anomaly; 220–880 Hz, E natural minor.{' '}
                <DocLink file="nino34-mapping.md">Mapping audit</DocLink>.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-cloud">
              Track 3 · Hear the Fire — Brazil
            </h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Provider:{' '}
                <ProviderLink href="https://firms.modaps.eosdis.nasa.gov/">
                  NASA FIRMS
                </ProviderLink>
                . Product: MODIS_SP monthly detections (Terra + Aqua).
              </li>
              <li>
                Range: {fireEvents[0].label} –{' '}
                {fireEvents[fireEvents.length - 1].label} (72 months).
                Region: Brazil (GADM 4.1 level-0). Units: detection
                counts/month; drone layer uses mean FRP in MW.
              </li>
              <li>
                Input snapshot: FIRMS area API over the Brazil bbox (fetch
                log, Nov 2026); FRP refetch cross-checked to identical
                counts.
              </li>
              <li>
                Aggregation: monthly counts of GADM-masked detections; FRP
                layer uses monthly means.
              </li>
              <li>
                Sound mapping: each month one note; higher pitch = more
                detections; 220–880 Hz, E natural minor; FRP drone gain
                0.03–0.12.{' '}
                <DocLink file="fire-mapping.md">Mapping audit</DocLink>.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-cloud">
              Track 4 · Hear the Lights — India
            </h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Provider: NASA Black Marble (LAADS DAAC). Product: VNP46A4
                Collection 002, NearNadir_Composite_Snow_Free, Suomi NPP.{' '}
                <ProviderLink href="https://doi.org/10.5067/VIIRS/VNP46A4.002">
                  DOI 10.5067/VIIRS/VNP46A4.002
                </ProviderLink>
                .
              </li>
              <li>
                Range: {skyEvents[0].year}–{skyEvents[skyEvents.length - 1].year}{' '}
                yearly (14 values). Region: India (GADM 4.1 level-0).
                Units: nW/(cm²·sr) mean radiance.
              </li>
              <li>
                Input snapshot: 154 C002 granules via manifest (Nov 2026).
              </li>
              <li>
                Aggregation: pooled arithmetic mean over valid land
                pixels; dark pixels kept.
              </li>
              <li>
                Sound mapping: each year one note; higher pitch = brighter
                mean radiance; 220–880 Hz, E natural minor; growth fifth
                gain follows year-over-year growth.{' '}
                <DocLink file="sky-mapping.md">Mapping audit</DocLink>.
              </li>
            </ul>
          </div>
        </div>
        <h3 className="mt-8 border-t border-slate-800/60 pt-4 font-semibold text-cloud">Limitations</h3>
        <ul className="mt-1 max-w-3xl list-disc space-y-1 pl-5 text-sm text-slate-300 md:text-base">
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
            values).
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
