import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { TrackStatus } from '../hooks/useTrackPlayer';

export interface WorldMapFramesSpec {
  kind: 'frames';
  /** Frame image URL for an event index. */
  frameSrc: (index: number) => string;
  count: number;
  /** Optional outlined region + label drawn over the frames. */
  region?: RegionOverlay;
  credit: string;
}

export interface RegionOverlay {
  /** Base-image pixel dimensions; the SVG paths use this viewBox. */
  viewW: number;
  viewH: number;
  /** SVG path data in base-image pixels. */
  paths: string[];
  /** Label anchor as percent of the displayed (cropped) map box. */
  labelX: number;
  labelY: number;
  labelPlace: 'above' | 'below';
  /** Small-screen anchor: raised clear of the Play button and strip. */
  mobileX: number;
  mobileY: number;
  label: string;
}

export interface Choropleth {
  /** Fill color for the region paths. */
  fill: string;
  /** Fill opacity range across the normalized data value. */
  min: number;
  max: number;
}

export interface WorldMapOverlaySpec {
  kind: 'overlay';
  /** Base photo; absent for choropleth mode (black + vector context). */
  baseSrc?: string;
  /** Per-event normalized data value, 0..1, driving the overlay. */
  values01: number[];
  /** Outlined data region + label drawn over the base. */
  region: RegionOverlay;
  /** Dim geographic context paths (same viewBox as region). */
  contextPaths?: string[];
  /** When set, the region fills with the data value instead of amber wash. */
  choropleth?: Choropleth;
  credit: string;
}

export type WorldMapSpec = WorldMapFramesSpec | WorldMapOverlaySpec;

const PRELOAD_AHEAD = 10;
const PRELOAD_CACHE_MAX = 40;
/** Base-image brightness range across the normalized data value. */
const BRIGHTNESS_MIN = 0.45;
const BRIGHTNESS_MAX = 1.35;

