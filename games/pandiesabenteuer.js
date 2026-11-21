(() => {
  "use strict";

  class PandiesAbenteuerGame {
    constructor() {
      this.ctx = null;
      this.canvas = null;
      this.c = null;
      this.rafId = null;
      this.lastTime = 0;
      this.running = false;
      this.paused = false;

      this.view = { w: 720, h: 405, dpr: 1 };
      this.world = { w: 720, h: 405 };
      this.camera = { x: 0, y: 0 };

      this.levels = [];
      this.levelIndex = 0;
      this.levelMode = "platform";
      this.score = 0;
      this.rescuedCount = 0;
      this.lives = 3;
      this.keysCollected = 0;
      this.keysRequired = 1;
      this.coinsCollected = 0;
      this.coinsTotal = 0;
      this.invulnTimer = 0;
      this.animClock = 0;

      this.platforms = [];
      this.bamboos = [];
      this.keys = [];
      this.cage = null;
      this.cops = [];

      this.walls = [];
      this.coins = [];
      this.exit = null;

      this.particles = [];
      this.floatingTexts = [];

      this.pandi = {
        x: 360,
        y: 340,
        w: 16,
        h: 20,
        vx: 0,
        vy: 0,
        onGround: false,
        onBamboo: false,
        facing: 1,
        walkCycle: 0
      };

      this.keyState = {
        left: false,
        right: false,
        up: false,
        down: false
      };

      this.pointerState = {
        left: false,
        right: false,
        up: false,
        down: false
      };

      this.input = {
        left: false,
        right: false,
        up: false,
        down: false,
        jumpBuffered: 0
      };

      this._prevHeldJump = false;

      this._onKeyDown = this._onKeyDown.bind(this);
      this._onKeyUp = this._onKeyUp.bind(this);
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerMove = this._onPointerMove.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      this._onHudClick = this._onHudClick.bind(this);
      this._loop = this._loop.bind(this);
      this._pointerId = null;
      this._pointerStart = null;
    }

    init(ctx) {
      this.ctx = ctx;
      ctx.stage.innerHTML = "";

      this.levels = window.PANDIES_ABENTEUER_LEVELS?.list?.() || [];

      this.wrap = document.createElement("div");
      this.wrap.className = "relative w-full h-full flex flex-col bg-sky-950 overflow-hidden select-none";

      this.hud = document.createElement("div");
      this.hud.className =
        "flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-emerald-400/25 bg-emerald-950/90 text-xs font-orbitron";
      this.hud.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span data-hud="level" class="text-emerald-300">LVL 1</span>
          <span data-hud="goal" class="text-amber-300">🔑 0/1</span>
          <span data-hud="rescued" class="text-lime-300">🐼 0</span>
        </div>
        <div data-hud="test-buttons" class="flex items-center gap-1">
          <button type="button" data-test-level="0" class="px-2 py-0.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-400/30 cursor-pointer">
            Feld 1
          </button>
          <button type="button" data-test-level="1" class="px-2 py-0.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-400/30 cursor-pointer">
            Feld 2 (Labyrinth)
          </button>
        </div>
        <div class="flex items-center gap-2.5">
          <span data-hud="score" class="text-white">0 PKT</span>
          <span data-hud="lives" class="text-rose-400">❤️❤️❤️</span>
        </div>
      `;

      this.canvasHost = document.createElement("div");
      this.canvasHost.className = "relative flex-1 w-full h-full flex items-center justify-center overflow-hidden";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-xl border border-emerald-400/30 shadow-2xl touch-none";
      this.c = this.canvas.getContext("2d");

      this.canvasHost.appendChild(this.canvas);
      this.wrap.appendChild(this.hud);
      this.wrap.appendChild(this.canvasHost);
      ctx.stage.appendChild(this.wrap);

      this.resetGame();
      this._bindEvents();
      this.resize();
    }

    reloadLevels() {
      this.levels = window.PANDIES_ABENTEUER_LEVELS?.list?.() || [];
      if (this.levels.length && this.ctx?.stage) {
        this._renderTestButtons();
        this.setupLevel(this.levelIndex, true);
      }
    }

    _renderTestButtons() {
      const container = this.hud?.querySelector('[data-hud="test-buttons"]');
      if (!container || !this.levels.length) return;
      container.innerHTML = this.levels
        .map((lvl, i) => {
          const shortLabel = i === 0 ? "Feld 1" : i === 1 ? "Feld 2 (Labyrinth)" : `Feld ${i + 1}`;
          const active = i === this.levelIndex;
          return `<button type="button" data-test-level="${i}" class="px-2 py-0.5 rounded border cursor-pointer ${
            active
              ? "bg-amber-400 text-slate-950 border-amber-200 font-bold"
              : "bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border-emerald-400/30"
          }">${shortLabel}</button>`;
        })
        .join("");
    }

    _onHudClick(e) {
      const btn = e.target.closest("[data-test-level]");
      if (!btn) return;
      const idx = Number(btn.getAttribute("data-test-level"));
      if (Number.isInteger(idx)) {
        this.ctx?.sound?.ensureContext?.();
        this.setupLevel(idx, true);
        this._addFloatingText(this.view.w * 0.5, 42, `TEST: ${this.levels[idx]?.name || `FELD ${idx + 1}`}`, "#fef08a");
      }
    }

    resetGame() {
      this.levelIndex = 0;
      this.score = 0;
      this.rescuedCount = 0;
      this.lives = 3;
      this.invulnTimer = 0;
      this.particles = [];
      this.floatingTexts = [];
      this.setupLevel(this.levelIndex, true);
      this._updateHud();
    }

    setupLevel(idx, resetPandi = true) {
      if (!this.levels.length) return;
      const safeIdx = ((idx % this.levels.length) + this.levels.length) % this.levels.length;
      this.levelIndex = safeIdx;
      const lvl = this.levels[safeIdx];

      const built = lvl.build(this.view.w, this.view.h);
      this.levelMode = built.mode || lvl.mode || "platform";
      this.world.w = built.worldW || this.view.w;
      this.world.h = built.worldH || this.view.h;

      this.platforms = built.platforms || [];
      this.bamboos = built.bamboos || built.ladders || [];
      this.keys = built.keys || [];
      this.cage = built.cage || null;
      this.cops = built.cops || [];

      this.walls = built.walls || [];
      this.coins = built.coins || [];
      this.exit = built.exit || null;

      this.keysCollected = 0;
      this.keysRequired = lvl.keysRequired || 1;
      this.coinsCollected = 0;
      this.coinsTotal = this.coins.length;

      this.ctx?.setSubtitle?.(lvl.name);

      if (resetPandi) {
        const spawn = built.spawn || {
          x: Math.round(this.world.w * 0.5),
          y: (this.platforms[0]?.y ?? this.world.h - 22)
        };
        this.pandi.x = Math.round(spawn.x - this.pandi.w * 0.5);
        this.pandi.y = Math.round(spawn.y - this.pandi.h * 0.5);
        this.pandi.vx = 0;
        this.pandi.vy = 0;
        this.pandi.onGround = true;
        this.pandi.onBamboo = false;
        this.pandi.facing = 1;
      }

      this._updateCamera(1);
      this._renderTestButtons();
      this._updateHud();
    }

    _updateCamera(dt = 0.016) {
      const targetX = this.pandi.x + this.pandi.w * 0.5 - this.view.w * 0.5;
      const targetY = this.pandi.y + this.pandi.h * 0.5 - this.view.h * 0.5;

      const maxX = Math.max(0, this.world.w - this.view.w);
      const maxY = Math.max(0, this.world.h - this.view.h);

      const clampedX = Math.max(0, Math.min(maxX, targetX));
      const clampedY = Math.max(0, Math.min(maxY, targetY));

      const lerpFactor = Math.min(1, 10 * dt);
      this.camera.x += (clampedX - this.camera.x) * lerpFactor;
      this.camera.y += (clampedY - this.camera.y) * lerpFactor;
    }

    start() {
      this.running = true;
      this.paused = false;
      this.lastTime = performance.now();
      this._loop(this.lastTime);
    }

    pause() {
      this.paused = true;
      this.keyState = { left: false, right: false, up: false, down: false };
      this.pointerState = { left: false, right: false, up: false, down: false };
      this.input.left = false;
      this.input.right = false;
      this.input.up = false;
      this.input.down = false;
      this._prevHeldJump = false;
    }

    resume() {
      if (!this.running) return;
      this.paused = false;
      this.lastTime = performance.now();
    }

    destroy() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this._unbindEvents();
      if (this._unsubJump) {
        this._unsubJump();
        this._unsubJump = null;
      }
    }

    resize() {
      if (!this.canvasHost || !this.canvas) return;
      const rect = this.canvasHost.getBoundingClientRect();
      const availW = Math.max(260, rect.width - 16);
      const availH = Math.max(200, rect.height - 16);
      const targetAspect = 16 / 9;

      let w = availW;
      let h = w / targetAspect;
      if (h > availH) {
        h = availH;
        w = h * targetAspect;
      }

      const prevW = this.view.w;
      const prevH = this.view.h;

      this.view.w = Math.round(w);
      this.view.h = Math.round(h);
      this.view.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.style.width = `${this.view.w}px`;
      this.canvas.style.height = `${this.view.h}px`;
      this.canvas.width = Math.round(this.view.w * this.view.dpr);
      this.canvas.height = Math.round(this.view.h * this.view.dpr);

      if (prevW !== this.view.w || prevH !== this.view.h) {
        this.setupLevel(this.levelIndex, true);
      }
    }

    _bindEvents() {
      window.addEventListener("keydown", this._onKeyDown);
      window.addEventListener("keyup", this._onKeyUp);
      this.canvas?.addEventListener("pointerdown", this._onPointerDown);
      window.addEventListener("pointermove", this._onPointerMove);
      window.addEventListener("pointerup", this._onPointerUp);
      window.addEventListener("pointercancel", this._onPointerUp);
      this.hud?.addEventListener("click", this._onHudClick);

      if (this.ctx?.controls?.onJump) {
        this._unsubJump = this.ctx.controls.onJump(() => {
          this.input.jumpBuffered = 0.16;
        });
      }
    }

    _unbindEvents() {
      window.removeEventListener("keydown", this._onKeyDown);
      window.removeEventListener("keyup", this._onKeyUp);
      this.canvas?.removeEventListener("pointerdown", this._onPointerDown);
      window.removeEventListener("pointermove", this._onPointerMove);
      window.removeEventListener("pointerup", this._onPointerUp);
      window.removeEventListener("pointercancel", this._onPointerUp);
      this.hud?.removeEventListener("click", this._onHudClick);
    }

    _onKeyDown(e) {
      if (!this.running || this.paused) return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") this.keyState.left = true;
      else if (k === "arrowright" || k === "d") this.keyState.right = true;
      else if (k === "arrowup" || k === "w") this.keyState.up = true;
      else if (k === "arrowdown" || k === "s") this.keyState.down = true;
      else if (e.code === "Space") {
        e.preventDefault();
        this.input.jumpBuffered = 0.16;
      }
    }

    _onKeyUp(e) {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") this.keyState.left = false;
      else if (k === "arrowright" || k === "d") this.keyState.right = false;
      else if (k === "arrowup" || k === "w") this.keyState.up = false;
      else if (k === "arrowdown" || k === "s") this.keyState.down = false;
    }

    _onPointerDown(e) {
      if (!this.running || this.paused) return;
      this.ctx?.sound?.ensureContext?.();
      this._pointerId = e.pointerId;
      this._pointerStart = { x: e.clientX, y: e.clientY };
    }

    _onPointerMove(e) {
      if (this._pointerId !== e.pointerId || !this._pointerStart || this.paused) return;
      const dx = e.clientX - this._pointerStart.x;
      const dy = e.clientY - this._pointerStart.y;
      const dead = 12;
      this.pointerState.left = dx < -dead;
      this.pointerState.right = dx > dead;
      this.pointerState.up = dy < -dead;
      this.pointerState.down = dy > dead;
    }

    _onPointerUp(e) {
      if (this._pointerId !== e.pointerId) return;
      if (this._pointerStart) {
        const dx = e.clientX - this._pointerStart.x;
        const dy = e.clientY - this._pointerStart.y;
        if (Math.hypot(dx, dy) < 12) {
          this.input.jumpBuffered = 0.16;
        }
      }
      this._pointerId = null;
      this._pointerStart = null;
      this.pointerState = { left: false, right: false, up: false, down: false };
    }

    _syncControls() {
      const held =
        window.GLOBAL_MOBILE_CONTROLS?.held ||
        this.ctx?.controls?.held ||
        {};
      this.input.left = Boolean(this.keyState.left || this.pointerState.left || held.left);
      this.input.right = Boolean(this.keyState.right || this.pointerState.right || held.right);
      this.input.up = Boolean(this.keyState.up || this.pointerState.up || held.up);
      this.input.down = Boolean(this.keyState.down || this.pointerState.down || held.down);
      if (held.jump && !this._prevHeldJump) {
        this.input.jumpBuffered = 0.16;
      }
      this._prevHeldJump = Boolean(held.jump);
    }

    _spawnParticles(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 40 + Math.random() * 110;
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 30,
          life: 0.45 + Math.random() * 0.25,
          maxLife: 0.7,
          color
        });
      }
    }

    _addFloatingText(x, y, text, color = "#fef08a") {
      this.floatingTexts.push({
        x,
        y,
        vy: -28,
        text,
        color,
        life: 1.25
      });
    }

    _updateHud() {
      if (!this.hud) return;
      const lvlEl = this.hud.querySelector('[data-hud="level"]');
      const goalEl = this.hud.querySelector('[data-hud="goal"]');
      const resEl = this.hud.querySelector('[data-hud="rescued"]');
      const scrEl = this.hud.querySelector('[data-hud="score"]');
      const livEl = this.hud.querySelector('[data-hud="lives"]');

      if (lvlEl) lvlEl.textContent = `LVL ${this.levelIndex + 1}`;
      if (goalEl) {
        if (this.levelMode === "maze") {
          goalEl.textContent = `🐼🪙 ${this.coinsCollected}/${this.coinsTotal} → AUSGANG`;
          goalEl.className = "text-amber-300";
        } else {
          const ready = this.keysCollected >= this.keysRequired;
          goalEl.textContent = `🔑 ${this.keysCollected}/${this.keysRequired}`;
          goalEl.className = ready ? "text-lime-300" : "text-amber-300";
        }
      }
      if (resEl) resEl.textContent = `🐼 ${this.rescuedCount}`;
      if (scrEl) scrEl.textContent = `${this.score} PKT`;
      if (livEl) livEl.textContent = "❤️".repeat(Math.max(0, this.lives)) || "💀";
    }

    _damagePandi(reason) {
      if (this.invulnTimer > 0) return;
      this.lives -= 1;
      this.invulnTimer = 1.35;
      this.ctx?.sound?.playLose?.();
      this._spawnParticles(this.pandi.x + this.pandi.w * 0.5, this.pandi.y + this.pandi.h * 0.5, "#fb7185", 16);
      this._addFloatingText(this.pandi.x - this.camera.x + 10, this.pandi.y - this.camera.y - 8, reason, "#fb7185");
      this._updateHud();

      if (this.lives <= 0) {
        this._addFloatingText(this.view.w * 0.5, this.view.h * 0.45, "ERWISCHT! NEUSTART...", "#fde047");
        this.resetGame();
      }
    }

    _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    _updateMaze(dt) {
      const p = this.pandi;
      const ww = this.world.w;
      const wh = this.world.h;

      let mx = 0;
      let my = 0;
      if (this.input.left) mx -= 1;
      if (this.input.right) mx += 1;
      if (this.input.up) my -= 1;
      if (this.input.down) my += 1;

      if (mx !== 0 && my !== 0) {
        const inv = 1 / Math.SQRT2;
        mx *= inv;
        my *= inv;
      }

      const speed = 185;
      p.vx = mx * speed;
      p.vy = my * speed;
      if (mx !== 0) p.facing = mx > 0 ? 1 : -1;
      if (Math.hypot(p.vx, p.vy) > 10) {
        p.walkCycle += dt * 12;
      }

      p.x += p.vx * dt;
      p.x = Math.max(2, Math.min(ww - p.w - 2, p.x));
      for (const wall of this.walls) {
        if (this._rectsOverlap(p.x, p.y, p.w, p.h, wall.x, wall.y, wall.w, wall.h)) {
          if (p.vx > 0) p.x = wall.x - p.w;
          else if (p.vx < 0) p.x = wall.x + wall.w;
        }
      }

      p.y += p.vy * dt;
      p.y = Math.max(2, Math.min(wh - p.h - 2, p.y));
      for (const wall of this.walls) {
        if (this._rectsOverlap(p.x, p.y, p.w, p.h, wall.x, wall.y, wall.w, wall.h)) {
          if (p.vy > 0) p.y = wall.y - p.h;
          else if (p.vy < 0) p.y = wall.y + wall.h;
        }
      }

      const pcx = p.x + p.w * 0.5;
      const pcy = p.y + p.h * 0.5;
      for (const coin of this.coins) {
        if (coin.collected) continue;
        if (Math.hypot(pcx - coin.x, pcy - coin.y) <= coin.radius + 12) {
          coin.collected = true;
          this.coinsCollected += 1;
          this.score += 50;
          this.ctx?.sound?.playScore?.();
          this._spawnParticles(coin.x, coin.y, "#facc15", 8);
          this._updateHud();
        }
      }

      if (this.exit) {
        const exLeft = this.exit.x - this.exit.w * 0.5;
        const exTop = this.exit.y - this.exit.h * 0.5;
        if (this._rectsOverlap(p.x, p.y, p.w, p.h, exLeft, exTop, this.exit.w, this.exit.h)) {
          this.rescuedCount += 1;
          this.score += 400;
          this.ctx?.sound?.playScore?.();
          this._spawnParticles(this.exit.x, this.exit.y, "#4ade80", 24);
          this._addFloatingText(
            this.exit.x - this.camera.x,
            this.exit.y - this.camera.y - 16,
            "AUSGANG ERREICHT! +400",
            "#fef08a"
          );
          this._updateHud();
          this.setupLevel(this.levelIndex + 1, true);
        }
      }

      this._updateCamera(dt);
    }

    _updateCops(dt, p) {
      for (const cop of this.cops) {
        if (cop.ladderCooldown > 0) {
          cop.ladderCooldown = Math.max(0, cop.ladderCooldown - dt);
        }

        const copCenterX = cop.x + cop.w * 0.5;
        const copBottomY = cop.y + cop.h;

        const findNearbyLadder = () => {
          for (const bam of this.bamboos) {
            const halfW = (bam.width || 30) * 0.5 + 3;
            if (
              Math.abs(copCenterX - bam.x) <= halfW &&
              copBottomY >= bam.top - 4 &&
              cop.y <= bam.bottom + 4
            ) {
              return bam;
            }
          }
          return null;
        };

        const touchingLadder = findNearbyLadder();

        if (cop.onLadder) {
          const lad = cop.activeLadder || touchingLadder;
          if (!lad) {
            cop.onLadder = false;
            cop.activeLadder = null;
            cop.vy = 0;
          } else {
            cop.x += (lad.x - cop.w * 0.5 - cop.x) * Math.min(1, 8 * dt);
            cop.y += (cop.vy || -62) * dt;

            let crossedPlat = null;
            for (const plat of this.platforms) {
              const withinX = cop.x + cop.w - 4 >= plat.x && cop.x + 4 <= plat.x + plat.w;
              if (withinX && Math.abs(cop.y + cop.h - plat.y) <= 5) {
                crossedPlat = plat;
                break;
              }
            }

            const reachedTop = cop.y <= lad.top - cop.h;
            const reachedBottom = cop.y + cop.h >= lad.bottom;

            if (reachedTop || reachedBottom || (crossedPlat && cop.ladderCooldown <= 0 && Math.random() < 0.04)) {
              if (reachedTop) cop.y = lad.top - cop.h;
              else if (reachedBottom) cop.y = lad.bottom - cop.h;
              else if (crossedPlat) cop.y = crossedPlat.y - cop.h;

              cop.onLadder = false;
              cop.activeLadder = null;
              cop.vy = 0;
              cop.ladderCooldown = 0.65;
              const spd = 62 + Math.random() * 32;
              cop.vx = (Math.random() < 0.5 ? -1 : 1) * spd;
            }
          }
        }

        if (!cop.onLadder) {
          cop.vy = 0;

          let currentPlat = null;
          for (const plat of this.platforms) {
            const withinX = cop.x + cop.w - 4 >= plat.x && cop.x + 4 <= plat.x + plat.w;
            if (withinX && Math.abs(copBottomY - plat.y) <= 6) {
              currentPlat = plat;
              cop.y = plat.y - cop.h;
              break;
            }
          }

          if (!currentPlat) {
            cop.y += 280 * dt;
            for (const plat of this.platforms) {
              const withinX = cop.x + cop.w - 4 >= plat.x && cop.x + 4 <= plat.x + plat.w;
              if (withinX && cop.y + cop.h >= plat.y && cop.y + cop.h <= plat.y + 18) {
                cop.y = plat.y - cop.h;
                currentPlat = plat;
                break;
              }
            }
          }

          if (currentPlat) {
            if (touchingLadder && cop.ladderCooldown <= 0 && Math.abs(copCenterX - touchingLadder.x) <= 10) {
              if (Math.random() < 0.045) {
                const canGoUp = cop.y > touchingLadder.top - cop.h + 4;
                const canGoDown = cop.y + cop.h < touchingLadder.bottom - 4;
                if (canGoUp || canGoDown) {
                  let dirY = Math.random() < 0.5 ? -1 : 1;
                  if (!canGoUp) dirY = 1;
                  if (!canGoDown) dirY = -1;
                  cop.onLadder = true;
                  cop.activeLadder = touchingLadder;
                  cop.vy = dirY * (56 + Math.random() * 24);
                  cop.vx = 0;
                }
              }
            }

            if (!cop.onLadder) {
              cop.dirTimer -= dt;
              if (cop.dirTimer <= 0) {
                cop.dirTimer = 0.75 + Math.random() * 1.1;
                const spd = 60 + Math.random() * 34;
                cop.vx = (Math.random() < 0.5 ? -1 : 1) * spd;
              }

              cop.x += cop.vx * dt;
              const minX = currentPlat.x + 4;
              const maxX = currentPlat.x + currentPlat.w - cop.w - 4;
              if (cop.x <= minX) {
                cop.x = minX;
                cop.vx = Math.abs(cop.vx) || 66;
              } else if (cop.x >= maxX) {
                cop.x = maxX;
                cop.vx = -(Math.abs(cop.vx) || 66);
              }
            }
          }
        }

        const hitCop =
          p.x + p.w - 4 > cop.x &&
          p.x + 4 < cop.x + cop.w &&
          p.y + p.h - 3 > cop.y &&
          p.y + 3 < cop.y + cop.h;

        if (hitCop) {
          this._damagePandi("POLIZIST!");
        }
      }
    }

    _update(dt) {
      this.animClock += dt;
      if (this.invulnTimer > 0) {
        this.invulnTimer = Math.max(0, this.invulnTimer - dt);
      }
      if (this.input.jumpBuffered > 0) {
        this.input.jumpBuffered = Math.max(0, this.input.jumpBuffered - dt);
      }

      if (this.levelMode === "maze") {
        this._updateMaze(dt);
      } else {
        const p = this.pandi;
        const w = this.world.w;
        const h = this.world.h;

        let moveX = 0;
        if (this.input.left) moveX -= 1;
        if (this.input.right) moveX += 1;

        if (moveX !== 0) {
          p.vx = moveX * 168;
          p.facing = moveX > 0 ? 1 : -1;
        } else {
          p.vx *= Math.pow(0.001, dt);
        }

        const centerX = p.x + p.w * 0.5;
        const footY = p.y + p.h;
        let nearBamboo = null;
        for (const bam of this.bamboos) {
          const halfW = (bam.width || 30) * 0.5 + 4;
          if (Math.abs(centerX - bam.x) <= halfW && footY >= bam.top - 6 && p.y <= bam.bottom + 4) {
            nearBamboo = bam;
            break;
          }
        }

        if (nearBamboo && (this.input.up || this.input.down)) {
          p.onBamboo = true;
          p.onGround = false;
          p.vy = 0;
          if (this.input.up) p.y -= 132 * dt;
          if (this.input.down) p.y += 132 * dt;
          p.y = Math.max(nearBamboo.top - p.h, Math.min(nearBamboo.bottom - p.h, p.y));
        } else if (p.onBamboo && !nearBamboo) {
          p.onBamboo = false;
        }

        if (!p.onBamboo) {
          if (this.input.jumpBuffered > 0 && p.onGround) {
            p.vy = -372;
            p.onGround = false;
            this.input.jumpBuffered = 0;
            this.ctx?.sound?.playHit?.();
          }

          const prevBottom = p.y + p.h;
          p.vy += 840 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          p.onGround = false;
          if (p.vy >= 0) {
            for (const plat of this.platforms) {
              const overlapX = p.x + p.w - 4 > plat.x && p.x + 4 < plat.x + plat.w;
              if (overlapX && prevBottom <= plat.y + 8 && p.y + p.h >= plat.y) {
                p.y = plat.y - p.h;
                p.vy = 0;
                p.onGround = true;
                break;
              }
            }
          }
        } else {
          p.x += p.vx * dt;
        }

        p.x = Math.max(12, Math.min(w - p.w - 12, p.x));
        p.y = Math.max(14, Math.min(h - p.h - 8, p.y));

        if (Math.abs(p.vx) > 12 || p.onBamboo) {
          p.walkCycle += dt * 12;
        }

        for (const k of this.keys) {
          if (k.collected) continue;
          const distKey = Math.hypot(p.x + p.w * 0.5 - k.x, p.y + p.h * 0.5 - k.y);
          if (distKey < 24) {
            k.collected = true;
            this.keysCollected += 1;
            this.score += 150;
            this.ctx?.sound?.playScore?.();
            this._spawnParticles(k.x, k.y, "#facc15", 14);
            this._addFloatingText(k.x - this.camera.x, k.y - this.camera.y - 12, "SCHLÜSSEL! JETZT NACH OBEN!", "#fef08a");
            this._updateHud();
          }
        }

        if (this.cage && !this.cage.freed) {
          const overlapsCage =
            p.x + p.w > this.cage.x - this.cage.w * 0.5 &&
            p.x < this.cage.x + this.cage.w * 0.5 &&
            p.y + p.h > this.cage.y &&
            p.y < this.cage.y + this.cage.h;

          if (overlapsCage) {
            if (this.keysCollected >= this.keysRequired) {
              this.cage.freed = true;
              this.rescuedCount += 1;
              this.score += 500;
              this.ctx?.sound?.playScore?.();
              this._spawnParticles(this.cage.x, this.cage.y + 16, "#86efac", 24);
              this._addFloatingText(
                this.cage.x - this.camera.x,
                this.cage.y - this.camera.y - 14,
                "2. PANDA BEFREIT! +500",
                "#fef08a"
              );
              this._updateHud();
              this.setupLevel(this.levelIndex + 1, true);
            } else if (this.invulnTimer <= 0) {
              this.invulnTimer = 0.8;
              this._addFloatingText(
                this.cage.x - this.camera.x,
                this.cage.y - this.camera.y - 14,
                "SCHLÜSSEL RECHTS MITTE HOLEN!",
                "#fef08a"
              );
            }
          }
        }

        this._updateCops(dt, p);
        this._updateCamera(dt);
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        pt.vy += 220 * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life -= dt;
        ft.y += ft.vy * dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    }

    _drawMountainBambooBackground(ctx, w, h) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0ea5e9");
      sky.addColorStop(0.42, "#7dd3fc");
      sky.addColorStop(0.78, "#dcfce7");
      sky.addColorStop(1, "#86efac");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const sunX = w * 0.84;
      const sunY = h * 0.15;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 64);
      sunGlow.addColorStop(0, "rgba(254, 249, 195, 0.95)");
      sunGlow.addColorStop(0.45, "rgba(253, 224, 71, 0.32)");
      sunGlow.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 64, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 19, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.lineTo(w * 0.14, h * 0.34);
      ctx.lineTo(w * 0.28, h * 0.52);
      ctx.lineTo(w * 0.45, h * 0.28);
      ctx.lineTo(w * 0.63, h * 0.50);
      ctx.lineTo(w * 0.82, h * 0.32);
      ctx.lineTo(w, h * 0.48);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.quadraticCurveTo(w * 0.22, h * 0.50, w * 0.48, h * 0.64);
      ctx.quadraticCurveTo(w * 0.75, h * 0.46, w, h * 0.60);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      const groveCount = 16;
      for (let i = 0; i < groveCount; i++) {
        const bx = 18 + i * ((w - 36) / (groveCount - 1));
        const topRatio = 0.22 + ((i * 19) % 10) * 0.022;
        const sway = Math.sin(this.animClock * 1.3 + i * 0.7) * 3.5;
        const stalkW = i % 3 === 0 ? 6.5 : 4.5;

        ctx.strokeStyle = i % 2 === 0 ? "rgba(21, 128, 61, 0.42)" : "rgba(22, 163, 74, 0.36)";
        ctx.lineWidth = stalkW;
        ctx.beginPath();
        ctx.moveTo(bx, h);
        ctx.quadraticCurveTo(bx + sway * 0.5, h * 0.6, bx + sway, h * topRatio);
        ctx.stroke();
      }
    }

    _drawBambooWalls(ctx, walls, camX, camY, viewW, viewH) {
      for (const wall of walls) {
        if (
          wall.x + wall.w < camX - 20 ||
          wall.x > camX + viewW + 20 ||
          wall.y + wall.h < camY - 20 ||
          wall.y > camY + viewH + 20
        ) {
          continue;
        }

        ctx.save();
        ctx.fillStyle = "#16a34a";
        ctx.strokeStyle = "#052e16";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(wall.x, wall.y, wall.w, wall.h, 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(220, 252, 231, 0.5)";
        ctx.lineWidth = 1;
        if (wall.w >= wall.h && wall.w > 20) {
          for (let sx = wall.x + 18; sx < wall.x + wall.w - 8; sx += 22) {
            ctx.beginPath();
            ctx.moveTo(sx, wall.y + 0.5);
            ctx.lineTo(sx, wall.y + wall.h - 0.5);
            ctx.stroke();
          }
        } else if (wall.h > 20) {
          for (let sy = wall.y + 18; sy < wall.y + wall.h - 8; sy += 22) {
            ctx.beginPath();
            ctx.moveTo(wall.x + 0.5, sy);
            ctx.lineTo(wall.x + wall.w - 0.5, sy);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    _drawCoins(ctx, coins, camX, camY, viewW, viewH) {
      for (const coin of coins) {
        if (!coin || coin.collected) continue;
        if (coin.x < camX - 24 || coin.x > camX + viewW + 24 || coin.y < camY - 24 || coin.y > camY + viewH + 24) {
          continue;
        }

        const r = coin.radius;
        const bob = Math.sin(this.animClock * 4.5 + coin.order * 0.7) * 1.3;

        ctx.save();
        ctx.translate(coin.x, coin.y + bob);

        const coinGrad = ctx.createLinearGradient(-r, -r, r, r);
        coinGrad.addColorStop(0, "#fef08a");
        coinGrad.addColorStop(0.5, "#facc15");
        coinGrad.addColorStop(1, "#ca8a04");

        ctx.fillStyle = coinGrad;
        ctx.strokeStyle = "#854d0e";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#fef9c3";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(3, r - 2.2), 0, Math.PI * 2);
        ctx.stroke();

        const pr = Math.max(2.6, r * 0.44);
        const earR = Math.max(1.2, pr * 0.42);

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-pr * 0.78, -pr * 0.72, earR, 0, Math.PI * 2);
        ctx.arc(pr * 0.78, -pr * 0.72, earR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0.4, pr, pr * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-pr * 0.36, 0.2, Math.max(0.8, pr * 0.2), 0, Math.PI * 2);
        ctx.arc(pr * 0.36, 0.2, Math.max(0.8, pr * 0.2), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    _drawExit(ctx, exit) {
      if (!exit) return;
      const left = exit.x - exit.w * 0.5;
      const top = exit.y - exit.h * 0.5;
      const glow = 0.65 + Math.sin(this.animClock * 5) * 0.25;

      ctx.save();
      ctx.fillStyle = `rgba(74, 222, 128, ${glow})`;
      ctx.strokeStyle = "#14532d";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(left, top, exit.w, exit.h, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#052e16";
      ctx.font = "700 8px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AUS", exit.x, exit.y - 1);
      ctx.fillText("GANG", exit.x, exit.y + 8);
      ctx.restore();
    }

    _drawBamboo(ctx, bam) {
      const bw = bam.width || 30;
      const top = bam.top;
      const bottom = bam.bottom;
      const height = Math.max(12, bottom - top);
      const poleW = 8;
      const leftPoleX = bam.x - bw * 0.5;
      const rightPoleX = bam.x + bw * 0.5 - poleW;

      ctx.save();

      const drawPole = (px) => {
        const grad = ctx.createLinearGradient(px, 0, px + poleW, 0);
        grad.addColorStop(0, "#14532d");
        grad.addColorStop(0.28, "#4ade80");
        grad.addColorStop(0.55, "#86efac");
        grad.addColorStop(0.82, "#16a34a");
        grad.addColorStop(1, "#052e16");

        ctx.fillStyle = grad;
        ctx.strokeStyle = "#052e16";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(px, top, poleW, height, 4);
        ctx.fill();
        ctx.stroke();

        for (let ny = top + 16; ny < bottom - 4; ny += 20) {
          ctx.fillStyle = "#14532d";
          ctx.fillRect(px - 1.2, ny - 2, poleW + 2.4, 2);
          ctx.fillStyle = "#bbf7d0";
          ctx.fillRect(px - 0.8, ny, poleW + 1.6, 1.5);
        }
      };

      const rungStep = 14;
      for (let ry = top + 8; ry <= bottom - 6; ry += rungStep) {
        const rx = leftPoleX + poleW - 1;
        const rw = rightPoleX - rx + 1;
        ctx.fillStyle = "#22c55e";
        ctx.strokeStyle = "#052e16";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(rx, ry - 2.8, rw, 5.6, 2.8);
        ctx.fill();
        ctx.stroke();
      }

      drawPole(leftPoleX);
      drawPole(rightPoleX);
      ctx.restore();
    }

    _drawGrassHillPlatform(ctx, plat) {
      const { x, y, w, h } = plat;
      const radius = Math.min(8, h * 0.55);

      ctx.save();
      const soil = ctx.createLinearGradient(0, y, 0, y + h);
      soil.addColorStop(0, "#a16207");
      soil.addColorStop(1, "#713f12");

      ctx.fillStyle = soil;
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y + 2, w, Math.max(6, h - 2), radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#22c55e";
      ctx.fillRect(x + 2, y + 2, w - 4, 5);
      ctx.restore();
    }

    _drawPanda(ctx, x, y, w, h, facing = 1, walkPhase = 0) {
      const cx = x + w * 0.5;
      const headY = y + 7;
      const swing = Math.sin(walkPhase) * 2;

      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx - 3.6, y + h - 2, 3.1, 3.3, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 3.6, y + h - 2, 3.1, 3.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, y + h - 7.5, 6.2, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx - 6.2, y + h - 9 - swing * 0.3, 2.5, 3.7, 0.35, 0, Math.PI * 2);
      ctx.ellipse(cx + 6.2, y + h - 9 + swing * 0.3, 2.5, 3.7, -0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(cx - 5.4, headY - 4.8, 3.1, 0, Math.PI * 2);
      ctx.arc(cx + 5.4, headY - 4.8, 3.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, headY, 7.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const lookShift = facing * 1.1;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx - 2.7 + lookShift, headY - 0.5, 2.1, 2.7, -0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + 2.7 + lookShift, headY - 0.5, 2.1, 2.7, 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - 2.3 + lookShift, headY - 1.1, 0.9, 0, Math.PI * 2);
      ctx.arc(cx + 3.1 + lookShift, headY - 1.1, 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx + lookShift, headY + 1.8, 1.3, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    _drawCop(ctx, cop) {
      const cx = cop.x + cop.w * 0.5;
      const topY = cop.y;
      const botY = cop.y + cop.h;
      const flashBlue = Math.sin(this.animClock * 16) > 0;
      const step = Math.sin(this.animClock * 9) * 2.5;

      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(cx - 10, botY - 8 + step * 0.4, 8, 8, 2);
      ctx.roundRect(cx + 2, botY - 8 - step * 0.4, 8, 8, 2);
      ctx.fill();

      ctx.fillStyle = "#1d4ed8";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(cop.x + 2, topY + 13, cop.w - 4, cop.h - 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(cx, topY + 10, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.roundRect(cx - 10, topY + 1, 20, 5, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = flashBlue ? "#38bdf8" : "#ef4444";
      ctx.beginPath();
      ctx.arc(cx, topY, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    _drawKeys(ctx, keys) {
      for (const key of keys) {
        if (!key || key.collected) continue;
        const bob = Math.sin(this.animClock * 5) * 3;
        ctx.save();
        ctx.translate(key.x, key.y + bob);
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(-5, 0, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 0);
        ctx.moveTo(7, 0);
        ctx.lineTo(7, 4);
        ctx.moveTo(10, 0);
        ctx.lineTo(10, 4);
        ctx.stroke();
        ctx.restore();
      }
    }

    _drawCageAndSecondPanda(ctx, cage) {
      if (!cage) return;
      const cx = cage.x;
      const baseY = cage.y + cage.h;
      this._drawPanda(ctx, cx - 10, baseY - 26, 20, 24, 1, this.animClock * 4);
      if (cage.freed) return;

      ctx.save();
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - cage.w * 0.5, cage.y, cage.w, cage.h);
      for (let gx = cx - cage.w * 0.5 + 8; gx < cx + cage.w * 0.5; gx += 8) {
        ctx.beginPath();
        ctx.moveTo(gx, cage.y);
        ctx.lineTo(gx, baseY);
        ctx.stroke();
      }
      ctx.restore();
    }

    _draw() {
      const ctx = this.c;
      if (!ctx) return;
      const w = this.view.w;
      const h = this.view.h;

      ctx.save();
      ctx.scale(this.view.dpr, this.view.dpr);

      this._drawMountainBambooBackground(ctx, w, h);

      ctx.save();
      ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

      if (this.levelMode === "maze") {
        this._drawBambooWalls(ctx, this.walls, this.camera.x, this.camera.y, w, h);
        this._drawCoins(ctx, this.coins, this.camera.x, this.camera.y, w, h);
        this._drawExit(ctx, this.exit);
      } else {
        for (const bam of this.bamboos) {
          this._drawBamboo(ctx, bam);
        }
        for (const plat of this.platforms) {
          this._drawGrassHillPlatform(ctx, plat);
        }
        this._drawKeys(ctx, this.keys);
        this._drawCageAndSecondPanda(ctx, this.cage);
        for (const cop of this.cops) {
          this._drawCop(ctx, cop);
        }
      }

      if (!(this.invulnTimer > 0 && Math.floor(this.animClock * 16) % 2 === 0)) {
        this._drawPanda(
          ctx,
          this.pandi.x,
          this.pandi.y,
          this.pandi.w,
          this.pandi.h,
          this.pandi.facing,
          this.pandi.walkCycle
        );
      }

      for (const pt of this.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      ctx.font = "700 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      for (const ft of this.floatingTexts) {
        ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }

      ctx.restore();
    }

    _loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;

      if (!this.paused) {
        this._syncControls();
        this._update(dt);
      }
      this._draw();

      this.rafId = requestAnimationFrame(this._loop);
    }
  }

  window.PANDIES_ABENTEUER_GAME = new PandiesAbenteuerGame();
})();