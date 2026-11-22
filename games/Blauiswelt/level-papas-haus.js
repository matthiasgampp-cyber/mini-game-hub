(() => {
  "use strict";

  /**
   * Blauis Welt – Level "Haus von Papa" (Kletter- & Code-Rätsel-Level)
   * ------------------------------------------------------------------
   * - Blaui trägt Mamas dampfenden Eintopf-Topf vor Papas Haus
   * - Mehrstöckige Holzgerüst-Plattformen & Leitern rund um Papas Haus
   * - Zufälliger 4-stelliger Code bei jedem Start, verteilt auf 4 Hinweise
   *   (nur sichtbar, wenn Blaui davor steht – Merk-Mechanik!)
   * - Zahlenschloss (Keypad-Overlay) an der Haustür
   * - Abspann: Blick durch das warm beleuchtete Fenster auf Blaui & Papa beim Essen
   */

  const W = 720;
  const H = 405;
  const TAU = Math.PI * 2;
  const GROUND_Y = 360;

  const GRAVITY = 880;
  const MOVE_SPEED = 185;
  const CLIMB_SPEED = 135;
  const JUMP_VY = -395;

  const DOOR = { x: 582, y: GROUND_Y };

  // Plattformen (x, y, w)
  const PLATFORMS = [
    { x: 0,   y: GROUND_Y, w: W },   // Gartenboden
    { x: 56,  y: 288, w: 176 },      // Ebene 1 links
    { x: 274, y: 288, w: 158 },      // Ebene 1 mitte
    { x: 112, y: 214, w: 170 },      // Ebene 2 links
    { x: 332, y: 214, w: 185 },      // Ebene 2 rechts
    { x: 52,  y: 142, w: 168 },      // Ebene 3 links
    { x: 278, y: 142, w: 224 }       // Ebene 3 oben (Balkon/Dachrand)
  ];

  // Leitern (x, topY, botY)
  const LADDERS = [
    { x: 102, topY: 288, botY: GROUND_Y },
    { x: 378, topY: 288, botY: GROUND_Y },
    { x: 204, topY: 214, botY: 288 },
    { x: 348, topY: 214, botY: 288 },
    { x: 148, topY: 142, botY: 214 },
    { x: 468, topY: 142, botY: 214 }
  ];

  // 4 Hinweis-Schilder (auf verschiedenen Plattformen verteilt)
  const CLUE_SPOTS = [
    { x: 76,  y: 288 }, // Ebene 1 links
    { x: 396, y: 288 }, // Ebene 1 mitte
    { x: 132, y: 142 }, // Ebene 3 links
    { x: 432, y: 142 }  // Ebene 3 oben
  ];

  const STARS = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 97 + 23) % W,
    y: (i * 43 + 11) % 190,
    r: 0.8 + (i % 3) * 0.5,
    ph: i * 1.1
  }));

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ------------------------------------------------------------------
  // Szene "Haus von Papa"
  // ------------------------------------------------------------------
  const scene = {
    id: "papa",
    name: "Haus von Papa",
    subtitle: "Finde den 4-stelligen Code",
    custom: true,

    state: "playing", // playing | keypad | opening | ending
    clock: 0,
    code: [0, 0, 0, 0],
    clues: [],        // [{ x, y, pos, digit }]
    entered: "",
    keypadMsg: null,  // { text, color, t }
    doorAnim: 0,
    endingTimer: 0,
    steam: [],
    hearts: [],
    particles: [],
    player: { x: 240, y: GROUND_Y, vx: 0, vy: 0, onGround: true, onLadder: false, facing: 1, cycle: 0 },
    prevUp: false,
    ui: [],
    game: null,

    enter(game) {
      this.game = game;
      this.resetLevel();
    },

    leave() {
      this.game = null;
    },

    resetLevel() {
      this.state = "playing";
      this.clock = 0;
      this.entered = "";
      this.keypadMsg = null;
      this.doorAnim = 0;
      this.endingTimer = 0;
      this.steam = [];
      this.hearts = [];
      this.particles = [];
      this.prevUp = false;

      // Neuen zufälligen 4-stelligen Code würfeln
      this.code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10));
      const order = shuffle([0, 1, 2, 3]);
      this.clues = CLUE_SPOTS.map((sp, i) => ({
        x: sp.x,
        y: sp.y,
        pos: order[i] + 1,
        digit: this.code[order[i]]
      }));

      this.player = {
        x: 240,
        y: GROUND_Y,
        vx: 0,
        vy: 0,
        onGround: true,
        onLadder: false,
        facing: 1,
        cycle: 0
      };
    },

    nearDoor() {
      return Math.abs(this.player.x - DOOR.x) < 42 && this.player.y > 320;
    },

    nearClue() {
      for (const c of this.clues) {
        if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < 42) return c;
      }
      return null;
    },

    toHub() {
      this.game?.returnToHub?.("papa");
    },

    submitCode() {
      if (this.entered.length < 4) {
        this.keypadMsg = { text: "Bitte 4 Ziffern eingeben!", color: "#fde047", t: 1.5 };
        return;
      }
      if (this.entered === this.code.join("")) {
        this.keypadMsg = { text: "✓ Richtig! Tür öffnet sich...", color: "#4ade80", t: 1.4 };
        this.state = "opening";
        this.doorAnim = 0;
      } else {
        this.keypadMsg = {
          text: "Falscher Code – schau nochmal auf den Plattformen nach!",
          color: "#f87171",
          t: 2.2
        };
        this.entered = "";
      }
    },

    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "backspace") {
        if (this.state === "keypad") {
          e.preventDefault?.();
          if (k === "backspace" && this.entered.length > 0) {
            this.entered = this.entered.slice(0, -1);
          } else {
            this.state = "playing";
          }
          return;
        }
        e.preventDefault?.();
        this.toHub();
        return;
      }

      if (this.state === "keypad") {
        if (/^[0-9]$/.test(k) && this.entered.length < 4) {
          this.entered += k;
        } else if (e.code === "Enter") {
          e.preventDefault?.();
          this.submitCode();
        }
      } else if (this.state === "ending" && k === "r") {
        this.resetLevel();
      }
    },

    onPointer(x, y) {
      for (let i = this.ui.length - 1; i >= 0; i--) {
        const b = this.ui[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          if (b.id === "hub") this.toHub();
          else if (b.id === "again") this.resetLevel();
          else if (b.id === "close") this.state = "playing";
          else if (b.id === "del") this.entered = this.entered.slice(0, -1);
          else if (b.id === "ok") this.submitCode();
          else if (b.id.startsWith("k:") && this.entered.length < 4) {
            this.entered += b.id.slice(2);
          }
          return;
        }
      }

      // Direktes Antippen der Tür/des Keypads öffnet das Schloss
      if (this.state === "playing" && this.nearDoor() && x > 530 && y > 260) {
        this.state = "keypad";
        this.keypadMsg = null;
      }
    },

    // ------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------
    update(dt, game, action) {
      this.clock += dt;

      if (this.keypadMsg) {
        this.keypadMsg.t -= dt;
        if (this.keypadMsg.t <= 0) this.keypadMsg = null;
      }

      // Dampf am Eintopf-Topf (beim Tragen oder auf Papas Esstisch)
      if (Math.random() < dt * 5) {
        const sx = this.state === "ending" ? W / 2 : this.player.x + this.player.facing * 14;
        const sy = this.state === "ending" ? 204 : this.player.y - 24;
        this.steam.push({ x: sx + (Math.random() - 0.5) * 10, y: sy, vy: -20, life: 0.9, max: 0.9, ph: Math.random() * TAU });
      }
      this.steam = this.steam.filter((s) => {
        s.life -= dt;
        s.y += s.vy * dt;
        s.x += Math.sin(this.clock * 3 + s.ph) * 6 * dt;
        return s.life > 0;
      });

      if (this.state === "keypad") {
        return;
      }

      if (this.state === "opening") {
        this.doorAnim = Math.min(1, this.doorAnim + dt * 1.4);
        if (this.doorAnim >= 1) {
          this.state = "ending";
          this.endingTimer = 0;
        }
        return;
      }

      if (this.state === "ending") {
        this.endingTimer += dt;
        if (Math.random() < dt * 2.5) {
          this.hearts.push({
            x: W / 2 + (Math.random() - 0.5) * 90,
            y: 196,
            vy: -24,
            life: 1.5,
            max: 1.5,
            ph: Math.random() * TAU
          });
        }
        this.hearts = this.hearts.filter((h) => {
          h.life -= dt;
          h.y += h.vy * dt;
          h.x += Math.sin(this.clock * 4 + h.ph) * 10 * dt;
          return h.life > 0;
        });
        if (action && this.endingTimer > 1.0) this.resetLevel();
        return;
      }

      // --- playing ---
      if (action && this.nearDoor()) {
        this.state = "keypad";
        this.keypadMsg = null;
        return;
      }

      const p = this.player;
      const inp = game.input || {};
      const dirX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const dirY = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);

      // Prüfen, ob Blaui an einer Leiter steht
      const ladder = LADDERS.find((l) => Math.abs(p.x - l.x) < 18 && p.y >= l.topY - 4 && p.y <= l.botY + 6);
      if (ladder && dirY !== 0) {
        if (!(dirY > 0 && p.y >= ladder.botY)) {
          p.onLadder = true;
          p.x += (ladder.x - p.x) * Math.min(1, 14 * dt);
          p.vy = 0;
        }
      }
      if (!ladder) p.onLadder = false;

      if (p.onLadder) {
        p.vx = dirX * MOVE_SPEED * 0.65;
        p.vy = dirY * CLIMB_SPEED;
        p.x = clamp(p.x + p.vx * dt, 24, W - 24);
        p.y = clamp(p.y + p.vy * dt, ladder.topY, ladder.botY);
        if (p.y <= ladder.topY && dirY < 0) {
          p.y = ladder.topY;
          p.onLadder = false;
          p.onGround = true;
        } else if (p.y >= ladder.botY && dirY > 0) {
          p.y = ladder.botY;
          p.onLadder = false;
          p.onGround = true;
        }
        if (Math.abs(dirY) > 0) p.cycle += dt * 10;
        this.prevUp = Boolean(inp.up);
        return;
      }

      // Normale Plattform-Bewegung
      p.vx += (dirX * MOVE_SPEED - p.vx) * Math.min(1, 15 * dt);
      if (Math.abs(dirX) > 0) p.facing = dirX;

      const jumpPressed = Boolean(action || (inp.up && !this.prevUp));
      this.prevUp = Boolean(inp.up);
      if (jumpPressed && p.onGround) {
        p.vy = JUMP_VY;
        p.onGround = false;
      }

      p.vy = Math.min(540, p.vy + GRAVITY * dt);
      const prevY = p.y;
      p.x = clamp(p.x + p.vx * dt, 24, W - 24);
      p.y += p.vy * dt;

      // Einweg-Plattformkollision von oben
      p.onGround = false;
      if (p.vy >= 0) {
        for (const pl of PLATFORMS) {
          if (p.x >= pl.x - 8 && p.x <= pl.x + pl.w + 8 && prevY <= pl.y + 6 && p.y >= pl.y) {
            p.y = pl.y;
            p.vy = 0;
            p.onGround = true;
            break;
          }
        }
      }

      if (p.onGround && Math.abs(p.vx) > 12) {
        p.cycle += dt * 12;
      }
    },

    // ------------------------------------------------------------------
    // Zeichnen
    // ------------------------------------------------------------------
    draw(ctx, t) {
      this.ui = [];

      if (this.state === "ending") {
        this.drawEnding(ctx, t);
        this.drawHud(ctx);
        return;
      }

      // 1. Abendhimmel & Sterne
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0b112e");
      sky.addColorStop(0.65, "#1e3a8a");
      sky.addColorStop(1, "#1e293b");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      STARS.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.55 * Math.abs(Math.sin(t * 1.6 + s.ph))})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      });

      // Mond
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(620, 66, 18, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#0e1d4a";
      ctx.beginPath();
      ctx.arc(628, 62, 15, 0, TAU);
      ctx.fill();

      // 2. Papas Haus (rechts im Hintergrund)
      this.drawPapaHouse(ctx, t);

      // 3. Gartenboden
      ctx.fillStyle = "#166534";
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(0, GROUND_Y, W, 6);

      // 4. Holz-Plattformen & Leitern
      PLATFORMS.slice(1).forEach((pl) => {
        // Stützen
        ctx.fillStyle = "#78350f";
        ctx.fillRect(pl.x + 8, pl.y + 8, 6, 16);
        ctx.fillRect(pl.x + pl.w - 14, pl.y + 8, 6, 16);
        // Plattformbrett
        ctx.fillStyle = "#b45309";
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(pl.x, pl.y, pl.w, 12, 4);
        ctx.fill();
        ctx.stroke();
      });

      LADDERS.forEach((l) => {
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.x - 10, l.topY);
        ctx.lineTo(l.x - 10, l.botY);
        ctx.moveTo(l.x + 10, l.topY);
        ctx.lineTo(l.x + 10, l.botY);
        ctx.stroke();
        ctx.lineWidth = 2.4;
        for (let y = l.topY + 10; y < l.botY; y += 14) {
          ctx.beginPath();
          ctx.moveTo(l.x - 10, y);
          ctx.lineTo(l.x + 10, y);
          ctx.stroke();
        }
      });

      // 5. Hinweis-Schilder
      const activeClue = this.nearClue();
      this.clues.forEach((c) => {
        const near = activeClue === c;
        ctx.save();
        ctx.fillStyle = "#78350f";
        ctx.fillRect(c.x - 2, c.y - 24, 4, 24);
        ctx.fillStyle = near ? "#fef08a" : "#fde68a";
        ctx.strokeStyle = near ? "#f59e0b" : "#92400e";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(c.x - 14, c.y - 38, 28, 18, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#78350f";
        ctx.font = "900 10px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", c.x, c.y - 29);
        ctx.restore();
      });

      // 6. Blaui mit Mamas Eintopf-Topf
      const p = this.player;
      window.BLAUI_DRAW?.(ctx, p.x, p.y, {
        facing: p.facing,
        cycle: p.cycle,
        moving: p.onGround && Math.abs(p.vx) > 12,
        t,
        scale: 0.82,
        pose: p.onLadder ? { armL: 2.1, armR: 2.1 } : { armL: 1.1, armR: 1.1 }
      });
      this.drawStewPot(ctx, p.x + p.facing * 14, p.y - 18, 0.55);

      // Dampf
      this.steam.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.45 * (s.life / s.max)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.5, 0, TAU);
        ctx.fill();
      });

      // 7. Merk-Hinweis-Blase (nur wenn Blaui direkt davor steht)
      if (activeClue && this.state === "playing") {
        this.drawBubble(ctx, activeClue.x, activeClue.y - 54, `${activeClue.pos}. Stelle: ${activeClue.digit}`, "#fde047");
      } else if (this.nearDoor() && this.state === "playing") {
        this.drawBubble(ctx, DOOR.x, DOOR.y - 94, "Aktion / Enter: Zahlenschloss", "#38bdf8");
      }

      this.drawHud(ctx);

      if (this.state === "keypad") {
        this.drawKeypad(ctx);
      }
    },

    drawPapaHouse(ctx, t) {
      // Hauskörper
      const hx = 486;
      const hy = 176;
      const hw = 204;
      const hh = GROUND_Y - hy;
      const wg = ctx.createLinearGradient(0, hy, 0, GROUND_Y);
      wg.addColorStop(0, "#1e3a8a");
      wg.addColorStop(1, "#1e293b");
      ctx.fillStyle = wg;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.fillRect(hx, hy, hw, hh);
      ctx.strokeRect(hx, hy, hw, hh);

      // Dach
      ctx.fillStyle = "#7c2d12";
      ctx.beginPath();
      ctx.moveTo(hx - 16, hy + 4);
      ctx.lineTo(hx + hw / 2, hy - 58);
      ctx.lineTo(hx + hw + 16, hy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Warme Fenster
      [[516, 206], [620, 206]].forEach(([wx, wy]) => {
        ctx.fillStyle = "#fde047";
        ctx.fillRect(wx, wy, 42, 42);
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(wx, wy, 42, 42);
        ctx.beginPath();
        ctx.moveTo(wx + 21, wy);
        ctx.lineTo(wx + 21, wy + 42);
        ctx.moveTo(wx, wy + 21);
        ctx.lineTo(wx + 42, wy + 21);
        ctx.stroke();
      });

      // Haustür (schwingt beim Öffnen auf)
      const dx = DOOR.x - 24;
      const dy = DOOR.y - 78;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(dx, dy, 48, 78);
      const openW = 48 * (1 - this.doorAnim * 0.85);
      ctx.fillStyle = "#b45309";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2;
      ctx.fillRect(dx, dy, openW, 78);
      ctx.strokeRect(dx, dy, openW, 78);

      // Gut sichtbares Zahlen-Tastenfeld (Keypad) neben der Tür
      const kx = DOOR.x + 32;
      const ky = DOOR.y - 54;
      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(kx, ky, 18, 26, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = this.state === "opening" ? "#4ade80" : "#ef4444";
      ctx.beginPath();
      ctx.arc(kx + 9, ky + 6, 2.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillRect(kx + 3 + c * 4.5, ky + 11 + r * 4.5, 3, 3);
        }
      }
    },

    drawStewPot(ctx, x, y, s = 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 4, 18, 12, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.ellipse(0, -4, 14, 5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -4, 15, 5.5, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    },

    drawBubble(ctx, x, y, text, color) {
      ctx.save();
      ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
      const w = ctx.measureText(text).width + 20;
      const bx = clamp(x, w / 2 + 8, W - w / 2 - 8);
      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx - w / 2, y - 13, w, 26, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx, y);
      ctx.restore();
    },

    drawKeypad(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
      ctx.fillRect(0, 0, W, H);

      const px = 215;
      const py = 54;
      const pw = 290;
      const ph = 318;
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 14px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("🔐 PAPAS TÜR-CODE", W / 2, py + 24);

      this.drawButton(ctx, "close", "✕", px + pw - 36, py + 10, 26, 26, "#f87171", 12);

      // Code-Anzeige
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = this.keypadMsg ? this.keypadMsg.color : "#64748b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px + 34, py + 44, pw - 68, 38, 8);
      ctx.fill();
      ctx.stroke();
      const disp = this.entered.padEnd(4, "•").split("").join("  ");
      ctx.fillStyle = "#fde047";
      ctx.font = "900 22px Orbitron, monospace";
      ctx.fillText(disp, W / 2, py + 64);

      if (this.keypadMsg) {
        ctx.fillStyle = this.keypadMsg.color;
        ctx.font = "700 10px Rajdhani, sans-serif";
        ctx.fillText(this.keypadMsg.text, W / 2, py + 94);
      }

      // Ziffernblock 1-9, Löschen, 0, Prüfen
      const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"];
      const bw = 68;
      const bh = 42;
      const gap = 8;
      const gx0 = px + (pw - (3 * bw + 2 * gap)) / 2;
      const gy0 = py + 108;

      keys.forEach((k, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const bx = gx0 + col * (bw + gap);
        const by = gy0 + row * (bh + gap);
        if (k === "del") this.drawButton(ctx, "del", "⌫", bx, by, bw, bh, "#f87171", 15);
        else if (k === "ok") this.drawButton(ctx, "ok", "✓ OK", bx, by, bw, bh, "#4ade80", 13);
        else this.drawButton(ctx, `k:${k}`, k, bx, by, bw, bh, "#38bdf8", 16);
      });

      ctx.restore();
    },

    drawEnding(ctx, t) {
      // 1. Nächtliche Außenwand (Holzverkleidung mit warmem Lichtschein ums Fenster)
      const extBg = ctx.createLinearGradient(0, 0, 0, H);
      extBg.addColorStop(0, "#070b1e");
      extBg.addColorStop(0.65, "#0f172a");
      extBg.addColorStop(1, "#020617");
      ctx.fillStyle = extBg;
      ctx.fillRect(0, 0, W, H);

      // Holzschalung an der Außenwand
      ctx.strokeStyle = "rgba(30, 41, 59, 0.55)";
      ctx.lineWidth = 1.2;
      for (let y = 16; y < H; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      const fx = 105;
      const fy = 46;
      const fw = 510;
      const fh = 236;

      // Warmes Fensterlicht auf der Außenwand
      const outerGlow = ctx.createRadialGradient(W / 2, fy + fh * 0.5, 80, W / 2, fy + fh * 0.5, 360);
      outerGlow.addColorStop(0, "rgba(251, 191, 36, 0.34)");
      outerGlow.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, W, H);

      // 2. Innenraum durch das Fenster (geclippt)
      ctx.save();
      ctx.beginPath();
      ctx.rect(fx, fy, fw, fh);
      ctx.clip();

      // Warmer Raum-Hintergrundverlauf
      const roomG = ctx.createRadialGradient(W / 2, fy + 64, 15, W / 2, fy + 115, 310);
      roomG.addColorStop(0, "#fef3c7");
      roomG.addColorStop(0.5, "#d97706");
      roomG.addColorStop(1, "#451a03");
      ctx.fillStyle = roomG;
      ctx.fillRect(fx, fy, fw, fh);

      // Holz-Wandvertäfelung unten
      ctx.fillStyle = "rgba(69, 26, 3, 0.55)";
      ctx.fillRect(fx, fy + 150, fw, fh - 150);
      ctx.strokeStyle = "rgba(251, 191, 36, 0.16)";
      ctx.lineWidth = 1;
      for (let x = fx; x < fx + fw; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, fy + 150);
        ctx.lineTo(x, fy + fh);
        ctx.stroke();
      }

      // Hintergrund-Deko: Familienbild, Sideboard & Bücherregal
      ctx.fillStyle = "#78350f";
      ctx.fillRect(fx + 52, fy + 44, 56, 44);
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(fx + 57, fy + 49, 46, 34);
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(fx + 72, fy + 66, 7, 0, TAU);
      ctx.arc(fx + 88, fy + 66, 7, 0, TAU);
      ctx.arc(fx + 80, fy + 70, 5, 0, TAU);
      ctx.fill();

      // Sideboard rechts hinten mit Geschirr & Pflanze
      ctx.fillStyle = "rgba(69, 26, 3, 0.72)";
      ctx.fillRect(fx + fw - 115, fy + 122, 92, 40);
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(fx + fw - 44, fy + 110, 12, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.fillRect(fx + fw - 51, fy + 116, 14, 8);

      // Hängelampe mit warmem Lichtkegel über dem Tisch
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(W / 2, fy);
      ctx.lineTo(W / 2, fy + 24);
      ctx.stroke();

      const cone = ctx.createLinearGradient(0, fy + 28, 0, fy + fh);
      cone.addColorStop(0, "rgba(254, 240, 138, 0.36)");
      cone.addColorStop(1, "rgba(254, 240, 138, 0.02)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 24, fy + 34);
      ctx.lineTo(W / 2 + 24, fy + 34);
      ctx.lineTo(W / 2 + 190, fy + fh);
      ctx.lineTo(W / 2 - 190, fy + fh);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.moveTo(W / 2 - 26, fy + 36);
      ctx.lineTo(W / 2 + 26, fy + 36);
      ctx.quadraticCurveTo(W / 2 + 14, fy + 20, W / 2, fy + 20);
      ctx.quadraticCurveTo(W / 2 - 14, fy + 20, W / 2 - 26, fy + 36);
      ctx.fill();
      ctx.fillStyle = "#fef9c3";
      ctx.beginPath();
      ctx.arc(W / 2, fy + 36, 7, 0, Math.PI);
      ctx.fill();

      // 3. Stühle & Familie (groß, deutlich sichtbar & richtig am Essen)
      const ty = fy + 194;

      // Holzstühle
      [W / 2 - 148, W / 2 + 148].forEach((cx) => {
        ctx.fillStyle = "#451a03";
        ctx.fillRect(cx - 26, fy + 122, 52, 84);
      });

      const eatPapi = 0.5 - 0.5 * Math.cos(t * 2.5);
      const eatBlaui = 0.5 - 0.5 * Math.cos(t * 2.5 + 2.1);
      const eatMami = 0.5 - 0.5 * Math.cos(t * 2.5 + 4.2);

      // Blaui in der Mitte
      const blauiX = W / 2;
      const blauiY = ty + 20;
      window.BLAUI_DRAW?.(ctx, blauiX, blauiY, {
        facing: 1,
        t,
        scale: 1.38,
        pose: { armR: 1.0 + eatBlaui * 1.1, armL: 0.75, dy: -eatBlaui * 2 }
      });

      // Papi links (groß, blauer Pullover & runde Brille)
      const papiX = W / 2 - 144;
      const papiY = ty + 24;
      window.BLAUI_DRAW?.(ctx, papiX, papiY, {
        facing: 1,
        t,
        scale: 1.56,
        pose: { armR: 1.0 + eatPapi * 1.15, armL: 0.7, rot: eatPapi * 0.05 }
      });
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.ellipse(papiX, papiY - 34, 22, 16, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(papiX + 2, papiY - 64, 6.5, 0, TAU);
      ctx.arc(papiX + 18, papiY - 64, 6.5, 0, TAU);
      ctx.moveTo(papiX + 8.5, papiY - 64);
      ctx.lineTo(papiX + 11.5, papiY - 64);
      ctx.stroke();

      // Mami rechts (rosa Strickjacke & Schleife)
      const mamiX = W / 2 + 144;
      const mamiY = ty + 22;
      window.BLAUI_DRAW?.(ctx, mamiX, mamiY, {
        facing: -1,
        t,
        scale: 1.48,
        pose: { armR: 1.0 + eatMami * 1.15, armL: 0.7, rot: -eatMami * 0.05 }
      });
      ctx.fillStyle = "#db2777";
      ctx.beginPath();
      ctx.ellipse(mamiX, mamiY - 32, 21, 15, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.ellipse(mamiX - 7, mamiY - 82, 7, 4, -0.3, 0, TAU);
      ctx.ellipse(mamiX + 7, mamiY - 82, 7, 4, 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(mamiX, mamiY - 82, 3, 0, TAU);
      ctx.fill();

      // 4. Realistischer Esstisch mit Tischläufer, Schüsseln, Ess-Animation, Brotkorb & Kerze
      ctx.fillStyle = "#291002";
      ctx.fillRect(W / 2 - 160, ty + 14, 16, 48);
      ctx.fillRect(W / 2 + 144, ty + 14, 16, 48);

      const tblG = ctx.createLinearGradient(0, ty - 14, 0, ty + 16);
      tblG.addColorStop(0, "#b45309");
      tblG.addColorStop(0.65, "#92400e");
      tblG.addColorStop(1, "#451a03");
      ctx.fillStyle = tblG;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 176, ty);
      ctx.lineTo(W / 2 - 152, ty - 14);
      ctx.lineTo(W / 2 + 152, ty - 14);
      ctx.lineTo(W / 2 + 176, ty);
      ctx.lineTo(W / 2 + 176, ty + 14);
      ctx.lineTo(W / 2 - 176, ty + 14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.moveTo(W / 2 - 44, ty);
      ctx.lineTo(W / 2 - 36, ty - 14);
      ctx.lineTo(W / 2 + 36, ty - 14);
      ctx.lineTo(W / 2 + 44, ty);
      ctx.closePath();
      ctx.fill();

      // Mamas dampfender Eintopf-Kessel in der Tischmitte
      this.drawStewPot(ctx, W / 2, ty - 14, 1.35);

      // 3 Suppenteller direkt vor Papi, Blaui und Mami
      const bowls = [
        { x: W / 2 - 86, y: ty - 4 },
        { x: W / 2 - 38, y: ty - 2 },
        { x: W / 2 + 86, y: ty - 4 }
      ];
      bowls.forEach((b) => {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 17, 6.5, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 12.5, 4.2, 0, 0, TAU);
        ctx.fill();
      });

      // Echte Ess-Animation: Löffel wandert aus dem Suppenteller mit Eintopf bis zum Mund!
      const eaters = [
        { bx: bowls[0].x, by: bowls[0].y, mx: papiX + 12, my: papiY - 46, p: eatPapi, dir: 1 },
        { bx: bowls[1].x, by: bowls[1].y, mx: blauiX,     my: blauiY - 40, p: eatBlaui, dir: 1 },
        { bx: bowls[2].x, by: bowls[2].y, mx: mamiX - 12, my: mamiY - 44, p: eatMami, dir: -1 }
      ];
      eaters.forEach((e) => {
        const sx = e.bx + (e.mx - e.bx) * e.p;
        const sy = e.by + (e.my - e.by) * e.p - Math.sin(e.p * Math.PI) * 12;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(e.dir * (-0.5 + e.p * 0.9));
        // Löffelstiel (zur Hand gerichtet)
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-e.dir * 16, 6);
        ctx.lineTo(0, 0);
        ctx.stroke();
        // Löffelkopf
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.ellipse(2 * e.dir, 0, 4.5, 2.8, 0, 0, TAU);
        ctx.fill();
        // Warmer orangefarbener Eintopf auf dem Löffel beim Hochheben
        if (e.p > 0.15) {
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.ellipse(2 * e.dir, -0.5, 3.2, 1.8, 0, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      });

      // Kleine flackernde Kerze & Brotkorb
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(W / 2 - 58, ty - 20, 6, 14);
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(W / 2 - 55, ty - 23 + Math.sin(t * 10) * 0.7, 3, 0, TAU);
      ctx.fill();

      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.ellipse(W / 2 + 58, ty - 6, 14, 7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(W / 2 + 54, ty - 10, 5, 0, TAU);
      ctx.arc(W / 2 + 62, ty - 10, 5, 0, TAU);
      ctx.fill();

      // Dampf & Herzchen
      this.steam.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.52 * (s.life / s.max)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, TAU);
        ctx.fill();
      });
      this.hearts.forEach((h) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, h.life / h.max);
        ctx.fillStyle = "#ec4899";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("❤", h.x, h.y);
        ctx.restore();
      });

      // Geraffte Vorhänge innen am Fenster
      [-1, 1].forEach((side) => {
        const cx = side < 0 ? fx : fx + fw - 38;
        ctx.fillStyle = "#9f1239";
        ctx.beginPath();
        ctx.moveTo(cx, fy);
        ctx.lineTo(cx + 38, fy);
        ctx.quadraticCurveTo(cx + (side < 0 ? 18 : 20), fy + fh * 0.5, cx + (side < 0 ? 28 : 10), fy + fh);
        ctx.lineTo(cx + (side < 0 ? 0 : 38), fy + fh);
        ctx.closePath();
        ctx.fill();
      });

      // Subtile Fensterscheiben-Spiegelung
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(fx + 40, fy);
      ctx.lineTo(fx + 110, fy);
      ctx.lineTo(fx + 50, fy + fh);
      ctx.lineTo(fx - 20, fy + fh);
      ctx.closePath();
      ctx.fill();

      ctx.restore(); // Ende Fenster-Clip

      // 5. Realistischer 3D-Holzfensterrahmen & Fensterbank
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 12;
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 4;
      ctx.strokeRect(fx - 4, fy - 4, fw + 8, fh + 8);
      // Mittelkreuz
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W / 2, fy);
      ctx.lineTo(W / 2, fy + fh);
      ctx.moveTo(fx, fy + fh * 0.44);
      ctx.lineTo(fx + fw, fy + fh * 0.44);
      ctx.stroke();
      // Fensterbank außen
      ctx.fillStyle = "#78350f";
      ctx.fillRect(fx - 14, fy + fh + 2, fw + 28, 10);

      // 6. Abschlusstext & Buttons darunter
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fde047";
      ctx.font = "800 13px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("Geschafft! Blaui, Mami und Papi genießen Mamas leckeren Eintopf.", W / 2, 308);

      this.drawButton(ctx, "again", "↻  NOCHMAL SPIELEN", W / 2 - 210, 332, 200, 38, "#4ade80", 12);
      this.drawButton(ctx, "hub", "↩  ZURÜCK ZUR OBERWELT", W / 2 + 10, 332, 210, 38, "#38bdf8", 11);
    },

    drawButton(ctx, id, label, x, y, w, h, color, size = 12) {
      this.ui.push({ id, x, y, w, h });
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${size}px Orbitron, Rajdhani, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
      ctx.restore();
    },

    drawHud(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(10, 8, 430, 30, 9);
      ctx.fill();
      ctx.stroke();

      ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "#7dd3fc";
      ctx.fillText("🔐 Finde den 4-stelligen Code für Papas Tür!", 22, 23);
      ctx.restore();

      this.drawButton(ctx, "hub", "↩ Oberwelt", W - 122, 8, 112, 30, "#38bdf8", 11);
    }
  };

  window.BLAUIS_WELT_LEVELS?.register(scene);
})();
