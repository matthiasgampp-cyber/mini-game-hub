// Einfacher pausierbarer Spieltimer.
export class GameTimer {
  constructor(onTick) {
    this.onTick = onTick;
    this.elapsed = 0;
    this.last = 0;
    this.running = false;
    this.handle = null;
  }

  get ms() {
    return this.running ? this.elapsed + (performance.now() - this.last) : this.elapsed;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.handle = setInterval(() => this.onTick(this.ms), 250);
    this.onTick(this.ms);
  }

  stop() {
    if (!this.running) return;
    this.elapsed = this.ms;
    this.running = false;
    clearInterval(this.handle);
    this.onTick(this.elapsed);
  }

  reset() {
    this.stop();
    this.elapsed = 0;
    this.onTick(0);
  }
}
