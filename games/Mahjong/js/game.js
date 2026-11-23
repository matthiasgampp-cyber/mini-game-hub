// Spiellogik: Steinsatz, Freiheitsregel, Reverse-Generierung (garantiert lösbar),
// Züge, Undo, lösbares Mischen.

const SUITS = ['bam', 'chr', 'cir']; // Bambus, Zeichen, Kreise
const WINDS = ['windE', 'windS', 'windW', 'windN'];
const DRAGONS = ['drgR', 'drgG', 'drgW'];

/** Gruppe, innerhalb derer Steine kombinierbar sind. */
export function groupOf(face) {
  if (face.startsWith('sea')) return 'season';
  if (face.startsWith('flw')) return 'flower';
  return face;
}

/** Vollständiger Satz mit 144 Steinen. */
export function fullPool() {
  const pool = [];
  for (const s of SUITS) for (let n = 1; n <= 9; n++) for (let k = 0; k < 4; k++) pool.push(s + n);
  for (const f of [...WINDS, ...DRAGONS]) for (let k = 0; k < 4; k++) pool.push(f);
  for (let n = 1; n <= 4; n++) pool.push('sea' + n);
  for (let n = 1; n <= 4; n++) pool.push('flw' + n);
  return pool;
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Berechnet Nachbarschaften (oben / links / rechts) für jeden Stein. */
export function buildNeighbors(tiles) {
  const n = tiles.length;
  const above = Array.from({ length: n }, () => []);
  const left = Array.from({ length: n }, () => []);
  const right = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const a = tiles[i];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const b = tiles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.abs(dy) >= 2) {
        continue;
      }
      if (b.z > a.z && Math.abs(dx) < 2) above[i].push(j);
      else if (b.z === a.z && dx < 0 && dx >= -2) left[i].push(j);
      else if (b.z === a.z && dx > 0 && dx <= 2) right[i].push(j);
    }
  }
  return { above, left, right };
}

/** Frei = nichts darüber UND links oder rechts komplett frei. */
function isFreeIn(nb, alive, i) {
  for (const j of nb.above[i]) if (alive[j]) return false;
  let leftFree = true;
  for (const j of nb.left[i]) {
    if (alive[j]) { leftFree = false; break; }
  }
  if (leftFree) return true;
  for (const j of nb.right[i]) if (alive[j]) return false;
  return true;
}

/**
 * Reverse-Generierung: Simuliert das Abräumen des Bretts. In jedem Schritt werden
 * zwei aktuell freie Positionen gewählt und ihnen ein passendes Paar zugewiesen.
 * Die entstehende Zuordnung ist per Konstruktion lösbar (die Reihenfolge ist eine Lösung).
 * Das Brett wird verworfen und neu gewürfelt, wenn es sich selbst blockiert.
 *
 * @param nb         Nachbarschaften
 * @param aliveIdx   Indizes der zu belegenden Positionen
 * @param faces      Multiset der zu verteilenden Gesichter (gerade Anzahl je Gruppe)
 * @returns {{faces: string[], order: number[][]} | null}
 */
export function assignFaces(nb, aliveIdx, faces, rng = Math.random, tries = 500) {
  const n = nb.above.length;
  for (let t = 0; t < tries; t++) {
    // Paare bilden (je Gruppe), dann mischen
    const byGroup = new Map();
    for (const f of faces) {
      const g = groupOf(f);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(f);
    }
    const pairs = [];
    for (const arr of byGroup.values()) {
      shuffleInPlace(arr, rng);
      for (let k = 0; k + 1 < arr.length; k += 2) pairs.push([arr[k], arr[k + 1]]);
    }
    shuffleInPlace(pairs, rng);

    const alive = new Uint8Array(n);
    for (const i of aliveIdx) alive[i] = 1;
    const result = new Array(n).fill(null);
    const order = [];
    let remaining = aliveIdx.length;
    let ok = true;

    while (remaining > 0) {
      const free = [];
      for (const i of aliveIdx) if (alive[i] && isFreeIn(nb, alive, i)) free.push(i);
      if (free.length < 2) { ok = false; break; }

      let a = -1;
      let b = -1;
      for (let k = 0; k < 12; k++) {
        a = free[Math.floor(rng() * free.length)];
        do { b = free[Math.floor(rng() * free.length)]; } while (b === a);
        if (remaining === 2) break;
        // Lookahead: nach dem Entfernen müssen mindestens 2 Steine frei bleiben
        alive[a] = 0; alive[b] = 0;
        let cnt = 0;
        for (const i of aliveIdx) {
          if (alive[i] && isFreeIn(nb, alive, i)) { cnt++; if (cnt >= 2) break; }
        }
        alive[a] = 1; alive[b] = 1;
        if (cnt >= 2) break;
      }
      const [fa, fb] = pairs.pop();
      result[a] = fa;
      result[b] = fb;
      alive[a] = 0;
      alive[b] = 0;
      remaining -= 2;
      order.push([a, b]);
    }
    if (ok) return { faces: result, order };
  }
  return null;
}

