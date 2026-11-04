import { Ambience } from "./store";

export type { Ambience };

/**
 * Komorebi Web Audio API Synthesizer
 * 100% offline, procedural soundscapes with zero external audio assets.
 * Generates Rain, Lofi Warmth, Forest Breeze, White Noise, and gentle end-of-block Chime.
 */
class Soundscape {
  private ctx?: AudioContext;
  private master?: GainNode;
  private vol = 0.5;
  private stops: (() => void)[] = [];
  public kind: Ambience | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return null;
      }

      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v));
    this.vol = clamped;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.vol;
  }

  private noise(ctx: AudioContext, brown = false): AudioBufferSourceNode {
    const bufferSize = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;

    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        d[i] = w;
      }
    }

    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start();
    return s;
  }

  public stop(): void {
    for (const stopFn of this.stops) {
      try {
        stopFn();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.stops = [];
    this.kind = null;
  }

  public start(kind: Ambience): void {
    this.stop();
    const ctx = this.ensure();
    if (!ctx || !this.master) {
      return;
    }
    this.kind = kind;

    if (kind === "white") {
      const n = this.noise(ctx);
      const g = ctx.createGain();
      g.gain.value = 0.18;
      n.connect(g).connect(this.master);

      this.stops.push(() => {
        try {
          n.stop();
          n.disconnect();
          g.disconnect();
        } catch {}
      });
    }

    if (kind === "rain") {
      const n = this.noise(ctx);
      const hp = ctx.createBiquadFilter();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();

      hp.type = "highpass";
      hp.frequency.value = 900;
      lp.type = "lowpass";
      lp.frequency.value = 7000;
      g.gain.value = 0.22;

      n.connect(hp).connect(lp).connect(g).connect(this.master);

      // Droplets on glass window pane
      const drip = setInterval(() => {
        if (Math.random() < 0.5) return;
        if (!this.ctx || this.ctx.state !== "running") return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const dg = this.ctx.createGain();

        o.frequency.value = 1200 + Math.random() * 1800;
        dg.gain.setValueAtTime(0.0001, t);
        dg.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
        dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

        o.connect(dg).connect(this.master!);
        o.start(t);
        o.stop(t + 0.08);
      }, 140);

      this.stops.push(
        () => {
          try {
            n.stop();
            n.disconnect();
            hp.disconnect();
            lp.disconnect();
            g.disconnect();
          } catch {}
        },
        () => clearInterval(drip)
      );
    }

    if (kind === "forest") {
      const n = this.noise(ctx, true);
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();

      lp.type = "lowpass";
      lp.frequency.value = 500;
      g.gain.value = 0.5;
      lfo.frequency.value = 0.12;
      lg.gain.value = 250;

      lfo.connect(lg).connect(lp.frequency);
      lfo.start();
      n.connect(lp).connect(g).connect(this.master);

      // Gentle distant bird chirps
      const bird = setInterval(() => {
        if (Math.random() < 0.6) return;
        if (!this.ctx || this.ctx.state !== "running") return;
        const t = this.ctx.currentTime;
        const chirps = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < chirps; i++) {
          const o = this.ctx.createOscillator();
          const bg = this.ctx.createGain();
          const s = t + i * 0.18;

          o.frequency.setValueAtTime(2400, s);
          o.frequency.exponentialRampToValueAtTime(3600, s + 0.12);
          bg.gain.setValueAtTime(0.0001, s);
          bg.gain.exponentialRampToValueAtTime(0.025, s + 0.03);
          bg.gain.exponentialRampToValueAtTime(0.0001, s + 0.14);

          o.connect(bg).connect(this.master!);
          o.start(s);
          o.stop(s + 0.16);
        }
      }, 5000);

      this.stops.push(
        () => {
          try {
            n.stop();
            n.disconnect();
            lfo.stop();
            lfo.disconnect();
            lg.disconnect();
            lp.disconnect();
            g.disconnect();
          } catch {}
        },
        () => clearInterval(bird)
      );
    }

    if (kind === "lofi") {
      // Warm Cmaj7 - Am7 - Fmaj7 - G7 progression
      const chords = [
        [130.8, 164.8, 196, 246.9],
        [110, 130.8, 164.8, 196],
        [87.3, 110, 130.8, 164.8],
        [98, 123.5, 146.8, 174.6],
      ];
      let chordIdx = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      lp.connect(this.master);

      const play = () => {
        if (!this.ctx || this.ctx.state !== "running") return;
        const t = this.ctx.currentTime;
        const chord = chords[chordIdx++ % chords.length];

        chord.forEach((freq) => {
          const o = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          o.type = "triangle";
          o.frequency.value = freq;
          o.detune.value = (Math.random() - 0.5) * 14;

          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.07, t + 1.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 7.0);

          o.connect(g).connect(lp);
          o.start(t);
          o.stop(t + 7.2);
        });
      };

      play();
      const loop = setInterval(play, 6000);

      // Analog vinyl crackle
      const crackle = setInterval(() => {
        if (Math.random() < 0.7) return;
        if (!this.ctx || this.ctx.state !== "running") return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        o.type = "square";
        o.frequency.value = 3000 + Math.random() * 4000;
        g.gain.setValueAtTime(0.012, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

        o.connect(g).connect(this.master!);
        o.start(t);
        o.stop(t + 0.015);
      }, 90);

      this.stops.push(
        () => clearInterval(loop),
        () => clearInterval(crackle),
        () => {
          try {
            lp.disconnect();
          } catch {}
        }
      );
    }
  }

  /**
   * Gentle end-of-block chime triad.
   * Plays directly to audio destination, bypassing ambience volume.
   */
  public chime(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;

    [880, 1318.5, 1760].forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const s = t + idx * 0.12;

      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.18 / (idx + 1), s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 1.6);

      o.connect(g).connect(ctx.destination);
      o.start(s);
      o.stop(s + 1.8);
    });
  }
}

export const sound = new Soundscape();
