export class WoodSoundEngine {
  constructor(initialMuted = false) {
    this.ctx = null;
    this.muted = Boolean(initialMuted);
    this._noiseBuffer = null;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
  }

  _ensureContext() {
    if (this.muted) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _getNoiseBuffer(ctx) {
    if (this._noiseBuffer && this._noiseBuffer.sampleRate === ctx.sampleRate) {
      return this._noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.25));
    }
    this._noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Erzeugt einen warmen, kurzen Holz-Klack (Transient + Holzresonanz)
   */
  _woodKnock({ freq = 520, filterFreq = 1200, duration = 0.055, volume = 0.16, delay = 0 }) {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const start = ctx.currentTime + delay;

    // 1. Resonanter Holzkörper
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq * 1.18, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.72), start + duration);

    oscGain.gain.setValueAtTime(0.0001, start);
    oscGain.gain.linearRampToValueAtTime(volume, start + 0.004);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.01);

    // 2. Kurzer Holz-Anschlag (gefiltertes Rauschen)
    const noise = ctx.createBufferSource();
    noise.buffer = this._getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, start);
    filter.Q.setValueAtTime(2.6, start);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.85, start);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.025);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(start);
    noise.stop(start + 0.03);
  }

  playSelect() {
    this._woodKnock({ freq: 660, filterFreq: 1650, duration: 0.038, volume: 0.1 });
  }

  playPickup() {
    this._woodKnock({ freq: 720, filterFreq: 1800, duration: 0.032, volume: 0.08 });
  }

  playJump() {
    // Sanfter Abstoß + sattes Einrasten in der Holzmulde
    this._woodKnock({ freq: 580, filterFreq: 1450, duration: 0.04, volume: 0.08, delay: 0 });
    this._woodKnock({ freq: 430, filterFreq: 1050, duration: 0.065, volume: 0.18, delay: 0.045 });
  }

  playUndo() {
    this._woodKnock({ freq: 480, filterFreq: 1200, duration: 0.045, volume: 0.11, delay: 0 });
    this._woodKnock({ freq: 380, filterFreq: 950, duration: 0.05, volume: 0.1, delay: 0.055 });
  }

  playInvalid() {
    this._woodKnock({ freq: 210, filterFreq: 520, duration: 0.055, volume: 0.1 });
  }

  playHint() {
    this._woodKnock({ freq: 660, filterFreq: 1500, duration: 0.07, volume: 0.1, delay: 0 });
    this._woodKnock({ freq: 880, filterFreq: 1850, duration: 0.08, volume: 0.1, delay: 0.08 });
  }

  playDeadlock() {
    this._woodKnock({ freq: 300, filterFreq: 700, duration: 0.08, volume: 0.14, delay: 0 });
    this._woodKnock({ freq: 225, filterFreq: 560, duration: 0.11, volume: 0.15, delay: 0.12 });
  }

  playWin(perfect = false) {
    const notes = perfect ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      this._woodKnock({
        freq,
        filterFreq: freq * 2.1,
        duration: 0.14,
        volume: 0.14,
        delay: idx * 0.095
      });
    });
  }
}
