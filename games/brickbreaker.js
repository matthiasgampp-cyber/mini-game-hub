(() => {
  "use strict";

  const BRICK_PALETTES = [
    {
      name: "Terracotta",
      base: "#b43728",
      light: "#d95b48",
      dark: "#751c12",
      scorch: "#4d110a",
      points: 10
    },
    {
      name: "Rust Brick",
      base: "#a34223",
      light: "#c86441",
      dark: "#69230d",
      scorch: "#451506",
      points: 20
    },
    {
      name: "Ochre Clinker",
      base: "#b26726",
      light: "#d68a44",
      dark: "#733d0e",
      scorch: "#4a2506",
      points: 30
    },
    {
      name: "Sienna Stone",
      base: "#91322c",
      light: "#b7514a",
      dark: "#591713",
      scorch: "#380c09",
      points: 40
    },
    {
      name: "Dark Clinker",
      base: "#782b2b",
      light: "#9e4646",
      dark: "#461313",
      scorch: "#290909",
      points: 50
    }
  ];

  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function createMortarTexture() {
    const w = 128;
    const h = 32;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const g = off.getContext("2d");
    const rand = seededRandom(9001);

    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#64748b");
    grad.addColorStop(0.5, "#94a3b8");
    grad.addColorStop(1, "#475569");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Kalk- & Sandkörnung im Mörtel
    for (let i = 0; i < 240; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const sz = rand() > 0.75 ? 2 : 1;
      g.fillStyle = rand() > 0.45 ? "rgba(241, 245, 249, 0.25)" : "rgba(15, 23, 42, 0.35)";
      g.fillRect(x, y, sz, sz);
    }

    return off;
  }

  function createClayBrickSprite(palette, variantSeed) {
    const w = 104;
    const h = 38;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const g = off.getContext("2d");
    const rand = seededRandom(509 + variantSeed * 197);

    // Leicht unregelmäßige Ziegelform für realistischere Kanten
    const r = 3.5;
    g.beginPath();
    g.roundRect(1, 1, w - 2, h - 2, r);
    g.clip();

    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, palette.light);
    grad.addColorStop(0.22, palette.base);
    grad.addColorStop(0.84, palette.dark);
    grad.addColorStop(1, palette.scorch);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Unregelmäßige Brenn-Wolken & Schmauchstellen
    for (let i = 0; i < 18; i++) {
      const bx = rand() * w;
      const by = rand() * h;
      const br = 5 + rand() * 16;
      g.fillStyle = rand() > 0.5 ? "rgba(255, 224, 200, 0.08)" : "rgba(20, 6, 4, 0.18)";
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
    }

    // Feine Ton-Poren & helle Quarz-/Kalk-Einschlüsse
    for (let i = 0; i < 130; i++) {
      const px = 2 + rand() * (w - 4);
      const py = 2 + rand() * (h - 4);
      const size = rand() > 0.78 ? 2 : 1;
      g.fillStyle = rand() > 0.62 ? "rgba(255, 244, 234, 0.18)" : "rgba(18, 5, 3, 0.32)";
      g.fillRect(px, py, size, size);
    }

    // Kleine Rand-Ausplatzungen für verwitterten Mauer-Look
    for (let i = 0; i < 6; i++) {
      const edgeSide = Math.floor(rand() * 4);
      const chipLen = 3 + rand() * 5;
      g.fillStyle = "rgba(226, 232, 240, 0.24)";
      if (edgeSide === 0) {
        g.fillRect(6 + rand() * (w - 14), 1, chipLen, 2);
      } else if (edgeSide === 1) {
        g.fillRect(6 + rand() * (w - 14), h - 3, chipLen, 2);
      } else if (edgeSide === 2) {
        g.fillRect(1, 5 + rand() * (h - 10), 2, chipLen);
      } else {
        g.fillRect(w - 3, 5 + rand() * (h - 10), 2, chipLen);
      }
    }

    // Obere Lichtkante
    g.fillStyle = "rgba(255, 236, 222, 0.26)";
    g.fillRect(3, 1.5, w - 6, 2);

    // Untere Schattenkante
    g.fillStyle = "rgba(12, 4, 2, 0.48)";
    g.fillRect(2, h - 3.5, w - 4, 3);

    // Dunkle Fugen-Kante
    g.strokeStyle = "rgba(28, 9, 6, 0.65)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.roundRect(1, 1, w - 2, h - 2, r);
    g.stroke();

    return off;
  }

  window.GAME_REGISTRY?.register({
    id: "brickbreaker",
    name: "Brick Breaker",
    subtitle: "Realistische Ziegelmauer • Schrumpfende Decke • Mehrfachbälle",
    tag: "Arcade Klassiker",
    icon: "🧱",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.animClock = 0;
      this.paused = false;
      this.phase = "playing";

      this.brickSprites = BRICK_PALETTES.map((pal, idx) => createClayBrickSprite(pal, idx));
      this.mortarSprite = createMortarTexture();

      this.score = 0;
      this.bestScore = ctx.storage.get("best_score", 0);
      this.lives = 3;
      this.level = 1;

      this.field = { x: 0, y: 0, w: 420, h: 520 };
      this.ceilingY = 0;
      this.stepDownPx = 14;

      this.paddle = {
        x: 165,
        y: 470,
        w: 86,
        h: 15,
        speed: 365
      };

      this.balls = [];
      this.bricks = [];
      this.mortarBeds = [];
      this.powerups = [];
      this.advanceTimer = 0;
      this.advanceInterval = 6.5;
      this.particles = [];

      this.keys = { left: false, right: false, launch: false };
      this.pointerActive = false;
      this.pointerTargetX = null;

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex flex-col items-center justify-center p-2 bg-[#07090e] overflow-hidden";

      this.hud = document.createElement("div");
      this.hud.className = "w-full max-w-[480px] flex items-center justify-between gap-2 mb-1.5 px-1 font-orbitron text-[11px] sm:text-xs";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-xl border border-amber-500/30 bg-[#0d1118] touch-none";
      this.canvasCtx = this.canvas.getContext("2d");

      this.overlay = document.createElement("div");
      this.overlay.className = "hidden absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4";

      this.root.appendChild(this.hud);
      this.root.appendChild(this.canvas);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onKeyUp = this.handleKeyUp.bind(this);
      this.onPointerDown = this.handlePointerDown.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerUp = this.handlePointerUp.bind(this);

      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
      this.canvas.addEventListener("pointerdown", this.onPointerDown);
      this.canvas.addEventListener("pointermove", this.onPointerMove);
      this.canvas.addEventListener("pointerup", this.onPointerUp);
      this.canvas.addEventListener("pointercancel", this.onPointerUp);

      this.resize();
      this.startNewGame();
    },

    playSfx(name) {
      try {
        this.ctx?.sound?.[name]?.();
      } catch {
        // Sound-Fehler ignorieren
      }
    },

    startNewGame() {
      this.phase = "playing";
      this.score = 0;
      this.lives = 3;
      this.level = 1;
      this.particles = [];
      this.powerups = [];

      if (this.overlay) {
        this.overlay.classList.add("hidden");
        this.overlay.innerHTML = "";
      }

      this.setupLevel(1);
    },

    setupLevel(lvl) {
      this.level = lvl;
      this.ceilingY = 0;
      this.advanceTimer = 0;
      this.advanceInterval = Math.max(3.6, 6.8 - (lvl - 1) * 0.45);
      this.powerups = [];

      const w = this.field.w || 400;
      const h = this.field.h || 500;

      const baseCols = 6;
      const rows = Math.min(5, 3 + Math.floor((lvl - 1) / 2));
      const mortarGap = 3.5;
      const sidePad = 12;
      const usableW = w - sidePad * 2;
      const fullBrickW = (usableW - mortarGap * (baseCols - 1)) / baseCols;
      const halfBrickW = (fullBrickW - mortarGap) / 2;
      const brickH = 20;

      const baseStartY = lvl === 1 ? Math.round(h * 0.24) : Math.round(h * 0.14);

      this.bricks = [];
      this.mortarBeds = [];

      for (let r = 0; r < rows; r++) {
        const rowY = baseStartY + r * (brickH + mortarGap);
        const isStaggered = r % 2 === 1;
        const hp = r === 0 && lvl >= 2 ? 2 : 1;

        this.mortarBeds.push({
          x: sidePad - 2,
          y: rowY - 1.5,
          w: usableW + 4,
          h: brickH + 3,
          row: r
        });

        if (!isStaggered) {
          for (let c = 0; c < baseCols; c++) {
            const tierIndex = (r + c + lvl) % BRICK_PALETTES.length;
            const pal = BRICK_PALETTES[tierIndex];
            this.bricks.push({
              x: sidePad + c * (fullBrickW + mortarGap),
              y: rowY,
              w: fullBrickW,
              h: brickH,
              hp,
              maxHp: hp,
              tierIndex,
              points: pal.points * hp,
              isHalf: false,
              tintAlpha: ((r * 7 + c * 13 + lvl) % 5) * 0.025,
              alive: true
            });
          }
        } else {
          let curX = sidePad;
          const segments = [halfBrickW];
          for (let c = 0; c < baseCols - 1; c++) {
            segments.push(fullBrickW);
          }
          segments.push(halfBrickW);

          for (let idx = 0; idx < segments.length; idx++) {
            const segW = segments[idx];
            const tierIndex = (r + idx + lvl + 1) % BRICK_PALETTES.length;
            const pal = BRICK_PALETTES[tierIndex];
            this.bricks.push({
              x: curX,
              y: rowY,
              w: segW,
              h: brickH,
              hp,
              maxHp: hp,
              tierIndex,
              points: pal.points * hp,
              isHalf: idx === 0 || idx === segments.length - 1,
              tintAlpha: ((r * 11 + idx * 5 + lvl) % 5) * 0.025,
              alive: true
            });
            curX += segW + mortarGap;
          }
        }
      }

      this.resetBallOnPaddle();
      this.updateHud();
    },

    createBall(x, y, vx = 0, vy = 0, attached = false) {
      return {
        x,
        y,
        r: 7,
        vx,
        vy,
        attached,
        trail: []
      };
    },

    resetBallOnPaddle() {
      const bx = this.paddle.x + this.paddle.w / 2;
      const by = this.paddle.y - 8;
      this.balls = [this.createBall(bx, by, 0, 0, true)];
    },

    launchBall() {
      if (this.phase !== "playing" || this.paused) return;
      const attachedBall = this.balls.find((b) => b.attached);
      if (!attachedBall) return;

      const baseSpeed = 290 + (this.level - 1) * 22;
      const angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
      attachedBall.vx = Math.cos(angle) * baseSpeed;
      attachedBall.vy = Math.sin(angle) * baseSpeed;
      attachedBall.attached = false;
      this.playSfx("playShoot");
    },

    spawnMultiballPowerup(x, y) {
      if (Math.random() > 0.24) return;
      this.powerups.push({
        x,
        y,
        r: 10,
        vy: 95,
        kind: "multiball",
        label: "M",
        color: "#38bdf8"
      });
    },

    activateMultiball(originX, originY) {
      const source = this.balls.find((b) => !b.attached) || this.balls[0];
      const baseSpeed = source
        ? Math.max(290, Math.hypot(source.vx, source.vy))
        : 290 + (this.level - 1) * 22;
      const sx = source && !source.attached ? source.x : originX;
      const sy = source && !source.attached ? source.y : originY;

      const angles = [-Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42];
      for (const ang of angles) {
        if (this.balls.length >= 6) break;
        this.balls.push(
          this.createBall(
            sx,
            sy,
            Math.cos(ang) * baseSpeed,
            Math.sin(ang) * baseSpeed,
            false
          )
        );
      }

      this.playSfx("playScore");
      this.spawnParticles(sx, sy, "#38bdf8", 16);
    },

    spawnParticles(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 140;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.25 + Math.random() * 0.22,
          maxLife: 0.47,
          color: color || "#dc5a47",
          size: 2 + Math.random() * 2.5
        });
      }
    },

    updateHud() {
      if (!this.hud) return;
      this.hud.innerHTML = `
        <span class="text-amber-300">PUNKTE ${this.score}</span>
        <span class="text-sky-300">LEVEL ${this.level}</span>
        <span class="text-emerald-400">LEBEN ${"❤️".repeat(Math.max(0, this.lives)) || "0"}</span>
        <span class="text-fuchsia-300">REKORD ${this.bestScore}</span>
      `;
    },

    resize() {
      if (!this.root || !this.canvas || !this.canvasCtx) return;
      const rect = this.root.getBoundingClientRect();
      const hudH = this.hud.getBoundingClientRect().height || 24;
      const availW = Math.max(240, rect.width - 12);
      const availH = Math.max(280, rect.height - hudH - 20);

      const w = Math.min(availW, 480);
      const h = availH;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const prevW = this.field.w || w;
      const prevH = this.field.h || h;

      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.field = { x: 0, y: 0, w, h };

      this.paddle.w = Math.max(70, Math.min(98, w * 0.21));
      this.paddle.h = 15;
      this.paddle.y = h - this.paddle.h - 16;
      this.paddle.x = Math.max(8, Math.min(w - this.paddle.w - 8, (this.paddle.x / prevW) * w));

      const scaleX = prevW > 0 ? w / prevW : 1;
      const scaleY = prevH > 0 ? h / prevH : 1;
      this.ceilingY = Math.min(this.paddle.y - 68, this.ceilingY * scaleY);

      for (const ball of this.balls) {
        if (ball.attached) {
          ball.x = this.paddle.x + this.paddle.w / 2;
          ball.y = this.paddle.y - ball.r - 1;
        } else {
          ball.x = Math.max(ball.r, Math.min(w - ball.r, ball.x * scaleX));
          ball.y = Math.max(this.ceilingY + ball.r, Math.min(h - ball.r, ball.y * scaleY));
        }
      }

      if (this.bricks.length && prevW > 0) {
        for (const b of this.bricks) {
          b.x = b.x * scaleX;
          b.w = b.w * scaleX;
          b.y = b.y * scaleY;
        }
      }

      if (this.mortarBeds.length && prevW > 0) {
        for (const m of this.mortarBeds) {
          m.x = m.x * scaleX;
          m.w = m.w * scaleX;
          m.y = m.y * scaleY;
        }
      }
    },

    handleKeyDown(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.keys.left = true;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.keys.right = true;
      } else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        this.keys.launch = true;
        this.launchBall();
      }
    },

    handleKeyUp(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.keys.left = false;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.keys.right = false;
      } else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        this.keys.launch = false;
      }
    },

    handlePointerDown(e) {
      if (this.phase !== "playing" || this.paused || !this.canvas) return;
      try {
        this.canvas.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignorieren
      }
      const rect = this.canvas.getBoundingClientRect();
      this.pointerActive = true;
      this.pointerTargetX = e.clientX - rect.left;
      this.launchBall();
    },

    handlePointerMove(e) {
      if (!this.pointerActive || !this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointerTargetX = e.clientX - rect.left;
    },

    handlePointerUp() {
      this.pointerActive = false;
      this.pointerTargetX = null;
    },

    saveBestScore() {
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        try {
          this.ctx?.storage?.set("best_score", this.bestScore);
        } catch {
          // Storage-Fehler ignorieren
        }
      }
    },

    triggerGameOver(reason = "Alle Leben verloren") {
      this.phase = "gameover";
      this.saveBestScore();
      this.updateHud();
      this.playSfx("playLose");

      if (!this.overlay) return;
      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-xs rounded-2xl border border-amber-400/40 bg-slate-900/95 p-6 text-center shadow-[0_0_35px_rgba(245,158,11,0.2)]">
          <h3 class="font-orbitron text-xl font-black text-rose-400 mb-1">RUNDE VORBEI</h3>
          <p class="text-xs text-slate-400 mb-2">${reason}</p>
          <p class="text-sm text-slate-300 mb-2">Punkte: <strong class="text-amber-300">${this.score}</strong> • Level <strong class="text-sky-300">${this.level}</strong></p>
          <p class="text-xs text-slate-400 mb-5">Rekord: <strong class="text-fuchsia-300">${this.bestScore}</strong></p>
          <button type="button" data-action="restart" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-amber-400 text-slate-950 hover:bg-amber-300 transition">
            Neu starten
          </button>
        </div>
      `;
      this.overlay.querySelector('[data-action="restart"]')?.addEventListener("click", () => {
        this.startNewGame();
        this.ctx?.restartGame?.();
      });
    },

    advanceBricksDown() {
      const maxCeiling = this.paddle.y - 68;
      this.ceilingY = Math.min(maxCeiling, this.ceilingY + this.stepDownPx);

      for (const m of this.mortarBeds) {
        m.y += this.stepDownPx;
      }

      for (const b of this.bricks) {
        if (!b.alive) continue;
        b.y += this.stepDownPx;
        if (b.y + b.h >= this.paddle.y - 4) {
          this.triggerGameOver("Die Ziegelmauer hat den Schläger erreicht");
          return false;
        }
      }

      for (const ball of this.balls) {
        if (!ball.attached && ball.y - ball.r < this.ceilingY) {
          ball.y = this.ceilingY + ball.r;
          ball.vy = Math.abs(ball.vy);
        }
      }

      this.playSfx("playHit");
      return true;
    },

    update(dt) {
      this.animClock += dt;

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      if (this.phase !== "playing" || this.paused) return;

      const w = this.field.w || 400;
      const h = this.field.h || 500;
      const p = this.paddle;

      let moveDir = 0;
      if (this.keys.left) moveDir -= 1;
      if (this.keys.right) moveDir += 1;

      if (moveDir !== 0) {
        p.x += moveDir * p.speed * dt;
      } else if (this.pointerActive && this.pointerTargetX !== null) {
        const diff = this.pointerTargetX - (p.x + p.w / 2);
        p.x += Math.max(-440 * dt, Math.min(440 * dt, diff * 12 * dt));
      }
      p.x = Math.max(6, Math.min(w - p.w - 6, p.x));

      this.advanceTimer += dt;
      if (this.advanceTimer >= this.advanceInterval) {
        this.advanceTimer = 0;
        if (!this.advanceBricksDown()) return;
      }

      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        pu.y += pu.vy * dt;
        if (pu.y - pu.r > h + 12) {
          this.powerups.splice(i, 1);
          continue;
        }
        if (
          pu.x + pu.r >= p.x &&
          pu.x - pu.r <= p.x + p.w &&
          pu.y + pu.r >= p.y &&
          pu.y - pu.r <= p.y + p.h
        ) {
          this.activateMultiball(pu.x, p.y - 6);
          this.powerups.splice(i, 1);
        }
      }

      for (let bIdx = this.balls.length - 1; bIdx >= 0; bIdx--) {
        const ball = this.balls[bIdx];

        if (ball.attached) {
          ball.x = p.x + p.w / 2;
          ball.y = p.y - ball.r - 1;
          continue;
        }

        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 7) {
          ball.trail.shift();
        }

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x - ball.r < 4) {
          ball.x = 4 + ball.r;
          ball.vx = Math.abs(ball.vx);
          this.playSfx("playHit");
        } else if (ball.x + ball.r > w - 4) {
          ball.x = w - 4 - ball.r;
          ball.vx = -Math.abs(ball.vx);
          this.playSfx("playHit");
        }

        if (ball.y - ball.r < this.ceilingY + 2) {
          ball.y = this.ceilingY + 2 + ball.r;
          ball.vy = Math.abs(ball.vy);
          this.playSfx("playHit");
        }

        if (ball.y - ball.r > h + 8) {
          this.balls.splice(bIdx, 1);
          continue;
        }

        if (
          ball.vy > 0 &&
          ball.x + ball.r >= p.x &&
          ball.x - ball.r <= p.x + p.w &&
          ball.y + ball.r >= p.y &&
          ball.y - ball.r <= p.y + p.h
        ) {
          const hitOffset = (ball.x - (p.x + p.w / 2)) / (p.w / 2);
          const clamped = Math.max(-0.85, Math.min(0.85, hitOffset));
          const maxAngle = (62 * Math.PI) / 180;
          const bounceAngle = -Math.PI / 2 + clamped * maxAngle;
          const speed = Math.min(470, Math.hypot(ball.vx, ball.vy) * 1.02);

          ball.vx = Math.cos(bounceAngle) * speed;
          ball.vy = Math.sin(bounceAngle) * speed;
          ball.y = p.y - ball.r - 0.5;
          this.spawnParticles(ball.x, p.y, "#38bdf8", 6);
          this.playSfx("playHit");
        }

        for (const b of this.bricks) {
          if (!b.alive) continue;

          const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.w));
          const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.h));
          const dx = ball.x - closestX;
          const dy = ball.y - closestY;

          if (dx * dx + dy * dy <= ball.r * ball.r) {
            const overlapLeft = ball.x + ball.r - b.x;
            const overlapRight = b.x + b.w - (ball.x - ball.r);
            const overlapTop = ball.y + ball.r - b.y;
            const overlapBottom = b.y + b.h - (ball.y - ball.r);
            const minOverlapX = Math.min(overlapLeft, overlapRight);
            const minOverlapY = Math.min(overlapTop, overlapBottom);

            if (minOverlapX < minOverlapY) {
              ball.vx = -ball.vx;
            } else {
              ball.vy = -ball.vy;
            }

            b.hp -= 1;
            const pal = BRICK_PALETTES[b.tierIndex % BRICK_PALETTES.length];
            if (b.hp <= 0) {
              b.alive = false;
              this.score += b.points;
              this.saveBestScore();
              this.spawnParticles(b.x + b.w / 2, b.y + b.h / 2, pal.light, 12);
              this.spawnMultiballPowerup(b.x + b.w / 2, b.y + b.h / 2);
              this.playSfx("playScore");
            } else {
              this.score += 5;
              this.saveBestScore();
              this.spawnParticles(closestX, closestY, "#e2e8f0", 6);
              this.playSfx("playHit");
            }
            this.updateHud();
            break;
          }
        }
      }

      if (this.balls.length === 0) {
        this.lives -= 1;
        this.powerups = [];
        this.playSfx("playLose");
        this.updateHud();
        if (this.lives <= 0) {
          this.triggerGameOver("Alle Leben verloren");
          return;
        }
        this.resetBallOnPaddle();
        return;
      }

      let remainingBricks = 0;
      for (const b of this.bricks) {
        if (b.alive) remainingBricks += 1;
      }

      if (remainingBricks === 0) {
        this.playSfx("playScore");
        this.setupLevel(this.level + 1);
      }
    },

    drawBricks(ctx) {
      for (const bed of this.mortarBeds) {
        const hasAliveInRow = this.bricks.some((b) => b.alive && Math.abs(b.y - (bed.y + 1.5)) < 4);
        if (!hasAliveInRow) continue;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bed.x, bed.y, bed.w, bed.h, 3);
        ctx.clip();

        if (this.mortarSprite) {
          ctx.drawImage(this.mortarSprite, bed.x, bed.y, bed.w, bed.h);
        } else {
          ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
          ctx.fillRect(bed.x, bed.y, bed.w, bed.h);
        }
        ctx.restore();
      }

      for (const b of this.bricks) {
        if (!b.alive) continue;
        const sprite = this.brickSprites?.[b.tierIndex % this.brickSprites.length];

        ctx.save();
        if (sprite) {
          if (b.isHalf) {
            ctx.drawImage(sprite, 0, 0, sprite.width * 0.52, sprite.height, b.x, b.y, b.w, b.h);
          } else {
            ctx.drawImage(sprite, b.x, b.y, b.w, b.h);
          }
        } else {
          const pal = BRICK_PALETTES[b.tierIndex % BRICK_PALETTES.length];
          ctx.fillStyle = pal.base;
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        // Feine individuelle Ton-Nuance pro Stein
        if (b.tintAlpha > 0) {
          ctx.fillStyle = `rgba(15, 23, 42, ${b.tintAlpha.toFixed(3)})`;
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        // Verzweigte Risse bei angeschlagenen 2-HP-Ziegeln
        if (b.maxHp > 1 && b.hp < b.maxHp) {
          ctx.strokeStyle = "rgba(241, 245, 249, 0.65)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w * 0.28, b.y + 2);
          ctx.lineTo(b.x + b.w * 0.45, b.y + b.h * 0.52);
          ctx.lineTo(b.x + b.w * 0.68, b.y + b.h - 2);
          ctx.moveTo(b.x + b.w * 0.45, b.y + b.h * 0.52);
          ctx.lineTo(b.x + b.w * 0.24, b.y + b.h * 0.72);
          ctx.stroke();

          ctx.strokeStyle = "rgba(15, 23, 42, 0.88)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x + b.w * 0.3, b.y + 2);
          ctx.lineTo(b.x + b.w * 0.47, b.y + b.h * 0.52);
          ctx.lineTo(b.x + b.w * 0.7, b.y + b.h - 2);
          ctx.moveTo(b.x + b.w * 0.47, b.y + b.h * 0.52);
          ctx.lineTo(b.x + b.w * 0.26, b.y + b.h * 0.72);
          ctx.stroke();
        }

        ctx.restore();
      }
    },

    drawCeiling(ctx) {
      if (this.ceilingY <= 0) return;
      const { w } = this.field;

      ctx.save();
      ctx.fillStyle = "rgba(7, 9, 14, 0.78)";
      ctx.fillRect(0, 0, w, this.ceilingY);

      const barGrad = ctx.createLinearGradient(0, this.ceilingY - 4, 0, this.ceilingY + 2);
      barGrad.addColorStop(0, "#94a3b8");
      barGrad.addColorStop(1, "#475569");
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, this.ceilingY - 3, w, 4);
      ctx.restore();
    },

    drawPowerups(ctx) {
      for (const pu of this.powerups) {
        ctx.save();
        ctx.fillStyle = pu.color;
        ctx.strokeStyle = "#e0f2fe";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#090d16";
        ctx.font = "900 10px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pu.label || "M", pu.x, pu.y + 0.5);
        ctx.restore();
      }
    },

    drawPaddle(ctx) {
      const p = this.paddle;
      ctx.save();

      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, "#7dd3fc");
      grad.addColorStop(0.5, "#0284c7");
      grad.addColorStop(1, "#0f172a");

      ctx.fillStyle = grad;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, p.h / 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.roundRect(p.x + p.w * 0.22, p.y + 4, p.w * 0.56, p.h - 8, 3);
      ctx.fill();

      ctx.restore();
    },

    drawBalls(ctx) {
      for (const ball of this.balls) {
        ctx.save();

        for (let i = 0; i < ball.trail.length; i++) {
          const pt = ball.trail[i];
          const ratio = (i + 1) / (ball.trail.length + 1);
          ctx.fillStyle = `rgba(56, 189, 248, ${(ratio * 0.28).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, ball.r * ratio * 0.85, 0, Math.PI * 2);
          ctx.fill();
        }

        const grad = ctx.createRadialGradient(
          ball.x - ball.r * 0.3,
          ball.y - ball.r * 0.3,
          1,
          ball.x,
          ball.y,
          ball.r
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.45, "#7dd3fc");
        grad.addColorStop(1, "#0284c7");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    },

    draw() {
      if (!this.canvasCtx) return;
      const ctx = this.canvasCtx;
      const { w, h } = this.field;

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "rgba(245, 158, 11, 0.04)");
      bgGrad.addColorStop(1, "rgba(2, 6, 23, 0.25)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      this.drawBricks(ctx);
      this.drawCeiling(ctx);
      this.drawPowerups(ctx);
      this.drawPaddle(ctx);
      this.drawBalls(ctx);

      for (const pt of this.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    },

    loop(now) {
      if (this.paused || !this.canvasCtx) {
        this.rafId = requestAnimationFrame((t) => this.loop(t));
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000 || 0.016));
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
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      this.root = null;
      this.canvas = null;
      this.canvasCtx = null;
      this.ctx = null;
    }
  });
})();