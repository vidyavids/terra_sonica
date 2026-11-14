import { useEffect, useRef, useState } from 'react';
import { toAbsoluteTick } from '../audio/conductor';
import type {
  PlaybackConductor,
  SlicePlayer,
  TrackEventBase,
} from '../audio/conductor';

export type TrackStatus = 'idle' | 'playing' | 'paused' | 'done';

export interface TrackControls<TEvent extends TrackEventBase> {
  status: TrackStatus;
  /** Current tick, or the cursor preview when not playing. Index is absolute. */
  view: TEvent & { index: number; progress: number };
  untouched: boolean;
  play: () => void;
  pause: () => void;
  replay: () => void;
  stop: () => void;
  scrub: (index: number) => void;
}

/**
 * Playback + scrub state for one track. Scrubbing never touches the engine:
 * each launch builds a fresh player over events.slice(start) (engines always
 * play from zero) and remaps ticks to absolute positions via toAbsoluteTick.
 * Launches go through the shared conductor so tracks never overlap; a
 * generation counter drops stale ticks and outcomes.
 */
export function useTrackPlayer<TEvent extends TrackEventBase>(
  events: TEvent[],
  createPlayer: (evts: TEvent[]) => SlicePlayer<TEvent>,
  conductor: PlaybackConductor,
): TrackControls<TEvent> {
  type Tick = TEvent & { index: number; progress: number };
  const playerRef = useRef<SlicePlayer<TEvent> | null>(null);
  const factoryRef = useRef(createPlayer);
  useEffect(() => {
    factoryRef.current = createPlayer;
  });
  const genRef = useRef(0);
  const stoppedRef = useRef(false);
  const pausedRef = useRef(false);
  const [status, setStatus] = useState<TrackStatus>('idle');
  const [tick, setTick] = useState<Tick | null>(null);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    return conductor.register(() => {
      playerRef.current?.stop();
    });
  }, [conductor]);

  useEffect(() => {
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  const playFrom = (start: number) => {
    const gen = ++genRef.current;
    stoppedRef.current = false;
    pausedRef.current = false;
    setCursor(start);
    setStatus('playing');
    let launched: Promise<'done' | 'stopped'> | null = null;
    void conductor
      .exclusive(async () => {
        await conductor.settle();
        if (gen !== genRef.current || stoppedRef.current) return;
        // Fresh player per launch over the suffix slice: the previous run
        // has fully exited (settle awaited it), so replacing the ref is
        // safe. Retired AudioContexts are released by garbage collection.
        const player = factoryRef.current(events.slice(start));
        playerRef.current = player;
        launched = conductor.track(
          player.play((t) => {
            if (gen !== genRef.current) return;
            setTick(toAbsoluteTick(t, start, events.length));
          }),
        );
      })
      .then(
        async () => {
          if (!launched || gen !== genRef.current) return;
          let outcome: 'done' | 'stopped';
          try {
            outcome = await launched;
          } catch {
            if (gen !== genRef.current) return;
            setStatus('idle');
            return;
          }
          if (gen !== genRef.current) return;
          if (outcome === 'done') {
            pausedRef.current = false;
            setStatus('done');
          } else if (pausedRef.current) {
            pausedRef.current = false;
            setStatus('paused');
          } else {
            setStatus('idle');
          }
        },
        () => {
          if (gen === genRef.current) setStatus('idle');
        },
      );
  };

  const clampIndex = (index: number) =>
    Math.min(events.length - 1, Math.max(0, index));

  const play = () => {
    if (status === 'done') {
      playFrom(0);
    } else if (status === 'paused') {
      const resume = (tick?.index ?? -1) + 1;
      playFrom(resume >= events.length ? 0 : resume);
    } else {
      playFrom(cursor);
    }
  };

  const pause = () => {
    if (status !== 'playing') return;
    pausedRef.current = true;
    playerRef.current?.stop();
  };

  const replay = () => {
    playFrom(0);
  };

  const stop = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    genRef.current += 1;
    playerRef.current?.stop();
    setStatus('idle');
  };

  const scrub = (index: number) => {
    const clamped = clampIndex(index);
    if (status === 'playing') {
      playFrom(clamped);
    } else {
      genRef.current += 1;
      setCursor(clamped);
      setTick(null);
      setStatus('idle');
    }
  };

  const view: Tick = tick ?? {
    ...events[cursor],
    index: cursor,
    progress: cursor / events.length,
  };

  return {
    status,
    view,
    untouched: tick === null && cursor === 0,
    play,
    pause,
    replay,
    stop,
    scrub,
  };
}
