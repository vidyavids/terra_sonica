/**
 * Shared audio plumbing — plain TypeScript, no React.
 *
 * TrackEventBase / SlicePlayer describe the shape both track engines already
 * have (track 1 satisfies them untouched). PlaybackConductor serializes
 * playback across tracks so two loops can never sound at once: every launch
 * stops all registered engines and awaits their in-flight runs before the
 * new loop starts. Residual overlap is at most one already-ringing note tail
 * (<= NOTE_MS), which no UI code can cancel without changing the engines.
 */

export interface TrackEventBase {
  year: number;
  anomalyC: number;
  linearHz: number;
  note: string;
  quantizedHz: number;
}

export interface SlicePlayer<TEvent extends TrackEventBase> {
  play(
    onTick: (tick: TEvent & { index: number; progress: number }) => void,
  ): Promise<'done' | 'stopped'>;
  stop(): void;
}

export class PlaybackConductor {
  private readonly stops = new Set<() => void>();
  private readonly runs = new Set<Promise<unknown>>();
  private queue: Promise<void> = Promise.resolve();

  /** Register an engine stop callback; returns an unregister function. */
  register(stop: () => void): () => void {
    this.stops.add(stop);
    return () => {
      this.stops.delete(stop);
    };
  }

  /** Track an in-flight play() run so settle() can await it. */
  track<T>(run: Promise<T>): Promise<T> {
    this.runs.add(run);
    const drop = () => {
      this.runs.delete(run);
    };
    run.then(drop, drop);
    return run;
  }

  /** Flag every engine stopped, then wait until all tracked runs exit. */
  async settle(): Promise<void> {
    this.stops.forEach((stop) => {
      stop();
    });
    await Promise.allSettled([...this.runs]);
  }

  /** Run fn after all previously queued exclusive sections finish. */
  exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
