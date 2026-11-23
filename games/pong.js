(() => {
  "use strict";

  const PLAYER_CONFIG = [
    { id: 0, name: "P1 Unten", edge: "bottom", color: "#22d3ee", glow: "rgba(34, 211, 238, 0.55)" },
    { id: 1, name: "P2 Oben", edge: "top", color: "#f472b6", glow: "rgba(244, 114, 182, 0.55)" },
    { id: 2, name: "P3 Links", edge: "left", color: "#4ade80", glow: "rgba(74, 222, 128, 0.55)" },
    { id: 3, name: "P4 Rechts", edge: "right", color: "#facc15", glow: "rgba(250, 204, 21, 0.55)" }
  ];

  const TRI_PLAYER_CONFIG = [
    { id: 0, name: "P1 Cyan", edge: "tri0", color: "#22d3ee", glow: "rgba(34, 211, 238, 0.55)" },
    { id: 1, name: "P2 Magenta", edge: "tri1", color: "#f472b6", glow: "rgba(244, 114, 182, 0.55)" },
    { id: 2, name: "P3 Gelb", edge: "tri2", color: "#facc15", glow: "rgba(250, 204, 21, 0.55)" }
  ];

  const QUAD_PLAYER_CONFIG = [
    { id: 0, name: "P1 Oben", edge: "top", color: "#22d3ee", glow: "rgba(34, 211, 238, 0.55)" },
    { id: 1, name: "P2 Unten", edge: "bottom", color: "#f472b6", glow: "rgba(244, 114, 182, 0.55)" },
    { id: 2, name: "P3 Links", edge: "left", color: "#4ade80", glow: "rgba(74, 222, 128, 0.55)" },
    { id: 3, name: "P4 Rechts", edge: "right", color: "#facc15", glow: "rgba(250, 204, 21, 0.55)" }
  ];

  const AI_SPEED = {
    easy: 195,
    medium: 310,
    hard: 440
  };

  function reflectVector(vx, vy, nx, ny) {
    const dot = vx * nx + vy * ny;
    return {
      vx: vx - 2 * dot * nx,
      vy: vy - 2 * dot * ny
    };
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  window.GAME_REGISTRY?.register({
    id: "pong",
    name: "Neon Pong",
    subtitle: "1–4 Spieler • Klassisch, Tri-Arena & Quad-Arena",
    tag: "1–4P Arcade",
    icon: "🏓",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.paused = false;
      this.phase = "menu"; // menu | playing | gameover
      this.playerCount = 2;
      this.aiDifficulty = "medium";
      this.winScore = 7;
      this.startLives = 5;

      this.arena = { x: 0, y: 0, size: 300, width: 300, height: 300, isSquare: false, isTri: false };
      this.tri = null;
      this.quad = null;
      this.players = [];
      this.ball = { x: 0, y: 0, vx: 0, vy: 0, radius: 8, speed: 340, color: "#22d3ee", trail: [] };
      this.particles = [];
      this.touches = new Map(); // pointerId -> { x, y }
      this.keysHeld = new Set();
      this.wallBounceStreak = 0;
      this.winnerText = "";

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex items-center justify-center bg-[#04040a] overflow-hidden";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block w-full h-full touch-none select-none";
      this.canvas.style.touchAction = "none";
      this.canvasCtx = this.canvas.getContext("2d", { alpha: false });

      this.menuOverlay = document.createElement("div");
      this.menuOverlay.className = "absolute inset-0 z-10 flex items-center justify-center bg-slate-950/85 p-4";
      this.renderMenu();

      this.root.appendChild(this.canvas);
      this.root.appendChild(this.menuOverlay);
      ctx.stage.appendChild(this.root);

      this.onPointerDown = this.handlePointerDown.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerUp = this.handlePointerUp.bind(this);
      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onKeyUp = this.handleKeyUp.bind(this);

      this.canvas.addEventListener("pointerdown", this.onPointerDown);
      this.canvas.addEventListener("pointermove", this.onPointerMove);
      this.canvas.addEventListener("pointerup", this.onPointerUp);
      this.canvas.addEventListener("pointercancel", this.onPointerUp);
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);

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
      const modes = [
        { count: 1, title: "1 Spieler", sub: "Gegen KI" },
        { count: 2, title: "2 Spieler", sub: "Klassisch" },
        { count: 3, title: "3 Spieler", sub: "Tri-Arena" },
        { count: 4, title: "4 Spieler", sub: "Quad-Arena" }
      ];
      const diffs = [
        { id: "easy", label: "Leicht" },
        { id: "medium", label: "Mittel" },
        { id: "hard", label: "Schwer" }
      ];

      let subtitleText = "Erste 7 Punkte gewinnen";
      if (this.playerCount === 3) {
        subtitleText = "5 Leben • Symmetrische Tri-Arena";
      } else if (this.playerCount === 4) {
        subtitleText = "5 Leben • Symmetrische Achteck-Quad-Arena";
      }

      this.menuOverlay.innerHTML = `
        <div class="w-full max-w-sm rounded-2xl border border-cyan-400/35 bg-slate-900/95 p-5 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <h3 class="font-orbitron text-xl font-black text-center text-cyan-300 mb-1">NEON PONG</h3>
          <p class="text-xs text-center text-slate-400 mb-4">${subtitleText}</p>

          <div class="mb-4">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Spielmodus</label>
            <div class="grid grid-cols-2 gap-2">
              ${modes.map((m) => `
                <button
                  type="button"
                  data-count="${m.count}"
                  class="py-2 px-2.5 rounded-xl border text-left transition ${
                    this.playerCount === m.count
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                      : "bg-slate-800/90 text-slate-200 border-slate-700 hover:border-cyan-400/50"
                  }"
                >
                  <div class="font-orbitron text-xs font-black">${m.title}</div>
                  <div class="text-[11px] font-semibold ${this.playerCount === m.count ? "text-slate-900" : "text-slate-400"}">${m.sub}</div>
                </button>
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
          ` : this.playerCount === 3 ? `
            <div class="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300 space-y-1">
              <div><span class="text-cyan-300 font-bold">P1 Cyan (Unten):</span> A / D</div>
              <div><span class="text-pink-400 font-bold">P2 Magenta (Oben-Links):</span> ← / →</div>
              <div><span class="text-yellow-300 font-bold">P3 Gelb (Oben-Rechts):</span> J / L (Num 4/6)</div>
              <div class="text-[11px] text-slate-400 pt-1">Touch: Eigene ◀ ▶ Buttons hinter jeder Torlinie</div>
            </div>
          ` : this.playerCount === 4 ? `
            <div class="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300 space-y-1">
              <div><span class="text-cyan-300 font-bold">P1 Oben:</span> C / V • <span class="text-pink-400 font-bold">P2 Unten:</span> ← / →</div>
              <div><span class="text-green-400 font-bold">P3 Links:</span> W / S • <span class="text-yellow-300 font-bold">P4 Rechts:</span> ↑ / ↓</div>
              <div class="text-[11px] text-slate-400 pt-1">Touch: 4 getrennte Zonen hinter den Torlinien</div>
            </div>
          ` : `
            <div class="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300 space-y-1">
              <div><span class="text-cyan-300 font-bold">Unten:</span> P1 (A/D) • <span class="text-pink-400 font-bold">Oben:</span> P2 (←/→)</div>
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

    buildTriArena(w, h, topPad, bottomPad, sidePad) {
      const availW = Math.max(180, w - sidePad * 2);
      const availH = Math.max(180, h - topPad - bottomPad);
      const minDim = Math.min(availW, availH);
      const touchMargin = clamp(minDim * 0.14, 42, 72);
      const innerW = Math.max(150, availW - touchMargin * 2);
      const innerH = Math.max(150, availH - touchMargin * 2);

      // Abgeschrägtes gleichseitiges Dreieck:
      // dMain = Abstand Mittelpunkt zu den 3 langen Tor-Seiten
      // dCorner = 1.5 * dMain => Eck-Banden sind exakt 1/4 so lang wie die Tor-Seiten, alle Innenwinkel = 120°
      const dMain = Math.min(innerW / (5 / Math.sqrt(3)), innerH / 2.5);
      const dCorner = 1.5 * dMain;
      const goalLen = (4 / Math.sqrt(3)) * dMain;
      const halfGoal = goalLen / 2;
      const cornerLen = (1 / Math.sqrt(3)) * dMain;

      const cx = w / 2;
      const cy = topPad + availH / 2 + 0.25 * dMain;

      const angles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
      const edges = angles.map((alpha, idx) => {
        const outX = Math.cos(alpha);
        const outY = Math.sin(alpha);
        const nx = -outX;
        const ny = -outY;
        // Tangente tx, ty so orientiert, dass sie nach links/rechts (tx >= 0) zeigt für intuitive Steuerung
        let tx = Math.sin(alpha);
        let ty = -Math.cos(alpha);
        const aX = cx + dMain * outX - halfGoal * tx;
        const aY = cy + dMain * outY - halfGoal * ty;
        const bX = cx + dMain * outX + halfGoal * tx;
        const bY = cy + dMain * outY + halfGoal * ty;

        // X-orientierte Tangente (xDir.x > 0) für konsistente Links/Rechts-Steuerung
        let xDirX = tx;
        let xDirY = ty;
        if (xDirX < 0) {
          xDirX = -xDirX;
          xDirY = -xDirY;
        }

        const mx = cx + dMain * outX;
        const my = cy + dMain * outY;

        const btnOffset = clamp(touchMargin * 0.56, 28, 46);
        const btnSep = clamp(goalLen * 0.22, 24, 52);
        const btnRadius = clamp(touchMargin * 0.36, 18, 28);
        const baseBtnX = mx + outX * btnOffset;
        const baseBtnY = my + outY * btnOffset;

        return {
          idx,
          mx,
          my,
          ax: aX,
          ay: aY,
          bx: bX,
          by: bY,
          nx,
          ny,
          outX,
          outY,
          tx,
          ty,
          xDirX,
          xDirY,
          length: goalLen,
          halfLen: halfGoal,
          leftBtn: { x: baseBtnX - xDirX * btnSep, y: baseBtnY - xDirY * btnSep, r: btnRadius },
          rightBtn: { x: baseBtnX + xDirX * btnSep, y: baseBtnY + xDirY * btnSep, r: btnRadius }
        };
      });

      // 3 kurze diagonale Eck-Banden zwischen den Hauptseiten (120°-Winkel)
      const bumpers = [
        { ax: edges[1].bx, ay: edges[1].by, bx: edges[0].ax, by: edges[0].ay, angle: (5 * Math.PI) / 6 },
        { ax: edges[2].bx, ay: edges[2].by, bx: edges[1].ax, by: edges[1].ay, angle: (3 * Math.PI) / 2 },
        { ax: edges[0].bx, ay: edges[0].by, bx: edges[2].ax, by: edges[2].ay, angle: Math.PI / 6 }
      ].map((b) => ({
        ...b,
        nx: -Math.cos(b.angle),
        ny: -Math.sin(b.angle)
      }));

      // 6 Eckpunkte im Uhrzeigersinn / Gegenuhrzeigersinn für das Polygon-Rendering
      const polygon = [
        { x: edges[0].ax, y: edges[0].ay },
        { x: edges[0].bx, y: edges[0].by },
        { x: edges[2].ax, y: edges[2].ay },
        { x: edges[2].bx, y: edges[2].by },
        { x: edges[1].ax, y: edges[1].ay },
        { x: edges[1].bx, y: edges[1].by }
      ];

      this.tri = {
        cx,
        cy,
        dMain,
        dCorner,
        goalLen,
        halfLen: halfGoal,
        cornerLen,
        edges,
        bumpers,
        polygon
      };

      this.arena = {
        x: cx - (2.5 / Math.sqrt(3)) * dMain,
        y: cy - dCorner,
        size: goalLen,
        width: (5 / Math.sqrt(3)) * dMain,
        height: 2.5 * dMain,
        isSquare: false,
        isTri: true
      };
    },

    buildQuadArena(w, h, topPad, bottomPad, sidePad) {
      const availW = Math.max(180, w - sidePad * 2);
      const availH = Math.max(180, h - topPad - bottomPad);
      const minDim = Math.min(availW, availH);
      const touchMargin = clamp(minDim * 0.11, 28, 56);

      const size = Math.max(160, Math.min(availW - touchMargin * 2, availH - touchMargin * 2));
      const x = (w - size) / 2;
      const y = topPad + (availH - size) / 2;
      const cut = size * 0.16;
      const goalLen = size - 2 * cut;
      const s = Math.SQRT1_2;

      const bumpers = [
        // Oben-Rechts (45°), Einwärts-Normale (-s, s)
        { ax: x + size - cut, ay: y, bx: x + size, by: y + cut, nx: -s, ny: s },
        // Unten-Rechts (45°), Einwärts-Normale (-s, -s)
        { ax: x + size, ay: y + size - cut, bx: x + size - cut, by: y + size, nx: -s, ny: -s },
        // Unten-Links (45°), Einwärts-Normale (s, -s)
        { ax: x + cut, ay: y + size, bx: x, by: y + size - cut, nx: s, ny: -s },
        // Oben-Links (45°), Einwärts-Normale (s, s)
        { ax: x, ay: y + cut, bx: x + cut, by: y, nx: s, ny: s }
      ];

      const polygon = [
        { x: x + cut, y },
        { x: x + size - cut, y },
        { x: x + size, y: y + cut },
        { x: x + size, y: y + size - cut },
        { x: x + size - cut, y: y + size },
        { x: x + cut, y: y + size },
        { x, y: y + size - cut },
        { x, y: y + cut }
      ];

      this.quad = {
        cx: x + size / 2,
        cy: y + size / 2,
        x,
        y,
        size,
        cut,
        goalLen,
        touchMargin,
        bumpers,
        polygon
      };

      this.arena = {
        x,
        y,
        size,
        width: size,
        height: size,
        isSquare: true,
        isTri: false
      };
    },

    resize() {
      if (!this.root || !this.canvas) return;
      const rect = this.root.getBoundingClientRect();
      const dpr = window.getOptimalDPR ? window.getOptimalDPR() : Math.min(window.devicePixelRatio || 1, 1.25);
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

      if (this.playerCount === 3) {
        this.quad = null;
        this.buildTriArena(w, h, topPad, bottomPad, sidePad);
      } else if (this.playerCount === 4) {
        this.tri = null;
        this.buildQuadArena(w, h, topPad, bottomPad, sidePad);
      } else {
        this.tri = null;
        this.quad = null;
        this.arena = {
          x: sidePad,
          y: topPad,
          size: Math.min(availW, availH),
          width: availW,
          height: availH,
          isSquare: false,
          isTri: false
        };
      }

      this.syncPaddleDimensions();
    },

    syncPaddleDimensions() {
      if (this.arena.isTri && this.tri) {
        const paddleLen = clamp(this.tri.goalLen * 0.27, 46, 108);
        const paddleThick = 11;
        const maxOffset = Math.max(0, this.tri.halfLen - paddleLen / 2);

        for (const p of this.players) {
          p.len = paddleLen;
          p.thick = paddleThick;
          p.maxOffset = maxOffset;
          if (!p.posInitialized) {
            p.offset = 0;
            p.posInitialized = true;
          } else {
            p.offset = clamp(p.offset, -maxOffset, maxOffset);
          }
        }
        return;
      }

      const isSq = this.arena.isSquare;
      const cut = isSq && this.quad ? this.quad.cut : 0;
      const goalLen = isSq && this.quad ? this.quad.goalLen : this.arena.width;
      const paddleLen = Math.max(44, Math.min(108, goalLen * (isSq ? 0.28 : 0.24)));
      const paddleThick = 12;

      for (const p of this.players) {
        if (p.edge === "bottom" || p.edge === "top") {
          p.w = paddleLen;
          p.h = paddleThick;
          const minX = this.arena.x + cut;
          const maxX = this.arena.x + this.arena.width - cut - p.w;
          if (!p.posInitialized) {
            p.x = this.arena.x + this.arena.width / 2 - p.w / 2;
            p.posInitialized = true;
          } else {
            p.x = clamp(p.x, minX, maxX);
          }
          p.y = p.edge === "bottom" ? this.arena.y + this.arena.height - 22 : this.arena.y + 10;
        } else {
          p.w = paddleThick;
          p.h = paddleLen;
          const minY = this.arena.y + cut;
          const maxY = this.arena.y + this.arena.height - cut - p.h;
          if (!p.posInitialized) {
            p.y = this.arena.y + this.arena.height / 2 - p.h / 2;
            p.posInitialized = true;
          } else {
            p.y = clamp(p.y, minY, maxY);
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
      this.keysHeld.clear();
      this.winnerText = "";

      const activeCount = this.playerCount === 1 ? 2 : this.playerCount;
      let configs = PLAYER_CONFIG;
      if (this.playerCount === 3) configs = TRI_PLAYER_CONFIG;
      else if (this.playerCount === 4) configs = QUAD_PLAYER_CONFIG;
      this.players = [];

      for (let i = 0; i < activeCount; i++) {
        const cfg = configs[i];
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
          offset: 0,
          len: 72,
          thick: 11,
          maxOffset: 60,
          posInitialized: false
        });
      }

      this.resize();
      this.resetBall(Math.random() < 0.5 ? 1 : -1);
    },

    resetBall(dirY = 1) {
      this.wallBounceStreak = 0;
      if (this.arena.isTri && this.tri) {
        this.ball.x = this.tri.cx;
        this.ball.y = this.tri.cy;
        this.ball.speed = this.tri.dMain * 1.45;
        const rad = Math.random() * Math.PI * 2;
        this.ball.vx = Math.cos(rad) * this.ball.speed;
        this.ball.vy = Math.sin(rad) * this.ball.speed;
        this.ball.color = "#22d3ee";
        this.ball.trail = [];
        return;
      }

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

    handleKeyDown(e) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code) && this.phase === "playing") {
        e.preventDefault();
      }
      this.keysHeld.add(e.code);
    },

    handleKeyUp(e) {
      this.keysHeld.delete(e.code);
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

    getTriTouchDir(edgeIdx) {
      if (!this.tri) return 0;
      const edge = this.tri.edges[edgeIdx];
      let dir = 0;

      for (const pt of this.touches.values()) {
        const dLeft = Math.hypot(pt.x - edge.leftBtn.x, pt.y - edge.leftBtn.y);
        const dRight = Math.hypot(pt.x - edge.rightBtn.x, pt.y - edge.rightBtn.y);
        const hitR = edge.leftBtn.r * 1.45;
        if (dLeft <= hitR && dLeft <= dRight) {
          dir -= 1;
          continue;
        }
        if (dRight <= hitR && dRight < dLeft) {
          dir += 1;
          continue;
        }

        // Fallback: gesamte eigene äußere Zone hinter der Torlinie (120°-Sektor)
        const outDist = (pt.x - edge.mx) * edge.outX + (pt.y - edge.my) * edge.outY;
        if (outDist > 4) {
          const rx = pt.x - this.tri.cx;
          const ry = pt.y - this.tri.cy;
          const myDot = rx * edge.outX + ry * edge.outY;
          let isMySector = true;
          for (let j = 0; j < 3; j++) {
            if (j === edgeIdx) continue;
            const other = this.tri.edges[j];
            if (rx * other.outX + ry * other.outY > myDot) {
              isMySector = false;
              break;
            }
          }
          if (isMySector) {
            const sideProj = (pt.x - edge.mx) * edge.xDirX + (pt.y - edge.my) * edge.xDirY;
            dir += sideProj < 0 ? -1 : 1;
          }
        }
      }

      return clamp(dir, -1, 1);
    },

    applyTriControls(dt) {
      if (!this.tri) return;
      const paddleSpeed = this.tri.goalLen * 1.15;

      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.eliminated) continue;
        const edge = this.tri.edges[i];

        let dir = 0;
        if (i === 0) {
          if (this.keysHeld.has("KeyA")) dir -= 1;
          if (this.keysHeld.has("KeyD")) dir += 1;
        } else if (i === 1) {
          if (this.keysHeld.has("ArrowLeft")) dir -= 1;
          if (this.keysHeld.has("ArrowRight")) dir += 1;
        } else if (i === 2) {
          if (this.keysHeld.has("KeyJ") || this.keysHeld.has("Numpad4")) dir -= 1;
          if (this.keysHeld.has("KeyL") || this.keysHeld.has("Numpad6")) dir += 1;
        }

        if (dir === 0) {
          dir = this.getTriTouchDir(i);
        }

        if (dir !== 0) {
          const xDirDotT = edge.xDirX * edge.tx + edge.xDirY * edge.ty;
          p.offset = clamp(p.offset + dir * xDirDotT * paddleSpeed * dt, -p.maxOffset, p.maxOffset);
        }
      }
    },

    applyTouchControls(dt = 0.016) {
      if (this.arena.isTri) {
        this.applyTriControls(dt);
        return;
      }

      const midX = this.arena.x + this.arena.width / 2;
      const midY = this.arena.y + this.arena.height / 2;
      const cut = this.arena.isSquare && this.quad ? this.quad.cut : 0;

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
            p.x = clamp(bestPt.x - p.w / 2, this.arena.x + cut, this.arena.x + this.arena.width - cut - p.w);
          } else {
            p.y = clamp(bestPt.y - p.h / 2, this.arena.y + cut, this.arena.y + this.arena.height - cut - p.h);
          }
        } else {
          const kbSpeed = (this.arena.isSquare ? this.arena.size : this.arena.width) * 1.05 * dt;
          if (this.arena.isSquare) {
            if (p.edge === "top") {
              const leftHeld = this.keysHeld.has("KeyC");
              const rightHeld = this.keysHeld.has("KeyV");
              if (leftHeld && !rightHeld) p.x = Math.max(this.arena.x + cut, p.x - kbSpeed);
              else if (rightHeld && !leftHeld) p.x = Math.min(this.arena.x + this.arena.width - cut - p.w, p.x + kbSpeed);
            } else if (p.edge === "bottom") {
              const leftHeld = this.keysHeld.has("ArrowLeft");
              const rightHeld = this.keysHeld.has("ArrowRight");
              if (leftHeld && !rightHeld) p.x = Math.max(this.arena.x + cut, p.x - kbSpeed);
              else if (rightHeld && !leftHeld) p.x = Math.min(this.arena.x + this.arena.width - cut - p.w, p.x + kbSpeed);
            } else if (p.edge === "left") {
              const upHeld = this.keysHeld.has("KeyW");
              const downHeld = this.keysHeld.has("KeyS");
              if (upHeld && !downHeld) p.y = Math.max(this.arena.y + cut, p.y - kbSpeed);
              else if (downHeld && !upHeld) p.y = Math.min(this.arena.y + this.arena.height - cut - p.h, p.y + kbSpeed);
            } else if (p.edge === "right") {
              const upHeld = this.keysHeld.has("ArrowUp");
              const downHeld = this.keysHeld.has("ArrowDown");
              if (upHeld && !downHeld) p.y = Math.max(this.arena.y + cut, p.y - kbSpeed);
              else if (downHeld && !upHeld) p.y = Math.min(this.arena.y + this.arena.height - cut - p.h, p.y + kbSpeed);
            }
          } else if (p.edge === "bottom") {
            const gHeld = window.GLOBAL_MOBILE_CONTROLS?.held || this.ctx?.controls?.held;
            const leftHeld = this.keysHeld.has("KeyA") || (this.playerCount === 1 && this.keysHeld.has("ArrowLeft")) || gHeld?.left;
            const rightHeld = this.keysHeld.has("KeyD") || (this.playerCount === 1 && this.keysHeld.has("ArrowRight")) || gHeld?.right;
            if (leftHeld && !rightHeld) {
              p.x = Math.max(this.arena.x, p.x - kbSpeed);
            } else if (rightHeld && !leftHeld) {
              p.x = Math.min(this.arena.x + this.arena.width - p.w, p.x + kbSpeed);
            }
          } else if (p.edge === "top" && this.playerCount >= 2) {
            const leftHeld = this.keysHeld.has("ArrowLeft");
            const rightHeld = this.keysHeld.has("ArrowRight");
            if (leftHeld && !rightHeld) {
              p.x = Math.max(this.arena.x, p.x - kbSpeed);
            } else if (rightHeld && !leftHeld) {
              p.x = Math.min(this.arena.x + this.arena.width - p.w, p.x + kbSpeed);
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
      this.wallBounceStreak = 0;
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

    getTriPaddleCenter(p, edge) {
      const paddleInset = 13;
      return {
        cx: edge.mx + p.offset * edge.tx + paddleInset * edge.nx,
        cy: edge.my + p.offset * edge.ty + paddleInset * edge.ny
      };
    },

    handleTriPaddleBounce(p, edge) {
      const b = this.ball;
      const { cx: pcx, cy: pcy } = this.getTriPaddleCenter(p, edge);
      const dx = b.x - pcx;
      const dy = b.y - pcy;

      // Lokale Koordinaten: u entlang Schläger-Tangente, v entlang Einwärts-Normale
      const u = dx * edge.tx + dy * edge.ty;
      const v = dx * edge.nx + dy * edge.ny;
      const halfL = p.len / 2;
      const halfT = p.thick / 2;

      const closestU = clamp(u, -halfL, halfL);
      const closestV = clamp(v, -halfT, halfT);
      const distU = u - closestU;
      const distV = v - closestV;

      if (distU * distU + distV * distV > b.radius * b.radius) {
        return false;
      }

      // Normale am Trefferpunkt (bei Stirn-/Kanten-Treffer vs. Front-Treffer)
      let hitNx = edge.nx;
      let hitNy = edge.ny;
      const dist = Math.hypot(distU, distV);
      if (v < halfT && dist > 1e-4) {
        hitNx = (distU * edge.tx + distV * edge.nx) / dist;
        hitNy = (distU * edge.ty + distV * edge.ny) / dist;
      }

      // 2D-Vektor-Reflektion R = D - 2(D·N)N
      const speedDot = b.vx * hitNx + b.vy * hitNy;
      if (speedDot < 0) {
        const refl = reflectVector(b.vx, b.vy, hitNx, hitNy);
        b.vx = refl.vx;
        b.vy = refl.vy;
      }

      // Spin / Winkelbeeinflussung je nach Trefferpunkt auf dem Schläger
      const rel = clamp(u / halfL, -0.85, 0.85);
      b.speed = Math.min(b.speed * 1.045, this.tri.dMain * 2.9);

      const curSpeed = Math.hypot(b.vx, b.vy) || b.speed;
      let dirX = b.vx / curSpeed;
      let dirY = b.vy / curSpeed;

      // Tangentialen Spin-Einfluss beimischen und Winkel in die Arena begrenzen
      const spinStrength = 0.58;
      dirX += rel * spinStrength * edge.tx;
      dirY += rel * spinStrength * edge.ty;
      const normLen = Math.hypot(dirX, dirY) || 1;
      dirX /= normLen;
      dirY /= normLen;

      // Sicherstellen, dass der Ball mit mindestens ~25° Einwärtswinkel abprallt
      const inwardDot = dirX * edge.nx + dirY * edge.ny;
      const minInward = 0.42;
      if (inwardDot < minInward) {
        const tangDot = dirX * edge.tx + dirY * edge.ty;
        const tangSign = tangDot >= 0 ? 1 : -1;
        const maxTang = Math.sqrt(1 - minInward * minInward);
        dirX = minInward * edge.nx + tangSign * maxTang * edge.tx;
        dirY = minInward * edge.ny + tangSign * maxTang * edge.ty;
      }

      b.vx = dirX * b.speed;
      b.vy = dirY * b.speed;
      b.color = p.color;

      // Ball sauber aus dem Schläger herausschieben
      const pushV = v >= -halfT ? halfT + b.radius + 1 : -halfT - b.radius - 1;
      b.x = pcx + u * edge.tx + pushV * edge.nx;
      b.y = pcy + u * edge.ty + pushV * edge.ny;

      this.spawnParticles(b.x, b.y, p.color, 12);
      this.wallBounceStreak = 0;
      this.ctx.sound.playHit();
      return true;
    },

    applyAntiLoopDeflection(nx, ny) {
      const b = this.ball;
      this.wallBounceStreak += 1;

      const spd = Math.hypot(b.vx, b.vy) || b.speed;
      const inwardDot = (b.vx * nx + b.vy * ny) / spd;

      // Verhindert Endlos-Ping-Pong zwischen parallelen Eck-Banden / Wänden
      if (this.wallBounceStreak >= 8) {
        const cx = this.arena.isTri && this.tri ? this.tri.cx : (this.quad ? this.quad.cx : this.arena.x + this.arena.width / 2);
        const cy = this.arena.isTri && this.tri ? this.tri.cy : (this.quad ? this.quad.cy : this.arena.y + this.arena.height / 2);
        const toCenterAngle = Math.atan2(cy - b.y, cx - b.x) + (Math.random() - 0.5) * 0.7;
        const candX = Math.cos(toCenterAngle);
        const candY = Math.sin(toCenterAngle);
        if (candX * nx + candY * ny > 0.2) {
          b.vx = candX * spd;
          b.vy = candY * spd;
          this.wallBounceStreak = 0;
          return;
        }
      }

      if (inwardDot > 0.94 || this.wallBounceStreak >= 3) {
        const sign = Math.random() < 0.5 ? 1 : -1;
        const jitter = (this.wallBounceStreak >= 4 ? 0.36 : 0.19) * sign;
        const cosJ = Math.cos(jitter);
        const sinJ = Math.sin(jitter);
        const rvx = b.vx * cosJ - b.vy * sinJ;
        const rvy = b.vx * sinJ + b.vy * cosJ;
        if ((rvx * nx + rvy * ny) / spd >= 0.25) {
          b.vx = rvx;
          b.vy = rvy;
        } else {
          // Gegenrichtung testen, falls zu flach an der Wand
          const rvx2 = b.vx * cosJ + b.vy * sinJ;
          const rvy2 = -b.vx * sinJ + b.vy * cosJ;
          if ((rvx2 * nx + rvy2 * ny) / spd >= 0.25) {
            b.vx = rvx2;
            b.vy = rvy2;
          }
        }
      }
    },

    handleTriSegmentBounce(ax, ay, bx, by, nx, ny, color = "#e2e8f0", playWallSound = true) {
      const b = this.ball;
      const segDx = bx - ax;
      const segDy = by - ay;
      const segLenSq = segDx * segDx + segDy * segDy || 1;
      const t = clamp(((b.x - ax) * segDx + (b.y - ay) * segDy) / segLenSq, 0, 1);
      const closestX = ax + t * segDx;
      const closestY = ay + t * segDy;

      const diffX = b.x - closestX;
      const diffY = b.y - closestY;
      const dist = Math.hypot(diffX, diffY);

      // Prüfe sowohl Abstand zum Segment als auch Durchdringung hinter die Wandlinie
      const signedDist = (b.x - ax) * nx + (b.y - ay) * ny;
      const alongProj = (b.x - ax) * segDx + (b.y - ay) * segDy;
      const insideSpan = alongProj >= -b.radius && alongProj <= segLenSq + b.radius;

      if (dist <= b.radius || (insideSpan && signedDist < b.radius && signedDist > -b.radius * 2.5)) {
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          const refl = reflectVector(b.vx, b.vy, nx, ny);
          b.vx = refl.vx;
          b.vy = refl.vy;
          this.applyAntiLoopDeflection(nx, ny);
        }
        b.x = closestX + nx * (b.radius + 0.5);
        b.y = closestY + ny * (b.radius + 0.5);
        if (playWallSound) {
          this.spawnParticles(closestX, closestY, color, 8);
          this.ctx.sound.playWall();
        }
        return true;
      }
      return false;
    },

    onTriEdgeMiss(edgeIdx) {
      const b = this.ball;
      this.ctx.sound.playLose();
      this.spawnParticles(b.x, b.y, "#f43f5e", 18);

      const owner = this.players[edgeIdx];
      if (owner && !owner.eliminated) {
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

      this.resetBall();
    },

    updateTriArena(dt) {
      if (!this.tri) return;
      const b = this.ball;
      const steps = Math.max(1, Math.ceil((b.speed * dt) / Math.max(3, b.radius * 0.6)));
      const subDt = dt / steps;

      for (let s = 0; s < steps; s++) {
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        // 1. Schläger-Kollisionen
        for (let i = 0; i < this.players.length; i++) {
          const p = this.players[i];
          if (!p.eliminated) {
            this.handleTriPaddleBounce(p, this.tri.edges[i]);
          }
        }

        // 2. Diagonale Eck-Banden (Corner Bumpers)
        for (const bumper of this.tri.bumpers) {
          this.handleTriSegmentBounce(bumper.ax, bumper.ay, bumper.bx, bumper.by, bumper.nx, bumper.ny, "#cbd5e1", true);
        }

        // 3. Tor-Linien (Verlust eines Lebens oder Abprall an Eliminierungs-Wand)
        for (let i = 0; i < this.tri.edges.length; i++) {
          const edge = this.tri.edges[i];
          const p = this.players[i];
          if (p.eliminated) {
            this.handleTriSegmentBounce(edge.ax, edge.ay, edge.bx, edge.by, edge.nx, edge.ny, p.color, true);
          } else {
            const signedDist = (b.x - edge.mx) * edge.nx + (b.y - edge.my) * edge.ny;
            if (signedDist < -b.radius) {
              this.onTriEdgeMiss(i);
              return;
            }
          }
        }
      }

      // Sicherheits-Reset, falls der Ball je weit außerhalb landet
      if (Math.hypot(b.x - this.tri.cx, b.y - this.tri.cy) > this.tri.dCorner * 2.2) {
        this.resetBall();
      }
    },

    updateQuadArena(dt) {
      if (!this.quad) return;
      const b = this.ball;
      const q = this.quad;
      const steps = Math.max(1, Math.ceil((b.speed * dt) / Math.max(3, b.radius * 0.6)));
      const subDt = dt / steps;

      const leftX = q.x;
      const rightX = q.x + q.size;
      const topY = q.y;
      const botY = q.y + q.size;

      for (let s = 0; s < steps; s++) {
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        // 1. Schläger-Kollisionen
        for (const p of this.players) {
          if (!p.eliminated) {
            this.handlePaddleBounce(p);
          }
        }

        // 2. 45°-Eck-Banden (Corner Bumpers)
        for (const bumper of q.bumpers) {
          this.handleTriSegmentBounce(bumper.ax, bumper.ay, bumper.bx, bumper.by, bumper.nx, bumper.ny, "#cbd5e1", true);
        }

        // 3. Tor-Linien (Aus = Leben abziehen, Eliminierte Seite = feste Bande)
        const pLeft = this.players.find((pl) => pl.edge === "left");
        if (b.x - b.radius < leftX) {
          if (pLeft && !pLeft.eliminated) {
            if (b.x < leftX - b.radius) {
              this.onEdgeMiss("left");
              return;
            }
          } else {
            b.x = leftX + b.radius;
            b.vx = Math.abs(b.vx);
            this.applyAntiLoopDeflection(1, 0);
            this.ctx.sound.playWall();
          }
        }

        const pRight = this.players.find((pl) => pl.edge === "right");
        if (b.x + b.radius > rightX) {
          if (pRight && !pRight.eliminated) {
            if (b.x > rightX + b.radius) {
              this.onEdgeMiss("right");
              return;
            }
          } else {
            b.x = rightX - b.radius;
            b.vx = -Math.abs(b.vx);
            this.applyAntiLoopDeflection(-1, 0);
            this.ctx.sound.playWall();
          }
        }

        const pTop = this.players.find((pl) => pl.edge === "top");
        if (b.y - b.radius < topY) {
          if (pTop && !pTop.eliminated) {
            if (b.y < topY - b.radius) {
              this.onEdgeMiss("top");
              return;
            }
          } else {
            b.y = topY + b.radius;
            b.vy = Math.abs(b.vy);
            this.applyAntiLoopDeflection(0, 1);
            this.ctx.sound.playWall();
          }
        }

        const pBot = this.players.find((pl) => pl.edge === "bottom");
        if (b.y + b.radius > botY) {
          if (pBot && !pBot.eliminated) {
            if (b.y > botY + b.radius) {
              this.onEdgeMiss("bottom");
              return;
            }
          } else {
            b.y = botY - b.radius;
            b.vy = -Math.abs(b.vy);
            this.applyAntiLoopDeflection(0, -1);
            this.ctx.sound.playWall();
          }
        }
      }

      if (Math.hypot(b.x - q.cx, b.y - q.cy) > q.size * 1.1) {
        this.resetBall();
      }
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
      b.trail.push({ x: b.x, y: b.y, color: b.color });
      if (b.trail.length > 10) b.trail.shift();

      if (this.arena.isTri) {
        this.updateTriArena(dt);
        return;
      }

      if (this.arena.isSquare && this.quad) {
        this.updateQuadArena(dt);
        return;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

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

    drawTriArena(ctx) {
      if (!this.tri) return;
      const poly = this.tri.polygon;

      // Spielfeld-Fläche (symmetrisches Sechseck / abgeschrägtes Dreieck)
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.fill();

      // Geometrischer Mittelpunkt (Ball-Spawn-Punkt)
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.tri.cx, this.tri.cy, Math.max(18, this.tri.dMain * 0.16), 0, Math.PI * 2);
      ctx.stroke();

      // 3 lange Tor-Seiten
      for (let i = 0; i < this.tri.edges.length; i++) {
        const edge = this.tri.edges[i];
        const p = this.players[i];
        ctx.save();
        ctx.strokeStyle = p ? p.color : "#22d3ee";
        if (p && p.eliminated) {
          ctx.lineWidth = 4;
        } else {
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.45;
          ctx.setLineDash([6, 6]);
        }
        ctx.beginPath();
        ctx.moveTo(edge.ax, edge.ay);
        ctx.lineTo(edge.bx, edge.by);
        ctx.stroke();
        ctx.restore();
      }

      // 3 kurze diagonale Eck-Banden (Corner Bumpers)
      ctx.save();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (const bumper of this.tri.bumpers) {
        ctx.beginPath();
        ctx.moveTo(bumper.ax, bumper.ay);
        ctx.lineTo(bumper.bx, bumper.by);
        ctx.stroke();
      }
      ctx.restore();

      // Lebensanzeige pro Spieler
      ctx.font = "700 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        const edge = this.tri.edges[i];
        const labelDist = 30;
        const lx = edge.mx + edge.nx * labelDist;
        const ly = edge.my + edge.ny * labelDist;
        ctx.fillStyle = p.eliminated ? "rgba(148, 163, 184, 0.4)" : p.color;
        const label = p.eliminated ? `${p.name}: OUT` : `${p.name}: ${"♥".repeat(p.lives)}`;
        ctx.fillText(label, lx, ly);
      }

      // Schläger (Paddles)
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.eliminated) continue;
        const edge = this.tri.edges[i];
        const { cx: pcx, cy: pcy } = this.getTriPaddleCenter(p, edge);
        const angle = Math.atan2(edge.ty, edge.tx);

        ctx.save();
        ctx.translate(pcx, pcy);
        ctx.rotate(angle);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.roundRect(-p.len / 2 - 2, -p.thick / 2 - 2, p.len + 4, p.thick + 4, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.roundRect(-p.len / 2, -p.thick / 2, p.len, p.thick, 5);
        ctx.fill();
        ctx.restore();
      }

      // Virtuelle Touch-Steuerungszonen (◀ / ▶ Buttons hinter jeder Torlinie)
      if (this.phase === "playing") {
        const touchDir0 = this.getTriTouchDir(0);
        const touchDir1 = this.getTriTouchDir(1);
        const touchDir2 = this.getTriTouchDir(2);
        const touchDirs = [touchDir0, touchDir1, touchDir2];

        for (let i = 0; i < this.players.length; i++) {
          const p = this.players[i];
          if (p.eliminated) continue;
          const edge = this.tri.edges[i];
          const rot = Math.atan2(edge.xDirY, edge.xDirX);

          const drawBtn = (btn, arrow, active) => {
            ctx.save();
            ctx.translate(btn.x, btn.y);
            ctx.rotate(rot);
            ctx.beginPath();
            ctx.arc(0, 0, btn.r, 0, Math.PI * 2);
            ctx.fillStyle = active ? p.glow : "rgba(15, 23, 42, 0.72)";
            ctx.fill();
            ctx.lineWidth = active ? 2.5 : 1.5;
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = active ? 1 : 0.65;
            ctx.stroke();

            ctx.fillStyle = active ? "#ffffff" : p.color;
            ctx.font = `700 ${Math.round(btn.r * 0.85)}px Orbitron, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(arrow, 0, 1);
            ctx.restore();
          };

          drawBtn(edge.leftBtn, "◀", touchDirs[i] < 0);
          drawBtn(edge.rightBtn, "▶", touchDirs[i] > 0);
        }
      }
    },

    drawQuadArena(ctx) {
      if (!this.quad) return;
      const q = this.quad;
      const poly = q.polygon;

      // Achteck-Spielfeld
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
      ctx.fill();

      // Mittelpunkt-Kreis
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(q.cx, q.cy, Math.max(18, q.size * 0.08), 0, Math.PI * 2);
      ctx.stroke();

      // 4 Tor-Seiten & äußere Touch-Zonen-Markierung
      const edgeCoords = {
        top: { ax: q.x + q.cut, ay: q.y, bx: q.x + q.size - q.cut, by: q.y, tx: 0, ty: -1 },
        bottom: { ax: q.x + q.cut, ay: q.y + q.size, bx: q.x + q.size - q.cut, by: q.y + q.size, tx: 0, ty: 1 },
        left: { ax: q.x, ay: q.y + q.cut, bx: q.x, by: q.y + q.size - q.cut, tx: -1, ty: 0 },
        right: { ax: q.x + q.size, ay: q.y + q.cut, bx: q.x + q.size, by: q.y + q.size - q.cut, tx: 1, ty: 0 }
      };

      for (const p of this.players) {
        const ec = edgeCoords[p.edge];
        if (!ec) continue;

        ctx.save();
        ctx.strokeStyle = p.color;
        if (p.eliminated) {
          ctx.lineWidth = 4;
        } else {
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.45;
          ctx.setLineDash([6, 6]);
        }
        ctx.beginPath();
        ctx.moveTo(ec.ax, ec.ay);
        ctx.lineTo(ec.bx, ec.by);
        ctx.stroke();
        ctx.restore();

        // Dezente äußere Touch-Zone hinter der Torlinie
        if (!p.eliminated && this.phase === "playing") {
          const zOff = Math.max(16, q.touchMargin * 0.55);
          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.24;
          ctx.lineWidth = Math.max(10, q.touchMargin * 0.45);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(ec.ax + ec.tx * zOff, ec.ay + ec.ty * zOff);
          ctx.lineTo(ec.bx + ec.tx * zOff, ec.by + ec.ty * zOff);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4 diagonale 45°-Eck-Banden
      ctx.save();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (const bumper of q.bumpers) {
        ctx.beginPath();
        ctx.moveTo(bumper.ax, bumper.ay);
        ctx.lineTo(bumper.bx, bumper.by);
        ctx.stroke();
      }
      ctx.restore();

      // Lebensanzeige pro Spieler
      ctx.font = "700 11px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const p of this.players) {
        ctx.fillStyle = p.eliminated ? "rgba(148, 163, 184, 0.4)" : p.color;
        const label = `${p.name}: ${p.eliminated ? "OUT" : "♥".repeat(p.lives)}`;
        if (p.edge === "top") ctx.fillText(label, q.cx, q.y + 34);
        else if (p.edge === "bottom") ctx.fillText(label, q.cx, q.y + q.size - 34);
        else if (p.edge === "left") {
          ctx.save();
          ctx.translate(q.x + 34, q.cy);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else if (p.edge === "right") {
          ctx.save();
          ctx.translate(q.x + q.size - 34, q.cy);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }

      // 4 Schläger
      for (const p of this.players) {
        if (p.eliminated) continue;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, p.h, 6);
        ctx.fill();
      }
    },

    draw() {
      const ctx = this.canvasCtx;
      const w = this.canvas.clientWidth || 360;
      const h = this.canvas.clientHeight || 640;

      ctx.fillStyle = "#04040a";
      ctx.fillRect(0, 0, w, h);

      ctx.save();

      if (this.arena.isTri) {
        this.drawTriArena(ctx);
      } else if (this.arena.isSquare && this.quad) {
        this.drawQuadArena(ctx);
      } else {
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
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.w, p.h, 6);
          ctx.fill();
        }
      }

      for (let i = 0; i < this.ball.trail.length; i++) {
        const t = this.ball.trail[i];
        const alpha = ((i + 1) / this.ball.trail.length) * 0.28;
        ctx.fillStyle = t.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.ball.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = this.ball.color;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = this.ball.color;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();

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
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      this.touches.clear();
      this.keysHeld.clear();
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
      this.root = null;
      this.canvas = null;
      this.ctx = null;
    }
  });
})();