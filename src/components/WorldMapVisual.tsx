import { useEffect, useRef, useState } from 'react';
import type { TrackStatus } from '../hooks/useTrackPlayer';

export interface WorldMapFramesSpec {
  kind: 'frames';
  /** Frame image URL for an event index. */
  frameSrc: (index: number) => string;
  count: number;
  credit: string;
}

export interface WorldMapOverlaySpec {
  kind: 'overlay';
  baseSrc: string;
  /** Per-event normalized data value, 0..1, driving the warm overlay. */
  values01: number[];
  credit: string;
}

export type WorldMapSpec = WorldMapFramesSpec | WorldMapOverlaySpec;

const PRELOAD_AHEAD = 10;
const PRELOAD_CACHE_MAX = 40;
/** Warm-overlay opacity at the maximum data value; minimum stays clear. */
const OVERLAY_MAX_OPACITY = 0.6;

interface WorldMapVisualProps {
  spec: WorldMapSpec;
  /** Currently sounded/selected event index. */
  viewIndex: number;
  status: TrackStatus;
  /** Increments on every stop; the map resets to the first frame on stop. */
  stopCount: number;
}

/**
 * Decorative data-driven world map shown inside the shared player. The Air
 * track steps through real NASA SVS 5450 anomaly-map frames; other tracks
 * show the real NASA Blue Marble with a warm overlay whose opacity follows
 * the track's normalized data value. Driven purely by player state, so it
 * stays in sync with the sounded note and the playhead: pause holds the
 * frame, seek/jump moves it, stop resets it to the first frame.
 */
export default function WorldMapVisual({
  spec,
  viewIndex,
  status,
  stopCount,
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

  const overlayOpacity =
    spec.kind === 'overlay'
      ? OVERLAY_MAX_OPACITY * spec.values01[index]
      : 0;

  return (
    <div
      aria-hidden="true"
      className="mt-4 w-full rounded-lg border border-slate-800 bg-slate-900/40 p-5"
    >
      <p className="font-semibold text-atmos">World Map Visual</p>
      <div className="relative mt-3 w-full overflow-hidden rounded border border-slate-800">
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
          </>
        ) : (
          <>
            <img
              src={spec.baseSrc}
              alt=""
              draggable={false}
              decoding="async"
              className="block aspect-video w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-amber transition-opacity duration-500 motion-reduce:transition-none"
              style={{ opacity: overlayOpacity }}
            />
          </>
        )}
      </div>
      <p className="mt-2 font-mono text-xs text-slate-400">{spec.credit}</p>
    </div>
  );
}
