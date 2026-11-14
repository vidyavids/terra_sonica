# Terra Sonica

A NASA Space Apps Challenge 2026 entry for **The Earth Information Jukebox**:
a polished, scientifically traceable jukebox that converts authentic Earth
observations into sound.

Two tracks, both with timeline scrubbing: Track 1, Global Surface Temperature
1880–2025 — 146 year-aligned notes from the official NASA GISTEMP
Lowess(5) series; Track 2, El Niño Jan 2020–Aug 2026 — 80 monthly notes
from the verified Niño 3.4 SST anomaly series, shown with the NASA SVS
5683 contextual visual. Web Audio engines ported from the tested
prototype pattern; no backend.

## Quickstart

```powershell
npm install
npm run dev      # open the printed local URL in a browser
npm run build    # typecheck + production build
python scripts/validate_temperature.py   # re-audit Track 1, regenerate JSON
python scripts/validate_nino34.py        # re-derive Track 2 CSV/JSON
```

No backend. Native Web Audio API only.

## Layout

- `Lowess_Land Data.html`, `frequencies.js`, `land and ocean.csv` — original
  prototype files, preserved byte-identical (git root commit).
- `Global_Mean_Estimates_graph.txt` — official GISTEMP Lowess(5) series (track source).
- `GLB.Ts+dSST.csv` — NASA GISTEMP v4 download, kept as cross-check reference.
- `scripts/validate_temperature.py` — audit + JSON finalization (stdlib only).
- `src/data/global-temperature.json` — prepared 146-event dataset (generated).
- `src/audio/temperatureEngine.ts` — plain-TypeScript player, no React.
- `docs/temperature-mapping.md` — exact mapping, quantization, and audit notes.
- `ONI_NINO34_v6.txt` → `nino34-monthly-2020-2026.csv` — Niño 3.4 source
  and derived 80-month artifact (see `scripts/validate_nino34.py`,
  `src/data/nino34.json`, `src/audio/ninoEngine.ts`,
  `docs/nino34-mapping.md`).
- `public/media/` — SVS 5683 still (see
  `scripts/download_svs_media.py`).
- `src/audio/conductor.ts`, `src/hooks/useTrackPlayer.ts` — shared
  no-overlap playback coordinator and scrub state (engines untouched).
- `src/hooks/useComparisonPlayback.ts` + `src/components/AudioVisualizer.tsx`
  — ranged A/B comparisons and the passive analyser waveform (UI layer;
  engines only expose the read-only tap).
- `src/components/` — page shell (Nav, Hero, Experiences, PlayerSection,
  InfoSections, SiteFooter). Styling and layout only; playback logic lives
  in the frozen `src/audio/` + `src/hooks/` modules.
- `public/images/` — web-sized skin images (see Image credits below).
- `to build/` — approved brief, mockups, credits, and full-size image
  originals (reference material, not shipped).

## Image credits

Skin images (originals in `to build/`, web-sized copies in
`public/images/`):

- Hero Earth. The Blue Marble (remastered), Apollo 17 photograph, 1972.
  Credit: NASA.
- AIR section. Hurricane Katrina, MODIS, 28 Aug 2005. Credit: NASA.
- EARTH section. Amazon rainforest, northern Brazil, MODIS, 1 Jul 2002.
  Credit: NASA Earth Observatory image by Jacques Descloitres, MODIS Land
  Rapid Response Team, NASA/GSFC.
- FIRE section. Fires in Greece, MODIS on Aqua, 22 Aug 2009; fire areas
  outlined in red, smoke plume over the Aegean Sea. Credit: NASA Earth
  Observatory image by Jeff Schmaltz, MODIS Rapid Response Team, NASA GSFC.
- AETHER section. Asia and Australia at night, Black Marble composite,
  Suomi NPP VIIRS, Apr–Oct 2012. Credit: NASA Earth Observatory image by
  Robert Simmon, using Suomi NPP VIIRS data courtesy of Chris Elvidge
  (NOAA National Geophysical Data Center).
- WATER reuses the SVS 5683 still frame (`public/media/`).
- Nav logo. NASA insignia (meatball) from NASA SVS static media
  (svs.gsfc.nasa.gov). Credit: NASA.

Scope note: the brief's volume slider was dropped — a master gain would
require touching the frozen audio engines.
