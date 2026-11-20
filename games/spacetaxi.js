(() => {
  "use strict";

  const THEMED_NAMES = [
    "Short 'n Sweet",
    "On the Move",
    "Skyline Hop",
    "Twin Pads",
    "Fuel Stop",
    "Crossfire",
    "Shift-o-Rama",
    "Pendulum Alley",
    "Asteroid Drift",
    "Narrow Gap",
    "Magnetic Pull",
    "Night Courier",
    "Minefield Approach",
    "Shooting Stars",
    "High Tower",
    "Crosswind",
    "Reactor Core",
    "Hazard Loop",
    "Starlight Express",
    "Final Shift"
  ];

  const STARS = [
    { x: 0.08, y: 0.12, r: 1.2, phase: 0.2 },
    { x: 0.23, y: 0.07, r: 1.6, phase: 1.1 },
    { x: 0.41, y: 0.16, r: 1.1, phase: 2.0 },
    { x: 0.63, y: 0.09, r: 1.5, phase: 0.7 },
    { x: 0.84, y: 0.14, r: 1.3, phase: 1.8 },
    { x: 0.92, y: 0.29, r: 1.1, phase: 2.6 },
    { x: 0.16, y: 0.38, r: 1.2, phase: 1.4 },
    { x: 0.52, y: 0.27, r: 1.4, phase: 0.4 },
    { x: 0.77, y: 0.49, r: 1.1, phase: 2.2 },
    { x: 0.29, y: 0.69, r: 1.3, phase: 1.0 }
  ];

  function createSeededRandom(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function generateLevelSpec(levelNumber, shiftMode, runSeed) {
    const idx = levelNumber - 1;
    const isNightShift = shiftMode === "night";
    const isRandomShift = shiftMode === "random";

    const difficulty = Math.min(1, (idx / 19) * (isNightShift ? 1.2 : 1.0));
    const rng = isRandomShift
      ? createSeededRandom(runSeed + levelNumber * 7919)
      : createSeededRandom((isNightShift ? 50000 : 10000) + levelNumber * 104729);

    const baseName = THEMED_NAMES[idx % THEMED_NAMES.length];
    const title = isRandomShift
      ? `${levelNumber}/20 • ${baseName} (Zufall)`
      : `${levelNumber}/20 • ${baseName}`;

    const padCount = levelNumber <= 3 ? 2 : levelNumber <= 10 ? 3 : 4;
    const platforms = [
      {
        id: "A",
        label: "PAD A",
        xRatio: 0.08 + rng() * 0.08,
        yRatio: 0.80 + rng() * 0.05,
        wRatio: Math.max(0.18, 0.24 - difficulty * 0.05),
        fuel: false
      }
    ];

    const destCandidates = ["B", "C", "D"];
    for (let i = 1; i <= padCount; i++) {
      const id = destCandidates[i - 1] || `P${i}`;
      const colBand = i % 2 === 1 ? 0.56 + rng() * 0.16 : 0.12 + rng() * 0.18;
      const rowBand = 0.24 + ((i - 1) / Math.max(1, padCount)) * 0.46 + (rng() - 0.5) * 0.06;
      platforms.push({
        id,
        label: `PAD ${id}`,
        xRatio: Math.max(0.06, Math.min(0.74, colBand)),
        yRatio: Math.max(0.20, Math.min(0.78, rowBand)),
        wRatio: Math.max(0.17, 0.23 - difficulty * 0.05),
        fuel: false
      });
    }

    if (levelNumber >= 2) {
      platforms.push({
        id: "F",
        label: "FUEL",
        xRatio: 0.34 + (rng() - 0.5) * 0.28,
        yRatio: 0.32 + (rng() - 0.5) * 0.18,
        wRatio: Math.max(0.18, 0.23 - difficulty * 0.04),
        fuel: true
      });
    }

    const staticCount = levelNumber === 1 ? 0 : Math.min(5, 1 + Math.floor(levelNumber / 4) + (isNightShift ? 1 : 0));
    const obstacles = [];
    for (let i = 0; i < staticCount; i++) {
      obstacles.push({
        xRatio: 0.18 + rng() * 0.54,
        yRatio: 0.22 + ((i + 0.5) / Math.max(1, staticCount)) * 0.52,
        wRatio: Math.max(0.12, 0.22 - difficulty * 0.06),
        hRatio: 0.032 + (rng() > 0.65 ? 0.012 : 0)
      });
    }

    const movers = [];
    const moverCount = levelNumber < 4 ? 0 : Math.min(3, 1 + Math.floor((levelNumber - 4) / 6) + (isNightShift ? 1 : 0));
    for (let i = 0; i < moverCount; i++) {
      const horiz = i % 2 === 0;
      const baseX = 0.28 + rng() * 0.40;
      const baseY = 0.30 + rng() * 0.40;
      movers.push({
        horiz,
        xRatio: baseX,
        yRatio: baseY,
        wRatio: horiz ? Math.max(0.12, 0.17 - difficulty * 0.04) : 0.032,
        hRatio: horiz ? 0.032 : Math.max(0.08, 0.13 - difficulty * 0.03),
        ampRatio: 0.08 + difficulty * 0.07,
        speed: (1.1 + difficulty * 1.3) * (rng() < 0.5 ? -1 : 1),
        phase: rng() * Math.PI * 2
      });
    }

    const hazardCount = levelNumber <= 2 ? 1 : Math.min(6, 1 + Math.floor(levelNumber / 3.5) + (isNightShift ? 1 : 0));
    const hazards = [];
    for (let i = 0; i < hazardCount; i++) {
      hazards.push({
        kind: i % 2 === 0 ? "mine" : "comet",
        xRatio: 0.15 + rng() * 0.7,
        yRatio: 0.14 + rng() * 0.58,
        r: Math.max(8, 11 - difficulty * 2),
        vxRatio: ((0.10 + difficulty * 0.16) * (rng() < 0.5 ? -1 : 1)),
        vyRatio: ((0.05 + difficulty * 0.11) * (rng() < 0.5 ? -1 : 1)),
        spin: (1.8 + difficulty * 2.5) * (rng() < 0.5 ? -1 : 1)
      });
    }

    const magnets = [];
    const hasMagnets = levelNumber >= 5 || ((isNightShift || isRandomShift) && levelNumber >= 4);
    if (hasMagnets) {
      const magCount = levelNumber >= 13 ? 2 : 1;
      for (let i = 0; i < magCount; i++) {
        magnets.push({
          xRatio: magCount === 1 ? 0.48 + (rng() - 0.5) * 0.24 : 0.26 + i * 0.46 + (rng() - 0.5) * 0.10,
          yRatio: 0.36 + (rng() - 0.5) * 0.22,
          rRatio: 0.19,
          pullStrength: (0.75 + difficulty * 0.55) * (rng() < 0.5 ? -1 : 1)
        });
      }
    }

    const jobCount = levelNumber <= 2 ? 1 : levelNumber <= 8 ? 2 : 3;
    const jobs = [];
    let currentPickup = "A";
    for (let j = 0; j < jobCount; j++) {
      const isLast = j === jobCount - 1;
      const targetPad = platforms[(j + 1) % Math.max(2, padCount + 1)];
      const dest = isLast ? "NEXT" : (targetPad && targetPad.id !== currentPickup ? targetPad.id : "B");
      jobs.push({
        pickup: currentPickup,
        dest,
        reward: Math.round((35 + levelNumber * 6 + j * 12) * (isNightShift ? 1.25 : 1.0))
      });
      currentPickup = dest === "NEXT" ? "A" : dest;
    }

    return {
      levelNumber,
      name: title,
      fuelCostPerUnit: Math.min(0.24, 0.13 + difficulty * 0.08),
      platforms,
      obstacles,
      movers,
      hazards,
      magnets,
      jobs
    };
  }

  window.GAME_REGISTRY?.register({
    id: "spacetaxi",
    name: "Space Taxi",
    subtitle: "20 Level pro Schicht • Filigrane Hindernisse, Magnete & Sanfte Landung",
    tag: "Retro Arcade",
    icon: "🚕",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.animClock = 0;
      this.paused = false;
      this.phase = "menu"; // menu | playing | gameover | victory

      this.shiftMode = "day"; // day | night | random
      this.totalLevels = 20;
      this.runSeed = Date.now() & 0xfffffff;
      this.levelCache = new Map();

      this.cash = 0;
      this.bestCash = ctx.storage.get("best_cash", 0);
      this.taxis = 3;
      this.levelIndex = 0;
      this.jobIndex = 0;

      this.field = { x: 0, y: 0, w: 340, h: 520 };
      this.platforms = [];
      this.obstacles = [];
      this.movers = [];
      this.hazards = [];
      this.magnets = [];
      this.activeMagnetTethers = [];
      this.particles = [];
      this.speechText = "";
      this.speechTimer = 0;

      this.taxi = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        w: 36,
        h: 17,
        facing: 1,
        thrustActive: false,
        gearDown: true,
        fuel: 100,
        refuelPaid: false,
        passenger: null,
        landedPlatform: null,
        safeLanding: false,
        crashCooldown: 0,
        launchGraceTimer: 2.5
      };

      this.keys = { up: false, down: false, left: false, right: false };
      this.thrustVec = { x: 0, y: 0 };
      this.dragPointerId = null;
      this.dragStart = null;

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex flex-col items-center justify-center p-1.5 sm:p-2 bg-[#04040a] overflow-hidden";

      this.hud = document.createElement("div");
      this.hud.className = "w-full max-w-[460px] flex items-center justify-between gap-1.5 mb-1 px-1 font-orbitron text-[10px] sm:text-xs";

      this.statusLine = document.createElement("div");
      this.statusLine.className = "w-full max-w-[460px] flex items-center justify-between gap-1.5 mb-1 px-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-xl border border-cyan-500/30 bg-slate-950/90 touch-none";
      this.canvasCtx = this.canvas.getContext("2d");

      this.controlsBar = document.createElement("div");
      this.controlsBar.className = "w-full max-w-[460px] flex items-center justify-between gap-2 mt-1.5";
      this.controlsBar.innerHTML = `
        <div class="text-[10px] sm:text-[11px] text-slate-400 px-1 leading-tight">
          Ziehen = Schub • <span class="text-cyan-300 font-bold">Fahrwerk</span> vor Landung ausfahren
        </div>
        <button
          id="taxi-gear-btn"
          type="button"
          class="shrink-0 px-3 py-2 rounded-xl font-orbitron text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition"
        >
          Fahrwerk: AN
        </button>
      `;

      this.overlay = document.createElement("div");
      this.overlay.className = "absolute inset-0 z-10 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4";

      this.root.appendChild(this.hud);
      this.root.appendChild(this.statusLine);
      this.root.appendChild(this.canvas);
      this.root.appendChild(this.controlsBar);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.gearBtn = this.controlsBar.querySelector("#taxi-gear-btn");
      this.onGearClick = () => {
        if (this.phase !== "playing" || this.paused) return;
        this.taxi.gearDown = !this.taxi.gearDown;
        this.ctx.sound.playHit();
        this.updateGearButton();
      };
      this.gearBtn?.addEventListener("click", this.onGearClick);

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

      this.updateGearButton();
      this.resize();
      this.renderShiftMenu();
    },

    renderShiftMenu() {
      const modes = [
        { id: "day", label: "Tagschicht (20 Lvl)", desc: "Steigende Hindernisse & Minen" },
        { id: "night", label: "Nachtschicht (20 Lvl)", desc: "Schneller + Magnete & Pendel" },
        { id: "random", label: "Zufalls-Schicht (20 Lvl)", desc: "Jeder Run neu generiert" }
      ];

      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-sm rounded-2xl border border-cyan-400/35 bg-slate-900/95 p-5 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <h3 class="font-orbitron text-lg font-black text-center text-cyan-300 mb-1">SPACE TAXI • 20 LEVEL</h3>
          <p class="text-xs text-center text-slate-400 mb-4">Wähle deine Schicht (Best: $${this.bestCash})</p>

          <div class="space-y-2 mb-5">
            ${modes.map((m) => `
              <button
                type="button"
                data-shift="${m.id}"
                class="w-full text-left px-3.5 py-2.5 rounded-xl border transition ${
                  this.shiftMode === m.id
                    ? "bg-cyan-500/15 border-cyan-400 text-white"
                    : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-cyan-400/40"
                }"
              >
                <div class="font-orbitron text-xs font-bold ${this.shiftMode === m.id ? "text-cyan-300" : "text-white"}">${m.label}</div>
                <div class="text-[11px] text-slate-400">${m.desc}</div>
              </button>
            `).join("")}
          </div>

          <button
            type="button"
            data-action="start-shift"
            class="w-full py-3 rounded-xl font-orbitron text-sm font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 hover:opacity-95 transition"
          >
            Schicht starten
          </button>
        </div>
      `;

      this.overlay.querySelectorAll("[data-shift]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.shiftMode = btn.dataset.shift;
          this.ctx.sound.playHit();
          this.renderShiftMenu();
        });
      });

      this.overlay.querySelector('[data-action="start-shift"]')?.addEventListener("click", () => {
        this.ctx.sound.playScore();
        this.startShift();
      });
    },

    startShift() {
      this.overlay.classList.add("hidden");
      this.phase = "playing";
      this.cash = 0;
      this.taxis = 3;
      this.runSeed = (Date.now() ^ Math.floor(Math.random() * 1000000)) >>> 0;
      this.levelCache.clear();
      this.loadLevel(0, true);
    },

    getCurrentLevelSpec() {
      const levelNumber = this.levelIndex + 1;
      if (!this.levelCache.has(levelNumber)) {
        this.levelCache.set(levelNumber, generateLevelSpec(levelNumber, this.shiftMode, this.runSeed));
      }
      return this.levelCache.get(levelNumber);
    },

    getCurrentJob() {
      const spec = this.getCurrentLevelSpec();
      return spec.jobs[this.jobIndex] || null;
    },

    setSpeech(text, duration = 2.0) {
      this.speechText = text;
      this.speechTimer = duration;
    },

    updateGearButton() {
      if (!this.gearBtn) return;
      if (this.taxi.gearDown) {
        this.gearBtn.textContent = "Fahrwerk: AN";
        this.gearBtn.className =
          "shrink-0 px-3 py-2 rounded-xl font-orbitron text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-green-400 bg-green-500/20 text-green-300 transition";
      } else {
        this.gearBtn.textContent = "Fahrwerk: AUS";
        this.gearBtn.className =
          "shrink-0 px-3 py-2 rounded-xl font-orbitron text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border border-slate-700 bg-slate-900 text-slate-300 transition";
      }
    },

    updateHud() {
      const fuelPct = Math.max(0, Math.round(this.taxi.fuel));
      const fuelColor = fuelPct > 30 ? "text-green-400" : fuelPct > 12 ? "text-yellow-300" : "text-rose-400";
      this.hud.innerHTML = `
        <span class="text-yellow-300">$${this.cash}</span>
        <span class="${fuelColor}">TANK ${fuelPct}%</span>
        <span class="text-cyan-300">TAXIS ${Math.max(0, this.taxis)}</span>
        <span class="text-fuchsia-300">BEST $${this.bestCash}</span>
      `;

      const spec = this.getCurrentLevelSpec();
      const job = this.getCurrentJob();
      let missionText = spec.name;
      if (this.taxi.launchGraceTimer > 0 && this.taxi.landedPlatform) {
        missionText += ` • Bereit (${this.taxi.launchGraceTimer.toFixed(1)}s)`;
      } else if (job) {
        if (!this.taxi.passenger) {
          missionText += ` • Gast: ${job.pickup}`;
        } else {
          const tip = Math.max(5, Math.round(job.reward * (this.taxi.passenger.tipFactor || 1)));
          missionText += ` • Ziel: ${job.dest} (+$${tip})`;
        }
      }

      const lamp = this.taxi.landedPlatform
        ? (this.taxi.safeLanding ? `<span class="shrink-0 text-green-400">● OK</span>` : `<span class="shrink-0 text-rose-400">● HART</span>`)
        : `<span class="shrink-0 text-slate-500">○ FLUG</span>`;

      this.statusLine.innerHTML = `<span class="truncate">${missionText}</span>${lamp}`;
    },

    resize() {
      if (!this.root || !this.canvas) return;
      const rect = this.root.getBoundingClientRect();
      const hudH = this.hud.getBoundingClientRect().height || 20;
      const lineH = this.statusLine.getBoundingClientRect().height || 16;
      const barH = this.controlsBar.getBoundingClientRect().height || 38;
      const availW = Math.max(220, rect.width - 10);
      const availH = Math.max(240, rect.height - hudH - lineH - barH - 18);

      const w = Math.min(availW, 460);
      const h = availH;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.field = { x: 0, y: 0, w, h };
      this.taxi.w = Math.max(30, Math.min(42, w * 0.088));
      this.taxi.h = Math.max(15, Math.min(21, this.taxi.w * 0.48));

      this.layoutStageEntities();
    },

    layoutStageEntities() {
      const spec = this.getCurrentLevelSpec();
      const w = this.field.w || 340;
      const h = this.field.h || 500;

      this.platforms = spec.platforms.map((p) => ({
        ...p,
        x: p.xRatio * w,
        y: p.yRatio * h,
        w: Math.max(54, p.wRatio * w),
        h: 8
      }));

      this.obstacles = (spec.obstacles || []).map((o) => ({
        x: o.xRatio * w,
        y: o.yRatio * h,
        w: Math.max(40, o.wRatio * w),
        h: Math.max(11, o.hRatio * h)
      }));

      this.movers = (spec.movers || []).map((m, i) => {
        const existing = this.movers[i];
        return {
          ...m,
          baseX: m.xRatio * w,
          baseY: m.yRatio * h,
          x: existing ? existing.x : m.xRatio * w,
          y: existing ? existing.y : m.yRatio * h,
          w: Math.max(16, m.wRatio * w),
          h: Math.max(11, m.hRatio * h),
          ampPx: m.ampRatio * (m.horiz ? w : h)
        };
      });

      this.magnets = (spec.magnets || []).map((mg) => ({
        ...mg,
        x: mg.xRatio * w,
        y: mg.yRatio * h,
        r: Math.max(52, mg.rRatio * Math.min(w, h))
      }));

      for (let i = 0; i < this.hazards.length; i++) {
        const hz = this.hazards[i];
        const src = spec.hazards?.[i];
        if (src) {
          hz.r = src.r || 9;
          hz.vx = src.vxRatio * w;
          hz.vy = src.vyRatio * h;
          hz.spin = src.spin || 2;
        }
      }

      if (!this.taxiInitialized) {
        this.placeTaxiOnStartPad();
        this.taxiInitialized = true;
      } else if (this.taxi.landedPlatform) {
        const matched = this.platforms.find((p) => p.id === this.taxi.landedPlatform.id);
        if (matched) {
          this.taxi.landedPlatform = matched;
          this.taxi.x = matched.x + matched.w / 2 - this.taxi.w / 2;
          this.taxi.y = matched.y - this.taxi.h;
        }
      } else {
        this.taxi.x = Math.max(8, Math.min(w - this.taxi.w - 8, this.taxi.x));
        this.taxi.y = Math.max(8, Math.min(h - this.taxi.h - 8, this.taxi.y));
      }
    },

    placeTaxiOnStartPad() {
      const startPad = this.platforms.find((p) => p.id === "A") || this.platforms[0];
      if (startPad) {
        this.taxi.x = startPad.x + startPad.w / 2 - this.taxi.w / 2;
        this.taxi.y = startPad.y - this.taxi.h;
        this.taxi.landedPlatform = startPad;
        this.taxi.safeLanding = true;
      } else {
        this.taxi.x = (this.field.w || 340) / 2 - this.taxi.w / 2;
        this.taxi.y = 40;
        this.taxi.landedPlatform = null;
        this.taxi.safeLanding = false;
      }
      this.taxi.vx = 0;
      this.taxi.vy = 0;
      this.taxi.facing = 1;
      this.taxi.thrustActive = false;
      this.taxi.gearDown = true;
      this.taxi.refuelPaid = false;
      this.taxi.launchGraceTimer = 2.5;
      this.updateGearButton();
    },

    loadLevel(idx, resetFuel = false) {
      this.levelIndex = idx;
      this.jobIndex = 0;
      this.taxi.passenger = null;
      this.taxi.vx = 0;
      this.taxi.vy = 0;
      this.particles = [];
      this.activeMagnetTethers = [];

      if (resetFuel) {
        this.taxi.fuel = 100;
      }

      const spec = this.getCurrentLevelSpec();
      const w = this.field.w || 340;
      const h = this.field.h || 500;
      this.hazards = (spec.hazards || []).map((hz, i) => ({
        kind: hz.kind || (i % 2 === 0 ? "mine" : "comet"),
        x: hz.xRatio * w,
        y: hz.yRatio * h,
        r: hz.r || 9,
        vx: hz.vxRatio * w,
        vy: hz.vyRatio * h,
        spin: hz.spin || 2,
        angle: i * 0.9
      }));

      this.taxiInitialized = false;
      this.layoutStageEntities();
      this.setSpeech(spec.name, 2.2);
      this.updateHud();
    },

    spawnParticles(x, y, color, count = 14) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 140;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          color,
          size: 2 + Math.random() * 2.5
        });
      }
    },

    handleKeyDown(e) {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.keys.up = true;
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.keys.down = true;
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = true;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = true;
      else if (e.key === " ") {
        e.preventDefault();
        if (this.phase === "playing" && !this.paused) {
          this.taxi.gearDown = !this.taxi.gearDown;
          this.ctx.sound.playHit();
          this.updateGearButton();
        }
      }
    },

    handleKeyUp(e) {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.keys.up = false;
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.keys.down = false;
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = false;
    },

    handlePointerDown(e) {
      if (this.phase !== "playing" || this.paused) return;
      this.canvas.setPointerCapture?.(e.pointerId);
      const rect = this.canvas.getBoundingClientRect();
      this.dragPointerId = e.pointerId;
      this.dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.thrustVec = { x: 0, y: 0 };
    },

    handlePointerMove(e) {
      if (e.pointerId !== this.dragPointerId || !this.dragStart) return;
      const rect = this.canvas.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      const maxPull = 40;
      const dx = Math.max(-maxPull, Math.min(maxPull, curX - this.dragStart.x));
      const dy = Math.max(-maxPull, Math.min(maxPull, curY - this.dragStart.y));
      this.thrustVec = { x: dx / maxPull, y: dy / maxPull };
    },

    handlePointerUp(e) {
      if (e.pointerId === this.dragPointerId) {
        this.dragPointerId = null;
        this.dragStart = null;
        this.thrustVec = { x: 0, y: 0 };
      }
    },

    saveBestCash() {
      if (this.cash > this.bestCash) {
        this.bestCash = this.cash;
        this.ctx.storage.set("best_cash", this.bestCash);
      }
    },

    crashTaxi(reason = "Absturz!") {
      if (this.taxi.crashCooldown > 0 || this.phase !== "playing") return;
      this.taxi.crashCooldown = 0.8;
      this.taxis -= 1;
      this.taxi.passenger = null;
      this.taxi.landedPlatform = null;
      this.taxi.thrustActive = false;
      this.activeMagnetTethers = [];
      this.setSpeech("CRASH!", 1.5);
      this.ctx.sound.playLose();
      this.spawnParticles(this.taxi.x + this.taxi.w / 2, this.taxi.y + this.taxi.h / 2, "#f43f5e", 24);
      this.updateHud();

      if (this.taxis <= 0) {
        this.phase = "gameover";
        this.saveBestCash();
        this.showEndModal("TAXI VERLOREN", `${reason} • Verdienst: $${this.cash}`);
        return;
      }

      this.taxi.fuel = Math.max(this.taxi.fuel, 80);
      this.placeTaxiOnStartPad();
      this.updateHud();
    },

    showEndModal(title, subtitle) {
      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-xs rounded-2xl border border-cyan-400/40 bg-slate-900/95 p-6 text-center shadow-[0_0_35px_rgba(34,211,238,0.2)]">
          <h3 class="font-orbitron text-xl font-black text-cyan-300 mb-1">${title}</h3>
          <p class="text-sm text-slate-300 mb-4">${subtitle}</p>
          <p class="text-xs text-slate-400 mb-5">Bester Verdienst: <strong class="text-fuchsia-300">$${this.bestCash}</strong></p>
          <div class="flex flex-col gap-2">
            <button type="button" data-action="restart" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition">
              Neue Schicht
            </button>
            <button type="button" data-action="menu" class="w-full py-2 rounded-xl font-bold uppercase tracking-wider text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
              Schicht wählen
            </button>
          </div>
        </div>
      `;
      this.overlay.querySelector('[data-action="restart"]')?.addEventListener("click", () => {
        this.startShift();
      });
      this.overlay.querySelector('[data-action="menu"]')?.addEventListener("click", () => {
        this.phase = "menu";
        this.renderShiftMenu();
      });
    },

    handleSafeLandingOnPad(pad, dt) {
      if (pad.fuel && this.taxi.fuel < 100) {
        if (!this.taxi.refuelPaid) {
          this.taxi.refuelPaid = true;
          this.cash = Math.max(0, this.cash - Math.min(this.cash, 2));
        }
        this.taxi.fuel = Math.min(100, this.taxi.fuel + 65 * dt);
      }

      const job = this.getCurrentJob();
      if (!job) return;

      if (!this.taxi.passenger && pad.id === job.pickup) {
        this.taxi.passenger = {
          destId: job.dest,
          tipFactor: 1.0
        };
        this.setSpeech(job.dest === "NEXT" ? "NEXT LEVEL!" : `TO ${job.dest}!`, 2.0);
        this.ctx.sound.playHit();
        this.updateHud();
        return;
      }

      if (this.taxi.passenger && (this.taxi.passenger.destId === pad.id || job.dest === "NEXT")) {
        const earned = Math.max(10, Math.round(job.reward * (this.taxi.passenger.tipFactor || 1)));
        this.cash += earned;
        this.saveBestCash();
        this.taxi.passenger = null;
        this.jobIndex += 1;
        this.setSpeech(`+$${earned}!`, 1.8);
        this.ctx.sound.playScore();

        const spec = this.getCurrentLevelSpec();
        if (this.jobIndex >= spec.jobs.length) {
          if (this.levelIndex + 1 < this.totalLevels) {
            this.loadLevel(this.levelIndex + 1, false);
            this.taxi.fuel = Math.min(100, this.taxi.fuel + 30);
          } else {
            this.phase = "victory";
            this.showEndModal("20 LEVEL GESCHAFFT!", `Schicht komplett • Verdienst: $${this.cash}`);
          }
        }
        this.updateHud();
      }
    },

    update(dt) {
      this.animClock += dt;

      if (this.speechTimer > 0) {
        this.speechTimer = Math.max(0, this.speechTimer - dt);
        if (this.speechTimer === 0) this.speechText = "";
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      if (this.phase !== "playing" || this.paused) return;

      const t = this.taxi;
      const w = this.field.w || 340;
      const h = this.field.h || 500;
      const spec = this.getCurrentLevelSpec();

      if (t.crashCooldown > 0) {
        t.crashCooldown = Math.max(0, t.crashCooldown - dt);
      }

      if (t.passenger && t.passenger.tipFactor > 0.4) {
        t.passenger.tipFactor = Math.max(0.4, t.passenger.tipFactor - dt * 0.025);
      }

      for (const mv of this.movers) {
        const offset = Math.sin(this.animClock * mv.speed + mv.phase) * mv.ampPx;
        if (mv.horiz) {
          mv.x = Math.max(10, Math.min(w - mv.w - 10, mv.baseX + offset));
        } else {
          mv.y = Math.max(12, Math.min(h - mv.h - 12, mv.baseY + offset));
        }
      }

      for (const hz of this.hazards) {
        hz.x += hz.vx * dt;
        hz.y += hz.vy * dt;
        hz.angle = (hz.angle || 0) + (hz.spin || 2) * dt;
        if (hz.x - hz.r < 6 || hz.x + hz.r > w - 6) hz.vx *= -1;
        if (hz.y - hz.r < 6 || hz.y + hz.r > h - 6) hz.vy *= -1;
      }

      let ax = this.thrustVec.x;
      let ay = this.thrustVec.y;
      if (this.keys.left) ax -= 1;
      if (this.keys.right) ax += 1;
      if (this.keys.up) ay -= 1;
      if (this.keys.down) ay += 1;

      if (Math.abs(ax) > 0.1) {
        t.facing = ax > 0 ? 1 : -1;
      }

      const mag = Math.hypot(ax, ay);
      if (mag > 1) {
        ax /= mag;
        ay /= mag;
      }

      if (t.landedPlatform) {
        this.activeMagnetTethers = [];
        if (t.launchGraceTimer > 0) {
          t.launchGraceTimer = Math.max(0, t.launchGraceTimer - dt);
        }
        this.handleSafeLandingOnPad(t.landedPlatform, dt);

        if (mag > 0.14 && t.fuel > 0) {
          t.landedPlatform = null;
          t.safeLanding = false;
          t.refuelPaid = false;
          t.launchGraceTimer = 0;
          t.thrustActive = true;
          const thrustAccel = Math.min(w, h) * 0.76;
          t.vx = ax * thrustAccel * 0.25;
          t.vy = Math.min(-25, ay * thrustAccel * 0.25);
          t.y -= 2;
        } else {
          t.vx = 0;
          t.vy = 0;
          t.thrustActive = false;
          this.updateHud();
          return;
        }
      }

      const hasThrust = mag > 0.10 && t.fuel > 0;
      t.thrustActive = hasThrust;
      if (hasThrust) {
        const thrustAccel = Math.min(w, h) * 0.76;
        t.vx += ax * thrustAccel * dt;
        t.vy += ay * thrustAccel * dt;
        t.fuel = Math.max(0, t.fuel - (spec.fuelCostPerUnit || 0.16) * 22 * dt);

        if (Math.random() < 0.65) {
          this.spawnParticles(t.x + t.w / 2 - ax * 12, t.y + t.h / 2 - ay * 6, "#facc15", 1);
        }
      }

      this.activeMagnetTethers = [];
      const tcx = t.x + t.w / 2;
      const tcy = t.y + t.h / 2;
      for (const mg of this.magnets) {
        const dx = mg.x - tcx;
        const dy = mg.y - tcy;
        const dist = Math.hypot(dx, dy);
        if (dist < mg.r && dist > 1) {
          const strength = (1 - dist / mg.r) * Math.min(w, h) * 0.72 * Math.abs(mg.pullStrength);
          const sign = mg.pullStrength >= 0 ? 1 : -1;
          const nx = dx / dist;
          const ny = dy / dist;
          t.vx += (nx * sign - ny * 0.35 * sign) * strength * dt;
          t.vy += (ny * sign + nx * 0.35 * sign) * strength * dt;

          this.activeMagnetTethers.push({
            x: mg.x,
            y: mg.y,
            color: sign > 0 ? "rgba(192, 132, 252, 0.55)" : "rgba(56, 189, 248, 0.55)"
          });

          if (Math.random() < 0.25) {
            this.spawnParticles(tcx, tcy, sign > 0 ? "#c084fc" : "#38bdf8", 1);
          }
        }
      }

      const gravity = Math.min(w, h) * 0.14;
      t.vy += gravity * dt;
      const drag = Math.pow(0.975, dt * 60);
      t.vx *= drag;
      t.vy *= drag;

      t.x += t.vx * dt;
      t.y += t.vy * dt;

      if (t.x < 4) {
        t.x = 4;
        t.vx = Math.abs(t.vx) * 0.4;
      } else if (t.x + t.w > w - 4) {
        t.x = w - 4 - t.w;
        t.vx = -Math.abs(t.vx) * 0.4;
      }

      if (t.y < 4) {
        t.y = 4;
        t.vy = Math.abs(t.vy) * 0.4;
      } else if (t.y + t.h > h - 4) {
        this.crashTaxi("Bodenkontakt!");
        return;
      }

      for (const ob of this.obstacles) {
        if (t.x + t.w > ob.x && t.x < ob.x + ob.w && t.y + t.h > ob.y && t.y < ob.y + ob.h) {
          this.crashTaxi("Hindernis gerammt!");
          return;
        }
      }

      for (const mv of this.movers) {
        if (t.x + t.w > mv.x && t.x < mv.x + mv.w && t.y + t.h > mv.y && t.y < mv.y + mv.h) {
          this.crashTaxi("Bewegtes Hindernis!");
          return;
        }
      }

      for (const hz of this.hazards) {
        const cx = Math.max(t.x, Math.min(hz.x, t.x + t.w));
        const cy = Math.max(t.y, Math.min(hz.y, t.y + t.h));
        const dx = hz.x - cx;
        const dy = hz.y - cy;
        if (dx * dx + dy * dy < hz.r * hz.r) {
          this.crashTaxi("Mine/Komet getroffen!");
          return;
        }
      }

      t.landedPlatform = null;
      t.safeLanding = false;
      for (const pad of this.platforms) {
        const horizOverlap = t.x + t.w * 0.82 > pad.x && t.x + t.w * 0.18 < pad.x + pad.w;
        const touchingTop = t.vy >= 0 && t.y + t.h >= pad.y && t.y + t.h <= pad.y + pad.h + 8 && t.y < pad.y;
        if (horizOverlap && touchingTop) {
          const speed = Math.hypot(t.vx, t.vy);
          const safeMaxSpeed = Math.min(w, h) * 0.24;
          const isSafe = t.gearDown && speed <= safeMaxSpeed;

          t.landedPlatform = pad;
          t.safeLanding = isSafe;

          if (!isSafe) {
            this.crashTaxi(!t.gearDown ? "Fahrwerk war eingeklappt!" : "Zu schnell gelandet!");
            return;
          }

          t.y = pad.y - t.h;
          t.vx = 0;
          t.vy = 0;
          t.thrustActive = false;
          this.handleSafeLandingOnPad(pad, dt);
          break;
        }
      }

      this.updateHud();
    },

    drawFiligreeObstacle(ctx, x, y, w, h, isMover) {
      const railColor = isMover ? "#f472b6" : "#fb7185";
      const trussColor = isMover ? "rgba(244, 114, 182, 0.55)" : "rgba(251, 113, 133, 0.45)";
      const nodeColor = isMover ? "#fdf2f8" : "#ffe4e6";

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.strokeStyle = railColor;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + w, y + 1);
      ctx.moveTo(x, y + h - 1);
      ctx.lineTo(x + w, y + h - 1);
      ctx.stroke();

      const step = Math.max(8, Math.min(14, h * 1.15));
      ctx.strokeStyle = trussColor;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      let top = true;
      for (let sx = x; sx < x + w; sx += step) {
        const nextX = Math.min(x + w, sx + step);
        const y1 = top ? y + 1 : y + h - 1;
        const y2 = top ? y + h - 1 : y + 1;
        ctx.moveTo(sx, y1);
        ctx.lineTo(nextX, y2);
        top = !top;
      }
      ctx.stroke();

      ctx.strokeStyle = railColor;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x, y + h - 1);
      ctx.moveTo(x + w, y + 1);
      ctx.lineTo(x + w, y + h - 1);
      ctx.stroke();

      const pulseX = x + (((this.animClock * (isMover ? 48 : 22)) % Math.max(1, w - 4)) + 2);
      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(x, y + h / 2, 2.2, 0, Math.PI * 2);
      ctx.arc(x + w, y + h / 2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isMover ? "#f5d0fe" : "#fda4af";
      ctx.beginPath();
      ctx.arc(pulseX, y + h / 2, 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    drawHazardOrb(ctx, hz) {
      const ang = hz.angle || 0;
      const isMine = hz.kind === "mine";

      ctx.save();

      const vx = hz.vx || 0;
      const vy = hz.vy || 0;
      const spd = Math.hypot(vx, vy) || 1;
      const ux = vx / spd;
      const uy = vy / spd;

      for (let k = 3; k >= 1; k--) {
        const dist = k * 6.5;
        const alpha = 0.08 * (4 - k);
        const rad = Math.max(2, hz.r * (0.65 - k * 0.12));
        ctx.fillStyle = isMine ? `rgba(251, 146, 60, ${alpha.toFixed(2)})` : `rgba(253, 224, 71, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(hz.x - ux * dist, hz.y - uy * dist, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.translate(hz.x, hz.y);
      ctx.rotate(ang);

      if (isMine) {
        ctx.strokeStyle = "#fdba74";
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(hz.r * 0.55, 0);
          ctx.lineTo(hz.r * 1.15, 0);
          ctx.stroke();
        }

        ctx.strokeStyle = "rgba(251, 146, 60, 0.65)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, hz.r * 0.78, 0, Math.PI * 2);
        ctx.stroke();

        const coreGrad = ctx.createRadialGradient(-hz.r * 0.2, -hz.r * 0.2, 1, 0, 0, hz.r * 0.65);
        coreGrad.addColorStop(0, "#fff7ed");
        coreGrad.addColorStop(0.5, "#fb923c");
        coreGrad.addColorStop(1, "#c2410c");
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, hz.r * 0.62, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const orbGrad = ctx.createRadialGradient(-hz.r * 0.25, -hz.r * 0.25, 1, 0, 0, hz.r * 0.88);
        orbGrad.addColorStop(0, "#fef9c3");
        orbGrad.addColorStop(0.55, "#f97316");
        orbGrad.addColorStop(1, "#9a3412");
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(0, 0, hz.r * 0.82, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(254, 240, 138, 0.55)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, hz.r * 1.05, hz.r * 0.42, 0.35, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(hz.r * 0.95, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    drawMagnets(ctx) {
      const tcx = this.taxi.x + this.taxi.w / 2;
      const tcy = this.taxi.y + this.taxi.h / 2;

      for (const mg of this.magnets) {
        const attracting = mg.pullStrength >= 0;
        const baseRgb = attracting ? "192, 132, 252" : "56, 189, 248";

        ctx.save();
        const grad = ctx.createRadialGradient(mg.x, mg.y, 4, mg.x, mg.y, mg.r);
        grad.addColorStop(0, `rgba(${baseRgb}, 0.24)`);
        grad.addColorStop(0.75, `rgba(${baseRgb}, 0.08)`);
        grad.addColorStop(1, `rgba(${baseRgb}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mg.x, mg.y, mg.r, 0, Math.PI * 2);
        ctx.fill();

        for (let k = 0; k < 2; k++) {
          const progress = ((this.animClock * (attracting ? -0.7 : 0.7) + k * 0.5) % 1 + 1) % 1;
          const ringR = Math.max(8, mg.r * (0.25 + progress * 0.72));
          ctx.strokeStyle = `rgba(${baseRgb}, ${(0.45 * (1 - progress * 0.6)).toFixed(2)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(mg.x, mg.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = attracting ? "#c084fc" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(mg.x, mg.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 8px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(attracting ? "PULL" : "PUSH", mg.x, mg.y - 9);
        ctx.restore();
      }

      for (const tether of this.activeMagnetTethers) {
        ctx.save();
        ctx.strokeStyle = tether.color;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tether.x, tether.y);
        ctx.lineTo(tcx, tcy);
        ctx.stroke();
        ctx.restore();
      }
    },

    drawBackdrop(ctx, w, h) {
      for (const s of STARS) {
        const alpha = 0.25 + 0.45 * Math.abs(Math.sin(this.animClock * 2.2 + s.phase));
        ctx.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const baseY = h;
      const buildings = [
        { x: 0.02, w: 0.12, h: 0.16, col: "rgba(30, 41, 59, 0.35)" },
        { x: 0.15, w: 0.10, h: 0.24, col: "rgba(15, 23, 42, 0.55)" },
        { x: 0.27, w: 0.14, h: 0.13, col: "rgba(30, 41, 59, 0.32)" },
        { x: 0.62, w: 0.12, h: 0.21, col: "rgba(15, 23, 42, 0.5)" },
        { x: 0.76, w: 0.11, h: 0.27, col: "rgba(30, 41, 59, 0.35)" },
        { x: 0.88, w: 0.10, h: 0.15, col: "rgba(15, 23, 42, 0.45)" }
      ];
      for (const b of buildings) {
        ctx.fillStyle = b.col;
        ctx.fillRect(b.x * w, baseY - b.h * h, b.w * w, b.h * h);
      }

      this.drawMagnets(ctx);
    },

    drawSpaceTaxi(ctx) {
      const t = this.taxi;
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;

      ctx.save();
      ctx.translate(cx, cy);

      const beamGrad = ctx.createLinearGradient(t.facing * 12, 0, t.facing * 56, 8);
      beamGrad.addColorStop(0, "rgba(254, 240, 138, 0.24)");
      beamGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(t.facing * (t.w * 0.45), 1);
      ctx.lineTo(t.facing * 56, -9);
      ctx.lineTo(t.facing * 56, 15);
      ctx.closePath();
      ctx.fill();

      if (t.thrustActive) {
        const flameLen = 7 + Math.sin(this.animClock * 42) * 4;
        ctx.fillStyle = "#fb923c";
        ctx.beginPath();
        ctx.moveTo(-t.facing * (t.w * 0.48), -3);
        ctx.lineTo(-t.facing * (t.w * 0.48 + flameLen), 1);
        ctx.lineTo(-t.facing * (t.w * 0.48), 5);
        ctx.closePath();
        ctx.fill();
      }

      if (t.gearDown) {
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-t.w * 0.28, t.h * 0.45);
        ctx.lineTo(-t.w * 0.35, t.h * 0.78);
        ctx.moveTo(-t.w * 0.44, t.h * 0.78);
        ctx.lineTo(-t.w * 0.16, t.h * 0.78);

        ctx.moveTo(t.w * 0.28, t.h * 0.45);
        ctx.lineTo(t.w * 0.35, t.h * 0.78);
        ctx.moveTo(t.w * 0.16, t.h * 0.78);
        ctx.lineTo(t.w * 0.44, t.h * 0.78);
        ctx.stroke();
      }

      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "rgba(250, 204, 21, 0.7)";
      ctx.shadowBlur = 8;
      ctx.fillRect(-6, -t.h * 0.72, 12, 4);
      ctx.shadowBlur = 0;

      ctx.fillStyle = t.passenger ? "#facc15" : "#fbbf24";
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-t.w * 0.5, -t.h * 0.42, t.w, t.h * 0.82, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(-t.w * 0.12, -t.h * 0.28, t.w * 0.42, t.h * 0.36, 2);
      ctx.fill();

      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(-t.w * 0.4, t.h * 0.08, t.w * 0.8, 2.2);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(t.facing * (t.w * 0.46) - 1.5, -1, 3, 3);

      ctx.restore();

      if (this.speechText && this.speechTimer > 0) {
        ctx.save();
        ctx.font = "700 9px Orbitron, sans-serif";
        const padX = 6;
        const tw = ctx.measureText(this.speechText).width;
        const bw = tw + padX * 2;
        const bh = 15;
        const bx = Math.max(6, Math.min((this.field.w || 340) - bw - 6, cx - bw / 2));
        const by = Math.max(6, t.y - bh - 8);

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.speechText, bx + bw / 2, by + bh / 2 + 0.5);
        ctx.restore();
      }
    },

    draw() {
      const ctx = this.canvasCtx;
      const w = this.field.w || 340;
      const h = this.field.h || 500;
      const job = this.getCurrentJob();

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      this.drawBackdrop(ctx, w, h);

      for (const ob of this.obstacles) {
        this.drawFiligreeObstacle(ctx, ob.x, ob.y, ob.w, ob.h, false);
      }
      for (const mv of this.movers) {
        this.drawFiligreeObstacle(ctx, mv.x, mv.y, mv.w, mv.h, true);
      }

      for (const pad of this.platforms) {
        const isPickup = !this.taxi.passenger && job && job.pickup === pad.id;
        const isDest = this.taxi.passenger && job && job.dest === pad.id;
        const color = pad.fuel ? "#4ade80" : isDest ? "#f472b6" : isPickup ? "#facc15" : "#22d3ee";

        ctx.fillStyle = `${color}22`;
        ctx.fillRect(pad.x + 2, pad.y - 3, pad.w - 4, 3);

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isPickup || isDest ? 12 : 6;
        ctx.beginPath();
        ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "700 9px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(pad.label, pad.x + pad.w / 2, pad.y + pad.h + 11);

        if (isPickup) {
          const px = pad.x + pad.w * 0.72;
          const py = pad.y - 2;
          const waveY = Math.sin(this.animClock * 9) * 2;

          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(px - 2, py - 7);
          ctx.lineTo(px - 6, py - 11 + waveY);
          ctx.stroke();

          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(px, py - 11, 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(px - 2, py - 8, 4, 6);
        }
      }

      for (const hz of this.hazards) {
        this.drawHazardOrb(ctx, hz);
      }

      this.drawSpaceTaxi(ctx);

      if (this.dragStart && this.dragPointerId !== null) {
        ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.dragStart.x, this.dragStart.y, 24, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const pt of this.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    },

    loop(now) {
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
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.gearBtn?.removeEventListener("click", this.onGearClick);
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
      this.ctx = null;
    }
  });
})();