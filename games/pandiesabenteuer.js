(() => {
  "use strict";

  const VIRTUAL_W = 720;
  const VIRTUAL_H = 405;

  class PandiesAbenteuerGame {
    constructor() {
      this.ctx = null;
      this.canvas = null;
      this.c = null;
      this.rafId = null;
      this.lastTime = 0;
      this.running = false;
      this.paused = false;

      this.view = { w: VIRTUAL_W, h: VIRTUAL_H, dpr: 1 };
      this.world = { w: VIRTUAL_W, h: VIRTUAL_H };
      this.camera = { x: 0, y: 0 };

      this.levels = [];
      this.levelIndex = 0;
      this.levelMode = "platform";
      this.currentLevelDef = null;
      this.currentLevelBuilt = null;

      this.score = 0;
      this.rescuedCount = 0;
      this.lives = 3;
      this.keysCollected = 0;
      this.keysRequired = 1;
      this.coinsCollected = 0;
      this.coinsTotal = 0;
      this.invulnTimer = 0;
      this.animClock = 0;
      this.victoryTimer = 0;
      this.isGameWon = false;

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
        y: 330,
        w: 24,
        h: 32,
        standH: 32,
        duckH: 16,
        isDucking: false,
        vx: 0,
        vy: 0,
        onGround: false,
        onBamboo: false,
        facing: 1,
        walkCycle: 0,
        squashY: 1
      };

      this.keyState = { left: false, right: false, up: false, down: false };
      this.pointerState = { left: false, right: false, up: false, down: false };
      this.input = { left: false, right: false, up: false, down: false, jumpBuffered: 0 };
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
      this.wrap.className = "relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none";

      this.hud = document.createElement("div");
      this.hud.className =
        "shrink-0 flex items-center justify-between gap-1.5 px-3 py-1.5 border-b border-emerald-400/30 bg-emerald-950/95 text-[11px] sm:text-xs font-orbitron select-none shadow-md z-10";
      this.hud.innerHTML = `
        <div class="flex items-center gap-2">
          <span data-hud="level" class="text-emerald-300 font-bold">LVL 1</span>
          <span data-hud="goal" class="text-amber-300">🔑 0/1</span>
          <span data-hud="rescued" class="text-lime-300">🐼 0</span>
        </div>
        <div data-hud="test-buttons" class="flex items-center gap-1"></div>
        <div class="flex items-center gap-2">
          <span data-hud="score" class="text-white font-semibold">0 PKT</span>
          <span data-hud="lives" class="text-rose-400 tracking-tight">❤️❤️❤️</span>
        </div>
      `;

      this.canvasHost = document.createElement("div");
      this.canvasHost.className =
        "relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden p-1 sm:p-2";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-2xl border border-emerald-400/35 shadow-2xl touch-none bg-slate-950";
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
          const shortLabel = `L${i + 1}`;
          const title = lvl.shortLabel || `Level ${i + 1}`;
          const active = i === this.levelIndex;
          return `<button type="button" data-test-level="${i}" title="${title}" class="px-2 py-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer active:scale-95 ${
            active
              ? "bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              : "bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border-emerald-400/30"
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
        this._addFloatingText(
          this.view.w * 0.5,
          45,
          `TEST: ${this.levels[idx]?.name || `LEVEL ${idx + 1}`}`,
          "#fef08a"
        );
      }
    }

    resetGame() {
      this.levelIndex = 0;
      this.score = 0;
      this.rescuedCount = 0;
      this.lives = 3;
      this.invulnTimer = 0;
      this.victoryTimer = 0;
      this.isGameWon = false;
      this.particles = [];
      this.floatingTexts = [];
      this.setupLevel(this.levelIndex, true);
      this._updateHud();
    }

    setupLevel(idx, resetPandi = true) {
      if (!this.levels.length) {
        this.levels = window.PANDIES_ABENTEUER_LEVELS?.list?.() || [];
      }
      if (!this.levels.length) return;

      const safeIdx = ((idx % this.levels.length) + this.levels.length) % this.levels.length;
      this.levelIndex = safeIdx;
      const lvl = this.levels[safeIdx];
      this.currentLevelDef = lvl;

      const built = lvl.build(VIRTUAL_W, VIRTUAL_H, this);
      this.currentLevelBuilt = built;
      this.levelMode = built.mode || lvl.mode || "platform";
      this.world.w = built.worldW || VIRTUAL_W;
      this.world.h = built.worldH || VIRTUAL_H;

      this.platforms = built.platforms || [];
      this.bamboos = built.bamboos || built.ladders || [];
      this.keys = built.keys || [];
      this.cage = built.cage || null;
      this.cops = built.cops || [];

      this.walls = built.walls || [];
      this.coins = built.coins || [];
      this.exit = built.exit || null;

      this.keysCollected = 0;
      this.keysRequired = built.keysRequired ?? lvl.keysRequired ?? 1;
      this.coinsCollected = 0;
      this.coinsTotal = this.coins.length;

      this.ctx?.setSubtitle?.(lvl.name);

      if (resetPandi) {
        const spawn = built.spawn || {
          x: Math.round(this.world.w * 0.5),
          y: this.platforms[0]?.y ?? this.world.h - 24
        };
        this.pandi.h = this.pandi.standH;
        this.pandi.isDucking = false;
        this.pandi.x = Math.round(spawn.x - this.pandi.w * 0.5);
        this.pandi.y = Math.round(spawn.y - this.pandi.h);
        this.pandi.vx = 0;
        this.pandi.vy = 0;
        this.pandi.onGround = true;
        this.pandi.onBamboo = false;
        this.pandi.facing = 1;
        this.pandi.squashY = 1;
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

      const lerpFactor = Math.min(1, 14 * dt);
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
      const isPortrait = window.innerHeight > window.innerWidth;

      // In Portrait-Modus unten Platz für die virtuellen Buttons freihalten
      const reservedBottomPad = isPortrait ? 78 : 6;
      const availW = Math.max(260, rect.width - 12);
      const availH = Math.max(180, rect.height - reservedBottomPad - 8);
      const targetAspect = 16 / 9;

      let w = availW;
      let h = w / targetAspect;
      if (h > availH) {
        h = availH;
        w = h * targetAspect;
      }

      this.canvas.style.width = `${Math.round(w)}px`;
      this.canvas.style.height = `${Math.round(h)}px`;

      this.view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.canvas.width = Math.round(w * this.view.dpr);
      this.canvas.height = Math.round(h * this.view.dpr);

      // Virtuelle Koordinaten bleiben absolut stabil bei 720x405!
      this.view.w = VIRTUAL_W;
      this.view.h = VIRTUAL_H;
      // WICHTIG: Level wird beim Drehen oder Resizen NICHT zurückgesetzt!
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
          this.input.jumpBuffered = 0.18;
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
        this.input.jumpBuffered = 0.18;
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
      const dead = 14;
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
        if (Math.hypot(dx, dy) < 14) {
          this.input.jumpBuffered = 0.18;
        }
      }
      this._pointerId = null;
      this._pointerStart = null;
      this.pointerState = { left: false, right: false, up: false, down: false };
    }

    _syncControls() {
      const held = window.GLOBAL_MOBILE_CONTROLS?.held || this.ctx?.controls?.held || {};
      this.input.left = Boolean(this.keyState.left || this.pointerState.left || held.left);
      this.input.right = Boolean(this.keyState.right || this.pointerState.right || held.right);
      this.input.up = Boolean(this.keyState.up || this.pointerState.up || held.up);
      this.input.down = Boolean(this.keyState.down || this.pointerState.down || held.down);
      if (held.jump && !this._prevHeldJump) {
        this.input.jumpBuffered = 0.18;
      }
      this._prevHeldJump = Boolean(held.jump);
    }

    spawnParticles(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 40 + Math.random() * 120;
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 35,
          life: 0.45 + Math.random() * 0.3,
          maxLife: 0.75,
          color,
          r: 2.2 + Math.random() * 1.8
        });
      }
    }

    addFloatingText(x, y, text, color = "#fef08a") {
      this.floatingTexts.push({
        x,
        y,
        vy: -32,
        text,
        color,
        life: 1.25,
        maxLife: 1.25
      });
    }

    _spawnParticles(x, y, color, count = 12) {
      this.spawnParticles(x, y, color, count);
    }

    _addFloatingText(x, y, text, color = "#fef08a") {
      this.addFloatingText(x, y, text, color);
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
        const customHud = this.currentLevelBuilt?.hudText || this.currentLevelDef?.hudText;
        if (typeof customHud === "function") {
          goalEl.textContent = customHud(this);
          goalEl.className = "text-amber-300";
        } else if (this.levelMode === "maze") {
          goalEl.textContent = `🪙 ${this.coinsCollected}/${this.coinsTotal} ➔ TOR`;
          goalEl.className = "text-amber-300 font-bold";
        } else {
          const ready = this.keysCollected >= this.keysRequired;
          goalEl.textContent = `🔑 ${this.keysCollected}/${this.keysRequired}`;
          goalEl.className = ready ? "text-lime-300 font-bold animate-pulse" : "text-amber-300";
        }
      }
      if (resEl) resEl.textContent = `🐼 ${this.rescuedCount}`;
      if (scrEl) scrEl.textContent = `${this.score} PKT`;
      if (livEl) livEl.textContent = "❤️".repeat(Math.max(0, this.lives)) || "💀";
    }

    damagePandi(reason) {
      if (this.invulnTimer > 0) return;
      this.lives -= 1;
      this.invulnTimer = 1.35;
      this.ctx?.sound?.playLose?.();
      this.spawnParticles(this.pandi.x + this.pandi.w * 0.5, this.pandi.y + this.pandi.h * 0.5, "#fb7185", 18);
      this.addFloatingText(this.pandi.x - this.camera.x + 12, this.pandi.y - this.camera.y - 10, reason, "#fb7185");
      this._updateHud();

      if (this.lives <= 0) {
        this.addFloatingText(VIRTUAL_W * 0.5, VIRTUAL_H * 0.45, "ERWISCHT! NEUSTART...", "#fde047");
        this.resetGame();
      }
    }

    _damagePandi(reason) {
      this.damagePandi(reason);
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

      const speed = 190;
      p.vx = mx * speed;
      p.vy = my * speed;
      if (mx !== 0) p.facing = mx > 0 ? 1 : -1;
      if (Math.hypot(p.vx, p.vy) > 10) {
        p.walkCycle += dt * 12;
      }

      // X-Achse Kollisionsauflösung
      p.x += p.vx * dt;
      p.x = Math.max(4, Math.min(ww - p.w - 4, p.x));
      for (const wall of this.walls) {
        if (this._rectsOverlap(p.x, p.y, p.w, p.h, wall.x, wall.y, wall.w, wall.h)) {
          if (p.vx > 0) p.x = wall.x - p.w;
          else if (p.vx < 0) p.x = wall.x + wall.w;
        }
      }

      // Y-Achse Kollisionsauflösung
      p.y += p.vy * dt;
      p.y = Math.max(4, Math.min(wh - p.h - 4, p.y));
      for (const wall of this.walls) {
        if (this._rectsOverlap(p.x, p.y, p.w, p.h, wall.x, wall.y, wall.w, wall.h)) {
          if (p.vy > 0) p.y = wall.y - p.h;
          else if (p.vy < 0) p.y = wall.y + wall.h;
        }
      }

      // Münzen einsammeln
      const pcx = p.x + p.w * 0.5;
      const pcy = p.y + p.h * 0.5;
      for (const coin of this.coins) {
        if (coin.collected) continue;
        if (Math.hypot(pcx - coin.x, pcy - coin.y) <= coin.radius + 15) {
          coin.collected = true;
          this.coinsCollected += 1;
          this.score += 50;
          this.ctx?.sound?.playScore?.();
          this.spawnParticles(coin.x, coin.y, "#facc15", 10);
          this._updateHud();
        }
      }

      // Ausgang erreichen
      if (this.exit) {
        const exLeft = this.exit.x - this.exit.w * 0.5;
        const exTop = this.exit.y - this.exit.h * 0.5;
        if (this._rectsOverlap(p.x, p.y, p.w, p.h, exLeft, exTop, this.exit.w, this.exit.h)) {
          this.rescuedCount += 1;
          this.score += 500;
          this.ctx?.sound?.playScore?.();
          this.spawnParticles(this.exit.x, this.exit.y, "#4ade80", 30);
          this.addFloatingText(
            this.exit.x - this.camera.x,
            this.exit.y - this.camera.y - 18,
            "LABYRINTH GEMEISTERT! +500",
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
            const halfW = (bam.width || 30) * 0.5 + 4;
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
            cop.y += (cop.vy || -65) * dt;

            const reachedTop = cop.y <= lad.top - cop.h;
            const reachedBottom = cop.y + cop.h >= lad.bottom;

            if (reachedTop || reachedBottom) {
              if (reachedTop) cop.y = lad.top - cop.h;
              else if (reachedBottom) cop.y = lad.bottom - cop.h;

              cop.onLadder = false;
              cop.activeLadder = null;
              cop.vy = 0;
              cop.ladderCooldown = 0.8;
              const spd = 64 + Math.random() * 30;
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
              if (Math.random() < 0.04) {
                const canGoUp = cop.y > touchingLadder.top - cop.h + 4;
                const canGoDown = cop.y + cop.h < touchingLadder.bottom - 4;
                if (canGoUp || canGoDown) {
                  let dirY = Math.random() < 0.5 ? -1 : 1;
                  if (!canGoUp) dirY = 1;
                  if (!canGoDown) dirY = -1;
                  cop.onLadder = true;
                  cop.activeLadder = touchingLadder;
                  cop.vy = dirY * (58 + Math.random() * 24);
                  cop.vx = 0;
                }
              }
            }

            if (!cop.onLadder) {
              cop.dirTimer -= dt;
              if (cop.dirTimer <= 0) {
                cop.dirTimer = 0.8 + Math.random() * 1.2;
                const spd = 62 + Math.random() * 32;
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
          this.damagePandi("POLIZIST!");
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

      if (this.isGameWon) {
        this.victoryTimer += dt;
        if (Math.random() < 0.25) {
          this.spawnParticles(
            VIRTUAL_W * 0.2 + Math.random() * VIRTUAL_W * 0.6,
            VIRTUAL_H * 0.2 + Math.random() * VIRTUAL_H * 0.4,
            Math.random() < 0.5 ? "#facc15" : "#4ade80",
            8
          );
        }
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

        const centerX = p.x + p.w * 0.5;
        const footY = p.y + p.h;
        let nearBamboo = null;
        for (const bam of this.bamboos) {
          const halfW = (bam.width || 30) * 0.5 + 8;
          if (Math.abs(centerX - bam.x) <= halfW && footY >= bam.top - 6 && p.y <= bam.bottom + 4) {
            nearBamboo = bam;
            break;
          }
        }

        // DUCKEN: Am Boden verlässlich ducken, außer wenn man eine Leiter nach unten ansteuert
        const atLadderTopGoingDown = Boolean(nearBamboo && this.input.down && p.y + p.h < nearBamboo.bottom - 4);
        const wantsDuck = Boolean(!p.onBamboo && p.onGround && this.input.down && !atLadderTopGoingDown);
        const prevBottomForDuck = p.y + p.h;
        if (wantsDuck !== p.isDucking) {
          p.isDucking = wantsDuck;
          p.h = wantsDuck ? p.duckH : p.standH;
          p.y = prevBottomForDuck - p.h;
        }

        // KLETTERN AN BAMBUS / LEITER:
        // Bei Up oder Down auf Leiter einhaken
        if (nearBamboo && (this.input.up || this.input.down)) {
          p.onBamboo = true;
          p.onGround = false;
          if (p.isDucking) {
            p.isDucking = false;
            p.h = p.standH;
            p.y = prevBottomForDuck - p.h;
          }
          p.vy = 0;
          if (this.input.up) p.y -= 130 * dt;
          if (this.input.down) p.y += 130 * dt;

          // Leiter-Ausstieg oben
          if (p.y <= nearBamboo.top - p.h) {
            p.y = nearBamboo.top - p.h;
            p.onBamboo = false;
            p.onGround = true;
          } else if (p.y >= nearBamboo.bottom - p.h) {
            // Leiter-Ausstieg unten
            p.y = nearBamboo.bottom - p.h;
            p.onBamboo = false;
            p.onGround = true;
          } else {
            // Zentrierung auf Leiter mit weicher Toleranz für horizontales Korrigieren
            const targetX = nearBamboo.x - p.w * 0.5;
            p.x += (targetX - p.x) * Math.min(1, 10 * dt);
          }
        }

        // Von Leiter abspringen
        if (p.onBamboo && this.input.jumpBuffered > 0) {
          p.onBamboo = false;
          p.vy = -345;
          p.vx = (moveX || p.facing) * 140;
          this.input.jumpBuffered = 0;
          this.ctx?.sound?.playHit?.();
        }

        // Seitlich von Leiter lösen nur wenn Pandi sich deutlich wegbewegt
        if (p.onBamboo && nearBamboo) {
          if (moveX !== 0) {
            p.x += moveX * 70 * dt;
            if (Math.abs(p.x + p.w * 0.5 - nearBamboo.x) > (nearBamboo.width || 30) * 0.5 + 10) {
              p.onBamboo = false;
            }
          }
        } else if (p.onBamboo && !nearBamboo) {
          p.onBamboo = false;
        }

        // Horizontale Geschwindigkeit
        const maxSpeedX = p.onBamboo ? 70 : p.isDucking ? 92 : 160;
        if (moveX !== 0) {
          p.vx = moveX * maxSpeedX;
          p.facing = moveX > 0 ? 1 : -1;
        } else {
          const damping = p.onBamboo ? 0.000001 : 0.0001;
          p.vx *= Math.pow(damping, dt);
          if (Math.abs(p.vx) < 4) p.vx = 0;
        }

        // Physik & Sprung (wenn nicht an Leiter)
        if (!p.onBamboo) {
          if (this.input.jumpBuffered > 0 && p.onGround) {
            if (p.isDucking) {
              const b = p.y + p.h;
              p.isDucking = false;
              p.h = p.standH;
              p.y = b - p.h;
            }
            p.vy = -375;
            p.onGround = false;
            p.squashY = 1.25;
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
              if (overlapX && prevBottom <= plat.y + 10 && p.y + p.h >= plat.y) {
                p.y = plat.y - p.h;
                p.vy = 0;
                p.onGround = true;
                p.squashY = 0.88;
                break;
              }
            }
          }
        } else {
          p.x += p.vx * dt;
        }

        p.squashY += (1 - p.squashY) * Math.min(1, 14 * dt);

        p.x = Math.max(8, Math.min(w - p.w - 8, p.x));
        p.y = Math.max(10, Math.min(h - p.h - 6, p.y));

        if (Math.abs(p.vx) > 10 || p.onBamboo) {
          p.walkCycle += dt * 12;
        }

        // Schlüssel einsammeln
        for (const k of this.keys) {
          if (k.collected) continue;
          const distKey = Math.hypot(p.x + p.w * 0.5 - k.x, p.y + p.h * 0.5 - k.y);
          if (distKey < 28) {
            k.collected = true;
            this.keysCollected += 1;
            this.score += 150;
            this.ctx?.sound?.playScore?.();
            this.spawnParticles(k.x, k.y, "#facc15", 16);
            this.addFloatingText(
              k.x - this.camera.x,
              k.y - this.camera.y - 12,
              "SCHLÜSSEL! JETZT ZUM KÄFIG!",
              "#fef08a"
            );
            this._updateHud();
          }
        }

        // Käfig & 2. Panda befreien
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
              this.score += 600;
              this.ctx?.sound?.playScore?.();
              this.spawnParticles(this.cage.x, this.cage.y + 16, "#4ade80", 28);
              this.spawnParticles(this.cage.x, this.cage.y + 16, "#facc15", 20);

              const isLastLevel = this.levelIndex >= this.levels.length - 1;
              if (isLastLevel) {
                this.isGameWon = true;
                this.addFloatingText(
                  this.cage.x - this.camera.x,
                  this.cage.y - this.camera.y - 18,
                  "PANDA GERETTET! ADVENTURE VOLLENDET! +600",
                  "#fef08a"
                );
              } else {
                this.addFloatingText(
                  this.cage.x - this.camera.x,
                  this.cage.y - this.camera.y - 14,
                  "PANDA BEFREIT! +600",
                  "#fef08a"
                );
                setTimeout(() => {
                  this.setupLevel(this.levelIndex + 1, true);
                }, 900);
              }
              this._updateHud();
            } else if (this.invulnTimer <= 0) {
              this.invulnTimer = 0.8;
              this.addFloatingText(
                this.cage.x - this.camera.x,
                this.cage.y - this.camera.y - 14,
                "SCHLÜSSEL ZUERST HOLEN!",
                "#fef08a"
              );
            }
          }
        }

        this._updateCops(dt, p);
        this._updateCamera(dt);
      }

      const levelUpdate = this.currentLevelBuilt?.update || this.currentLevelDef?.update;
      if (typeof levelUpdate === "function") {
        levelUpdate(this, dt);
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
        // Schatten unter der Hecke
        ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        ctx.beginPath();
        ctx.roundRect(wall.x + 2, wall.y + 3, wall.w, wall.h, 6);
        ctx.fill();

        // Bambus-Heckenkörper
        const hGrad = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
        hGrad.addColorStop(0, "#15803d");
        hGrad.addColorStop(0.5, "#16a34a");
        hGrad.addColorStop(1, "#14532d");

        ctx.fillStyle = hGrad;
        ctx.strokeStyle = "#052e16";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(wall.x, wall.y, wall.w, wall.h, 5);
        ctx.fill();
        ctx.stroke();

        // Lebendige Blätter-Struktur auf der Hecke
        ctx.fillStyle = "rgba(187, 247, 208, 0.35)";
        if (wall.w >= wall.h && wall.w > 20) {
          for (let sx = wall.x + 12; sx < wall.x + wall.w - 6; sx += 18) {
            ctx.beginPath();
            ctx.ellipse(sx, wall.y + wall.h * 0.45, 6, 3, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (wall.h > 20) {
          for (let sy = wall.y + 12; sy < wall.y + wall.h - 6; sy += 18) {
            ctx.beginPath();
            ctx.ellipse(wall.x + wall.w * 0.45, sy, 3, 6, -0.2, 0, Math.PI * 2);
            ctx.fill();
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
        const bob = Math.sin(this.animClock * 4.5 + coin.order * 0.7) * 1.5;

        ctx.save();
        ctx.translate(coin.x, coin.y + bob);

        // Sanfte goldene Aura
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.8);
        glow.addColorStop(0, "rgba(250, 204, 21, 0.35)");
        glow.addColorStop(1, "rgba(250, 204, 21, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Münzkörper
        const coinGrad = ctx.createLinearGradient(-r, -r, r, r);
        coinGrad.addColorStop(0, "#fef9c3");
        coinGrad.addColorStop(0.35, "#facc15");
        coinGrad.addColorStop(0.75, "#eab308");
        coinGrad.addColorStop(1, "#a16207");

        ctx.fillStyle = coinGrad;
        ctx.strokeStyle = "#713f12";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Randprägung
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(3, r - 2.2), 0, Math.PI * 2);
        ctx.stroke();

        // Stilisierte Panda-Pfote als Münz-Prägung
        ctx.fillStyle = "#713f12";
        ctx.beginPath();
        ctx.ellipse(0, 1, 3.2, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        for (const [tox, toy] of [[-3, -2.5], [0, -3.8], [3, -2.5]]) {
          ctx.beginPath();
          ctx.arc(tox, toy, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    _drawExit(ctx, exit) {
      if (!exit) return;
      const left = exit.x - exit.w * 0.5;
      const top = exit.y - exit.h * 0.5;
      const glow = 0.75 + Math.sin(this.animClock * 5) * 0.25;

      ctx.save();
      // Leuchtendes Torii / Pagodentor
      const portalGlow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, exit.w * 1.2);
      portalGlow.addColorStop(0, "rgba(74, 222, 128, 0.45)");
      portalGlow.addColorStop(1, "rgba(74, 222, 128, 0)");
      ctx.fillStyle = portalGlow;
      ctx.beginPath();
      ctx.arc(exit.x, exit.y, exit.w * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Portal-Hintergrund
      ctx.fillStyle = `rgba(34, 197, 94, ${glow})`;
      ctx.strokeStyle = "#14532d";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(left, top, exit.w, exit.h, 8);
      ctx.fill();
      ctx.stroke();

      // Zier-Dach des Tores
      ctx.fillStyle = "#b91c1c";
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(left - 6, top);
      ctx.quadraticCurveTo(exit.x, top - 8, exit.x + exit.w * 0.5 + 6, top);
      ctx.lineTo(exit.x + exit.w * 0.5 + 2, top + 5);
      ctx.quadraticCurveTo(exit.x, top - 2, left - 2, top + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 9px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AUS", exit.x, exit.y - 1);
      ctx.fillText("GANG", exit.x, exit.y + 10);
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
        grad.addColorStop(0, "#052e16");
        grad.addColorStop(0.2, "#15803d");
        grad.addColorStop(0.5, "#4ade80");
        grad.addColorStop(0.8, "#86efac");
        grad.addColorStop(1, "#14532d");

        ctx.fillStyle = grad;
        ctx.strokeStyle = "#052e16";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(px, top, poleW, height, 4);
        ctx.fill();
        ctx.stroke();

        // Bambus-Gelenke & Ringe
        for (let ny = top + 16; ny < bottom - 4; ny += 22) {
          ctx.fillStyle = "#052e16";
          ctx.fillRect(px - 1.2, ny - 2, poleW + 2.4, 2);
          ctx.fillStyle = "#bbf7d0";
          ctx.fillRect(px - 0.8, ny, poleW + 1.6, 1.5);

          // Zarte Bambusblätter am Gelenk
          if ((Math.round(px + ny)) % 2 === 0) {
            ctx.fillStyle = "#22c55e";
            ctx.beginPath();
            ctx.ellipse(px + (px === leftPoleX ? -4 : poleW + 4), ny, 5, 2, px === leftPoleX ? -0.4 : 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      // Sprossen
      const rungStep = 15;
      for (let ry = top + 9; ry <= bottom - 6; ry += rungStep) {
        const rx = leftPoleX + poleW - 1;
        const rw = rightPoleX - rx + 1;
        const rGrad = ctx.createLinearGradient(0, ry - 3, 0, ry + 3);
        rGrad.addColorStop(0, "#86efac");
        rGrad.addColorStop(1, "#16a34a");

        ctx.fillStyle = rGrad;
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
      const radius = Math.min(8, h * 0.6);

      ctx.save();
      // Weicher Schatten unter der Plattform
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 4, w - 4, h, radius);
      ctx.fill();

      // Schöne, geschichtete Erde
      const soil = ctx.createLinearGradient(0, y, 0, y + h);
      soil.addColorStop(0, "#78350f");
      soil.addColorStop(0.4, "#92400e");
      soil.addColorStop(1, "#451a03");

      ctx.fillStyle = soil;
      ctx.strokeStyle = "#291305";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(x, y + 2, w, Math.max(6, h - 2), radius);
      ctx.fill();
      ctx.stroke();

      // Kleine dekorative Kiesel im Boden
      ctx.fillStyle = "rgba(214, 211, 209, 0.4)";
      for (let px = x + 18; px < x + w - 16; px += 36) {
        ctx.beginPath();
        ctx.arc(px, y + h * 0.65, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Saftig grüne, abgerundete Grasnarbe
      const grassGrad = ctx.createLinearGradient(0, y, 0, y + 7);
      grassGrad.addColorStop(0, "#4ade80");
      grassGrad.addColorStop(0.5, "#22c55e");
      grassGrad.addColorStop(1, "#15803d");

      ctx.fillStyle = grassGrad;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, w - 2, 6.5, [radius, radius, 3, 3]);
      ctx.fill();

      // Zarte hängende Grashalme/Büschel an der Kante
      ctx.fillStyle = "#22c55e";
      for (let gx = x + 8; gx < x + w - 8; gx += 14) {
        ctx.beginPath();
        ctx.moveTo(gx - 3, y + 7);
        ctx.lineTo(gx, y + 10.5);
        ctx.lineTo(gx + 3, y + 7);
        ctx.fill();
      }

      // Oberer Glanzstreifen
      ctx.strokeStyle = "rgba(187, 247, 208, 0.75)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + radius, y + 2);
      ctx.lineTo(x + w - radius, y + 2);
      ctx.stroke();

      ctx.restore();
    }

    drawPanda(ctx, x, y, w, h, facing = 1, walkPhase = 0, isDucking = false) {
      const cx = x + w * 0.5;
      const swing = Math.sin(walkPhase) * 2.4;

      ctx.save();

      // Weicher Schatten unter Pandi
      ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
      ctx.beginPath();
      ctx.ellipse(cx, y + h + 1, w * 0.52, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Unverwundbarkeits-Aura
      if (this.invulnTimer > 0) {
        const auraAlpha = 0.35 + Math.sin(this.animClock * 16) * 0.25;
        ctx.fillStyle = `rgba(74, 222, 128, ${auraAlpha})`;
        ctx.beginPath();
        ctx.arc(cx, y + h * 0.5, Math.max(w, h) * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      // ----------------------------------------------------
      // DUCKING PANDA (Kuschelig flach geducktes Pandabärchen)
      // ----------------------------------------------------
      if (isDucking) {
        const botY = y + h;

        // Hinterpfoten
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(cx - 7, botY - 2.5, 4.5, 2.6, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 7, botY - 2.5, 4.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Runder geduckter Körper
        const bodyGrad = ctx.createLinearGradient(0, botY - 12, 0, botY);
        bodyGrad.addColorStop(0, "#ffffff");
        bodyGrad.addColorStop(0.7, "#f8fafc");
        bodyGrad.addColorStop(1, "#e2e8f0");
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx, botY - 6.5, 11, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const headX = cx + facing * 4.5;
        const headY = botY - 9.5;

        // Geduckte Öhrchen mit weicher rosa Innenseite
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(headX - 5.5, headY - 3, 3.2, 0, Math.PI * 2);
        ctx.arc(headX + 5.5, headY - 3, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f472b6";
        ctx.beginPath();
        ctx.arc(headX - 5.5, headY - 3, 1.4, 0, Math.PI * 2);
        ctx.arc(headX + 5.5, headY - 3, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Kopf
        const headGrad = ctx.createRadialGradient(headX, headY - 2, 2, headX, headY, 8);
        headGrad.addColorStop(0, "#ffffff");
        headGrad.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = headGrad;
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(headX, headY, 7.5, 5.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rosa Bäckchen
        ctx.fillStyle = "rgba(251, 113, 133, 0.4)";
        ctx.beginPath();
        ctx.arc(headX - 4.5, headY + 1.2, 1.8, 0, Math.PI * 2);
        ctx.arc(headX + 4.5, headY + 1.2, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Große süße Panda-Augenflecken
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(headX + facing * 2.2 - 2.5, headY - 0.2, 2.2, 0, Math.PI * 2);
        ctx.arc(headX + facing * 2.2 + 2.5, headY - 0.2, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Funkelnde Glanzpunkte in den Augen
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(headX + facing * 2.2 - 2.8, headY - 0.8, 0.9, 0, Math.PI * 2);
        ctx.arc(headX + facing * 2.2 + 2.2, headY - 0.8, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Schnauze & Näschen
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(headX + facing * 3.2, headY + 2.2, 1.4, 1.0, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return;
      }

      // ----------------------------------------------------
      // UPRIGHT PANDA (Süßes, rundliches, gezeichnetes Panda-Maskottchen)
      // ----------------------------------------------------
      const scale = Math.min(w / 16, h / 20);
      const headY = y + 7.5 * scale;

      // Flinke kleine Pfoten / Beinchen
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx - 3.8 * scale, y + h - 2 * scale, 3.2 * scale, 3.4 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 3.8 * scale, y + h - 2 * scale, 3.2 * scale, 3.4 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bauchiger, weicher Körper
      const bodyGrad = ctx.createLinearGradient(0, y + h - 14 * scale, 0, y + h - 2 * scale);
      bodyGrad.addColorStop(0, "#ffffff");
      bodyGrad.addColorStop(0.7, "#f8fafc");
      bodyGrad.addColorStop(1, "#e2e8f0");

      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, y + h - 7.5 * scale, 6.6 * scale, 5.6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Kleine Ärmchen / Vorderpfoten mit Geh-Schwung
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx - 6.4 * scale, y + h - 9 * scale - swing * 0.35, 2.7 * scale, 3.8 * scale, 0.35, 0, Math.PI * 2);
      ctx.ellipse(cx + 6.4 * scale, y + h - 9 * scale + swing * 0.35, 2.7 * scale, 3.8 * scale, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Flauschige Ohren mit rosa Innenohr
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(cx - 5.6 * scale, headY - 5.2 * scale, 3.4 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 5.6 * scale, headY - 5.2 * scale, 3.4 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.arc(cx - 5.6 * scale, headY - 5.2 * scale, 1.6 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 5.6 * scale, headY - 5.2 * scale, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Runder Panda-Kopf
      const headGrad = ctx.createRadialGradient(cx, headY - 2 * scale, 2 * scale, cx, headY, 8 * scale);
      headGrad.addColorStop(0, "#ffffff");
      headGrad.addColorStop(1, "#f1f5f9");

      ctx.fillStyle = headGrad;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, headY, 7.5 * scale, 6.4 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sanfte rosa Bäckchen
      ctx.fillStyle = "rgba(251, 113, 133, 0.4)";
      ctx.beginPath();
      ctx.arc(cx - 4.5 * scale, headY + 1.8 * scale, 1.8 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 4.5 * scale, headY + 1.8 * scale, 1.8 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Expressive Panda-Augenflecken (nach Blickrichtung ausgerichtet)
      const lookShift = facing * 1.2 * scale;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx - 2.8 * scale + lookShift, headY - 0.4 * scale, 2.2 * scale, 2.8 * scale, -0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + 2.8 * scale + lookShift, headY - 0.4 * scale, 2.2 * scale, 2.8 * scale, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Leuchtende Anime-Pupillen & Glanzpunkte
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - 2.4 * scale + lookShift, headY - 1.0 * scale, 0.95 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 3.2 * scale + lookShift, headY - 1.0 * scale, 0.95 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(cx - 1.8 * scale + lookShift, headY + 0.3 * scale, 0.5 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 3.8 * scale + lookShift, headY + 0.3 * scale, 0.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Näschen
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx + lookShift, headY + 2.2 * scale, 1.4 * scale, 1.0 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Freundliches Lächeln
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(cx + lookShift, headY + 2.8 * scale, 1.6 * scale, 0.2, Math.PI - 0.2);
      ctx.stroke();

      ctx.restore();
    }

    _drawPanda(ctx, x, y, w, h, facing = 1, walkPhase = 0) {
      this.drawPanda(ctx, x, y, w, h, facing, walkPhase, this.pandi.isDucking);
    }

    _drawCop(ctx, cop) {
      const cx = cop.x + cop.w * 0.5;
      const topY = cop.y;
      const botY = cop.y + cop.h;
      const flashBlue = Math.sin(this.animClock * 16) > 0;
      const step = Math.sin(this.animClock * 9) * 2.5;

      ctx.save();
      // Schuhe
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(cx - 10, botY - 8 + step * 0.4, 8, 8, 3);
      ctx.roundRect(cx + 2, botY - 8 - step * 0.4, 8, 8, 3);
      ctx.fill();

      // Uniform
      const uGrad = ctx.createLinearGradient(0, topY + 12, 0, botY - 6);
      uGrad.addColorStop(0, "#2563eb");
      uGrad.addColorStop(1, "#1e3a8a");

      ctx.fillStyle = uGrad;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(cop.x + 2, topY + 13, cop.w - 4, cop.h - 20, 6);
      ctx.fill();
      ctx.stroke();

      // Gürtel & goldene Schnalle
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cop.x + 3, botY - 12, cop.w - 6, 3.5);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(cx - 2, botY - 12, 4, 3.5);

      // Goldener Polizeistern / Abzeichen
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(cx - 4, topY + 18, 2, 0, Math.PI * 2);
      ctx.fill();

      // Kopf / Gesicht
      ctx.fillStyle = "#fde68a";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, topY + 9, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sonnenbrille
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cx - 6, topY + 6.5, 5.5, 3.2);
      ctx.fillRect(cx + 0.5, topY + 6.5, 5.5, 3.2);
      ctx.fillRect(cx - 1, topY + 7, 2, 1);

      // Polizeimütze
      ctx.fillStyle = "#1e3a8a";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(cx - 10, topY + 1, 20, 5, 2);
      ctx.fill();
      ctx.stroke();

      // Mützenschirm
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(cx, topY + 5.5, 11, 2.5, 0, 0, Math.PI);
      ctx.fill();

      // Blaulicht / Rotes Blinklicht auf der Mütze mit Lichtkegel
      const beaconColor = flashBlue ? "#38bdf8" : "#ef4444";
      const beaconHalo = ctx.createRadialGradient(cx, topY - 1, 1, cx, topY - 1, 16);
      beaconHalo.addColorStop(0, flashBlue ? "rgba(56, 189, 248, 0.65)" : "rgba(239, 68, 68, 0.65)");
      beaconHalo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = beaconHalo;
      ctx.beginPath();
      ctx.arc(cx, topY - 1, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = beaconColor;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, topY - 1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    _drawKeys(ctx, keys) {
      for (const key of keys) {
        if (!key || key.collected) continue;
        const bob = Math.sin(this.animClock * 5) * 3.5;
        ctx.save();
        ctx.translate(key.x, key.y + bob);

        // Goldene Leuchtaura
        const kGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
        kGlow.addColorStop(0, "rgba(250, 204, 21, 0.5)");
        kGlow.addColorStop(1, "rgba(250, 204, 21, 0)");
        ctx.fillStyle = kGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        // Goldener Schlüssel
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(-6, 0, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(-6, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 0);
        ctx.moveTo(8, 0);
        ctx.lineTo(8, 5);
        ctx.moveTo(12, 0);
        ctx.lineTo(12, 5);
        ctx.stroke();

        // Glitzernde Funken
        const sparkPhase = (this.animClock * 4) % 1;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(8 + Math.cos(sparkPhase * 6.28) * 8, Math.sin(sparkPhase * 6.28) * 6, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    _drawCageAndSecondPanda(ctx, cage) {
      if (!cage) return;
      const cx = cage.x;
      const baseY = cage.y + cage.h;

      // 2. Panda (gefangen im Käfig oder glücklich befreit)
      if (!cage.freed) {
        // Hilferuf-Panda winkt mit den Pfötchen
        const wave = Math.sin(this.animClock * 7) * 2;
        this.drawPanda(ctx, cx - 12, baseY - 32 + wave * 0.4, 24, 32, 1, this.animClock * 3, false);

        // Herzchen-Gedankenblase ("Rette mich!")
        const heartY = cage.y - 10 + Math.sin(this.animClock * 4) * 2;
        ctx.fillStyle = "rgba(244, 63, 94, 0.85)";
        ctx.beginPath();
        ctx.arc(cx - 3, heartY, 3, 0, Math.PI * 2);
        ctx.arc(cx + 3, heartY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 6, heartY + 1);
        ctx.lineTo(cx + 6, heartY + 1);
        ctx.lineTo(cx, heartY + 7);
        ctx.closePath();
        ctx.fill();

        // Käfiggitter mit Verzierungen
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        ctx.fillRect(cx - cage.w * 0.5 + 2, cage.y + 2, cage.w - 4, cage.h);

        // Goldener Schlosskasten
        ctx.fillStyle = "#eab308";
        ctx.strokeStyle = "#713f12";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(cx - 6, baseY - 16, 12, 11, 2.5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(cx, baseY - 11, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Gitterstäbe
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2.4;
        ctx.strokeRect(cx - cage.w * 0.5, cage.y, cage.w, cage.h);

        for (let gx = cx - cage.w * 0.5 + 8; gx < cx + cage.w * 0.5; gx += 8) {
          ctx.beginPath();
          ctx.moveTo(gx, cage.y);
          ctx.lineTo(gx, baseY);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Glücklich befreiter Panda jubelt und hüpft!
        const hop = Math.abs(Math.sin(this.animClock * 6)) * 8;
        this.drawPanda(ctx, cx - 12, baseY - 32 - hop, 24, 32, 1, this.animClock * 8, false);

        ctx.fillStyle = "#facc15";
        ctx.font = "800 10px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DANKE!", cx, cage.y - 12);
      }
    }

    _draw() {
      const ctx = this.c;
      if (!ctx) return;
      const w = VIRTUAL_W;
      const h = VIRTUAL_H;

      ctx.save();
      // Stabile Skalierung des virtuellen 720x405 Raums auf den tatsächlichen Canvas-Puffer
      const scaleX = this.canvas.width / w;
      const scaleY = this.canvas.height / h;
      ctx.scale(scaleX, scaleY);

      ctx.fillStyle = "#090d1a";
      ctx.fillRect(0, 0, w, h);

      const bgMap = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
      const levelKey = `level${this.levelIndex + 1}`;
      const customBg =
        this.currentLevelBuilt?.drawBackground ||
        this.currentLevelDef?.drawBackground ||
        bgMap[levelKey] ||
        (this.levelMode === "maze" ? bgMap.level2 : bgMap.level1);

      if (typeof customBg === "function") {
        customBg(ctx, {
          viewW: w,
          viewH: h,
          worldW: this.world.w,
          worldH: this.world.h,
          camera: this.camera,
          time: this.animClock
        });
      }

      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);

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

      const levelDraw = this.currentLevelBuilt?.drawEntities || this.currentLevelDef?.drawEntities;
      if (typeof levelDraw === "function") {
        levelDraw(this, ctx);
      }

      // Pandi zeichnen
      if (!(this.invulnTimer > 0 && Math.floor(this.animClock * 16) % 2 === 0)) {
        this.drawPanda(
          ctx,
          this.pandi.x,
          this.pandi.y,
          this.pandi.w,
          this.pandi.h,
          this.pandi.facing,
          this.pandi.walkCycle,
          this.pandi.isDucking
        );
      }

      // Partikel
      for (const pt of this.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r || 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // Schwebende Texte (im virtuellen Bildschirmraum)
      ctx.font = "800 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      for (const ft of this.floatingTexts) {
        const alpha = Math.max(0, Math.min(1, ft.life / (ft.maxLife * 0.4)));
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;

      // Große Siegesfeier bei gemeistertem Abenteuer
      if (this.isGameWon) {
        ctx.save();
        ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
        ctx.fillRect(0, 0, w, h);

        const bannerGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.7);
        bannerGrad.addColorStop(0, "rgba(5, 46, 22, 0.95)");
        bannerGrad.addColorStop(1, "rgba(2, 44, 34, 0.95)");

        ctx.fillStyle = bannerGrad;
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(w * 0.15, h * 0.28, w * 0.7, h * 0.44, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "900 20px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎉 ALLES GEMEISTERT! 🎉", w * 0.5, h * 0.42);

        ctx.fillStyle = "#ffffff";
        ctx.font = "700 13px Rajdhani, sans-serif";
        ctx.fillText("Alle Pandas sind gerettet und in Sicherheit!", w * 0.5, h * 0.50);

        ctx.fillStyle = "#4ade80";
        ctx.font = "800 14px Orbitron, sans-serif";
        ctx.fillText(`ENDSTAND: ${this.score} PUNKTE`, w * 0.5, h * 0.60);
        ctx.restore();
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
