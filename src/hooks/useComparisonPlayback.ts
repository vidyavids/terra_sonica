import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackEventBase } from '../audio/conductor';
import type { TrackControls } from './useTrackPlayer';

export interface CompareRange {
  label: string;
  from: number;
  to: number;
}

interface Comparison {
  range: CompareRange | null;
  startComparison: (def: CompareRange) => void;
  playFullTrack: () => void;
}

/**
 * Ranged A/B comparison playback on top of an untouched track player.
 * The wrapped controls behave exactly like the base ones, except manual
 * actions exit comparison mode. Starting a comparison cascades across
 * renders (stop, move cursor, play) so the launch always uses fresh state,
 * and a timer stops playback shortly after the range's last note starts.
 */
export function useComparisonPlayback<TEvent extends TrackEventBase>(
  controls: TrackControls<TEvent>,
  noteMs: number,
): { controls: TrackControls<TEvent>; comparison: Comparison } {
  const [range, setRange] = useState<CompareRange | null>(null);
  const [pending, setPending] = useState<CompareRange | null>(null);
  const baseRef = useRef(controls);
  useEffect(() => {
    baseRef.current = controls;
  });
  const { status } = controls;
  const viewIndex = controls.view.index;

  useEffect(() => {
    if (pending && status === 'idle' && viewIndex !== pending.from) {
      baseRef.current.scrub(pending.from);
    }
  }, [pending, status, viewIndex]);

  useEffect(() => {
    if (!pending || status !== 'idle' || viewIndex !== pending.from) return;
    // Sequenced across renders by design: the launch must observe the
    // committed cursor, which only exists after scrub's render lands.
    // oxlint-disable-next-line react/set-state-in-effect
    setRange(pending);
    setPending(null);
    baseRef.current.play();
  }, [pending, status, viewIndex]);

  useEffect(() => {
    if (!range || status !== 'playing' || viewIndex !== range.to) return;
    const t = setTimeout(
      () => baseRef.current.stop(),
      Math.round(noteMs * 0.6),
    );
    return () => clearTimeout(t);
  }, [range, status, viewIndex, noteMs]);

  const exit = useCallback(() => {
    setRange(null);
    setPending(null);
  }, []);

  const startComparison = (def: CompareRange) => {
    setRange(null);
    setPending(def);
    controls.stop();
  };

  const playFullTrack = () => {
    exit();
    controls.replay();
  };

  const wrapped: TrackControls<TEvent> = {
    ...controls,
    play: () => {
      if (
        controls.status === 'paused' &&
        range &&
        controls.view.index >= range.to
      ) {
        startComparison(range);
        return;
      }
      if (controls.status !== 'paused') exit();
      controls.play();
    },
    replay: () => {
      exit();
      controls.replay();
    },
    stop: () => {
      exit();
      controls.stop();
    },
    scrub: (index: number) => {
      exit();
      controls.scrub(index);
    },
  };

  return {
    controls: wrapped,
    comparison: { range, startComparison, playFullTrack },
  };
}
