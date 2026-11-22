(() => {
  "use strict";

  /**
   * Blauis Welt – Level "Mamas Haus" (Koch- & Schnippel-Level)
   * ------------------------------------------------------------------
   * Gemütliche Küche:
   * - Blaui als kleiner Koch mit Kochmütze und Messer am Holz-Schneidebrett
   * - 6 Gemüsesorten mit unterschiedlichen Schnittmustern (Scheiben, Schrägschnitt,
   *   Würfeln/Kreuzschnitt, Halbieren, Vierteln, schnelles Hacken)
   * - Steuerung per Finger/Maus-Wischen (Swipen) direkt über die Schnittlinien
   *   ODER per Pfeiltasten / WASD / Virtual Joystick + Action-Taste
   * - 30-Sekunden-Countdown, Combo-Punkte, Highscore & Suppenkessel-Finale
   */

  const ROUND_DURATION = 60; // Sekunden
  const W = 720;
  const H = 405;
  const TAU = Math.PI * 2;
  const STORAGE_HS_KEY = "blauiswelt_mama_hs";

  const BOARD = { x: 290, y: 274 }; // Mittelpunkt des Schneidebretts
  const POT = { x: 598, y: 256 };   // Mittelpunkt des Suppenkessels

  // 10 Gemüsesorten mit unterschiedlichen Schnittlinien & wechselnden Schnittrichtungen
  const DIR_MASK = { up: 1, down: 2, left: 4, right: 8, diagDR: 10, diagDL: 6 };

  const VEGGIES = [
    {
      id: "pilz",
      name: "Pilz",
      pts: 14,
      color: "#d6d3d1",
      cuts: [
        { x1: 0, y1: -44, x2: 0, y2: 44, dir: "down", label: "↓" },
        { x1: -38, y1: 0, x2: 38, y2: 0, dir: "right", label: "→" }
      ]
    },
    {
      id: "karotte",
      name: "Karotte",
      pts: 20,
      color: "#fb923c",
      cuts: [
        { x1: -36, y1: -36, x2: -36, y2: 36, dir: "down", label: "↓" },
        { x1: 0,   y1: 36,  x2: 0,   y2: -36, dir: "up", label: "↑" },
        { x1: 36,  y1: -36, x2: 36,  y2: 36, dir: "down", label: "↓" }
      ]
    },
    {
      id: "gurke",
      name: "Gurke",
      pts: 24,
      color: "#4ade80",
      cuts: [
        { x1: -50, y1: -32, x2: -18, y2: 32, dir: "diagDR", label: "↘" },
        { x1: 16,  y1: -32, x2: -16, y2: 32, dir: "diagDL", label: "↙" },
        { x1: 22,  y1: -32, x2: 54,  y2: 32, dir: "diagDR", label: "↘" }
      ]
    },
    {
      id: "kartoffel",
      name: "Kartoffel",
      pts: 18,
      color: "#eab308",
      cuts: [
        { x1: -48, y1: 0, x2: 48, y2: 0, dir: "right", label: "→" },
        { x1: 0, y1: -42, x2: 0, y2: 42, dir: "down", label: "↓" },
        { x1: 42, y1: 16, x2: -42, y2: 16, dir: "left", label: "←" }
      ]
    },
    {
      id: "zwiebel",
      name: "Zwiebel",
      pts: 28,
      color: "#e879f9",
      cuts: [
        { x1: -46, y1: -10, x2: 46, y2: -10, dir: "right", label: "→" },
        { x1: 46,  y1: 14,  x2: -46, y2: 14, dir: "left", label: "←" },
        { x1: -18, y1: -42, x2: -18, y2: 42, dir: "down", label: "↓" },
        { x1: 18,  y1: 42,  x2: 18,  y2: -42, dir: "up", label: "↑" }
      ]
    },
    {
      id: "lauch",
      name: "Lauch",
      pts: 30,
      color: "#86efac",
      cuts: [
        { x1: -45, y1: -32, x2: -45, y2: 32, dir: "down", label: "↓" },
        { x1: -15, y1: 32,  x2: -15, y2: -32, dir: "up", label: "↑" },
        { x1: 2,   y1: -32, x2: 32,  y2: 32, dir: "diagDR", label: "↘" },
        { x1: 46,  y1: -32, x2: 46,  y2: 32, dir: "down", label: "↓" }
      ]
    },
    {
      id: "tomate",
      name: "Tomate",
      pts: 22,
      color: "#ef4444",
      cuts: [
        { x1: -42, y1: 0, x2: 42, y2: 0, dir: "right", label: "→" },
        { x1: 0, y1: -40, x2: 0, y2: 40, dir: "down", label: "↓" },
        { x1: 26, y1: -28, x2: -26, y2: 28, dir: "diagDL", label: "↙" }
      ]
    },
    {
      id: "paprika",
      name: "Paprika",
      pts: 28,
      color: "#facc15",
      cuts: [
        { x1: -18, y1: -38, x2: -18, y2: 38, dir: "down", label: "↓" },
        { x1: -42, y1: 0,   x2: 42,  y2: 0,  dir: "right", label: "→" },
        { x1: 18,  y1: 38,  x2: 18,  y2: -38, dir: "up", label: "↑" },
        { x1: 42,  y1: 16,  x2: -42, y2: 16, dir: "left", label: "←" }
      ]
    },
    {
      id: "aubergine",
      name: "Aubergine",
      pts: 24,
      color: "#a855f7",
      cuts: [
        { x1: -36, y1: -30, x2: -4,  y2: 30, dir: "diagDR", label: "↘" },
        { x1: 6,   y1: -34, x2: 6,   y2: 34, dir: "down", label: "↓" },
        { x1: 40,  y1: -30, x2: 10,  y2: 30, dir: "diagDL", label: "↙" }
      ]
    },
    {
      id: "kuerbis",
      name: "Kürbis",
      pts: 32,
      color: "#f97316",
      cuts: [
        { x1: 0, y1: -42, x2: 0, y2: 42, dir: "down", label: "↓" },
        { x1: -46, y1: 0, x2: 46, y2: 0, dir: "right", label: "→" },
        { x1: -30, y1: -30, x2: 30, y2: 30, dir: "diagDR", label: "↘" },
        { x1: 30, y1: -30, x2: -30, y2: 30, dir: "diagDL", label: "↙" }
      ]
    }
  ];

  // Punkte automatisch nach Schnitt-Anzahl & Schwierigkeit berechnen:
  // Basis 6 PKT/Schnitt + 3 PKT pro Richtungswechsel + 5 PKT pro Diagonalschnitt
  function calcVeggiePts(cuts) {
    let pts = 0;
    for (let i = 0; i < cuts.length; i++) {
      const c = cuts[i];
      pts += 6;
      if (c.dir === "diagDR" || c.dir === "diagDL") pts += 5;
      if (i > 0 && cuts[i - 1].dir !== c.dir) pts += 3;
    }
    return pts;
  }

  VEGGIES.forEach((v) => {
    v.pts = calcVeggiePts(v.cuts);
  });

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randRange = (lo, hi) => lo + Math.random() * (hi - lo);

  function loadHighscore() {
    try {
      return Number(localStorage.getItem(STORAGE_HS_KEY)) || 0;
    } catch (_) {
      return 0;
    }
  }

  function saveHighscore(v) {
    try {
      localStorage.setItem(STORAGE_HS_KEY, String(v));
    } catch (_) {}
  }

  // Abstand Punkt (px, py) zu Strecke (x1, y1)-(x2, y2)
  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ------------------------------------------------------------------
  // Gemüse-Zeichnungen
  // ------------------------------------------------------------------
  function drawVeggie(ctx, id, x, y, cutIndex, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Leichter Schatten auf dem Brett
    ctx.fillStyle = "rgba(69, 26, 3, 0.28)";
    ctx.beginPath();
    ctx.ellipse(2, 6, 56, 22, 0, 0, TAU);
    ctx.fill();

    // Leichter Versatz, wenn schon Schnitte gemacht wurden
    const split = cutIndex * 3.5;

    switch (id) {
      case "karotte": {
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.ellipse(-66 - split * 0.4, -4, 14, 5, -0.3, 0, TAU);
        ctx.ellipse(-66 - split * 0.4, 4, 14, 5, 0.3, 0, TAU);
        ctx.fill();
        const cg = ctx.createLinearGradient(0, -20, 0, 20);
        cg.addColorStop(0, "#fdba74");
        cg.addColorStop(1, "#ea580c");
        ctx.fillStyle = cg;
        ctx.strokeStyle = "#9a3412";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-56 - split * 0.3, -18);
        ctx.quadraticCurveTo(10, -20, 62 + split * 0.3, 0);
        ctx.quadraticCurveTo(10, 20, -56 - split * 0.3, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "gurke": {
        const gg = ctx.createLinearGradient(0, -18, 0, 18);
        gg.addColorStop(0, "#86efac");
        gg.addColorStop(0.5, "#22c55e");
        gg.addColorStop(1, "#15803d");
        ctx.fillStyle = gg;
        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-64 - split * 0.3, -17, 128 + split * 0.6, 34, 17);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "zwiebel": {
        ctx.fillStyle = "#a3e635";
        ctx.beginPath();
        ctx.ellipse(0, -34 - split * 0.2, 6, 12, 0, 0, TAU);
        ctx.fill();
        const zg = ctx.createRadialGradient(-8, -8, 4, 0, 0, 38);
        zg.addColorStop(0, "#fae8ff");
        zg.addColorStop(0.6, "#e879f9");
        zg.addColorStop(1, "#86198f");
        ctx.fillStyle = zg;
        ctx.strokeStyle = "#701a75";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 40 + split * 0.3, 32 + split * 0.2, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "pilz": {
        // Stiel
        ctx.fillStyle = "#f5f5f4";
        ctx.strokeStyle = "#78716c";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-14, 2, 28, 28, 8);
        ctx.fill();
        ctx.stroke();
        // Hut
        const pg = ctx.createRadialGradient(-8, -14, 4, 0, -6, 44);
        pg.addColorStop(0, "#f5f5f4");
        pg.addColorStop(1, "#a8a29e");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(0, -8, 44, 24, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "kartoffel": {
        const kg = ctx.createRadialGradient(-10, -8, 4, 0, 0, 44);
        kg.addColorStop(0, "#fef08a");
        kg.addColorStop(1, "#ca8a04");
        ctx.fillStyle = kg;
        ctx.strokeStyle = "#713f12";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 44 + split * 0.3, 28 + split * 0.3, 0.08, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#854d0e";
        [[-16, -6], [14, 8], [4, -10]].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.arc(dx, dy, 2, 0, TAU);
          ctx.fill();
        });
        break;
      }
      case "lauch": {
        ctx.fillStyle = "#f8fafc";
        ctx.strokeStyle = "#4d7c0f";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-64 - split * 0.3, -15, 68, 30, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.roundRect(-4, -17, 68 + split * 0.3, 34, 8);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "tomate": {
        const tg = ctx.createRadialGradient(-10, -10, 4, 0, 0, 38);
        tg.addColorStop(0, "#fca5a5");
        tg.addColorStop(0.55, "#ef4444");
        tg.addColorStop(1, "#991b1b");
        ctx.fillStyle = tg;
        ctx.strokeStyle = "#7f1d1d";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 38 + split * 0.3, 34 + split * 0.25, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#16a34a";
        for (let i = 0; i < 5; i++) {
          const a = (i * TAU) / 5;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * 6, -18 + Math.sin(a) * 4, 7, 2.5, a, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case "paprika": {
        const pg = ctx.createLinearGradient(0, -34, 0, 34);
        pg.addColorStop(0, "#fef08a");
        pg.addColorStop(1, "#eab308");
        ctx.fillStyle = pg;
        ctx.strokeStyle = "#a16207";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-36 - split * 0.3, -32, 72 + split * 0.6, 64, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#15803d";
        ctx.fillRect(-5, -40, 10, 10);
        break;
      }
      case "aubergine": {
        const ag = ctx.createLinearGradient(-48, -24, 48, 24);
        ag.addColorStop(0, "#c084fc");
        ag.addColorStop(0.6, "#7e22ce");
        ag.addColorStop(1, "#3b0764");
        ctx.fillStyle = ag;
        ctx.strokeStyle = "#3b0764";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 2, 48 + split * 0.3, 25, -0.1, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.ellipse(-44, -4, 10, 13, 0.3, 0, TAU);
        ctx.fill();
        break;
      }
      case "kuerbis": {
        const kg = ctx.createRadialGradient(-10, -10, 6, 0, 0, 44);
        kg.addColorStop(0, "#fdba74");
        kg.addColorStop(0.6, "#f97316");
        kg.addColorStop(1, "#9a3412");
        ctx.fillStyle = kg;
        ctx.strokeStyle = "#7c2d12";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 2, 44 + split * 0.3, 35 + split * 0.25, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(124, 45, 18, 0.45)";
        [-18, 0, 18].forEach((rx) => {
          ctx.beginPath();
          ctx.ellipse(rx, 2, 12, 34, 0, 0, TAU);
          ctx.stroke();
        });
        ctx.fillStyle = "#15803d";
        ctx.fillRect(-4, -38, 8, 10);
        break;
      }
    }

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // Szene "Mamas Haus"
  // ------------------------------------------------------------------
  const scene = {
    id: "mama",
    name: "Mamas Haus",
    subtitle: "Gemüse-Küche",
    custom: true,

    state: "intro", // intro | playing | results
    clock: 0,
    timeLeft: ROUND_DURATION,
    score: 0,
    highscore: 0,
    isNewHs: false,
    veggiesDone: 0,
    combo: 0,
    current: null,   // { def, cutIdx, slideIn }
    flying: [],      // Fliegende Zutatenteile in den Kessel
    particles: [],
    floatingTexts: [],
    steam: [],
    swipeTrail: [],
    swiping: false,
    chopAnim: 0,
    boardShake: 0,
    prevDirMask: 0,
    pendingDir: null,
    lastSwipePt: null,
    ui: [],
    game: null,

    enter(game) {
      this.game = game;
      this.highscore = loadHighscore();
      this.prepareIntro();
    },

    leave() {
      this.game = null;
    },

    prepareIntro() {
      this.state = "intro";
      this.timeLeft = ROUND_DURATION;
      this.score = 0;
      this.isNewHs = false;
      this.veggiesDone = 0;
      this.combo = 0;
      this.flying = [];
      this.particles = [];
      this.floatingTexts = [];
      this.swipeTrail = [];
      this.swiping = false;
      this.chopAnim = 0;
      this.boardShake = 0;
      this.prevDirMask = 0;
      this.pendingDir = null;
      this.lastSwipePt = null;
      this.nextVeggie();
    },

    startRound() {
      this.prepareIntro();
      this.state = "playing";
    },

    nextVeggie() {
      const def = VEGGIES[Math.floor(Math.random() * VEGGIES.length)];
      this.current = { def, cutIdx: 0, slideIn: 1 };
    },

    registerMiss() {
      this.combo = 0;
      this.boardShake = 0.28;
      this.addFloatingText(BOARD.x, BOARD.y - 54, "✕ Falsche Richtung!", "#fca5a5");
    },

    tryDirectionalCut(mask) {
      if (this.state !== "playing" || !this.current) return;
      const cut = this.current.def.cuts[this.current.cutIdx];
      if (!cut) return;
      const expected = DIR_MASK[cut.dir] || 2;
      if (mask === expected) {
        this.performCut();
      } else {
        this.registerMiss();
      }
    },

    performCut() {
      if (this.state !== "playing" || !this.current) return;
      const cur = this.current;
      const cut = cur.def.cuts[cur.cutIdx];
      if (!cut) return;

      this.chopAnim = 1;
      const cx = BOARD.x + (cut.x1 + cut.x2) * 0.5;
      const cy = BOARD.y + (cut.y1 + cut.y2) * 0.5;
      this.spawnParticles(cx, cy, cur.def.color, 8, 90);
      this.spawnParticles(cx, cy, "#ffffff", 4, 70);

      cur.cutIdx += 1;
      if (cur.cutIdx >= cur.def.cuts.length) {
        // Zutat komplett geschnitten -> in den Kessel werfen!
        this.combo += 1;
        const bonus = Math.min(20, (this.combo - 1) * 3);
        const pts = cur.def.pts + bonus;
        this.score += pts;
        this.veggiesDone += 1;

        this.flying.push({
          def: cur.def,
          sx: BOARD.x,
          sy: BOARD.y,
          tx: POT.x,
          ty: POT.y - 24,
          t: 0
        });
        this.addFloatingText(BOARD.x, BOARD.y - 54, `+${pts}${bonus > 0 ? ` (Combo ×${this.combo})` : ""}`, "#fde047");
        this.nextVeggie();
      }
    },

    spawnParticles(x, y, color, count = 10, spread = 110) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const sp = 30 + Math.random() * spread;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 35,
          life: 0.4 + Math.random() * 0.35,
          max: 0.75,
          color,
          r: 2 + Math.random() * 2.2
        });
      }
    },

    addFloatingText(x, y, text, color) {
      this.floatingTexts.push({ x, y, vy: -30, text, color, life: 1.0, max: 1.0 });
    },

    toHub() {
      this.game?.returnToHub?.("mama");
    },

    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "backspace") {
        e.preventDefault?.();
        this.toHub();
      } else if (this.state === "results" && k === "r") {
        this.startRound();
      }
    },

    onPointer(x, y) {
      for (let i = this.ui.length - 1; i >= 0; i--) {
        const b = this.ui[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          if (b.id === "hub") this.toHub();
          else if (b.id === "start" || b.id === "again") this.startRound();
          return;
        }
      }
      if (this.state === "intro") {
        this.startRound();
        return;
      }
      if (this.state === "playing") {
        this.swiping = true;
        this.lastSwipePt = { x, y };
        this.swipeTrail = [{ x, y, life: 0.25 }];
      }
    },

    onPointerMove(x, y) {
      if (this.state !== "playing" || !this.swiping) return;
      this.swipeTrail.push({ x, y, life: 0.22 });
      if (this.swipeTrail.length > 18) this.swipeTrail.shift();
      this.checkSwipeHit(x, y);
      this.lastSwipePt = { x, y };
    },

    onPointerUp() {
      this.swiping = false;
      this.lastSwipePt = null;
    },

    checkSwipeHit(x, y) {
      if (!this.current || this.chopAnim > 0.55 || !this.lastSwipePt) return;
      const dx = x - this.lastSwipePt.x;
      const dy = y - this.lastSwipePt.y;
      const slen = Math.hypot(dx, dy);
      if (slen < 6) return;

      const cut = this.current.def.cuts[this.current.cutIdx];
      if (!cut) return;
      const x1 = BOARD.x + cut.x1;
      const y1 = BOARD.y + cut.y1;
      const x2 = BOARD.x + cut.x2;
      const y2 = BOARD.y + cut.y2;

      const d = distToSegment(x, y, x1, y1, x2, y2);
      if (d < 18) {
        const clen = Math.hypot(x2 - x1, y2 - y1) || 1;
        const dot = (dx * (x2 - x1) + dy * (y2 - y1)) / (slen * clen);
        if (dot > 0.55) {
          this.performCut();
        } else if (dot < -0.25) {
          this.registerMiss();
          this.swiping = false;
        }
      }
    },

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------
    update(dt, game, action) {
      this.clock += dt;
      this.chopAnim = Math.max(0, this.chopAnim - dt * 4.5);
      this.boardShake = Math.max(0, this.boardShake - dt);

      // Kessel-Dampf
      if (Math.random() < dt * 6) {
        this.steam.push({
          x: POT.x + randRange(-26, 26),
          y: POT.y - 34,
          vy: -24 - Math.random() * 18,
          r: 6 + Math.random() * 6,
          life: 1.2,
          max: 1.2,
          ph: Math.random() * TAU
        });
      }
      this.steam = this.steam.filter((s) => {
        s.life -= dt;
        s.y += s.vy * dt;
        s.x += Math.sin(this.clock * 2.5 + s.ph) * 8 * dt;
        s.r += 5 * dt;
        return s.life > 0;
      });

      this.swipeTrail = this.swipeTrail.filter((pt) => {
        pt.life -= dt;
        return pt.life > 0;
      });

      this.particles = this.particles.filter((pt) => {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 200 * dt;
        return pt.life > 0;
      });

      this.floatingTexts = this.floatingTexts.filter((ft) => {
        ft.life -= dt;
        ft.y += ft.vy * dt;
        return ft.life > 0;
      });

      // Fliegendes Gemüse in den Kessel
      this.flying = this.flying.filter((fl) => {
        fl.t += dt * 2.4;
        if (fl.t >= 1) {
          this.spawnParticles(POT.x, POT.y - 24, "#fde047", 10, 95);
          this.spawnParticles(POT.x, POT.y - 24, fl.def.color, 8, 85);
          return false;
        }
        return true;
      });

      if (this.state === "intro") {
        if (action) this.startRound();
        return;
      }
      if (this.state === "results") {
        if (action) this.startRound();
        return;
      }

      // Countdown
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) {
        this.state = "results";
        if (this.score > this.highscore) {
          this.highscore = this.score;
          this.isNewHs = true;
          saveHighscore(this.score);
        }
        return;
      }

      if (this.current && this.current.slideIn > 0) {
        this.current.slideIn = Math.max(0, this.current.slideIn - dt * 5);
      }

      // Exakte Schnittrichtung über Pfeiltasten / WASD / Virtual Joystick (inkl. kurzem Diagonal-Puffer)
      const inp = game.input || {};
      const dirMask = (inp.up ? 1 : 0) | (inp.down ? 2 : 0) | (inp.left ? 4 : 0) | (inp.right ? 8 : 0);
      if (dirMask !== this.prevDirMask) {
        this.prevDirMask = dirMask;
        if (dirMask !== 0) {
          if (!this.pendingDir) this.pendingDir = { seen: dirMask, t: performance.now() };
          else this.pendingDir.seen |= dirMask;
        } else if (this.pendingDir) {
          this.tryDirectionalCut(this.pendingDir.seen);
          this.pendingDir = null;
        }
      }
      if (this.pendingDir && performance.now() - this.pendingDir.t > 75) {
        this.tryDirectionalCut(this.pendingDir.seen);
        this.pendingDir = null;
      }
    },

    // ------------------------------------------------------------------
    // Zeichnen
    // ------------------------------------------------------------------
    draw(ctx, t) {
      this.ui = [];

      // 1. Realistische Küchen-Rückwand mit warmem Lichtverlauf & Subway-Fliesen
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#451a03");
      bg.addColorStop(0.55, "#78350f");
      bg.addColorStop(1, "#291002");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Fliesen-Rückwand
      const tileG = ctx.createLinearGradient(0, 48, 0, 218);
      tileG.addColorStop(0, "#fffbeb");
      tileG.addColorStop(1, "#fde68a");
      ctx.fillStyle = tileG;
      ctx.fillRect(0, 48, W, 170);
      ctx.strokeStyle = "rgba(180, 120, 60, 0.24)";
      ctx.lineWidth = 1;
      for (let y = 48; y < 218; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        const offset = ((Math.floor(y / 18) & 1) * 18);
        for (let x = offset; x < W; x += 36) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, Math.min(218, y + 18));
          ctx.stroke();
        }
      }

      // Sonnenlicht-Fenster mit gerafften Vorhängen & Kräutertöpfen
      const winSky = ctx.createLinearGradient(0, 66, 0, 146);
      winSky.addColorStop(0, "#38bdf8");
      winSky.addColorStop(1, "#e0f2fe");
      ctx.fillStyle = winSky;
      ctx.fillRect(42, 66, 108, 78);
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 3.5;
      ctx.strokeRect(42, 66, 108, 78);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(96, 66);
      ctx.lineTo(96, 144);
      ctx.moveTo(42, 105);
      ctx.lineTo(150, 105);
      ctx.stroke();
      // Vorhänge
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.moveTo(36, 64);
      ctx.lineTo(62, 64);
      ctx.quadraticCurveTo(48, 105, 58, 146);
      ctx.lineTo(36, 146);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(156, 64);
      ctx.lineTo(130, 64);
      ctx.quadraticCurveTo(144, 105, 134, 146);
      ctx.lineTo(156, 146);
      ctx.closePath();
      ctx.fill();
      // Fensterbank + Basilikum-Topf
      ctx.fillStyle = "#92400e";
      ctx.fillRect(36, 144, 120, 6);
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(82, 132, 9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.fillRect(76, 136, 12, 8);

      // Oberschränke & Gewürzregal mit Kupferpfannen
      ctx.fillStyle = "#78350f";
      ctx.fillRect(250, 54, 160, 56);
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2;
      ctx.strokeRect(250, 54, 160, 56);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(262, 62, 60, 38);
      ctx.fillRect(338, 62, 60, 38);
      // Hängestange mit Kupferpfannen
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(430, 94);
      ctx.lineTo(660, 94);
      ctx.stroke();
      [465, 520, 575].forEach((px, i) => {
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, 94);
        ctx.lineTo(px, 114);
        ctx.stroke();
        ctx.fillStyle = i === 1 ? "#475569" : "#d97706";
        ctx.beginPath();
        ctx.arc(px, 126, 14 - i, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.stroke();
      });

      // 2. Blaui als Koch hinter der Arbeitsfläche
      this.drawChefBlaui(ctx, t);

      // 3. Eichenholz-Arbeitsfläche & realistisches Schneidebrett
      const desk = ctx.createLinearGradient(0, 212, 0, H);
      desk.addColorStop(0, "#d97706");
      desk.addColorStop(0.2, "#b45309");
      desk.addColorStop(1, "#451a03");
      ctx.fillStyle = desk;
      ctx.fillRect(0, 212, W, H - 212);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(0, 212, W, 5);

      const shakeX = this.boardShake > 0 ? Math.sin(this.boardShake * 60) * 5 : 0;
      // Schneidebrett-Schatten + 3D-Eichenbrett mit Saftrille
      ctx.fillStyle = "rgba(41, 16, 2, 0.45)";
      ctx.beginPath();
      ctx.roundRect(BOARD.x - 124 + shakeX, BOARD.y - 52, 252, 122, 16);
      ctx.fill();
      const boardG = ctx.createLinearGradient(0, BOARD.y - 58, 0, BOARD.y + 58);
      boardG.addColorStop(0, "#fef3c7");
      boardG.addColorStop(1, "#fcd34d");
      ctx.fillStyle = boardG;
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(BOARD.x - 126 + shakeX, BOARD.y - 58, 252, 116, 16);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(146, 64, 14, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(BOARD.x - 116 + shakeX, BOARD.y - 48, 232, 96, 12);
      ctx.stroke();

      // 4. Aktuelles Gemüse & Schnittlinien
      if (this.current && this.state === "playing") {
        const cur = this.current;
        const slideX = cur.slideIn * -90;
        drawVeggie(ctx, cur.def.id, BOARD.x + slideX, BOARD.y, cur.cutIdx);

        if (cur.slideIn < 0.2) {
          this.drawCutLines(ctx, cur, t);
        }
      }

      // 5. Großer brodelnder Suppenkessel rechts
      this.drawCauldron(ctx, t);

      // 6. Fliegendes Gemüse (Bogen in den Kessel)
      this.flying.forEach((fl) => {
        const x = fl.sx + (fl.tx - fl.sx) * fl.t;
        const y = fl.sy + (fl.ty - fl.sy) * fl.t - Math.sin(fl.t * Math.PI) * 95;
        drawVeggie(ctx, fl.def.id, x, y, 2, 0.65 * (1 - fl.t * 0.3));
      });

      // 7. Messer-Wischspur, Partikel & Schwebetexte
      if (this.swipeTrail.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = "#ffffff";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 4;
        ctx.beginPath();
        this.swipeTrail.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();
        ctx.restore();
      }

      this.particles.forEach((pt) => {
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, TAU);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      this.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / 0.45);
        ctx.font = "900 14px Orbitron, Rajdhani, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      this.drawHud(ctx, t);

      if (this.state === "intro") this.drawIntro(ctx);
      else if (this.state === "results") this.drawResults(ctx);
    },

    drawChefBlaui(ctx, t) {
      const bx = 104;
      const by = 224;
      const swing = this.chopAnim > 0 ? Math.sin(this.chopAnim * Math.PI) : 0;

      window.BLAUI_DRAW?.(ctx, bx, by, {
        facing: 1,
        t,
        scale: 1.65,
        pose: {
          armR: 1.1 + swing * 1.1,
          armL: 0.6,
          dy: -swing * 3
        }
      });

      // Kochmütze direkt oben auf Blauis Kopf/Kapuze
      ctx.save();
      ctx.translate(bx, by - 102 - swing * 4.5);
      ctx.scale(1.22, 1.22);
      ctx.fillStyle = "#f1f5f9";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-16, -6, 32, 10, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-9, -12, 9.5, 0, TAU);
      ctx.arc(0, -17, 11.5, 0, TAU);
      ctx.arc(9, -12, 9.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Niedliches Kochmesser in Blauis rechter Hand
      ctx.save();
      ctx.translate(bx + 46, by - 36 + swing * 18);
      ctx.rotate(-0.4 + swing * 0.9);
      ctx.scale(1.18, 1.18);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-10, -3, 12, 6);
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(2, -5);
      ctx.lineTo(26, -5);
      ctx.quadraticCurveTo(30, 3, 2, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },

    drawCutLines(ctx, cur, t) {
      cur.def.cuts.forEach((c, idx) => {
        const x1 = BOARD.x + c.x1;
        const y1 = BOARD.y + c.y1;
        const x2 = BOARD.x + c.x2;
        const y2 = BOARD.y + c.y2;

        if (idx < cur.cutIdx) {
          // Bereits geschnittene Linie
          ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          return;
        }

        const isNext = idx === cur.cutIdx;
        ctx.save();
        ctx.strokeStyle = isNext ? "#ef4444" : "rgba(239, 68, 68, 0.35)";
        ctx.lineWidth = isNext ? 3.2 : 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        if (isNext) {
          // Animierter Richtungspunkt + deutlicher Richtungspfeil (↓ / → / ↘)
          const p = (t * 1.8) % 1;
          const ax = x1 + (x2 - x1) * p;
          const ay = y1 + (y2 - y1) * p;
          ctx.fillStyle = "#fde047";
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(ax, ay, 7, 0, TAU);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#dc2626";
          ctx.font = "900 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(c.label || "↓", x1 - 14, y1);
        }
        ctx.restore();
      });
    },

    drawCauldron(ctx, t) {
      const px = POT.x;
      const py = POT.y;

      // Herdplatte & warmes Glühen unter dem Kessel
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(px, py + 54, 58, 12, 0, 0, TAU);
      ctx.fill();
      const heat = ctx.createRadialGradient(px, py + 52, 4, px, py + 52, 54);
      heat.addColorStop(0, "rgba(249, 115, 22, 0.55)");
      heat.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = heat;
      ctx.beginPath();
      ctx.ellipse(px, py + 52, 54, 14, 0, 0, TAU);
      ctx.fill();

      // Dampf
      this.steam.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.38 * (s.life / s.max)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      });

      // Seitliche Griffe mit Nieten
      [-56, 56].forEach((dx) => {
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(px + dx, py + 2, 10, dx < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, dx < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
        ctx.stroke();
      });

      // Realistischer Gusseisen-/Kupfer-Kessel
      const pg = ctx.createRadialGradient(px - 20, py - 2, 6, px, py + 12, 66);
      pg.addColorStop(0, "#64748b");
      pg.addColorStop(0.55, "#1e293b");
      pg.addColorStop(1, "#020617");
      ctx.fillStyle = pg;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(px, py + 12, 56, 44, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Glanzlicht auf der Kesselwand
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.beginPath();
      ctx.ellipse(px - 26, py + 10, 8, 22, 0.25, 0, TAU);
      ctx.fill();

      // Suppen-Oberfläche mit Gemüse-Brühe-Verlauf
      const sg = ctx.createRadialGradient(px, py - 20, 4, px, py - 20, 46);
      sg.addColorStop(0, "#fbbf24");
      sg.addColorStop(1, "#ea580c");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(px, py - 20, 47, 14, 0, 0, TAU);
      ctx.fill();

      // Blubbernde Bläschen & Kräuter-Stückchen
      for (let i = 0; i < 5; i++) {
        const bx = px - 26 + i * 13;
        const by = py - 21 + Math.sin(t * 5 + i * 2) * 3;
        ctx.fillStyle = i % 2 ? "#fde047" : "#4ade80";
        ctx.beginPath();
        ctx.arc(bx, by, 2.8 + Math.sin(t * 6 + i) * 1.1, 0, TAU);
        ctx.fill();
      }

      // Kupfer-Kesselrand
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.ellipse(px, py - 20, 49, 15, 0, 0, TAU);
      ctx.stroke();

      // Holzlöffel
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px + 12, py - 20);
      ctx.lineTo(px + 38, py - 56);
      ctx.stroke();
    },

    drawButton(ctx, id, label, x, y, w, h, color, size = 12) {
      this.ui.push({ id, x, y, w, h });
      ctx.save();
      ctx.fillStyle = "rgba(69, 26, 3, 0.92)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${size}px Orbitron, Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
      ctx.restore();
    },

    drawHud(ctx, t) {
      ctx.save();
      ctx.fillStyle = "rgba(69, 26, 3, 0.85)";
      ctx.strokeStyle = "rgba(244, 114, 182, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(10, 8, 560, 32, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const warn = this.state === "playing" && this.timeLeft <= 5;
      const blink = warn && Math.sin(t * 14) > 0;
      ctx.fillStyle = warn ? (blink ? "#ef4444" : "#fca5a5") : "#fde047";
      ctx.fillText(`⏱ ${Math.ceil(this.timeLeft)}s`, 22, 24);

      ctx.fillStyle = "#f9a8d4";
      ctx.fillText(`⭐ ${this.score} PKT`, 110, 24);

      ctx.fillStyle = "#86efac";
      ctx.fillText(`🥕 Zutaten: ${this.veggiesDone}`, 248, 24);

      if (this.current && this.state === "playing") {
        ctx.fillStyle = "#fef3c7";
        ctx.font = "700 12px Rajdhani, sans-serif";
        ctx.fillText(`${this.current.def.name} (${this.current.def.pts} PKT)`, 392, 24);
      }
      ctx.restore();

      this.drawButton(ctx, "hub", "↩ Oberwelt", W - 122, 8, 112, 32, "#f472b6", 11);
    },

    drawIntro(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(15, 5, 2, 0.68)";
      ctx.fillRect(0, 0, W, H);

      const px = 145;
      const py = 72;
      const pw = 430;
      const ph = 260;
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(131, 24, 67, 0.96)");
      g.addColorStop(1, "rgba(69, 26, 3, 0.96)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fde047";
      ctx.font = "900 20px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("🍲 MAMAS KÜCHE", W / 2, py + 38);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 13px Rajdhani, sans-serif";
      ctx.fillText("Schnipple in 60 Sekunden so viel Gemüse wie möglich!", W / 2, py + 74);
      ctx.fillStyle = "#fbcfe8";
      ctx.fillText("Schneide exakt in Pfeilrichtung (↓, → oder ↘)", W / 2, py + 104);
      ctx.fillText("per Wischen auf dem Brett oder mit Pfeiltasten / Joystick!", W / 2, py + 126);

      this.drawButton(ctx, "start", "🍳  KOCHEN STARTEN!", px + 70, py + 172, pw - 140, 44, "#4ade80", 14);
      ctx.restore();
    },

    drawResults(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(15, 5, 2, 0.72)";
      ctx.fillRect(0, 0, W, H);

      const px = 155;
      const py = 62;
      const pw = 410;
      const ph = 282;
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(131, 24, 67, 0.96)");
      g.addColorStop(1, "rgba(69, 26, 3, 0.96)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fde047";
      ctx.font = "900 19px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("🍲 SUPPE IST FERTIG!", W / 2, py + 36);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 26px Orbitron, Rajdhani, sans-serif";
      ctx.fillText(`${this.score} PUNKTE`, W / 2, py + 76);

      ctx.fillStyle = "#86efac";
      ctx.font = "700 14px Rajdhani, sans-serif";
      ctx.fillText(`Geschnittene Zutaten: ${this.veggiesDone}`, W / 2, py + 108);

      ctx.fillStyle = this.isNewHs ? "#4ade80" : "#fde047";
      ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
      ctx.fillText(this.isNewHs ? `🏆 NEUER HIGHSCORE: ${this.highscore}` : `Highscore: ${this.highscore}`, W / 2, py + 136);

      this.drawButton(ctx, "again", "↻  NOCHMAL KOCHEN", px + 40, py + 174, pw - 80, 38, "#4ade80", 13);
      this.drawButton(ctx, "hub", "↩  ZURÜCK ZUR OBERWELT", px + 40, py + 222, pw - 80, 34, "#38bdf8", 12);
      ctx.restore();
    }
  };

  window.BLAUIS_WELT_LEVELS?.register(scene);
})();
