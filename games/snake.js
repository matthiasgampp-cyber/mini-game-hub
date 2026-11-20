(() => {
  "use strict";

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
  };

  const ITEMS = [
    { kind: "battery", label: "Batterie", energyValue: 15, growth: 1, color: "#4ade80" },
    { kind: "gear", label: "Zahnrad", energyValue: 20, growth: 1, color: "#38bdf8" },
    { kind: "compass", label: "Kompass", energyValue: 25, growth: 1, color: "#facc15" }
  ];

  window.GAME_REGISTRY?.register({
    id: "snake",
    name: "Snake",
    subtitle: "Zusammenhängender Schlangenkörper • Kleine Gegenstände • Sanftes Tempo",
    tag: "Arcade Klassiker",
    icon: "🐍",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.rafId = null;
      this.lastTime = 0;
      this.animClock = 0;
      this.stepAccum = 0;
      this.paused = false;
      this.phase = "playing";

      this.cols = 20;
      this.rows = 20;
      this.cellSize = 20;
      this.field = { x: 0, y: 0, w: 400, h: 400 };

      this.energy = 0;
      this.bestEnergy = ctx.storage.get("best_energy", 0);
      this.eatenCount = 0;

      this.dir = "right";
      this.dirQueue = [];
      this.snake = [];
      this.pendingGrowth = 0;

      this.item = null;
      this.bonusItem = null;
      this.bonusTimer = 0;

      this.particles = [];
      this.swipeStart = null;

      this.root = document.createElement("div");
      this.root.className = "relative w-full h-full flex flex-col items-center justify-center p-2 bg-[#04040a] overflow-hidden";

      this.hud = document.createElement("div");
      this.hud.className = "w-full max-w-[460px] flex items-center justify-between gap-2 mb-1.5 px-1 font-orbitron text-[11px] sm:text-xs";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-xl border border-emerald-500/35 bg-slate-950/95 touch-none";
      this.canvasCtx = this.canvas.getContext("2d");

      this.overlay = document.createElement("div");
      this.overlay.className = "hidden absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4";

      this.root.appendChild(this.hud);
      this.root.appendChild(this.canvas);
      this.root.appendChild(this.overlay);
      ctx.stage.appendChild(this.root);

      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onPointerDown = this.handlePointerDown.bind(this);
      this.onPointerMove = this.handlePointerMove.bind(this);
      this.onPointerUp = this.handlePointerUp.bind(this);

      window.addEventListener("keydown", this.onKeyDown);
      this.canvas.addEventListener("pointerdown", this.onPointerDown);
      this.canvas.addEventListener("pointermove", this.onPointerMove);
      this.canvas.addEventListener("pointerup", this.onPointerUp);
      this.canvas.addEventListener("pointercancel", this.onPointerUp);

      this.resize();
      this.resetGameState();
    },

    playSfx(name) {
      try {
        this.ctx?.sound?.[name]?.();
      } catch {
        // Sound-Fehler ignorieren
      }
    },

    resetGameState() {
      this.phase = "playing";
      this.energy = 0;
      this.eatenCount = 0;
      this.pendingGrowth = 0;
      this.stepAccum = 0;
      this.dir = "right";
      this.dirQueue = [];
      this.bonusItem = null;
      this.bonusTimer = 0;
      this.particles = [];

      if (this.overlay) {
        this.overlay.classList.add("hidden");
        this.overlay.innerHTML = "";
      }

      const midY = Math.floor(this.rows / 2);
      const startX = Math.floor(this.cols / 2) - 1;
      this.snake = [
        { x: startX, y: midY },
        { x: startX - 1, y: midY },
        { x: startX - 2, y: midY },
        { x: startX - 3, y: midY }
      ];

      this.spawnItems();
      this.updateHud();
    },

    getStepInterval() {
      return Math.max(0.085, 0.185 - this.eatenCount * 0.0032);
    },

    isOccupied(x, y) {
      if (this.snake.some((seg) => seg.x === x && seg.y === y)) return true;
      if (this.item && this.item.x === x && this.item.y === y) return true;
      if (this.bonusItem && this.bonusItem.x === x && this.bonusItem.y === y) return true;
      return false;
    },

    findFreeCell() {
      const free = [];
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (!this.isOccupied(x, y)) {
            free.push({ x, y });
          }
        }
      }
      if (!free.length) return null;
      return free[Math.floor(Math.random() * free.length)];
    },

    spawnItems() {
      if (!this.item) {
        const cell = this.findFreeCell();
        if (cell) {
          const tpl = ITEMS[Math.floor(Math.random() * ITEMS.length)];
          this.item = {
            x: cell.x,
            y: cell.y,
            kind: tpl.kind,
            label: tpl.label,
            energyValue: tpl.energyValue,
            growth: tpl.growth,
            color: tpl.color
          };
        }
      }

      if (!this.bonusItem && this.eatenCount > 0 && this.eatenCount % 4 === 0 && Math.random() < 0.75) {
        const bCell = this.findFreeCell();
        if (bCell) {
          this.bonusItem = {
            x: bCell.x,
            y: bCell.y,
            kind: "crown",
            label: "Krone",
            energyValue: 40,
            growth: 2,
            color: "#fb923c"
          };
          this.bonusTimer = 8.5;
        }
      }
    },

    spawnParticles(gx, gy, color, count = 10) {
      const cx = (gx + 0.5) * this.cellSize;
      const cy = (gy + 0.5) * this.cellSize;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 35 + Math.random() * 110;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.25 + Math.random() * 0.2,
          maxLife: 0.45,
          color: color || "#4ade80",
          size: 2 + Math.random() * 2.5
        });
      }
    },

    updateHud() {
      if (!this.hud) return;
      const speedLevel = Math.min(20, 1 + Math.floor(this.eatenCount / 2));
      this.hud.innerHTML = `
        <span class="text-emerald-300">ENERGIE ${this.energy}</span>
        <span class="text-cyan-300">LÄNGE ${this.snake.length}</span>
        <span class="text-amber-300">TEMPO LV.${speedLevel}</span>
        <span class="text-fuchsia-300">REKORD ${this.bestEnergy}</span>
      `;
    },

    resize() {
      if (!this.root || !this.canvas || !this.canvasCtx) return;
      const rect = this.root.getBoundingClientRect();
      const hudH = this.hud.getBoundingClientRect().height || 24;
      const availW = Math.max(220, rect.width - 14);
      const availH = Math.max(220, rect.height - hudH - 22);

      const boardPx = Math.floor(Math.min(availW, availH, 460));
      this.cellSize = Math.max(11, Math.floor(boardPx / this.cols));
      const w = this.cellSize * this.cols;
      const h = this.cellSize * this.rows;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.field = { x: 0, y: 0, w, h };
    },

    queueDirection(nextDir) {
      if (this.phase !== "playing" || this.paused) return;
      const lastPlanned = this.dirQueue.length ? this.dirQueue[this.dirQueue.length - 1] : this.dir;
      if (nextDir === lastPlanned || OPPOSITE[nextDir] === lastPlanned) return;
      if (this.dirQueue.length < 2) {
        this.dirQueue.push(nextDir);
      }
    },

    handleKeyDown(e) {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        this.queueDirection("up");
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        this.queueDirection("down");
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        this.queueDirection("left");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        this.queueDirection("right");
      }
    },

    handlePointerDown(e) {
      if (this.phase !== "playing" || this.paused) return;
      try {
        this.canvas?.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignorieren
      }
      this.swipeStart = { x: e.clientX, y: e.clientY, triggered: false };
    },

    handlePointerMove(e) {
      if (!this.swipeStart || this.swipeStart.triggered || this.phase !== "playing" || this.paused) return;
      const dx = e.clientX - this.swipeStart.x;
      const dy = e.clientY - this.swipeStart.y;
      const threshold = 22;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.queueDirection(dx > 0 ? "right" : "left");
      } else {
        this.queueDirection(dy > 0 ? "down" : "up");
      }
      this.swipeStart.triggered = true;
      this.swipeStart.x = e.clientX;
      this.swipeStart.y = e.clientY;
      setTimeout(() => {
        if (this.swipeStart) this.swipeStart.triggered = false;
      }, 90);
    },

    handlePointerUp() {
      this.swipeStart = null;
    },

    saveBestEnergy() {
      if (this.energy > this.bestEnergy) {
        this.bestEnergy = this.energy;
        try {
          this.ctx?.storage?.set("best_energy", this.bestEnergy);
        } catch {
          // Storage-Fehler ignorieren
        }
      }
    },

    triggerGameOver(reason = "Kollision") {
      this.phase = "gameover";
      this.saveBestEnergy();
      this.updateHud();
      this.playSfx("playLose");

      const head = this.snake[0];
      if (head) {
        this.spawnParticles(head.x, head.y, "#f43f5e", 18);
      }

      if (!this.overlay) return;
      this.overlay.classList.remove("hidden");
      this.overlay.innerHTML = `
        <div class="w-full max-w-xs rounded-2xl border border-emerald-400/40 bg-slate-900/95 p-6 text-center shadow-[0_0_35px_rgba(52,211,153,0.2)]">
          <h3 class="font-orbitron text-xl font-black text-rose-400 mb-1">SCHLANGE GESTOPPT</h3>
          <p class="text-xs text-slate-400 mb-2">${reason}</p>
          <p class="text-sm text-slate-300 mb-2">Energie: <strong class="text-emerald-300">${this.energy}</strong> • Länge <strong class="text-cyan-300">${this.snake.length}</strong></p>
          <p class="text-xs text-slate-400 mb-5">Rekord: <strong class="text-fuchsia-300">${this.bestEnergy}</strong></p>
          <button type="button" data-action="restart" class="w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-sm bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition">
            Neu starten
          </button>
        </div>
      `;
      this.overlay.querySelector('[data-action="restart"]')?.addEventListener("click", () => {
        this.resetGameState();
        this.ctx?.restartGame?.();
      });
    },

    stepSimulation() {
      if (!this.snake.length) return;
      if (this.dirQueue.length) {
        this.dir = this.dirQueue.shift();
      }

      const vec = DIRS[this.dir] || DIRS.right;
      const head = this.snake[0];
      const nx = head.x + vec.x;
      const ny = head.y + vec.y;

      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
        this.triggerGameOver("An der Begrenzung gestoßen");
        return;
      }

      const bodyToCheck = this.pendingGrowth > 0 ? this.snake : this.snake.slice(0, -1);
      if (bodyToCheck.some((seg) => seg.x === nx && seg.y === ny)) {
        this.triggerGameOver("In den eigenen Körper gebissen");
        return;
      }

      this.snake.unshift({ x: nx, y: ny });

      let ateSomething = false;

      if (this.item && nx === this.item.x && ny === this.item.y) {
        this.energy += this.item.energyValue;
        this.pendingGrowth += this.item.growth;
        this.eatenCount += 1;
        this.saveBestEnergy();
        this.spawnParticles(nx, ny, this.item.color, 12);
        this.playSfx("playHit");
        ateSomething = true;
        this.item = null;
      }

      if (this.bonusItem && nx === this.bonusItem.x && ny === this.bonusItem.y) {
        this.energy += this.bonusItem.energyValue;
        this.pendingGrowth += this.bonusItem.growth;
        this.eatenCount += 1;
        this.saveBestEnergy();
        this.spawnParticles(nx, ny, this.bonusItem.color, 16);
        this.playSfx("playScore");
        ateSomething = true;
        this.bonusItem = null;
        this.bonusTimer = 0;
      }

      if (this.pendingGrowth > 0) {
        this.pendingGrowth -= 1;
      } else {
        this.snake.pop();
      }

      if (!this.item || ateSomething) {
        this.spawnItems();
      }

      if (ateSomething) {
        this.updateHud();
      }
    },

    update(dt) {
      this.animClock += dt;

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }

      if (this.phase !== "playing" || this.paused) return;

      if (this.bonusItem) {
        this.bonusTimer -= dt;
        if (this.bonusTimer <= 0) {
          this.bonusItem = null;
        }
      }

      this.stepAccum += dt;
      const interval = this.getStepInterval();
      while (this.stepAccum >= interval && this.phase === "playing") {
        this.stepAccum -= interval;
        this.stepSimulation();
      }
    },

    getDirAngle() {
      if (this.dir === "right") return 0;
      if (this.dir === "down") return Math.PI / 2;
      if (this.dir === "left") return Math.PI;
      return -Math.PI / 2;
    },

    isItemNearMouth() {
      if (!this.snake.length) return false;
      const head = this.snake[0];
      const targets = [this.item, this.bonusItem].filter(Boolean);
      return targets.some((t) => Math.hypot(t.x - head.x, t.y - head.y) <= 2.6);
    },

    drawItem(ctx, obj, isBonus = false) {
      if (!obj) return;
      const s = this.cellSize;
      const cx = (obj.x + 0.5) * s;
      const cy = (obj.y + 0.5) * s;
      const bob = Math.sin(this.animClock * 6) * (s * 0.04);

      ctx.save();
      ctx.translate(cx, cy + bob);

      // Leichter Schein hinter dem Gegenstand
      ctx.fillStyle = obj.color;
      ctx.globalAlpha = isBonus ? 0.22 : 0.14;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (obj.kind === "battery") {
        // Kleine Batterie
        const bw = s * 0.44;
        const bh = s * 0.3;
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#4ade80";
        ctx.fillRect(-bw / 2 + 2, -bh / 2 + 2, bw * 0.65, bh - 4);
        ctx.fillRect(bw / 2, -bh * 0.22, s * 0.07, bh * 0.44);
      } else if (obj.kind === "gear") {
        // Kleines Zahnrad
        ctx.rotate(this.animClock * 1.4);
        const rOuter = s * 0.32;
        const rInner = s * 0.21;
        const teeth = 6;
        ctx.fillStyle = "#38bdf8";
        ctx.strokeStyle = "#e0f2fe";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < teeth; i++) {
          const a0 = (i / teeth) * Math.PI * 2;
          const a1 = a0 + (Math.PI / teeth) * 0.55;
          const a2 = a0 + (Math.PI / teeth);
          ctx.lineTo(Math.cos(a0) * rInner, Math.sin(a0) * rInner);
          ctx.lineTo(Math.cos(a0) * rOuter, Math.sin(a0) * rOuter);
          ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
          ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
          ctx.lineTo(Math.cos(a2) * rInner, Math.sin(a2) * rInner);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#090d16";
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.kind === "compass") {
        // Kleiner Kompass
        const r = s * 0.31;
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.72);
        ctx.lineTo(r * 0.25, 0);
        ctx.lineTo(-r * 0.25, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.moveTo(0, r * 0.72);
        ctx.lineTo(r * 0.25, 0);
        ctx.lineTo(-r * 0.25, 0);
        ctx.closePath();
        ctx.fill();
      } else if (obj.kind === "crown") {
        // Goldene Krone (Bonus-Gegenstand)
        const w = s * 0.58;
        const h = s * 0.38;
        ctx.fillStyle = "#fb923c";
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, h * 0.45);
        ctx.lineTo(-w * 0.5, -h * 0.35);
        ctx.lineTo(-w * 0.2, h * 0.05);
        ctx.lineTo(0, -h * 0.55);
        ctx.lineTo(w * 0.2, h * 0.05);
        ctx.lineTo(w * 0.5, -h * 0.35);
        ctx.lineTo(w * 0.5, h * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const ratio = Math.max(0, Math.min(1, this.bonusTimer / 8.5));
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
      }

      ctx.restore();
    },

    drawSnake(ctx) {
      if (!this.snake.length) return;
      const s = this.cellSize;
      const total = this.snake.length;

      const pts = this.snake.map((seg, idx) => {
        const progress = idx / Math.max(1, total - 1);
        const radius =
          idx === 0
            ? s * 0.46
            : Math.max(s * 0.15, s * (0.44 - progress * 0.26));
        return {
          x: (seg.x + 0.5) * s,
          y: (seg.y + 0.5) * s,
          r: radius
        };
      });

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Durchgehender, zusammenhängender Schlangenkörper entlang aller Segmente
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const segWidth = (a.r + b.r) * 0.96;

        // Äußere helle Kontur für klaren Zusammenhalt
        ctx.strokeStyle = "#86efac";
        ctx.lineWidth = segWidth + 2.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Innerer Schlangenkörper mit sanftem Farbwechsel
        ctx.strokeStyle = i % 2 === 0 ? "#22c55e" : "#16a34a";
        ctx.lineWidth = segWidth;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Schuppen-Akzente entlang der Körpermitte (ohne Lücken)
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i];
        if (p.r > 3.2) {
          ctx.fillStyle = "rgba(187, 247, 208, 0.42)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.36, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Schwanzspitze sauber abrunden
      const tail = pts[pts.length - 1];
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(tail.x, tail.y, tail.r * 0.95, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Schlangenkopf mit Maul, Zähnen & gespaltener Zunge
      const head = pts[0];
      const angle = this.getDirAngle();
      const mouthOpen = this.isItemNearMouth() || Math.sin(this.animClock * 5) > 0.78;
      const jawSpread = mouthOpen ? s * 0.22 : s * 0.06;

      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(angle);

      const tongueCycle = Math.sin(this.animClock * 15);
      if (tongueCycle > -0.15) {
        const tongueLen = s * (0.26 + Math.max(0, tongueCycle) * 0.22);
        const startX = s * 0.36;
        const forkX = startX + tongueLen;
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = Math.max(1.5, s * 0.08);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(forkX, 0);
        ctx.lineTo(forkX + s * 0.12, -s * 0.1);
        ctx.moveTo(forkX, 0);
        ctx.lineTo(forkX + s * 0.12, s * 0.1);
        ctx.stroke();
      }

      ctx.fillStyle = "#15803d";
      ctx.strokeStyle = "#bef264";
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.38);
      ctx.quadraticCurveTo(s * 0.1, -s * 0.48, s * 0.46, -jawSpread);
      ctx.lineTo(s * 0.34, -jawSpread * 0.35);
      ctx.lineTo(-s * 0.38, -s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-s * 0.38, s * 0.12);
      ctx.lineTo(s * 0.34, jawSpread * 0.35);
      ctx.lineTo(s * 0.46, jawSpread);
      ctx.quadraticCurveTo(s * 0.1, s * 0.48, -s * 0.42, s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (mouthOpen) {
        ctx.fillStyle = "#450a0a";
        ctx.beginPath();
        ctx.moveTo(s * 0.05, -jawSpread * 0.5);
        ctx.lineTo(s * 0.42, -jawSpread * 0.85);
        ctx.lineTo(s * 0.42, jawSpread * 0.85);
        ctx.lineTo(s * 0.05, jawSpread * 0.5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = "#fef9c3";
      ctx.beginPath();
      ctx.moveTo(s * 0.24, -jawSpread * 0.55);
      ctx.lineTo(s * 0.28, -jawSpread * 0.1);
      ctx.lineTo(s * 0.32, -jawSpread * 0.55);
      ctx.moveTo(s * 0.24, jawSpread * 0.55);
      ctx.lineTo(s * 0.28, jawSpread * 0.1);
      ctx.lineTo(s * 0.32, jawSpread * 0.55);
      ctx.fill();

      const eyeY = s * 0.24;
      const eyeX = s * 0.02;
      const eyeR = Math.max(2.4, s * 0.13);

      for (const side of [-1, 1]) {
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(eyeX, side * eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#090d16";
        ctx.fillRect(eyeX - eyeR * 0.25, side * eyeY - eyeR * 0.7, eyeR * 0.5, eyeR * 1.4);
      }

      ctx.restore();
    },

    draw() {
      if (!this.canvasCtx) return;
      const ctx = this.canvasCtx;
      const { w, h } = this.field;
      const s = this.cellSize;

      ctx.clearRect(0, 0, w, h);
      ctx.save();

      ctx.strokeStyle = "rgba(148, 163, 184, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 1; x < this.cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * s, 0);
        ctx.lineTo(x * s, h);
        ctx.stroke();
      }
      for (let y = 1; y < this.rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * s);
        ctx.lineTo(w, y * s);
        ctx.stroke();
      }

      this.drawItem(ctx, this.item, false);
      this.drawItem(ctx, this.bonusItem, true);
      this.drawSnake(ctx);

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
      window.removeEventListener("keydown", this.onKeyDown);
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