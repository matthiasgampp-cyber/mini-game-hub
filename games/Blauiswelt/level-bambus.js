(() => {
  "use strict";

  /**
   * Blauis Welt – Level "Bambus Wald"
   * ------------------------------------------------------------------
   * Großer, frei überfliegbarer Bambuswald:
   * - Blaui fliegt frei in alle Richtungen (Tastatur & mobiler Virtual Joystick)
   * - 3 Pandas müssen nacheinander gefunden werden, versteckt hinter
   *   dichten Bambusgruppen, Büschen und Baumkronen
   * - Countdown-Timer pro Panda (wird pro Panda kürzer)
   */

  // Leicht anpassbare Zeitlimits (Sekunden) für Panda 1, 2 und 3:
  const PANDA_TIMES = [45, 32, 22];
  const TOTAL_PANDAS = PANDA_TIMES.length;
  const MIN_SPAWN_DIST = 460; // Mindestabstand eines neuen Pandas zu Blaui
  const PANDA_ALERT_DIST = 175; // Ab dieser Nähe kommt der Panda hinter dem Bambus hervor
  const TIGER_COUNT = 2;
  const TIGER_ALERT_DIST = 175; // Ab dieser Nähe kommt der Tiger hinter dem Versteck hervor
  const TIGER_CATCH_DIST = 34;  // Fangradius, sobald der Tiger hervorgetreten ist

  const W = 720;
  const H = 405;
  const WORLD_W = 1600;
  const WORLD_H = 1020;
  const TAU = Math.PI * 2;

  const MOVE_SPEED = 240;
  const STORAGE_BEST_KEY = "blauiswelt_bambus_best_time";

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randRange = (lo, hi) => lo + Math.random() * (hi - lo);
  const randInt = (lo, hi) => Math.floor(randRange(lo, hi + 1));

  function fmtTime(sec) {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    const d = Math.floor((s * 10) % 10);
    return m > 0 ? `${m}:${String(r).padStart(2, "0")}.${d}` : `${r}.${d}s`;
  }

  function loadBestTime() {
    try {
      const v = Number(localStorage.getItem(STORAGE_BEST_KEY));
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch (_) {
      return null;
    }
  }

  function saveBestTime(sec) {
    try {
      localStorage.setItem(STORAGE_BEST_KEY, sec.toFixed(2));
    } catch (_) {}
  }

  // ------------------------------------------------------------------
  // Versteck-Spots & Hintergrund-Deko
  // ------------------------------------------------------------------
  function generateHidingSpots() {
    const spots = [];
    let tries = 0;

    while (spots.length < 135 && tries < 3600) {
      tries++;
      const x = randRange(55, WORLD_W - 55);
      const y = randRange(80, WORLD_H - 45);
      if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < 66)) continue;

      spots.push({
        id: spots.length,
        x,
        y,
        type: "bamboo",
        scale: randRange(0.92, 1.24),
        seed: randRange(0, 100)
      });
    }
    return spots;
  }

  const BG_STALKS_FAR = Array.from({ length: 135 }, () => ({
    x: randRange(0, WORLD_W),
    w: randRange(8, 15),
    hue: randInt(95, 135),
    sway: randRange(0, TAU)
  }));

  const BG_STALKS_MID = Array.from({ length: 96 }, () => ({
    x: randRange(0, WORLD_W),
    w: randRange(12, 20),
    hue: randInt(90, 128),
    sway: randRange(0, TAU)
  }));

  const FLOATING_LEAVES = Array.from({ length: 36 }, () => ({
    x: randRange(0, WORLD_W),
    y: randRange(0, WORLD_H),
    vx: randRange(10, 26),
    vy: randRange(14, 30),
    rot: randRange(0, TAU),
    size: randRange(4, 7.5),
    ph: randRange(0, TAU)
  }));

  // ------------------------------------------------------------------
  // Zeichenhelfer
  // ------------------------------------------------------------------
  function drawPanda(ctx, x, y, t, rustlePhase, emerge = 0) {
    // Panda lugt leicht hervor und tritt bei Nähe komplett hinter dem Bambus heraus
    const peek = emerge < 0.15 && Math.sin(t * 2.1 + rustlePhase) > 0.35 ? Math.sin(t * 4.2 + rustlePhase) * 4 : 0;
    const bounce = emerge > 0.1 ? Math.abs(Math.sin(t * 7 + rustlePhase)) * 3 * emerge : 0;
    ctx.save();
    ctx.translate(x + peek, y - bounce);

    // Körper
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -10, 13, 12, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Schwarze Arme/Beine
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(-10, -11, 4.5, 6.5, 0.3, 0, TAU);
    ctx.ellipse(10, -11, 4.5, 6.5, -0.3, 0, TAU);
    ctx.ellipse(-6, -1, 4.5, 3.2, 0, 0, TAU);
    ctx.ellipse(6, -1, 4.5, 3.2, 0, 0, TAU);
    ctx.fill();

    // Kopf
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -24, 11.5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Ohren
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-9, -33, 4.2, 0, TAU);
    ctx.arc(9, -33, 4.2, 0, TAU);
    ctx.fill();

    // Augenflecken + Augen
    [-1, 1].forEach((s) => {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(s * 4.5, -25, 3.3, 4, s * 0.25, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s * 4.5, -25.5, 1.3, 0, TAU);
      ctx.fill();
    });

    // Nase
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(0, -21, 2.2, 1.5, 0, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawTiger(ctx, x, y, t, rustlePhase, emerge) {
    const peek = emerge < 0.15 && Math.sin(t * 2.4 + rustlePhase) > 0.25 ? Math.sin(t * 4.5 + rustlePhase) * 4 : 0;
    const bounce = emerge > 0.1 ? Math.abs(Math.sin(t * 10 + rustlePhase)) * 3 * emerge : 0;
    ctx.save();
    ctx.translate(x + peek, y - bounce);

    // Warnschein beim Hervorkommen
    if (emerge > 0.08) {
      const a = 0.35 * emerge;
      const wg = ctx.createRadialGradient(0, -18, 4, 0, -18, 42);
      wg.addColorStop(0, `rgba(249, 115, 22, ${a})`);
      wg.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(0, -18, 42, 0, TAU);
      ctx.fill();
    }

    // Schwanz
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(10, -8);
    ctx.quadraticCurveTo(20, -14 + Math.sin(t * 5 + rustlePhase) * 4, 18, -22);
    ctx.stroke();

    // Körper
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -10, 13.5, 11.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Streifen am Körper
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 1.8;
    [-6, 0, 6].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx, -17);
      ctx.lineTo(sx * 0.7, -8);
      ctx.stroke();
    });

    // Kopf
    ctx.fillStyle = "#fb923c";
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -24, 11.5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Ohren
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.arc(-8.5, -33, 4, 0, TAU);
    ctx.arc(8.5, -33, 4, 0, TAU);
    ctx.fill();

    // Weiße Schnauze
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.ellipse(0, -20.5, 5.5, 4, 0, 0, TAU);
    ctx.fill();

    // Funkelnde Tiger-Augen
    [-1, 1].forEach((s) => {
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.ellipse(s * 4.2, -25.5, 2.3, 2, -s * 0.25, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(s * 4.2, -25.5, 1.1, 0, TAU);
      ctx.fill();
    });

    // Nase
    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.ellipse(0, -21.5, 2.2, 1.4, 0, 0, TAU);
    ctx.fill();

    // Warn-Sprechblase beim Hervorkommen
    if (emerge > 0.25) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-22, -55, 44, 17, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#c2410c";
      ctx.font = "800 10px Orbitron, Rajdhani, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Grrr!", 0, -46.5);
    }

    ctx.restore();
  }

  function drawHidingSpot(ctx, spot, t, hasPanda) {
    const rustle = hasPanda ? Math.sin(t * 8 + spot.seed) * 2.6 : Math.sin(t * 1.4 + spot.seed) * 0.8;
    ctx.save();
    ctx.translate(spot.x + rustle * 0.4, spot.y);
    ctx.scale(spot.scale, spot.scale);

    // Bodenschatten
    ctx.fillStyle = "rgba(6, 40, 20, 0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 44, 11, 0, 0, TAU);
    ctx.fill();

    if (spot.type === "bamboo") {
      const stalks = [-24, -10, 6, 22];
      stalks.forEach((sx, i) => {
        const h = 88 + (i % 2) * 18;
        const topX = sx + rustle * (0.7 + i * 0.15);
        const bg = ctx.createLinearGradient(sx - 5, 0, sx + 5, 0);
        bg.addColorStop(0, "#15803d");
        bg.addColorStop(0.5, "#84cc16");
        bg.addColorStop(1, "#166534");
        ctx.strokeStyle = bg;
        ctx.lineWidth = 8.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx, 6);
        ctx.quadraticCurveTo(sx + rustle * 0.3, -h * 0.5, topX, -h);
        ctx.stroke();

        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 1.6;
        for (let y = -12; y > -h + 10; y -= 22) {
          const frac = -y / h;
          const nx = sx + (topX - sx) * frac;
          ctx.beginPath();
          ctx.moveTo(nx - 5, y);
          ctx.lineTo(nx + 5, y);
          ctx.stroke();

          ctx.fillStyle = i % 2 ? "#4ade80" : "#65a30d";
          ctx.beginPath();
          ctx.ellipse(nx + (i % 2 ? 12 : -12), y - 3, 12, 4, i % 2 ? -0.4 : 0.4, 0, TAU);
          ctx.fill();
        }
      });

      // Dichter Blätterbusch davor
      ctx.fillStyle = "#166534";
      [[-18, -8, 18], [0, -14, 21], [19, -7, 17]].forEach(([bx, by, br]) => {
        ctx.beginPath();
        ctx.arc(bx + rustle * 0.3, by, br, 0, TAU);
        ctx.fill();
      });
    } else if (spot.type === "bush") {
      const puffs = [
        [-24, -6, 19, "#15803d"],
        [24, -6, 19, "#15803d"],
        [-12, -20, 22, "#16a34a"],
        [14, -18, 21, "#22c55e"],
        [0, -10, 24, "#4ade80"]
      ];
      puffs.forEach(([bx, by, br, col], i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(bx + rustle * (0.25 + i * 0.08), by, br, 0, TAU);
        ctx.fill();
      });
      // Kleine Beeren / Blüten
      ctx.fillStyle = "#fde047";
      [[-14, -16], [8, -22], [18, -8], [-4, -4]].forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(fx + rustle * 0.3, fy, 2.8, 0, TAU);
        ctx.fill();
      });
    } else {
      // Baumkrone / dichter Bambushain-Schirm
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-7, -26, 14, 34);
      const canopy = [
        [-24, -36, 22, "#14532d"],
        [24, -36, 22, "#14532d"],
        [-14, -52, 24, "#15803d"],
        [14, -52, 24, "#16a34a"],
        [0, -40, 27, "#22c55e"]
      ];
      canopy.forEach(([bx, by, br, col], i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(bx + rustle * (0.3 + i * 0.06), by, br, 0, TAU);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // Szene "Bambus Wald"
  // ------------------------------------------------------------------
  const scene = {
    id: "bambus",
    name: "Bambus Wald",
    subtitle: "Finde die 3 Pandas",
    custom: true,

    state: "playing", // playing | won | lost
    clock: 0,
    totalTime: 0,
    timeLeft: PANDA_TIMES[0],
    pandasFound: 0,
    spots: [],
    activeSpot: null,
    panda: { emerge: 0, side: 1, x: 0, y: 0 },
    tigers: [],
    lostReason: "time", // time | tiger
    cam: { x: 0, y: 0 },
    player: { x: 0, y: 0, vx: 0, vy: 0, facing: 1, cycle: 0 },
    particles: [],
    floatingTexts: [],
    bestTime: null,
    isNewBest: false,
    ui: [],
    game: null,

    enter(game) {
      this.game = game;
      this.bestTime = loadBestTime();
      this.resetLevel();
    },

    leave() {
      this.game = null;
    },

    resetLevel() {
      this.spots = generateHidingSpots();
      this.state = "playing";
      this.totalTime = 0;
      this.pandasFound = 0;
      this.timeLeft = PANDA_TIMES[0];
      this.isNewBest = false;
      this.particles = [];
      this.floatingTexts = [];

      this.player = {
        x: WORLD_W * 0.5,
        y: WORLD_H * 0.5,
        vx: 0,
        vy: 0,
        facing: 1,
        cycle: 0
      };

      this.cam.x = clamp(this.player.x - W * 0.5, 0, WORLD_W - W);
      this.cam.y = clamp(this.player.y - H * 0.5, 0, WORLD_H - H);

      this.lostReason = "time";
      this.spawnTigers();
      this.spawnNextPanda(null);
      this.addFloatingText(this.player.x, this.player.y - 62, "Finde 3 Pandas! Vorsicht vor den 2 Tigern! 🐼🐯", "#fef08a");
    },

    spawnTigers() {
      this.tigers = [];
      const safe = this.spots.filter((s) => Math.hypot(s.x - this.player.x, s.y - this.player.y) >= 250);
      const pool = safe.length >= TIGER_COUNT ? [...safe] : [...this.spots];
      for (let i = 0; i < TIGER_COUNT && pool.length > 0; i++) {
        const idx = randInt(0, pool.length - 1);
        const picked = pool.splice(idx, 1)[0];
        this.tigers.push({
          spot: picked,
          emerge: 0,
          side: 1,
          x: picked.x,
          y: picked.y - 6
        });
      }
    },

    spawnNextPanda(excludeSpot) {
      const blocked = new Set(this.tigers.map((tg) => tg.spot));
      if (excludeSpot) blocked.add(excludeSpot);
      const far = this.spots.filter(
        (s) => !blocked.has(s) && Math.hypot(s.x - this.player.x, s.y - this.player.y) >= MIN_SPAWN_DIST
      );
      const pool = far.length > 0 ? far : this.spots.filter((s) => !blocked.has(s));
      this.activeSpot = pool[randInt(0, pool.length - 1)] || this.spots[0];
      this.panda = {
        emerge: 0,
        side: 1,
        x: this.activeSpot.x,
        y: this.activeSpot.y - 6
      };
    },

    spawnParticles(x, y, color, count = 12, spread = 130) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const sp = 30 + Math.random() * spread;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 20,
          life: 0.45 + Math.random() * 0.45,
          max: 0.9,
          color,
          r: 2 + Math.random() * 2.4
        });
      }
    },

    addFloatingText(x, y, text, color = "#fef08a") {
      this.floatingTexts.push({ x, y, vy: -24, text, color, life: 2.0, max: 2.0 });
    },

    toHub() {
      this.game?.returnToHub?.("bambus");
    },

    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "backspace") {
        e.preventDefault?.();
        this.toHub();
      } else if ((this.state === "won" || this.state === "lost") && k === "r") {
        this.resetLevel();
      }
    },

    onPointer(x, y) {
      for (let i = this.ui.length - 1; i >= 0; i--) {
        const b = this.ui[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          if (b.id === "hub") this.toHub();
          else if (b.id === "again") this.resetLevel();
          return;
        }
      }
    },

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------
    update(dt, game, action) {
      this.clock += dt;

      // Schwebende Blätter
      FLOATING_LEAVES.forEach((lf) => {
        lf.x = (lf.x + lf.vx * dt + Math.sin(this.clock * 1.5 + lf.ph) * 14 * dt) % WORLD_W;
        lf.y = (lf.y + lf.vy * dt) % WORLD_H;
        lf.rot += dt * 1.4;
      });

      this.particles = this.particles.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.life > 0;
      });
      this.floatingTexts = this.floatingTexts.filter((ft) => {
        ft.life -= dt;
        ft.y += ft.vy * dt;
        return ft.life > 0;
      });

      if (this.state === "won" || this.state === "lost") {
        if (action) this.resetLevel();
        return;
      }

      // Countdown & Gesamtzeit
      this.totalTime += dt;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) {
        this.lostReason = "time";
        this.state = "lost";
        return;
      }

      // Freie Flug-Bewegung in alle Richtungen
      const p = this.player;
      const inp = game.input || {};
      let dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      let dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      const k = Math.min(1, 10 * dt);
      p.vx += (dx * MOVE_SPEED - p.vx) * k;
      p.vy += (dy * MOVE_SPEED - p.vy) * k;
      p.x = clamp(p.x + p.vx * dt, 32, WORLD_W - 32);
      p.y = clamp(p.y + p.vy * dt, 58, WORLD_H - 30);

      const speed = Math.hypot(p.vx, p.vy);
      if (Math.abs(p.vx) > 10) p.facing = p.vx > 0 ? 1 : -1;
      p.cycle += dt * (speed > 20 ? 10 : 3);

      // Flug-Glitzerpartikel
      if (speed > 35 && Math.random() < 0.45) {
        this.particles.push({
          x: p.x - p.facing * 12 + randRange(-6, 6),
          y: p.y - 22 + randRange(-8, 8),
          vx: -p.vx * 0.15 + randRange(-15, 15),
          vy: -p.vy * 0.15 + randRange(-15, 15),
          life: 0.45,
          max: 0.45,
          color: Math.random() < 0.5 ? "#bae6fd" : "#fef08a",
          r: randRange(1.6, 3)
        });
      }

      // Tiger: kommen hinter dem Baum/Versteck hervor, wenn man ihnen nahe kommt
      for (const tg of this.tigers) {
        const s = tg.spot;
        const distToSpot = Math.hypot(p.x - s.x, p.y - 18 - (s.y - 14));
        if (distToSpot < TIGER_ALERT_DIST) {
          if (tg.emerge < 0.05) {
            tg.side = p.x >= s.x ? 1 : -1;
          }
          tg.emerge = Math.min(1, tg.emerge + dt * 1.9);
        } else {
          tg.emerge = Math.max(0, tg.emerge - dt * 1.4);
        }

        // Position gleitet seitlich & leicht nach vorn aus dem Versteck
        tg.x = s.x + tg.side * 34 * tg.emerge;
        tg.y = s.y - 6 + 16 * tg.emerge;

        // Erst wenn der Tiger deutlich hervorgetreten ist, kann er Blaui erwischen -> Zeit zum Ausweichen!
        if (tg.emerge >= 0.72 && Math.hypot(p.x - tg.x, p.y - 18 - (tg.y - 10)) < TIGER_CATCH_DIST) {
          this.lostReason = "tiger";
          this.state = "lost";
          this.spawnParticles(p.x, p.y - 20, "#f97316", 20, 160);
          this.spawnParticles(p.x, p.y - 20, "#ef4444", 12, 130);
          this.addFloatingText(tg.x, tg.y - 32, "🐯 Grrr! Zu nah am Tiger!", "#fca5a5");
          return;
        }
      }

      // Panda: kommt hinter dem Bambus hervor, wenn man ihm nahe kommt
      if (this.activeSpot) {
        const s = this.activeSpot;
        const distToSpot = Math.hypot(p.x - s.x, p.y - 18 - (s.y - 14));
        if (distToSpot < PANDA_ALERT_DIST) {
          if (this.panda.emerge < 0.05) {
            this.panda.side = p.x >= s.x ? 1 : -1;
          }
          this.panda.emerge = Math.min(1, this.panda.emerge + dt * 2.2);
        } else {
          this.panda.emerge = Math.max(0, this.panda.emerge - dt * 1.6);
        }

        this.panda.x = s.x + this.panda.side * 32 * this.panda.emerge;
        this.panda.y = s.y - 6 + 15 * this.panda.emerge;

        const px = this.panda.x;
        const py = this.panda.y - 8;
        if (Math.hypot(p.x - px, p.y - 18 - py) < 44) {
          this.pandasFound += 1;
          this.spawnParticles(px, py, "#fde047", 24, 170);
          this.spawnParticles(px, py, "#4ade80", 14, 140);

          if (this.pandasFound >= TOTAL_PANDAS) {
            this.state = "won";
            if (this.bestTime === null || this.totalTime < this.bestTime) {
              this.bestTime = this.totalTime;
              this.isNewBest = true;
              saveBestTime(this.totalTime);
            }
            this.addFloatingText(px, py - 30, "🐼 Alle 3 Pandas gefunden!", "#fde047");
            return;
          } else {
            this.timeLeft = PANDA_TIMES[this.pandasFound];
            this.addFloatingText(
              px,
              py - 30,
              `Panda ${this.pandasFound}/${TOTAL_PANDAS} gefunden! Schnell zum nächsten!`,
              "#fde047"
            );
            this.spawnNextPanda(this.activeSpot);
          }
        }
      }

      // Weiche Kamera-Verfolgung
      const targetX = clamp(p.x - W * 0.5, 0, WORLD_W - W);
      const targetY = clamp(p.y - H * 0.5, 0, WORLD_H - H);
      const camK = Math.min(1, 7.5 * dt);
      this.cam.x += (targetX - this.cam.x) * camK;
      this.cam.y += (targetY - this.cam.y) * camK;
    },

    // ------------------------------------------------------------------
    // Zeichnen
    // ------------------------------------------------------------------
    draw(ctx, t) {
      this.ui = [];
      const cx = this.cam.x;
      const cy = this.cam.y;

      // 1. Wald-Hintergrundverlauf
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#052e16");
      bg.addColorStop(0.55, "#14532d");
      bg.addColorStop(1, "#1e3a23");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 2. Warme Sonnenstrahlen von schräg oben
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const bx = ((i * 220 - cx * 0.25) % (W + 300)) - 100;
        const g = ctx.createLinearGradient(bx, 0, bx + 130, H);
        g.addColorStop(0, "rgba(254, 240, 138, 0.14)");
        g.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + 75, 0);
        ctx.lineTo(bx + 230, H);
        ctx.lineTo(bx + 90, H);
        ctx.fill();
      }
      ctx.restore();

      // 3. Parallax-Bambushalme (Ferne Ebene)
      BG_STALKS_FAR.forEach((s) => {
        const sx = s.x - cx * 0.3;
        if (sx < -30 || sx > W + 30) return;
        const sw = Math.sin(t * 0.9 + s.sway) * 6;
        ctx.strokeStyle = `hsla(${s.hue}, 45%, 22%, 0.65)`;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(sx, H);
        ctx.quadraticCurveTo(sx + sw * 0.5, H * 0.5, sx + sw, -10);
        ctx.stroke();
      });

      // 4. Parallax-Bambushalme (Mittlere Ebene)
      BG_STALKS_MID.forEach((s) => {
        const sx = s.x - cx * 0.55;
        if (sx < -40 || sx > W + 40) return;
        const sw = Math.sin(t * 1.1 + s.sway) * 8;
        ctx.strokeStyle = `hsla(${s.hue}, 52%, 28%, 0.72)`;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(sx, H);
        ctx.quadraticCurveTo(sx + sw * 0.5, H * 0.5, sx + sw, -10);
        ctx.stroke();
      });

      // 5. Spielwelt (Kamera)
      ctx.save();
      ctx.translate(-cx, -cy);

      // Leichte Waldboden-Inseln unter den Verstecken
      ctx.fillStyle = "rgba(21, 128, 61, 0.25)";
      for (const s of this.spots) {
        if (s.x < cx - 120 || s.x > cx + W + 120 || s.y < cy - 120 || s.y > cy + H + 120) continue;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + 10, 68, 22, 0, 0, TAU);
        ctx.fill();
      }

      // Verstecke, aktiver Panda & 2 Tiger (tiefensortiert nach Y)
      const active = this.activeSpot;
      const tigerBySpot = new Map(this.tigers.map((tg) => [tg.spot, tg]));
      const drawables = [...this.spots].sort((a, b) => a.y - b.y);
      for (const s of drawables) {
        if (s.x < cx - 100 || s.x > cx + W + 100 || s.y < cy - 120 || s.y > cy + H + 120) continue;
        const isPanda = s === active && this.state === "playing";
        const tg = tigerBySpot.get(s);
        if (isPanda && this.panda.emerge < 0.35) {
          drawPanda(ctx, this.panda.x, this.panda.y, t, s.seed, this.panda.emerge);
        } else if (tg && tg.emerge < 0.35) {
          drawTiger(ctx, tg.x, tg.y, t, s.seed, tg.emerge);
        }
        drawHidingSpot(ctx, s, t, isPanda || Boolean(tg));
        if (isPanda && this.panda.emerge >= 0.35) {
          drawPanda(ctx, this.panda.x, this.panda.y, t, s.seed, this.panda.emerge);
        } else if (tg && tg.emerge >= 0.35) {
          drawTiger(ctx, tg.x, tg.y, t, s.seed, tg.emerge);
        }
      }

      // Blaui (schwebend / fliegend)
      const p = this.player;
      const hover = Math.sin(t * 5) * 3.5;
      const tilt = clamp(p.vx / MOVE_SPEED, -1, 1) * 0.14;
      window.BLAUI_DRAW?.(ctx, p.x, p.y + hover, {
        facing: p.facing,
        cycle: p.cycle,
        moving: Math.hypot(p.vx, p.vy) > 15,
        t,
        scale: 0.9,
        pose: {
          rot: tilt,
          armL: 1.7 + Math.sin(t * 8) * 0.25,
          armR: 1.7 - Math.sin(t * 8) * 0.25,
          legs: [{ dx: -2, lift: 3 }, { dx: 2, lift: 2 }]
        }
      });

      // Partikel
      this.particles.forEach((pt) => {
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, TAU);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Schwebende Blätter im Vordergrund
      FLOATING_LEAVES.forEach((lf) => {
        if (lf.x < cx - 20 || lf.x > cx + W + 20 || lf.y < cy - 20 || lf.y > cy + H + 20) return;
        ctx.save();
        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.rot);
        ctx.fillStyle = "rgba(134, 239, 172, 0.72)";
        ctx.beginPath();
        ctx.ellipse(0, 0, lf.size, lf.size * 0.42, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      // Schwebetexte
      this.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / 0.5);
        ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#052e16";
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      // 6. HUD
      this.drawHud(ctx, t);

      if (this.state === "won" || this.state === "lost") {
        this.drawEndOverlay(ctx);
      }
    },

    drawButton(ctx, id, label, x, y, w, h, color, size = 12) {
      this.ui.push({ id, x, y, w, h });
      ctx.save();
      ctx.fillStyle = "rgba(5, 46, 22, 0.9)";
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
      ctx.fillStyle = "rgba(5, 46, 22, 0.78)";
      ctx.strokeStyle = "rgba(74, 222, 128, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(10, 8, 250, 32, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "#86efac";
      ctx.fillText(`🐼 ${this.pandasFound}/${TOTAL_PANDAS}`, 22, 24);

      const warn = this.state === "playing" && this.timeLeft <= 5;
      const blink = warn && Math.sin(t * 14) > 0;
      ctx.fillStyle = warn ? (blink ? "#ef4444" : "#fca5a5") : "#fde047";
      ctx.fillText(`⏱ ${fmtTime(this.timeLeft)}`, 124, 24);
      ctx.restore();

      this.drawButton(ctx, "hub", "↩ Oberwelt", W - 122, 8, 112, 32, "#4ade80", 11);
    },

    drawEndOverlay(ctx) {
      const won = this.state === "won";
      ctx.save();
      ctx.fillStyle = "rgba(2, 20, 10, 0.72)";
      ctx.fillRect(0, 0, W, H);

      const px = 165;
      const py = 72;
      const pw = 390;
      const ph = 260;

      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, won ? "rgba(20, 83, 45, 0.96)" : "rgba(69, 10, 10, 0.96)");
      g.addColorStop(1, "rgba(15, 23, 42, 0.96)");
      ctx.fillStyle = g;
      ctx.strokeStyle = won ? "#4ade80" : "#f87171";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = won ? "#fde047" : "#fca5a5";
      ctx.font = "900 20px Orbitron, Rajdhani, sans-serif";
      const loseTitle = this.lostReason === "tiger" ? "🐯 VOM TIGER ERWISCHT!" : "⏰ ZEIT ABGELAUFEN!";
      ctx.fillText(won ? "🐼 ALLE 3 PANDAS GEFUNDEN!" : loseTitle, W / 2, py + 42);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 14px Rajdhani, sans-serif";
      if (won) {
        ctx.fillText(`Gesamtzeit: ${fmtTime(this.totalTime)}`, W / 2, py + 86);
        if (this.bestTime !== null) {
          ctx.fillStyle = this.isNewBest ? "#4ade80" : "#fde047";
          ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
          ctx.fillText(
            this.isNewBest ? `★ NEUE BESTZEIT: ${fmtTime(this.bestTime)}` : `Bestzeit: ${fmtTime(this.bestTime)}`,
            W / 2,
            py + 114
          );
        }
      } else {
        ctx.fillText(`Gefundene Pandas: ${this.pandasFound} / ${TOTAL_PANDAS}`, W / 2, py + 94);
      }

      this.drawButton(ctx, "again", "↻  NOCHMAL", px + 40, py + 150, pw - 80, 38, "#4ade80", 13);
      this.drawButton(ctx, "hub", "↩  ZURÜCK ZUR OBERWELT", px + 40, py + 198, pw - 80, 34, "#38bdf8", 12);
      ctx.restore();
    }
  };

  window.BLAUIS_WELT_LEVELS?.register(scene);
})();
