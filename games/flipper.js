(() => {
  "use strict";

  // Logische Tisch-Dimensionen (klassischer Hochformat-Flipper)
  const TABLE_W = 420;
  const TABLE_H = 740;
  const BALL_R = 9.5;
  const GRAVITY = 790;
  const MAX_SPEED = 1150;
  const SUBSTEPS = 8;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function closestPointOnSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;
    if (lenSq <= 1e-8) return { x: ax, y: ay, t: 0 };
    const t = clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
    return { x: ax + abx * t, y: ay + aby * t, t };
  }

  function buildArchSegments(cx, cy, rx, ry, startAngle, endAngle, steps) {
    const segs = [];
    for (let i = 0; i < steps; i++) {
      const a0 = startAngle + ((endAngle - startAngle) * i) / steps;
      const a1 = startAngle + ((endAngle - startAngle) * (i + 1)) / steps;
      segs.push({
        x1: cx + Math.cos(a0) * rx,
        y1: cy + Math.sin(a0) * ry,
        x2: cx + Math.cos(a1) * rx,
        y2: cy + Math.sin(a1) * ry
      });
    }
    return segs;
  }

  // Kubische Bézier-Hilfsfunktion für weiche, realistische Rampen- & Schienenkurven
  function evalCubicBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    return {
      x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
      y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y
    };
  }

  function evalCubicTangent(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const dx =
      3 * mt * mt * (p1.x - p0.x) +
      6 * mt * t * (p2.x - p1.x) +
      3 * t * t * (p3.x - p2.x);
    const dy =
      3 * mt * mt * (p1.y - p0.y) +
      6 * mt * t * (p2.y - p1.y) +
      3 * t * t * (p3.y - p2.y);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  // Abgerundetes Dreieck (für realistische Slingshot-Plastics & Gummiringe)
  function traceRoundedPoly(ctx, pts, radius) {
    ctx.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n];
      const curr = pts[i];
      const next = pts[(i + 1) % n];

      const v1x = prev.x - curr.x;
      const v1y = prev.y - curr.y;
      const l1 = Math.hypot(v1x, v1y) || 1;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;
      const l2 = Math.hypot(v2x, v2y) || 1;

      const r = Math.min(radius, l1 * 0.4, l2 * 0.4);
      const sx = curr.x + (v1x / l1) * r;
      const sy = curr.y + (v1y / l1) * r;
      const ex = curr.x + (v2x / l2) * r;
      const ey = curr.y + (v2y / l2) * r;

      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
      ctx.quadraticCurveTo(curr.x, curr.y, ex, ey);
    }
    ctx.closePath();
  }

  // Realistischer Chrome-Post (Schraube / Pfosten mit Gummiring)
  function drawChromePost(ctx, x, y, r = 5.5, rubberColor = null) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.beginPath();
    ctx.arc(x + 1.5, y + 2, r + (rubberColor ? 2 : 0.5), 0, Math.PI * 2);
    ctx.fill();

    if (rubberColor) {
      ctx.fillStyle = rubberColor;
      ctx.beginPath();
      ctx.arc(x, y, r + 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, "#cbd5e1");
    grad.addColorStop(0.85, "#64748b");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Kleiner Schraubenkopf in der Mitte
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  // Klassische Web-Audio-API Flipper-Sounds (mechanisches Klacken, Bumper-Spule, Glocke, Fanfare)
  class FlipperAudio {
    constructor(hubSound) {
      this.hubSound = hubSound;
    }

    getCtx() {
      try {
        return this.hubSound?.ensureContext?.() || null;
      } catch {
        return null;
      }
    }

    playFlipperUp() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.exponentialRampToValueAtTime(62, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    playFlipperDown() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.035);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    }

    playBumper(pitchBoost = 0, kind = "pop") {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const base = (kind === "star" ? 560 : kind === "jet" ? 680 : 390) + pitchBoost * 65;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "star" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.65, now + 0.035);
      osc.frequency.exponentialRampToValueAtTime(base * 0.78, now + 0.12);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    }

    playSlingshot() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.055);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    }

    playPlunger() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.12);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    playRamp() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.24);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
    }

    playMultiballFanfare() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.085;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.075, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.23);
      });
    }

    playTarget() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(1080, now + 0.07);
      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }

    playDrain() {
      const ctx = this.getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.28);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    }
  }

  window.GAME_REGISTRY?.register({
    id: "flipper",
    name: "Classic Pinball",
    subtitle: "3 Flipper • Pop- & Star-Bumper • Drahtrampe & 3er-Multiball",
    tag: "Arcade Klassiker",
    icon: "⚡",
    description: "Realistischer Flipper-Automat mit lackiertem Spielfeld, Pop-Bumpern, Drahtrampe und 3er-Multiball.",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.sfx = new FlipperAudio(ctx.sound);
      this.rafId = null;
      this.lastTime = 0;
      this.animClock = 0;
      this.paused = false;
      this.phase = "playing";

      this.score = 0;
      this.bestScore = ctx.storage.get("best_score", 0);
      this.ballNumber = 1;
      this.maxBalls = 3;
      this.multiplier = 1;
      this.multiballBannerTimer = 0;
      this.calloutText = "";
      this.calloutTimer = 0;
      this.calloutColor = "#fbbf24";

      this.keys = { left: false, right: false, plunge: false };
      this.touchFlippers = { left: false, right: false };
      this.activePointers = new Map();
      this.plungerTouchActive = false;

      this.plunger = {
        x: 392,
        restY: 662,
        maxPull: 56,
        charge: 0,
        charging: false
      };

      this.multiballHole = {
        x: 162,
        y: 84,
        r: 17,
        flash: 0,
        cooldown: 0
      };
      this.holeLockTimer = 0;
      this.lockedBallRef = null;
      this.pendingEjectQueue = [];

      this.buildTableGeometry();
      this.bgCanvas = this.createRealisticPlayfield();

      // DOM aufbauen
      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex flex-col items-center justify-center bg-[#09080c] overflow-hidden select-none";

      // Klassische Dot-Matrix-Display (DMD) Score-Leiste
      this.hud = document.createElement("div");
      this.hud.className = "w-full max-w-[460px] shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 font-orbitron text-[11px] sm:text-xs bg-[#120a04] border-b-2 border-amber-600/50";

      this.canvasWrap = document.createElement("div");
      this.canvasWrap.className = "relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block touch-none";
      this.canvasCtx = this.canvas.getContext("2d", { alpha: false });

      this.plungeBtn = document.createElement("button");
      this.plungeBtn.type = "button";
      this.plungeBtn.className =
        "hidden absolute right-3 bottom-4 z-10 px-3.5 py-2.5 rounded-full font-orbitron text-[11px] font-black tracking-wider uppercase border-2 border-amber-300/90 bg-gradient-to-b from-red-600 to-red-900 text-amber-100 active:scale-95 touch-none";
      this.plungeBtn.textContent = "ABSCHUSS";

      this.overlay = document.createElement("div");
      this.overlay.className = "hidden absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-4";

      this.canvasWrap.appendChild(this.canvas);
      this.canvasWrap.appendChild(this.plungeBtn);
      this.root.appendChild(this.hud);
      this.root.appendChild(this.canvasWrap);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onKeyUp = this.handleKeyUp.bind(this);
      this.onPointerDown = this.handlePointerDown.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerUp = this.handlePointerUp.bind(this);
      this.onPlungeDown = this.handlePlungeDown.bind(this);
      this.onPlungeUp = this.handlePlungeUp.bind(this);

      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
      this.canvas.addEventListener("pointerdown", this.onPointerDown);
      this.canvas.addEventListener("pointermove", this.onPointerMove);
      this.canvas.addEventListener("pointerup", this.onPointerUp);
      this.canvas.addEventListener("pointercancel", this.onPointerUp);
      this.plungeBtn.addEventListener("pointerdown", this.onPlungeDown);
      this.plungeBtn.addEventListener("pointerup", this.onPlungeUp);
      this.plungeBtn.addEventListener("pointercancel", this.onPlungeUp);

      this.view = { scale: 1, offsetX: 0, offsetY: 0, cssW: 420, cssH: 740 };
      this.resize();
      this.startNewGame();
    },

    buildTableGeometry() {
      // Kollisions-Wände (unsichtbar bzw. exakt unter den realistisch gezeichneten Metallschienen)
      this.walls = [
        // Linke & rechte Außenbanden
        { x1: 14, y1: 145, x2: 14, y2: 615, r: 4 },
        { x1: 406, y1: 145, x2: 406, y2: 718, r: 4 },
        { x1: 376, y1: 718, x2: 406, y2: 718, r: 4 },
        // Abschussbahn-Trennwand
        { x1: 376, y1: 158, x2: 376, y2: 718, r: 4 },

        // Untere Apron-Schrägen zum Drain
        { x1: 14, y1: 615, x2: 118, y2: 678, r: 4 },
        { x1: 376, y1: 615, x2: 266, y2: 678, r: 4 },

        // Linke Inlane-Metallführung
        { x1: 48, y1: 505, x2: 48, y2: 598, r: 3.5 },
        { x1: 48, y1: 598, x2: 128, y2: 646, r: 3.5 },

        // Rechte Inlane-Metallführung
        { x1: 338, y1: 505, x2: 338, y2: 598, r: 3.5 },
        { x1: 338, y1: 598, x2: 256, y2: 646, r: 3.5 },

        // Obere Rollover-Trenner (A-B-C)
        { x1: 218, y1: 54, x2: 218, y2: 88, r: 3.5 },
        { x1: 264, y1: 54, x2: 264, y2: 88, r: 3.5 },

        // Obere Leitplanke neben Rampen-Eingang
        { x1: 108, y1: 235, x2: 122, y2: 180, r: 3.5 },

        // Führungs-Schiene zum oberen Flipper rechts (hoch & sanft platziert)
        { x1: 376, y1: 214, x2: 358, y2: 266, r: 3.5 }
      ];

      // Weicher oberer Bogen (32 Segmente für absolut runde Physik)
      const topArch = buildArchSegments(210, 145, 196, 128, Math.PI, Math.PI * 2, 32);
      for (const s of topArch) {
        this.walls.push({ ...s, r: 4 });
      }

      this.oneWayGate = {
        x1: 376,
        y1: 158,
        x2: 350,
        y2: 112,
        nx: -0.84,
        ny: 0.54
      };

      // A - B - C Top Rollover Lanes
      this.rollovers = [
        { x: 196, y: 70, r: 13, label: "A", lit: false, cooldown: 0 },
        { x: 241, y: 70, r: 13, label: "B", lit: false, cooldown: 0 },
        { x: 286, y: 70, r: 13, label: "C", lit: false, cooldown: 0 }
      ];

      // Klassische Slingshots (mit abgerundeten Plastics, 3 Chrome-Posts & weißem Gummi)
      this.slingshots = [
        {
          pts: [
            { x: 66, y: 505 },
            { x: 66, y: 578 },
            { x: 114, y: 604 }
          ],
          kicker: { x1: 66, y1: 505, x2: 114, y2: 604 },
          flash: 0
        },
        {
          pts: [
            { x: 320, y: 505 },
            { x: 320, y: 578 },
            { x: 272, y: 604 }
          ],
          kicker: { x1: 320, y1: 505, x2: 272, y2: 604 },
          flash: 0
        }
      ];

      // Verschiedene realistische Bumper: Pop-Bumper (Pilzkappen), Star-Turbo-Bumper, Gummiposten (Jet-Posts)
      this.bumpers = [
        {
          kind: "pop",
          x: 168,
          y: 160,
          r: 22,
          kick: 495,
          points: 100,
          capTop: "#ef4444",
          capDark: "#7f1d1d",
          ring: "#fef08a",
          skirt: "#fca5a5",
          label: "100",
          flash: 0
        },
        {
          kind: "pop",
          x: 262,
          y: 152,
          r: 22,
          kick: 495,
          points: 100,
          capTop: "#3b82f6",
          capDark: "#1e3a8a",
          ring: "#e0f2fe",
          skirt: "#93c5fd",
          label: "100",
          flash: 0
        },
        {
          kind: "pop",
          x: 284,
          y: 204,
          r: 19,
          kick: 485,
          points: 150,
          capTop: "#10b981",
          capDark: "#064e3b",
          ring: "#fef08a",
          skirt: "#6ee7b7",
          label: "150",
          flash: 0
        },
        {
          kind: "star",
          x: 214,
          y: 220,
          r: 24,
          kick: 560,
          points: 250,
          capTop: "#f59e0b",
          capDark: "#78350f",
          ring: "#fef9c3",
          skirt: "#fde68a",
          label: "250",
          flash: 0
        },
        // 2 realistische Gummiposten-Bumper (Mini Jet-Posts mit rotem/gelbem Gummiring)
        {
          kind: "jet",
          x: 118,
          y: 132,
          r: 12,
          kick: 440,
          points: 75,
          capTop: "#facc15",
          capDark: "#a16207",
          ring: "#ffffff",
          skirt: "#fde047",
          label: "",
          flash: 0
        },
        {
          kind: "jet",
          x: 328,
          y: 152,
          r: 12,
          kick: 440,
          points: 75,
          capTop: "#f43f5e",
          capDark: "#881337",
          ring: "#ffffff",
          skirt: "#fda4af",
          label: "",
          flash: 0
        }
      ];

      // Standup / Drop-Targets (Diagonalbank Mitte-Links)
      this.targets = [
        { x1: 122, y1: 345, x2: 142, y2: 322, hit: false, flash: 0, points: 250, color: "#ef4444" },
        { x1: 148, y1: 316, x2: 168, y2: 295, hit: false, flash: 0, points: 250, color: "#f59e0b" },
        { x1: 176, y1: 289, x2: 198, y2: 272, hit: false, flash: 0, points: 250, color: "#22c55e" }
      ];

      // Weiche kubische Bézier-Rampe (kein eckiger Polygonzug!)
      this.ramp = {
        entry: { x: 64, y: 278, r: 24 },
        p0: { x: 64, y: 278 },
        p1: { x: 24, y: 172 },
        p2: { x: 58, y: 80 },
        p3: { x: 162, y: 84 }
      };

      // 3 klassische Flipper-Schläger
      this.flippers = [
        {
          id: "left",
          side: "left",
          px: 128,
          py: 646,
          length: 62,
          r1: 8.5,
          r2: 5.5,
          restAngle: 0.48,
          activeAngle: -0.54,
          angle: 0.48,
          prevAngle: 0.48,
          omega: 0,
          active: false
        },
        {
          id: "right",
          side: "right",
          px: 256,
          py: 646,
          length: 62,
          r1: 8.5,
          r2: 5.5,
          restAngle: Math.PI - 0.48,
          activeAngle: Math.PI + 0.54,
          angle: Math.PI - 0.48,
          prevAngle: Math.PI - 0.48,
          omega: 0,
          active: false
        },
        {
          id: "upper_right",
          side: "right",
          px: 358,
          py: 266,
          length: 48,
          r1: 7.5,
          r2: 5,
          restAngle: Math.PI - 0.30,
          activeAngle: Math.PI + 0.58,
          angle: Math.PI - 0.30,
          prevAngle: Math.PI - 0.30,
          omega: 0,
          active: false
        }
      ];

      this.balls = [];
      this.particles = [];
      this.popups = [];
    },

    // Hochauflösendes, realistisches Flipper-Spielfeld einmalig auf Offscreen-Canvas vorrendern (2x)
    createRealisticPlayfield() {
      const scale = 2;
      const off = document.createElement("canvas");
      off.width = TABLE_W * scale;
      off.height = TABLE_H * scale;
      const g = off.getContext("2d");
      g.scale(scale, scale);

      // 1. Dunkler Außenrahmen (Holz-Cabinet außen)
      g.fillStyle = "#0e0c10";
      g.fillRect(0, 0, TABLE_W, TABLE_H);

      // 2. Spielfeld-Grundfläche (Clip auf geschwungene Tischform mit rundem Top-Arch)
      g.save();
      g.beginPath();
      g.moveTo(14, 720);
      g.lineTo(14, 145);
      g.ellipse(210, 145, 196, 128, 0, Math.PI, Math.PI * 2);
      g.lineTo(406, 720);
      g.closePath();
      g.clip();

      // Lackiertes Ahorn-Holz / klassisches sattes Flipper-Playfield (warmes Tiefblau-Bordeaux-Holz)
      const baseGrad = g.createLinearGradient(0, 0, 0, TABLE_H);
      baseGrad.addColorStop(0, "#1d2442");
      baseGrad.addColorStop(0.32, "#19223d");
      baseGrad.addColorStop(0.62, "#231932");
      baseGrad.addColorStop(0.86, "#3a2518");
      baseGrad.addColorStop(1, "#26160d");
      g.fillStyle = baseGrad;
      g.fillRect(0, 0, TABLE_W, TABLE_H);

      // Feine Holzmaserung (lackiertes Playfield-Holz)
      g.strokeStyle = "rgba(255, 224, 178, 0.032)";
      g.lineWidth = 1.2;
      for (let x = 18; x < 404; x += 6) {
        g.beginPath();
        g.moveTo(x, 15);
        g.bezierCurveTo(
          x + Math.sin(x * 0.13) * 5,
          240,
          x - Math.cos(x * 0.09) * 6,
          500,
          x + Math.sin(x * 0.17) * 4,
          720
        );
        g.stroke();
      }

      // Klassische geschwungene Flipper-Spielfeld-Bemalung (Sunburst & Kurven, keine eckigen Kästen!)
      g.save();
      g.translate(192, 430);
      for (let i = 0; i < 16; i++) {
        const a0 = (i * Math.PI * 2) / 16;
        const a1 = a0 + Math.PI / 22;
        g.fillStyle = i % 2 === 0 ? "rgba(251, 191, 36, 0.06)" : "rgba(239, 68, 68, 0.055)";
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, 240, a0, a1);
        g.closePath();
        g.fill();
      }

      // Geschwungener Zentral-Medaillon-Druck auf dem Holz
      const medGrad = g.createRadialGradient(0, 0, 12, 0, 0, 82);
      medGrad.addColorStop(0, "rgba(245, 158, 11, 0.24)");
      medGrad.addColorStop(0.55, "rgba(185, 28, 28, 0.22)");
      medGrad.addColorStop(0.85, "rgba(30, 58, 138, 0.28)");
      medGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      g.fillStyle = medGrad;
      g.beginPath();
      g.arc(0, 0, 82, 0, Math.PI * 2);
      g.fill();

      // Goldene Zierkreise (klassischer 80s/90s Arcade-Druck)
      g.strokeStyle = "rgba(253, 224, 71, 0.35)";
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(0, 0, 62, 0, Math.PI * 2);
      g.stroke();

      g.strokeStyle = "rgba(248, 113, 113, 0.32)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(0, 0, 52, 0, Math.PI * 2);
      g.stroke();

      // Stern-Emblem in der Mitte
      g.fillStyle = "rgba(253, 224, 71, 0.16)";
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? 34 : 15;
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
      g.restore();

      // Warme Glühlampen-Spotlights auf dem Spielfeld (oben bei Bumpern & Mitte)
      const warmTop = g.createRadialGradient(225, 185, 10, 225, 185, 155);
      warmTop.addColorStop(0, "rgba(254, 240, 138, 0.16)");
      warmTop.addColorStop(0.55, "rgba(251, 146, 60, 0.06)");
      warmTop.addColorStop(1, "rgba(0, 0, 0, 0)");
      g.fillStyle = warmTop;
      g.fillRect(0, 0, TABLE_W, TABLE_H);

      // Geschwungene Zierbögen um die Bumper-Zone
      g.strokeStyle = "rgba(253, 224, 71, 0.22)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(220, 188, 96, Math.PI * 1.05, Math.PI * 1.95);
      g.stroke();

      // Dekorative Kunststoff-Oberflächen (Upper Plastics) mit weichen Kurven & Schrauben
      // Linkes oberes Plastic
      g.save();
      g.fillStyle = "rgba(0, 0, 0, 0.35)";
      g.beginPath();
      g.moveTo(16, 358);
      g.quadraticCurveTo(54, 382, 46, 488);
      g.lineTo(16, 488);
      g.closePath();
      g.fill();

      const plGradL = g.createLinearGradient(14, 355, 50, 488);
      plGradL.addColorStop(0, "#b91c1c");
      plGradL.addColorStop(0.5, "#dc2626");
      plGradL.addColorStop(1, "#7f1d1d");
      g.fillStyle = plGradL;
      g.beginPath();
      g.moveTo(14, 355);
      g.quadraticCurveTo(50, 380, 44, 486);
      g.lineTo(14, 486);
      g.closePath();
      g.fill();
      g.strokeStyle = "#fde047";
      g.lineWidth = 1.6;
      g.stroke();
      g.restore();

      // Rechtes mittleres Plastic unter dem oberen Flipper
      g.save();
      const plGradR = g.createLinearGradient(340, 360, 376, 486);
      plGradR.addColorStop(0, "#1d4ed8");
      plGradR.addColorStop(0.5, "#2563eb");
      plGradR.addColorStop(1, "#1e3a8a");
      g.fillStyle = plGradR;
      g.beginPath();
      g.moveTo(374, 360);
      g.quadraticCurveTo(336, 388, 342, 486);
      g.lineTo(374, 486);
      g.closePath();
      g.fill();
      g.strokeStyle = "#fde047";
      g.lineWidth = 1.6;
      g.stroke();
      g.restore();

      // Eingelassene Playfield-Pfeil-Inserts (Rampe & Lock) mit schwarzer Fassung
      const drawPlayfieldInsert = (x, y, ang, fill, stroke, text) => {
        g.save();
        g.translate(x, y);
        g.rotate(ang);
        g.fillStyle = "#09090b";
        g.beginPath();
        g.moveTo(0, -17);
        g.quadraticCurveTo(13, -3, 12, 5);
        g.lineTo(5, 5);
        g.lineTo(5, 16);
        g.quadraticCurveTo(0, 18, -5, 16);
        g.lineTo(-5, 5);
        g.lineTo(-12, 5);
        g.quadraticCurveTo(-13, -3, 0, -17);
        g.closePath();
        g.fill();

        const ig = g.createRadialGradient(0, 0, 1, 0, 0, 16);
        ig.addColorStop(0, "#ffffff");
        ig.addColorStop(0.45, fill);
        ig.addColorStop(1, stroke);
        g.fillStyle = ig;
        g.beginPath();
        g.moveTo(0, -14);
        g.quadraticCurveTo(10, -2, 9, 3);
        g.lineTo(3.5, 3);
        g.lineTo(3.5, 13);
        g.lineTo(-3.5, 13);
        g.lineTo(-3.5, 3);
        g.lineTo(-9, 3);
        g.quadraticCurveTo(-10, -2, 0, -14);
        g.closePath();
        g.fill();
        g.restore();

        if (text) {
          g.fillStyle = "#fef3c7";
          g.font = "800 8px Orbitron, sans-serif";
          g.textAlign = "center";
          g.fillText(text, x, y + 26);
        }
      };

      drawPlayfieldInsert(75, 330, -0.32, "#38bdf8", "#0369a1", "RAMPE");
      drawPlayfieldInsert(162, 124, 0, "#fbbf24", "#b45309", "MULTIBALL");

      // Inlane / Outlane bemalte Holz-Streifen
      g.fillStyle = "rgba(251, 191, 36, 0.14)";
      g.fillRect(18, 515, 26, 95);
      g.fillRect(342, 515, 28, 95);

      // Abschussbahn (Holz-Rinne mit Metall-Glanz & Skala)
      const laneGrad = g.createLinearGradient(376, 0, 406, 0);
      laneGrad.addColorStop(0, "#1c120a");
      laneGrad.addColorStop(0.5, "#3d2616");
      laneGrad.addColorStop(1, "#180f08");
      g.fillStyle = laneGrad;
      g.fillRect(376, 155, 30, 565);

      g.strokeStyle = "rgba(253, 224, 71, 0.35)";
      g.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const ty = 656 + i * 8;
        g.beginPath();
        g.moveTo(379, ty);
        g.lineTo(385, ty);
        g.stroke();
      }

      // Realistischer unterer Flipper-Apron (geschwungene Metall-Abdeckung unten links & rechts vom Drain)
      const apronGrad = g.createLinearGradient(0, 615, 0, 740);
      apronGrad.addColorStop(0, "#27272a");
      apronGrad.addColorStop(0.35, "#18181b");
      apronGrad.addColorStop(1, "#09090b");
      g.fillStyle = apronGrad;

      // Linker Apron-Flügel
      g.beginPath();
      g.moveTo(14, 615);
      g.lineTo(118, 678);
      g.quadraticCurveTo(132, 686, 132, 740);
      g.lineTo(14, 740);
      g.closePath();
      g.fill();
      g.strokeStyle = "#d4d4d8";
      g.lineWidth = 2.2;
      g.stroke();

      // Rechter Apron-Flügel
      g.beginPath();
      g.moveTo(376, 615);
      g.lineTo(266, 678);
      g.quadraticCurveTo(252, 686, 252, 740);
      g.lineTo(376, 740);
      g.closePath();
      g.fill();
      g.strokeStyle = "#d4d4d8";
      g.lineWidth = 2.2;
      g.stroke();

      // Goldene Zierlinien auf dem Apron
      g.strokeStyle = "rgba(245, 158, 11, 0.55)";
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(22, 632);
      g.lineTo(110, 684);
      g.moveTo(368, 632);
      g.lineTo(274, 684);
      g.stroke();

      // Kleine klassische Instruktions-Plakette auf dem linken Apron
      g.fillStyle = "#fef3c7";
      g.beginPath();
      g.roundRect(24, 682, 78, 36, 4);
      g.fill();
      g.strokeStyle = "#92400e";
      g.lineWidth = 1.2;
      g.stroke();
      g.fillStyle = "#451a03";
      g.font = "800 6.5px Orbitron, sans-serif";
      g.textAlign = "center";
      g.fillText("3 BALLS", 63, 696);
      g.fillText("MULTIBALL", 63, 707);

      g.restore(); // Ende Spielfeld-Clip

      // 3. Gebürstete Edelstahl-Banden & Top-Arch-Chrome-Rahmen
      const drawMetallicRail = (x1, y1, x2, y2, width = 7) => {
        // Schatten
        g.strokeStyle = "rgba(0, 0, 0, 0.5)";
        g.lineCap = "round";
        g.lineWidth = width + 2;
        g.beginPath();
        g.moveTo(x1 + 1.5, y1 + 2);
        g.lineTo(x2 + 1.5, y2 + 2);
        g.stroke();
        // Stahl-Körper
        g.strokeStyle = "#64748b";
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        // Chrome-Glanzkante
        g.strokeStyle = "#f1f5f9";
        g.lineWidth = width * 0.34;
        g.beginPath();
        g.moveTo(x1 - 0.6, y1 - 0.6);
        g.lineTo(x2 - 0.6, y2 - 0.6);
        g.stroke();
      };

      // Außen-Chrome-Bogen oben + Seiten
      g.save();
      g.strokeStyle = "#475569";
      g.lineWidth = 11;
      g.beginPath();
      g.moveTo(12, 724);
      g.lineTo(12, 145);
      g.ellipse(210, 145, 198, 130, 0, Math.PI, Math.PI * 2);
      g.lineTo(408, 724);
      g.stroke();

      g.strokeStyle = "#e2e8f0";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(12, 724);
      g.lineTo(12, 145);
      g.ellipse(210, 145, 198, 130, 0, Math.PI, Math.PI * 2);
      g.lineTo(408, 724);
      g.stroke();
      g.restore();

      // Innere Metall-Schienen (Abschussbahn, Inlanes, Top-Rollover-Trenner, obere Führung)
      drawMetallicRail(376, 158, 376, 718, 7);
      drawMetallicRail(48, 505, 48, 598, 6);
      drawMetallicRail(48, 598, 128, 646, 6);
      drawMetallicRail(338, 505, 338, 598, 6);
      drawMetallicRail(338, 598, 256, 646, 6);
      drawMetallicRail(218, 54, 218, 88, 6);
      drawMetallicRail(264, 54, 264, 88, 6);
      drawMetallicRail(108, 235, 122, 180, 6);
      drawMetallicRail(376, 214, 358, 266, 6);

      // Chrome-Pfosten an allen Schienen-Endpunkten (damit nichts eckig wirkt!)
      drawChromePost(g, 48, 505, 5.5, "#ef4444");
      drawChromePost(g, 48, 598, 5);
      drawChromePost(g, 338, 505, 5.5, "#ef4444");
      drawChromePost(g, 338, 598, 5);
      drawChromePost(g, 218, 54, 4.5, "#facc15");
      drawChromePost(g, 218, 88, 4.5, "#facc15");
      drawChromePost(g, 264, 54, 4.5, "#facc15");
      drawChromePost(g, 264, 88, 4.5, "#facc15");
      drawChromePost(g, 108, 235, 5, "#ef4444");
      drawChromePost(g, 122, 180, 5, "#ef4444");
      drawChromePost(g, 376, 158, 5.5);
      drawChromePost(g, 376, 214, 4.8);

      return off;
    },

    createBall(x, y, vx = 0, vy = 0, inShooter = false) {
      return {
        x,
        y,
        vx,
        vy,
        r: BALL_R,
        inShooter,
        onRamp: false,
        rampProgress: 0,
        rampSpeed: 0,
        trail: []
      };
    },

    startNewGame() {
      this.phase = "playing";
      this.score = 0;
      this.ballNumber = 1;
      this.multiplier = 1;
      this.multiballBannerTimer = 0;
      this.calloutTimer = 0;
      this.holeLockTimer = 0;
      this.lockedBallRef = null;
      this.pendingEjectQueue = [];
      this.particles = [];
      this.popups = [];
      this.plunger.charge = 0;
      this.plunger.charging = false;

      for (const t of this.targets) {
        t.hit = false;
        t.flash = 0;
      }
      for (const r of this.rollovers) {
        r.lit = false;
        r.cooldown = 0;
      }

      if (this.overlay) {
        this.overlay.classList.add("hidden");
        this.overlay.innerHTML = "";
      }

      this.spawnBallInShooter();
      this.updateHud();
    },

    spawnBallInShooter() {
      this.balls = [
        this.createBall(this.plunger.x, this.plunger.restY - BALL_R - 2, 0, 0, true)
      ];
      this.updatePlungeButtonVisibility();
    },

    addScore(basePoints, popupX = null, popupY = null, popupColor = "#fde047") {
      const gained = Math.round(basePoints * this.multiplier);
      this.score += gained;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.ctx?.storage?.set?.("best_score", this.bestScore);
      }
      if (popupX !== null && popupY !== null) {
        this.popups.push({
          x: popupX,
          y: popupY,
          text: `+${gained}`,
          color: popupColor,
          life: 0.65,
          maxLife: 0.65
        });
      }
      this.updateHud();
    },

    showCallout(text, color = "#fde047", duration = 1.1) {
      this.calloutText = text;
      this.calloutColor = color;
      this.calloutTimer = duration;
    },

    spawnParticles(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 150;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.22 + Math.random() * 0.22,
          maxLife: 0.44,
          color,
          size: 2 + Math.random() * 2.2
        });
      }
    },

    updateHud() {
      if (!this.hud) return;
      const activeCount = this.balls.length + (this.lockedBallRef ? 1 : 0) + this.pendingEjectQueue.length;
      const mbBadge = activeCount > 1 ? `<span class="text-red-400">MB x${activeCount}</span>` : "";
      this.hud.innerHTML = `
        <span class="text-amber-400">SCORE ${String(this.score).padStart(6, "0")}</span>
        <span class="text-yellow-300">${this.multiplier}x</span>
        ${mbBadge}
        <span class="text-orange-300">BALL ${this.ballNumber}/${this.maxBalls}</span>
        <span class="text-amber-500/90">HI ${this.bestScore}</span>
      `;
    },

    updatePlungeButtonVisibility() {
      if (!this.plungeBtn) return;
      const hasShooterBall = this.balls.some((b) => b.inShooter && b.x > 372);
      if (hasShooterBall && this.phase === "playing") {
        this.plungeBtn.classList.remove("hidden");
      } else {
        this.plungeBtn.classList.add("hidden");
        this.plungerTouchActive = false;
      }
    },

    releasePlunger() {
      if (!this.plunger.charging) return;
      this.plunger.charging = false;
      const power = Math.max(0.28, this.plunger.charge);
      this.plunger.charge = 0;

      const shooterBall = this.balls.find((b) => b.inShooter && b.y > this.plunger.restY - 35);
      if (shooterBall) {
        const launchSpeed = 680 + power * 430 + (Math.random() * 30 - 15);
        shooterBall.vy = -launchSpeed;
        shooterBall.vx = (Math.random() - 0.5) * 14;
        this.sfx.playPlunger();
        this.spawnParticles(shooterBall.x, shooterBall.y + BALL_R, "#fde047", 8);
      }
    },

    triggerMultiball(capturedBall) {
      this.multiballHole.flash = 1.0;
      this.multiballHole.cooldown = 2.0;
      this.multiballBannerTimer = 2.2;
      this.showCallout("MULTIBALL!", "#fde047", 1.8);
      this.addScore(1000, this.multiballHole.x, this.multiballHole.y + 20, "#fde047");
      this.sfx.playMultiballFanfare();
      this.spawnParticles(this.multiballHole.x, this.multiballHole.y, "#fde047", 24);

      const idx = this.balls.indexOf(capturedBall);
      if (idx !== -1) {
        this.balls.splice(idx, 1);
      }
      this.lockedBallRef = capturedBall;
      this.holeLockTimer = 0.55;

      const existing = this.balls.length;
      const needed = Math.max(1, 3 - existing);
      this.pendingEjectQueue = [];
      for (let i = 0; i < needed; i++) {
        const spread = (i - (needed - 1) / 2) * 115 + (Math.random() * 30 - 15);
        this.pendingEjectQueue.push({
          delay: 0.55 + i * 0.34,
          vx: 160 + spread,
          vy: 230 + Math.random() * 70
        });
      }
      this.updateHud();
    },

    getRampPosition(t) {
      const r = this.ramp;
      return evalCubicBezier(r.p0, r.p1, r.p2, r.p3, clamp(t, 0, 1));
    },

    updateFlippers(subDt) {
      const leftActive = this.keys.left || this.touchFlippers.left;
      const rightActive = this.keys.right || this.touchFlippers.right;

      for (const fl of this.flippers) {
        const nextActive = fl.side === "left" ? leftActive : rightActive;
        if (nextActive && !fl.active) {
          if (fl.id === "left" || fl.id === "right") {
            this.sfx.playFlipperUp();
          }
        } else if (!nextActive && fl.active) {
          if (fl.id === "left" || fl.id === "right") {
            this.sfx.playFlipperDown();
          }
        }
        fl.active = nextActive;
        fl.prevAngle = fl.angle;

        const target = fl.active ? fl.activeAngle : fl.restAngle;
        const speed = fl.active ? 24 : 15;
        const diff = target - fl.angle;
        const maxStep = speed * subDt;

        if (Math.abs(diff) <= maxStep) {
          fl.angle = target;
        } else {
          fl.angle += Math.sign(diff) * maxStep;
        }
        fl.omega = (fl.angle - fl.prevAngle) / subDt;
      }
    },

    collideBallWithSegment(ball, x1, y1, x2, y2, segRadius, restitution = 0.65, extraKick = 0) {
      const cp = closestPointOnSegment(ball.x, ball.y, x1, y1, x2, y2);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + segRadius;

      if (dist < minDist && dist > 1e-6) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = cp.x + nx * minDist;
        ball.y = cp.y + ny * minDist;

        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= (1 + restitution) * vn * nx;
          ball.vy -= (1 + restitution) * vn * ny;
          if (extraKick > 0) {
            ball.vx += nx * extraKick;
            ball.vy += ny * extraKick;
          }
          return true;
        }
      }
      return false;
    },

    collideBallWithFlipper(ball, fl) {
      const tipX = fl.px + Math.cos(fl.angle) * fl.length;
      const tipY = fl.py + Math.sin(fl.angle) * fl.length;
      const cp = closestPointOnSegment(ball.x, ball.y, fl.px, fl.py, tipX, tipY);
      const flRadius = fl.r1 + (fl.r2 - fl.r1) * cp.t;

      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + flRadius;

      if (dist < minDist && dist > 1e-6) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = cp.x + nx * minDist;
        ball.y = cp.y + ny * minDist;

        const rx = cp.x - fl.px;
        const ry = cp.y - fl.py;
        const surfVx = -fl.omega * ry;
        const surfVy = fl.omega * rx;

        const relVx = ball.vx - surfVx;
        const relVy = ball.vy - surfVy;
        const relVn = relVx * nx + relVy * ny;

        if (relVn < 0) {
          const restitution = 0.58;
          ball.vx -= (1 + restitution) * relVn * nx;
          ball.vy -= (1 + restitution) * relVn * ny;

          const isSwingingUp =
            (fl.side === "left" && fl.omega < -1.5) ||
            (fl.side === "right" && fl.omega > 1.5);

          // Aktiven Schlag nur auf der Ober-/Schlagseite auslösen (nie von unten ins Aus schlagen!)
          if (isSwingingUp && ny < 0.25) {
            const tipFactor = 0.35 + cp.t * 0.95;
            const kick = 250 * tipFactor;
            ball.vx += nx * kick;
            ball.vy += ny * kick - 70 * cp.t;
            if (fl.id === "upper_right") {
              // Oberer Schläger zielt sauber quer/hoch Richtung Rampe & Bumper
              ball.vy = Math.min(ball.vy, -140);
            }
            this.spawnParticles(cp.x, cp.y, "#fef08a", 4);
          }
        }
      }
    },

    stepPhysics(dt) {
      const subDt = dt / SUBSTEPS;

      for (let step = 0; step < SUBSTEPS; step++) {
        this.updateFlippers(subDt);

        for (const ball of this.balls) {
          if (ball.onRamp) continue;

          ball.vy += GRAVITY * subDt;
          ball.vx *= 1 - 0.04 * subDt;
          ball.vy *= 1 - 0.04 * subDt;

          const spd = Math.hypot(ball.vx, ball.vy);
          if (spd > MAX_SPEED) {
            const s = MAX_SPEED / spd;
            ball.vx *= s;
            ball.vy *= s;
          }

          ball.x += ball.vx * subDt;
          ball.y += ball.vy * subDt;

          if (ball.inShooter && ball.x < 370) {
            ball.inShooter = false;
          }

          if (ball.x > 376) {
            const plungerTopY = this.plunger.restY + this.plunger.charge * this.plunger.maxPull;
            if (ball.y + ball.r > plungerTopY && ball.vy >= 0) {
              ball.y = plungerTopY - ball.r;
              ball.vy = Math.min(0, -ball.vy * 0.25);
              ball.vx *= 0.7;
              ball.inShooter = true;
            }
          }

          if (!ball.inShooter) {
            const g = this.oneWayGate;
            const cp = closestPointOnSegment(ball.x, ball.y, g.x1, g.y1, g.x2, g.y2);
            const d = Math.hypot(ball.x - cp.x, ball.y - cp.y);
            if (d < ball.r + 3) {
              const sideDot = (ball.x - cp.x) * g.nx + (ball.y - cp.y) * g.ny;
              if (sideDot > 0) {
                this.collideBallWithSegment(ball, g.x1, g.y1, g.x2, g.y2, 3, 0.55);
              }
            }
          }

          for (const w of this.walls) {
            this.collideBallWithSegment(ball, w.x1, w.y1, w.x2, w.y2, w.r, 0.56);
          }

          // Top Rollover Lanes (A - B - C)
          for (const r of this.rollovers) {
            if (r.cooldown <= 0 && Math.hypot(ball.x - r.x, ball.y - r.y) < r.r) {
              r.cooldown = 0.55;
              if (!r.lit) {
                r.lit = true;
                this.sfx.playTarget();
                this.addScore(150, r.x, r.y - 10, "#fde047");
                if (this.rollovers.every((ro) => ro.lit)) {
                  this.multiplier = Math.min(5, this.multiplier + 1);
                  this.showCallout(`A-B-C BONUS ${this.multiplier}x!`, "#fde047", 1.3);
                  this.addScore(500, 241, 95, "#fde047");
                  for (const ro of this.rollovers) ro.lit = false;
                }
              }
            }
          }

          // Slingshots
          for (const sl of this.slingshots) {
            const k = sl.kicker;
            if (this.collideBallWithSegment(ball, k.x1, k.y1, k.x2, k.y2, 5, 0.85, 290)) {
              sl.flash = 1.0;
              this.addScore(50, (k.x1 + k.x2) * 0.5, (k.y1 + k.y2) * 0.5, "#fef08a");
              this.sfx.playSlingshot();
              this.spawnParticles((k.x1 + k.x2) * 0.5, (k.y1 + k.y2) * 0.5, "#fef08a", 6);
            }
            this.collideBallWithSegment(ball, sl.pts[0].x, sl.pts[0].y, sl.pts[1].x, sl.pts[1].y, 4, 0.5);
            this.collideBallWithSegment(ball, sl.pts[1].x, sl.pts[1].y, sl.pts[2].x, sl.pts[2].y, 4, 0.5);
          }

          // Verschiedene Bumper
          for (let i = 0; i < this.bumpers.length; i++) {
            const b = this.bumpers[i];
            const dx = ball.x - b.x;
            const dy = ball.y - b.y;
            const dist = Math.hypot(dx, dy);
            const minDist = ball.r + b.r;
            if (dist < minDist && dist > 1e-6) {
              const nx = dx / dist;
              const ny = dy / dist;
              ball.x = b.x + nx * minDist;
              ball.y = b.y + ny * minDist;
              const outSpeed = Math.max(b.kick, Math.hypot(ball.vx, ball.vy) * 0.9);
              ball.vx = nx * outSpeed;
              ball.vy = ny * outSpeed;
              b.flash = 1.0;
              this.addScore(b.points, b.x, b.y - b.r, b.ring);
              this.sfx.playBumper(i, b.kind);
              this.spawnParticles(b.x + nx * b.r, b.y + ny * b.r, b.skirt, b.kind === "star" ? 12 : 8);
            }
          }

          // Standup / Drop-Targets
          for (const tgt of this.targets) {
            if (this.collideBallWithSegment(ball, tgt.x1, tgt.y1, tgt.x2, tgt.y2, 4.5, 0.75, 90)) {
              tgt.flash = 1.0;
              this.sfx.playTarget();
              this.addScore(tgt.points, (tgt.x1 + tgt.x2) * 0.5, tgt.y1, "#fde047");
              if (!tgt.hit) {
                tgt.hit = true;
                if (this.targets.every((t) => t.hit)) {
                  this.multiplier = Math.min(5, this.multiplier + 1);
                  this.showCallout(`BONUS ${this.multiplier}x!`, "#fde047", 1.3);
                  this.addScore(500, 160, 295, "#fde047");
                  for (const t of this.targets) t.hit = false;
                }
              }
            }
          }

          // Flipper-Schläger
          for (const fl of this.flippers) {
            this.collideBallWithFlipper(ball, fl);
          }

          // Rampen-Eingang
          if (!ball.inShooter && ball.vy < -160) {
            const re = this.ramp.entry;
            const dRamp = Math.hypot(ball.x - re.x, ball.y - re.y);
            if (dRamp < re.r) {
              ball.onRamp = true;
              ball.rampProgress = 0;
              ball.rampSpeed = clamp(Math.hypot(ball.vx, ball.vy) / 360, 1.05, 1.85);
              this.sfx.playRamp();
              this.addScore(350, re.x, re.y, "#38bdf8");
              this.showCallout("RAMPE!", "#38bdf8", 0.9);
            }
          }

          // Multiball-Loch direkt
          if (this.multiballHole.cooldown <= 0 && !ball.onRamp && !ball.inShooter) {
            const mh = this.multiballHole;
            const dHole = Math.hypot(ball.x - mh.x, ball.y - mh.y);
            if (dHole < mh.r) {
              this.triggerMultiball(ball);
              break;
            }
          }
        }

        // Ball-zu-Ball-Kollisionen
        for (let i = 0; i < this.balls.length; i++) {
          const a = this.balls[i];
          if (a.onRamp) continue;
          for (let j = i + 1; j < this.balls.length; j++) {
            const b = this.balls[j];
            if (b.onRamp) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            const minDist = a.r + b.r;
            if (dist < minDist && dist > 1e-6) {
              const nx = dx / dist;
              const ny = dy / dist;
              const overlap = (minDist - dist) * 0.5;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;

              const rvx = b.vx - a.vx;
              const rvy = b.vy - a.vy;
              const vn = rvx * nx + rvy * ny;
              if (vn < 0) {
                const impulse = -(1 + 0.92) * vn * 0.5;
                a.vx -= impulse * nx;
                a.vy -= impulse * ny;
                b.vx += impulse * nx;
                b.vy += impulse * ny;
              }
            }
          }
        }
      }
    },

    update(dt) {
      if (this.phase !== "playing" || this.paused) return;
      this.animClock += dt;

      const hasShooterBall = this.balls.some((b) => b.inShooter && b.x > 372);
      if ((this.keys.plunge || this.plungerTouchActive) && hasShooterBall) {
        this.plunger.charging = true;
        this.plunger.charge = Math.min(1, this.plunger.charge + dt * 1.15);
      } else if (this.plunger.charging) {
        this.releasePlunger();
      }

      for (const b of this.bumpers) b.flash = Math.max(0, b.flash - dt * 4.8);
      for (const sl of this.slingshots) sl.flash = Math.max(0, sl.flash - dt * 5.2);
      for (const tgt of this.targets) tgt.flash = Math.max(0, tgt.flash - dt * 4);
      for (const r of this.rollovers) r.cooldown = Math.max(0, r.cooldown - dt);
      this.multiballHole.flash = Math.max(0, this.multiballHole.flash - dt * 2);
      this.multiballHole.cooldown = Math.max(0, this.multiballHole.cooldown - dt);
      this.multiballBannerTimer = Math.max(0, this.multiballBannerTimer - dt);
      this.calloutTimer = Math.max(0, this.calloutTimer - dt);

      if (this.holeLockTimer > 0) {
        this.holeLockTimer -= dt;
        if (this.holeLockTimer <= 0) {
          this.lockedBallRef = null;
        }
      }
      if (this.pendingEjectQueue.length > 0) {
        for (let i = this.pendingEjectQueue.length - 1; i >= 0; i--) {
          const item = this.pendingEjectQueue[i];
          item.delay -= dt;
          if (item.delay <= 0) {
            this.pendingEjectQueue.splice(i, 1);
            this.balls.push(
              this.createBall(
                this.multiballHole.x + 14,
                this.multiballHole.y + 18,
                item.vx,
                item.vy,
                false
              )
            );
            this.sfx.playPlunger();
            this.spawnParticles(this.multiballHole.x, this.multiballHole.y, "#fde047", 10);
            this.updateHud();
          }
        }
      }

      for (const ball of this.balls) {
        if (!ball.onRamp) continue;
        ball.rampProgress += dt * ball.rampSpeed;
        const pos = this.getRampPosition(ball.rampProgress);
        ball.x = pos.x;
        ball.y = pos.y;
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 7) ball.trail.shift();

        if (ball.rampProgress >= 1) {
          ball.onRamp = false;
          if (this.multiballHole.cooldown <= 0) {
            this.triggerMultiball(ball);
          } else {
            ball.vx = 210;
            ball.vy = 160;
            this.addScore(500, ball.x, ball.y, "#fde047");
          }
        }
      }

      this.stepPhysics(dt);

      for (let i = this.balls.length - 1; i >= 0; i--) {
        const ball = this.balls[i];
        if (!ball.onRamp) {
          ball.trail.push({ x: ball.x, y: ball.y });
          if (ball.trail.length > 5) ball.trail.shift();
        }
        if (ball.y > TABLE_H + 24) {
          this.balls.splice(i, 1);
          this.sfx.playDrain();
          this.updateHud();
        }
      }

      if (
        this.balls.length === 0 &&
        !this.lockedBallRef &&
        this.pendingEjectQueue.length === 0
      ) {
        if (this.ballNumber < this.maxBalls) {
          this.ballNumber += 1;
          this.multiplier = 1;
          this.showCallout(`BALL ${this.ballNumber}/${this.maxBalls}`, "#fde047", 1.2);
          this.spawnBallInShooter();
          this.updateHud();
        } else {
          this.endGame();
        }
      }

      this.updatePlungeButtonVisibility();

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.y -= 28 * dt;
        pop.life -= dt;
        if (pop.life <= 0) {
          this.popups.splice(i, 1);
        }
      }
    },

    endGame() {
      this.phase = "gameover";
      this.updatePlungeButtonVisibility();
      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-xs rounded-2xl border border-amber-400/50 bg-slate-900/95 p-6 text-center">
          <h3 class="font-orbitron text-xl font-black text-amber-300 mb-1">GAME OVER</h3>
          <p class="text-xs text-slate-400 mb-4">Alle 3 Bälle gespielt</p>
          <div class="rounded-xl bg-slate-950/90 border border-amber-500/30 p-3 mb-5">
            <div class="text-[11px] uppercase tracking-wider text-slate-400">Endstand</div>
            <div class="font-orbitron text-2xl font-black text-amber-300 mt-0.5">${this.score}</div>
            <div class="text-xs text-orange-300 mt-1">Highscore: ${this.bestScore}</div>
          </div>
          <div class="flex flex-col gap-2.5">
            <button
              id="flipper-restart-btn"
              type="button"
              class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95 transition"
            >Nochmal spielen</button>
            <button
              id="flipper-hub-btn"
              type="button"
              class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition"
            >Zurück zum Hub</button>
          </div>
        </div>
      `;
      this.overlay.querySelector("#flipper-restart-btn")?.addEventListener("click", () => {
        this.startNewGame();
      });
      this.overlay.querySelector("#flipper-hub-btn")?.addEventListener("click", () => {
        this.ctx?.exitToHub?.();
      });
    },

    draw() {
      if (!this.canvasCtx) return;
      const ctx = this.canvasCtx;
      const { cssW, cssH, scale, offsetX, offsetY } = this.view;
      const dpr = this.dpr || 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#09080c";
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // 1. Vorgerendertes realistisches Spielfeld (Holz, Lack, Artwork, Chrome-Schienen, Apron)
      if (this.bgCanvas) {
        ctx.drawImage(this.bgCanvas, 0, 0, TABLE_W, TABLE_H);
      }

      // 2. Beleuchtete Multiplikator-Inserts im Spielfeld (2X, 3X, 4X, 5X)
      this.drawMultiplierInserts(ctx);

      // 3. Top Rollover Lampen-Inserts (A - B - C)
      for (const r of this.rollovers) {
        ctx.fillStyle = "#09090b";
        ctx.beginPath();
        ctx.arc(r.x, r.y, 11, 0, Math.PI * 2);
        ctx.fill();

        const ig = ctx.createRadialGradient(r.x, r.y, 1, r.x, r.y, 9.5);
        if (r.lit) {
          ig.addColorStop(0, "#ffffff");
          ig.addColorStop(0.45, "#fde047");
          ig.addColorStop(1, "#ca8a04");
        } else {
          ig.addColorStop(0, "#422006");
          ig.addColorStop(1, "#1c1917");
        }
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 9.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = r.lit ? "#422006" : "#a16207";
        ctx.font = "900 9px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(r.label, r.x, r.y + 3.5);
      }

      // 4. Multiball-Loch (vertieftes Metall-Kicker-Hole)
      this.drawMultiballHole(ctx);

      // 5. Einweg-Draht-Tor oben an der Abschussbahn
      this.drawOneWayGate(ctx);

      // 6. Standup / Drop-Targets (mit abgerundeten Plastik-Kappen & Halterung)
      this.drawTargets(ctx);

      // 7. Slingshots (abgerundete Plastics, gedehnte Gummis & 3 Chrome-Posts)
      this.drawSlingshots(ctx);

      // 8. Verschiedene realistische Bumper (Pilz-Pop-Bumper, Star-Bumper, Gummiposten)
      for (const b of this.bumpers) {
        this.drawBumper(ctx, b);
      }

      // 9. Plunger-Stange & Stahlfeder
      this.drawPlunger(ctx);

      // 10. Realistische Flipper-Schläger (weißer Bat + roter Gummi + Bodenschatten)
      for (const fl of this.flippers) {
        this.drawFlipper(ctx, fl);
      }

      // 11. Bälle auf dem Spielfeld (unter der erhöhten Rampe)
      for (const ball of this.balls) {
        if (!ball.onRamp) this.drawBall(ctx, ball, false);
      }
      if (this.lockedBallRef) {
        this.drawBall(ctx, { x: this.multiballHole.x, y: this.multiballHole.y, r: BALL_R * 0.88, trail: [] }, false);
      }

      // 12. Erhöhte, geschwungene Acryl- & Draht-Rampe (über dem Spielfeld!)
      this.drawRealisticRamp(ctx);

      // 13. Bälle AUF der Rampe (sichtbar über der Rampenfläche mit größerem Schatten!)
      for (const ball of this.balls) {
        if (ball.onRamp) this.drawBall(ctx, ball, true);
      }

      // 14. Funken-Partikel & schwebende Punkte
      for (const pt of this.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const pop of this.popups) {
        ctx.globalAlpha = Math.min(1, pop.life / pop.maxLife);
        ctx.fillStyle = "#09090b";
        ctx.font = "900 11px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
      }
      ctx.globalAlpha = 1;

      // 15. Dezente Glas-Spiegelung (echtes Flipper-Scheiben-Gefühl)
      ctx.save();
      ctx.globalAlpha = 0.045;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(40, 20);
      ctx.lineTo(145, 20);
      ctx.lineTo(25, 360);
      ctx.lineTo(15, 260);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 16. Callout / MULTIBALL-Banner
      if (this.multiballBannerTimer > 0) {
        const pulse = 0.72 + 0.28 * Math.sin(this.animClock * 18);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "rgba(18, 10, 4, 0.88)";
        ctx.beginPath();
        ctx.roundRect(56, 354, TABLE_W - 112, 50, 10);
        ctx.fill();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fde047";
        ctx.font = "900 24px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MULTIBALL!", TABLE_W * 0.5, 387);
      } else if (this.calloutTimer > 0) {
        ctx.globalAlpha = Math.min(1, this.calloutTimer * 1.4);
        ctx.fillStyle = "#09090b";
        ctx.font = "900 18px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.calloutText, TABLE_W * 0.5 + 1.5, 386.5);
        ctx.fillStyle = this.calloutColor;
        ctx.fillText(this.calloutText, TABLE_W * 0.5, 385);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    },

    drawMultiplierInserts(ctx) {
      const levels = [2, 3, 4, 5];
      const baseY = 532;
      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        const lit = this.multiplier >= lvl;
        const x = 148 + i * 29;
        const y = baseY + (i === 1 || i === 2 ? -6 : 0);

        ctx.fillStyle = "#09090b";
        ctx.beginPath();
        ctx.arc(x, y, 10.5, 0, Math.PI * 2);
        ctx.fill();

        const g = ctx.createRadialGradient(x, y, 1, x, y, 9);
        if (lit) {
          g.addColorStop(0, "#ffffff");
          g.addColorStop(0.5, "#fb923c");
          g.addColorStop(1, "#c2410c");
        } else {
          g.addColorStop(0, "#3b1d0a");
          g.addColorStop(1, "#18100c");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = lit ? "#431407" : "#9a3412";
        ctx.font = "900 8px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${lvl}X`, x, y + 3);
      }
    },

    drawOneWayGate(ctx) {
      const g = this.oneWayGate;
      ctx.save();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(g.x1, g.y1);
      ctx.quadraticCurveTo((g.x1 + g.x2) * 0.5 + 5, (g.y1 + g.y2) * 0.5 - 3, g.x2, g.y2);
      ctx.stroke();
      drawChromePost(ctx, g.x2, g.y2, 3.8);
      ctx.restore();
    },

    drawTargets(ctx) {
      for (const tgt of this.targets) {
        const mx = (tgt.x1 + tgt.x2) * 0.5;
        const my = (tgt.y1 + tgt.y2) * 0.5;
        const ang = Math.atan2(tgt.y2 - tgt.y1, tgt.x2 - tgt.x1);
        const len = Math.hypot(tgt.x2 - tgt.x1, tgt.y2 - tgt.y1);

        // Kleines beleuchtetes Rauten-Insert vor dem Target
        ctx.save();
        ctx.translate(mx + Math.sin(ang) * 14, my - Math.cos(ang) * 14);
        ctx.rotate(ang);
        ctx.fillStyle = tgt.hit ? "#fde047" : "#292524";
        ctx.strokeStyle = "#09090b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Eigentliche abgerundete Target-Platte
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ang);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.roundRect(-len * 0.5 + 1, -3.5 + 1.5, len, 7, 3);
        ctx.fill();

        ctx.fillStyle = tgt.flash > 0 ? "#ffffff" : tgt.color;
        ctx.beginPath();
        ctx.roundRect(-len * 0.5, -3.5, len, 7, 3);
        ctx.fill();
        ctx.strokeStyle = "#fef3c7";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
    },

    drawSlingshots(ctx) {
      for (const sl of this.slingshots) {
        // 1. Weicher Bodenschatten
        ctx.save();
        ctx.translate(2, 3);
        traceRoundedPoly(ctx, sl.pts, 11);
        ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
        ctx.fill();
        ctx.restore();

        // 2. Gedehnter weißer Flipper-Gummiring rund um die 3 Pfosten
        traceRoundedPoly(ctx, sl.pts, 10);
        ctx.strokeStyle = sl.flash > 0 ? "#ffffff" : "#f1f5f9";
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 3. Dekorative rote/goldene Acryl-Abdeckung (Plastic) obendrauf
        const cx = (sl.pts[0].x + sl.pts[1].x + sl.pts[2].x) / 3;
        const cy = (sl.pts[0].y + sl.pts[1].y + sl.pts[2].y) / 3;
        const innerPts = sl.pts.map((p) => ({
          x: cx + (p.x - cx) * 0.88,
          y: cy + (p.y - cy) * 0.88
        }));
        traceRoundedPoly(ctx, innerPts, 8);
        const pg = ctx.createLinearGradient(sl.pts[0].x, sl.pts[0].y, sl.pts[2].x, sl.pts[2].y);
        if (sl.flash > 0.25) {
          pg.addColorStop(0, "#fef08a");
          pg.addColorStop(1, "#f97316");
        } else {
          pg.addColorStop(0, "#dc2626");
          pg.addColorStop(0.55, "#991b1b");
          pg.addColorStop(1, "#450a0a");
        }
        ctx.fillStyle = pg;
        ctx.fill();
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 4. Drei glänzende Chrome-Posts an den Ecken
        for (const p of sl.pts) {
          drawChromePost(ctx, p.x, p.y, 4.8);
        }
      }
    },

    drawBumper(ctx, b) {
      const popScale = 1 + b.flash * 0.13;
      const r = b.r * popScale;

      // 1. Realistischer Bodenschatten
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.arc(b.x + 2.5, b.y + 3.5, r + 2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Warmes Aufleuchten unter der Bumper-Kappe bei Treffer
      if (b.flash > 0) {
        ctx.globalAlpha = b.flash * 0.5;
        ctx.fillStyle = b.skirt;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (b.kind === "jet") {
        // Realistischer Mini-Gummiposten (Gummiring + Chrome-Mutter)
        drawChromePost(ctx, b.x, b.y, r - 2.5, b.flash > 0.25 ? "#ffffff" : b.capTop);
        return;
      }

      // 3. Transparenter Bumper-Skirt (unterer Ring)
      ctx.fillStyle = b.flash > 0.25 ? "#ffffff" : b.skirt;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();

      // 4. Geformte 3D-Pilzkappe (Radial-Verlauf)
      const capR = r * 0.86;
      const capGrad = ctx.createRadialGradient(
        b.x - capR * 0.32,
        b.y - capR * 0.32,
        1.5,
        b.x,
        b.y,
        capR
      );
      if (b.flash > 0.35) {
        capGrad.addColorStop(0, "#ffffff");
        capGrad.addColorStop(0.6, b.ring);
        capGrad.addColorStop(1, b.capTop);
      } else {
        capGrad.addColorStop(0, b.ring);
        capGrad.addColorStop(0.28, b.capTop);
        capGrad.addColorStop(1, b.capDark);
      }
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, capR, 0, Math.PI * 2);
      ctx.fill();

      // Chrome-Zierkranz
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      if (b.kind === "star") {
        // Rotierender goldener Stern im Star-Turbo-Bumper
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(this.animClock * 1.1);
        ctx.fillStyle = "#fef9c3";
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const rad = i % 2 === 0 ? capR * 0.72 : capR * 0.4;
          const ang = (i * Math.PI) / 6;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Klassische geriffelte Pop-Bumper-Kappe mit Innenring
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, capR * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Punkte-Aufdruck in der Mitte
      if (b.label) {
        ctx.fillStyle = b.kind === "star" ? "#78350f" : "#ffffff";
        ctx.font = "900 8.5px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(b.label, b.x, b.y + 3);
      }

      // Glanz-Reflexion oben links auf der Kunststoff-Kuppel
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.ellipse(b.x - capR * 0.28, b.y - capR * 0.32, capR * 0.26, capR * 0.14, -0.6, 0, Math.PI * 2);
      ctx.fill();
    },

    drawRealisticRamp(ctx) {
      const r = this.ramp;
      const steps = 24;
      const leftRail = [];
      const rightRail = [];
      const centerPts = [];
      const halfW = 12;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = evalCubicBezier(r.p0, r.p1, r.p2, r.p3, t);
        const tan = evalCubicTangent(r.p0, r.p1, r.p2, r.p3, t);
        const nx = -tan.y;
        const ny = tan.x;
        centerPts.push(p);
        leftRail.push({ x: p.x + nx * halfW, y: p.y + ny * halfW });
        rightRail.push({ x: p.x - nx * halfW, y: p.y - ny * halfW });
      }

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 1. Schatten der erhöhten Rampe auf dem Spielfeld darunter
      ctx.strokeStyle = "rgba(0, 0, 0, 0.34)";
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(centerPts[0].x + 5, centerPts[0].y + 7);
      for (let i = 1; i < centerPts.length; i++) {
        ctx.lineTo(centerPts[i].x + 5, centerPts[i].y + 7);
      }
      ctx.stroke();

      // 2. Transparente getönte Acryl-Lauffläche
      ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(centerPts[0].x, centerPts[0].y);
      for (let i = 1; i < centerPts.length; i++) {
        ctx.lineTo(centerPts[i].x, centerPts[i].y);
      }
      ctx.stroke();

      // 3. Gebürstete Metall-Eingangs-Platte (Ramp Flap)
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.ellipse(r.entry.x, r.entry.y + 4, 15, 7, -0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 4. Doppelte Chrome-Drahtschienen (Wireform Rails) links & rechts
      const strokeWire = (pts) => {
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pts[0].x - 0.5, pts[0].y - 0.5);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x - 0.5, pts[i].y - 0.5);
        ctx.stroke();
      };

      strokeWire(leftRail);
      strokeWire(rightRail);

      // 5. Querstreben (Wireform-Ringe) alle paar Schritte für echte 3D-Optik
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      for (let i = 4; i < steps; i += 5) {
        ctx.beginPath();
        ctx.moveTo(leftRail[i].x, leftRail[i].y);
        ctx.lineTo(rightRail[i].x, rightRail[i].y);
        ctx.stroke();
      }

      // 6. Dezente beleuchtete Lauflicht-Pfeile entlang der Rampe
      ctx.strokeStyle = "rgba(253, 224, 71, 0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 12]);
      ctx.lineDashOffset = -this.animClock * 40;
      ctx.beginPath();
      ctx.moveTo(centerPts[0].x, centerPts[0].y);
      for (let i = 1; i < centerPts.length; i++) ctx.lineTo(centerPts[i].x, centerPts[i].y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    },

    drawMultiballHole(ctx) {
      const mh = this.multiballHole;
      const pulse = 0.5 + 0.5 * Math.sin(this.animClock * 5);

      // Warmes Licht um das Loch
      ctx.globalAlpha = 0.22 + pulse * 0.16 + mh.flash * 0.4;
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(mh.x, mh.y, mh.r + 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Metallische Kicker-Loch-Einfassung
      const rimGrad = ctx.createLinearGradient(mh.x - mh.r, mh.y - mh.r, mh.x + mh.r, mh.y + mh.r);
      rimGrad.addColorStop(0, "#f8fafc");
      rimGrad.addColorStop(0.5, "#94a3b8");
      rimGrad.addColorStop(1, "#334155");
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(mh.x, mh.y, mh.r + 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Tiefes dunkles Kicker-Loch mit Innenschatten
      const pitGrad = ctx.createRadialGradient(mh.x + 2, mh.y + 3, 2, mh.x, mh.y, mh.r);
      pitGrad.addColorStop(0, "#020205");
      pitGrad.addColorStop(0.75, "#09090b");
      pitGrad.addColorStop(1, "#27272a");
      ctx.fillStyle = pitGrad;
      ctx.beginPath();
      ctx.arc(mh.x, mh.y, mh.r - 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fde047";
      ctx.font = "800 7px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOCK", mh.x, mh.y + 2.5);
    },

    drawPlunger(ctx) {
      const p = this.plunger;
      const topY = p.restY + p.charge * p.maxPull;
      const bottomY = 716;

      // Mittlere Metall-Stange
      const rodGrad = ctx.createLinearGradient(p.x - 3, 0, p.x + 3, 0);
      rodGrad.addColorStop(0, "#475569");
      rodGrad.addColorStop(0.45, "#f8fafc");
      rodGrad.addColorStop(1, "#334155");
      ctx.fillStyle = rodGrad;
      ctx.fillRect(p.x - 3, topY + 6, 6, bottomY - topY);

      // Realistische Spiralfeder
      ctx.strokeStyle = p.charge > 0.72 ? "#f97316" : "#cbd5e1";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      const coils = 8;
      for (let i = 0; i <= coils; i++) {
        const y = topY + 9 + ((bottomY - (topY + 9)) * i) / coils;
        const x = p.x + (i % 2 === 0 ? -7.5 : 7.5);
        if (i === 0) ctx.moveTo(p.x, topY + 9);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Schwarze Gummikappe & Chrome-Teller oben am Plunger
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.roundRect(p.x - 10, topY, 20, 6, 3);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(p.x - 9, topY + 5.5, 18, 3);
    },

    drawFlipper(ctx, fl) {
      const tipX = fl.px + Math.cos(fl.angle) * fl.length;
      const tipY = fl.py + Math.sin(fl.angle) * fl.length;
      const nx = -Math.sin(fl.angle);
      const ny = Math.cos(fl.angle);

      const traceBat = (ox, oy, pad = 0) => {
        const r1 = fl.r1 + pad;
        const r2 = fl.r2 + pad;
        ctx.beginPath();
        ctx.moveTo(fl.px + ox + nx * r1, fl.py + oy + ny * r1);
        ctx.lineTo(tipX + ox + nx * r2, tipY + oy + ny * r2);
        ctx.arc(tipX + ox, tipY + oy, r2, fl.angle + Math.PI * 0.5, fl.angle - Math.PI * 0.5, true);
        ctx.lineTo(fl.px + ox - nx * r1, fl.py + oy - ny * r1);
        ctx.arc(fl.px + ox, fl.py + oy, r1, fl.angle - Math.PI * 0.5, fl.angle + Math.PI * 0.5, true);
        ctx.closePath();
      };

      // 1. Bodenschatten auf dem Spielfeld
      traceBat(2, 3.5, 0.5);
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.fill();

      // 2. Klassischer roter Flipper-Gummiring außen
      traceBat(0, 0, 0.6);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. Klassischer creme-weißer Kunststoff-Schläger innen
      traceBat(0, 0, -2.1);
      const batGrad = ctx.createLinearGradient(fl.px, fl.py - 8, tipX, tipY + 8);
      batGrad.addColorStop(0, "#ffffff");
      batGrad.addColorStop(0.6, "#f1f5f9");
      batGrad.addColorStop(1, "#cbd5e1");
      ctx.fillStyle = batGrad;
      ctx.fill();

      // 4. Eingelassene Mittelrippe & Chrome-Drehpunkt
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(fl.px + Math.cos(fl.angle) * 10, fl.py + Math.sin(fl.angle) * 10);
      ctx.lineTo(tipX - Math.cos(fl.angle) * 5, tipY - Math.sin(fl.angle) * 5);
      ctx.stroke();

      drawChromePost(ctx, fl.px, fl.py, 4.2);
    },

    drawBall(ctx, ball, elevated = false) {
      // Feiner Bewegungs-Schweif
      for (let i = 0; i < ball.trail.length; i++) {
        const pt = ball.trail[i];
        const ratio = (i + 1) / (ball.trail.length + 1);
        ctx.globalAlpha = ratio * 0.18;
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, ball.r * ratio * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Realistischer Bodenschatten (größerer Versatz, wenn Ball oben auf der Rampe rollt!)
      const shX = elevated ? 5.5 : 2.2;
      const shY = elevated ? 7.5 : 3.2;
      ctx.fillStyle = elevated ? "rgba(0, 0, 0, 0.32)" : "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.arc(ball.x + shX, ball.y + shY, ball.r * (elevated ? 0.95 : 1), 0, Math.PI * 2);
      ctx.fill();

      // Hochglanz-Stahlkugel (Mirror-Chrome Radial-Verlauf)
      const grad = ctx.createRadialGradient(
        ball.x - ball.r * 0.36,
        ball.y - ball.r * 0.36,
        0.8,
        ball.x,
        ball.y,
        ball.r
      );
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.24, "#f8fafc");
      grad.addColorStop(0.55, "#94a3b8");
      grad.addColorStop(0.84, "#334155");
      grad.addColorStop(1, "#0f172a");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      // Warmer Reflexionspunkt von den Spielfeldlampen
      ctx.fillStyle = "rgba(254, 240, 138, 0.5)";
      ctx.beginPath();
      ctx.arc(ball.x + ball.r * 0.32, ball.y + ball.r * 0.28, ball.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    },

    resize() {
      if (!this.canvasWrap || !this.canvas || !this.canvasCtx) return;
      const rect = this.canvasWrap.getBoundingClientRect();
      const cssW = Math.max(240, Math.floor(rect.width));
      const cssH = Math.max(300, Math.floor(rect.height));

      const dpr = window.getOptimalDPR ? window.getOptimalDPR() : Math.min(window.devicePixelRatio || 1, 1.25);
      this.dpr = dpr;

      this.canvas.style.width = `${cssW}px`;
      this.canvas.style.height = `${cssH}px`;
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);

      const scale = Math.min(cssW / TABLE_W, cssH / TABLE_H);
      const offsetX = (cssW - TABLE_W * scale) * 0.5;
      const offsetY = (cssH - TABLE_H * scale) * 0.5;

      this.view = { cssW, cssH, scale, offsetX, offsetY };
    },

    handleKeyDown(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A" || e.code === "ShiftLeft") {
        this.keys.left = true;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D" || e.code === "ShiftRight") {
        this.keys.right = true;
      } else if (e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        this.keys.plunge = true;
      }
    },

    handleKeyUp(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A" || e.code === "ShiftLeft") {
        this.keys.left = false;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D" || e.code === "ShiftRight") {
        this.keys.right = false;
      } else if (e.key === " " || e.key === "ArrowDown") {
        this.keys.plunge = false;
      }
    },

    syncTouchFlippers() {
      let left = false;
      let right = false;
      for (const side of this.activePointers.values()) {
        if (side === "left") left = true;
        if (side === "right") right = true;
      }
      this.touchFlippers.left = left;
      this.touchFlippers.right = right;
    },

    handlePointerDown(e) {
      if (this.phase !== "playing" || this.paused) return;
      this.canvas.setPointerCapture?.(e.pointerId);
      const rect = this.canvas.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const side = relX < rect.width * 0.5 ? "left" : "right";
      this.activePointers.set(e.pointerId, side);
      this.syncTouchFlippers();
    },

    handlePointerMove(e) {
      if (!this.activePointers.has(e.pointerId)) return;
      const rect = this.canvas.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const side = relX < rect.width * 0.5 ? "left" : "right";
      if (this.activePointers.get(e.pointerId) !== side) {
        this.activePointers.set(e.pointerId, side);
        this.syncTouchFlippers();
      }
    },

    handlePointerUp(e) {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.delete(e.pointerId);
        this.syncTouchFlippers();
      }
    },

    handlePlungeDown(e) {
      e.preventDefault();
      e.stopPropagation();
      if (this.phase !== "playing" || this.paused) return;
      this.plungeBtn.setPointerCapture?.(e.pointerId);
      this.plungerTouchActive = true;
    },

    handlePlungeUp(e) {
      e.preventDefault();
      e.stopPropagation();
      this.plungerTouchActive = false;
    },

    loop(now) {
      if (this.paused || !this.canvasCtx) {
        this.rafId = requestAnimationFrame((t) => this.loop(t));
        return;
      }
      const dt = Math.min(0.033, Math.max(0.001, (now - this.lastTime) / 1000 || 0.016));
      this.lastTime = now;
      this.update(dt);
      this.draw();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
    },

    start() {
      this.lastTime = performance.now();
      this.paused = false;
      if (!this.rafId) {
        this.rafId = requestAnimationFrame((t) => this.loop(t));
      }
    },

    pause() {
      this.paused = true;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.plunge = false;
      this.plungerTouchActive = false;
      this.activePointers.clear();
      this.syncTouchFlippers();
    },

    resume() {
      this.paused = false;
      this.lastTime = performance.now();
    },

    destroy() {
      this.paused = true;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas?.removeEventListener("pointermove", this.onPointerMove);
      this.canvas?.removeEventListener("pointerup", this.onPointerUp);
      this.canvas?.removeEventListener("pointercancel", this.onPointerUp);
      this.plungeBtn?.removeEventListener("pointerdown", this.onPlungeDown);
      this.plungeBtn?.removeEventListener("pointerup", this.onPlungeUp);
      this.plungeBtn?.removeEventListener("pointercancel", this.onPlungeUp);

      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      this.root = null;
      this.canvas = null;
      this.canvasCtx = null;
      this.bgCanvas = null;
      this.ctx = null;
    }
  });
})();
