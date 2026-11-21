(() => {
  "use strict";

  const PLAYER_CONFIG = [
    { id: 0, name: "P1 Unten", edge: "bottom", color: "#22d3ee", glow: "rgba(34, 211, 238, 0.55)" },
    { id: 1, name: "P2 Oben", edge: "top", color: "#f472b6", glow: "rgba(244, 114, 182, 0.55)" },
    { id: 2, name: "P3 Links", edge: "left", color: "#4ade80", glow: "rgba(74, 222, 128, 0.55)" },
    { id: 3, name: "P4 Rechts", edge: "right", color: "#facc15", glow: "rgba(250, 204, 21, 0.55)" }
  ];

  const AI_SPEED = {
    easy: 195,
    medium: 310,
    hard: 440
  };

  window.GAME_REGISTRY?.register({
    id: "pong",
    name: "Neon Pong",
    subtitle: "1–4 Spieler • Multi-Touch & Quadrat-Arena",
    tag: "1–4P Arcade",
    icon: "🏓",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.paused = false;
      this.phase = "menu"; // menu | playing | gameover
      this.playerCount = 1;
      this.aiDifficulty = "medium";
      this.winScore = 7;
      this.startLives = 5;

      this.arena = { x: 0, y: 0, size: 300, width: 300, height: 300, isSquare: false };
      this.players = [];
      this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 8, speed: 340, color: "#22d3ee", trail: [] };
      this.particles = [];
      this.touches = new Map(); // pointerId -> { x, y }
      this.winnerText = "";

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex items-center justify-center bg-[#04040a] overflow-hidden";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block w-full h-full touch-none select-none";
      this.canvas.style.touchAction = "none";
      this.canvasCtx = this.canvas.getContext("2d");

      this.menuOverlay = document.createElement("div");
      this.menuOverlay.className = "absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4";
      this.renderMenu();

      this.root.appendChild(this.canvas);
      this.root.appendChild(this.menuOverlay);
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

    getSafeBottomInset() {
      const probe = document.createElement("div");
      probe.style.position = "fixed";
      probe.style.bottom = "0";
      probe.style.height = "env(safe-area-inset-bottom, 0px)";
      probe.style.pointerEvents = "none";
      probe.style.visibility = "hidden";
      document.body.appendChild(probe);
      const inset = probe.getBoundingClientRect().height || 0;
      probe.remove();
      return inset;
    },

    renderMenu() {
      const counts = [1, 2, 3, 4];
      const diffs = [
        { id: "easy", label: "Leicht" },
        { id: "medium", label: "Mittel" },
        { id: "hard", label: "Schwer" }
      ];

      this.menuOverlay.innerHTML = `
        <div class="w-full max-w-sm rounded-2xl border border-cyan-400/35 bg-slate-900/95 p-5 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <h3 class="font-orbitron text-xl font-black text-center text-cyan-300 mb-1">NEON PONG</h3>
          <p class="text-xs text-center text-slate-400 mb-4">
            ${this.playerCount <= 2 ? "Erste 7 Punkte gewinnen" : "5 Leben • Aus = Neon-Wand"}
          </p>

          <div class="mb-4">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Spieleranzahl</label>
            <div class="grid grid-cols-4 gap-2">
              ${counts.map((n) => `
                <button
                  type="button"
                  data-count="${n}"
                  class="py-2 rounded-xl font-orbitron text-sm font-bold border transition ${
                    this.playerCount === n
                      ? "bg-cyan-400 text-slate-950 border-cyan-300"
                      : "bg-slate-800/90 text-slate-200 border-slate-700 hover:border-cyan-400/50"
                  }"
                >${n}P</button>
              `).join("")}
            </div>
          </div>

          ${this.playerCount === 1 ? `
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
              <div><span class="text-cyan-300 font-bold">Unten:</span> P1 • <span class="text-pink-400 font-bold">Oben:</span> P2</div>
              ${this.playerCount >= 3 ? `<div><span class="text-green-400 font-bold">Links:</span> P3${this.playerCount === 4 ? ` • <span class="text-yellow-300 font-bold">Rechts:</span> P4` : ""}</div>` : ""}
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

      this.menuOverlay.querySelectorAll("[data-count]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.playerCount = Number(btn.dataset.count);
          this.ctx.sound.playHit();
          this.renderMenu();
        });
      });

      this.menuOverlay.querySelectorAll("[data-diff]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.aiDifficulty = btn.dataset.diff;
          this.ctx.sound.playHit();
          this.renderMenu();
        });
      });

      this.menuOverlay.querySelector('[data-action="start"]')?.addEventListener("click", () => {
        this.ctx.sound.playScore();
        this.beginMatch();
      });
    },

    resize() {
      if (!this.root || !this.canvas) return;
      const rect = this.root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(240, rect.width);
      const h = Math.max(240, rect.height);

      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isMobileLike = w < 768 || navigator.maxTouchPoints > 0;
      const safeBottom = this.getSafeBottomInset();
      const sidePad = 12;
      const topPad = 12;
      // Extra Puffer unten, damit die untere Navigationsleiste am Handy nicht versehentlich ausgelöst wird
      const bottomPad = isMobileLike ? Math.max(36, safeBottom + 28) : 14;

      const availW = Math.max(180, w - sidePad * 2);
      const availH = Math.max(180, h - topPad - bottomPad);

      if (this.playerCount >= 3) {
        const size = Math.min(availW, availH);
        this.arena = {
          x: (w - size) / 2,
          y: topPad + (availH - size) / 2,
          size,
          width: size,
          height: size,
          isSquare: true
        };
      } else {
        this.arena = {
          x: sidePad,
          y: topPad,
          size: Math.min(availW, availH),
          width: availW,
          height: availH,
          isSquare: false
        };
      }

      this.syncPaddleDimensions();
    },

    syncPaddleDimensions() {
      const isSq = this.arena.isSquare;
      const paddleLen = Math.max(58, Math.min(114, (isSq ? this.arena.size : this.arena.width) * 0.24));
      const paddleThick = 12;

      for (const p of this.players) {
        if (p.edge === "bottom" || p.edge === "top") {
          p.w = paddleLen;
          p.h = paddleThick;
          if (!p.posInitialized) {
            p.x = this.arena.x + this.arena.width / 2 - p.w / 2;
            p.posInitialized = true;
          } else {
            p.x = Math.max(this.arena.x, Math.min(this.arena.x + this.arena.width - p.w, p.x));
          }
          p.y = p.edge === "bottom" ? this.arena.y + this.arena.height - 22 : this.arena.y + 10;
        } else {
          p.w = paddleThick;
          p.h = paddleLen;
          if (!p.posInitialized) {
            p.y = this.arena.y + this.arena.height / 2 - p.h / 2;
            p.posInitialized = true;
          } else {
            p.y = Math.max(this.arena.y, Math.min(this.arena.y + this.arena.height - p.h, p.y));
          }
          p.x = p.edge === "left" ? this.arena.x + 10 : this.arena.x + this.arena.width - 22;
        }
      }
    },

    beginMatch() {
      this.menuOverlay.classList.add("hidden");
      this.phase = "playing";
      this.particles = [];
      this.touches.clear();
      this.winnerText = "";

      const activeCount = this.playerCount === 1 ? 2 : this.playerCount;
      this.players = [];

      for (let i = 0; i < activeCount; i++) {
        const cfg = PLAYER_CONFIG[i];
        this.players.push({
          ...cfg,
          isAI: this.playerCount === 1 && i === 1,
          score: 0,
          lives: this.startLives,
          eliminated: false,
          x: 0,
          y: 0,
          w: 80,
          h: 12,
          posInitialized: false
        });
      }

      this.resize();
      this.resetBall(Math.random() < 0.5 ? 1 : -1);
    },

    resetBall(dirY = 1) {
      this.ball.x = this.arena.x + this.arena.width / 2;
      this.ball.y = this.arena.y + this.arena.height / 2;
      this.ball.speed = Math.min(this.arena.width, this.arena.height) * 0.72;
      const angle = (Math.random() * 0.6 - 0.3);
      if (this.arena.isSquare) {
        const rad = Math.random() * Math.PI * 2;
        this.ball.vx = Math.cos(rad) * this.ball.speed;
        this.ball.vy = Math.sin(rad) * this.ball.speed;
      } else {
        this.ball.vx = Math.sin(angle) * this.ball.speed;
        this.ball.vy = Math.cos(angle) * this.ball.speed * dirY;
      }
      this.ball.trail = [];
    },

    spawnParticles(x, y, color, count = 14) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 190;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          color,
          size: 2 + Math.random() * 3
        });
      }
    },

    handlePointerDown(e) {
      if (this.phase !== "playing" || this.paused) return;
      e.preventDefault();
      this.canvas.setPointerCapture?.(e.pointerId);
      const rect = this.canvas.getBoundingClientRect();
      this.touches.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    },

    handlePointerMove(e) {
      if (!this.touches.has(e.pointerId)) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      this.touches.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    },

    handlePointerUp(e) {
      this.touches.delete(e.pointerId);
    },

    applyTouchControls(dt = 0.016) {
      const midX = this.arena.x + this.arena.width / 2;
      const midY = this.arena.y + this.arena.height / 2;

      for (const p of this.players) {
        if (p.eliminated || p.isAI) continue;

        let bestPt = null;
        let bestDist = Infinity;

        for (const pt of this.touches.values()) {
          if (this.arena.isSquare) {
            const relX = pt.x - midX;
            const relY = pt.y - midY;
            const inBottom = relY >= Math.abs(relX) && pt.y >= midY;
            const inTop = -relY >= Math.abs(relX) && pt.y <= midY;
            const inLeft = -relX > Math.abs(relY) && pt.x <= midX;
            const inRight = relX > Math.abs(relY) && pt.x >= midX;

            if (p.edge === "bottom" && inBottom) {
              const d = Math.abs(pt.y - (this.arena.y + this.arena.height));
              if (d < bestDist) { bestDist = d; bestPt = pt; }
            } else if (p.edge === "top" && inTop) {
              const d = Math.abs(pt.y - this.arena.y);
              if (d < bestDist) { bestDist = d; bestPt = pt; }
            } else if (p.edge === "left" && inLeft) {
              const d = Math.abs(pt.x - this.arena.x);
              if (d < bestDist) { bestDist = d; bestPt = pt; }
            } else if (p.edge === "right" && inRight) {
              const d = Math.abs(pt.x - (this.arena.x + this.arena.width));
              if (d < bestDist) { bestDist = d; bestPt = pt; }
            }
          } else {
            if (p.edge === "bottom") {
              const d = Math.abs(pt.y - (this.arena.y + this.arena.height));
              if (pt.y >= midY && d < bestDist) {
                bestDist = d;
                bestPt = pt;
              }
            } else if (p.edge === "top") {
              const d = Math.abs(pt.y - this.arena.y);
              if (pt.y <= midY && d < bestDist) {
                bestDist = d;
                bestPt = pt;
              }
            }
          }
        }

        if (bestPt) {
          if (p.edge === "bottom" || p.edge === "top") {
            p.x = Math.max(this.arena.x, Math.min(this.arena.x + this.arena.width - p.w, bestPt.x - p.w / 2));
          } else {
            p.y = Math.max(this.arena.y, Math.min(this.arena.y + this.arena.height - p.h, bestPt.y - p.h / 2));
          }
        } else if (p.edge === "bottom") {
          // Virtueller Joystick / D-Pad Steuerung für Spieler 1
          const gHeld = window.GLOBAL_MOBILE_CONTROLS?.held || this.ctx?.controls?.held;
          if (gHeld) {
            const spd = this.arena.width * 1.05 * dt;
            if (gHeld.left) {
              p.x = Math.max(this.arena.x, p.x - spd);
            } else if (gHeld.right) {
              p.x = Math.min(this.arena.x + this.arena.width - p.w, p.x + spd);
            }
          }
        }
      }
    },

    updateAI(dt) {
      const spd = AI_SPEED[this.aiDifficulty] || AI_SPEED.medium;
      for (const p of this.players) {
        if (!p.isAI || p.eliminated) continue;
        if (p.edge === "top") {
          const center = p.x + p.w / 2;
          const diff = this.ball.x - center;
          const step = Math.sign(diff) * Math.min(Math.abs(diff), spd * dt);
          p.x = Math.max(this.arena.x, Math.min(this.arena.x + this.arena.width - p.w, p.x + step));
        }
      }
    },

    handlePaddleBounce(p) {
      const b = this.ball;
      const hit =
        b.x + b.radius > p.x &&
        b.x - b.radius < p.x + p.w &&
        b.y + b.radius > p.y &&
        b.y - b.radius < p.y + p.h;

      if (!hit) return false;

      b.speed = Math.min(b.speed * 1.045, Math.max(this.arena.width, this.arena.height) * 1.55);
      b.color = p.color;

      if (p.edge === "bottom" || p.edge === "top") {
        const rel = ((b.x - (p.x + p.w / 2)) / (p.w / 2));
        const clamped = Math.max(-0.85, Math.min(0.85, rel));
        const dirY = p.edge === "bottom" ? -1 : 1;
        const angle = clamped * (Math.PI / 3);
        b.vx = Math.sin(angle) * b.speed;
        b.vy = Math.cos(angle) * b.speed * dirY;
        b.y = p.edge === "bottom" ? p.y - b.radius - 1 : p.y + p.h + b.radius + 1;
      } else {
        const rel = ((b.y - (p.y + p.h / 2)) / (p.h / 2));
        const clamped = Math.max(-0.85, Math.min(0.85, rel));
        const dirX = p.edge === "left" ? 1 : -1;
        const angle = clamped * (Math.PI / 3);
        b.vx = Math.cos(angle) * b.speed * dirX;
        b.vy = Math.sin(angle) * b.speed;
        b.x = p.edge === "left" ? p.x + p.w + b.radius + 1 : p.x - b.radius - 1;
      }

      this.spawnParticles(b.x, b.y, p.color, 12);
      this.ctx.sound.playHit();
      return true;
    },

    onEdgeMiss(edge) {
      const b = this.ball;
      this.ctx.sound.playLose();
      this.spawnParticles(b.x, b.y, "#f43f5e", 18);

      if (!this.arena.isSquare) {
        if (edge === "bottom") {
          this.players[1].score += 1;
        } else if (edge === "top") {
          this.players[0].score += 1;
        }
        const champ = this.players.find((pl) => pl.score >= this.winScore);
        if (champ) {
          this.phase = "gameover";
          this.winnerText = champ.isAI ? "KI gewinnt!" : `${champ.name} gewinnt!`;
          this.renderGameOver();
          return;
        }
        this.resetBall(edge === "bottom" ? -1 : 1);
        return;
      }

      const owner = this.players.find((pl) => pl.edge === edge && !pl.eliminated);
      if (owner) {
        owner.lives -= 1;
        if (owner.lives <= 0) {
          owner.lives = 0;
          owner.eliminated = true;
        }
      }

      const alive = this.players.filter((pl) => !pl.eliminated);
      if (alive.length <= 1) {
        this.phase = "gameover";
        this.winnerText = alive.length === 1 ? `${alive[0].name} gewinnt!` : "Unentschieden";
        this.renderGameOver();
        return;
      }

      this.resetBall(Math.random() < 0.5 ? 1 : -1);
    },

    renderGameOver() {
      this.menuOverlay.classList.remove("hidden");
      this.menuOverlay.innerHTML = `
        <div class="w-full max-w-sm rounded-2xl border border-fuchsia-400/40 bg-slate-900/95 p-6 text-center shadow-[0_0_35px_rgba(244,114,182,0.22)]">
          <h3 class="font-orbitron text-xl font-black text-fuchsia-300 mb-2">GAME OVER</h3>
          <p class="text-lg font-bold text-white mb-5">${this.winnerText}</p>
          <div class="flex flex-col gap-2.5">
            <button type="button" data-action="rematch" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition">
              Nochmal spielen
            </button>
            <button type="button" data-action="menu" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition">
              Modus wählen
            </button>
          </div>
        </div>
      `;

      this.menuOverlay.querySelector('[data-action="rematch"]')?.addEventListener("click", () => {
        this.beginMatch();
      });
      this.menuOverlay.querySelector('[data-action="menu"]')?.addEventListener("click", () => {
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

      this.applyTouchControls(dt);
      this.updateAI(dt);

      const b = this.ball;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.trail.push({ x: b.x, y: b.y, color: b.color });
      if (b.trail.length > 10) b.trail.shift();

      for (const p of this.players) {
        if (!p.eliminated) {
          this.handlePaddleBounce(p);
        }
      }

      const leftX = this.arena.x;
      const rightX = this.arena.x + this.arena.width;
      const topY = this.arena.y;
      const botY = this.arena.y + this.arena.height;

      if (b.x - b.radius < leftX) {
        const pLeft = this.players.find((pl) => pl.edge === "left");
        if (this.arena.isSquare && pLeft && !pLeft.eliminated) {
          this.onEdgeMiss("left");
          return;
        }
        b.x = leftX + b.radius;
        b.vx = Math.abs(b.vx);
        this.ctx.sound.playWall();
      } else if (b.x + b.radius > rightX) {
        const pRight = this.players.find((pl) => pl.edge === "right");
        if (this.arena.isSquare && pRight && !pRight.eliminated) {
          this.onEdgeMiss("right");
          return;
        }
        b.x = rightX - b.radius;
        b.vx = -Math.abs(b.vx);
        this.ctx.sound.playWall();
      }

      if (b.y - b.radius < topY) {
        const pTop = this.players.find((pl) => pl.edge === "top");
        if (!this.arena.isSquare || (pTop && !pTop.eliminated)) {
          this.onEdgeMiss("top");
          return;
        }
        b.y = topY + b.radius;
        b.vy = Math.abs(b.vy);
        this.ctx.sound.playWall();
      } else if (b.y + b.radius > botY) {
        const pBot = this.players.find((pl) => pl.edge === "bottom");
        if (!this.arena.isSquare || (pBot && !pBot.eliminated)) {
          this.onEdgeMiss("bottom");
          return;
        }
        b.y = botY - b.radius;
        b.vy = -Math.abs(b.vy);
        this.ctx.sound.playWall();
      }
    },

    draw() {
      const ctx = this.canvasCtx;
      const w = this.canvas.clientWidth || 360;
      const h = this.canvas.clientHeight || 640;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.strokeStyle = "rgba(34, 211, 238, 0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.arena.x, this.arena.y, this.arena.width, this.arena.height);

      for (const p of this.players) {
        if (!p.eliminated) continue;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        if (p.edge === "bottom") {
          ctx.moveTo(this.arena.x, this.arena.y + this.arena.height);
          ctx.lineTo(this.arena.x + this.arena.width, this.arena.y + this.arena.height);
        } else if (p.edge === "top") {
          ctx.moveTo(this.arena.x, this.arena.y);
          ctx.lineTo(this.arena.x + this.arena.width, this.arena.y);
        } else if (p.edge === "left") {
          ctx.moveTo(this.arena.x, this.arena.y);
          ctx.lineTo(this.arena.x, this.arena.y + this.arena.height);
        } else if (p.edge === "right") {
          ctx.moveTo(this.arena.x + this.arena.width, this.arena.y);
          ctx.lineTo(this.arena.x + this.arena.width, this.arena.y + this.arena.height);
        }
        ctx.stroke();
      }

      ctx.font = "700 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      for (const p of this.players) {
        ctx.fillStyle = p.eliminated ? "rgba(148, 163, 184, 0.4)" : p.color;
        const label = this.arena.isSquare
          ? `${p.name}: ${p.eliminated ? "OUT" : "♥".repeat(p.lives)}`
          : `${p.name}: ${p.score}`;
        if (p.edge === "bottom") ctx.fillText(label, w / 2, this.arena.y + this.arena.height - 36);
        if (p.edge === "top") ctx.fillText(label, w / 2, this.arena.y + 38);
      }

      for (const p of this.players) {
        if (p.eliminated) continue;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, p.h, 6);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      for (let i = 0; i < this.ball.trail.length; i++) {
        const t = this.ball.trail[i];
        const alpha = ((i + 1) / this.ball.trail.length) * 0.28;
        ctx.fillStyle = t.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.ball.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = this.ball.color;
      ctx.shadowColor = this.ball.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
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