/**
 * El Nino audio engine — plain TypeScript, no React.
 *
 * Same pattern as the track-1 TemperaturePlayer: one note per observation,
 * sine oscillator, exponential gain envelope, one onTick per note.
 * Differences are data-driven only: NOTE_MS is 500 (monthly observations)
 * and events carry month/label fields. Oscillator type and envelope match.
 */

import type { TrackEventBase } from './conductor';

export interface NinoTrackEvent extends TrackEventBase {
  month: number;
  label: string;
}

export interface NinoTick extends NinoTrackEvent {
  index: number;
  /** Fraction of the track completed after this note, 0..1. */
  progress: number;
}

export const NINO_NOTE_MS = 500;

export class NinoPlayer {
  private ctx: AudioContext | null = null;
  private stopped = false;
  private readonly events: NinoTrackEvent[];

  constructor(events: NinoTrackEvent[]) {
    this.events = events;
  }

  stop(): void {
    this.stopped = true;
  }

  async play(onTick: (tick: NinoTick) => void): Promise<'done' | 'stopped'> {
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
        this.ctx.currentTime + NINO_NOTE_MS / 1000,
      );
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + NINO_NOTE_MS / 1000);

      await new Promise((r) => setTimeout(r, NINO_NOTE_MS));
    }
    return 'done';
  }
}
