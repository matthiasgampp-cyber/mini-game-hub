(() => {
  "use strict";

  /**
   * Blauis Welt – Level "Wolken Reich"
   * ------------------------------------------------------------------
   * Großes, prozedural generiertes Wolken-Jump'n'Run:
   * - Weiche Kamera-Verfolgung in einer ca. 3,5x größeren Himmelswelt
   * - Bei jedem Betreten / Neustart neu ausgewürfeltes Wolken-Layout
   *   mit Abzweigungen, Sackgassen & Lösbarkeits-Garantie (BFS)
   * - Normale Wolken, bewegliche Wolken, federnde Regenbogen-Wolken
   * - Absturz-Schutz per Wolkenlift / Fallschirm zur letzten sicheren Wolke
   * - Ziel: Das versteckte goldene Schaf finden (nur subtile Nähe-Hinweise)
   */

  const W = 720;
  const H = 405;
  const WORLD_W = 2520;
  const WORLD_H = 1520;
  const TAU = Math.PI * 2;

  // Physik-Konstanten (aufeinander abgestimmt für faire Sprünge)
  const GRAVITY = 880;
  const MAX_FALL = 560;
  const MOVE_SPEED = 215;
  const JUMP_VY = -438;
  const BOUNCE_VY = -645;

  const STORAGE_BEST_KEY = "blauiswelt_wolken_best_time";

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randRange = (lo, hi) => lo + Math.random() * (hi - lo);
  const randInt = (lo, hi) => Math.floor(randRange(lo, hi + 1));

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const d = Math.floor((sec * 10) % 10);
    return `${m}:${String(s).padStart(2, "0")}.${d}`;
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
  // Prozedurale Wolken-Generierung mit Lösbarkeits-Garantie
  // ------------------------------------------------------------------
  function canPlaceCloud(clouds, cx, cy, w) {
    if (cx - w * 0.5 < 55 || cx + w * 0.5 > WORLD_W - 55) return false;
    if (cy < 130 || cy > WORLD_H - 95) return false;
    for (const c of clouds) {
      const minX = (c.w + w) * 0.5 + 22;
      const minY = 56;
      if (Math.abs(c.baseX - cx) < minX && Math.abs(c.baseY - cy) < minY) {
        return false;
      }
    }
    return true;
  }

  function isJumpReachable(from, to) {
    if (from === to) return false;
    const dxCenter = Math.abs(from.baseX - to.baseX);
    const maxReachX = (from.w + to.w) * 0.5 + 110;
    const dy = to.baseY - from.baseY; // negativ = nach oben
    const maxUp = from.type === "bounce" ? 195 : 88;
    if (dy < -maxUp) return false;
    // Wenn es hoch geht, ist die horizontale Reichweite etwas kleiner
    const heightFactor = dy < 0 ? 1 - Math.abs(dy) / (maxUp * 1.45) : 1;
    return dxCenter <= maxReachX * Math.max(0.48, heightFactor);
  }

  function generateWorld() {
    for (let attempt = 0; attempt < 18; attempt++) {
      const clouds = [];
      const startX = randRange(WORLD_W * 0.35, WORLD_W * 0.65);
      const startY = WORLD_H - 135;

      const startCloud = {
        id: 0,
        baseX: startX,
        baseY: startY,
        x: startX,
        y: startY,
        w: 150,
        h: 26,
        type: "normal",
        checkpoint: true,
        visited: true,
        puffs: makePuffs(150),
        bounceAnim: 0
      };
      clouds.push(startCloud);

      // Hauptpfad + Verzweigungen aufbauen
      const frontier = [startCloud];
      const targetCount = 46;
      let tries = 0;

      while (clouds.length < targetCount && tries < 750) {
        tries++;
        // Bevorzuge neuere/höhere Wolken für Abwechslung, aber manchmal auch frühere für Abzweigungen
        const pickIdx =
          Math.random() < 0.68
            ? Math.max(0, frontier.length - 1 - randInt(0, Math.min(4, frontier.length - 1)))
            : randInt(0, frontier.length - 1);
        const parent = frontier[pickIdx];

        const makeBounce = parent.type !== "bounce" && Math.random() < 0.22;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const stepX = dir * randRange(105, 175);
        const maxRise = parent.type === "bounce" ? 175 : 74;
        const stepY =
          parent.type === "bounce"
            ? -randRange(115, maxRise)
            : randRange(-maxRise, 52);

        const w = makeBounce ? randRange(86, 108) : randRange(92, 134);
        const cx = parent.baseX + stepX;
        const cy = parent.baseY + stepY;

        if (!canPlaceCloud(clouds, cx, cy, w)) continue;

        let type = "normal";
        if (makeBounce) type = "bounce";
        else if (Math.random() < 0.18 && clouds.length > 4) type = "moving";

        const moveAxis = type === "moving" ? (Math.random() < 0.72 ? "x" : "y") : null;
        const moveAmp = type === "moving" ? (moveAxis === "x" ? randRange(32, 62) : randRange(22, 38)) : 0;

        const cloud = {
          id: clouds.length,
          baseX: cx,
          baseY: cy,
          x: cx,
          y: cy,
          w,
          h: 24,
          type,
          moveAxis,
          moveAmp,
          moveSpeed: randRange(0.9, 1.55),
          movePhase: randRange(0, TAU),
          checkpoint: false,
          visited: false,
          puffs: makePuffs(w),
          bounceAnim: 0
        };

        clouds.push(cloud);
        frontier.push(cloud);
      }

      // BFS-Erreichbarkeitsprüfung ab Startwolke
      const dist = new Map();
      dist.set(0, 0);
      const queue = [startCloud];
      while (queue.length > 0) {
        const cur = queue.shift();
        const d = dist.get(cur.id);
        for (const nxt of clouds) {
          if (dist.has(nxt.id)) continue;
          if (isJumpReachable(cur, nxt)) {
            dist.set(nxt.id, d + 1);
            queue.push(nxt);
          }
        }
      }

      // Alle erreichbaren Kandidaten für das goldene Schaf sammeln (weit weg & möglichst hoch/abgelegen)
      const candidates = clouds.filter((c) => {
        if (!dist.has(c.id)) return false;
        const hops = dist.get(c.id);
        const euclid = Math.hypot(c.baseX - startCloud.baseX, c.baseY - startCloud.baseY);
        return hops >= 7 && euclid >= 880 && c.type !== "bounce";
      });

      if (candidates.length > 0) {
        // Bewerte Kandidaten nach Distanz + Höhe, wähle unter den Top 3 zufällig
        candidates.sort((a, b) => {
          const sa = dist.get(a.id) * 65 + Math.hypot(a.baseX - startX, a.baseY - startY) * 0.5 + (WORLD_H - a.baseY) * 0.45;
          const sb = dist.get(b.id) * 65 + Math.hypot(b.baseX - startX, b.baseY - startY) * 0.5 + (WORLD_H - b.baseY) * 0.45;
          return sb - sa;
        });

        const topPick = candidates[randInt(0, Math.min(2, candidates.length - 1))];
        topPick.type = "normal";
        topPick.moveAmp = 0;
        topPick.w = Math.max(topPick.w, 128);
        topPick.puffs = makePuffs(topPick.w);
        topPick.hasSheep = true;

        // Checkpoints auf erreichbaren normalen Wolken (alle ~5-6 Hops)
        clouds.forEach((c) => {
          const d = dist.get(c.id);
          if (d && d % 5 === 0 && c.type === "normal" && !c.hasSheep) {
            c.checkpoint = true;
          }
        });

        return { clouds, startCloud, sheepCloud: topPick };
      }
    }

    // Fallback-Welt (sollte praktisch nie nötig sein)
    const fallback = [];
    for (let i = 0; i < 12; i++) {
      fallback.push({
        id: i,
        baseX: 280 + i * 165,
        baseY: WORLD_H - 150 - (i % 4) * 60,
        x: 280 + i * 165,
        y: WORLD_H - 150 - (i % 4) * 60,
        w: 120,
        h: 24,
        type: i % 4 === 2 ? "bounce" : "normal",
        checkpoint: i === 0 || i === 6,
        visited: i === 0,
        hasSheep: i === 11,
        puffs: makePuffs(120),
        bounceAnim: 0
      });
    }
    return { clouds: fallback, startCloud: fallback[0], sheepCloud: fallback[11] };
  }

  function makePuffs(w) {
    const count = Math.max(4, Math.round(w / 22));
    const puffs = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const dx = (t - 0.5) * (w - 26);
      const edge = 1 - Math.abs(t - 0.5) * 1.4;
      const r = 13 + Math.max(0, edge) * 9 + randRange(-2, 3);
      const dy = randRange(-4, 2) - Math.max(0, edge) * 4;
      puffs.push({ dx, dy, r });
    }
    return puffs;
  }

  // ------------------------------------------------------------------
  // Hintergrund-Deko (deterministisch)
  // ------------------------------------------------------------------
  const BG_STARS = Array.from({ length: 40 }, () => ({
    x: Math.random() * WORLD_W,
    y: Math.random() * (WORLD_H * 0.72),
    r: randRange(0.9, 2.3),
    ph: randRange(0, TAU)
  }));

  const BG_CLOUDS = Array.from({ length: 24 }, (_, i) => ({
    x: randRange(0, WORLD_W),
    y: randRange(80, WORLD_H - 140),
    s: randRange(0.7, 1.9),
    depth: i % 2 === 0 ? 0.25 : 0.45,
    speed: randRange(4, 12)
  }));

  const BG_RAINBOWS = [
    { x: 540, y: 520, r: 290, alpha: 0.22 },
    { x: 1620, y: 420, r: 340, alpha: 0.19 },
    { x: 2150, y: 820, r: 260, alpha: 0.18 }
  ];

  // ------------------------------------------------------------------
  // Zeichenhelfer
  // ------------------------------------------------------------------
  function drawCloudPlatform(ctx, c, t) {
    const bounceOffset = c.bounceAnim > 0 ? Math.sin(c.bounceAnim * Math.PI * 3) * 5 * c.bounceAnim : 0;
    const x = c.x;
    const y = c.y + bounceOffset;

    ctx.save();
    // Weicher Schatten unter der Wolke
    ctx.fillStyle = "rgba(56, 84, 146, 0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 14, c.w * 0.48, 8, 0, 0, TAU);
    ctx.fill();

    // Regenbogen-Akzent bei Sprungwolken
    if (c.type === "bounce") {
      const cols = ["#f87171", "#fb923c", "#fde047", "#4ade80", "#38bdf8", "#c084fc"];
      ctx.lineWidth = 3.2;
      cols.forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.arc(x, y + 8, c.w * 0.42 - i * 3.1, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      });
    }

    // Wolkenkörper
    const g = ctx.createLinearGradient(0, y - 18, 0, y + 14);
    if (c.type === "bounce") {
      g.addColorStop(0, "#fffbeb");
      g.addColorStop(1, "#fde68a");
    } else if (c.type === "moving") {
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#bae6fd");
    } else {
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#dbeafe");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    c.puffs.forEach((p) => {
      ctx.moveTo(x + p.dx + p.r, y + p.dy);
      ctx.arc(x + p.dx, y + p.dy, p.r, 0, TAU);
    });
    ctx.fill();

    // Glanzlinie oben
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - c.w * 0.32, y - 8);
    ctx.quadraticCurveTo(x, y - 16, x + c.w * 0.32, y - 8);
    ctx.stroke();

    // Checkpoint-Sternfähnchen
    if (c.checkpoint && !c.hasSheep) {
      const fx = x - c.w * 0.34;
      const fy = y - 10;
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy - 24);
      ctx.stroke();

      const wave = Math.sin(t * 4 + c.id) * 2.5;
      ctx.fillStyle = c.visited ? "#fbbf24" : "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(fx, fy - 24);
      ctx.lineTo(fx + 14, fy - 19 + wave);
      ctx.lineTo(fx, fy - 13);
      ctx.closePath();
      ctx.fill();
    }

    // Richtungspfeilchen auf beweglichen Wolken
    if (c.type === "moving") {
      ctx.fillStyle = "rgba(14, 116, 144, 0.55)";
      ctx.font = "700 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(c.moveAxis === "x" ? "◄ ►" : "▲ ▼", x, y + 5);
    }

    ctx.restore();
  }

  function drawGoldenSheep(ctx, x, y, t, nearDist) {
    const hop = Math.abs(Math.sin(t * 2.8)) * 3.5;
    ctx.save();
    ctx.translate(x, y - hop);

    // Goldener Schein
    const glowR = 34 + Math.sin(t * 3) * 4;
    const gg = ctx.createRadialGradient(0, -16, 4, 0, -16, glowR);
    gg.addColorStop(0, "rgba(253, 224, 71, 0.55)");
    gg.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, -16, glowR, 0, TAU);
    ctx.fill();

    // Schatten
    ctx.fillStyle = "rgba(180, 120, 20, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, hop, 15, 4, 0, 0, TAU);
    ctx.fill();

    // Beinchen
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    [-8, -3, 4, 9].forEach((lx) => {
      ctx.beginPath();
      ctx.moveTo(lx, -7);
      ctx.lineTo(lx, 0);
      ctx.stroke();
    });

    // Goldene Plüschwolle
    const wg = ctx.createRadialGradient(-4, -18, 2, 0, -15, 18);
    wg.addColorStop(0, "#fef9c3");
    wg.addColorStop(0.6, "#fde047");
    wg.addColorStop(1, "#eab308");
    ctx.fillStyle = wg;
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 1.2;

    const puffs = [
      [0, -15, 11],
      [-9, -14, 8],
      [9, -14, 8],
      [-5, -21, 8],
      [5, -21, 8],
      [0, -23, 8]
    ];
    ctx.beginPath();
    puffs.forEach(([px, py, r]) => {
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, TAU);
    });
    ctx.fill();
    ctx.stroke();

    // Köpfchen (nach links schauend)
    ctx.fillStyle = "#fef3c7";
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-13, -18, 7.5, 6.5, -0.15, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Öhrchen
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.ellipse(-7, -21, 4.5, 2.5, 0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Kleines Woll-Häubchen
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(-11, -24, 4, 0, TAU);
    ctx.fill();

    // Auge
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(-15, -19, 1.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-15.5, -19.5, 0.5, 0, TAU);
    ctx.fill();

    // Subtiles "Mäh!"-Bläschen nur in direkter Nähe
    if (nearDist < 310 && Math.sin(t * 2.1) > 0.25) {
      const bob = Math.sin(t * 4) * 2;
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(4, -48 + bob, 44, 18, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b45309";
      ctx.font = "800 10px Rajdhani, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Mäh! ♪", 26, -39 + bob);
    }

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // Szene "Wolken Reich"
  // ------------------------------------------------------------------
  const scene = {
    id: "wolken",
    name: "Wolken Reich",
    subtitle: "Finde das goldene Schaf",
    custom: true,

    state: "playing", // playing | rescuing | won
    clock: 0,
    elapsed: 0,
    jumps: 0,
    clouds: [],
    startCloud: null,
    sheepCloud: null,
    checkpoint: null,
    cam: { x: 0, y: 0 },
    player: { x: 0, y: 0, vx: 0, vy: 0, onGround: false, groundCloud: null, facing: 1, cycle: 0, coyote: 0, jumpBuf: 0 },
    rescue: null,
    particles: [],
    floatingTexts: [],
    prevJumpInput: false,
    wonTimer: 0,
    bestTime: null,
    isNewBest: false,
    ui: [],
    game: null,

    enter(game) {
      this.game = game;
      this.bestTime = loadBestTime();
      this.resetWorld();
    },

    leave() {
      this.game = null;
    },

    resetWorld() {
      const gen = generateWorld();
      this.clouds = gen.clouds;
      this.startCloud = gen.startCloud;
      this.sheepCloud = gen.sheepCloud;
      this.checkpoint = gen.startCloud;

      this.state = "playing";
      this.elapsed = 0;
      this.jumps = 0;
      this.wonTimer = 0;
      this.isNewBest = false;
      this.rescue = null;
      this.particles = [];
      this.floatingTexts = [];
      this.prevJumpInput = false;

      this.player = {
        x: this.startCloud.x,
        y: this.startCloud.y - 10,
        vx: 0,
        vy: 0,
        onGround: true,
        groundCloud: this.startCloud,
        facing: 1,
        cycle: 0,
        coyote: 0.12,
        jumpBuf: 0
      };

      this.cam.x = clamp(this.player.x - W * 0.5, 0, WORLD_W - W);
      this.cam.y = clamp(this.player.y - H * 0.55, 0, WORLD_H - H);
      this.addFloatingText(this.player.x, this.player.y - 54, "Finde das goldene Schaf! 🐑", "#fef08a");
    },

    spawnParticles(x, y, color, count = 10, spread = 130) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const sp = 35 + Math.random() * spread;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 40,
          life: 0.45 + Math.random() * 0.45,
          max: 0.9,
          color,
          r: 2 + Math.random() * 2.5
        });
      }
    },

    addFloatingText(x, y, text, color = "#fef08a") {
      this.floatingTexts.push({ x, y, vy: -26, text, color, life: 1.8, max: 1.8 });
    },

    toHub() {
      this.game?.returnToHub?.("wolken");
    },

    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "backspace") {
        e.preventDefault?.();
        this.toHub();
      } else if (this.state === "won" && k === "r") {
        this.resetWorld();
      }
    },

    onPointer(x, y) {
      for (let i = this.ui.length - 1; i >= 0; i--) {
        const b = this.ui[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          if (b.id === "hub") this.toHub();
          else if (b.id === "again") this.resetWorld();
          return;
        }
      }
    },

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------
    update(dt, game, action) {
      this.clock += dt;

      // Bewegliche Wolken aktualisieren
      for (const c of this.clouds) {
        if (c.bounceAnim > 0) c.bounceAnim = Math.max(0, c.bounceAnim - dt * 2.2);
        if (c.type === "moving") {
          const prevX = c.x;
          const prevY = c.y;
          const off = Math.sin(this.clock * c.moveSpeed + c.movePhase) * c.moveAmp;
          c.x = c.baseX + (c.moveAxis === "x" ? off : 0);
          c.y = c.baseY + (c.moveAxis === "y" ? off : 0);
          c.dx = c.x - prevX;
          c.dy = c.y - prevY;
        } else {
          c.dx = 0;
          c.dy = 0;
        }
      }

      // Partikel & Schwebetexte
      this.particles = this.particles.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 210 * dt;
        return p.life > 0;
      });
      this.floatingTexts = this.floatingTexts.filter((ft) => {
        ft.life -= dt;
        ft.y += ft.vy * dt;
        return ft.life > 0;
      });

      if (this.state === "won") {
        this.wonTimer += dt;
        if (Math.random() < 0.25) {
          this.spawnParticles(
            this.sheepCloud.x + randRange(-40, 40),
            this.sheepCloud.y - 30,
            ["#fde047", "#f472b6", "#38bdf8", "#4ade80"][randInt(0, 3)],
            3,
            90
          );
        }
        if (action && this.wonTimer > 1.1) {
          this.resetWorld();
        }
        return;
      }

      this.elapsed += dt;

      // Absturz-Schutz (Wolkenlift)
      if (this.state === "rescuing") {
        const r = this.rescue;
        r.t = Math.min(1, r.t + dt * 0.9);
        const ease = 1 - Math.pow(1 - r.t, 3);
        this.player.x = lerp(r.sx, r.tx, ease);
        this.player.y = lerp(r.sy, r.ty, ease) - Math.sin(r.t * Math.PI) * 35;
        this.updateCamera(dt);
        if (r.t >= 1) {
          this.state = "playing";
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.onGround = false;
          this.rescue = null;
        }
        return;
      }

      const p = this.player;
      const inp = game.input || {};
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

      // Sprung-Eingabe: Aktion/Leertaste ODER Hoch (edge-triggered)
      const jumpPressed = Boolean(action || (inp.up && !this.prevJumpInput));
      this.prevJumpInput = Boolean(inp.up);
      if (jumpPressed) p.jumpBuf = 0.14;
      else p.jumpBuf = Math.max(0, p.jumpBuf - dt);

      // Auf beweglicher Wolke mitfahren
      if (p.onGround && p.groundCloud) {
        p.x += p.groundCloud.dx || 0;
        p.y += p.groundCloud.dy || 0;
      }

      // Horizontale Bewegung
      const targetVx = dir * MOVE_SPEED;
      const accel = p.onGround ? 16 : 10;
      p.vx += (targetVx - p.vx) * Math.min(1, accel * dt);
      if (Math.abs(dir) > 0) p.facing = dir;

      if (p.onGround) {
        p.coyote = 0.12;
      } else {
        p.coyote = Math.max(0, p.coyote - dt);
      }

      // Sprung ausführen
      if (p.jumpBuf > 0 && p.coyote > 0) {
        p.vy = JUMP_VY;
        p.onGround = false;
        p.groundCloud = null;
        p.coyote = 0;
        p.jumpBuf = 0;
        this.jumps += 1;
        this.spawnParticles(p.x, p.y, "#e0f2fe", 6, 70);
      }

      // Gravitation
      p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);

      const prevY = p.y;
      p.x = clamp(p.x + p.vx * dt, 24, WORLD_W - 24);
      p.y += p.vy * dt;

      if (p.onGround && Math.abs(p.vx) > 15) {
        p.cycle += dt * 12;
      }

      // Einweg-Kollision von oben auf die Wolken
      p.onGround = false;
      p.groundCloud = null;

      if (p.vy >= 0) {
        for (const c of this.clouds) {
          const surfaceY = c.y - 9;
          const halfW = c.w * 0.45;
          if (Math.abs(p.x - c.x) <= halfW && prevY <= surfaceY + 8 && p.y >= surfaceY) {
            p.y = surfaceY;
            if (c.type === "bounce") {
              p.vy = BOUNCE_VY;
              p.onGround = false;
              p.coyote = 0;
              c.bounceAnim = 1;
              this.jumps += 1;
              this.spawnParticles(p.x, p.y, "#fde047", 14, 150);
              this.spawnParticles(p.x, p.y, "#f472b6", 8, 130);
            } else {
              p.vy = 0;
              p.onGround = true;
              p.groundCloud = c;
              if (c.checkpoint && !c.visited) {
                c.visited = true;
                this.checkpoint = c;
                this.spawnParticles(c.x - c.w * 0.34, c.y - 26, "#fbbf24", 12, 110);
                this.addFloatingText(c.x, c.y - 36, "Checkpoint ★", "#fde047");
              } else if (c.checkpoint) {
                this.checkpoint = c;
              }
            }
            break;
          }
        }
      }

      // Subtile Glitzer-Hinweise, wenn das goldene Schaf nahe ist
      const sheepDist = Math.hypot(p.x - this.sheepCloud.x, p.y - this.sheepCloud.y);
      if (sheepDist < 460 && Math.random() < (sheepDist < 260 ? 0.32 : 0.12)) {
        this.particles.push({
          x: this.sheepCloud.x + randRange(-55, 55),
          y: this.sheepCloud.y - randRange(12, 46),
          vx: randRange(-14, 14),
          vy: randRange(-36, -16),
          life: 0.7,
          max: 0.7,
          color: "#fde047",
          r: randRange(1.8, 3.2)
        });
      }

      // Ziel erreicht: Goldenes Schaf gefunden!
      if (Math.hypot(p.x - this.sheepCloud.x, p.y - (this.sheepCloud.y - 10)) < 42) {
        this.state = "won";
        this.wonTimer = 0;
        p.vx = 0;
        p.vy = 0;
        if (this.bestTime === null || this.elapsed < this.bestTime) {
          this.bestTime = this.elapsed;
          this.isNewBest = true;
          saveBestTime(this.elapsed);
        }
        this.spawnParticles(this.sheepCloud.x, this.sheepCloud.y - 24, "#fde047", 28, 190);
        this.spawnParticles(this.sheepCloud.x, this.sheepCloud.y - 24, "#ffffff", 14, 150);
        return;
      }

      // Absturz-Schutz auslösen
      if (p.y > WORLD_H + 35) {
        const cp = this.checkpoint || this.startCloud;
        this.state = "rescuing";
        this.rescue = {
          sx: p.x,
          sy: WORLD_H + 10,
          tx: cp.x,
          ty: cp.y - 34,
          t: 0
        };
        this.addFloatingText(p.x, WORLD_H - 40, "☁️ Wolkenlift!", "#bae6fd");
      }

      this.updateCamera(dt);
    },

    updateCamera(dt) {
      const lookX = this.player.facing * 45;
      const targetX = clamp(this.player.x + lookX - W * 0.5, 0, WORLD_W - W);
      const targetY = clamp(this.player.y - H * 0.55, 0, WORLD_H - H);
      const k = Math.min(1, 7.5 * dt);
      this.cam.x += (targetX - this.cam.x) * k;
      this.cam.y += (targetY - this.cam.y) * k;
    },

    // ------------------------------------------------------------------
    // Zeichnen
    // ------------------------------------------------------------------
    draw(ctx, t) {
      this.ui = [];
      const cx = this.cam.x;
      const cy = this.cam.y;

      // 1. Himmel-Farbverlauf
      const skyG = ctx.createLinearGradient(0, 0, 0, H);
      skyG.addColorStop(0, "#1e3a8a");
      skyG.addColorStop(0.45, "#3b82f6");
      skyG.addColorStop(0.8, "#93c5fd");
      skyG.addColorStop(1, "#fde68a");
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, W, H);

      // Sonnenstrahlen
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const g = ctx.createLinearGradient(90 + i * 110, 0, 220 + i * 140, H);
        g.addColorStop(0, "rgba(254, 240, 138, 0.14)");
        g.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(60 + i * 110, 0);
        ctx.lineTo(140 + i * 110, 0);
        ctx.lineTo(310 + i * 140, H);
        ctx.lineTo(150 + i * 140, H);
        ctx.fill();
      }
      ctx.restore();

      // 2. Sterne (Parallax)
      BG_STARS.forEach((s) => {
        const sx = s.x - cx * 0.18;
        const sy = s.y - cy * 0.18;
        if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) return;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + 0.55 * Math.abs(Math.sin(t * 1.8 + s.ph))})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, TAU);
        ctx.fill();
      });

      // 3. Ferne Regenbögen (Parallax)
      const rbCols = ["#f87171", "#fb923c", "#fde047", "#4ade80", "#38bdf8", "#818cf8"];
      BG_RAINBOWS.forEach((rb) => {
        const rx = rb.x - cx * 0.28;
        const ry = rb.y - cy * 0.28;
        ctx.save();
        ctx.globalAlpha = rb.alpha;
        ctx.lineWidth = 6;
        rbCols.forEach((col, i) => {
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.arc(rx, ry, rb.r - i * 6, Math.PI * 1.05, Math.PI * 1.95);
          ctx.stroke();
        });
        ctx.restore();
      });

      // 4. Parallax-Hintergrundwolken
      BG_CLOUDS.forEach((bc) => {
        const bx = ((bc.x + t * bc.speed) % (WORLD_W + 200)) - 100 - cx * bc.depth;
        const by = bc.y - cy * bc.depth;
        if (bx < -120 || bx > W + 120 || by < -80 || by > H + 80) return;
        ctx.save();
        ctx.globalAlpha = bc.depth < 0.3 ? 0.35 : 0.52;
        ctx.fillStyle = "#ffffff";
        const s = bc.s;
        ctx.beginPath();
        [[-18, 2, 12], [-4, -6, 15], [12, -3, 13], [24, 3, 10]].forEach(([dx, dy, r]) => {
          ctx.moveTo(bx + (dx + r) * s, by + dy * s);
          ctx.arc(bx + dx * s, by + dy * s, r * s, 0, TAU);
        });
        ctx.fill();
        ctx.restore();
      });

      // 5. Spielwelt (Kamera-Transform)
      ctx.save();
      ctx.translate(-cx, -cy);

      // Wolken-Plattformen
      for (const c of this.clouds) {
        if (c.x + c.w < cx - 40 || c.x - c.w > cx + W + 40 || c.y < cy - 80 || c.y > cy + H + 80) continue;
        drawCloudPlatform(ctx, c, t);
      }

      // Goldenes Schaf
      const sc = this.sheepCloud;
      const sheepDist = Math.hypot(this.player.x - sc.x, this.player.y - sc.y);
      drawGoldenSheep(ctx, sc.x + 18, sc.y - 10, t, sheepDist);

      // Blaui (ggf. mit Fallschirm / Wolkenlift bei Absturz-Schutz)
      const p = this.player;
      if (this.state === "rescuing") {
        ctx.save();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x - 16, p.y - 46);
        ctx.lineTo(p.x - 6, p.y - 24);
        ctx.moveTo(p.x + 16, p.y - 46);
        ctx.lineTo(p.x + 6, p.y - 24);
        ctx.stroke();
        ctx.fillStyle = "#f472b6";
        ctx.beginPath();
        ctx.arc(p.x, p.y - 46, 20, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      }

      let pose = null;
      if (this.state === "won") {
        pose = { dy: -Math.abs(Math.sin(t * 7)) * 12, armL: 2.5, armR: 2.5 };
      } else if (!p.onGround) {
        pose = {
          armL: p.vy < 0 ? 2.4 : 1.7,
          armR: p.vy < 0 ? 2.4 : 1.7,
          legs: [{ dx: -2, lift: 3 }, { dx: 2, lift: 1 }]
        };
      }
      window.BLAUI_DRAW?.(ctx, p.x, p.y, {
        facing: p.facing,
        cycle: p.cycle,
        moving: p.onGround && Math.abs(p.vx) > 15,
        t,
        scale: 0.92,
        pose
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

      // Schwebetexte
      this.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / 0.5);
        ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      // 6. Sanfter Nebelsaum ganz unten im Weltall/Wolkenmeer
      const mist = ctx.createLinearGradient(0, H - 36, 0, H);
      mist.addColorStop(0, "rgba(255,255,255,0)");
      mist.addColorStop(1, "rgba(255,255,255,0.32)");
      ctx.fillStyle = mist;
      ctx.fillRect(0, H - 36, W, 36);

      // 7. HUD (inkl. Zurück-Button)
      this.drawHud(ctx);

      if (this.state === "won" && this.wonTimer > 0.75) {
        this.drawVictory(ctx, t);
      }
    },

    drawButton(ctx, id, label, x, y, w, h, color, size = 12) {
      this.ui.push({ id, x, y, w, h });
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
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

    drawHud(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.beginPath();
      ctx.roundRect(10, 8, 280, 30, 10);
      ctx.fill();

      ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "#fde047";
      ctx.fillText(`⏱ ${fmtTime(this.elapsed)}`, 22, 23);
      ctx.fillStyle = "#bae6fd";
      ctx.fillText(`Sprünge: ${this.jumps}`, 140, 23);
      ctx.restore();

      this.drawButton(ctx, "hub", "↩ Oberwelt", W - 122, 8, 112, 30, "#38bdf8", 11);
    },

    drawVictory(ctx, t) {
      const a = Math.min(1, (this.wonTimer - 0.75) * 3);
      ctx.save();
      ctx.fillStyle = `rgba(15, 23, 42, ${0.68 * a})`;
      ctx.fillRect(0, 0, W, H);

      const px = 160;
      const py = 62;
      const pw = 400;
      const ph = 280;
      ctx.globalAlpha = a;

      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(30, 58, 138, 0.96)");
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
      ctx.font = "900 20px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("🐑 GOLDENES SCHAF GEFUNDEN!", W / 2, py + 38);

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 16px Orbitron, Rajdhani, sans-serif";
      ctx.fillText(`Zeit: ${fmtTime(this.elapsed)}`, W / 2, py + 86);
      ctx.fillStyle = "#bae6fd";
      ctx.font = "700 14px Rajdhani, sans-serif";
      ctx.fillText(`Benötigte Sprünge: ${this.jumps}`, W / 2, py + 114);

      if (this.bestTime !== null) {
        ctx.fillStyle = this.isNewBest ? "#4ade80" : "#fcd34d";
        ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
        ctx.fillText(
          this.isNewBest ? `★ NEUE BESTZEIT: ${fmtTime(this.bestTime)}` : `Bestzeit: ${fmtTime(this.bestTime)}`,
          W / 2,
          py + 144
        );
      }

      this.drawButton(ctx, "again", "☁️ NOCHMAL (NEUE WOLKENWELT)", px + 35, py + 178, pw - 70, 38, "#4ade80", 12);
      this.drawButton(ctx, "hub", "↩ ZURÜCK ZUR OBERWELT", px + 35, py + 226, pw - 70, 34, "#38bdf8", 12);
      ctx.restore();
    }
  };

  window.BLAUIS_WELT_LEVELS?.register(scene);
})();
