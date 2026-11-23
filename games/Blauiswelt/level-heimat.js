(() => {
  "use strict";

  /**
   * Blauis Welt – Level "Blauis Heimat" (Schneeflocken-Sammelspiel)
   * ------------------------------------------------------------------
   * Winterliches Sammelspiel:
   * - Blaui läuft links & rechts über den Schnee und fängt mit seinem
   *   Korb herabfallende Schneeflocken auf
   * - 5 Flocken-Sorten (konfigurierbar in FLAKE_TYPES) mit 1 bis 25 Punkten
   * - 30-Sekunden-Countdown, Auswertung & lokaler Highscore
   */

  const ROUND_DURATION = 30; // Sekunden
  const GOLD_BONUS_TIME = 5; // Sekunden Zeitbonus pro goldener Flocke

  // Leicht anpassbare Konfiguration der 5 Schneeflocken-Sorten:
  const FLAKE_TYPES = [
    { id: "white",   name: "Weiße Flocke",      pts: 1,  weight: 50, speedMin: 78,  speedMax: 108, sway: 14, r: 8,  color: "#ffffff", glow: "#e0f2fe" },
    { id: "ice",     name: "Kristallflocke",    pts: 2,  weight: 26, speedMin: 92,  speedMax: 126, sway: 20, r: 10, color: "#7dd3fc", glow: "#bae6fd" },
    { id: "sparkle", name: "Glitzer-Stern",     pts: 5,  weight: 14, speedMin: 118, speedMax: 152, sway: 24, r: 11, color: "#a5f3fc", glow: "#ffffff" },
    { id: "berry",   name: "Plüsch-Flocke",     pts: 10, weight: 7,  speedMin: 86,  speedMax: 116, sway: 42, r: 12, color: "#f472b6", glow: "#d81b86" },
    { id: "gold",    name: "Gold-Zauberflocke", pts: 25, weight: 3,  speedMin: 145, speedMax: 185, sway: 30, r: 13, color: "#fde047", glow: "#f59e0b" }
  ];

  const TOTAL_WEIGHT = FLAKE_TYPES.reduce((s, f) => s + f.weight, 0);

  const W = 720;
  const H = 405;
  const TAU = Math.PI * 2;
  const GROUND_Y = 374;
  const MOVE_SPEED = 295;
  const STORAGE_HS_KEY = "blauiswelt_heimat_hs";

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

  function pickFlakeType() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const f of FLAKE_TYPES) {
      r -= f.weight;
      if (r <= 0) return f;
    }
    return FLAKE_TYPES[0];
  }

  // ------------------------------------------------------------------
  // Hintergrund-Deko (deterministisch)
  // ------------------------------------------------------------------
  const STARS = Array.from({ length: 24 }, (_, i) => ({
    x: (i * 89 + 19) % W,
    y: (i * 47 + 13) % 210,
    r: 0.8 + (i % 3) * 0.55,
    ph: i * 0.9
  }));

  const BG_SNOW = Array.from({ length: 28 }, (_, i) => ({
    x: (i * 67 + 23) % W,
    y: (i * 39 + 17) % H,
    r: 1 + (i % 3) * 0.7,
    sp: 22 + (i % 5) * 8,
    ph: i * 1.3
  }));

  const TREES = [
    { x: 42, y: 356, s: 1.05 },
    { x: 88, y: 358, s: 0.82 },
    { x: 132, y: 360, s: 0.65 },
    { x: 595, y: 360, s: 0.68 },
    { x: 642, y: 358, s: 0.92 },
    { x: 686, y: 356, s: 1.1 }
  ];

  // ------------------------------------------------------------------
  // Zeichenhelfer
  // ------------------------------------------------------------------
  function drawFlakeSprite(ctx, f, x, y, rot, t, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(rot);

    const r = f.r;
    // Sanfter Schein
    const gg = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.8);
    gg.addColorStop(0, f.glow);
    gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = f.id === "gold" ? 0.65 : 0.35;
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (f.id === "berry") {
      // Flauschige Beeren-Plüschflocke
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "#9d0d63";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const rad = i % 2 === 0 ? r : r * 0.72;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.25, r * 0.22, 0, TAU);
      ctx.fill();
    } else if (f.id === "gold" || f.id === "sparkle") {
      // Funkelnder Stern-Kristall
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const rad = i % 2 === 0 ? r : r * 0.38;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.24, 0, TAU);
      ctx.fill();
    } else {
      // Klassische 6-armige Kristall- / Schneeflocke
      ctx.strokeStyle = f.color;
      ctx.lineWidth = f.id === "ice" ? 2 : 1.7;
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx * r, dy * r);
        ctx.stroke();
        if (f.id === "ice") {
          const mx = dx * r * 0.58;
          const my = dy * r * 0.58;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(a + 0.6) * r * 0.3, my + Math.sin(a + 0.6) * r * 0.3);
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(a - 0.6) * r * 0.3, my + Math.sin(a - 0.6) * r * 0.3);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBasket(ctx, x, y, pop) {
    const sx = 1 + pop * 0.16;
    const sy = 1 - pop * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);

    // Korbkörper (Trapez)
    const g = ctx.createLinearGradient(0, -10, 0, 12);
    g.addColorStop(0, "#d97706");
    g.addColorStop(1, "#78350f");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.lineTo(26, -6);
    ctx.lineTo(20, 12);
    ctx.lineTo(-20, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flecht-Streifen
    ctx.strokeStyle = "rgba(254, 243, 199, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-23, 1);
    ctx.lineTo(23, 1);
    ctx.moveTo(-21, 7);
    ctx.lineTo(21, 7);
    ctx.stroke();

    // Rand oben
    ctx.fillStyle = "#f59e0b";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-28, -10, 56, 6, 3);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // Szene "Blauis Heimat"
  // ------------------------------------------------------------------
  const scene = {
    id: "heimat",
    name: "Blauis Heimat",
    subtitle: "Schneeflocken fangen",
    custom: true,

    state: "intro", // intro | playing | results
    clock: 0,
    elapsedRound: 0,
    timeLeft: ROUND_DURATION,
    goldSchedule: [],
    score: 0,
    highscore: 0,
    isNewHs: false,
    counts: {},
    totalCaught: 0,
    flakes: [],
    spawnTimer: 0,
    particles: [],
    floatingTexts: [],
    player: { x: W / 2, y: GROUND_Y, vx: 0, facing: 1, cycle: 0, catchPop: 0 },
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
      this.totalCaught = 0;
      this.counts = Object.fromEntries(FLAKE_TYPES.map((f) => [f.id, 0]));
      this.flakes = [];
      this.particles = [];
      this.floatingTexts = [];
      this.player = { x: W / 2, y: GROUND_Y, vx: 0, facing: 1, cycle: 0, catchPop: 0 };
    },

    startRound() {
      this.prepareIntro();
      this.state = "playing";
      this.elapsedRound = 0;
      // Garantiert 3 goldene Flocken innerhalb der ersten 30 Sekunden
      this.goldSchedule = [randRange(3, 9), randRange(11, 18), randRange(20, 26)];
      this.spawnTimer = 0.2;
    },

    spawnFlake(forcedType = null) {
      const type = forcedType || pickFlakeType();
      this.flakes.push({
        type,
        x: randRange(36, W - 36),
        y: -18,
        vy: randRange(type.speedMin, type.speedMax),
        swayPh: randRange(0, TAU),
        swaySp: randRange(1.6, 2.8),
        rot: randRange(0, TAU),
        rotSp: randRange(-1.8, 1.8)
      });
    },

    spawnParticles(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const sp = 35 + Math.random() * 110;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 35,
          life: 0.4 + Math.random() * 0.35,
          max: 0.75,
          color,
          r: 1.8 + Math.random() * 2.2
        });
      }
    },

    addFloatingText(x, y, text, color) {
      this.floatingTexts.push({ x, y, vy: -32, text, color, life: 0.9, max: 0.9 });
    },

    toHub() {
      this.game?.returnToHub?.("heimat");
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
      }
    },

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------
    update(dt, game, action) {
      this.clock += dt;

      this.particles = this.particles.filter((pt) => {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 180 * dt;
        return pt.life > 0;
      });
      this.floatingTexts = this.floatingTexts.filter((ft) => {
        ft.life -= dt;
        ft.y += ft.vy * dt;
        return ft.life > 0;
      });

      if (this.state === "intro") {
        if (action) this.startRound();
        return;
      }
      if (this.state === "results") {
        if (action) this.startRound();
        return;
      }

      // Countdown & garantierte Gold-Flocken
      this.elapsedRound += dt;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.goldSchedule.length > 0 && this.elapsedRound >= this.goldSchedule[0]) {
        this.goldSchedule.shift();
        this.spawnFlake(FLAKE_TYPES[4]); // Gold-Zauberflocke
      }
      if (this.timeLeft <= 0) {
        this.state = "results";
        if (this.score > this.highscore) {
          this.highscore = this.score;
          this.isNewHs = true;
          saveHighscore(this.score);
        }
        return;
      }

      // Blaui Links/Rechts-Steuerung
      const p = this.player;
      const inp = game.input || {};
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const k = Math.min(1, 16 * dt);
      p.vx += (dir * MOVE_SPEED - p.vx) * k;
      p.x = clamp(p.x + p.vx * dt, 34, W - 34);
      if (Math.abs(p.vx) > 12) {
        p.facing = p.vx > 0 ? 1 : -1;
        p.cycle += dt * 13;
      }
      p.catchPop = Math.max(0, p.catchPop - dt * 4.5);

      // Schneeflocken spawnen
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnFlake();
        this.spawnTimer = randRange(0.28, 0.55);
      }

      // Flocken bewegen & mit Korb auffangen
      const basketX = p.x;
      const basketY = p.y - 52;
      const nextFlakes = [];

      for (const fl of this.flakes) {
        fl.y += fl.vy * dt;
        fl.x = clamp(fl.x + Math.cos(this.clock * fl.swaySp + fl.swayPh) * fl.type.sway * dt, 18, W - 18);
        fl.rot += fl.rotSp * dt;

        // Gold-Flocke hinterlässt leichte Glitzerfunken
        if (fl.type.id === "gold" && Math.random() < 0.3) {
          this.particles.push({
            x: fl.x + randRange(-5, 5),
            y: fl.y + randRange(-5, 5),
            vx: 0,
            vy: -12,
            life: 0.35,
            max: 0.35,
            color: "#fde047",
            r: 1.8
          });
        }

        // Korb-Kollision
        if (Math.abs(fl.x - basketX) < 32 + fl.type.r * 0.4 && Math.abs(fl.y - basketY) < 18 + fl.type.r * 0.4) {
          this.score += fl.type.pts;
          this.totalCaught += 1;
          this.counts[fl.type.id] += 1;
          p.catchPop = 1;
          if (fl.type.id === "gold") {
            this.timeLeft += GOLD_BONUS_TIME;
          }
          this.spawnParticles(basketX, basketY - 6, fl.type.color, fl.type.pts >= 10 ? 16 : 9);
          const label = fl.type.id === "gold" ? `+${fl.type.pts} · +${GOLD_BONUS_TIME}s ⏱` : `+${fl.type.pts}`;
          this.addFloatingText(basketX, basketY - 22, label, fl.type.color);
          continue;
        }

        if (fl.y < GROUND_Y + 8) {
          nextFlakes.push(fl);
        }
      }
      this.flakes = nextFlakes;
    },

    // ------------------------------------------------------------------
    // Zeichnen
    // ------------------------------------------------------------------
    draw(ctx, t) {
      this.ui = [];

      // 1. Winterhimmel & Polarlichter
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#08122e");
      sky.addColorStop(0.55, "#163066");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Polarlichter (Aurora)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      [
        { y: 78, c1: "rgba(52, 211, 153, 0.22)", c2: "rgba(56, 189, 248, 0.04)", amp: 18, sp: 0.7 },
        { y: 112, c1: "rgba(167, 139, 250, 0.18)", c2: "rgba(244, 114, 182, 0.03)", amp: 14, sp: 0.9 }
      ].forEach((au, idx) => {
        const g = ctx.createLinearGradient(0, au.y - 40, 0, au.y + 45);
        g.addColorStop(0, au.c2);
        g.addColorStop(0.5, au.c1);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, au.y + 45);
        for (let x = 0; x <= W; x += 24) {
          ctx.lineTo(x, au.y + Math.sin(x * 0.012 + t * au.sp + idx) * au.amp);
        }
        ctx.lineTo(W, au.y + 45);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      // Sterne
      STARS.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.55 * Math.abs(Math.sin(t * 1.6 + s.ph))})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      });

      // 2. Ferne Schneeberge
      ctx.fillStyle = "#1e3a5f";
      ctx.beginPath();
      ctx.moveTo(0, 352);
      ctx.lineTo(110, 215);
      ctx.lineTo(235, 310);
      ctx.lineTo(370, 190);
      ctx.lineTo(510, 305);
      ctx.lineTo(635, 220);
      ctx.lineTo(W, 320);
      ctx.lineTo(W, 352);
      ctx.closePath();
      ctx.fill();

      // Schneegipfel
      ctx.fillStyle = "rgba(224, 242, 254, 0.85)";
      [[110, 215, 34], [370, 190, 42], [635, 220, 30]].forEach(([mx, my, w]) => {
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - w, my + w * 1.15);
        ctx.lineTo(mx - w * 0.3, my + w * 0.9);
        ctx.lineTo(mx, my + w * 1.15);
        ctx.lineTo(mx + w * 0.35, my + w * 0.88);
        ctx.lineTo(mx + w, my + w * 1.15);
        ctx.closePath();
        ctx.fill();
      });

      // 3. Verschneite Tannen
      TREES.forEach((tr) => {
        ctx.save();
        ctx.translate(tr.x, tr.y);
        ctx.scale(tr.s, tr.s);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-5, -14, 10, 16);
        [[-10, 26], [-32, 22], [-52, 16]].forEach(([ty, tw]) => {
          ctx.fillStyle = "#14532d";
          ctx.beginPath();
          ctx.moveTo(0, ty - 28);
          ctx.lineTo(tw, ty);
          ctx.lineTo(-tw, ty);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#e0f2fe";
          ctx.beginPath();
          ctx.moveTo(0, ty - 28);
          ctx.lineTo(tw * 0.55, ty - 12);
          ctx.lineTo(0, ty - 16);
          ctx.lineTo(-tw * 0.55, ty - 12);
          ctx.closePath();
          ctx.fill();
        });
        ctx.restore();
      });

      // Dezenter Hintergrund-Schneefall
      BG_SNOW.forEach((sn) => {
        const y = (sn.y + t * sn.sp) % H;
        const x = (sn.x + Math.sin(t + sn.ph) * 14 + W) % W;
        ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
        ctx.beginPath();
        ctx.arc(x, y, sn.r, 0, TAU);
        ctx.fill();
      });

      // 4. Schneebedeckter Boden
      const gg = ctx.createLinearGradient(0, 344, 0, H);
      gg.addColorStop(0, "#ffffff");
      gg.addColorStop(1, "#bae6fd");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(0, 354);
      ctx.quadraticCurveTo(180, 342, 360, 352);
      ctx.quadraticCurveTo(540, 362, W, 348);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // 5. Fallende Sammel-Flocken
      this.flakes.forEach((fl) => drawFlakeSprite(ctx, fl.type, fl.x, fl.y, fl.rot, t));

      // 6. Blaui mit Korb
      const p = this.player;
      window.BLAUI_DRAW?.(ctx, p.x, p.y, {
        facing: p.facing,
        cycle: p.cycle,
        moving: Math.abs(p.vx) > 12,
        t,
        scale: 0.88,
        pose: { armL: 2.35, armR: 2.35 }
      });
      drawBasket(ctx, p.x, p.y - 52, p.catchPop);

      // 7. Partikel & Schwebetexte
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

    drawButton(ctx, id, label, x, y, w, h, color, size = 12) {
      this.ui.push({ id, x, y, w, h });
      ctx.save();
      ctx.fillStyle = "rgba(8, 22, 52, 0.92)";
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
      ctx.fillStyle = "rgba(8, 22, 52, 0.78)";
      ctx.strokeStyle = "rgba(125, 211, 252, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(10, 8, 430, 32, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const warn = this.state === "playing" && this.timeLeft <= 5;
      const blink = warn && Math.sin(t * 14) > 0;
      ctx.fillStyle = warn ? (blink ? "#ef4444" : "#fca5a5") : "#fde047";
      ctx.fillText(`⏱ ${Math.ceil(this.timeLeft)}s`, 22, 24);

      ctx.fillStyle = "#7dd3fc";
      ctx.fillText(`⭐ ${this.score} PKT`, 118, 24);

      ctx.fillStyle = "#f9a8d4";
      ctx.fillText(`🏆 ${Math.max(this.highscore, this.score)}`, 270, 24);
      ctx.restore();

      this.drawButton(ctx, "hub", "↩ Oberwelt", W - 122, 8, 112, 32, "#7dd3fc", 11);
    },

    drawIntro(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(6, 15, 38, 0.68)";
      ctx.fillRect(0, 0, W, H);

      const px = 140;
      const py = 54;
      const pw = 440;
      const ph = 300;
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(12, 74, 110, 0.96)");
      g.addColorStop(1, "rgba(15, 23, 42, 0.96)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 19px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("❄️ BLAUIS HEIMAT", W / 2, py + 32);
      ctx.fillStyle = "#bae6fd";
      ctx.font = "700 12px Rajdhani, sans-serif";
      ctx.fillText("Fange in 30 Sekunden so viele Schneeflocken wie möglich!", W / 2, py + 56);

      // Übersicht der 5 Flocken-Sorten
      FLAKE_TYPES.forEach((f, i) => {
        const fy = py + 86 + i * 28;
        drawFlakeSprite(ctx, f, px + 76, fy, 0, this.clock, 0.85);
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 12px Rajdhani, sans-serif";
        ctx.fillText(f.name, px + 104, fy);
        ctx.textAlign = "right";
        ctx.fillStyle = f.color;
        ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
        ctx.fillText(f.id === "gold" ? `+${f.pts} PKT · +${GOLD_BONUS_TIME}s` : `+${f.pts} PKT`, px + pw - 52, fy);
      });

      this.drawButton(ctx, "start", "▶  STARTEN", px + 95, py + 236, pw - 190, 40, "#4ade80", 14);
      ctx.restore();
    },

    drawResults(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(6, 15, 38, 0.72)";
      ctx.fillRect(0, 0, W, H);

      const px = 145;
      const py = 50;
      const pw = 430;
      const ph = 312;
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(12, 74, 110, 0.96)");
      g.addColorStop(1, "rgba(15, 23, 42, 0.96)");
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
      ctx.fillText("❄️ ZEIT ABGELAUFEN!", W / 2, py + 30);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 26px Orbitron, Rajdhani, sans-serif";
      ctx.fillText(`${this.score} PUNKTE`, W / 2, py + 66);

      ctx.fillStyle = this.isNewHs ? "#4ade80" : "#bae6fd";
      ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
      ctx.fillText(
        this.isNewHs ? `🏆 NEUER HIGHSCORE: ${this.highscore}` : `Highscore: ${this.highscore} · Flocken: ${this.totalCaught}`,
        W / 2,
        py + 94
      );

      // Aufschlüsselung nach Sorten
      FLAKE_TYPES.forEach((f, i) => {
        const bx = px + 46 + i * 84;
        const by = py + 138;
        drawFlakeSprite(ctx, f, bx, by, 0, this.clock, 0.9);
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
        ctx.fillText(`${this.counts[f.id] || 0}×`, bx, by + 24);
      });

      this.drawButton(ctx, "again", "↻  NOCHMAL SPIELEN", px + 40, py + 196, pw - 80, 38, "#4ade80", 13);
      this.drawButton(ctx, "hub", "↩  ZURÜCK ZUR OBERWELT", px + 40, py + 244, pw - 80, 34, "#38bdf8", 12);
      ctx.restore();
    }
  };

  window.BLAUIS_WELT_LEVELS?.register(scene);
})();
