(() => {
  "use strict";

  const STAGE_SPAN_METERS = 500;
  const METERS_PER_PX = 1 / 18;
  const STAGE_ORDER = ["jungle", "water", "balloon", "tree"];
  const LEVEL_CHOICES = [
    { id: "jungle", label: "🌿 Dschungel" },
    { id: "water", label: "🌊 Wasser" },
    { id: "balloon", label: "✈️ Flug" },
    { id: "tree", label: "🌲 Baum" }
  ];

  window.GAME_REGISTRY?.register({
    id: "pandapitfall",
    name: "Panda Pitfall",
    subtitle: "Dschungel • Unterwasser • Flug • Hochformat-Riesenbaum",
    tag: "Dschungel Adventure",
    icon: "🐼",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.animClock = 0;
      this.paused = false;
      this.phase = "playing";

      this.score = 0;
      this.treasures = 0;
      this.bestScore = ctx.storage.get("best_score", 0);
      this.maxLives = 3;
      this.lives = 3;
      this.lastLifeMilestone = 0;
      this.invulnTimer = 0;
      this.distance = 0;
      this.climbHeight = 0;
      this.scrollSpeed = 160;

      this.startMode = "jungle";
      this.mode = "jungle";
      this.air = 100;
      this.maxAir = 100;
      this.balloonColor = "#fb7185";

      this.field = { x: 0, y: 0, w: 640, h: 360, groundY: 295, surfaceY: 64 };
      this._lastCanvasW = 0;
      this._lastCanvasH = 0;

      this.panda = {
        x: 110,
        y: 250,
        w: 34,
        h: 40,
        normalH: 40,
        crouchH: 22,
        vx: 0,
        vy: 0,
        onGround: true,
        onPlatform: null,
        crouching: false,
        climbing: false,
        activeVine: null,
        vineGraceTimer: 0,
        vineRegrabCooldown: 0,
        dropThroughTimer: 0,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        runCycle: 0
      };

      this.input = { left: false, right: false, up: false, down: false, crouch: false };
      this._prevJumpHeld = false;

      this.platforms = [];
      this.obstacles = [];
      this.vines = [];
      this.treasuresList = [];
      this.bubbles = [];
      this.particles = [];
      this.floatingTexts = [];

      this.spawnTimer = 1.45;
      this.platformSpawnTimer = 1.4;
      this.vineSpawnTimer = 2.0;
      this.treasureSpawnTimer = 1.05;
      this.bubbleTimer = 0.25;

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex flex-col items-center justify-between p-1.5 bg-[#040f09] overflow-hidden select-none";

      this.hud = document.createElement("div");
      this.hud.className = "w-full max-w-[920px] min-h-[28px] shrink-0 flex items-center justify-between gap-2 px-2 font-orbitron text-[10px] sm:text-[11px] overflow-x-auto no-scrollbar";

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
        btn.className = "px-2 py-0.5 rounded-lg border font-orbitron text-[10px] whitespace-nowrap transition cursor-pointer";
        btn.addEventListener("click", () => {
          this.selectStartLevel(item.id);
        });
        this.levelBar.appendChild(btn);
        this.levelButtons.set(item.id, btn);
      }

      this.hud.appendChild(this.hudStats);
      this.hud.appendChild(this.levelBar);

      this.canvasWrapper = document.createElement("div");
      this.canvasWrapper.className = "relative flex-1 w-full max-w-[920px] flex items-center justify-center min-h-0 overflow-hidden";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-2xl border border-emerald-400/35 bg-[#071a11] touch-none";
      this.canvasCtx = this.canvas.getContext("2d", { alpha: false });

      this.touchPad = document.createElement("div");
      this.touchPad.className = "pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2 sm:hidden";
      this.touchPad.innerHTML = `
        <div class="pointer-events-auto flex items-center gap-4">
          <button type="button" data-pad="left" class="w-12 h-12 rounded-2xl border border-emerald-300/35 bg-slate-950/75 text-emerald-200 font-bold text-lg active:scale-95 active:bg-emerald-500/30">◀</button>
          <button type="button" data-pad="right" class="w-12 h-12 rounded-2xl border border-emerald-300/35 bg-slate-950/75 text-emerald-200 font-bold text-lg active:scale-95 active:bg-emerald-500/30">▶</button>
          <button type="button" data-pad="crouch" class="px-3 h-12 rounded-2xl border border-amber-300/40 bg-amber-950/75 text-amber-200 font-orbitron text-[10px] font-bold uppercase active:scale-95 active:bg-amber-500/30">Ducken</button>
        </div>
        <div class="pointer-events-auto flex items-center gap-2">
          <button type="button" data-pad="down" class="w-11 h-12 rounded-2xl border border-lime-300/35 bg-slate-950/75 text-lime-200 font-bold text-sm active:scale-95 active:bg-lime-500/30">▼</button>
          <button type="button" data-pad="jump" class="px-4 h-12 rounded-2xl border border-emerald-300/50 bg-emerald-400 text-slate-950 font-orbitron text-[11px] font-black uppercase tracking-wider shadow-lg active:scale-95">Springen</button>
        </div>
      `;

      this.overlay = document.createElement("div");
      this.overlay.className = "hidden absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 p-4";

      this.canvasWrapper.appendChild(this.canvas);
      this.canvasWrapper.appendChild(this.touchPad);
      this.root.appendChild(this.hud);
      this.root.appendChild(this.canvasWrapper);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.bindEvents();
      this.syncGlobalPadVisibility();
      this.resize(true);
      this.resetState();
    },

    syncGlobalPadVisibility() {
      if (!this.touchPad) return;
      const hasGlobalPad = Boolean(
        document.getElementById("global-mini-controls") || window.GLOBAL_MOBILE_CONTROLS
      );
      this.touchPad.classList.toggle("hidden", hasGlobalPad);
    },

    syncGlobalInputs() {
      this.syncGlobalPadVisibility();
      const gHeld = window.GLOBAL_MOBILE_CONTROLS?.held || this.ctx?.controls?.held;
      if (!gHeld) return;

      this.input.left = Boolean(this.input.left || gHeld.left);
      this.input.right = Boolean(this.input.right || gHeld.right);
      this.input.down = Boolean(this.input.down || gHeld.down || gHeld.crouch);
      this.input.crouch = Boolean(this.input.crouch || gHeld.down || gHeld.crouch);

      if (gHeld.up || gHeld.jump) {
        if (this.mode === "balloon") {
          this.panda.vy = -225;
        } else if (gHeld.jump && !this._prevJumpHeld) {
          this.triggerJumpOrSwing();
        } else if (gHeld.up && (this.mode === "jungle" || this.mode === "tree")) {
          this.tryClimbOnly();
        }
      }
      this._prevJumpHeld = Boolean(gHeld.jump);
    },

    getCurrentLevel() {
      return window.PANDA_PITFALL_LEVELS?.get(this.mode) || window.PANDA_PITFALL_LEVELS?.get("jungle") || null;
    },

    syncLevelButtons() {
      if (!this.levelButtons) return;
      for (const [id, btn] of this.levelButtons.entries()) {
        const active = this.mode === id;
        btn.className = active
          ? "px-2 py-0.5 rounded-lg border border-emerald-300 bg-emerald-400 text-slate-950 font-orbitron text-[10px] font-bold whitespace-nowrap transition cursor-pointer"
          : "px-2 py-0.5 rounded-lg border border-emerald-400/30 bg-slate-900/80 text-emerald-200/85 font-orbitron text-[10px] whitespace-nowrap hover:bg-emerald-500/20 transition cursor-pointer";
      }
    },

    getDistanceForStage(stageId) {
      const idx = Math.max(0, STAGE_ORDER.indexOf(stageId));
      return (idx * STAGE_SPAN_METERS) / METERS_PER_PX;
    },

    selectStartLevel(stageId) {
      if (!STAGE_ORDER.includes(stageId)) return;
      this.startMode = stageId;
      this.phase = "playing";
      this.paused = false;
      this.overlay?.classList.add("hidden");
      this.distance = this.getDistanceForStage(stageId);
      this.climbHeight = 0;
      this.air = this.maxAir;
      this.switchPlayfield(stageId, true);
    },

    triggerJumpOrSwing() {
      if (this.mode === "jungle" || this.mode === "tree") {
        this.panda.jumpBufferTimer = 0.18;
      } else if (this.mode === "water") {
        this.panda.vy = -205;
      } else if (this.mode === "balloon") {
        this.panda.vy = -225;
      }
    },

    bindEvents() {
      this.onWindowResize = () => this.resize(false);
      window.addEventListener("resize", this.onWindowResize);

      if (typeof ResizeObserver !== "undefined" && this.canvasWrapper) {
        this.resizeObserver = new ResizeObserver(() => this.resize(false));
        this.resizeObserver.observe(this.canvasWrapper);
      }

      this.onKeyDown = (e) => {
        if (this.phase !== "playing" || this.paused) return;
        const k = e.key.toLowerCase();
        if (k === "t") {
          e.preventDefault();
          this.selectStartLevel("tree");
          return;
        }
        if (k === "arrowleft" || k === "a") {
          e.preventDefault();
          this.input.left = true;
        } else if (k === "arrowright" || k === "d") {
          e.preventDefault();
          this.input.right = true;
        } else if (k === "arrowup" || k === "w") {
          e.preventDefault();
          this.input.up = true;
          if (this.mode === "jungle" || this.mode === "tree") this.tryClimbOnly();
          else this.panda.vy = -200;
        } else if (k === " ") {
          e.preventDefault();
          this.triggerJumpOrSwing();
        } else if (k === "arrowdown" || k === "s") {
          e.preventDefault();
          this.input.down = true;
          this.input.crouch = true;
          if ((this.mode === "jungle" || this.mode === "tree") && this.panda.onPlatform && !this.panda.climbing) {
            this.panda.dropThroughTimer = 0.22;
            this.panda.onPlatform = null;
            this.panda.onGround = false;
          } else if (this.mode !== "jungle" && this.mode !== "tree") {
            this.panda.vy = 185;
          }
        } else if (k === "c" || k === "shift") {
          this.input.crouch = true;
        }
      };

      this.onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") this.input.left = false;
        else if (k === "arrowright" || k === "d") this.input.right = false;
        else if (k === "arrowup" || k === "w") this.input.up = false;
        else if (k === "arrowdown" || k === "s") {
          this.input.down = false;
          this.input.crouch = false;
        } else if (k === "c" || k === "shift") {
          this.input.crouch = false;
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
          if (action === "left") this.input.left = true;
          else if (action === "right") this.input.right = true;
          else if (action === "down") {
            this.input.down = true;
            this.input.crouch = true;
            if ((this.mode === "jungle" || this.mode === "tree") && this.panda.onPlatform && !this.panda.climbing) {
              this.panda.dropThroughTimer = 0.22;
              this.panda.onPlatform = null;
              this.panda.onGround = false;
            } else if (this.mode !== "jungle" && this.mode !== "tree") {
              this.panda.vy = 185;
            }
          } else if (action === "crouch") this.input.crouch = true;
          else if (action === "jump") this.triggerJumpOrSwing();
        };
        const upFn = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (action === "left") this.input.left = false;
          else if (action === "right") this.input.right = false;
          else if (action === "down") {
            this.input.down = false;
            this.input.crouch = false;
          } else if (action === "crouch") this.input.crouch = false;
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
          this.input.crouch = true;
          if ((this.mode === "jungle" || this.mode === "tree") && this.panda.onPlatform && !this.panda.climbing) {
            this.panda.dropThroughTimer = 0.22;
            this.panda.onPlatform = null;
            this.panda.onGround = false;
          } else if (this.mode !== "jungle" && this.mode !== "tree") {
            this.panda.vy = 175;
          }
        }
      };
      this.onCanvasPointerUp = (e) => {
        if (!this.swipeStart) return;
        const dy = e.clientY - this.swipeStart.y;
        const dx = e.clientX - this.swipeStart.x;
        if ((dy < -24 && Math.abs(dy) > Math.abs(dx)) || (Math.abs(dx) < 16 && Math.abs(dy) < 16)) {
          this.triggerJumpOrSwing();
        }
        this.input.crouch = false;
        this.swipeStart = null;
      };

      this.canvas.addEventListener("pointerdown", this.onCanvasPointerDown);
      this.canvas.addEventListener("pointermove", this.onCanvasPointerMove);
      this.canvas.addEventListener("pointerup", this.onCanvasPointerUp);
      this.canvas.addEventListener("pointercancel", this.onCanvasPointerUp);
    },

    getVineSwingVelocityX(v, yPos) {
      const length = Math.max(20, (v.botY ?? 260) - (v.topY ?? 0));
      const t = Math.max(0, Math.min(1, (yPos - (v.topY ?? 0)) / length));
      const amp = v.swingAmp ?? 24;
      const speed = v.swaySpeed ?? 3.1;
      return Math.cos(v.swayPhase ?? 0) * speed * amp * (t * t * 0.8 + t * 0.2);
    },

    getVineSwingOffset(v, yPos) {
      const length = Math.max(20, (v.botY ?? 260) - (v.topY ?? 0));
      const t = Math.max(0, Math.min(1, (yPos - (v.topY ?? 0)) / length));
      const amp = v.swingAmp ?? 24;
      return Math.sin(v.swayPhase ?? 0) * amp * (t * t * 0.8 + t * 0.2);
    },

    getVinePointAtY(v, yPos) {
      return { x: v.x + this.getVineSwingOffset(v, yPos), y: yPos };
    },

    tryClimbOnly() {
      if (this.mode !== "jungle" && this.mode !== "tree") return;
      if (this.panda.vineRegrabCooldown > 0) return;
      const vine = this.findOverlappingVine();
      if (vine && !this.panda.climbing) {
        this.panda.climbing = true;
        this.panda.activeVine = vine;
        this.panda.vineGraceTimer = 0.16;
        this.panda.vy = 0;
        this.panda.onGround = false;
        this.panda.onPlatform = null;
        this.panda.crouching = false;
      }
    },

    findOverlappingVine(excludeVine = null) {
      const p = this.panda;
      const pyTop = p.y;
      const pyBot = p.y + p.h;
      const pMidY = (pyTop + pyBot) * 0.5;
      const px = p.x + p.w * 0.5;
      for (const v of this.vines) {
        if (excludeVine && v === excludeVine) continue;
        const sampleY = Math.max(v.topY, Math.min(v.botY, pMidY));
        const vxAtSample = v.x + this.getVineSwingOffset(v, sampleY);
        if (Math.abs(px - vxAtSample) <= 34 && pyBot >= v.topY - 6 && pyTop <= v.botY + 8) {
          return v;
        }
      }
      return null;
    },

    getStageFromMeters(meters) {
      return STAGE_ORDER[Math.floor(meters / STAGE_SPAN_METERS) % STAGE_ORDER.length];
    },

    checkLifeMilestone(meters) {
      const milestone = Math.floor(meters / STAGE_SPAN_METERS);
      if (milestone > this.lastLifeMilestone && milestone >= 1) {
        this.lastLifeMilestone = milestone;
        const p = this.panda;
        if (this.lives < this.maxLives) {
          this.lives += 1;
          this.playSfx("playScore");
          this.spawnParticles(p.x + p.w * 0.5, p.y - 6, "#4ade80", 14);
          this.addFloatingText(p.x + 16, p.y - 28, "+1 LEBEN!", "#4ade80");
        } else {
          this.score += 250;
          this.playSfx("playScore");
          this.spawnParticles(p.x + p.w * 0.5, p.y - 6, "#facc15", 12);
          this.addFloatingText(p.x + 16, p.y - 28, "+250 BONUS!", "#facc15");
        }
        this.updateHud();
      }
    },

    switchPlayfield(newMode, force = false) {
      if (!force && this.mode === newMode) return;
      this.mode = newMode;
      this.resize(true);

      const p = this.panda;
      p.climbing = false;
      p.activeVine = null;
      p.vineRegrabCooldown = 0;
      p.onPlatform = null;
      p.crouching = false;
      p.h = p.normalH;
      p.vx = 0;
      p.vy = 0;

      this.platforms = [];
      this.obstacles = [];
      this.vines = [];
      this.treasuresList = [];
      this.bubbles = [];
      this.spawnTimer = 1.45;
      this.platformSpawnTimer = 1.25;
      this.vineSpawnTimer = 1.7;
      this.treasureSpawnTimer = 0.95;

      this.getCurrentLevel()?.enter?.(this);
      this.playSfx("playScore");
      this.updateHud();
    },

    resetState() {
      const chosenMode = this.startMode || "jungle";
      this.score = 0;
      this.treasures = 0;
      this.lives = this.maxLives;
      this.lastLifeMilestone = Math.floor((this.getDistanceForStage(chosenMode) * METERS_PER_PX) / STAGE_SPAN_METERS);
      this.invulnTimer = 0;
      this.distance = this.getDistanceForStage(chosenMode);
      this.climbHeight = 0;
      this.scrollSpeed = 160;
      this.mode = chosenMode;
      this.air = this.maxAir;
      this.balloonColor = "#fb7185";
      this.phase = "playing";
      this.paused = false;
      this.overlay.classList.add("hidden");
      this.resize(true);

      this.platforms = [];
      this.obstacles = [];
      this.vines = [];
      this.treasuresList = [];
      this.bubbles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.spawnTimer = 1.45;
      this.platformSpawnTimer = 0.7;
      this.vineSpawnTimer = 1.7;
      this.treasureSpawnTimer = 0.95;
      this.bubbleTimer = 0.25;

      const p = this.panda;
      p.h = p.normalH;
      p.vx = 0;
      p.vy = 0;
      p.onPlatform = null;
      p.crouching = false;
      p.climbing = false;
      p.activeVine = null;
      p.vineGraceTimer = 0;
      p.vineRegrabCooldown = 0;
      p.dropThroughTimer = 0;
      p.coyoteTimer = 0.12;
      p.jumpBufferTimer = 0;

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
      const zoneLabel =
        this.mode === "jungle"
          ? "DSCHUNGEL"
          : this.mode === "water"
            ? `LUFT ${Math.ceil(this.air)}%`
            : this.mode === "balloon"
              ? "FLUG"
              : `BAUM ${Math.floor(this.climbHeight * METERS_PER_PX)}m`;
      const zoneColor =
        this.mode === "jungle"
          ? "text-lime-300"
          : this.mode === "water"
            ? this.air < 30
              ? "text-rose-400 font-bold"
              : "text-sky-300 font-bold"
            : this.mode === "balloon"
              ? "text-pink-300 font-bold"
              : "text-emerald-300 font-bold";

      this.hudStats.innerHTML = `
        <span class="text-emerald-300">PUNKTE ${this.score}</span>
        <span class="text-amber-300">SCHÄTZE ${this.treasures}</span>
        <span class="${zoneColor}">${meters}m • ${zoneLabel}</span>
        <span class="text-rose-300">LEBEN ${"🐼".repeat(Math.max(0, this.lives)) || "0"}/${this.maxLives}</span>
        <span class="text-cyan-300">BEST ${this.bestScore}</span>
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

      const prevGround = this.field.groundY || targetH * 0.84;
      const dpr = window.getOptimalDPR ? window.getOptimalDPR() : Math.min(window.devicePixelRatio || 1, 1.25);

      this.canvas.style.width = `${targetW}px`;
      this.canvas.style.height = `${targetH}px`;
      this.canvas.width = Math.floor(targetW * dpr);
      this.canvas.height = Math.floor(targetH * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const groundY = Math.round(targetH * 0.84);
      const surfaceY = Math.round(targetH * 0.22);
      this.field = { x: 0, y: 0, w: targetW, h: targetH, groundY, surfaceY };

      if (!level?.vertical) {
        const deltaGround = groundY - prevGround;
        this.panda.y += deltaGround;
        if (this.mode === "jungle" && this.panda.y > groundY - this.panda.h) {
          this.panda.y = groundY - this.panda.h;
        }
        for (const pl of this.platforms) pl.y += deltaGround;
        for (const o of this.obstacles) {
          o.y += deltaGround;
          if (o.kind === "branch") o.y = groundY - this.panda.normalH - o.h + 3;
        }
        for (const v of this.vines) {
          v.topY = 0;
          v.botY = groundY - 8;
        }
        for (const t of this.treasuresList) {
          t.baseY += deltaGround;
          t.y += deltaGround;
        }
      }
    },

    spawnTreasure(xPos = null, yPos = null, forceHigh = false) {
      const w = this.field.w;
      const groundY = this.field.groundY;
      const surfaceY = this.field.surfaceY;
      const kinds = [
        { type: "bamboo", pts: 50, color: "#4ade80", label: "+50" },
        { type: "coin", pts: 100, color: "#facc15", label: "+100" },
        { type: "ruby", pts: 250, color: "#f43f5e", label: "+250" }
      ];
      const spec = kinds[Math.floor(Math.random() * kinds.length)];
      const x = xPos ?? w + 30;

      let baseY = yPos;
      if (baseY === null || baseY === undefined) {
        if (this.mode === "jungle") {
          const high = forceHigh || Math.random() < 0.72;
          baseY = high ? groundY - (74 + Math.random() * 78) : groundY - 24;
        } else if (this.mode === "water") {
          baseY = surfaceY + 46 + Math.random() * Math.max(40, groundY - surfaceY - 78);
        } else if (this.mode === "tree") {
          baseY = -40 - Math.random() * 140;
        } else {
          baseY = 48 + Math.random() * Math.max(55, groundY - 125);
        }
      }

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

    addFloatingText(x, y, text, color = "#fde047") {
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
      if (this.mode === "water") this.air = Math.max(this.air, 55);
      this.playSfx("playLose");
      this.spawnParticles(reasonX ?? this.panda.x + this.panda.w / 2, reasonY ?? this.panda.y + 10, "#fb7185", 16);
      this.addFloatingText(this.panda.x + 12, this.panda.y - 8, customLabel, "#fb7185");
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
        <div class="w-full max-w-xs rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-5 text-center shadow-[0_0_35px_rgba(16,185,129,0.22)]">
          <h3 class="font-orbitron text-lg font-black text-amber-300 mb-1">ABENTEUER BEENDET</h3>
          <p class="text-xs text-slate-300 mb-1">Punkte: <strong class="text-emerald-300">${this.score}</strong> • Schätze: <strong class="text-amber-300">${this.treasures}</strong></p>
          <p class="text-[11px] text-slate-400 mb-4">Distanz: ${Math.floor(this.distance * METERS_PER_PX)}m • Rekord: <strong class="text-cyan-300">${this.bestScore}</strong></p>
          <button type="button" data-action="restart" class="w-full py-2.5 rounded-xl font-orbitron font-bold uppercase tracking-wider text-xs bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition">
            Nochmal laufen
          </button>
        </div>
      `;
      this.overlay.querySelector('[data-action="restart"]')?.addEventListener("click", () => {
        this.resetState();
        this.ctx?.restartGame?.();
      });
    },

    getMountainPeakYAt(worldX) {
      const groundY = this.field.groundY;
      const waveA = Math.abs(Math.sin(worldX * 0.0085 + 0.4)) * 46;
      const waveB = Math.abs(Math.sin(worldX * 0.017 + 1.8)) * 22;
      return groundY - 26 - waveA - waveB;
    },

    update(dt) {
      this.animClock += dt;
      this.syncGlobalInputs();

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

      if (this.phase !== "playing" || this.paused) return;
      if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);

      const level = this.getCurrentLevel();
      const isVertical = Boolean(level?.vertical);
      const h = this.field.h;
      const groundY = this.field.groundY;
      const p = this.panda;

      this.scrollSpeed = Math.min(270, 155 + this.distance * METERS_PER_PX * 0.11);
      const worldDx = this.scrollSpeed * dt;
      this.distance += worldDx;

      const currentMeters = Math.floor(this.distance * METERS_PER_PX);
      this.checkLifeMilestone(currentMeters);
      const targetMode = this.getStageFromMeters(currentMeters);
      if (targetMode !== this.mode) {
        this.switchPlayfield(targetMode);
        return;
      }

      level?.update?.(this, dt, worldDx);
      if (this.phase !== "playing") return;

      if (!isVertical) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          level?.spawnObstacle?.(this);
          const minGap = Math.max(1.35, 2.05 - currentMeters * 0.0003);
          this.spawnTimer = minGap + Math.random() * 0.85;
        }

        this.treasureSpawnTimer -= dt;
        if (this.treasureSpawnTimer <= 0) {
          this.spawnTreasure();
          this.treasureSpawnTimer = 1.05 + Math.random() * 0.9;
        }
      }

      for (let i = this.treasuresList.length - 1; i >= 0; i--) {
        const t = this.treasuresList[i];
        if (!isVertical) t.x -= worldDx;
        t.phase += dt * 4.2;
        t.y = t.baseY + Math.sin(t.phase) * 4;

        if (!t.collected) {
          if (Math.hypot(p.x + p.w * 0.5 - t.x, p.y + p.h * 0.5 - t.y) < t.r + Math.min(p.w, p.h) * 0.58) {
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
        if ((!isVertical && t.x < -30) || (isVertical && t.y > h + 40)) {
          this.treasuresList.splice(i, 1);
        }
      }

      const hitBox = { x: p.x + 5, y: p.y + 4, w: p.w - 10, h: p.h - 6 };
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const o = this.obstacles[i];
        if (!isVertical) o.x += (o.vx - this.scrollSpeed) * dt;
        if (o.kind === "log") o.rot -= ((this.scrollSpeed - o.vx) * dt) / 11;
        else if (o.kind === "jelly" || o.kind === "fish" || o.kind === "bird") {
          o.phase += dt * 4.2;
          o.y = o.baseY + Math.sin(o.phase) * 10;
        } else if (o.kind === "kelp") {
          o.phase += dt * 3.0;
        } else if (o.kind === "cloud") {
          o.phase += dt * 2.8;
          o.y = o.baseY + Math.sin(o.phase) * 5;
        }

        if (!o.hit) {
          const collides = o.kind === "pit"
            ? (!p.onPlatform && p.y + p.h >= groundY - 2 && p.x + p.w - 6 > o.x + 6 && p.x + 6 < o.x + o.w - 6)
            : (hitBox.x < o.x + o.w - 3 && hitBox.x + hitBox.w > o.x + 3 && hitBox.y < o.y + o.h - 2 && hitBox.y + hitBox.h > o.y + 2);

          if (collides) {
            o.hit = true;
            this.damagePanda(o.x + o.w / 2, o.y + o.h / 2);
            if (this.phase !== "playing") return;
          }
        }

        if ((!isVertical && o.x + o.w < -80) || (isVertical && o.y > h + 70)) {
          this.obstacles.splice(i, 1);
        }
      }

      if (this.mode === "balloon") {
        const peakY = this.getMountainPeakYAt(p.x + p.w * 0.5 + this.distance * 0.22);
        if (p.y + p.h > peakY + 2) {
          this.damagePanda(p.x + p.w * 0.5, peakY, "BERGSPITZE!");
          if (this.phase !== "playing") return;
          p.y = peakY - p.h - 6;
          p.vy = -175;
        }
      }

      if (Math.floor(this.distance) % 18 < Math.ceil(worldDx)) {
        this.score += 1;
        this.updateHud();
      }
    },

    drawPlatforms(ctx) {
      for (const pl of this.platforms) {
        ctx.save();
        ctx.fillStyle = "#78350f";
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.roundRect(pl.x + 2, pl.y - 2, pl.w - 4, 5, 3);
        ctx.fill();
        ctx.restore();
      }
    },

    drawVines(ctx) {
      for (const v of this.vines) {
        const endPt = this.getVinePointAtY(v, v.botY);
        const ctrlPt = this.getVinePointAtY(v, (v.topY + v.botY) * 0.5);
        ctx.save();
        ctx.strokeStyle = "#a3e635";
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(v.x, v.topY);
        ctx.quadraticCurveTo(ctrlPt.x, ctrlPt.y, endPt.x, endPt.y);
        ctx.stroke();

        ctx.fillStyle = "#4d7c0f";
        ctx.beginPath();
        ctx.arc(v.x, v.topY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#84cc16";
        for (let y = v.topY + 14; y < v.botY - 4; y += 18) {
          const pt = this.getVinePointAtY(v, y);
          ctx.beginPath();
          ctx.ellipse(pt.x - 5, pt.y, 4.8, 2.2, -0.45, 0, Math.PI * 2);
          ctx.ellipse(pt.x + 5, pt.y + 5, 4.8, 2.2, 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },

    drawTreasures(ctx) {
      for (const t of this.treasuresList) {
        ctx.save();
        ctx.translate(t.x, t.y);
        const bob = Math.sin((t.phase ?? 0) * 1.2) * 1.5;
        ctx.translate(0, bob);

        ctx.fillStyle = "#92400e";
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-10, -2, 20, 11, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.roundRect(-10.5, -9, 21, 8, [5, 5, 1, 1]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.fillRect(-8, -2, 2.5, 11);
        ctx.fillRect(5.5, -2, 2.5, 11);
        ctx.beginPath();
        ctx.roundRect(-2.5, -3, 5, 5.5, 1.5);
        ctx.fill();

        ctx.fillStyle = t.color || "#fde047";
        ctx.beginPath();
        ctx.arc(0, -11.5, 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    },

    drawObstacles(ctx, groundY) {
      for (const o of this.obstacles) {
        ctx.save();
        if (o.kind === "pit") {
          ctx.fillStyle = "#060b08";
          ctx.fillRect(o.x, groundY - 4, o.w, o.h + 6);
          ctx.strokeStyle = "#14532d";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(o.x, groundY - 4, o.w, o.h + 4);
        } else if (o.kind === "croc") {
          const snap = Math.sin(o.jawPhase ?? this.animClock * 6) * 2.8;
          ctx.translate(o.x, o.y);

          ctx.fillStyle = "#84cc16";
          for (let sx = 14; sx <= o.w - 10; sx += 7) {
            ctx.beginPath();
            ctx.moveTo(sx - 2.5, 6);
            ctx.lineTo(sx, 1);
            ctx.lineTo(sx + 2.5, 6);
            ctx.closePath();
            ctx.fill();
          }

          ctx.fillStyle = "#15803d";
          ctx.strokeStyle = "#052e16";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(o.w - 4, 8);
          ctx.lineTo(o.w + 11, 3);
          ctx.lineTo(o.w + 9, 17);
          ctx.lineTo(o.w - 4, 19);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.roundRect(6, 5, o.w - 10, 15, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ecfccb";
          ctx.fillRect(11, 15.5, o.w - 19, 3.2);

          ctx.fillStyle = "#16a34a";
          ctx.beginPath();
          ctx.roundRect(0, 5.5 - snap * 0.45, 17, 7.2, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.roundRect(0, 12.2 + snap * 0.45, 16, 6.2, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(3, 12, 2.2, 2.8);
          ctx.fillRect(8.5, 12, 2.2, 2.8);

          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(12.5, 7.8, 3.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#090d16";
          ctx.beginPath();
          ctx.arc(12.5, 7.8, 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "log" || o.kind === "driftlog") {
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          if (o.kind === "log") ctx.rotate(o.rot || 0);
          ctx.fillStyle = "#78350f";
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 6);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(-o.w * 0.25, -o.h * 0.35);
          ctx.lineTo(-o.w * 0.25, o.h * 0.35);
          ctx.moveTo(o.w * 0.2, -o.h * 0.35);
          ctx.lineTo(o.w * 0.2, o.h * 0.35);
          ctx.stroke();

          if (o.kind === "driftlog") {
            ctx.fillStyle = "#4ade80";
            ctx.beginPath();
            ctx.ellipse(-o.w * 0.15, -o.h * 0.5, 7, 3.2, -0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (o.kind === "branch") {
          ctx.fillStyle = "#6b3a1e";
          ctx.strokeStyle = "#3b1d0b";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(o.x, o.y, o.w, o.h, 7);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.ellipse(o.x + o.w * 0.25, o.y + 1, 9, 4, -0.25, 0, Math.PI * 2);
          ctx.ellipse(o.x + o.w * 0.72, o.y + 1, 10, 4, 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "kelp") {
          const sway = Math.sin(o.phase ?? this.animClock * 3) * 5;
          ctx.translate(o.x + o.w * 0.5, o.y);
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sway, o.h * 0.5, -sway * 0.7, o.h);
          ctx.stroke();

          ctx.fillStyle = "#4ade80";
          for (let sy = 10; sy < o.h - 4; sy += 13) {
            const lx = Math.sin((sy / o.h) * Math.PI) * sway * 0.7;
            ctx.beginPath();
            ctx.ellipse(lx - 5, sy, 5, 2.4, -0.4, 0, Math.PI * 2);
            ctx.ellipse(lx + 5, sy + 4, 5, 2.4, 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (o.kind === "jelly") {
          const pulse = Math.sin(o.phase ?? this.animClock * 4.2) * 2.5;
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          ctx.strokeStyle = "#f0abfc";
          ctx.lineWidth = 1.8;
          for (const tx of [-6, 0, 6]) {
            ctx.beginPath();
            ctx.moveTo(tx, 3);
            ctx.quadraticCurveTo(tx + pulse * 0.6, 9, tx - pulse * 0.5, 14);
            ctx.stroke();
          }
          ctx.fillStyle = "#c026d3";
          ctx.strokeStyle = "#701a75";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 1, 12, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fdf4ff";
          ctx.beginPath();
          ctx.arc(-4.5, -3.5, 2, 0, Math.PI * 2);
          ctx.arc(4.5, -3.5, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "fish") {
          const tailWag = Math.sin((o.phase ?? this.animClock * 4.2) * 1.4) * 3.5;
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          ctx.fillStyle = "#dc2626";
          ctx.strokeStyle = "#7f1d1d";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(19, -7 + tailWag);
          ctx.lineTo(19, 7 + tailWag);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.ellipse(-1, 0, 13, 8.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#f87171";
          ctx.beginPath();
          ctx.moveTo(-4, -8);
          ctx.lineTo(2, -13);
          ctx.lineTo(6, -7);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-8, -2, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(-8.5, -2, 1.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "bird") {
          const flap = Math.sin((o.phase ?? this.animClock * 5) * 2.2) * 7;
          ctx.translate(o.x + o.w * 0.5, o.y + o.h * 0.5);

          ctx.fillStyle = "#f97316";
          ctx.strokeStyle = "#7c2d12";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 1, 12, 7.5, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ea580c";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(18, -5);
          ctx.lineTo(18, 4);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.moveTo(-11, -1);
          ctx.lineTo(-18, 1);
          ctx.lineTo(-11, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#fed7aa";
          ctx.beginPath();
          ctx.moveTo(-2, -1);
          ctx.quadraticCurveTo(3, -11 + flap, 9, -2 + flap * 0.7);
          ctx.quadraticCurveTo(4, 3, -2, -1);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-6, -1.5, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(-6.5, -1.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "cloud" || o.kind === "storm") {
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          ctx.fillStyle = o.kind === "cloud" ? "#64748b" : "#475569";
          ctx.beginPath();
          ctx.arc(-13, 2, 10, 0, Math.PI * 2);
          ctx.arc(0, -3, 14, 0, Math.PI * 2);
          ctx.arc(14, 2, 11, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#78350f";
          ctx.fillRect(o.x, o.y, o.w, o.h);
        }
        ctx.restore();
      }
    },

    drawSwimmerPanda(ctx, p) {
      const kick = Math.sin(this.animClock * 11) * 5;
      const paddle = Math.cos(this.animClock * 11) * 4;
      const cx = p.x + p.w * 0.5;
      const cy = p.y + p.h * 0.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.max(-0.22, Math.min(0.22, p.vy * 0.0008)));

      ctx.fillStyle = "#0284c7";
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-14, -3 + kick * 0.4);
      ctx.lineTo(-25, -8 + kick);
      ctx.lineTo(-23, 0 + kick);
      ctx.lineTo(-14, 0 + kick * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-14, 2 - kick * 0.4);
      ctx.lineTo(-25, 0 - kick);
      ctx.lineTo(-23, 8 - kick);
      ctx.lineTo(-14, 5 - kick * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(-2, 1, 13, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(-4, 1, 3.8, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(2, 9 + paddle * 0.45, 5.5, 3.2, 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(8, -8, 4.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(11, -1, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#0369a1";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(7.5, -6.5, 11, 7.5, 3.5);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(10, -4.5);
      ctx.lineTo(13, -1);
      ctx.stroke();

      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(5, -3);
      ctx.lineTo(1, -3);
      ctx.lineTo(1, -15);
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(21.5, -1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    drawPilotPanda(ctx, p) {
      const cx = p.x + p.w * 0.5;
      const headY = p.y + 11;
      const bodyY = p.y + 25;
      const propSpin = Math.abs(Math.sin(this.animClock * 26)) * 12 + 3;

      ctx.save();

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, bodyY);
      ctx.lineTo(cx - 19, bodyY);
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx - 20, bodyY, 3.2, propSpin, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(cx - 5, p.y + p.h - 5, 4.2, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 5, p.y + p.h - 5, 4.2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, bodyY, 11.5, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.roundRect(cx - 10, bodyY - 9, 20, 4.5, 2);
      ctx.fill();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(cx - 10, bodyY + 1, 3.8, 5.5, 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 10, bodyY + 1, 3.8, 5.5, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(cx, headY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, headY - 1, 12.6, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(cx - 14.5, headY - 3, 5, 10, 2.5);
      ctx.roundRect(cx + 9.5, headY - 3, 5, 10, 2.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(cx - 9.5, headY - 5, 8.5, 6.5, 3);
      ctx.roundRect(cx + 1, headY - 5, 8.5, 6.5, 3);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-1, headY - 2);
      ctx.lineTo(1, headY - 2);
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(cx, headY + 4.5, 2.2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    drawCutePanda(ctx) {
      const p = this.panda;
      if (this.invulnTimer > 0 && Math.floor(this.animClock * 18) % 2 === 0) return;

      if (this.mode === "water") {
        this.drawSwimmerPanda(ctx, p);
        return;
      }

      if (this.mode === "balloon") {
        this.drawPilotPanda(ctx, p);
        return;
      }

      ctx.save();
      const cx = p.x + p.w * 0.5;
      const isDuck = Boolean(p.crouching && p.onGround);
      const headY = isDuck ? p.y + 8 : p.y + 11;
      const bodyY = isDuck ? p.y + 16 : p.y + 25;
      const swing = Math.sin(p.runCycle) * (p.onGround ? 4.5 : p.climbing ? 6 : 2.5);

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(cx - 10, bodyY + 2, 3.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111827";
      const legBaseY = isDuck ? p.y + p.h - 3 : p.y + p.h - 5;
      ctx.beginPath();
      ctx.ellipse(cx - 5 - swing * 0.6, legBaseY, 4.4, isDuck ? 3 : 4.6, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 5 + swing * 0.6, legBaseY, 4.4, isDuck ? 3 : 4.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, bodyY, isDuck ? 13 : 11.5, isDuck ? 7 : 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(cx, bodyY - (isDuck ? 3 : 5), 10.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();

      const armOffsetY = p.climbing ? -7 - swing * 0.4 : swing * 0.5;
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(cx - 10, bodyY + armOffsetY, 3.8, 5.8, p.climbing ? -0.45 : 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 10, bodyY - armOffsetY, 3.8, 5.8, p.climbing ? 0.45 : -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(cx - 10, headY - 9, 5.6, 0, Math.PI * 2);
      ctx.arc(cx + 10, headY - 9, 5.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(cx, headY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(cx - 4.5, headY - 1, 3.4, 4.2, -0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 4.5, headY - 1, 3.4, 4.2, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - 5.2, headY - 2.2, 1.3, 0, Math.PI * 2);
      ctx.arc(cx + 3.8, headY - 2.2, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(cx, headY + 3.4, 2.3, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    draw() {
      if (!this.canvasCtx) return;
      const ctx = this.canvasCtx;
      const w = this.field.w;
      const h = this.field.h;
      const groundY = this.field.groundY;

      ctx.clearRect(0, 0, w, h);
      this.getCurrentLevel()?.draw?.(this, ctx, w, h);
      this.drawObstacles(ctx, groundY);
      this.drawTreasures(ctx);
      this.drawCutePanda(ctx);

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