export class Game {
  constructor(layout, rng = Math.random) {
    this.layout = layout;
    this.rng = rng;
    this.tiles = layout.tiles.map((p, i) => ({ id: i, x: p.x, y: p.y, z: p.z, face: null, alive: true }));
    this.nb = buildNeighbors(this.tiles);
    this.aliveArr = new Uint8Array(this.tiles.length).fill(1);
    this.history = [];
    this.remaining = this.tiles.length;

    const all = this.tiles.map((t) => t.id);
    const res = assignFaces(this.nb, all, fullPool(), rng, 3000);
    if (!res) throw new Error('Layout konnte nicht lösbar generiert werden: ' + layout.id);
    res.faces.forEach((f, i) => { this.tiles[i].face = f; });
    this.solution = res.order;
  }

  get canUndo() { return this.history.length > 0; }
  get isWon() { return this.remaining === 0; }

  isFree(i) {
    return this.aliveArr[i] === 1 && isFreeIn(this.nb, this.aliveArr, i);
  }

  matches(a, b) {
    return a !== b && groupOf(this.tiles[a].face) === groupOf(this.tiles[b].face);
  }

  freeIds() {
    const out = [];
    for (const t of this.tiles) if (this.isFree(t.id)) out.push(t.id);
    return out;
  }

  /** Alle aktuell möglichen Paare. */
  findMoves() {
    const free = this.freeIds();
    const moves = [];
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (this.matches(free[i], free[j])) moves.push([free[i], free[j]]);
      }
    }
    return moves;
  }

  /** Anzahl kombinierbarer Paare (ohne alle Paare aufzulisten). */
  countMoves() {
    const counts = new Map();
    for (const id of this.freeIds()) {
      const g = groupOf(this.tiles[id].face);
      counts.set(g, (counts.get(g) || 0) + 1);
    }
    let total = 0;
    for (const c of counts.values()) total += (c * (c - 1)) / 2;
    return total;
  }

  remove(a, b) {
    if (!this.isFree(a) || !this.isFree(b) || !this.matches(a, b)) return false;
    for (const i of [a, b]) {
      this.tiles[i].alive = false;
      this.aliveArr[i] = 0;
    }
    this.remaining -= 2;
    this.history.push({ type: 'move', a, b });
    return true;
  }

  undo() {
    const e = this.history.pop();
    if (!e) return null;
    if (e.type === 'move') {
      for (const i of [e.a, e.b]) {
        this.tiles[i].alive = true;
        this.aliveArr[i] = 1;
      }
      this.remaining += 2;
    } else if (e.type === 'shuffle') {
      e.before.forEach((f, i) => { if (f !== null) this.tiles[i].face = f; });
    }
    return e;
  }

  /** Mischt die verbleibenden Steine so, dass das Brett garantiert lösbar bleibt. */
  shuffle() {
    const aliveIdx = this.tiles.filter((t) => t.alive).map((t) => t.id);
    if (aliveIdx.length < 2) return false;
    const faces = aliveIdx.map((i) => this.tiles[i].face);
    const res = assignFaces(this.nb, aliveIdx, faces, this.rng, 1500);
    if (!res) return false;
    const before = this.tiles.map((t) => (t.alive ? t.face : null));
    aliveIdx.forEach((i) => { this.tiles[i].face = res.faces[i]; });
    this.history.push({ type: 'shuffle', before });
    return true;
  }
}
