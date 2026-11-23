(() => {
  "use strict";

  const VIRTUAL_W = 720;
  const VIRTUAL_H = 405;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------
  // Blaui – Canvas-Grafik
  // ------------------------------------------------------------------
  const C = {
    cream: "#fff6dc",
    creamShade: "#eadcb4",
    blue: "#8fd3f4",
    blueDark: "#5db5e0",
    blueLight: "#d4f1fc",
    berry: "#d81b86",
    berryLight: "#ff6bc1"
  };

  function fluff(ctx, cx, cy, rx, ry, spikes, amp, phase = 0) {
    ctx.beginPath();
    const n = spikes * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + phase;
      const k = i % 2 === 0 ? 1 : 1 - amp;
      ctx.lineTo(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
    }
    ctx.closePath();
  }

  function furBlob(ctx, cx, cy, rx, ry, spikes = 9, amp = 0.16, phase = 0) {
    fluff(ctx, cx, cy, rx, ry, spikes, amp, phase);
    const g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.35, 1, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.55, C.cream);
    g.addColorStop(1, C.creamShade);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(180,160,110,0.55)";
    ctx.lineWidth = 0.8;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function blueOval(ctx, x, y, rx, ry, rot = 0) {
    const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0.5, x, y, Math.max(rx, ry));
    g.addColorStop(0, C.blueLight);
    g.addColorStop(1, C.blue);
    ctx.fillStyle = g;
    ctx.strokeStyle = C.blueDark;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  /** Zeichnet Blaui mit den Füßen auf (x, y). */
  function drawBlaui(ctx, x, y, o = {}) {
    const { facing = 1, cycle = 0, moving = false, t = 0, scale = 0.9 } = o;
    const swing = moving ? Math.sin(cycle) : 0;
    const pose = o.pose || null; // Tanz-Pose (optional), siehe level-disco.js
    const bob = pose ? pose.bob || 0 : moving ? Math.abs(Math.cos(cycle)) * 2.2 : Math.sin(t * 2) * 0.6;
    const wobble = pose ? 0 : moving ? Math.sin(cycle) * 0.07 : Math.sin(t * 1.5) * 0.015;

    ctx.save();
    ctx.translate(x + (pose?.dx || 0) * scale, y);
    ctx.scale(scale * facing, scale);

    // Schatten
    ctx.fillStyle = "rgba(10,15,40,0.35)";
    ctx.beginPath();
    const shrink = pose?.dy ? Math.max(0.6, 1 + pose.dy / 120) : 1;
    ctx.ellipse(0, 0, 17 * shrink, 5 * shrink, 0, 0, TAU);
    ctx.fill();

    if (pose) {
      ctx.scale(pose.sx ?? 1, pose.sy ?? 1);
      ctx.translate(0, pose.dy || 0);
    }

    // Beine + Füße
    [-1, 1].forEach((s, idx) => {
      const L = pose?.legs?.[idx];
      const lift = L ? L.lift : moving ? Math.max(0, Math.sin(cycle + (s > 0 ? Math.PI : 0))) * 4 : 0;
      const lx = L ? L.dx : 0;
      furBlob(ctx, s * 7 + lx, -10 - lift, 6.5, 7, 7, 0.18, s);
      blueOval(ctx, s * 8 + lx, -3 - lift, 7.5, 4, 0);
    });

    ctx.translate(0, -bob);
    if (pose) {
      ctx.translate(pose.hip || 0, -12);
      ctx.rotate(pose.rot || 0);
      ctx.translate(0, 12);
    }
    ctx.rotate(wobble);

    // Arme + Hände (Normalmodus; mit Pose werden sie ganz vorne gezeichnet)
    if (!pose) {
      [-1, 1].forEach((s) => {
        const sw = swing * s * 4;
        furBlob(ctx, s * 17, -23 + sw * 0.4, 6.5, 8.5, 7, 0.18, s * 2);
        blueOval(ctx, s * 19, -15 + sw, 4.2, 4.2);
      });
    }

    // Körper
    furBlob(ctx, 0, -22, 15, 14, 10, 0.15, 0.3);

    // Kapuze (flauschig rund ums Gesicht)
    furBlob(ctx, 0, -40, 20.5, 18.5, 13, 0.14, 0.1);

    // Ohren
    [-1, 1].forEach((s) => blueOval(ctx, s * 20.5, -38, 3.8, 4.8));

    // Hörnchen
    [-1, 1].forEach((s) => {
      ctx.save();
      ctx.translate(s * 9, -57);
      ctx.rotate(s * 0.22);
      const hg = ctx.createLinearGradient(0, -8, 0, 5);
      hg.addColorStop(0, C.blueLight);
      hg.addColorStop(1, C.blue);
      ctx.fillStyle = hg;
      ctx.strokeStyle = C.blueDark;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 6.5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 2.3, 1.6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    });

    // Gesicht
    const fg = ctx.createRadialGradient(-4, -43, 1, 0, -38, 15);
    fg.addColorStop(0, C.blueLight);
    fg.addColorStop(1, C.blue);
    ctx.fillStyle = fg;
    ctx.strokeStyle = C.blueDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -38, 14.5, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Kulleraugen
    [-1, 1].forEach((s) => {
      const ex = s * 6.6;
      const ey = -41;
      ctx.fillStyle = C.blueLight;
      ctx.beginPath();
      ctx.arc(ex, ey, 5.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#7fd0f5";
      ctx.lineWidth = 1;
      ctx.stroke();
      const eg = ctx.createRadialGradient(ex, ey, 0.5, ex, ey, 4.4);
      eg.addColorStop(0, "#1e293b");
      eg.addColorStop(1, "#020617");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ex, ey, 4.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex - 1.5, ey - 1.8, 1.7, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + 1.6, ey + 1.5, 0.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#bdeeff";
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5 + s);
      ctx.beginPath();
      ctx.arc(ex + s * 3.2, ey - 3, 0.8, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Beeren-Knubbelnase
    const ng = ctx.createRadialGradient(-1.3, -36.3, 0.5, 0, -34.5, 5);
    ng.addColorStop(0, C.berryLight);
    ng.addColorStop(1, C.berry);
    ctx.fillStyle = ng;
    ctx.strokeStyle = "#9d0d63";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, -34.5, 4.6, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-1.5, -36.2, 1.1, 0, TAU);
    ctx.fill();

    // Aufgesticktes Lächeln
    ctx.strokeStyle = "#0b0b12";
    ctx.lineWidth = 1.7;
    ctx.lineCap = "round";
    ctx.setLineDash([2.6, 0.8]);
    ctx.beginPath();
    ctx.moveTo(-8, -31.2);
    ctx.quadraticCurveTo(0, -23.5, 8, -31.2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tanz-Arme (Winkel 0 = hängt runter, π = senkrecht nach oben, positiv = nach außen)
    if (pose) {
      [-1, 1].forEach((s) => {
        const a = s < 0 ? pose.armL ?? 0.3 : pose.armR ?? 0.3;
        const sx = s * 14;
        const sy = -27;
        const dx = s * Math.sin(a);
        const dy = Math.cos(a);
        furBlob(ctx, sx + dx * 4, sy + dy * 4, 6.2, 6.2, 7, 0.18, s);
        furBlob(ctx, sx + dx * 10, sy + dy * 10, 5.6, 5.6, 7, 0.18, s + 1);
        blueOval(ctx, sx + dx * 17, sy + dy * 17, 4.3, 4.3);
      });
    }

    ctx.restore();
  }

  window.BLAUI_DRAW = drawBlaui;

  // ------------------------------------------------------------------
  // Spiel
  // ------------------------------------------------------------------
  class BlauisWeltGame {
    constructor() {
      this.ctx = null;
      this.canvas = null;
      this.c = null;
      this.rafId = null;
      this.lastTime = 0;
      this.running = false;
      this.paused = false;
      this.clock = 0;

      this.scene = null;
      this.visited = new Set();
      this.overlay = null; // { portal, t }
      this.armedPortal = null; // Portal, das erst nach Verlassen wieder auslöst
      this.nearId = null;
      this.actionBuffered = 0;
      this.actionCooldown = 0;
      this.toast = null;

      this.blaui = { x: 360, y: 250, vx: 0, vy: 0, facing: 1, cycle: 0, moving: false };

      this.keyState = { left: false, right: false, up: false, down: false };
      this.pointerState = { left: false, right: false, up: false, down: false };
      this.input = { left: false, right: false, up: false, down: false };
      this._prevHeldJump = false;
      this._pointerId = null;
      this._pointerStart = null;

      this._onKeyDown = this._onKeyDown.bind(this);
      this._onKeyUp = this._onKeyUp.bind(this);
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerMove = this._onPointerMove.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      this._loop = this._loop.bind(this);
    }

    init(ctx) {
      this.ctx = ctx;
      ctx.stage.innerHTML = "";

      this.wrap = document.createElement("div");
      this.wrap.className = "relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none";

      this.hud = document.createElement("div");
      this.hud.className =
        "shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-sky-300/30 bg-indigo-950/95 text-[11px] sm:text-xs font-orbitron select-none shadow-md z-10";
      this.hud.innerHTML = `
        <span data-hud="area" class="text-sky-300 font-bold">Oberwelt</span>
        <span data-hud="hint" class="text-indigo-200 hidden sm:inline">Bewege Blaui zu einem Portal</span>
        <span data-hud="visited" class="text-amber-300 font-semibold">Portale 0/5</span>
      `;

      this.canvasHost = document.createElement("div");
      this.canvasHost.className =
        "relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden p-1 sm:p-2";

      this.canvas = document.createElement("canvas");
      this.canvas.className = "block rounded-2xl border border-sky-300/35 shadow-2xl touch-none bg-slate-950";
      this.c = this.canvas.getContext("2d", { alpha: false });

      this.canvasHost.appendChild(this.canvas);
      this.wrap.appendChild(this.hud);
      this.wrap.appendChild(this.canvasHost);
      ctx.stage.appendChild(this.wrap);

      this.visited = new Set();
      this.overlay = null;
      this.reloadLevels();
      this._bindEvents();
      this.resize();
    }

    reloadLevels() {
      const hub = window.BLAUIS_WELT_LEVELS?.get?.("hub");
      if (!hub) return;
      if (!this.scene || this.scene.id === "hub") this.enterScene(hub, true);
    }

    /** Zurück in die Oberwelt – Blaui steht vor dem Portal, aus dem er kommt. */
    returnToHub(portalId) {
      const hub = window.BLAUIS_WELT_LEVELS?.get?.("hub");
      if (!hub) return;
      this.enterScene(hub, true);
      const p = hub.portals.find((q) => q.id === portalId);
      if (p) {
        this.blaui.x = p.x;
        this.blaui.y = Math.min(hub.bounds.y2, p.y + p.ry + 26);
        this.armedPortal = p.id;
      }
      this.actionCooldown = 0.3;
    }

    enterScene(scene, fresh = true) {
      try {
        this.scene?.leave?.(this);
      } catch (_) {}
      this.scene = scene;
      this.actionBuffered = 0;
      this.actionCooldown = 0.3;
      scene.enter?.(this);
      this.overlay = null;
      this.armedPortal = null;
      if (fresh) {
        const sp = scene.spawn || { x: VIRTUAL_W / 2, y: VIRTUAL_H / 2 };
        Object.assign(this.blaui, { x: sp.x, y: sp.y, vx: 0, vy: 0, moving: false });
      }
      this.ctx?.setSubtitle?.(`${scene.name}${scene.subtitle ? " – " + scene.subtitle : ""}`);
      this._updateHud();
    }

    _updateHud() {
      if (!this.hud) return;
      const area = this.hud.querySelector('[data-hud="area"]');
      const vis = this.hud.querySelector('[data-hud="visited"]');
      if (area && this.scene) area.textContent = `🌀 ${this.scene.name}`;
      if (vis) vis.textContent = `Portale ${this.visited.size}/${this.scene?.portals?.length || 7}`;
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
      this.input = { left: false, right: false, up: false, down: false };
      this._prevHeldJump = false;
      this.scene?.onPause?.(this);
    }

    resume() {
      if (!this.running) return;
      this.paused = false;
      this.scene?.onResume?.(this);
      this.lastTime = performance.now();
    }

    destroy() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this._unbindEvents();
      try {
        this.scene?.leave?.(this);
      } catch (_) {}
      if (this._unsubJump) {
        this._unsubJump();
        this._unsubJump = null;
      }
      this.wrap?.parentNode?.removeChild(this.wrap);
      this.wrap = this.canvas = this.c = this.hud = this.canvasHost = null;
      this.ctx = null;
      this.scene = null;
    }

    resize() {
      if (!this.canvasHost || !this.canvas) return;
      const rect = this.canvasHost.getBoundingClientRect();
      const isPortrait = window.innerHeight > window.innerWidth;
      const reservedBottomPad = isPortrait ? 78 : 6;
      const availW = Math.max(260, rect.width - 12);
      const availH = Math.max(180, rect.height - reservedBottomPad - 8);
      const aspect = VIRTUAL_W / VIRTUAL_H;

      let w = availW;
      let h = w / aspect;
      if (h > availH) {
        h = availH;
        w = h * aspect;
      }
      this.canvas.style.width = `${Math.round(w)}px`;
      this.canvas.style.height = `${Math.round(h)}px`;
      const dpr = window.getOptimalDPR ? window.getOptimalDPR() : Math.min(window.devicePixelRatio || 1, 1.25);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      // Level-Zustand bleibt beim Drehen/Resizen erhalten
    }

    // ---------------- Eingabe ----------------
    _bindEvents() {
      window.addEventListener("keydown", this._onKeyDown);
      window.addEventListener("keyup", this._onKeyUp);
      this.canvas?.addEventListener("pointerdown", this._onPointerDown);
      window.addEventListener("pointermove", this._onPointerMove);
      window.addEventListener("pointerup", this._onPointerUp);
      window.addEventListener("pointercancel", this._onPointerUp);
      if (this.ctx?.controls?.onJump) {
        this._unsubJump = this.ctx.controls.onJump(() => this._queueAction());
      }
    }

    _unbindEvents() {
      window.removeEventListener("keydown", this._onKeyDown);
      window.removeEventListener("keyup", this._onKeyUp);
      this.canvas?.removeEventListener("pointerdown", this._onPointerDown);
      window.removeEventListener("pointermove", this._onPointerMove);
      window.removeEventListener("pointerup", this._onPointerUp);
      window.removeEventListener("pointercancel", this._onPointerUp);
    }

    _queueAction() {
      this.actionBuffered = 0.12;
    }

    _onKeyDown(e) {
      if (!this.running || this.paused) return;
      if (this.scene?.custom) this.scene.onKey?.(e, this);
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") this.keyState.left = true;
      else if (k === "arrowright" || k === "d") this.keyState.right = true;
      else if (k === "arrowup" || k === "w") this.keyState.up = true;
      else if (k === "arrowdown" || k === "s") this.keyState.down = true;
      else if (e.code === "Space" || k === "enter" || k === "e") {
        e.preventDefault();
        if (!e.repeat) this._queueAction();
      } else if (k === "escape" && this.overlay) {
        this._closeOverlay();
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
      if (this.scene?.custom) {
        // Eigene Szenen bekommen Tipp-Koordinaten (virtuell 720x405) und steuern selbst
        this._customPointerId = e.pointerId;
        const rect = this.canvas.getBoundingClientRect();
        this.scene.onPointer?.(
          ((e.clientX - rect.left) / rect.width) * VIRTUAL_W,
          ((e.clientY - rect.top) / rect.height) * VIRTUAL_H,
          this
        );
        return;
      }
      this._pointerId = e.pointerId;
      this._pointerStart = { x: e.clientX, y: e.clientY };
    }

    _onPointerMove(e) {
      if (this.scene?.custom && this._customPointerId === e.pointerId && !this.paused) {
        const rect = this.canvas.getBoundingClientRect();
        this.scene.onPointerMove?.(
          ((e.clientX - rect.left) / rect.width) * VIRTUAL_W,
          ((e.clientY - rect.top) / rect.height) * VIRTUAL_H,
          this
        );
        return;
      }
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
      if (this.scene?.custom && this._customPointerId === e.pointerId) {
        this._customPointerId = null;
        const rect = this.canvas.getBoundingClientRect();
        this.scene.onPointerUp?.(
          ((e.clientX - rect.left) / rect.width) * VIRTUAL_W,
          ((e.clientY - rect.top) / rect.height) * VIRTUAL_H,
          this
        );
        return;
      }
      if (this._pointerId !== e.pointerId) return;
      if (this._pointerStart) {
        const d = Math.hypot(e.clientX - this._pointerStart.x, e.clientY - this._pointerStart.y);
        if (d < 14) this._queueAction();
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
      if (held.jump && !this._prevHeldJump) this._queueAction();
      this._prevHeldJump = Boolean(held.jump);
    }

    // ---------------- Logik ----------------
    _portalDist(p) {
      const bx = this.blaui.x;
      const by = this.blaui.y - 14;
      return Math.hypot((bx - p.x) / p.rx, (by - p.y) / p.ry);
    }

    _openPortal(p) {
      const target = window.BLAUIS_WELT_LEVELS?.targetForPortal?.(p.id);
      const level = target ? window.BLAUIS_WELT_LEVELS.get(target.levelId) : null;
      if (level) {
        this.enterScene(level, true);
        return;
      }
      this.visited.add(p.id);
      this.overlay = { portal: p, t: 0 };
      this.actionCooldown = 0.35;
      this._updateHud();
      this.ctx?.sound?.ensureContext?.();
    }

    _closeOverlay() {
      if (!this.overlay) return;
      this.armedPortal = this.overlay.portal.id;
      this.overlay = null;
      this.actionCooldown = 0.25;
      // Blaui sanft vor das Portal setzen
      const p = this.armedPortal && this.scene?.portals?.find((q) => q.id === this.armedPortal);
      if (p) {
        const b = this.scene.bounds;
        this.blaui.y = Math.min(b.y2, Math.max(b.y1, p.y + p.ry + 24));
        this.blaui.x = Math.min(b.x2, Math.max(b.x1, p.x));
        this.blaui.vx = this.blaui.vy = 0;
      }
    }

    _update(dt) {
      this.clock += dt;
      this.actionBuffered = Math.max(0, this.actionBuffered - dt);
      this.actionCooldown = Math.max(0, this.actionCooldown - dt);
      if (!this.scene) return;
      const b = this.blaui;

      let action = false;
      if (this.actionBuffered > 0 && this.actionCooldown <= 0) {
        action = true;
        this.actionBuffered = 0;
      }

      if (this.scene.custom) {
        this.scene.update(dt, this, action);
        return;
      }

      if (this.overlay) {
        this.overlay.t += dt;
        if (action && this.overlay.t > 0.25) this._closeOverlay();
        b.moving = false;
        return;
      }

      // Bewegung in alle Richtungen
      let dx = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
      let dy = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const speed = 128;
      const k = Math.min(1, 12 * dt);
      b.vx += (dx * speed - b.vx) * k;
      b.vy += (dy * speed - b.vy) * k;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const bd = this.scene.bounds;
      b.x = Math.min(bd.x2, Math.max(bd.x1, b.x));
      b.y = Math.min(bd.y2, Math.max(bd.y1, b.y));
      b.moving = Math.hypot(b.vx, b.vy) > 12;
      if (Math.abs(b.vx) > 8) b.facing = b.vx > 0 ? 1 : -1;
      if (b.moving) b.cycle += dt * 11;

      // Portale
      let near = null;
      let nearD = Infinity;
      (this.scene.portals || []).forEach((p) => {
        const d = this._portalDist(p);
        if (this.armedPortal === p.id && d > 1.9) this.armedPortal = null;
        if (d < nearD) {
          nearD = d;
          near = p;
        }
      });
      this.nearId = near && nearD < 2.4 ? near.id : null;

      if (near && nearD < 2.4) {
        const walkedIn = nearD < 0.75 && this.armedPortal !== near.id;
        if (walkedIn || (action && nearD < 2.4)) {
          this._openPortal(near);
        }
      }
    }

    // ---------------- Zeichnen ----------------
    _draw() {
      if (!this.c || !this.canvas) return;
      const ctx = this.c;
      const s = this.canvas.width / VIRTUAL_W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, VIRTUAL_W, VIRTUAL_H);
      if (!this.scene) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
        ctx.fillStyle = "#e0e7ff";
        ctx.font = "700 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Blauis Welt lädt …", VIRTUAL_W / 2, VIRTUAL_H / 2);
        return;
      }
      const t = this.clock;
      if (this.scene.custom) {
        this.scene.draw(ctx, t, this);
        return;
      }
      const state = { nearId: this.overlay ? null : this.nearId, visited: this.visited };
      this.scene.drawBackground?.(ctx, t, state);
      this.scene.drawSigns?.(ctx, t, state);

      const b = this.blaui;
      drawBlaui(ctx, b.x, b.y, { facing: b.facing, cycle: b.cycle, moving: b.moving, t });

      this.scene.drawForeground?.(ctx, t, state);

      if (!this.overlay && this.nearId) this._drawPrompt(ctx);
      if (this.overlay) this._drawOverlay(ctx);
    }

    _drawPrompt(ctx) {
      const p = this.scene.portals.find((q) => q.id === this.nearId);
      if (!p) return;
      const b = this.blaui;
      const txt = "Aktion / Enter: betreten";
      ctx.save();
      ctx.font = "700 10px Rajdhani, sans-serif";
      const w = ctx.measureText(txt).width + 16;
      const x = Math.min(VIRTUAL_W - w / 2 - 4, Math.max(w / 2 + 4, b.x));
      const y = b.y - 66 - Math.sin(this.clock * 4) * 2;
      ctx.fillStyle = "rgba(15,23,42,0.88)";
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - 10, w, 18, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(txt, x, y - 1);
      ctx.restore();
    }

    _drawOverlay(ctx) {
      const { portal: p, t } = this.overlay;
      const a = Math.min(1, t * 4);
      ctx.save();
      ctx.fillStyle = `rgba(2,6,23,${0.7 * a})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

      const w = 380;
      const h = 210;
      const x = (VIRTUAL_W - w) / 2;
      const y = (VIRTUAL_H - h) / 2 + (1 - a) * 20;
      ctx.globalAlpha = a;

      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, p.dark);
      g.addColorStop(1, "#0f172a");
      ctx.fillStyle = g;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 20);
      ctx.fill();
      ctx.stroke();

      // Mini-Portal-Strudel
      const cx = VIRTUAL_W / 2;
      const cy = y + 62;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, TAU);
      ctx.clip();
      const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
      rg.addColorStop(0, "#ffffff");
      rg.addColorStop(1, p.color);
      ctx.fillStyle = rg;
      ctx.fillRect(cx - 34, cy - 34, 68, 68);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let q = 0; q <= 5; q += 0.2) {
          const ang = q + this.clock * 2 + (i * TAU) / 3;
          const r = (q / 5) * 34;
          q === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, TAU);
      ctx.stroke();
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(p.icon, cx, cy + 2);

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 18px Orbitron, Rajdhani, sans-serif";
      ctx.fillText(`${p.name} – Level folgt in Kürze!`, cx, y + 118, w - 24);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "600 12px Rajdhani, sans-serif";
      this._wrapText(ctx, p.text, cx, y + 142, w - 60, 15);

      const pulse = 0.75 + 0.25 * Math.sin(this.clock * 5);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a * pulse;
      ctx.beginPath();
      ctx.roundRect(cx - 82, y + h - 38, 164, 26, 13);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 11px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("ZURÜCK · Aktion / Enter", cx, y + h - 24);
      ctx.restore();
    }

    _wrapText(ctx, text, cx, y, maxW, lh) {
      const words = text.split(" ");
      let line = "";
      let yy = y;
      words.forEach((w) => {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, cx, yy);
          line = w;
          yy += lh;
        } else {
          line = test;
        }
      });
      if (line) ctx.fillText(line, cx, yy);
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

  const game = new BlauisWeltGame();
  window.BLAUIS_WELT_GAME = game;

  window.GAME_REGISTRY?.register({
    id: "blauiswelt",
    name: "Blauis Welt",
    icon: "🐻‍❄️",
    tag: "Adventure",
    subtitle: "Oberwelt mit 5 magischen Portalen",
    description:
      "Begleite den flauschigen Blaui durch die Portal-Halle und entdecke Bambus Wald, Disco Raum, Wolken Reich, Blauis Haus und Blauis Heimat!",
    init: (ctx) => game.init(ctx),
    start: () => game.start(),
    pause: () => game.pause(),
    resume: () => game.resume(),
    resize: () => game.resize(),
    destroy: () => game.destroy()
  });
})();
