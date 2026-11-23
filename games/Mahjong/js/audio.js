// Dezente Soundeffekte per Web Audio API (keine Audiodateien nötig).
export class SoundFx {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, { type = 'sine', vol = 0.08, delay = 0, slideTo = null } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  play(name) {
    if (!this.enabled) return;
    this.unlock();
    switch (name) {
      case 'select': this.tone(660, 0.07, { type: 'triangle' }); break;
      case 'deselect': this.tone(440, 0.06, { type: 'triangle', vol: 0.05 }); break;
      case 'match':
        this.tone(523, 0.12, { type: 'sine' });
        this.tone(784, 0.18, { type: 'sine', delay: 0.07 });
        break;
      case 'blocked': this.tone(160, 0.12, { type: 'square', vol: 0.04, slideTo: 110 }); break;
      case 'error': this.tone(300, 0.1, { type: 'triangle', vol: 0.05, slideTo: 220 }); break;
      case 'undo': this.tone(500, 0.1, { type: 'triangle', slideTo: 320 }); break;
      case 'hint':
        this.tone(880, 0.09, { type: 'sine', vol: 0.06 });
        this.tone(1175, 0.12, { type: 'sine', vol: 0.06, delay: 0.09 });
        break;
      case 'shuffle':
        for (let i = 0; i < 7; i++) this.tone(300 + Math.random() * 500, 0.05, { type: 'triangle', vol: 0.04, delay: i * 0.05 });
        break;
      case 'stuck':
        this.tone(300, 0.2, { type: 'sine', slideTo: 180 });
        this.tone(220, 0.3, { type: 'sine', delay: 0.18, slideTo: 130 });
        break;
      case 'win':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, { type: 'sine', vol: 0.09, delay: i * 0.12 }));
        break;
      default: break;
    }
  }
}
