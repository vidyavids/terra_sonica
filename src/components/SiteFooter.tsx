import fireData from '../data/fire-brazil.json';
import forestData from '../data/forest-amazon.json';
import ninoData from '../data/nino34.json';
import skyData from '../data/nightlights-india.json';
import tempData from '../data/global-temperature.json';

const IMAGE_CREDITS = [
  'Hero Earth. The Blue Marble (remastered), Apollo 17 photograph, 1972. Credit: NASA.',
  'AIR section. Hurricane Katrina, MODIS, 28 Aug 2005. Credit: NASA.',
  'EARTH section. Amazon rainforest, northern Brazil, MODIS, 1 Jul 2002. Credit: NASA Earth Observatory image by Jacques Descloitres, MODIS Land Rapid Response Team, NASA/GSFC.',
  'FIRE section. Fires in Greece, MODIS on Aqua, 22 Aug 2009; fire areas outlined in red, smoke plume over the Aegean Sea. Credit: NASA Earth Observatory image by Jeff Schmaltz, MODIS Rapid Response Team, NASA GSFC.',
  'AETHER section. Asia and Australia at night, Black Marble composite, Suomi NPP VIIRS, Apr–Oct 2012. Credit: NASA Earth Observatory image by Robert Simmon, using Suomi NPP VIIRS data courtesy of Chris Elvidge (NOAA National Geophysical Data Center).',
];

const REPO_DOCS = 'https://github.com/vidyavids/terra_sonica/blob/main/docs';

function MethodLink({ file }: { file: string }) {
  return (
    <a
      className="text-atmos hover:underline"
      href={`${REPO_DOCS}/${file}`}
      target="_blank"
      rel="noreferrer"
    >
      methods
    </a>
  );
}

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-4 font-mono text-xs text-slate-500">
        <div className="space-y-1">
          <p className="font-semibold text-slate-400">Data</p>
          <p>
            {tempData.provenance.dataset} · {tempData.provenance.sourceFile}{' '}
            (<MethodLink file="temperature-mapping.md" />)
          </p>
          <p>
            {ninoData.provenance.dataset} (<MethodLink file="nino34-mapping.md" />)
          </p>
          <p>{ninoData.provenance.visual}</p>
          <p>
            {fireData.provenance.dataset} (<MethodLink file="fire-mapping.md" />)
          </p>
          <p>
            {skyData.provenance.dataset} (<MethodLink file="sky-mapping.md" />)
          </p>
          <p>
            {forestData.provenance.dataset} (<MethodLink file="forest-mapping.md" />)
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-slate-400">Imagery</p>
          {IMAGE_CREDITS.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>
            WATER reuses the SVS 5683 still frame credited under Data, above.
          </p>
        </div>
        <p>Built for NASA Space Apps Challenge 2026 — Boston</p>
        <p>
          Built with Muse Code + Muse Spark. Original code is open source
          under the MIT License.
        </p>
      </div>
    </footer>
  );
}
