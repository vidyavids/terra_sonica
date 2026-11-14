/**
 * Global Temperature audio engine — plain TypeScript, no React.
 *
 * Ported nearly verbatim from the tested prototype `Lowess_Land Data.html`:
 * same NOTE_MS, sine oscillator, gain envelope, and one-note-per-year loop.
 *
 * Documented deviations from the prototype:
 * 1. Data comes from the validated 146-event JSON (fresh GISTEMP J-D annual
 *    means) instead of the 147-entry `frequencies.js` (see
 *    docs/temperature-mapping.md for the audit).
 * 2. Direct DOM writes are replaced by an `onTick` callback so React owns
 *    rendering; the callback fires once per note, same as the display update.
 * 3. A `stop()` method was added (the prototype could only play through).
 *    Timing, oscillator type, and envelope are unchanged.
 */

export interface TemperatureTrackEvent {
  year: number;
  anomalyC: number;
  linearHz: number;
  note: string;
  quantizedHz: number;
}

export interface TemperatureTick extends TemperatureTrackEvent {
  index: number;
  /** Fraction of the track completed after this note, 0..1. */
  progress: number;
}

export const NOTE_MS = 400;

export class TemperaturePlayer {
  private ctx: AudioContext | null = null;
  private stopped = false;
  private readonly events: TemperatureTrackEvent[];

  constructor(events: TemperatureTrackEvent[]) {
    this.events = events;
  }

  stop(): void {
    this.stopped = true;
  }

  async play(
    onTick: (tick: TemperatureTick) => void,
  ): Promise<'done' | 'stopped'> {
    this.stopped = false;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
    }
    await this.ctx.resume();

    for (let i = 0; i < this.events.length; i++) {
      if (this.stopped) {
        return 'stopped';
      }
      const entry = this.events[i];
      onTick({ ...entry, index: i, progress: (i + 1) / this.events.length });

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = entry.quantizedHz;
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + NOTE_MS / 1000,
      );
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + NOTE_MS / 1000);

      await new Promise((r) => setTimeout(r, NOTE_MS));
    }
    return 'done';
  }
}
