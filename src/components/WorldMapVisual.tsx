import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { TrackStatus } from '../hooks/useTrackPlayer';

export interface MapLegend {
  min: string;
  max: string;
  unit: string;
}

export interface WorldMapFramesSpec {
  kind: 'frames';
  /** Frame image URL for an event index. */
  frameSrc: (index: number) => string;
  count: number;
  /** Optional outlined region + label drawn over the frames. */
  region?: RegionOverlay;
  /** Optional color-scale legend chip (bottom-left of the map). */
  legend?: MapLegend;
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
  /** Fill color at the minimum data value (pale end). */
  from: string;
  /** Fill color at the maximum data value (deep end). */
  to: string;
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
/** SSTA legend gradient; stops match render_ssta.py RAMP at ±SCALE. */
const SSTA_GRADIENT =
  'linear-gradient(to right, #2166AC 0%, #ABD0E6 25%, #E8F1F8 43.3%, #F7F7F7 50%, #F6E3C5 56.7%, #FDBB84 75%, #B2182B 100%)';

/** Lerp two #rrggbb colors by t in [0, 1]. */
function mixHex(from: string, to: string, t: number): string {
  const c0 = [1, 3, 5].map((i) => parseInt(from.slice(i, i + 2), 16));
  const c1 = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  const c = c0.map((v, i) => Math.round(v + (c1[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Outlined region + label layer shared by frames and overlay modes. */
function RegionLayer({
  region,
  contextPaths,
  fill,
  isDesktop,
}: {
  region: RegionOverlay;
  contextPaths?: string[];
  fill?: string;
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
              className="transition-colors duration-500 motion-reduce:transition-none"
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
  /** Play/pause the track; the stage button mirrors the transport control. */
  onPlayPause: () => void;
}

/**
 * Decorative data-driven world map shown inside the shared player. Driven
 * purely by player state, so it stays in sync with the sounded note and the
 * playhead: pause holds the frame, seek/jump moves it, stop resets it to
 * the first frame. The map, heading, legend, and credit are decorative
 * (aria-hidden); the centered Play/Pause button is the exposed control
 * that mirrors transport state.
 */
export default function WorldMapVisual({
  spec,
  viewIndex,
  status,
  onPlayPause,
}: WorldMapVisualProps) {
  const count = spec.kind === 'frames' ? spec.count : spec.values01.length;
  const index = Math.min(count - 1, Math.max(0, viewIndex));

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
      <div className="relative mt-3">
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
                {spec.legend && (
                  <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-abyss/70 px-2 py-1 font-mono text-[10px] text-cloud md:text-xs">
                    <span>{spec.legend.min}</span>
                    <span
                      className="block h-2.5 w-20 rounded-sm md:w-28"
                      style={{ background: SSTA_GRADIENT }}
                    />
                    <span>
                      {spec.legend.max} {spec.legend.unit}
                    </span>
                  </div>
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
                  fill={
                    spec.choropleth
                      ? mixHex(
                          spec.choropleth.from,
                          spec.choropleth.to,
                          spec.values01[index],
                        )
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
