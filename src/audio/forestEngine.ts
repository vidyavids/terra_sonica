/**
 * Forest audio engine — plain TypeScript, no React.
 *
 * Same pattern as the other track players: one note per observation,
 * sine oscillator, exponential gain envelope, one onTick per note.
 * NOTE_MS is 700 (yearly observations); events carry the yearly mean
 * tree-cover percent. Oscillator type and envelope match.
 *
 * Second layer (user decision): a second voice a perfect fifth above
 * the main note whose gain follows the derived year-over-year change.
 * The main note block below is byte-identical to the single-voice version.
 */

import type { TrackEventBase } from './conductor';

export interface ForestTrackEvent extends TrackEventBase {
  treeCoverPct: number;
  changeRate: number | null;
  changeGain: number;
}

export interface ForestTick extends ForestTrackEvent {
  index: number;
  /** Fraction of the track completed after this note, 0..1. */
  progress: number;
}

export const FOREST_NOTE_MS = 700;

export class ForestPlayer {
  private ctx: AudioContext | null = null;
  private stopped = false;
  private analyser: AnalyserNode | null = null;
  private readonly events: ForestTrackEvent[];

  constructor(events: ForestTrackEvent[]) {
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

  async play(onTick: (tick: ForestTick) => void): Promise<'done' | 'stopped'> {
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
        this.ctx.currentTime + FOREST_NOTE_MS / 1000,
      );
      osc.connect(gain).connect(this.ctx.destination);
      // Passive analyser tap (visualizer only; no effect on sound).
      const tap = this.getAnalyser();
      if (tap) gain.connect(tap);
      osc.start();
      osc.stop(this.ctx.currentTime + FOREST_NOTE_MS / 1000);

      if (entry.changeGain > 0) {
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = entry.quantizedHz * 1.5;
        gain2.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(
          entry.changeGain,
          this.ctx.currentTime + 0.05,
        );
        gain2.gain.exponentialRampToValueAtTime(
          0.0001,
          this.ctx.currentTime + FOREST_NOTE_MS / 1000,
        );
        osc2.connect(gain2).connect(this.ctx.destination);
        if (tap) gain2.connect(tap);
        osc2.start();
        osc2.stop(this.ctx.currentTime + FOREST_NOTE_MS / 1000);
      }

      await new Promise((r) => setTimeout(r, FOREST_NOTE_MS));
    }
    return 'done';
  }
}
