// Rendering: positioniert Steine als DOM-Elemente und skaliert das Brett responsiv.
import { faceSvg } from './faces.js';

const OFF = 0.08;     // Versatz pro Ebene (in Steinbreiten)
const ASPECT = 1.28;  // Steinhöhe / Steinbreite
const HALF_Y = ASPECT / 2;
const PAD = 0.14;     // Platz für Schatten/Kanten

export class Renderer {
  constructor(wrap, board) {
    this.wrap = wrap;
    this.board = board;
    this.els = [];
    this.game = null;
    this.dim = { wt: 1, ht: 1 };
    this.hintIds = [];
    new ResizeObserver(() => this.fit()).observe(wrap);
    window.addEventListener('orientationchange', () => setTimeout(() => this.fit(), 150));
  }

  build(game) {
    this.game = game;
    this.board.innerHTML = '';
    this.els = [];
    this.hintIds = [];
    let maxX = 0;
    let maxY = 0;
    let maxZ = 0;
    for (const t of game.tiles) {
      maxX = Math.max(maxX, t.x);
      maxY = Math.max(maxY, t.y);
      maxZ = Math.max(maxZ, t.z);
    }
    // Breite/Höhe des Bretts in Steinbreiten (eine Halbeinheit = 0.5 bzw. ASPECT/2)
    this.dim = {
      wt: (maxX + 2) / 2 + OFF * maxZ + PAD,
      ht: (maxY + 2) * HALF_Y + OFF * maxZ + PAD,
    };

    const frag = document.createDocumentFragment();
    for (const t of game.tiles) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.dataset.id = t.id;
      const left = t.x / 2 + (maxZ - t.z) * OFF;
      const top = t.y * (ASPECT / 2) + (maxZ - t.z) * OFF;
      el.style.left = `calc(${left} * var(--tw))`;
      el.style.top = `calc(${top} * var(--tw))`;
      el.style.zIndex = String(t.z * 10000 + t.y * 100 + t.x);
      el.dataset.face = t.face;
      el.innerHTML = `<span class="face">${faceSvg(t.face)}</span>`;
      frag.appendChild(el);
      this.els.push(el);
    }
    this.board.appendChild(frag);
    this.fit();
  }

  fit() {
    if (!this.game) return;
    const w = this.wrap.clientWidth - 16;
    const h = this.wrap.clientHeight - 16;
    if (w <= 0 || h <= 0) return;
    const tw = Math.max(10, Math.min(w / this.dim.wt, h / this.dim.ht, 84));
    this.board.style.setProperty('--tw', tw.toFixed(2) + 'px');
    this.board.style.width = (this.dim.wt * tw).toFixed(1) + 'px';
    this.board.style.height = (this.dim.ht * tw).toFixed(1) + 'px';
  }

  /** Aktualisiert Sichtbarkeit, Gesichter und "blockiert"-Markierungen. */
  update(game) {
    for (const t of game.tiles) {
      const el = this.els[t.id];
      el.classList.toggle('removed', !t.alive);
      if (el.dataset.face !== t.face) {
        el.dataset.face = t.face;
        el.firstChild.innerHTML = faceSvg(t.face);
      }
      if (t.alive) el.classList.toggle('blocked', !game.isFree(t.id));
      else el.classList.remove('selected', 'hint', 'blocked');
    }
  }

  setSelected(id) {
    for (const el of this.els) el.classList.remove('selected');
    if (id !== null && id !== undefined) this.els[id].classList.add('selected');
  }

  showHint(a, b) {
    this.clearHint();
    this.hintIds = [a, b];
    for (const i of this.hintIds) this.els[i].classList.add('hint');
  }

  clearHint() {
    for (const i of this.hintIds) this.els[i]?.classList.remove('hint');
    this.hintIds = [];
  }

  shake(id) {
    const el = this.els[id];
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 350);
  }
}
