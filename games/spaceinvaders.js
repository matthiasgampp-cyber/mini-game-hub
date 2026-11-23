(() => {
  "use strict";

  const WEAPON_SPECS = {
    laser: { id: "laser", label: "LASER", color: "#22d3ee", cooldown: 0.22 },
    dual: { id: "dual", label: "DOPPEL", color: "#4ade80", cooldown: 0.25 },
    triple: { id: "triple", label: "DREIFACH", color: "#facc15", cooldown: 0.29 },
    plasma: { id: "plasma", label: "PLASMA", color: "#e879f9", cooldown: 0.34 }
  };

  window.GAME_REGISTRY?.register({
    id: "spaceinvaders",
    name: "Space Invaders",
    subtitle: "Waffen, Schild & Unverwundbarkeit • Dickere Bunker • UFO-Boss-Wellen & Flieger",
    tag: "Arcade Klassiker",
    icon: "👾",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.animClock = 0;
      this.paused = false;
      this.phase = "playing";

      this.score = 0;
      this.bestScore = ctx.storage.get("best_score", 0);
      this.maxLives = 3;
      this.lives = 3;
      this.wave = 1;
      this.isBossWave = false;
      this.boss = null;
      this.bossFireTimer = 1.1;
      this.bossDefeatedCount = 0;
      this.raiders = [];
      this.raiderFireTimer = 0.9;

      this.hasShield = false;
      this.invulnTimer = 0;

      this.currentWeapon = "laser";
      this.unlockedWeapons = new Set(["laser"]);
      this.weaponOrder = ["laser", "dual", "triple", "plasma"];

      this.field = { x: 0, y: 0, w: 360, h: 520 };
      this.player = {
        x: 160,
        y: 460,
        w: 38,
        h: 22,
        vx: 0,
        fireCooldown: 0
      };

      this.keys = { left: false, right: false, fire: false };
      this.pointerActive = false;
      this.pointerTargetX = null;
      this.isTouchDevice = false;

      this.enemies = [];
      this.enemyDir = 1;
      this.enemyStepTimer = 0;
      this.enemyFireTimer = 1.05;

      this.ufo = null;
      this.ufoSpawnTimer = 9;

      this.playerBullets = [];
      this.enemyBullets = [];
      this.bunkers = [];
      this.powerups = [];
      this.particles = [];

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex flex-col items-center justify-center p-2 bg-[#04040a] overflow-hidden";

      this.hud = document.createElement("div");
      this.hud.className = "w-full max-w-[480px] flex items-center justify-between gap-2 mb-1 px-1 font-orbitron text-[11px] sm:text-xs";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-xl border border-cyan-500/30 bg-slate-950/90 touch-none";
      this.canvasCtx = this.canvas.getContext("2d");

      this.controlsBar = document.createElement("div");
      this.controlsBar.className = "w-full max-w-[480px] flex items-center justify-between gap-2 mt-2 px-1";
      this.controlsBar.innerHTML = `
        <div id="si-weapon-badge" class="text-xs sm:text-sm text-cyan-300 font-bold px-1 truncate">
          WAFFE: LASER
        </div>
        <div class="flex items-center gap-2">
          <button
            id="si-switch-weapon-btn"
            type="button"
            class="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-orbitron text-xs font-bold uppercase tracking-wider border border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/35 active:scale-95 transition shadow-sm touch-none select-none"
          >
            ⚡ Waffe
          </button>
          <div
            id="si-fire-btn"
            class="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-orbitron text-xs sm:text-sm font-black uppercase tracking-wider bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 select-none"
          >
            🔥 AUTOFEUER
          </div>
        </div>
      `;

      this.overlay = document.createElement("div");
      this.overlay.className = "hidden absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4";

      this.root.appendChild(this.hud);
      this.root.appendChild(this.canvas);
      this.root.appendChild(this.controlsBar);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.weaponBadge = this.controlsBar.querySelector("#si-weapon-badge");
      this.switchWeaponBtn = this.controlsBar.querySelector("#si-switch-weapon-btn");
      this.fireBtn = this.controlsBar.querySelector("#si-fire-btn");

      this.onSwitchWeaponClick = () => {
        if (this.phase !== "playing" || this.paused) return;
        this.cycleUnlockedWeapon();
      };

      this.onFireDown = (e) => {
        e.preventDefault();
        try {
          this.fireBtn?.setPointerCapture?.(e.pointerId);
        } catch (_) {}
        if (this.phase !== "playing" || this.paused) return;
        this.keys.fire = true;
      };
      this.onFireUp = (e) => {
        try {
          if (e && e.pointerId !== undefined) {
            this.fireBtn?.releasePointerCapture?.(e.pointerId);
          }
        } catch (_) {}
        this.keys.fire = false;
      };

      this.switchWeaponBtn?.addEventListener("click", this.onSwitchWeaponClick);
      this.fireBtn?.addEventListener("pointerdown", this.onFireDown);
      window.addEventListener("pointerup", this.onFireUp);
      window.addEventListener("pointercancel", this.onFireUp);

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
      this.setupWave(1, true);
    },

    playSfx(name) {
      try {
        this.ctx?.sound?.[name]?.();
      } catch {
        // Sound-Fehler ignorieren
      }
    },

    cycleUnlockedWeapon() {
      const list = this.weaponOrder.filter((id) => this.unlockedWeapons.has(id));
      if (list.length <= 1) return;
      const idx = list.indexOf(this.currentWeapon);
      this.currentWeapon = list[(idx + 1) % list.length];
      this.playSfx("playHit");
      this.updateWeaponUi();
    },

    unlockWeapon(weaponId) {
      if (!WEAPON_SPECS[weaponId]) return;
      this.unlockedWeapons.add(weaponId);
      this.currentWeapon = weaponId;
      this.updateWeaponUi();
    },

    updateWeaponUi() {
      const spec = WEAPON_SPECS[this.currentWeapon] || WEAPON_SPECS.laser;
      const statusParts = [];
      if (this.hasShield) statusParts.push("SCHILD");
      if (this.invulnTimer > 0) statusParts.push(`UNVERWUNDBAR ${this.invulnTimer.toFixed(1)}s`);
      const extra = statusParts.length ? ` • ${statusParts.join(" • ")}` : "";

      if (this.weaponBadge) {
        this.weaponBadge.textContent = `WAFFE: ${spec.label} (${this.unlockedWeapons.size}/4)${extra}`;
        this.weaponBadge.style.color = this.invulnTimer > 0 ? "#fde047" : spec.color;
      }
    },

    updateHud() {
      if (!this.hud) return;
      const hasActiveRaiders = Array.isArray(this.raiders) && this.raiders.some((r) => r.alive);
      const waveLabel = this.boss
        ? `BOSS W${this.wave}`
        : hasActiveRaiders
          ? `FLIEGER x${this.raiders.filter((r) => r.alive).length}`
          : this.isBossWave
            ? `BOSS W${this.wave}`
            : `WELLE ${this.wave}`;
      this.hud.innerHTML = `
        <span class="text-cyan-300">PUNKTE ${this.score}</span>
        <span class="${this.boss || hasActiveRaiders || this.isBossWave ? "text-rose-400 font-bold" : "text-yellow-300"}">${waveLabel}</span>
        <span class="text-green-400">LEBEN ${"🚀".repeat(Math.max(0, this.lives)) || "0"}</span>
        <span class="text-fuchsia-300">BEST ${this.bestScore}</span>
      `;
    },

    resize() {
      if (!this.root || !this.canvas || !this.canvasCtx) return;
      const rect = this.root.getBoundingClientRect();
      this.isTouchDevice = rect.width < 768 || (navigator.maxTouchPoints || 0) > 0;
      this.updateWeaponUi();

      const hudH = this.hud.getBoundingClientRect().height || 22;
      const barH = this.controlsBar.getBoundingClientRect().height || 42;
      const availW = Math.max(240, rect.width - 12);
      const availH = Math.max(260, rect.height - hudH - barH - 20);

      const w = Math.min(availW, 480);
      const h = availH;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const prevW = this.field.w || w;
      const prevH = this.field.h || h;
      this.field = { x: 0, y: 0, w, h };

      this.player.w = Math.max(34, Math.min(46, w * 0.095));
      this.player.h = Math.max(20, Math.min(26, this.player.w * 0.58));
      this.player.y = h - this.player.h - 14;
      this.player.x = Math.max(8, Math.min(w - this.player.w - 8, (this.player.x / prevW) * w));

      this.buildBunkers(prevW, prevH);
      if (this.boss) {
        this.boss.x = Math.max(this.boss.w / 2 + 10, Math.min(w - this.boss.w / 2 - 10, (this.boss.x / prevW) * w));
        const minY = Math.max(52, h * 0.12);
        const maxY = Math.min(this.player.y - 120, Math.max(minY + 36, h * 0.31));
        this.boss.minY = minY;
        this.boss.maxY = maxY;
        this.boss.y = Math.max(minY, Math.min(maxY, (this.boss.y / prevH) * h));
      }
      if (Array.isArray(this.raiders)) {
        for (const r of this.raiders) {
          r.x = Math.max(r.r + 10, Math.min(w - r.r - 10, (r.x / prevW) * w));
          r.y = Math.max(16, (r.y / prevH) * h);
        }
      }
    },

    buildBunkers(prevW = null, prevH = null) {
      const w = this.field.w || 360;
      const h = this.field.h || 500;
      const bunkerCount = 4;
      const bunkerW = Math.max(32, Math.min(46, w * 0.092));
      const baseH = Math.max(12, Math.min(16, h * 0.03));
      const bunkerH = Math.round(baseH * 1.35);
      const bunkerY = h - this.player.h - 74;

      if (!this.bunkers.length) {
        const margin = w * 0.11;
        const usableW = w - margin * 2 - bunkerW;
        for (let i = 0; i < bunkerCount; i++) {
          const bx = margin + (bunkerCount === 1 ? usableW / 2 : (i / (bunkerCount - 1)) * usableW);
          this.bunkers.push({
            x: bx,
            y: bunkerY,
            w: bunkerW,
            h: bunkerH,
            hp: 5,
            maxHp: 5
          });
        }
      } else {
        for (const b of this.bunkers) {
          if (prevW && prevH) {
            b.x = Math.max(8, Math.min(w - bunkerW - 8, (b.x / prevW) * w));
          }
          b.y = bunkerY;
          b.w = bunkerW;
          b.h = bunkerH;
        }
      }
    },

    spawnRaidersAfterBoss() {
      const w = this.field.w || 360;
      const count = 2 + this.bossDefeatedCount;
      this.raiders = [];
      this.raiderFireTimer = 0.85;

      for (let i = 0; i < count; i++) {
        const frac = (i + 1) / (count + 1);
        const startX = 24 + frac * Math.max(40, w - 48);
        const startY = 24 + (i % 2) * 16;
        const dir = i % 2 === 0 ? 1 : -1;
        this.raiders.push({
          x: startX,
          y: startY,
          r: 12,
          vx: (72 + this.bossDefeatedCount * 10) * dir,
          vy: 28 + Math.min(28, this.bossDefeatedCount * 4),
          hp: 2,
          points: 120,
          alive: true
        });
      }
      this.updateHud();
    },

    setupWave(waveNum, resetLives = false) {
      this.wave = waveNum;
      this.isBossWave = waveNum % 4 === 0;

      if (resetLives) {
        this.lives = this.maxLives;
        this.hasShield = false;
        this.invulnTimer = 0;
        this.bossDefeatedCount = 0;
        this.currentWeapon = "laser";
        this.unlockedWeapons = new Set(["laser"]);
      } else {
        if (waveNum % 5 === 0 && this.lives < this.maxLives) {
          this.lives += 1;
        }
        if (waveNum === 2) {
          this.unlockWeapon("dual");
        } else if (waveNum === 3) {
          this.unlockWeapon("triple");
        } else if (waveNum >= 4) {
          this.unlockWeapon("plasma");
        }
      }

      this.playerBullets = [];
      this.enemyBullets = [];
      this.powerups = [];
      this.particles = [];
      this.ufo = null;
      this.ufoSpawnTimer = 8;
      this.enemyDir = 1;
      this.enemyStepTimer = 0;
      this.enemyFireTimer = Math.max(0.5, 1.05 - waveNum * 0.08);
      this.boss = null;
      this.bossFireTimer = 1.0;
      this.raiders = [];

      if (resetLives) {
        this.bunkers = [];
        this.buildBunkers();
      } else {
        for (const b of this.bunkers) {
          b.hp = b.maxHp;
        }
      }

      const w = this.field.w || 360;
      const h = this.field.h || 500;
      this.enemies = [];

      if (this.isBossWave) {
        const bossTier = Math.max(1, Math.floor(waveNum / 4));
        const maxHp = 18 + (bossTier - 1) * 12;
        const minY = Math.max(52, h * 0.12);
        const maxY = Math.min(this.player.y - 120, Math.max(minY + 36, h * 0.31));
        this.boss = {
          x: w / 2,
          y: minY + (maxY - minY) * 0.35,
          minY,
          maxY,
          w: Math.min(108, w * 0.28),
          h: 42,
          vx: (78 + bossTier * 14) * (Math.random() < 0.5 ? 1 : -1),
          vy: (34 + bossTier * 8) * (Math.random() < 0.5 ? 1 : -1),
          hp: maxHp,
          maxHp,
          points: 400 * bossTier
        };
      } else {
        const cols = 8;
        const rows = Math.min(5, 3 + Math.floor((waveNum - 1) / 2));
        const cellW = Math.min(34, (w - 48) / cols);
        const cellH = 26;
        const startX = (w - cols * cellW) / 2 + cellW / 2;
        const startY = 46;

        const kinds = ["squid", "crab", "octopus", "crab", "octopus"];

        for (let r = 0; r < rows; r++) {
          const kind = kinds[r % kinds.length];
          const points = kind === "squid" ? 30 : kind === "crab" ? 20 : 10;
          const hp = waveNum >= 4 && r === 0 ? 2 : 1;
          for (let c = 0; c < cols; c++) {
            this.enemies.push({
              x: startX + c * cellW,
              y: startY + r * cellH,
              r: Math.min(11, cellW * 0.34),
              kind,
              points,
              hp,
              alive: true
            });
          }
        }
      }

      this.updateWeaponUi();
      this.updateHud();
    },

    spawnParticles(x, y, color, count = 10) {
      if (!Array.isArray(this.particles)) this.particles = [];
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 130;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.25 + Math.random() * 0.2,
          maxLife: 0.45,
          color: color || "#facc15",
          size: 2 + Math.random() * 2
        });
      }
    },

    maybeSpawnPowerup(x, y) {
      if (Math.random() > 0.28) return;
      const roll = Math.random();
      if (roll < 0.45) {
        this.powerups.push({
          x,
          y,
          r: 10,
          vy: 78,
          type: "shield",
          label: "S",
          color: "#38bdf8"
        });
      } else if (roll < 0.75) {
        this.powerups.push({
          x,
          y,
          r: 10,
          vy: 78,
          type: "invuln",
          label: "I",
          color: "#fde047"
        });
      } else {
        const pool = ["dual", "triple", "plasma"];
        const weapon = pool[Math.floor(Math.random() * pool.length)];
        this.powerups.push({
          x,
          y,
          r: 10,
          vy: 78,
          type: "weapon",
          weapon,
          label: "W",
          color: WEAPON_SPECS[weapon].color
        });
      }
    },

    applyPowerup(pu) {
      if (pu.type === "shield") {
        this.hasShield = true;
      } else if (pu.type === "invuln") {
        this.invulnTimer = Math.max(this.invulnTimer, 5.0);
      } else if (pu.type === "weapon" && pu.weapon) {
        this.unlockWeapon(pu.weapon);
      }
      this.playSfx("playScore");
      this.spawnParticles(pu.x, pu.y, pu.color, 12);
      this.updateWeaponUi();
    },

    firePlayerWeapon() {
      const spec = WEAPON_SPECS[this.currentWeapon] || WEAPON_SPECS.laser;
      const cx = this.player.x + this.player.w / 2;
      const topY = this.player.y - 4;
      const speed = -430;

      if (this.currentWeapon === "laser") {
        this.playerBullets.push({
          x: cx,
          y: topY,
          vx: 0,
          vy: speed,
          r: 3.5,
          dmg: 1,
          color: spec.color
        });
      } else if (this.currentWeapon === "dual") {
        this.playerBullets.push(
          { x: cx - 8, y: topY, vx: 0, vy: speed, r: 3.2, dmg: 1, color: spec.color },
          { x: cx + 8, y: topY, vx: 0, vy: speed, r: 3.2, dmg: 1, color: spec.color }
        );
      } else if (this.currentWeapon === "triple") {
        this.playerBullets.push(
          { x: cx, y: topY - 2, vx: 0, vy: speed, r: 3.4, dmg: 1, color: spec.color },
          { x: cx - 7, y: topY, vx: -65, vy: speed * 0.96, r: 3, dmg: 1, color: spec.color },
          { x: cx + 7, y: topY, vx: 65, vy: speed * 0.96, r: 3, dmg: 1, color: spec.color }
        );
      } else if (this.currentWeapon === "plasma") {
        this.playerBullets.push({
          x: cx,
          y: topY - 2,
          vx: 0,
          vy: speed * 0.9,
          r: 6.5,
          dmg: 2,
          color: spec.color
        });
      }

      this.playSfx("playShoot");
    },

    handleKeyDown(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = true;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = true;
      else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        this.keys.fire = true;
      } else if (e.key === "q" || e.key === "Q" || e.key === "Tab") {
        e.preventDefault();
        if (this.phase === "playing" && !this.paused) this.cycleUnlockedWeapon();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const wId = this.weaponOrder[Number(e.key) - 1];
        if (wId && this.unlockedWeapons.has(wId)) {
          this.currentWeapon = wId;
          this.playSfx("playHit");
          this.updateWeaponUi();
        }
      }
    },

    handleKeyUp(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.keys.left = false;
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.keys.right = false;
      else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.keys.fire = false;
    },

    handlePointerDown(e) {
      if (this.phase !== "playing" || this.paused || !this.canvas) return;
      try {
        this.canvas.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignorieren falls nicht unterstützt
      }
      const rect = this.canvas.getBoundingClientRect();
      this.pointerActive = true;
      this.pointerTargetX = e.clientX - rect.left;
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

    damagePlayer() {
      if (this.invulnTimer > 0) return;

      if (this.hasShield) {
        this.hasShield = false;
        this.invulnTimer = 0.8;
        this.playSfx("playHit");
        this.spawnParticles(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, "#38bdf8", 16);
        this.updateWeaponUi();
        return;
      }

      this.lives -= 1;
      this.playSfx("playLose");
      this.spawnParticles(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, "#4ade80", 18);
      this.updateHud();

      if (this.lives <= 0) {
        this.phase = "gameover";
        this.saveBestScore();
        this.showGameOver();
      } else {
        this.enemyBullets = [];
        this.player.x = (this.field.w - this.player.w) / 2;
      }
    },

    showGameOver() {
      if (!this.overlay) return;
      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-xs rounded-2xl border border-cyan-400/40 bg-slate-900/95 p-6 text-center shadow-[0_0_35px_rgba(34,211,238,0.2)]">
          <h3 class="font-orbitron text-xl font-black text-rose-400 mb-1">SCHIFF ZERSTÖRT</h3>
          <p class="text-sm text-slate-300 mb-2">Punkte: <strong class="text-cyan-300">${this.score}</strong> • Welle ${this.wave}</p>
          <p class="text-xs text-slate-400 mb-5">Rekord: <strong class="text-fuchsia-300">${this.bestScore}</strong></p>
          <button type="button" data-action="restart" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition">
            Neu starten
          </button>
        </div>
      `;
      this.overlay.querySelector('[data-action="restart"]')?.addEventListener("click", () => {
        this.ctx?.restartGame?.();
      });
    },

    update(dt) {
      this.animClock += dt;

      if (this.invulnTimer > 0) {
        this.invulnTimer = Math.max(0, this.invulnTimer - dt);
        this.updateWeaponUi();
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      if (this.phase !== "playing" || this.paused) return;

      const gHeld = window.GLOBAL_MOBILE_CONTROLS?.held || this.ctx?.controls?.held || {};
      const w = this.field.w || 360;
      const h = this.field.h || 500;
      const p = this.player;

      let moveDir = 0;
      if (this.keys.left || gHeld.left) moveDir -= 1;
      if (this.keys.right || gHeld.right) moveDir += 1;

      if (moveDir !== 0) {
        p.x += moveDir * 280 * dt;
      } else if (this.pointerActive && this.pointerTargetX !== null) {
        const diff = this.pointerTargetX - (p.x + p.w / 2);
        p.x += Math.max(-320 * dt, Math.min(320 * dt, diff * 10 * dt));
      }
      p.x = Math.max(6, Math.min(w - p.w - 6, p.x));

      p.fireCooldown = Math.max(0, p.fireCooldown - dt);
      const spec = WEAPON_SPECS[this.currentWeapon] || WEAPON_SPECS.laser;
      if (p.fireCooldown <= 0) {
        this.firePlayerWeapon();
        p.fireCooldown = spec.cooldown;
      }

      if (!this.ufo) {
        this.ufoSpawnTimer -= dt;
        if (this.ufoSpawnTimer <= 0) {
          const fromLeft = Math.random() < 0.5;
          this.ufo = {
            x: fromLeft ? -20 : w + 20,
            y: 22,
            w: 28,
            h: 12,
            vx: fromLeft ? 95 : -95,
            points: 100
          };
          this.ufoSpawnTimer = 11 + Math.random() * 5;
        }
      } else {
        this.ufo.x += this.ufo.vx * dt;
        if (this.ufo.x < -36 || this.ufo.x > w + 36) {
          this.ufo = null;
        }
      }

      const aliveRaiders = Array.isArray(this.raiders) ? this.raiders.filter((r) => r.alive) : [];

      if (this.isBossWave && this.boss) {
        this.boss.x += this.boss.vx * dt;
        const halfW = this.boss.w / 2;
        if (this.boss.x - halfW < 10) {
          this.boss.x = 10 + halfW;
          this.boss.vx = Math.abs(this.boss.vx);
        } else if (this.boss.x + halfW > w - 10) {
          this.boss.x = w - 10 - halfW;
          this.boss.vx = -Math.abs(this.boss.vx);
        }

        const minY = this.boss.minY ?? Math.max(52, h * 0.12);
        const maxY = this.boss.maxY ?? Math.min(p.y - 120, Math.max(minY + 36, h * 0.31));
        this.boss.y += (this.boss.vy || 0) * dt;
        if (this.boss.y < minY) {
          this.boss.y = minY;
          this.boss.vy = Math.abs(this.boss.vy || 36);
        } else if (this.boss.y > maxY) {
          this.boss.y = maxY;
          this.boss.vy = -Math.abs(this.boss.vy || 36);
        }

        this.bossFireTimer -= dt;
        if (this.bossFireTimer <= 0) {
          this.bossFireTimer = Math.max(0.55, 1.05 - Math.floor(this.wave / 4) * 0.08);
          const by = this.boss.y + this.boss.h / 2 + 4;
          const bSpd = 175 + this.wave * 10;
          this.enemyBullets.push(
            { x: this.boss.x, y: by, vx: 0, vy: bSpd, r: 4 },
            { x: this.boss.x - 16, y: by, vx: -42, vy: bSpd * 0.96, r: 3.5 },
            { x: this.boss.x + 16, y: by, vx: 42, vy: bSpd * 0.96, r: 3.5 }
          );
        }
      } else if (aliveRaiders.length > 0) {
        for (const r of aliveRaiders) {
          r.x += r.vx * dt;
          if (r.x - r.r < 10) {
            r.x = 10 + r.r;
            r.vx = Math.abs(r.vx);
          } else if (r.x + r.r > w - 10) {
            r.x = w - 10 - r.r;
            r.vx = -Math.abs(r.vx);
          }

          r.y += r.vy * dt;

          if (r.y + r.r >= p.y + 2) {
            r.alive = false;
            this.damagePlayer();
            return;
          }
        }

        this.raiderFireTimer -= dt;
        if (this.raiderFireTimer <= 0) {
          this.raiderFireTimer = Math.max(0.45, 0.95 - this.bossDefeatedCount * 0.07);
          const stillAlive = this.raiders.filter((r) => r.alive);
          const shooter = stillAlive[Math.floor(Math.random() * stillAlive.length)];
          if (shooter) {
            this.enemyBullets.push({
              x: shooter.x,
              y: shooter.y + shooter.r + 3,
              vx: 0,
              vy: 185 + this.wave * 12,
              r: 3.5
            });
          }
        }
      } else if (this.isBossWave && !this.boss && this.raiders.length > 0) {
        this.playSfx("playScore");
        this.setupWave(this.wave + 1, false);
        return;
      } else if (!this.isBossWave) {
        const aliveEnemies = this.enemies.filter((e) => e.alive);
        if (aliveEnemies.length === 0) {
          this.playSfx("playScore");
          this.setupWave(this.wave + 1, false);
          return;
        }

        const stepInterval = Math.max(0.14, 0.52 - this.wave * 0.042 - (32 - aliveEnemies.length) * 0.007);
        this.enemyStepTimer += dt;
        if (this.enemyStepTimer >= stepInterval) {
          this.enemyStepTimer = 0;
          const stepX = 11 * this.enemyDir;
          let hitEdge = false;
          for (const e of aliveEnemies) {
            if (e.x + stepX - e.r < 10 || e.x + stepX + e.r > w - 10) {
              hitEdge = true;
              break;
            }
          }
          if (hitEdge) {
            this.enemyDir *= -1;
            for (const e of aliveEnemies) {
              e.y += 14;
              if (e.y + e.r >= p.y - 4) {
                this.damagePlayer();
                return;
              }
            }
          } else {
            for (const e of aliveEnemies) {
              e.x += stepX;
            }
          }
        }

        this.enemyFireTimer -= dt;
        if (this.enemyFireTimer <= 0) {
          this.enemyFireTimer = Math.max(0.42, 1.05 - this.wave * 0.07);
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          if (shooter) {
            this.enemyBullets.push({
              x: shooter.x,
              y: shooter.y + shooter.r + 3,
              vx: 0,
              vy: 165 + this.wave * 15,
              r: 3.5
            });
          }
        }
      }

      const activeEnemies = this.enemies.filter((e) => e.alive);
      const currentRaiders = Array.isArray(this.raiders) ? this.raiders.filter((r) => r.alive) : [];

      for (let i = this.playerBullets.length - 1; i >= 0; i--) {
        const b = this.playerBullets[i];
        b.x += (b.vx || 0) * dt;
        b.y += b.vy * dt;

        if (b.y < -12 || b.x < -12 || b.x > w + 12) {
          this.playerBullets.splice(i, 1);
          continue;
        }

        if (
          this.boss &&
          Math.abs(b.x - this.boss.x) < this.boss.w / 2 + b.r &&
          Math.abs(b.y - this.boss.y) < this.boss.h / 2 + b.r
        ) {
          this.boss.hp -= b.dmg || 1;
          this.spawnParticles(b.x, b.y, b.color, 7);
          this.playSfx("playHit");
          this.playerBullets.splice(i, 1);

          if (this.boss.hp <= 0) {
            this.score += this.boss.points;
            this.saveBestScore();
            this.spawnParticles(this.boss.x, this.boss.y, "#38bdf8", 28);
            this.maybeSpawnPowerup(this.boss.x, this.boss.y);
            this.boss = null;
            this.bossDefeatedCount += 1;
            this.playSfx("playScore");
            this.spawnRaidersAfterBoss();
            return;
          }
          continue;
        }

        let hitRaider = false;
        for (const r of currentRaiders) {
          const dist = Math.hypot(b.x - r.x, b.y - r.y);
          if (dist < r.r + b.r) {
            r.hp -= b.dmg || 1;
            this.spawnParticles(b.x, b.y, b.color, 7);
            if (r.hp <= 0) {
              r.alive = false;
              this.score += r.points;
              this.saveBestScore();
              this.spawnParticles(r.x, r.y, "#fb923c", 14);
              this.maybeSpawnPowerup(r.x, r.y);
            }
            this.playSfx("playHit");
            this.playerBullets.splice(i, 1);
            this.updateHud();
            hitRaider = true;
            break;
          }
        }
        if (hitRaider) continue;

        if (
          this.ufo &&
          b.x > this.ufo.x - this.ufo.w / 2 &&
          b.x < this.ufo.x + this.ufo.w / 2 &&
          Math.abs(b.y - this.ufo.y) < this.ufo.h
        ) {
          this.score += this.ufo.points;
          this.saveBestScore();
          this.spawnParticles(this.ufo.x, this.ufo.y, "#f472b6", 16);
          this.maybeSpawnPowerup(this.ufo.x, this.ufo.y);
          this.ufo = null;
          this.playerBullets.splice(i, 1);
          this.playSfx("playScore");
          this.updateHud();
          continue;
        }

        let consumed = false;
        for (const e of activeEnemies) {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.r + b.r) {
            e.hp -= b.dmg || 1;
            this.spawnParticles(b.x, b.y, b.color, 6);
            if (e.hp <= 0) {
              e.alive = false;
              this.score += e.points;
              this.saveBestScore();
              this.spawnParticles(e.x, e.y, "#facc15", 12);
              this.maybeSpawnPowerup(e.x, e.y);
            }
            this.playSfx("playHit");
            this.playerBullets.splice(i, 1);
            this.updateHud();
            consumed = true;
            break;
          }
        }
        if (consumed) continue;

        for (let j = this.bunkers.length - 1; j >= 0; j--) {
          const bnk = this.bunkers[j];
          if (b.x + b.r > bnk.x && b.x - b.r < bnk.x + bnk.w && b.y + b.r > bnk.y && b.y - b.r < bnk.y + bnk.h) {
            bnk.hp -= b.dmg || 1;
            this.spawnParticles(b.x, b.y, "#34d399", 5);
            if (bnk.hp <= 0) {
              this.bunkers.splice(j, 1);
            }
            this.playerBullets.splice(i, 1);
            break;
          }
        }
      }

      for (const r of currentRaiders) {
        for (let j = this.bunkers.length - 1; j >= 0; j--) {
          const bnk = this.bunkers[j];
          if (r.x + r.r > bnk.x && r.x - r.r < bnk.x + bnk.w && r.y + r.r > bnk.y && r.y - r.r < bnk.y + bnk.h) {
            bnk.hp -= 2;
            r.alive = false;
            this.spawnParticles(r.x, r.y, "#fb923c", 12);
            if (bnk.hp <= 0) this.bunkers.splice(j, 1);
            this.updateHud();
            break;
          }
        }
        if (!r.alive) continue;

        if (r.x + r.r > p.x + 2 && r.x - r.r < p.x + p.w - 2 && r.y + r.r > p.y + 2 && r.y - r.r < p.y + p.h) {
          r.alive = false;
          this.damagePlayer();
          return;
        }
      }

      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const eb = this.enemyBullets[i];
        eb.x += (eb.vx || 0) * dt;
        eb.y += eb.vy * dt;
        if (eb.y > h + 10 || eb.x < -12 || eb.x > w + 12) {
          this.enemyBullets.splice(i, 1);
          continue;
        }

        let hitBunker = false;
        for (let j = this.bunkers.length - 1; j >= 0; j--) {
          const bnk = this.bunkers[j];
          if (eb.x + eb.r > bnk.x && eb.x - eb.r < bnk.x + bnk.w && eb.y + eb.r > bnk.y && eb.y - eb.r < bnk.y + bnk.h) {
            bnk.hp -= 1;
            this.spawnParticles(eb.x, eb.y, "#fb7185", 5);
            if (bnk.hp <= 0) this.bunkers.splice(j, 1);
            this.enemyBullets.splice(i, 1);
            hitBunker = true;
            break;
          }
        }
        if (hitBunker) continue;

        if (eb.x + eb.r > p.x + 3 && eb.x - eb.r < p.x + p.w - 3 && eb.y + eb.r > p.y + 3 && eb.y - eb.r < p.y + p.h) {
          this.enemyBullets.splice(i, 1);
          this.damagePlayer();
          return;
        }
      }

      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const pu = this.powerups[i];
        pu.y += pu.vy * dt;
        if (pu.y > h + 14) {
          this.powerups.splice(i, 1);
          continue;
        }
        if (pu.x + pu.r > p.x && pu.x - pu.r < p.x + p.w && pu.y + pu.r > p.y && pu.y - pu.r < p.y + p.h) {
          this.applyPowerup(pu);
          this.powerups.splice(i, 1);
        }
      }
    },

    drawBunker(ctx, b) {
      const ratio = Math.max(0.25, b.hp / b.maxHp);
      const cols = 5;
      const gap = 1.5;
      const cellW = (b.w - gap * (cols - 1)) / cols;
      const topH = b.h * 0.36;
      const midH = b.h * 0.28;
      const legH = b.h - topH - midH;

      ctx.save();
      ctx.fillStyle = `rgba(52, 211, 153, ${(0.3 + ratio * 0.55).toFixed(2)})`;
      ctx.strokeStyle = "#6ee7b7";
      ctx.lineWidth = 1;

      for (let c = 0; c < cols; c++) {
        const cx = b.x + c * (cellW + gap);
        const yOff = c === 0 || c === cols - 1 ? 2 : 0;
        ctx.beginPath();
        ctx.roundRect(cx, b.y + yOff, cellW, topH, 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.roundRect(b.x, b.y + topH, b.w, midH, 2);
      ctx.fill();
      ctx.stroke();

      const legW = cellW * 1.15;
      const legY = b.y + topH + midH;
      ctx.beginPath();
      ctx.roundRect(b.x + 1, legY, legW, legH, 2);
      ctx.roundRect(b.x + b.w - legW - 1, legY, legW, legH, 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    },

    drawRaiders(ctx) {
      if (!Array.isArray(this.raiders)) return;
      for (const r of this.raiders) {
        if (!r.alive) continue;
        ctx.save();
        ctx.translate(r.x, r.y);

        ctx.fillStyle = "#fb923c";
        ctx.strokeStyle = "#fed7aa";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(0, r.r);
        ctx.lineTo(r.r * 0.95, -r.r * 0.55);
        ctx.lineTo(r.r * 0.25, -r.r * 0.2);
        ctx.lineTo(0, -r.r * 0.85);
        ctx.lineTo(-r.r * 0.25, -r.r * 0.2);
        ctx.lineTo(-r.r * 0.95, -r.r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    },

    drawBoss(ctx) {
      if (!this.boss) return;
      const b = this.boss;
      const hw = b.w * 0.5;
      const hh = b.h * 0.5;
      const pulse = 0.5 + 0.5 * Math.sin(this.animClock * 8);

      ctx.save();
      ctx.translate(b.x, b.y);

      const beamGrad = ctx.createLinearGradient(0, hh * 0.2, 0, hh + 16);
      beamGrad.addColorStop(0, `rgba(56, 189, 248, ${(0.22 + pulse * 0.14).toFixed(2)})`);
      beamGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.45, hh * 0.25);
      ctx.lineTo(hw * 0.45, hh * 0.25);
      ctx.lineTo(hw * 0.68, hh + 16);
      ctx.lineTo(-hw * 0.68, hh + 16);
      ctx.closePath();
      ctx.fill();

      const domeGrad = ctx.createLinearGradient(0, -hh * 0.95, 0, -1);
      domeGrad.addColorStop(0, "#bae6fd");
      domeGrad.addColorStop(0.55, "#38bdf8");
      domeGrad.addColorStop(1, "#0284c7");
      ctx.fillStyle = domeGrad;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, -3, hw * 0.44, hh * 0.65, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();
      ctx.ellipse(-hw * 0.14, -hh * 0.52, hw * 0.16, hh * 0.14, -0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(0, -4, 4.5 + pulse * 1.2, 0, Math.PI * 2);
      ctx.fill();

      const hullGrad = ctx.createLinearGradient(0, -4, 0, hh * 0.75);
      hullGrad.addColorStop(0, "#f43f5e");
      hullGrad.addColorStop(0.55, "#be123c");
      hullGrad.addColorStop(1, "#4c0519");
      ctx.fillStyle = hullGrad;
      ctx.strokeStyle = "#fda4af";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 2, hw, hh * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 2, hw * 0.84, hh * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();

      const lightCount = 7;
      const activeIdx = Math.floor(this.animClock * 10) % lightCount;
      for (let i = 0; i < lightCount; i++) {
        const t = lightCount === 1 ? 0.5 : i / (lightCount - 1);
        const lx = -hw * 0.76 + t * (hw * 1.52);
        const ly = 2 + Math.sin(t * Math.PI) * (hh * 0.22);
        const isLit = i === activeIdx || (i + 3) % lightCount === activeIdx;
        ctx.fillStyle = isLit ? "#fef08a" : "#fda4af";
        ctx.beginPath();
        ctx.arc(lx, ly, isLit ? 2.8 : 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const barW = b.w;
      const barH = 5;
      const hpRatio = Math.max(0, b.hp / b.maxHp);
      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.strokeStyle = "rgba(253, 164, 175, 0.45)";
      ctx.lineWidth = 1;
      ctx.fillRect(-barW / 2, -hh - 12, barW, barH);
      ctx.strokeRect(-barW / 2, -hh - 12, barW, barH);

      ctx.fillStyle = "#fb7185";
      ctx.fillRect(-barW / 2 + 0.5, -hh - 11.5, Math.max(0, (barW - 1) * hpRatio), barH - 1);

      ctx.restore();
    },

    drawPlayerShip(ctx) {
      const p = this.player;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const spec = WEAPON_SPECS[this.currentWeapon] || WEAPON_SPECS.laser;

      ctx.save();
      ctx.translate(cx, cy);

      if (this.invulnTimer > 0 && Math.floor(this.animClock * 16) % 2 === 0) {
        ctx.globalAlpha = 0.65;
      }

      const flameH = 5 + Math.sin(this.animClock * 36) * 2.5;
      ctx.fillStyle = "#fb923c";
      ctx.beginPath();
      ctx.moveTo(-6, p.h * 0.45);
      ctx.lineTo(0, p.h * 0.45 + flameH);
      ctx.lineTo(6, p.h * 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.moveTo(-p.w * 0.5, p.h * 0.35);
      ctx.lineTo(-p.w * 0.18, -p.h * 0.15);
      ctx.lineTo(-p.w * 0.18, p.h * 0.42);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(p.w * 0.5, p.h * 0.35);
      ctx.lineTo(p.w * 0.18, -p.h * 0.15);
      ctx.lineTo(p.w * 0.18, p.h * 0.42);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(0, -p.h * 0.55);
      ctx.lineTo(p.w * 0.22, p.h * 0.15);
      ctx.lineTo(p.w * 0.22, p.h * 0.44);
      ctx.lineTo(-p.w * 0.22, p.h * 0.44);
      ctx.lineTo(-p.w * 0.22, p.h * 0.15);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(0, -1, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = spec.color;
      ctx.fillRect(-p.w * 0.36, -p.h * 0.12, 3, 7);
      ctx.fillRect(p.w * 0.36 - 3, -p.h * 0.12, 3, 7);

      if (this.hasShield) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w * 0.62, p.h * 0.72, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }

      if (this.invulnTimer > 0) {
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w * 0.68, p.h * 0.78, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    },

    drawEnemySymbol(ctx, e) {
      const frame = Math.floor(this.animClock * 4) % 2;
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.kind === "squid") {
        ctx.fillStyle = "#e879f9";
        ctx.beginPath();
        ctx.moveTo(0, -e.r * 0.9);
        ctx.lineTo(e.r * 0.75, -e.r * 0.15);
        ctx.lineTo(e.r * 0.45, e.r * 0.45);
        ctx.lineTo(-e.r * 0.45, e.r * 0.45);
        ctx.lineTo(-e.r * 0.75, -e.r * 0.15);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#e879f9";
        ctx.lineWidth = 2;
        const spread = frame === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.4, e.r * 0.45);
        ctx.lineTo(-e.r * 0.65 + spread * 2, e.r * 0.9);
        ctx.moveTo(e.r * 0.4, e.r * 0.45);
        ctx.lineTo(e.r * 0.65 - spread * 2, e.r * 0.9);
        ctx.stroke();

        ctx.fillStyle = "#090d16";
        ctx.fillRect(-3.5, -2, 2.5, 3);
        ctx.fillRect(1, -2, 2.5, 3);
      } else if (e.kind === "crab") {
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.roundRect(-e.r * 0.7, -e.r * 0.45, e.r * 1.4, e.r * 0.9, 4);
        ctx.fill();

        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        const armY = frame === 0 ? -e.r * 0.75 : -e.r * 0.35;
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.7, 0);
        ctx.lineTo(-e.r * 0.95, armY);
        ctx.moveTo(e.r * 0.7, 0);
        ctx.lineTo(e.r * 0.95, armY);
        ctx.stroke();

        ctx.fillStyle = "#090d16";
        ctx.fillRect(-4, -2.5, 2.5, 3);
        ctx.fillRect(1.5, -2.5, 2.5, 3);
      } else {
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(0, -e.r * 0.15, e.r * 0.68, Math.PI, 0);
        ctx.lineTo(e.r * 0.72, e.r * 0.45);
        ctx.lineTo(-e.r * 0.72, e.r * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 2;
        const legShift = frame === 0 ? 2 : -2;
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.45, e.r * 0.45);
        ctx.lineTo(-e.r * 0.45 + legShift, e.r * 0.88);
        ctx.moveTo(0, e.r * 0.45);
        ctx.lineTo(0 - legShift, e.r * 0.88);
        ctx.moveTo(e.r * 0.45, e.r * 0.45);
        ctx.lineTo(e.r * 0.45 + legShift, e.r * 0.88);
        ctx.stroke();

        ctx.fillStyle = "#090d16";
        ctx.fillRect(-4, -2, 2.5, 2.5);
        ctx.fillRect(1.5, -2, 2.5, 2.5);
      }

      ctx.restore();
    },

    drawUfo(ctx) {
      if (!this.ufo) return;
      const u = this.ufo;
      ctx.save();
      ctx.translate(u.x, u.y);

      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.ellipse(0, 0, u.w * 0.5, u.h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(0, -2, u.h * 0.42, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-7, -1, 2.5, 2.5);
      ctx.fillRect(-1.2, -1, 2.5, 2.5);
      ctx.fillRect(4.5, -1, 2.5, 2.5);

      ctx.restore();
    },

    draw() {
      if (!this.canvasCtx) return;
      const ctx = this.canvasCtx;
      const w = this.field.w || 360;
      const h = this.field.h || 500;

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      for (const b of this.bunkers) {
        this.drawBunker(ctx, b);
      }

      for (const e of this.enemies) {
        if (e.alive) this.drawEnemySymbol(ctx, e);
      }

      this.drawBoss(ctx);
      this.drawRaiders(ctx);
      this.drawUfo(ctx);

      for (const pu of this.powerups) {
        ctx.save();
        ctx.fillStyle = pu.color;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#090d16";
        ctx.font = "900 9px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pu.label || "W", pu.x, pu.y + 0.5);
        ctx.restore();
      }

      for (const b of this.playerBullets) {
        ctx.fillStyle = b.color || "#22d3ee";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const eb of this.enemyBullets) {
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      this.drawPlayerShip(ctx);

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
      this.keys.left = false;
      this.keys.right = false;
      this.keys.fire = false;
      this.pointerActive = false;
      this.pointerTargetX = null;
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
      this.switchWeaponBtn?.removeEventListener("click", this.onSwitchWeaponClick);
      this.fireBtn?.removeEventListener("pointerdown", this.onFireDown);
      window.removeEventListener("pointerup", this.onFireUp);
      window.removeEventListener("pointercancel", this.onFireUp);
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