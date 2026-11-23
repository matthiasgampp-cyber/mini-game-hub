(() => {
  "use strict";

  const METERS_PER_PX = 1 / 18;
  const STAGE_SPAN_METERS = 500;
  const STAGE_ORDER = ["ice_river", "sled_run", "snowball_run", "ice_cave", "ice_boss"];
  const LEVEL_CHOICES = [
    { id: "ice_river", label: "🧊 Eisfluss" },
    { id: "sled_run", label: "🛷 Schlitten" },
    { id: "snowball_run", label: "⛄ Schneeball" },
    { id: "ice_cave", label: "❄️ Eishöhle" },
    { id: "ice_boss", label: "👾 Boss" }
  ];
  const LEVEL_SCRIPTS = {
    ice_river: "games/Yetiadventure/level-ice-river.js",
    sled_run: "games/Yetiadventure/level-sled-run.js",
    snowball_run: "games/Yetiadventure/level-snowball-run.js",
    ice_cave: "games/Yetiadventure/level-ice-cave.js",
    ice_boss: "games/Yetiadventure/level-ice-boss.js"
  };

  const LEVEL_STORE = new Map();
  const LOADING_PROMISES = new Map();

  window.YETI_ADVENTURE_LEVELS = {
    register(levelDef) {
      if (levelDef?.id) {
        LEVEL_STORE.set(levelDef.id, levelDef);
      }
    },
    get(id) {
      return LEVEL_STORE.get(id) || null;
    },
    all() {
      return Array.from(LEVEL_STORE.values());
    }
  };

  function loadLevelScript(id) {
    if (LEVEL_STORE.has(id)) return Promise.resolve(LEVEL_STORE.get(id));
    if (LOADING_PROMISES.has(id)) return LOADING_PROMISES.get(id);

    const src = LEVEL_SCRIPTS[id];
    if (!src) return Promise.resolve(null);

    const promise = new Promise((resolve) => {
      const existing = document.querySelector(`script[data-yeti-level="${id}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(LEVEL_STORE.get(id) || null), { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.yetiLevel = id;
      script.onload = () => resolve(LEVEL_STORE.get(id) || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    }).finally(() => {
      LOADING_PROMISES.delete(id);
    });

    LOADING_PROMISES.set(id, promise);
    return promise;
  }

  window.GAME_REGISTRY?.register({
    id: "yetiadventure",
    name: "Yeti Glacier Run",
    subtitle: "Gebirge • Schnee & Gletscher • Eisfluss • Schlittenfahrt",
    tag: "Gletscher Adventure",
    icon: "🧊",
    hidden: false,

    async init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.animClock = 0;
      this.paused = false;
      this.phase = "playing";
      this.levelReady = false;
      this._switchingStage = false;

      this.score = 0;
      this.treasures = 0;
      this.bestScore = ctx.storage.get("best_score", 0);
      this.maxLives = 3;
      this.lives = 3;
      this.lastLifeMilestone = 0;
      this.invulnTimer = 0;
      this.distance = 0;
      this.scrollSpeed = 145;

      this.startMode = "ice_river";
      this.mode = "ice_river";

      this.field = { x: 0, y: 0, w: 720, h: 405, riverY: 315 };
      this._lastCanvasW = 0;
      this._lastCanvasH = 0;

      this.yeti = {
        x: 120,
        y: 250,
        w: 36,
        h: 44,
        normalH: 44,
        crouchH: 26,
        vx: 0,
        vy: 0,
        onFloe: null,
        crouching: false,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        dropThroughTimer: 0,
        runCycle: 0
      };

      this.localInput = { left: false, right: false, up: false, down: false, crouch: false };
      this.input = { left: false, right: false, up: false, down: false, crouch: false };

      this.floes = [];
      this.obstacles = [];
      this.treasuresList = [];
      this.ramps = [];
      this.cracks = [];
      this.funnels = [];
      this.particles = [];
      this.floatingTexts = [];

      this.floeSpawnTimer = 0.2;
      this.spawnTimer = 1.8;
      this.treasureSpawnTimer = 1.25;

      this.root = document.createElement("div");
      this.root.className =
        "relative w-full h-full flex flex-col items-center justify-between p-1.5 bg-[#04101a] overflow-hidden select-none";

      this.hud = document.createElement("div");
      this.hud.className =
        "w-full max-w-[920px] min-h-[28px] shrink-0 flex items-center justify-between gap-2 px-2 font-orbitron text-[10px] sm:text-[11px] overflow-x-auto no-scrollbar";

      this.hudStats = document.createElement("div");
      this.hudStats.className = "flex items-center gap-2.5 shrink-0 whitespace-nowrap";

      this.levelBar = document.createElement("div");
      this.levelBar.className = "flex items-center gap-1 shrink-0";
      this.levelButtons = new Map();

      for (const item of LEVEL_CHOICES) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = item.label;
        btn.dataset.level = item.id;
        btn.className =
          "px-2 py-0.5 rounded-lg border font-orbitron text-[10px] whitespace-nowrap transition cursor-pointer";
        btn.addEventListener("click", () => {
          this.selectStartLevel(item.id);
        });
        this.levelBar.appendChild(btn);
        this.levelButtons.set(item.id, btn);
      }

      this.hud.appendChild(this.hudStats);
      this.hud.appendChild(this.levelBar);

      this.canvasWrapper = document.createElement("div");
      this.canvasWrapper.className =
        "relative flex-1 w-full max-w-[920px] flex items-center justify-center min-h-0 overflow-hidden";

      this.canvas = document.createElement("canvas");
      this.canvas.className =
        "block rounded-2xl border border-cyan-300/35 bg-[#071c2c] touch-none";
      this.canvasCtx = this.canvas.getContext("2d", { alpha: false });

      this.touchPad = document.createElement("div");
      this.touchPad.className =
        "pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2 sm:hidden";
      this.touchPad.innerHTML = `
        <div class="pointer-events-auto flex items-center gap-4">
          <button type="button" data-pad="left" class="w-12 h-12 rounded-2xl border border-cyan-300/35 bg-slate-950/75 text-cyan-200 font-bold text-lg active:scale-95 active:bg-cyan-500/30">◀</button>
          <button type="button" data-pad="right" class="w-12 h-12 rounded-2xl border border-cyan-300/35 bg-slate-950/75 text-cyan-200 font-bold text-lg active:scale-95 active:bg-cyan-500/30">▶</button>
          <button type="button" data-pad="crouch" class="px-3 h-12 rounded-2xl border border-sky-300/40 bg-sky-950/75 text-sky-200 font-orbitron text-[10px] font-bold uppercase active:scale-95 active:bg-sky-500/30">Ducken</button>
        </div>
        <div class="pointer-events-auto flex items-center gap-2">
          <button type="button" data-pad="jump" class="px-4 h-12 rounded-2xl border border-cyan-300/50 bg-cyan-400 text-slate-950 font-orbitron text-[11px] font-black uppercase tracking-wider shadow-lg active:scale-95">Springen</button>
        </div>
      `;

      this.overlay = document.createElement("div");
      this.overlay.className =
        "hidden absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-4";

      this.canvasWrapper.appendChild(this.canvas);
      this.canvasWrapper.appendChild(this.touchPad);
      this.root.appendChild(this.hud);
      this.root.appendChild(this.canvasWrapper);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.bindEvents();
      this.syncGlobalPadVisibility();
      await this.ensureLevelLoaded(this.startMode);
      this.resize(true);
      await this.resetState();
    },

    syncGlobalPadVisibility() {
      if (!this.touchPad) return;
      const hasGlobalPad = Boolean(
        document.getElementById("global-touch-controls") || window.GLOBAL_MOBILE_CONTROLS
      );
      this.touchPad.classList.toggle("hidden", hasGlobalPad);
    },

    syncInputs() {
      this.syncGlobalPadVisibility();
      const gHeld = window.GLOBAL_MOBILE_CONTROLS?.held || this.ctx?.controls?.held || {};

      this.input.left = Boolean(this.localInput.left || gHeld.left);
      this.input.right = Boolean(this.localInput.right || gHeld.right);
      this.input.up = Boolean(this.localInput.up || gHeld.up);
      this.input.down = Boolean(this.localInput.down || gHeld.down);
      this.input.crouch = Boolean(this.localInput.crouch || gHeld.down || gHeld.crouch);

      if (gHeld.up && !this._prevGlobalUp) {
        this.triggerJump();
      }
      this._prevGlobalUp = Boolean(gHeld.up);
    },

    async ensureLevelLoaded(id) {
      const existing = window.YETI_ADVENTURE_LEVELS?.get(id);
      if (existing) {
        this.levelReady = true;
        return existing;
      }
      const loaded = await loadLevelScript(id);
      this.levelReady = Boolean(loaded);
      return loaded;
    },

    getCurrentLevel() {
      return window.YETI_ADVENTURE_LEVELS?.get(this.mode) || null;
    },

    getStageFromMeters(meters) {
      return STAGE_ORDER[Math.floor(meters / STAGE_SPAN_METERS) % STAGE_ORDER.length];
    },

    syncLevelButtons() {
      if (!this.levelButtons) return;
      for (const [id, btn] of this.levelButtons.entries()) {
        const active = this.mode === id;
        btn.className = active
          ? "px-2 py-0.5 rounded-lg border border-cyan-200 bg-cyan-400 text-slate-950 font-orbitron text-[10px] font-bold whitespace-nowrap transition cursor-pointer"
          : "px-2 py-0.5 rounded-lg border border-cyan-400/30 bg-slate-900/80 text-cyan-200/85 font-orbitron text-[10px] whitespace-nowrap hover:bg-cyan-500/20 transition cursor-pointer";
      }
    },

    getDistanceForStage(stageId) {
      const idx = Math.max(0, STAGE_ORDER.indexOf(stageId));
      return (idx * STAGE_SPAN_METERS) / METERS_PER_PX;
    },

    async selectStartLevel(stageId) {
      if (!STAGE_ORDER.includes(stageId)) return;
      this.startMode = stageId;
      this.phase = "playing";
      this.paused = false;
      this.overlay?.classList.add("hidden");
      this.distance = this.getDistanceForStage(stageId);
      await this.switchPlayfield(stageId, true);
    },

    triggerJump() {
      this.yeti.jumpBufferTimer = 0.18;
    },

    bindEvents() {
      this.onWindowResize = () => this.resize(false);
      window.addEventListener("resize", this.onWindowResize);

      if (typeof ResizeObserver !== "undefined" && this.canvasWrapper) {
        this.resizeObserver = new ResizeObserver(() => this.resize(false));
        this.resizeObserver.observe(this.canvasWrapper);
      }

      if (this.ctx?.controls?.onJump) {
        this._unsubCtxJump = this.ctx.controls.onJump(() => {
          if (this.phase === "playing" && !this.paused) this.triggerJump();
        });
      }

      if (window.GLOBAL_MOBILE_CONTROLS?.onJump) {
        this._unsubGlobalJump = window.GLOBAL_MOBILE_CONTROLS.onJump(() => {
          if (this.phase === "playing" && !this.paused) this.triggerJump();
        });
      }

      this.onKeyDown = (e) => {
        if (this.phase !== "playing" || this.paused) return;
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") {
          e.preventDefault();
          this.localInput.left = true;
        } else if (k === "arrowright" || k === "d") {
          e.preventDefault();
          this.localInput.right = true;
        } else if (k === " " || k === "arrowup" || k === "w") {
          e.preventDefault();
          this.localInput.up = true;
          this.triggerJump();
        } else if (k === "arrowdown" || k === "s" || k === "c" || k === "shift") {
          e.preventDefault();
          this.localInput.down = true;
          this.localInput.crouch = true;
        }
      };

      this.onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") this.localInput.left = false;
        else if (k === "arrowright" || k === "d") this.localInput.right = false;
        else if (k === " " || k === "arrowup" || k === "w") this.localInput.up = false;
        else if (k === "arrowdown" || k === "s" || k === "c" || k === "shift") {
          this.localInput.down = false;
          this.localInput.crouch = false;
        }
      };

      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);

      this.padHandlers = [];
      this.touchPad.querySelectorAll("[data-pad]").forEach((btn) => {
        const action = btn.getAttribute("data-pad");
        const downFn = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (this.phase !== "playing" || this.paused) return;
          if (action === "left") this.localInput.left = true;
          else if (action === "right") this.localInput.right = true;
          else if (action === "crouch") this.localInput.crouch = true;
          else if (action === "jump") this.triggerJump();
        };
        const upFn = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (action === "left") this.localInput.left = false;
          else if (action === "right") this.localInput.right = false;
          else if (action === "crouch") this.localInput.crouch = false;
        };
        btn.addEventListener("pointerdown", downFn);
        btn.addEventListener("pointerup", upFn);
        btn.addEventListener("pointercancel", upFn);
        btn.addEventListener("pointerleave", upFn);
        this.padHandlers.push({ btn, downFn, upFn });
      });

      this.swipeStart = null;
      this.onCanvasPointerDown = (e) => {
        if (this.phase !== "playing" || this.paused) return;
        this.swipeStart = { x: e.clientX, y: e.clientY };
      };
      this.onCanvasPointerMove = (e) => {
        if (!this.swipeStart || this.phase !== "playing" || this.paused) return;
        const dy = e.clientY - this.swipeStart.y;
        const dx = e.clientX - this.swipeStart.x;
        if (dy > 26 && Math.abs(dy) > Math.abs(dx)) {
          this.localInput.crouch = true;
        }
      };
      this.onCanvasPointerUp = (e) => {
        if (!this.swipeStart) return;
        const dy = e.clientY - this.swipeStart.y;
        const dx = e.clientX - this.swipeStart.x;
        if ((dy < -24 && Math.abs(dy) > Math.abs(dx)) || (Math.abs(dx) < 16 && Math.abs(dy) < 16)) {
          this.triggerJump();
        }
        this.localInput.crouch = false;
        this.swipeStart = null;
      };

      this.canvas.addEventListener("pointerdown", this.onCanvasPointerDown);
      this.canvas.addEventListener("pointermove", this.onCanvasPointerMove);
      this.canvas.addEventListener("pointerup", this.onCanvasPointerUp);
      this.canvas.addEventListener("pointercancel", this.onCanvasPointerUp);
    },

    async switchPlayfield(newMode, force = false) {
      if (!force && this.mode === newMode) return;
      this._switchingStage = true;
      this.mode = newMode;
      await this.ensureLevelLoaded(newMode);
      this.resize(true);

      this.floes = [];
      this.obstacles = [];
      this.treasuresList = [];
      this.ramps = [];
      this.cracks = [];
      this.funnels = [];
      this.floeSpawnTimer = 0.2;
      this.spawnTimer = 1.8;
      this.treasureSpawnTimer = 1.25;

      this.getCurrentLevel()?.enter?.(this);
      this._switchingStage = false;
      this.playSfx("playScore");
      this.updateHud();
    },

    async resetState() {
      const chosenMode = this.startMode || "ice_river";
      await this.ensureLevelLoaded(chosenMode);

      this.score = 0;
      this.treasures = 0;
      this.lives = this.maxLives;
      this.lastLifeMilestone = Math.floor((this.getDistanceForStage(chosenMode) * METERS_PER_PX) / STAGE_SPAN_METERS);
      this.invulnTimer = 0;
      this.distance = this.getDistanceForStage(chosenMode);
      this.scrollSpeed = 145;
      this.mode = chosenMode;
      this.phase = "playing";
      this.paused = false;
      this.overlay.classList.add("hidden");
      this.resize(true);

      this.floes = [];
      this.obstacles = [];
      this.treasuresList = [];
      this.ramps = [];
      this.cracks = [];
      this.funnels = [];
      this.particles = [];
      this.floatingTexts = [];
      this.floeSpawnTimer = 0.2;
      this.spawnTimer = 1.8;
      this.treasureSpawnTimer = 1.25;

      const y = this.yeti;
      y.h = y.normalH;
      y.vx = 0;
      y.vy = 0;
      y.onFloe = null;
      y.crouching = false;
      y.coyoteTimer = 0.14;
      y.jumpBufferTimer = 0;
      y.dropThroughTimer = 0;

      this.getCurrentLevel()?.enter?.(this);
      this.updateHud();
    },

    playSfx(name) {
      try {
        this.ctx?.sound?.[name]?.();
      } catch {
        // Ignorieren
      }
    },

    updateHud() {
      this.syncLevelButtons();
      if (!this.hudStats) return;
      const meters = Math.floor(this.distance * METERS_PER_PX);
      const stageMeters = meters % STAGE_SPAN_METERS;
      const zoneLabel =
        this.mode === "ice_river"
          ? `EISFLUSS ${stageMeters}/500m`
          : this.mode === "sled_run"
            ? `SCHLITTEN ${stageMeters}/500m`
            : this.mode === "snowball_run"
              ? `SCHNEEBALL ${stageMeters}/500m`
              : this.mode === "ice_cave"
                ? `EISHÖHLE ${stageMeters}/500m`
                : `BOSSKAMPF ${stageMeters}/500m`;
      this.hudStats.innerHTML = `
        <span class="text-cyan-300">PUNKTE ${this.score}</span>
        <span class="text-amber-300">KRISTALLE ${this.treasures}</span>
        <span class="text-sky-200 font-bold">${meters}m • ${zoneLabel}</span>
        <span class="text-rose-300">LEBEN ${"🧊".repeat(Math.max(0, this.lives)) || "0"}/${this.maxLives}</span>
        <span class="text-emerald-300">BEST ${this.bestScore}</span>
      `;
    },

    resize(force = false) {
      if (!this.root || !this.canvas || !this.canvasCtx || !this.canvasWrapper) return;
      const wrapRect = this.canvasWrapper.getBoundingClientRect();
      const availW = Math.max(260, wrapRect.width - 4);
      const availH = Math.max(220, wrapRect.height - 4);

      const level = this.getCurrentLevel();
      const aspect = level?.aspect || 1.78;
      let w = availW;
      let h = w / aspect;
      if (h > availH) {
        h = availH;
        w = h * aspect;
      }

      const targetW = Math.floor(w);
      const targetH = Math.floor(h);
      if (!force && Math.abs(targetW - this._lastCanvasW) <= 1 && Math.abs(targetH - this._lastCanvasH) <= 1) {
        return;
      }
      this._lastCanvasW = targetW;
      this._lastCanvasH = targetH;

      const prevRiverY = this.field.riverY || targetH * 0.78;
      const dpr = window.getOptimalDPR ? window.getOptimalDPR() : Math.min(window.devicePixelRatio || 1, 1.25);

      this.canvas.style.width = `${targetW}px`;
      this.canvas.style.height = `${targetH}px`;
      this.canvas.width = Math.floor(targetW * dpr);
      this.canvas.height = Math.floor(targetH * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const riverY = Math.round(targetH * 0.78);
      this.field = { x: 0, y: 0, w: targetW, h: targetH, riverY };

      const deltaY = riverY - prevRiverY;
      if (!level?.vertical) {
        this.yeti.y += deltaY;
      }
      for (const fl of this.floes) {
        fl.y += deltaY;
        fl.baseY += deltaY;
      }
      for (const o of this.obstacles) {
        o.y += deltaY;
        o.baseY += deltaY;
      }
      for (const t of this.treasuresList) {
        t.y += deltaY;
        t.baseY += deltaY;
      }
      for (const r of this.ramps) {
        if (!level?.vertical) r.y = riverY;
      }
      for (const c of this.cracks) {
        if (!level?.vertical) c.y = riverY;
      }
    },

    spawnTreasure(xPos = null, yPos = null) {
      const w = this.field.w;
      const riverY = this.field.riverY;
      const isVertical = Boolean(this.getCurrentLevel()?.vertical);
      const kinds = [
        { pts: 50, color: "#67e8f9", label: "+50" },
        { pts: 100, color: "#facc15", label: "+100" },
        { pts: 250, color: "#c084fc", label: "+250" }
      ];
      const spec = kinds[Math.floor(Math.random() * kinds.length)];
      const x = xPos ?? (isVertical ? w * (0.28 + Math.random() * 0.44) : w + 30);
      const baseY = yPos ?? (isVertical ? -24 : riverY - (56 + Math.random() * 80));

      this.treasuresList.push({
        x,
        y: baseY,
        baseY,
        r: 11,
        phase: Math.random() * Math.PI * 2,
        collected: false,
        ...spec
      });
    },

    addFloatingText(x, y, text, color = "#67e8f9") {
      this.floatingTexts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
    },

    spawnParticles(x, y, color, count = 10) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 120;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 25,
          life: 0.35 + Math.random() * 0.2,
          maxLife: 0.55,
          color,
          size: 2.5 + Math.random() * 2.5
        });
      }
    },

    damagePanda(reasonX, reasonY, customLabel = "-1 LEBEN") {
      if (this.invulnTimer > 0) return;
      this.lives -= 1;
      this.invulnTimer = 1.35;
      this.playSfx("playLose");
      this.spawnParticles(reasonX ?? this.yeti.x + this.yeti.w / 2, reasonY ?? this.yeti.y + 10, "#38bdf8", 16);
      this.addFloatingText(this.yeti.x + 12, this.yeti.y - 8, customLabel, "#fb7185");
      this.updateHud();

      if (this.lives <= 0) {
        this.phase = "gameover";
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          try {
            this.ctx?.storage?.set("best_score", this.bestScore);
          } catch {
            // Ignorieren
          }
        }
        this.showGameOver();
      }
    },

    showGameOver() {
      if (!this.overlay) return;
      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-xs rounded-2xl border border-cyan-300/40 bg-slate-900/95 p-5 text-center shadow-[0_0_35px_rgba(34,211,238,0.22)]">
          <h3 class="font-orbitron text-lg font-black text-cyan-300 mb-1">EISABENTEUER BEENDET</h3>
          <p class="text-xs text-slate-300 mb-1">Punkte: <strong class="text-cyan-300">${this.score}</strong> • Kristalle: <strong class="text-amber-300">${this.treasures}</strong></p>
          <p class="text-[11px] text-slate-400 mb-4">Distanz: ${Math.floor(this.distance * METERS_PER_PX)}m • Rekord: <strong class="text-emerald-300">${this.bestScore}</strong></p>
          <button type="button" data-action="restart" class="w-full py-2.5 rounded-xl font-orbitron font-bold uppercase tracking-wider text-xs bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition">
            Nochmal starten
          </button>
        </div>
      `;
      this.overlay.querySelector('[data-action="restart"]')?.addEventListener("click", () => {
        this.resetState();
        this.ctx?.restartGame?.();
      });
    },

    update(dt) {
      this.animClock += dt;
      this.syncInputs();

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 240 * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 34 * dt;
        ft.life -= dt;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }

      if (this.phase !== "playing" || this.paused || !this.levelReady || this._switchingStage) return;
      if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);

      const level = this.getCurrentLevel();
      const isVertical = Boolean(level?.vertical);
      const y = this.yeti;

      this.scrollSpeed = Math.min(235, 145 + this.distance * METERS_PER_PX * 0.08);
      const worldDx = this.scrollSpeed * dt;
      this.distance += worldDx;

      const currentMeters = Math.floor(this.distance * METERS_PER_PX);
      const milestone = Math.floor(currentMeters / STAGE_SPAN_METERS);
      if (milestone > this.lastLifeMilestone && milestone >= 1) {
        this.lastLifeMilestone = milestone;
        if (this.lives < this.maxLives) {
          this.lives += 1;
          this.addFloatingText(y.x + 16, y.y - 26, "+1 LEBEN!", "#4ade80");
        } else {
          this.score += 250;
          this.addFloatingText(y.x + 16, y.y - 26, "+250 BONUS!", "#facc15");
        }
        this.playSfx("playScore");
        this.updateHud();
      }

      const targetMode = this.getStageFromMeters(currentMeters);
      if (targetMode !== this.mode) {
        this.switchPlayfield(targetMode);
        return;
      }

      level?.update?.(this, dt, worldDx);
      if (this.phase !== "playing") return;

      this.treasureSpawnTimer -= dt;
      if (this.treasureSpawnTimer <= 0) {
        this.spawnTreasure();
        this.treasureSpawnTimer = isVertical ? 1.65 + Math.random() * 0.95 : 1.25 + Math.random() * 0.9;
      }

      for (let i = this.treasuresList.length - 1; i >= 0; i--) {
        const t = this.treasuresList[i];
        if (!isVertical) t.x -= worldDx;
        t.phase += dt * 4.2;
        t.y = t.baseY + Math.sin(t.phase) * 4;

        if (!t.collected) {
          if (Math.hypot(y.x + y.w * 0.5 - t.x, y.y + y.h * 0.5 - t.y) < t.r + Math.min(y.w, y.h) * 0.58) {
            t.collected = true;
            this.treasures += 1;
            this.score += t.pts;
            this.playSfx("playScore");
            this.spawnParticles(t.x, t.y, t.color, 10);
            this.addFloatingText(t.x, t.y - 8, t.label, t.color);
            this.updateHud();
            this.treasuresList.splice(i, 1);
            continue;
          }
        }
        if (t.x < -30 || t.y > this.field.h + 50) {
          this.treasuresList.splice(i, 1);
        }
      }

      const hitBox = { x: y.x + 6, y: y.y + 4, w: y.w - 12, h: y.h - 6 };
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const o = this.obstacles[i];
        if (!isVertical) o.x += (o.vx - this.scrollSpeed) * dt;
        o.phase += dt * 3.6;
        o.y = o.baseY + Math.sin(o.phase) * (isVertical ? 0 : 3);

        if (!o.hit) {
          const collides =
            hitBox.x < o.x + o.w - 4 &&
            hitBox.x + hitBox.w > o.x + 4 &&
            hitBox.y < o.y + o.h - 3 &&
            hitBox.y + hitBox.h > o.y + 3;
          if (collides) {
            o.hit = true;
            const label = o.kind === "boulder" ? "FELSBROCKEN!" : "EISBROCKEN!";
            this.damagePanda(o.x + o.w * 0.5, o.y + o.h * 0.5, label);
            if (this.phase !== "playing") return;
          }
        }
        if (o.x + o.w < -60 || o.y > this.field.h + 70) {
          this.obstacles.splice(i, 1);
        }
      }

      if (Math.floor(this.distance) % 18 < Math.ceil(worldDx)) {
        this.score += 1;
        this.updateHud();
      }
    },

    drawTreasures(ctx) {
      for (const t of this.treasuresList) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.fillStyle = t.color || "#67e8f9";
        ctx.strokeStyle = "#083344";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },

    drawObstacles(ctx) {
      for (const o of this.obstacles) {
        if (o.kind === "boulder") continue;
        ctx.save();
        ctx.translate(o.x + o.w * 0.5, o.y + o.h * 0.5);
        ctx.fillStyle = "#38bdf8";
        ctx.strokeStyle = "#0c4a6e";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-o.w * 0.45, o.h * 0.45);
        ctx.lineTo(-o.w * 0.15, -o.h * 0.5);
        ctx.lineTo(o.w * 0.18, -o.h * 0.22);
        ctx.lineTo(o.w * 0.46, o.h * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },

    drawYeti(ctx) {
      const y = this.yeti;
      if (this.invulnTimer > 0 && Math.floor(this.animClock * 18) % 2 === 0) return;

      ctx.save();
      const cx = y.x + y.w * 0.5;
      const isDuck = Boolean(y.crouching);
      const headY = isDuck ? y.y + 11 : y.y + 12;
      const bodyY = isDuck ? y.y + 22 : y.y + 28;
      const swing = Math.sin(y.runCycle) * (y.onFloe ? 4.5 : 2.5);
      const tailWag = Math.sin(this.animClock * 5.5) * 6;

      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 10, bodyY + 4);
      ctx.quadraticCurveTo(cx - 21, bodyY - 1 + tailWag * 0.5, cx - 24, bodyY - 7 + tailWag);
      ctx.stroke();

      ctx.fillStyle = "#60a5fa";
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx - 25, bodyY - 8 + tailWag, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const legY = isDuck ? y.y + y.h - 5 : y.y + y.h - 7;
      const footY = isDuck ? y.y + y.h - 2.5 : y.y + y.h - 3;

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(cx - 9.5 - swing * 0.5, legY - 5, 6.5, 6.5, 3);
      ctx.roundRect(cx + 3 + swing * 0.5, legY - 5, 6.5, 6.5, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx - 6.5 - swing * 0.6, footY, 5.5, 3.6, -0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 6.5 + swing * 0.6, footY, 5.5, 3.6, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, bodyY, isDuck ? 14.5 : 13, isDuck ? 8.5 : 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      for (let a = -2.4; a <= 2.4; a += 0.6) {
        const tx = cx + Math.cos(a) * 12.5;
        const ty = bodyY + Math.sin(a) * 10.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(a) * 2.5, ty + Math.sin(a) * 2.5);
        ctx.stroke();
      }

      const leftHandX = cx - 13.5;
      const leftHandY = bodyY + 2 + swing * 0.5;
      const rightHandX = cx + 13.5;
      const rightHandY = bodyY + 2 - swing * 0.5;

      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 9.5, bodyY - 4);
      ctx.lineTo(leftHandX, leftHandY);
      ctx.moveTo(cx + 9.5, bodyY - 4);
      ctx.lineTo(rightHandX, rightHandY);
      ctx.stroke();

      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(leftHandX, leftHandY, 4.3, 0, Math.PI * 2);
      ctx.arc(rightHandX, rightHandY, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#60a5fa";
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(cx - 9.5, headY - 16.5, 5.2, 6.5, 2.5);
      ctx.roundRect(cx + 4.3, headY - 16.5, 5.2, 6.5, 2.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.ellipse(cx - 13.5, headY + 1, 3.2, 4.5, -0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 13.5, headY + 1, 3.2, 4.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, headY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx + 0.5, headY + 1, 9.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (const ex of [cx - 3.4, cx + 4.2]) {
        const ey = headY - 2.2;
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(ex, ey, 3.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - 1.1, ey - 1.2, 1.1, 0, Math.PI * 2);
        ctx.arc(ex + 1.1, ey + 0.9, 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#be185d";
      ctx.strokeStyle = "#831843";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(cx + 0.8, headY + 2.4, 3.1, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx + 0.6, headY + 3.8, 5.2, 0.25 * Math.PI, 0.78 * Math.PI);
      ctx.stroke();

      ctx.restore();
    },

    draw() {
      if (!this.canvasCtx) return;
      const ctx = this.canvasCtx;
      const w = this.field.w;
      const h = this.field.h;

      ctx.clearRect(0, 0, w, h);
      this.getCurrentLevel()?.draw?.(this, ctx, w, h);
      this.drawObstacles(ctx);
      this.drawTreasures(ctx);
      if (this.mode !== "ice_cave") {
        this.drawYeti(ctx);
      }

      for (const pt of this.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.font = "900 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      for (const ft of this.floatingTexts) {
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;
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
      if (this.phase !== "playing") this.resetState();
      this.resize(true);
      if (!this.rafId) this.rafId = requestAnimationFrame((t) => this.loop(t));
    },

    pause() {
      this.paused = true;
      this.localInput = { left: false, right: false, up: false, down: false, crouch: false };
      this.input = { left: false, right: false, up: false, down: false, crouch: false };
    },

    resume() {
      this.paused = false;
      this.lastTime = performance.now();
      this.resize(true);
    },

    destroy() {
      this.paused = true;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.onWindowResize) window.removeEventListener("resize", this.onWindowResize);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this._unsubCtxJump) this._unsubCtxJump();
      if (this._unsubGlobalJump) this._unsubGlobalJump();
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      if (Array.isArray(this.padHandlers)) {
        for (const { btn, downFn, upFn } of this.padHandlers) {
          btn.removeEventListener("pointerdown", downFn);
          btn.removeEventListener("pointerup", upFn);
          btn.removeEventListener("pointercancel", upFn);
          btn.removeEventListener("pointerleave", upFn);
        }
      }
      this.canvas?.removeEventListener("pointerdown", this.onCanvasPointerDown);
      this.canvas?.removeEventListener("pointermove", this.onCanvasPointerMove);
      this.canvas?.removeEventListener("pointerup", this.onCanvasPointerUp);
      this.canvas?.removeEventListener("pointercancel", this.onCanvasPointerUp);
      if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
      this.root = null;
      this.canvas = null;
      this.canvasCtx = null;
      this.ctx = null;
    }
  });
})();