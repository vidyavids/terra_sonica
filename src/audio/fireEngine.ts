/**
 * Fire audio engine — plain TypeScript, no React.
 *
 * Same pattern as the track-2 NinoPlayer: one note per observation,
 * sine oscillator, exponential gain envelope, one onTick per note.
 * NOTE_MS is 500 (monthly observations); events carry year/month/label
 * plus the monthly detection count. Oscillator type and envelope match.
 *
 * Second layer (user decision): a fixed low E3 drone whose gain follows
 * the monthly mean FRP. The main note block below is byte-identical to
 * the single-voice version.
 */

import type { TrackEventBase } from './conductor';

export interface FireTrackEvent extends TrackEventBase {
  month: number;
  label: string;
  count: number;
  meanFRP_MW: number;
  droneGain: number;
}

export interface FireTick extends FireTrackEvent {
  index: number;
  /** Fraction of the track completed after this note, 0..1. */
  progress: number;
}

export const FIRE_NOTE_MS = 500;

/** Fixed drone pitch: E3, the lowest scale pitch (stays audible). */
export const DRONE_HZ = 164.81;

export class FirePlayer {
  private ctx: AudioContext | null = null;
  private stopped = false;
  private analyser: AnalyserNode | null = null;
  private readonly events: FireTrackEvent[];

  constructor(events: FireTrackEvent[]) {
    this.events = events;
  }

  stop(): void {
    this.stopped = true;
  }

  /**
   * Passive read-only tap for the audio-reactive visualizer. Observes the
   * signal without altering timing, notes, gain, or playback behaviour.
   */
  getAnalyser(): AnalyserNode | null {
    if (!this.ctx) return null;
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
    }
    return this.analyser;
  }

  async play(onTick: (tick: FireTick) => void): Promise<'done' | 'stopped'> {
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
        this.ctx.currentTime + FIRE_NOTE_MS / 1000,
      );
      osc.connect(gain).connect(this.ctx.destination);
      // Passive analyser tap (visualizer only; no effect on sound).
      const tap = this.getAnalyser();
      if (tap) gain.connect(tap);
      osc.start();
      osc.stop(this.ctx.currentTime + FIRE_NOTE_MS / 1000);

      const drone = this.ctx.createOscillator();
      const droneGain = this.ctx.createGain();
      drone.type = 'sine';
      drone.frequency.value = DRONE_HZ;
      droneGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      droneGain.gain.exponentialRampToValueAtTime(
        entry.droneGain,
        this.ctx.currentTime + 0.05,
      );
      droneGain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + FIRE_NOTE_MS / 1000,
      );
      drone.connect(droneGain).connect(this.ctx.destination);
      if (tap) droneGain.connect(tap);
      drone.start();
      drone.stop(this.ctx.currentTime + FIRE_NOTE_MS / 1000);

      await new Promise((r) => setTimeout(r, FIRE_NOTE_MS));
    }
    return 'done';
  }
}
