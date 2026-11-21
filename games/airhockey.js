(() => {
  "use strict";

  const AI_CONFIG = {
    easy: { speed: 220, reactZone: 0.48, jitter: 36 },
    medium: { speed: 340, reactZone: 0.55, jitter: 16 },
    hard: { speed: 470, reactZone: 0.65, jitter: 4 }
  };

  window.GAME_REGISTRY?.register({
    id: "airhockey",
    name: "Neon Air Hockey",
    subtitle: "1P vs. KI & 2P Multi-Touch • Tore bis 7",
    tag: "2P / VS AI",
    icon: "🏒",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.paused = false;
      this.phase = "menu"; // menu | playing | gameover
      this.mode = "ai"; // ai | pvp
      this.aiDifficulty = "medium";
      this.winScore = 7;

      this.table = { x: 0, y: 0, w: 300, h: 500, goalW: 110 };
      this.p1 = { x: 0, y: 0, vx: 0, vy: 0, r: 24, score: 0, color: "#22d3ee", name: "Spieler 1" };
      this.p2 = { x: 0, y: 0, vx: 0, vy: 0, r: 24, score: 0, color: "#f472b6", name: "Spieler 2" };
      this.puck = { x: 0, y: 0, vx: 0, vy: 0, r: 14, trail: [] };
      this.particles = [];
      this.touches = new Map(); // pointerId -> { x, y, pointerType }
      this.aiTargetX = null;
      this.aiJitterTimer = 0;
      this.winnerText = "";

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex items-center justify-center bg-[#04040a] overflow-hidden";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block w-full h-full touch-none";
      this.canvasCtx = this.canvas.getContext("2d");

      this.overlay = document.createElement("div");
      this.overlay.className = "absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4";
      this.renderMenu();

      this.root.appendChild(this.canvas);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.onPointerDown = this.handlePointerDown.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerUp = this.handlePointerUp.bind(this);

      this.canvas.addEventListener("pointerdown", this.onPointerDown);
      this.canvas.addEventListener("pointermove", this.onPointerMove);
      this.canvas.addEventListener("pointerup", this.onPointerUp);
      this.canvas.addEventListener("pointercancel", this.onPointerUp);

      this.resize();
    },

    renderMenu() {
      const diffs = [
        { id: "easy", label: "Leicht" },
        { id: "medium", label: "Mittel" },
        { id: "hard", label: "Schwer" }
      ];

      this.overlay.innerHTML = `
        <div class="w-full max-w-sm rounded-2xl border border-cyan-400/35 bg-slate-900/95 p-5 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <h3 class="font-orbitron text-xl font-black text-center text-cyan-300 mb-1">NEON AIR HOCKEY</h3>
          <p class="text-xs text-center text-slate-400 mb-4">Erste ${this.winScore} Tore gewinnen</p>

          <div class="mb-4">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Spielmodus</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-mode="ai"
                class="py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                  this.mode === "ai"
                    ? "bg-cyan-400 text-slate-950 border-cyan-300"
                    : "bg-slate-800/90 text-slate-300 border-slate-700 hover:border-cyan-400/50"
                }"
              >1P vs. KI</button>
              <button
                type="button"
                data-mode="pvp"
                class="py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                  this.mode === "pvp"
                    ? "bg-fuchsia-500 text-white border-fuchsia-400"
                    : "bg-slate-800/90 text-slate-300 border-slate-700 hover:border-fuchsia-400/50"
                }"
              >2 Spieler</button>
            </div>
          </div>

          ${this.mode === "ai" ? `
            <div class="mb-5">
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">KI-Stärke</label>
              <div class="grid grid-cols-3 gap-2">
                ${diffs.map((d) => `
                  <button
                    type="button"
                    data-diff="${d.id}"
                    class="py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                      this.aiDifficulty === d.id
                        ? "bg-fuchsia-500 text-white border-fuchsia-400"
                        : "bg-slate-800/90 text-slate-300 border-slate-700 hover:border-fuchsia-400/50"
                    }"
                  >${d.label}</button>
                `).join("")}
              </div>
            </div>
          ` : `
            <div class="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300 space-y-1">
              <div><span class="text-cyan-300 font-bold">Untere Hälfte:</span> Spieler 1</div>
              <div><span class="text-pink-400 font-bold">Obere Hälfte:</span> Spieler 2 (Multi-Touch)</div>
            </div>
          `}

          <button
            type="button"
            data-action="start"
            class="w-full py-3 rounded-xl font-orbitron text-sm font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 hover:opacity-95 active:scale-98 transition"
          >
            Match starten
          </button>
        </div>
      `;

      this.overlay.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.mode = btn.dataset.mode;
          this.ctx.sound.playHit();
          this.renderMenu();
        });
      });

      this.overlay.querySelectorAll("[data-diff]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.aiDifficulty = btn.dataset.diff;
          this.ctx.sound.playHit();
          this.renderMenu();
        });
      });

      this.overlay.querySelector('[data-action="start"]')?.addEventListener("click", () => {
        this.ctx.sound.playScore();
        this.beginMatch();
      });
    },

    resize() {
      if (!this.root || !this.canvas) return;
      const rect = this.root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(240, rect.width);
      const h = Math.max(300, rect.height);

      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const padX = 12;
      const padY = 12;
      const availW = Math.max(180, w - padX * 2);
      const availH = Math.max(240, h - padY * 2);

      // Schlankes Spielfeld wie ein echter Air-Hockey-Tisch
      const tableW = Math.min(availW, availH * 0.68);
      const tableH = availH;

      this.table = {
        x: (w - tableW) / 2,
        y: (h - tableH) / 2,
        w: tableW,
        h: tableH,
        goalW: Math.max(76, Math.min(148, tableW * 0.36))
      };

      const scale = Math.min(tableW / 320, tableH / 520);
      this.p1.r = Math.max(19, Math.min(28, 24 * scale));
      this.p2.r = this.p1.r;
      this.puck.r = Math.max(11, Math.min(17, 14 * scale));

      if (!this.positionsInitialized) {
        this.resetPositions(1);
        this.positionsInitialized = true;
      } else {
        this.clampMallets();
      }
    },

    clampMallets() {
      const midY = this.table.y + this.table.h / 2;
      const minX1 = this.table.x + this.p1.r;
      const maxX1 = this.table.x + this.table.w - this.p1.r;
      const minY1 = midY + this.p1.r + 4;
      const maxY1 = this.table.y + this.table.h - this.p1.r;

      this.p1.x = Math.max(minX1, Math.min(maxX1, this.p1.x));
      this.p1.y = Math.max(minY1, Math.min(maxY1, this.p1.y));

      const minX2 = this.table.x + this.p2.r;
      const maxX2 = this.table.x + this.table.w - this.p2.r;
      const minY2 = this.table.y + this.p2.r;
      const maxY2 = midY - this.p2.r - 4;

      this.p2.x = Math.max(minX2, Math.min(maxX2, this.p2.x));
      this.p2.y = Math.max(minY2, Math.min(maxY2, this.p2.y));
    },

    resetPositions(serveDir = 1) {
      const cx = this.table.x + this.table.w / 2;
      const cy = this.table.y + this.table.h / 2;

      this.p1.x = cx;
      this.p1.y = this.table.y + this.table.h - this.p1.r * 2.2;
      this.p1.vx = 0;
      this.p1.vy = 0;

      this.p2.x = cx;
      this.p2.y = this.table.y + this.p2.r * 2.2;
      this.p2.vx = 0;
      this.p2.vy = 0;

      this.puck.x = cx;
      this.puck.y = cy;
      this.puck.trail = [];

      const angle = (Math.random() * 0.7 - 0.35);
      const speed = Math.min(this.table.w, this.table.h) * 0.95;
      this.puck.vx = Math.sin(angle) * speed;
      this.puck.vy = Math.cos(angle) * speed * serveDir;
    },

    beginMatch() {
      this.overlay.classList.add("hidden");
      this.phase = "playing";
      this.p1.score = 0;
      this.p2.score = 0;
      this.p2.name = this.mode === "ai" ? "KI" : "Spieler 2";
      this.particles = [];
      this.touches.clear();
      this.positionsInitialized = false;
      this.resize();
      this.resetPositions(Math.random() < 0.5 ? 1 : -1);
    },

    spawnParticles(x, y, color, count = 16) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 70 + Math.random() * 210;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          color,
          size: 2.5 + Math.random() * 3
        });
      }
    },

    handlePointerDown(e) {
      if (this.phase !== "playing" || this.paused) return;
      this.canvas.setPointerCapture?.(e.pointerId);
      const rect = this.canvas.getBoundingClientRect();
      this.touches.set(e.pointerId, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pointerType: e.pointerType || "touch"
      });
    },

    handlePointerMove(e) {
      if (!this.touches.has(e.pointerId)) return;
      const rect = this.canvas.getBoundingClientRect();
      const prev = this.touches.get(e.pointerId);
      this.touches.set(e.pointerId, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pointerType: prev?.pointerType || e.pointerType || "touch"
      });
    },

    handlePointerUp(e) {
      this.touches.delete(e.pointerId);
    },

    moveMalletTowards(mallet, targetX, targetY, maxSpeed, dt) {
      const dx = targetX - mallet.x;
      const dy = targetY - mallet.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) {
        mallet.vx = 0;
        mallet.vy = 0;
        return;
      }
      const step = Math.min(dist, maxSpeed * dt);
      const nextX = mallet.x + (dx / dist) * step;
      const nextY = mallet.y + (dy / dist) * step;
      mallet.vx = (nextX - mallet.x) / dt;
      mallet.vy = (nextY - mallet.y) / dt;
      mallet.x = nextX;
      mallet.y = nextY;
    },

    applyControls(dt) {
      const midY = this.table.y + this.table.h / 2;
      let p1Touch = null;
      let p2Touch = null;

      for (const pt of this.touches.values()) {
        if (pt.y >= midY) {
          p1Touch = pt;
        } else if (this.mode === "pvp") {
          p2Touch = pt;
        }
      }

      if (p1Touch) {
        // Auf Touch-Displays leichten Versatz nach oben, damit der Finger den Schläger nicht verdeckt
        const liftY = p1Touch.pointerType === "touch" ? -16 : 0;
        this.moveMalletTowards(this.p1, p1Touch.x, p1Touch.y + liftY, 1450, dt);
      } else {
        const gHeld = window.GLOBAL_MOBILE_CONTROLS?.held;
        if (gHeld && (gHeld.left || gHeld.right || gHeld.up || gHeld.down)) {
          let ax = 0;
          let ay = 0;
          if (gHeld.left) ax -= 1;
          if (gHeld.right) ax += 1;
          if (gHeld.up) ay -= 1;
          if (gHeld.down) ay += 1;
          const spd = 750;
          this.moveMalletTowards(this.p1, this.p1.x + ax * 120, this.p1.y + ay * 120, spd, dt);
        } else {
          this.p1.vx *= 0.7;
          this.p1.vy *= 0.7;
        }
      }

      if (this.mode === "pvp") {
        if (p2Touch) {
          const pushY = p2Touch.pointerType === "touch" ? 16 : 0;
          this.moveMalletTowards(this.p2, p2Touch.x, p2Touch.y + pushY, 1450, dt);
        } else {
          this.p2.vx *= 0.7;
          this.p2.vy *= 0.7;
        }
      } else {
        this.updateAI(dt);
      }

      this.clampMallets();
    },

    updateAI(dt) {
      const cfg = AI_CONFIG[this.aiDifficulty] || AI_CONFIG.medium;
      const midY = this.table.y + this.table.h / 2;
      const homeY = this.table.y + this.p2.r * 2.3;

      this.aiJitterTimer -= dt;
      if (this.aiJitterTimer <= 0) {
        this.aiJitterTimer = 0.25 + Math.random() * 0.35;
        this.aiTargetX = (Math.random() * 2 - 1) * cfg.jitter;
      }

      const puckInOwnHalf = this.puck.y < midY + this.table.h * (cfg.reactZone - 0.5);
      const targetX = puckInOwnHalf
        ? this.puck.x + (this.aiTargetX || 0)
        : this.table.x + this.table.w / 2 + (this.aiTargetX || 0) * 0.5;
      const targetY = puckInOwnHalf && this.puck.y < midY
        ? Math.max(this.table.y + this.p2.r, Math.min(midY - this.p2.r - 8, this.puck.y))
        : homeY;

      this.moveMalletTowards(this.p2, targetX, targetY, cfg.speed, dt);
    },

    resolveMalletCollision(mallet) {
      const dx = this.puck.x - mallet.x;
      const dy = this.puck.y - mallet.y;
      const minDist = this.puck.r + mallet.r;
      const dist = Math.hypot(dx, dy);

      if (dist <= 0.0001 || dist >= minDist) return;

      const nx = dx / dist;
      const ny = dy / dist;

      const overlap = minDist - dist;
      this.puck.x += nx * overlap;
      this.puck.y += ny * overlap;

      const rvx = this.puck.vx - mallet.vx;
      const rvy = this.puck.vy - mallet.vy;
      const velAlongNormal = rvx * nx + rvy * ny;

      if (velAlongNormal > 0) return;

      const restitution = 0.88;
      const impulse = -(1 + restitution) * velAlongNormal;

      this.puck.vx += impulse * nx + mallet.vx * 0.35;
      this.puck.vy += impulse * ny + mallet.vy * 0.35;

      const minSpd = Math.min(this.table.w, this.table.h) * 0.55;
      const maxSpd = Math.min(this.table.w, this.table.h) * 2.15;
      const spd = Math.hypot(this.puck.vx, this.puck.vy);
      if (spd < minSpd) {
        const scale = minSpd / Math.max(0.001, spd);
        this.puck.vx *= scale;
        this.puck.vy *= scale;
      } else if (spd > maxSpd) {
        const scale = maxSpd / spd;
        this.puck.vx *= scale;
        this.puck.vy *= scale;
      }

      this.spawnParticles(this.puck.x - nx * this.puck.r, this.puck.y - ny * this.puck.r, mallet.color, 10);
      this.ctx.sound.playHit();
    },

    onGoalScored(scorer) {
      scorer.score += 1;
      this.ctx.sound.playScore();
      this.spawnParticles(this.puck.x, this.puck.y, scorer.color, 24);

      if (scorer.score >= this.winScore) {
        this.phase = "gameover";
        this.winnerText = `${scorer.name} gewinnt!`;
        this.renderGameOver();
        return;
      }

      this.resetPositions(scorer === this.p1 ? -1 : 1);
    },

    renderGameOver() {
      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-sm rounded-2xl border border-fuchsia-400/40 bg-slate-900/95 p-6 text-center shadow-[0_0_35px_rgba(244,114,182,0.22)]">
          <h3 class="font-orbitron text-xl font-black text-fuchsia-300 mb-1">TOR-SIEG!</h3>
          <p class="text-lg font-bold text-white mb-1">${this.winnerText}</p>
          <p class="text-xs text-slate-400 mb-5">Endstand: ${this.p1.name} ${this.p1.score} : ${this.p2.score} ${this.p2.name}</p>
          <div class="flex flex-col gap-2.5">
            <button type="button" data-action="rematch" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition">
              Revanche
            </button>
            <button type="button" data-action="menu" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition">
              Modus wählen
            </button>
          </div>
        </div>
      `;

      this.overlay.querySelector('[data-action="rematch"]')?.addEventListener("click", () => {
        this.beginMatch();
      });
      this.overlay.querySelector('[data-action="menu"]')?.addEventListener("click", () => {
        this.phase = "menu";
        this.renderMenu();
      });
    },

    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      if (this.phase !== "playing" || this.paused) return;

      this.applyControls(dt);

      const damping = Math.pow(0.985, dt * 60);
      this.puck.vx *= damping;
      this.puck.vy *= damping;

      this.puck.x += this.puck.vx * dt;
      this.puck.y += this.puck.vy * dt;

      this.puck.trail.push({ x: this.puck.x, y: this.puck.y });
      if (this.puck.trail.length > 9) this.puck.trail.shift();

      this.resolveMalletCollision(this.p1);
      this.resolveMalletCollision(this.p2);

      const left = this.table.x;
      const right = this.table.x + this.table.w;
      const top = this.table.y;
      const bottom = this.table.y + this.table.h;
      const goalLeft = this.table.x + (this.table.w - this.table.goalW) / 2;
      const goalRight = this.table.x + (this.table.w + this.table.goalW) / 2;

      if (this.puck.x - this.puck.r < left) {
        this.puck.x = left + this.puck.r;
        this.puck.vx = Math.abs(this.puck.vx) * 0.94;
        this.ctx.sound.playWall();
      } else if (this.puck.x + this.puck.r > right) {
        this.puck.x = right - this.puck.r;
        this.puck.vx = -Math.abs(this.puck.vx) * 0.94;
        this.ctx.sound.playWall();
      }

      if (this.puck.y - this.puck.r < top) {
        if (this.puck.x > goalLeft && this.puck.x < goalRight) {
          this.onGoalScored(this.p1);
          return;
        }
        this.puck.y = top + this.puck.r;
        this.puck.vy = Math.abs(this.puck.vy) * 0.94;
        this.ctx.sound.playWall();
      }

      if (this.puck.y + this.puck.r > bottom) {
        if (this.puck.x > goalLeft && this.puck.x < goalRight) {
          this.onGoalScored(this.p2);
          return;
        }
        this.puck.y = bottom - this.puck.r;
        this.puck.vy = -Math.abs(this.puck.vy) * 0.94;
        this.ctx.sound.playWall();
      }
    },

    drawMallet(mallet) {
      const ctx = this.canvasCtx;
      ctx.save();
      ctx.fillStyle = "rgba(10, 15, 30, 0.9)";
      ctx.strokeStyle = mallet.color;
      ctx.shadowColor = mallet.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(mallet.x, mallet.y, mallet.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = mallet.color;
      ctx.beginPath();
      ctx.arc(mallet.x, mallet.y, mallet.r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    draw() {
      const ctx = this.canvasCtx;
      const w = this.canvas.clientWidth || 360;
      const h = this.canvas.clientHeight || 640;
      const t = this.table;
      const midY = t.y + t.h / 2;
      const goalLeft = t.x + (t.w - t.goalW) / 2;
      const goalRight = t.x + (t.w + t.goalW) / 2;

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      ctx.fillStyle = "rgba(8, 14, 28, 0.72)";
      ctx.fillRect(t.x, t.y, t.w, t.h);

      ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(t.x, t.y, t.w, t.h);

      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(t.x, midY);
      ctx.lineTo(t.x + t.w, midY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(t.x + t.w / 2, midY, Math.min(t.w, t.h) * 0.14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 4;
      ctx.strokeStyle = "#f472b6";
      ctx.beginPath();
      ctx.moveTo(goalLeft, t.y);
      ctx.lineTo(goalRight, t.y);
      ctx.stroke();

      ctx.strokeStyle = "#22d3ee";
      ctx.beginPath();
      ctx.moveTo(goalLeft, t.y + t.h);
      ctx.lineTo(goalRight, t.y + t.h);
      ctx.stroke();

      ctx.font = "900 28px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(244, 114, 182, 0.35)";
      ctx.fillText(String(this.p2.score), t.x + t.w / 2, midY - 36);
      ctx.fillStyle = "rgba(34, 211, 238, 0.35)";
      ctx.fillText(String(this.p1.score), t.x + t.w / 2, midY + 36);

      for (let i = 0; i < this.puck.trail.length; i++) {
        const tr = this.puck.trail[i];
        ctx.globalAlpha = ((i + 1) / this.puck.trail.length) * 0.22;
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, this.puck.r * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#f8fafc";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(this.puck.x, this.puck.y, this.puck.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      this.drawMallet(this.p2);
      this.drawMallet(this.p1);

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
      this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
      this.canvas?.removeEventListener("pointermove", this.onPointerMove);
      this.canvas?.removeEventListener("pointerup", this.onPointerUp);
      this.canvas?.removeEventListener("pointercancel", this.onPointerUp);
      this.touches.clear();
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      this.root = null;
      this.canvas = null;
      this.ctx = null;
    }
  });
})();