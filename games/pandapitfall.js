(() => {
  "use strict";

  const STAGE_SPAN_METERS = 500;
  const METERS_PER_PX = 1 / 18;

  window.GAME_REGISTRY?.register({
    id: "pandapitfall",
    name: "Panda Pitfall",
    subtitle: "500m Dschungel • 500m Unterwasser mit Luft holen • 500m Luftballon-Flug",
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
      this.scrollSpeed = 160;

      this.mode = "jungle"; // "jungle" | "water" | "balloon"
      this.air = 100;
      this.maxAir = 100;
      this.balloonColor = "#fb7185";

      this.field = { x: 0, y: 0, w: 640, h: 360, groundY: 295, surfaceY: 64 };

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
        dropThroughTimer: 0,
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        runCycle: 0
      };

      this.input = {
        left: false,
        right: false,
        up: false,
        down: false,
        crouch: false
      };

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
      this.root.className = "relative w-full h-full flex flex-col items-center justify-center p-1.5 bg-[#040f09] overflow-hidden select-none";

      this.hud = document.createElement("div");
      this.hud.className = "w-full max-w-[820px] flex items-center justify-between gap-2 mb-1 px-2 font-orbitron text-[11px] sm:text-xs";

      this.canvasWrapper = document.createElement("div");
      this.canvasWrapper.className = "relative flex-1 w-full max-w-[820px] flex items-center justify-center min-h-0";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-2xl border border-emerald-400/35 bg-[#071a11] shadow-[0_0_30px_rgba(16,185,129,0.16)] touch-none";
      this.canvasCtx = this.canvas.getContext("2d");

      this.touchPad = document.createElement("div");
      this.touchPad.className = "pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2 sm:hidden";
      this.touchPad.innerHTML = `
        <div class="pointer-events-auto flex items-center gap-2">
          <button type="button" data-pad="left" class="w-12 h-12 rounded-2xl border border-emerald-300/35 bg-slate-950/75 text-emerald-200 font-bold text-lg active:scale-95 active:bg-emerald-500/30">◀</button>
          <button type="button" data-pad="right" class="w-12 h-12 rounded-2xl border border-emerald-300/35 bg-slate-950/75 text-emerald-200 font-bold text-lg active:scale-95 active:bg-emerald-500/30">▶</button>
          <button type="button" data-pad="crouch" class="px-3 h-12 rounded-2xl border border-amber-300/40 bg-amber-950/75 text-amber-200 font-orbitron text-[10px] font-bold uppercase active:scale-95 active:bg-amber-500/30">Ducken</button>
        </div>
        <div class="pointer-events-auto flex items-center gap-2">
          <button type="button" data-pad="up" class="w-11 h-12 rounded-2xl border border-lime-300/35 bg-slate-950/75 text-lime-200 font-bold text-sm active:scale-95 active:bg-lime-500/30">▲</button>
          <button type="button" data-pad="down" class="w-11 h-12 rounded-2xl border border-lime-300/35 bg-slate-950/75 text-lime-200 font-bold text-sm active:scale-95 active:bg-lime-500/30">▼</button>
          <button type="button" data-pad="jump" class="px-4 h-12 rounded-2xl border border-emerald-300/50 bg-emerald-400 text-slate-950 font-orbitron text-[11px] font-black uppercase tracking-wider shadow-lg active:scale-95">Springen</button>
        </div>
      `;

      this.overlay = document.createElement("div");
      this.overlay.className = "hidden absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4";

      this.canvasWrapper.appendChild(this.canvas);
      this.canvasWrapper.appendChild(this.touchPad);
      this.root.appendChild(this.hud);
      this.root.appendChild(this.canvasWrapper);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.bindEvents();
      this.resize();
      this.resetState();
    },

    triggerJumpOrSwing() {
      if (this.mode === "jungle") {
        this.panda.jumpBufferTimer = 0.16;
      } else if (this.mode === "water") {
        this.panda.vy = -210;
      } else if (this.mode === "balloon") {
        this.panda.vy = -225;
      }
    },

    bindEvents() {
      this.onKeyDown = (e) => {
        if (this.phase !== "playing" || this.paused) return;
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") {
          this.input.left = true;
        } else if (k === "arrowright" || k === "d") {
          this.input.right = true;
        } else if (k === "arrowup" || k === "w") {
          e.preventDefault();
          this.input.up = true;
          if (this.mode === "jungle") {
            this.tryClimbOnly();
          } else {
            this.panda.vy = -200;
          }
        } else if (k === " ") {
          e.preventDefault();
          this.triggerJumpOrSwing();
        } else if (k === "arrowdown" || k === "s") {
          e.preventDefault();
          this.input.down = true;
          this.input.crouch = true;
          if (this.mode === "jungle" && this.panda.onPlatform && !this.panda.climbing) {
            this.panda.dropThroughTimer = 0.22;
            this.panda.onPlatform = null;
            this.panda.onGround = false;
          } else if (this.mode !== "jungle") {
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
          if (action === "left") {
            this.input.left = true;
          } else if (action === "right") {
            this.input.right = true;
          } else if (action === "up") {
            this.input.up = true;
            if (this.mode === "jungle") {
              this.tryClimbOnly();
            } else {
              this.panda.vy = -205;
            }
          } else if (action === "down") {
            this.input.down = true;
            this.input.crouch = true;
            if (this.mode === "jungle" && this.panda.onPlatform && !this.panda.climbing) {
              this.panda.dropThroughTimer = 0.22;
              this.panda.onPlatform = null;
              this.panda.onGround = false;
            } else if (this.mode !== "jungle") {
              this.panda.vy = 185;
            }
          } else if (action === "crouch") {
            this.input.crouch = true;
          } else if (action === "jump") {
            // Am Handy löst "Springen" an der Liane den Schwung-Absprung aus
            this.triggerJumpOrSwing();
          }
        };
        const upFn = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (action === "left") this.input.left = false;
          else if (action === "right") this.input.right = false;
          else if (action === "up") this.input.up = false;
          else if (action === "down") {
            this.input.down = false;
            this.input.crouch = false;
          } else if (action === "crouch") {
            this.input.crouch = false;
          }
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
          if (this.mode === "jungle" && this.panda.onPlatform && !this.panda.climbing) {
            this.panda.dropThroughTimer = 0.22;
            this.panda.onPlatform = null;
            this.panda.onGround = false;
          } else if (this.mode !== "jungle") {
            this.panda.vy = 175;
          }
        }
      };
      this.onCanvasPointerUp = (e) => {
        if (!this.swipeStart) return;
        const dy = e.clientY - this.swipeStart.y;
        const dx = e.clientX - this.swipeStart.x;
        if (dy < -24 && Math.abs(dy) > Math.abs(dx)) {
          this.triggerJumpOrSwing();
        } else if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
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
      const weight = t * t * 0.8 + t * 0.2;
      return Math.cos(v.swayPhase ?? 0) * speed * amp * weight;
    },

    getVineSwingOffset(v, yPos) {
      const length = Math.max(20, (v.botY ?? 260) - (v.topY ?? 0));
      const t = Math.max(0, Math.min(1, (yPos - (v.topY ?? 0)) / length));
      const amp = v.swingAmp ?? 24;
      const sway = Math.sin(v.swayPhase ?? 0) * amp;
      return sway * (t * t * 0.8 + t * 0.2);
    },

    getVinePointAtY(v, yPos) {
      return {
        x: v.x + this.getVineSwingOffset(v, yPos),
        y: yPos
      };
    },

    tryClimbOnly() {
      if (this.mode !== "jungle") return;
      const vine = this.findOverlappingVine();
      if (vine && !this.panda.climbing) {
        this.panda.climbing = true;
        this.panda.activeVine = vine;
        this.panda.vineGraceTimer = 0.14;
        this.panda.vy = 0;
        this.panda.onGround = false;
        this.panda.onPlatform = null;
        this.panda.crouching = false;
      }
    },

    findOverlappingVine() {
      const p = this.panda;
      const pyTop = p.y;
      const pyBot = p.y + p.h;
      const pMidY = (pyTop + pyBot) * 0.5;
      const px = p.x + p.w * 0.5;
      for (const v of this.vines) {
        const vxAtPanda = v.x + this.getVineSwingOffset(v, pMidY);
        if (Math.abs(px - vxAtPanda) <= 32 && pyBot >= v.topY && pyTop <= v.botY) {
          return v;
        }
      }
      return null;
    },

    getStageFromMeters(meters) {
      const idx = Math.floor(meters / STAGE_SPAN_METERS) % 3;
      if (idx === 0) return "jungle";
      if (idx === 1) return "water";
      return "balloon";
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

    switchPlayfield(newMode) {
      if (this.mode === newMode) return;
      this.mode = newMode;

      const groundY = this.field.groundY || Math.round(this.field.h * 0.84);
      const surfaceY = this.field.surfaceY || Math.round(this.field.h * 0.22);
      const p = this.panda;

      p.climbing = false;
      p.activeVine = null;
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
      this.spawnTimer = 1.35;
      this.platformSpawnTimer = 1.25;
      this.vineSpawnTimer = 1.7;
      this.treasureSpawnTimer = 0.95;

      if (newMode === "jungle") {
        p.y = groundY - p.h;
        p.onGround = true;
        this.spawnPlatform(this.field.w * 0.38, groundY - 76, 130, true);
        this.spawnPlatform(this.field.w * 0.68, groundY - 134, 145, true);
        this.spawnVine(this.field.w * 0.54);
        this.addFloatingText(p.x + 25, p.y - 12, "DSCHUNGEL!", "#4ade80");
      } else if (newMode === "water") {
        this.air = this.maxAir;
        p.y = surfaceY + 45;
        p.onGround = false;
        this.spawnTreasure(this.field.w * 0.55, surfaceY + 75, false);
        this.spawnTreasure(this.field.w * 0.78, groundY - 45, false);
        this.addFloatingText(p.x + 25, p.y - 12, "WASSER • LUFT HOLEN!", "#38bdf8");
      } else if (newMode === "balloon") {
        const colors = ["#fb7185", "#facc15", "#38bdf8", "#c084fc", "#4ade80"];
        this.balloonColor = colors[Math.floor(Math.random() * colors.length)];
        p.y = this.field.h * 0.45;
        p.onGround = false;
        this.spawnTreasure(this.field.w * 0.52, this.field.h * 0.32, true);
        this.spawnTreasure(this.field.w * 0.76, this.field.h * 0.58, true);
        this.addFloatingText(p.x + 25, p.y - 12, "LUFTBALLON-FLUG!", "#f472b6");
      }

      this.playSfx("playScore");
      this.updateHud();
    },

    resetState() {
      this.score = 0;
      this.treasures = 0;
      this.lives = this.maxLives;
      this.lastLifeMilestone = 0;
      this.invulnTimer = 0;
      this.distance = 0;
      this.scrollSpeed = 160;
      this.mode = "jungle";
      this.air = this.maxAir;
      this.balloonColor = "#fb7185";
      this.phase = "playing";
      this.overlay.classList.add("hidden");

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
      p.x = Math.max(70, this.field.w * 0.18);
      p.h = p.normalH;
      p.y = this.field.groundY - p.h;
      p.vx = 0;
      p.vy = 0;
      p.onGround = true;
      p.onPlatform = null;
      p.crouching = false;
      p.climbing = false;
      p.activeVine = null;
      p.vineGraceTimer = 0;
      p.dropThroughTimer = 0;
      p.coyoteTimer = 0.12;
      p.jumpBufferTimer = 0;

      const startPlat = this.spawnPlatform(this.field.w * 0.36, this.field.groundY - 76, 130, true);
      this.spawnPlatform(this.field.w * 0.66, this.field.groundY - 134, 145, true);
      this.spawnVine(this.field.w * 0.56);
      if (startPlat) {
        this.spawnTreasure(startPlat.x + startPlat.w * 0.5, startPlat.y - 20, true);
      }
      this.spawnTreasure(this.field.w * 0.72, this.field.groundY - 154, true);
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
      if (!this.hud) return;
      const meters = Math.floor(this.distance * METERS_PER_PX);
      const zoneLabel =
        this.mode === "jungle"
          ? "DSCHUNGEL"
          : this.mode === "water"
            ? `LUFT ${Math.ceil(this.air)}%`
            : "BALLON";
      const zoneColor =
        this.mode === "jungle"
          ? "text-lime-300"
          : this.mode === "water"
            ? this.air < 30
              ? "text-rose-400 font-bold"
              : "text-sky-300 font-bold"
            : "text-pink-300 font-bold";

      this.hud.innerHTML = `
        <span class="text-emerald-300">PUNKTE ${this.score}</span>
        <span class="text-amber-300">SCHÄTZE ${this.treasures}</span>
        <span class="${zoneColor}">${meters}m • ${zoneLabel}</span>
        <span class="text-rose-300">LEBEN ${"🐼".repeat(Math.max(0, this.lives)) || "0"}/${this.maxLives}</span>
        <span class="text-cyan-300">BEST ${this.bestScore}</span>
      `;
    },

    resize() {
      if (!this.root || !this.canvas || !this.canvasCtx || !this.canvasWrapper) return;
      const wrapRect = this.canvasWrapper.getBoundingClientRect();
      const availW = Math.max(320, wrapRect.width - 6);
      const availH = Math.max(200, wrapRect.height - 6);

      const aspect = 1.78;
      let w = availW;
      let h = w / aspect;
      if (h > availH) {
        h = availH;
        w = h * aspect;
      }

      const prevH = this.field.h || h;
      const prevGround = this.field.groundY || prevH * 0.82;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.style.width = `${Math.floor(w)}px`;
      this.canvas.style.height = `${Math.floor(h)}px`;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const groundY = Math.round(h * 0.84);
      const surfaceY = Math.round(h * 0.22);
      this.field = { x: 0, y: 0, w, h, groundY, surfaceY };

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
    },

    spawnPlatform(xPos = null, yPos = null, widthVal = null, withTreasure = true) {
      const w = this.field.w || 640;
      const h = this.field.h || 360;
      const groundY = this.field.groundY || Math.round(h * 0.84);
      const pw = widthVal ?? (105 + Math.random() * 65);
      const x = xPos ?? w + 35;

      const highTier = Math.random() < 0.48;
      const minTop = Math.max(66, h * 0.24);
      const y = yPos ?? (highTier
        ? Math.max(minTop, groundY - 128 - Math.random() * 24)
        : groundY - 68 - Math.random() * 18);

      const plat = { x, y, w: pw, h: 14 };
      this.platforms.push(plat);

      if (withTreasure) {
        const count = Math.random() < 0.45 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const tx = x + 22 + ((pw - 44) * (count === 1 ? 0.5 : i));
          const ty = y - 20 - (i === 1 ? 18 : 0);
          this.spawnTreasure(tx, ty, true);
        }
      }
      return plat;
    },

    spawnVine(xPos = null) {
      const w = this.field.w || 640;
      const h = this.field.h || 360;
      const groundY = this.field.groundY || Math.round(h * 0.84);
      const x = xPos ?? w + 45 + Math.random() * 110;
      const hangRatio = 0.7 + Math.random() * 0.2;
      this.vines.push({
        x,
        topY: 0,
        botY: Math.min(groundY - 6, h * hangRatio),
        swingAmp: 22 + Math.random() * 7,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 3.0 + Math.random() * 0.9,
        hasGem: true,
        gemCollected: false
      });
    },

    spawnTreasure(xPos = null, yPos = null, forceHigh = false) {
      const w = this.field.w || 640;
      const h = this.field.h || 360;
      const groundY = this.field.groundY || Math.round(h * 0.84);
      const surfaceY = this.field.surfaceY || Math.round(h * 0.22);
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
          baseY = surfaceY + 26 + Math.random() * Math.max(40, groundY - surfaceY - 58);
        } else {
          baseY = 48 + Math.random() * Math.max(60, groundY - 105);
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

    spawnObstacle() {
      const w = this.field.w || 640;
      const h = this.field.h || 360;
      const groundY = this.field.groundY || Math.round(h * 0.84);
      const surfaceY = this.field.surfaceY || Math.round(h * 0.22);

      if (this.mode === "jungle") {
        const roll = Math.random();
        if (roll < 0.28) {
          this.obstacles.push({
            kind: "log",
            x: w + 35,
            y: groundY - 22,
            w: 28,
            h: 22,
            vx: -(this.scrollSpeed * 0.42 + 45),
            rot: 0,
            hit: false
          });
        } else if (roll < 0.52) {
          const hBranch = 24;
          this.obstacles.push({
            kind: "branch",
            x: w + 45,
            y: groundY - this.panda.normalH - hBranch + 3,
            w: 74,
            h: hBranch,
            vx: 0,
            hit: false
          });
        } else if (roll < 0.76) {
          this.obstacles.push({
            kind: "croc",
            x: w + 50,
            y: groundY - 24,
            w: 50,
            h: 24,
            vx: -20,
            jawPhase: Math.random() * Math.PI * 2,
            hit: false
          });
        } else {
          this.obstacles.push({
            kind: "pit",
            x: w + 40,
            y: groundY,
            w: 54,
            h: 24,
            vx: 0,
            hit: false
          });
        }
      } else if (this.mode === "water") {
        const isJelly = Math.random() < 0.5;
        const y = surfaceY + 30 + Math.random() * Math.max(40, groundY - surfaceY - 62);
        this.obstacles.push({
          kind: isJelly ? "jelly" : "fish",
          x: w + 40,
          y,
          baseY: y,
          w: isJelly ? 28 : 36,
          h: isJelly ? 28 : 22,
          vx: isJelly ? -26 : -48,
          phase: Math.random() * Math.PI * 2,
          hit: false
        });
      } else if (this.mode === "balloon") {
        const isCloud = Math.random() < 0.45;
        const y = 44 + Math.random() * Math.max(50, groundY - 98);
        this.obstacles.push({
          kind: isCloud ? "storm" : "bird",
          x: w + 45,
          y,
          baseY: y,
          w: isCloud ? 44 : 30,
          h: isCloud ? 24 : 20,
          vx: isCloud ? -18 : -45,
          phase: Math.random() * Math.PI * 2,
          hit: false
        });
      }
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
      if (this.mode === "water") {
        this.air = Math.max(this.air, 45);
      }
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

    update(dt) {
      this.animClock += dt;

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

      if (this.invulnTimer > 0) {
        this.invulnTimer = Math.max(0, this.invulnTimer - dt);
      }

      const w = this.field.w || 640;
      const h = this.field.h || 360;
      const groundY = this.field.groundY || Math.round(h * 0.84);
      const surfaceY = this.field.surfaceY || Math.round(h * 0.22);
      const p = this.panda;

      this.scrollSpeed = Math.min(280, 160 + this.distance * METERS_PER_PX * 0.12);
      const worldDx = this.scrollSpeed * dt;
      this.distance += worldDx;

      const currentMeters = Math.floor(this.distance * METERS_PER_PX);
      this.checkLifeMilestone(currentMeters);
      const targetMode = this.getStageFromMeters(currentMeters);
      if (targetMode !== this.mode) {
        this.switchPlayfield(targetMode);
      }

      let moveX = 0;
      if (this.input.left) moveX -= 1;
      if (this.input.right) moveX += 1;

      if (moveX !== 0) {
        p.vx += moveX * 920 * dt;
      } else {
        p.vx *= Math.pow(0.06, dt);
      }
      const maxVx = 260;
      p.vx = Math.max(-maxVx, Math.min(maxVx, p.vx));

      p.x += p.vx * dt - worldDx * 0.22;
      p.x = Math.max(24, Math.min(w - p.w - 36, p.x));

      if (this.mode === "jungle") {
        if (p.dropThroughTimer > 0) p.dropThroughTimer = Math.max(0, p.dropThroughTimer - dt);
        if (p.vineGraceTimer > 0) p.vineGraceTimer = Math.max(0, p.vineGraceTimer - dt);

        for (let i = this.platforms.length - 1; i >= 0; i--) {
          const pl = this.platforms[i];
          pl.x -= worldDx;
          if (pl.x + pl.w < -60) {
            if (p.onPlatform === pl) {
              p.onPlatform = null;
              p.onGround = false;
            }
            this.platforms.splice(i, 1);
          }
        }

        const nearVine = this.findOverlappingVine();
        if (!p.climbing && nearVine && (this.input.up || (this.input.down && !p.onGround))) {
          p.climbing = true;
          p.activeVine = nearVine;
          p.vineGraceTimer = 0.14;
          p.vy = 0;
          p.onGround = false;
          p.onPlatform = null;
          p.crouching = false;
        }

        if (p.climbing) {
          p.crouching = false;
          p.h = p.normalH;
          const climbSpeed = 160;
          let climbDir = 0;
          if (this.input.up) climbDir -= 1;
          if (this.input.down) climbDir += 1;

          p.y += climbDir * climbSpeed * dt;
          if (p.activeVine) {
            const midY = p.y + p.h * 0.5;
            const vinePt = this.getVinePointAtY(p.activeVine, midY);
            const swingVx = this.getVineSwingVelocityX(p.activeVine, midY);
            const targetX = vinePt.x - p.w * 0.5;
            p.x += (targetX - p.x) * Math.min(1, 16 * dt);
            p.vx = swingVx * 1.4;

            if (Math.abs(p.x + p.w * 0.5 - vinePt.x) <= 36 && p.y + p.h >= p.activeVine.topY && p.y <= p.activeVine.botY) {
              p.vineGraceTimer = 0.12;
            }

            if (p.vineGraceTimer <= 0) {
              p.climbing = false;
              p.activeVine = null;
            } else {
              if (p.y <= p.activeVine.topY + 4) p.y = p.activeVine.topY + 4;
              if (p.y + p.h >= groundY) {
                p.y = groundY - p.h;
                p.climbing = false;
                p.activeVine = null;
                p.onGround = true;
              }
            }
          }

          // Absprung von der schwingenden Liane (Leertaste am PC oder "Springen"/Wischen am Handy)
          if (p.jumpBufferTimer > 0) {
            const vineRef = p.activeVine;
            const midY = p.y + p.h * 0.5;
            const swingBoost = vineRef ? this.getVineSwingVelocityX(vineRef, midY) * 2.4 : 0;
            const dirBoost = moveX !== 0 ? moveX * 150 : Math.sign(swingBoost || 1) * 135;
            p.climbing = false;
            p.activeVine = null;
            p.vineGraceTimer = 0;
            p.vy = -430;
            p.vx = Math.max(-350, Math.min(350, swingBoost + dirBoost));
            p.jumpBufferTimer = 0;
            this.spawnParticles(p.x + p.w * 0.5, p.y + p.h * 0.5, "#a3e635", 9);
            this.playSfx("playHit");
          }
        } else {
          const wantCrouch = Boolean(this.input.crouch || this.input.down);
          if (wantCrouch && p.onGround) {
            if (!p.crouching) {
              p.crouching = true;
              const diff = p.normalH - p.crouchH;
              p.h = p.crouchH;
              p.y += diff;
            }
          } else if (p.crouching) {
            p.crouching = false;
            const diff = p.normalH - p.crouchH;
            p.h = p.normalH;
            p.y -= diff;
          }

          if (p.onPlatform) {
            const pl = p.onPlatform;
            const feetX = p.x + p.w * 0.5;
            if (feetX < pl.x - 4 || feetX > pl.x + pl.w + 4 || p.dropThroughTimer > 0) {
              p.onPlatform = null;
              p.onGround = false;
            } else {
              p.y = pl.y - p.h;
              p.vy = 0;
              p.onGround = true;
            }
          }

          if (p.onGround) p.coyoteTimer = 0.12;
          else p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);

          if (p.jumpBufferTimer > 0) {
            p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
            if (p.coyoteTimer > 0) {
              if (p.crouching) {
                p.crouching = false;
                p.y -= p.normalH - p.crouchH;
                p.h = p.normalH;
              }
              p.vy = -410;
              p.onGround = false;
              p.onPlatform = null;
              p.coyoteTimer = 0;
              p.jumpBufferTimer = 0;
              this.playSfx("playHit");
            }
          }

          const prevBottom = p.y + p.h;
          if (!p.onPlatform) {
            p.vy += 980 * dt;
            p.y += p.vy * dt;
          }
          const nextBottom = p.y + p.h;

          if (!p.onPlatform && p.vy >= 0 && p.dropThroughTimer <= 0) {
            for (const pl of this.platforms) {
              const overlapX = p.x + p.w - 6 > pl.x && p.x + 6 < pl.x + pl.w;
              if (overlapX && prevBottom <= pl.y + 8 && nextBottom >= pl.y) {
                p.y = pl.y - p.h;
                p.vy = 0;
                p.onGround = true;
                p.onPlatform = pl;
                break;
              }
            }
          }

          if (!p.onPlatform) {
            if (p.y + p.h >= groundY) {
              p.y = groundY - p.h;
              p.vy = 0;
              p.onGround = true;
            } else {
              p.onGround = false;
            }
          }
        }
      } else if (this.mode === "water") {
        let swimY = 0;
        if (this.input.up) swimY -= 1;
        if (this.input.down || this.input.crouch) swimY += 1;

        if (swimY !== 0) {
          p.vy += swimY * 560 * dt;
        } else {
          p.vy -= 95 * dt;
        }
        p.vy *= Math.pow(0.18, dt);
        p.vy = Math.max(-195, Math.min(195, p.vy));
        p.y += p.vy * dt;

        if (p.y <= surfaceY) {
          p.y = surfaceY;
          if (p.vy < 0) p.vy = 0;
          const prevAir = this.air;
          this.air = Math.min(this.maxAir, this.air + 52 * dt);
          if (prevAir < 98 && this.air >= 98) {
            this.addFloatingText(p.x + 14, p.y - 10, "LUFT VOLL!", "#7dd3fc");
          }
        } else {
          this.air = Math.max(0, this.air - 11.5 * dt);
          if (this.air <= 0) {
            this.air = 65;
            this.damagePanda(p.x + p.w / 2, p.y + 10, "KEINE LUFT!");
            if (this.phase !== "playing") return;
          }
        }

        if (p.y + p.h >= groundY) {
          p.y = groundY - p.h;
          if (p.vy > 0) p.vy = 0;
        }

        this.bubbleTimer -= dt;
        if (this.bubbleTimer <= 0) {
          this.bubbleTimer = 0.22;
          this.bubbles.push({
            x: p.x + p.w * 0.5 + (Math.random() - 0.5) * 14,
            y: p.y + 6,
            r: 2 + Math.random() * 2.5,
            vy: 55 + Math.random() * 35
          });
        }

        for (let i = this.bubbles.length - 1; i >= 0; i--) {
          const b = this.bubbles[i];
          b.y -= b.vy * dt;
          b.x -= worldDx * 0.35;
          if (b.y < surfaceY - 4) this.bubbles.splice(i, 1);
        }
      } else if (this.mode === "balloon") {
        let flyY = 0;
        if (this.input.up) flyY -= 1;
        if (this.input.down || this.input.crouch) flyY += 1;

        if (flyY !== 0) {
          p.vy += flyY * 580 * dt;
        } else {
          p.vy += Math.sin(this.animClock * 3.2) * 45 * dt;
        }
        p.vy *= Math.pow(0.16, dt);
        p.vy = Math.max(-210, Math.min(210, p.vy));
        p.y += p.vy * dt;

        const minFlyY = 38;
        const maxFlyY = groundY - p.h - 10;
        if (p.y < minFlyY) {
          p.y = minFlyY;
          if (p.vy < 0) p.vy = 0;
        } else if (p.y > maxFlyY) {
          p.y = maxFlyY;
          if (p.vy > 0) p.vy = 0;
        }
      }

      if (this.mode === "jungle" && p.onGround && !p.crouching && !p.climbing) {
        p.runCycle += dt * (this.scrollSpeed * 0.065);
      } else if (this.mode === "jungle" && p.climbing) {
        p.runCycle += dt * 11;
      } else {
        p.runCycle += dt * 5;
      }

      if (this.mode === "jungle") {
        this.platformSpawnTimer -= dt;
        if (this.platformSpawnTimer <= 0) {
          this.spawnPlatform();
          this.platformSpawnTimer = 1.4 + Math.random() * 0.95;
        }

        this.vineSpawnTimer -= dt;
        if (this.vineSpawnTimer <= 0) {
          this.spawnVine();
          this.vineSpawnTimer = 2.6 + Math.random() * 1.8;
        }
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        const minGap = Math.max(1.35, 2.05 - currentMeters * 0.0003);
        this.spawnTimer = minGap + Math.random() * 0.85;
      }

      this.treasureSpawnTimer -= dt;
      if (this.treasureSpawnTimer <= 0) {
        this.spawnTreasure();
        this.treasureSpawnTimer = 1.05 + Math.random() * 0.9;
      }

      for (let i = this.vines.length - 1; i >= 0; i--) {
        const v = this.vines[i];
        v.x -= worldDx;
        v.swayPhase += dt * (v.swaySpeed ?? 3.1);
        if (v.hasGem && !v.gemCollected) {
          const gemY = v.topY + 46;
          const gemPt = this.getVinePointAtY(v, gemY);
          if (Math.abs(p.x + p.w / 2 - gemPt.x) < 26 && Math.abs(p.y + p.h / 2 - gemPt.y) < 28) {
            v.gemCollected = true;
            this.treasures += 1;
            this.score += 150;
            this.playSfx("playScore");
            this.spawnParticles(gemPt.x, gemPt.y, "#38bdf8", 12);
            this.addFloatingText(gemPt.x, gemPt.y - 6, "+150", "#38bdf8");
            this.updateHud();
          }
        }
        if (v.x < -70) {
          if (p.activeVine === v) {
            p.climbing = false;
            p.activeVine = null;
          }
          this.vines.splice(i, 1);
        }
      }

      for (let i = this.treasuresList.length - 1; i >= 0; i--) {
        const t = this.treasuresList[i];
        t.x -= worldDx;
        t.phase += dt * 4.2;
        t.y = t.baseY + Math.sin(t.phase) * 4;

        if (!t.collected) {
          const pcx = p.x + p.w * 0.5;
          const pcy = p.y + p.h * 0.5;
          if (Math.hypot(pcx - t.x, pcy - t.y) < t.r + Math.min(p.w, p.h) * 0.58) {
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
        if (t.x < -30) this.treasuresList.splice(i, 1);
      }

      const hitBox = {
        x: p.x + 5,
        y: p.y + 4,
        w: p.w - 10,
        h: p.h - 6
      };

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const o = this.obstacles[i];
        o.x += (o.vx - this.scrollSpeed) * dt;
        if (o.kind === "log") {
          o.rot -= ((this.scrollSpeed - o.vx) * dt) / 11;
        } else if (o.kind === "jelly" || o.kind === "fish" || o.kind === "bird") {
          o.phase += dt * 4.2;
          o.y = o.baseY + Math.sin(o.phase) * 10;
        }

        if (!o.hit) {
          let collides = false;
          if (o.kind === "pit") {
            const feetY = p.y + p.h;
            if (!p.onPlatform && feetY >= groundY - 2 && p.x + p.w - 6 > o.x + 6 && p.x + 6 < o.x + o.w - 6) {
              collides = true;
            }
          } else {
            collides =
              hitBox.x < o.x + o.w - 3 &&
              hitBox.x + hitBox.w > o.x + 3 &&
              hitBox.y < o.y + o.h - 2 &&
              hitBox.y + hitBox.h > o.y + 2;
          }

          if (collides) {
            o.hit = true;
            this.damagePanda(o.x + o.w / 2, o.y + o.h / 2);
            if (this.phase !== "playing") return;
          }
        }

        if (o.x + o.w < -70) this.obstacles.splice(i, 1);
      }

      if (Math.floor(this.distance) % 18 < Math.ceil(worldDx)) {
        this.score += 1;
        this.updateHud();
      }
    },

    drawJungleBackground(ctx, w, h, groundY) {
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, "#072214");
      sky.addColorStop(0.5, "#0f3f25");
      sky.addColorStop(1, "#185934");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      ctx.save();
      for (let i = 0; i < 4; i++) {
        const beamX = ((i * 210 - (this.distance * 0.12) % 210) + w + 210) % (w + 210) - 90;
        const beamGrad = ctx.createLinearGradient(beamX, 0, beamX + 65, groundY);
        beamGrad.addColorStop(0, "rgba(253, 224, 71, 0.13)");
        beamGrad.addColorStop(1, "rgba(74, 222, 128, 0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(beamX, 0);
        ctx.lineTo(beamX + 52, 0);
        ctx.lineTo(beamX + 125, groundY);
        ctx.lineTo(beamX + 38, groundY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      const farOffset = (this.distance * 0.16) % 160;
      ctx.fillStyle = "#0b321e";
      for (let x = -farOffset - 80; x < w + 180; x += 160) {
        ctx.beginPath();
        ctx.arc(x + 80, groundY - 18, 98, Math.PI, 0);
        ctx.fill();
      }

      const midOffset = (this.distance * 0.38) % 135;
      for (let x = -midOffset - 70; x < w + 160; x += 135) {
        ctx.fillStyle = "#3b2314";
        ctx.fillRect(x + 28, 22, 14, groundY - 22);
        ctx.fillStyle = "#14532d";
        ctx.beginPath();
        ctx.arc(x + 35, 32, 36, 0, Math.PI * 2);
        ctx.arc(x + 10, 44, 25, 0, Math.PI * 2);
        ctx.arc(x + 60, 44, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(x + 35, 26, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      const fernStep = 76;
      const fOff = (this.distance * 0.75) % fernStep;
      for (let fx = -fOff - 30; fx < w + fernStep; fx += fernStep) {
        ctx.fillStyle = "#15803d";
        for (let a = -0.8; a <= 0.8; a += 0.4) {
          ctx.save();
          ctx.translate(fx, groundY - 3);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.ellipse(0, -14, 5, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.arc(fx + 26, groundY - 6, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const canopyOffset = (this.distance * 0.65) % 58;
      ctx.fillStyle = "#061b10";
      for (let x = -canopyOffset - 32; x < w + 64; x += 58) {
        ctx.beginPath();
        ctx.arc(x + 29, 4, 34, 0, Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = "#15803d";
      for (let x = -canopyOffset - 24; x < w + 64; x += 58) {
        ctx.beginPath();
        ctx.arc(x + 29, 0, 24, 0, Math.PI);
        ctx.fill();
      }

      const earthGrad = ctx.createLinearGradient(0, groundY, 0, h);
      earthGrad.addColorStop(0, "#3b2314");
      earthGrad.addColorStop(1, "#180d07");
      ctx.fillStyle = earthGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      ctx.fillStyle = "#22c55e";
      ctx.fillRect(0, groundY - 4, w, 9);

      const grassStep = 20;
      const gOff = this.distance % grassStep;
      ctx.fillStyle = "#4ade80";
      for (let gx = -gOff; gx < w + grassStep; gx += grassStep) {
        ctx.beginPath();
        ctx.moveTo(gx, groundY - 3);
        ctx.lineTo(gx + 5, groundY - 12);
        ctx.lineTo(gx + 10, groundY - 3);
        ctx.closePath();
        ctx.fill();
      }
    },

    drawWaterBackground(ctx, w, h, groundY, surfaceY) {
      const airSky = ctx.createLinearGradient(0, 0, 0, surfaceY);
      airSky.addColorStop(0, "#0c4a6e");
      airSky.addColorStop(1, "#38bdf8");
      ctx.fillStyle = airSky;
      ctx.fillRect(0, 0, w, surfaceY);

      const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, groundY);
      waterGrad.addColorStop(0, "#0284c7");
      waterGrad.addColorStop(0.55, "#0369a1");
      waterGrad.addColorStop(1, "#082f49");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, surfaceY, w, groundY - surfaceY);

      ctx.save();
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 190 - (this.distance * 0.15) % 190) + w + 190) % (w + 190) - 60;
        const grad = ctx.createLinearGradient(bx, surfaceY, bx + 40, groundY);
        grad.addColorStop(0, "rgba(186, 230, 253, 0.22)");
        grad.addColorStop(1, "rgba(186, 230, 253, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(bx, surfaceY);
        ctx.lineTo(bx + 36, surfaceY);
        ctx.lineTo(bx + 85, groundY);
        ctx.lineTo(bx + 20, groundY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= w + 16; x += 16) {
        const wy = surfaceY + Math.sin((x + this.distance * 0.4) * 0.05) * 3.5;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();

      const weedStep = 64;
      const wOff = (this.distance * 0.5) % weedStep;
      for (let x = -wOff; x < w + weedStep; x += weedStep) {
        const sway = Math.sin(this.animClock * 2.5 + x * 0.05) * 7;
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x + 20, groundY);
        ctx.quadraticCurveTo(x + 20 + sway * 0.5, groundY - 26, x + 20 + sway, groundY - 52);
        ctx.stroke();
      }

      ctx.fillStyle = "#b45309";
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(0, groundY - 2, w, 6);

      const barW = 140;
      const barH = 9;
      const barX = 14;
      const barY = surfaceY + 12;
      const ratio = Math.max(0, Math.min(1, this.air / this.maxAir));
      ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = ratio > 0.35 ? "#38bdf8" : "#fb7185";
      ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, barH - 2);
      ctx.fillStyle = "#f0f9ff";
      ctx.font = "bold 9px Orbitron, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("LUFT (OBEN AUFTAUCHEN)", barX, barY + barH + 11);
    },

    drawBalloonBackground(ctx, w, h, groundY) {
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, "#1d4ed8");
      sky.addColorStop(0.55, "#38bdf8");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      const cloudStep = 170;
      const cOff = (this.distance * 0.22) % cloudStep;
      ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
      for (let x = -cOff - 60; x < w + cloudStep; x += cloudStep) {
        const cy = 54 + ((Math.floor((x + this.distance * 0.22) / cloudStep) % 2) * 32);
        ctx.beginPath();
        ctx.arc(x, cy, 18, 0, Math.PI * 2);
        ctx.arc(x + 16, cy - 5, 22, 0, Math.PI * 2);
        ctx.arc(x + 34, cy, 17, 0, Math.PI * 2);
        ctx.fill();
      }

      const treeStep = 72;
      const tOff = (this.distance * 0.55) % treeStep;
      ctx.fillStyle = "#14532d";
      for (let x = -tOff - 40; x < w + treeStep; x += treeStep) {
        ctx.beginPath();
        ctx.arc(x + 36, groundY + 4, 42, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = "#16a34a";
      for (let x = -tOff - 20; x < w + treeStep; x += treeStep) {
        ctx.beginPath();
        ctx.arc(x + 20, groundY + 8, 30, Math.PI, 0);
        ctx.fill();
      }

      ctx.fillStyle = "#062414";
      ctx.fillRect(0, groundY, w, h - groundY);
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
        ctx.fillStyle = "#365314";
        ctx.beginPath();
        ctx.ellipse(v.x, v.topY + 4, 11, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#a3e635";
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(v.x, v.topY);
        ctx.quadraticCurveTo(ctrlPt.x, ctrlPt.y, endPt.x, endPt.y);
        ctx.stroke();

        ctx.fillStyle = "#84cc16";
        for (let y = v.topY + 22; y < v.botY - 10; y += 24) {
          const pt = this.getVinePointAtY(v, y);
          ctx.beginPath();
          ctx.ellipse(pt.x - 6, pt.y, 5.5, 2.5, -0.45, 0, Math.PI * 2);
          ctx.ellipse(pt.x + 6, pt.y + 6, 5.5, 2.5, 0.45, 0, Math.PI * 2);
          ctx.fill();
        }

        if (v.hasGem && !v.gemCollected) {
          const gemY = v.topY + 46;
          const gemPt = this.getVinePointAtY(v, gemY);
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.moveTo(gemPt.x, gemPt.y - 8);
          ctx.lineTo(gemPt.x + 7, gemPt.y);
          ctx.lineTo(gemPt.x, gemPt.y + 8);
          ctx.lineTo(gemPt.x - 7, gemPt.y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    },

    drawTreasures(ctx) {
      for (const t of this.treasuresList) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.fillStyle = "rgba(250, 204, 21, 0.16)";
        ctx.beginPath();
        ctx.arc(0, 0, t.r + 5, 0, Math.PI * 2);
        ctx.fill();

        if (t.type === "bamboo") {
          ctx.fillStyle = "#4ade80";
          ctx.strokeStyle = "#15803d";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-9, -5, 18, 10, 3);
          ctx.fill();
          ctx.stroke();
        } else if (t.type === "coin") {
          ctx.fillStyle = "#facc15";
          ctx.strokeStyle = "#ca8a04";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, t.r * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "#f43f5e";
          ctx.strokeStyle = "#fda4af";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -t.r);
          ctx.lineTo(t.r * 0.85, 0);
          ctx.lineTo(0, t.r);
          ctx.lineTo(-t.r * 0.85, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    drawObstacles(ctx, groundY) {
      for (const o of this.obstacles) {
        ctx.save();
        if (o.kind === "pit") {
          ctx.fillStyle = "#060b08";
          ctx.fillRect(o.x, groundY - 4, o.w, o.h + 6);
          ctx.fillStyle = "#16a34a";
          ctx.fillRect(o.x - 2, groundY - 4, 6, 6);
          ctx.fillRect(o.x + o.w - 4, groundY - 4, 6, 6);
        } else if (o.kind === "log") {
          const cx = o.x + o.w / 2;
          const cy = o.y + o.h / 2;
          ctx.translate(cx, cy);
          ctx.rotate(o.rot);
          ctx.fillStyle = "#92400e";
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-o.w / 2, -o.h / 2, o.w, o.h, 8);
          ctx.fill();
          ctx.stroke();
        } else if (o.kind === "branch") {
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.roundRect(o.x, o.y, o.w, o.h * 0.65, 6);
          ctx.fill();
          ctx.fillStyle = "#16a34a";
          ctx.beginPath();
          ctx.ellipse(o.x + o.w * 0.25, o.y + o.h * 0.72, 14, 6, 0.2, 0, Math.PI * 2);
          ctx.ellipse(o.x + o.w * 0.72, o.y + o.h * 0.72, 15, 6, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "croc") {
          ctx.translate(o.x, o.y);
          ctx.fillStyle = "#a855f7";
          ctx.strokeStyle = "#f5d0fe";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(0, 6, o.w, o.h - 6, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#e879f9";
          ctx.beginPath();
          ctx.moveTo(14, 6);
          ctx.lineTo(18, 0);
          ctx.lineTo(22, 6);
          ctx.lineTo(26, 0);
          ctx.lineTo(30, 6);
          ctx.lineTo(34, 0);
          ctx.lineTo(38, 6);
          ctx.fill();

          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(10, 7, 3.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#090d16";
          ctx.beginPath();
          ctx.arc(9.2, 7, 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "jelly") {
          const pulse = Math.sin(o.phase) * 2.5;
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          ctx.strokeStyle = "#e879f9";
          ctx.lineWidth = 2.2;
          ctx.lineCap = "round";
          for (const tx of [-7, -2.5, 2.5, 7]) {
            ctx.beginPath();
            ctx.moveTo(tx, 1);
            ctx.quadraticCurveTo(tx + pulse, 7, tx - pulse * 0.6, 13);
            ctx.stroke();
          }
          ctx.fillStyle = "#c026d3";
          ctx.strokeStyle = "#fae8ff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 1, 11.5, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#fdf4ff";
          ctx.beginPath();
          ctx.arc(-4, -4, 2, 0, Math.PI * 2);
          ctx.arc(3, -4, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "fish") {
          const tailWag = Math.sin(o.phase * 2.4) * 5;
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);

          ctx.fillStyle = "#f97316";
          ctx.strokeStyle = "#ffedd5";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(18, -8 + tailWag);
          ctx.lineTo(18, 8 + tailWag);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ef4444";
          ctx.strokeStyle = "#fee2e2";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(-1, 0, 13, 8.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#fb923c";
          ctx.beginPath();
          ctx.moveTo(-4, -8);
          ctx.lineTo(2, -13);
          ctx.lineTo(6, -7);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(-8, -2, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#090d16";
          ctx.beginPath();
          ctx.arc(-8.8, -2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.kind === "storm") {
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          ctx.fillStyle = "#475569";
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(-10, 2, 9, 0, Math.PI * 2);
          ctx.arc(2, -2, 12, 0, Math.PI * 2);
          ctx.arc(13, 2, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (o.kind === "bird") {
          const flap = Math.sin(o.phase * 2.2) * 7;
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-2, -2);
          ctx.lineTo(-10, -2 + flap);
          ctx.moveTo(2, -2);
          ctx.lineTo(10, -2 + flap);
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    drawBalloonAbovePanda(ctx, cx, headY) {
      const sway = Math.sin(this.animClock * 4.5) * 5;
      const bx = cx + sway;
      const by = headY - 28;

      ctx.save();
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(bx, by + 13);
      ctx.quadraticCurveTo(cx + sway * 0.4, (by + headY) * 0.5, cx, headY - 8);
      ctx.stroke();

      ctx.fillStyle = this.balloonColor;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(bx, by, 12, 14, sway * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.ellipse(bx - 4, by - 5, 3, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawCutePanda(ctx) {
      const p = this.panda;
      if (this.invulnTimer > 0 && Math.floor(this.animClock * 18) % 2 === 0) {
        return;
      }

      ctx.save();
      const cx = p.x + p.w * 0.5;

      if (p.crouching && this.mode === "jungle") {
        const cy = p.y + p.h * 0.55;
        ctx.translate(cx, cy);

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(-11, -9, 5.5, 0, Math.PI * 2);
        ctx.arc(3, -10, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(-2, 2, 16, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(7, -2, 11.5, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.ellipse(6, -3, 3.3, 4.2, -0.2, 0, Math.PI * 2);
        ctx.ellipse(13, -3, 3.3, 4.2, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(6.8, -4.2, 1.3, 0, Math.PI * 2);
        ctx.arc(13.8, -4.2, 1.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#fda4af";
        ctx.beginPath();
        ctx.ellipse(4, 1.5, 2.8, 1.6, 0, 0, Math.PI * 2);
        ctx.ellipse(15, 1.5, 2.8, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(10.5, 0.5, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const headY = p.y + 11;
        const bodyY = p.y + 25;
        const legSwing = Math.sin(p.runCycle) * 5.5;

        if (this.mode === "balloon") {
          this.drawBalloonAbovePanda(ctx, cx, headY);
        }

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.ellipse(cx - 4 - legSwing * 0.6, p.y + p.h - 3, 5.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(cx, bodyY, 11.5, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.roundRect(cx - 10.5, bodyY - 6, 21, 6.5, 3);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(cx + 5 + legSwing * 0.6, p.y + p.h - 3, 5.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(cx - 10, headY - 9, 6, 0, Math.PI * 2);
        ctx.arc(cx + 10, headY - 9, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, headY, 12.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.ellipse(cx - 4.5, headY - 1, 3.4, 4.4, -0.25, 0, Math.PI * 2);
        ctx.ellipse(cx + 4.5, headY - 1, 3.4, 4.4, 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx - 3.7, headY - 2.3, 1.4, 0, Math.PI * 2);
        ctx.arc(cx + 5.3, headY - 2.3, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#fda4af";
        ctx.beginPath();
        ctx.ellipse(cx - 7.5, headY + 3.5, 3, 1.7, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 7.5, headY + 3.5, 3, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(cx, headY + 2.5, 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx - 2, headY + 4.2, 2.2, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.arc(cx + 2, headY + 4.2, 2.2, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }

      ctx.restore();
    },

    draw() {
      if (!this.canvasCtx) return;
      const ctx = this.canvasCtx;
      const w = this.field.w || 640;
      const h = this.field.h || 360;
      const groundY = this.field.groundY || Math.round(h * 0.84);
      const surfaceY = this.field.surfaceY || Math.round(h * 0.22);

      ctx.clearRect(0, 0, w, h);

      if (this.mode === "jungle") {
        this.drawJungleBackground(ctx, w, h, groundY);
        this.drawVines(ctx);
        this.drawPlatforms(ctx);
      } else if (this.mode === "water") {
        this.drawWaterBackground(ctx, w, h, groundY, surfaceY);
      } else {
        this.drawBalloonBackground(ctx, w, h, groundY);
      }

      this.drawObstacles(ctx, groundY);
      this.drawTreasures(ctx);
      this.drawCutePanda(ctx);

      if (this.mode === "water") {
        ctx.save();
        ctx.strokeStyle = "rgba(224, 242, 254, 0.7)";
        ctx.lineWidth = 1.3;
        for (const b of this.bubbles) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
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
      this.resize();
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
      this.resize();
    },

    destroy() {
      this.paused = true;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
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