/** Outlined region + label layer shared by frames and overlay modes. */
function RegionLayer({
  region,
  contextPaths,
  fill,
  fillOpacity,
  isDesktop,
}: {
  region: RegionOverlay;
  contextPaths?: string[];
  fill?: string;
  fillOpacity?: number;
  isDesktop: boolean;
}) {
  return (
    <>
      <svg
        viewBox={`0 0 ${region.viewW} ${region.viewH}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {contextPaths?.map((d, i) => (
          <path
            key={`c${i}`}
            d={d}
            fill="none"
            stroke="#475569"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            opacity={0.9}
          />
        ))}
        {fill !== undefined &&
          region.paths.map((d, i) => (
            <path
              key={`f${i}`}
              d={d}
              fill={fill}
              stroke="none"
              className="transition-opacity duration-500 motion-reduce:transition-none"
              style={{ opacity: fillOpacity }}
            />
          ))}
        {region.paths.map((d, i) => (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="#050D1B"
              strokeWidth={6}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              opacity={0.85}
            />
            <path
              d={d}
              fill="none"
              stroke="#56C7F5"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>
      <div
        className="pointer-events-none absolute whitespace-nowrap rounded bg-abyss/70 px-1.5 py-0.5 font-mono text-[10px] text-cloud md:text-xs"
        style={{
          left: `${isDesktop ? region.labelX : region.mobileX}%`,
          top: `${isDesktop ? region.labelY : region.mobileY}%`,
          transform:
            region.labelPlace === 'above' || !isDesktop
              ? 'translate(-50%, calc(-100% - 6px))'
              : 'translate(-50%, 6px)',
        }}
      >
        {region.label}
      </div>
    </>
  );
}

interface WorldMapVisualProps {
  spec: WorldMapSpec;
  /** Currently sounded/selected event index. */
  viewIndex: number;
  status: TrackStatus;
  /** Increments on every stop; the map resets to the first frame on stop. */
  stopCount: number;
  /** Chart + waveform strip overlaid along the map's bottom edge. */
  overlay?: ReactNode;
  /** Play/pause the track; the stage button mirrors the transport control. */
  onPlayPause: () => void;
}

/**
 * Decorative data-driven world map shown inside the shared player. The Air
 * track steps through real NASA SVS 5450 anomaly-map frames; other tracks
 * show the real NASA Blue Marble with a warm overlay whose opacity follows
 * the track's normalized data value. Driven purely by player state, so it
 * stays in sync with the sounded note and the playhead: pause holds the
 * frame, seek/jump moves it, stop resets it to the first frame. The map,
 * heading, strip, and credit are decorative (aria-hidden); the centered
 * Play/Pause button is the exposed control that mirrors transport state.
 */
export default function WorldMapVisual({
  spec,
  viewIndex,
  status,
  stopCount,
  overlay,
  onPlayPause,
}: WorldMapVisualProps) {
  const count = spec.kind === 'frames' ? spec.count : spec.values01.length;
  // Pin to the first frame after a stop (stop leaves the sounded position
  // in place) until the position moves; resuming playback unpins via status.
  const [prevPos, setPrevPos] = useState({ stopCount, viewIndex });
  const [stopPin, setStopPin] = useState(false);
  if (
    prevPos.stopCount !== stopCount ||
    prevPos.viewIndex !== viewIndex
  ) {
    setPrevPos({ stopCount, viewIndex });
    setStopPin(
      prevPos.stopCount !== stopCount && prevPos.viewIndex === viewIndex,
    );
  }
  const index =
    stopPin && status === 'idle'
      ? 0
      : Math.min(count - 1, Math.max(0, viewIndex));

  const frameSrc = spec.kind === 'frames' ? spec.frameSrc(index) : null;
  const [[shown, prev], setShown] = useState<[string | null, string | null]>([
    frameSrc,
    null,
  ]);
  if (frameSrc !== shown) setShown([frameSrc, shown]);

  const preloadCache = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => {
    if (spec.kind !== 'frames') return;
    for (let k = 0; k < PRELOAD_AHEAD; k++) {
      const src = spec.frameSrc(Math.min(index + k, spec.count - 1));
      if (!preloadCache.current.has(src)) {
        const img = new Image();
        img.src = src;
        preloadCache.current.set(src, img);
      }
    }
    while (preloadCache.current.size > PRELOAD_CACHE_MAX) {
      const oldest = preloadCache.current.keys().next();
      if (oldest.done) break;
      preloadCache.current.delete(oldest.value);
    }
  }, [index, spec]);

  const brightness =
    spec.kind === 'overlay'
      ? BRIGHTNESS_MIN + (BRIGHTNESS_MAX - BRIGHTNESS_MIN) * spec.values01[index]
      : 1;
  const playing = status === 'playing';
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <div className="mt-5 w-full rounded-lg border border-slate-800 bg-slate-900/40 p-5">
      <p aria-hidden="true" className="font-semibold text-atmos">
        World Map Visual
      </p>
      {/* The bottom padding extends the stage below the map so the overlaid
          strip straddles the map's bottom edge instead of covering it, and so
          the overlay always fits inside the stage (no clipping) at any width.
          Taller on small screens, where the strip is tall relative to the map. */}
      <div className="relative mt-3 pb-40 md:pb-24">
        <div className="relative">
          <div
            aria-hidden="true"
            className="relative w-full overflow-hidden rounded border border-slate-800"
          >
            {spec.kind === 'frames' ? (
              <>
                {prev && (
                  <img
                    src={prev}
                    alt=""
                    draggable={false}
                    decoding="async"
                    className="block h-auto w-full"
                  />
                )}
                {shown && (
                  <img
                    key={shown}
                    src={shown}
                    alt=""
                    draggable={false}
                    decoding="async"
                    className="ts-map-frame block h-auto w-full data-[stacked]:absolute data-[stacked]:inset-0"
                    data-stacked={prev && prev !== shown ? true : undefined}
                  />
                )}
                {spec.region && (
                  <RegionLayer region={spec.region} isDesktop={isDesktop} />
                )}
              </>
            ) : (
              <>
                {spec.baseSrc ? (
                  <img
                    src={spec.baseSrc}
                    alt=""
                    draggable={false}
                    decoding="async"
                    className="block aspect-video w-full object-cover transition-[filter] duration-500 motion-reduce:transition-none"
                    style={{ filter: `brightness(${brightness})` }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="block aspect-video w-full bg-black"
                  />
                )}
                <RegionLayer
                  region={spec.region}
                  contextPaths={spec.contextPaths}
                  fill={spec.choropleth?.fill}
                  fillOpacity={
                    spec.choropleth
                      ? spec.choropleth.min +
                        (spec.choropleth.max - spec.choropleth.min) *
                          spec.values01[index]
                      : undefined
                  }
                  isDesktop={isDesktop}
                />
              </>
            )}
          </div>
          <button
            type="button"
            data-stage="play-pause"
            onClick={onPlayPause}
            aria-label={playing ? 'Pause' : 'Play'}
            className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-atmos/60 bg-abyss/70 text-xl text-atmos shadow-[0_0_24px_rgba(86,199,245,0.35)] hover:border-atmos hover:brightness-110 md:h-16 md:w-16 md:text-2xl"
          >
            <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
          </button>
        </div>
        {overlay && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 bg-abyss/70 px-3 pb-3"
          >
            {overlay}
          </div>
        )}
      </div>
      <p
        aria-hidden="true"
        className="mt-2 font-mono text-xs text-slate-400"
      >
        {spec.credit}
      </p>
    </div>
  );
}
