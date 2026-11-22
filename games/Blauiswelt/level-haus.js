(() => {
  "use strict";

  /**
   * Blauis Welt – Level "Blauis Haus" (2-stöckiges 3D-Puppenhaus)
   * ------------------------------------------------------------------
   * Querschnitt-Ansicht (fehlende Vorderwand) mit 2 Stockwerken & 4 Zimmern:
   * - Oben: Wohnzimmer (links) & Schlafzimmer (rechts)
   * - Unten: Küche (links) & Badezimmer (rechts)
   * - Zentrale Holztreppe verbindet beide Stockwerke stufenlos
   * - 10 Möbelstücke in 3D-Optik stehen durcheinander & müssen eingeräumt werden
   * - Finale: Blaui geht über die Treppe ins Bett und schläft friedlich ein
   */

  const W = 720;
  const H = 405;
  const TAU = Math.PI * 2;
  const MOVE_SPEED = 165;

  const STAIR = { x1: 332, x2: 388 }; // Treppenhaus in der Mitte

  const ROOMS = [
    { id: "wohnzimmer", name: "Wohnzimmer", x: 46, y: 88, wallBot: 162, floorBot: 222, w: 310, floorTopCol: "#b47343", floorFrontCol: "#78350f", wallCol: "#7c2d12" },
    { id: "schlafzimmer", name: "Schlafzimmer", x: 364, y: 88, wallBot: 162, floorBot: 222, w: 310, floorTopCol: "#4c3d7d", floorFrontCol: "#312e81", wallCol: "#2e1065" },
    { id: "kueche", name: "Küche", x: 46, y: 236, wallBot: 314, floorBot: 382, w: 310, floorTopCol: "#e2e8f0", floorFrontCol: "#94a3b8", wallCol: "#fef3c7" },
    { id: "bad", name: "Badezimmer", x: 364, y: 236, wallBot: 314, floorBot: 382, w: 310, floorTopCol: "#bae6fd", floorFrontCol: "#38bdf8", wallCol: "#e0f2fe" }
  ];

  // 10 Möbelstücke mit Ziel-Positionen auf den 3D-Böden
  const FURNITURE_DEFS = [
    // Wohnzimmer (oben links)
    { id: "sofa", name: "Sofa", room: "wohnzimmer", w: 62, h: 30, tx: 148, ty: 190, color: "#ec4899" },
    { id: "tv", name: "Fernseher", room: "wohnzimmer", w: 48, h: 28, tx: 256, ty: 174, color: "#38bdf8" },
    { id: "lamp", name: "Stehlampe", room: "wohnzimmer", w: 22, h: 36, tx: 78, ty: 184, color: "#fde047" },
    // Schlafzimmer (oben rechts)
    { id: "bed", name: "Blauis Bett", room: "schlafzimmer", w: 66, h: 34, tx: 598, ty: 192, color: "#60a5fa" },
    { id: "wardrobe", name: "Kleiderschrank", room: "schlafzimmer", w: 44, h: 42, tx: 454, ty: 174, color: "#c084fc" },
    // Küche (unten links)
    { id: "fridge", name: "Kühlschrank", room: "kueche", w: 30, h: 44, tx: 80, ty: 332, color: "#94a3b8" },
    { id: "stove", name: "Herd", room: "kueche", w: 38, h: 32, tx: 146, ty: 336, color: "#fb923c" },
    { id: "table", name: "Esstisch", room: "kueche", w: 58, h: 28, tx: 250, ty: 356, color: "#d97706" },
    // Badezimmer (unten rechts)
    { id: "tub", name: "Badewanne", room: "bad", w: 66, h: 30, tx: 598, ty: 354, color: "#22d3ee" },
    { id: "sink", name: "Waschbecken", room: "bad", w: 34, h: 30, tx: 458, ty: 334, color: "#7dd3fc" }
  ];

  // Start-Chaos-Plätze auf den 4 Zimmerböden
  const CHAOS_SLOTS = {
    wohnzimmer: [
      { x: 96, y: 194 },
      { x: 188, y: 204 },
      { x: 274, y: 192 }
    ],
    schlafzimmer: [
      { x: 438, y: 202 },
      { x: 528, y: 190 },
      { x: 618, y: 202 }
    ],
    kueche: [
      { x: 96, y: 356 },
      { x: 186, y: 362 },
      { x: 274, y: 348 }
    ],
    bad: [
      { x: 442, y: 358 },
      { x: 530, y: 346 },
      { x: 620, y: 358 }
    ]
  };

  const STARS = Array.from({ length: 28 }, (_, i) => ({
    x: (i * 97 + 31) % W,
    y: (i * 53 + 11) % 160,
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

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // ------------------------------------------------------------------
  // 3D-Möbelzeichnungen (Puppenhaus-Front-/Schrägansicht)
  // ------------------------------------------------------------------
  function draw3DBox(ctx, x, y, w, h, d, colFront, colTop, colSide, stroke = "#1e293b") {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    // Oberseite (3D-Tiefe)
    ctx.fillStyle = colTop;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + d * 0.6, y - d);
    ctx.lineTo(x + w + d * 0.6, y - d);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Rechte Seite
    ctx.fillStyle = colSide;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + d * 0.6, y - d);
    ctx.lineTo(x + w + d * 0.6, y + h - d);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Vorderseite
    ctx.fillStyle = colFront;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  function drawCurtainWindow(ctx, wx, wy, ww, wh, curtainCol, moon = false) {
    // Nachthimmel im Fenster
    const wg = ctx.createLinearGradient(0, wy, 0, wy + wh);
    wg.addColorStop(0, "#0b112e");
    wg.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = wg;
    ctx.fillRect(wx, wy, ww, wh);
    if (moon) {
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(wx + ww * 0.68, wy + wh * 0.34, 5.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(wx + ww * 0.25, wy + wh * 0.25, 1.8, 1.8);
      ctx.fillRect(wx + ww * 0.42, wy + wh * 0.52, 1.5, 1.5);
    }
    // Holzrahmen & Sprossen
    ctx.strokeStyle = "#fef3c7";
    ctx.lineWidth = 2.2;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    // Fensterbank
    ctx.fillStyle = "#d97706";
    ctx.fillRect(wx - 4, wy + wh, ww + 8, 4);
    // Gardinenstange
    ctx.fillStyle = "#b45309";
    ctx.fillRect(wx - 10, wy - 5, ww + 20, 3);
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(wx - 10, wy - 3.5, 2.5, 0, TAU);
    ctx.arc(wx + ww + 10, wy - 3.5, 2.5, 0, TAU);
    ctx.fill();
    // Geraffte Vorhänge links & rechts
    [-1, 1].forEach((side) => {
      const cx = side < 0 ? wx - 6 : wx + ww - 6;
      ctx.fillStyle = curtainCol;
      ctx.beginPath();
      ctx.moveTo(cx, wy - 3);
      ctx.lineTo(cx + 12, wy - 3);
      ctx.quadraticCurveTo(cx + (side < 0 ? 7 : 5), wy + wh * 0.55, cx + 11, wy + wh + 2);
      ctx.lineTo(cx + 1, wy + wh + 2);
      ctx.quadraticCurveTo(cx + (side < 0 ? 5 : 7), wy + wh * 0.55, cx, wy - 3);
      ctx.fill();
      // Faltenlinie
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 6, wy - 1);
      ctx.lineTo(cx + 6, wy + wh);
      ctx.stroke();
    });
  }

  function drawChandelier(ctx, x, y, t) {
    // Warmes Raumlicht vom Kronleuchter
    const glow = ctx.createRadialGradient(x, y + 18, 4, x, y + 26, 95);
    glow.addColorStop(0, `rgba(254, 240, 138, ${0.32 + 0.05 * Math.sin(t * 4)})`);
    glow.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y + 26, 95, 0, TAU);
    ctx.fill();

    // Kette
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 14);
    ctx.stroke();

    // Geschwungene Arme
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 1.8;
    [-18, -9, 9, 18].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(x, y + 15);
      ctx.quadraticCurveTo(x + dx * 0.6, y + 23, x + dx, y + 15);
      ctx.stroke();
      // Kerze + Flamme
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(x + dx - 1.5, y + 9, 3, 6);
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(x + dx, y + 7 + Math.sin(t * 8 + dx) * 0.5, 2.2, 0, TAU);
      ctx.fill();
    });
    // Kristalle unten
    ctx.fillStyle = "#e0f2fe";
    [-7, 0, 7].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 20);
      ctx.lineTo(x + dx - 2, y + 25);
      ctx.lineTo(x + dx, y + 28);
      ctx.lineTo(x + dx + 2, y + 25);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawFurniture3D(ctx, id, x, y, w, h, t = 0) {
    ctx.save();
    ctx.translate(x, y);

    // Weicher Kontaktschatten
    ctx.fillStyle = "rgba(15, 23, 42, 0.32)";
    ctx.beginPath();
    ctx.ellipse(2, 4, w * 0.54, 6.5, 0, 0, TAU);
    ctx.fill();

    switch (id) {
      case "sofa": {
        // Holzfüße
        ctx.fillStyle = "#451a03";
        ctx.fillRect(-w / 2 + 3, -3, 4, 4);
        ctx.fillRect(w / 2 - 7, -3, 4, 4);
        // Rückenlehne & Sitzfläche mit Polster-Verlauf
        draw3DBox(ctx, -w / 2, -28, w, 17, 6, "#be185d", "#f472b6", "#9d174d", "#831843");
        draw3DBox(ctx, -w / 2, -13, w, 11, 8, "#db2777", "#f9a8d4", "#9d174d", "#831843");
        // Polster-Trennung & Zierkissen
        ctx.strokeStyle = "#9d174d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(0, -3);
        ctx.stroke();
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.roundRect(-18, -22, 9, 9, 2);
        ctx.fill();
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.roundRect(10, -22, 9, 9, 2);
        ctx.fill();
        // Armlehnen
        draw3DBox(ctx, -w / 2 - 1, -19, 8, 17, 8, "#be185d", "#f472b6", "#831843", "#831843");
        draw3DBox(ctx, w / 2 - 7, -19, 8, 17, 8, "#be185d", "#f472b6", "#831843", "#831843");
        break;
      }
      case "tv": {
        // Holz-Lowboard mit Schubladen
        draw3DBox(ctx, -w / 2, -13, w, 13, 7, "#78350f", "#b45309", "#451a03", "#451a03");
        ctx.strokeStyle = "#451a03";
        ctx.strokeRect(-w / 2 + 3, -10, w / 2 - 5, 7);
        ctx.strokeRect(2, -10, w / 2 - 5, 7);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(-w / 4 - 2, -7, 4, 1.5);
        ctx.fillRect(w / 4 - 2, -7, 4, 1.5);
        // Standfuß & Flachbildschirm
        ctx.fillStyle = "#334155";
        ctx.fillRect(-4, -18, 8, 5);
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(-w / 2 + 3, -38, w - 6, 22, 2);
        ctx.fill();
        ctx.stroke();
        const tvG = ctx.createLinearGradient(-w / 2, -36, w / 2, -18);
        tvG.addColorStop(0, `rgba(56, 189, 248, ${0.7 + 0.2 * Math.sin(t * 3)})`);
        tvG.addColorStop(1, "rgba(168, 85, 247, 0.75)");
        ctx.fillStyle = tvG;
        ctx.fillRect(-w / 2 + 6, -35, w - 12, 16);
        // Bildschirm-Reflexion
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 6, -35);
        ctx.lineTo(-w / 2 + 18, -35);
        ctx.lineTo(-w / 2 + 10, -19);
        ctx.lineTo(-w / 2 + 6, -19);
        ctx.fill();
        break;
      }
      case "lamp": {
        const lg = ctx.createRadialGradient(0, -28, 2, 0, -28, 30);
        lg.addColorStop(0, "rgba(254, 240, 138, 0.6)");
        lg.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(0, -28, 30, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 3.5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#eab308";
        ctx.fillRect(-1.8, -24, 3.6, 24);
        const sg = ctx.createLinearGradient(-10, -37, 10, -22);
        sg.addColorStop(0, "#fef9c3");
        sg.addColorStop(1, "#facc15");
        ctx.fillStyle = sg;
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(-7, -37);
        ctx.lineTo(7, -37);
        ctx.lineTo(12, -22);
        ctx.lineTo(-12, -22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "bed": {
        // Fuß- und Kopfteil
        draw3DBox(ctx, w / 2 - 7, -29, 7, 29, 9, "#78350f", "#b45309", "#451a03", "#451a03");
        draw3DBox(ctx, -w / 2, -19, 5, 19, 9, "#78350f", "#b45309", "#451a03", "#451a03");
        // Bettkasten + Matratze
        draw3DBox(ctx, -w / 2 + 4, -14, w - 10, 14, 10, "#92400e", "#f8fafc", "#78350f", "#451a03");
        // Kuscheldecke
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 4, -14);
        ctx.lineTo(-w / 2 + 10, -24);
        ctx.lineTo(w / 2 - 18, -24);
        ctx.lineTo(w / 2 - 24, -14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(-w / 2 + 4, -14, w - 28, 6);
        // Kissen
        ctx.fillStyle = "#fff6dc";
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(w / 2 - 21, -22, 11, 7, 2.5);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case "wardrobe": {
        draw3DBox(ctx, -w / 2, -42, w, 42, 8, "#92400e", "#b45309", "#78350f", "#451a03");
        // Kranzleiste oben
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-w / 2 - 2, -44, w + 4, 3);
        // Türpaneele
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2 + 4, -38, w / 2 - 6, 32);
        ctx.strokeRect(2, -38, w / 2 - 6, 32);
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(-3, -22, 1.8, 0, TAU);
        ctx.arc(3, -22, 1.8, 0, TAU);
        ctx.fill();
        break;
      }
      case "fridge": {
        draw3DBox(ctx, -w / 2, -44, w, 44, 7, "#e2e8f0", "#ffffff", "#cbd5e1", "#475569");
        ctx.strokeStyle = "#94a3b8";
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 2, -26);
        ctx.lineTo(w / 2 - 2, -26);
        ctx.stroke();
        // Chromgriffe & bunte Magnete
        ctx.fillStyle = "#64748b";
        ctx.fillRect(w / 2 - 6, -37, 2.5, 7);
        ctx.fillRect(w / 2 - 6, -21, 2.5, 11);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-w / 2 + 5, -36, 3, 3);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-w / 2 + 10, -33, 3, 3);
        break;
      }
      case "stove": {
        draw3DBox(ctx, -w / 2, -25, w, 25, 8, "#e2e8f0", "#f8fafc", "#cbd5e1", "#334155");
        // Drehknöpfe
        ctx.fillStyle = "#334155";
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(-11 + i * 7.5, -21.5, 1.5, 0, TAU);
          ctx.fill();
        }
        // Backofen-Glastür mit warmem Licht
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-w / 2 + 5, -18, w - 10, 14);
        ctx.fillStyle = "rgba(251, 146, 60, 0.65)";
        ctx.fillRect(-w / 2 + 7, -16, w - 14, 10);
        // Kochplatten
        ctx.fillStyle = "#0f172a";
        [[-6, -29], [8, -29]].forEach(([px, py]) => {
          ctx.beginPath();
          ctx.ellipse(px, py, 4.5, 2.2, 0, 0, TAU);
          ctx.fill();
        });
        break;
      }
      case "table": {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-w / 2 + 4, -15, 4, 15);
        ctx.fillRect(w / 2 - 8, -15, 4, 15);
        draw3DBox(ctx, -w / 2, -19, w, 5, 10, "#b45309", "#d97706", "#78350f", "#451a03");
        // Tischläufer & Blumenvase
        ctx.fillStyle = "#f472b6";
        ctx.fillRect(-7, -28, 14, 9);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-2.5, -34, 5, 7);
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(0, -36, 3, 0, TAU);
        ctx.fill();
        // Teller
        ctx.fillStyle = "#ffffff";
        [-15, 16].forEach((px) => {
          ctx.beginPath();
          ctx.ellipse(px, -23, 5.5, 2.5, 0, 0, TAU);
          ctx.fill();
        });
        break;
      }
      case "tub": {
        draw3DBox(ctx, -w / 2, -17, w, 17, 10, "#f8fafc", "#7dd3fc", "#cbd5e1", "#64748b");
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        [[-15, -23, 3.4], [-3, -21, 2.6], [11, -24, 3.6]].forEach(([bx, by, br]) => {
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, TAU);
          ctx.fill();
        });
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(w / 2 - 9, -26, 4, 9);
        break;
      }
      case "sink": {
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(-5, -16, 10, 16);
        draw3DBox(ctx, -w / 2, -23, w, 8, 7, "#ffffff", "#bae6fd", "#cbd5e1", "#475569");
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(-2, -31, 4, 7);
        break;
      }
    }

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // Szene "Blauis Haus"
  // ------------------------------------------------------------------
  const scene = {
    id: "haus",
    name: "Blauis Haus",
    subtitle: "Puppenhaus aufräumen",
    custom: true,

    state: "playing", // playing | bedtime | sleeping | won
    clock: 0,
    elapsed: 0,
    items: [],
    carrying: null,
    placedCount: 0,
    player: { x: 200, y: 205, vx: 0, vy: 0, facing: 1, cycle: 0 },
    particles: [],
    floatingTexts: [],
    zzz: [],
    sleepTimer: 0,
    dimAlpha: 0,
    bedPath: [],
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
      this.elapsed = 0;
      this.carrying = null;
      this.placedCount = 0;
      this.particles = [];
      this.floatingTexts = [];
      this.zzz = [];
      this.sleepTimer = 0;
      this.dimAlpha = 0;

      this.player = { x: 185, y: 356, vx: 0, vy: 0, facing: 1, cycle: 0 };

      const allSlots = [];
      Object.entries(CHAOS_SLOTS).forEach(([roomId, slots]) => {
        slots.forEach((s) => allSlots.push({ roomId, x: s.x, y: s.y }));
      });
      const pool = shuffle(allSlots);

      this.items = FURNITURE_DEFS.map((def) => {
        const idx = pool.findIndex((sl) => sl.roomId !== def.room);
        const slot = pool.splice(idx >= 0 ? idx : 0, 1)[0];
        return { ...def, x: slot.x, y: slot.y, placed: false };
      });

      this.addFloatingText(this.player.x, this.player.y - 52, "Räume das Puppenhaus auf! 🏠", "#fef08a");
    },

    spawnParticles(x, y, color, count = 12, spread = 110) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const sp = 25 + Math.random() * spread;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 20,
          life: 0.45 + Math.random() * 0.4,
          max: 0.85,
          color,
          r: 2 + Math.random() * 2.2
        });
      }
    },

    addFloatingText(x, y, text, color = "#fef08a") {
      this.floatingTexts.push({ x, y, vy: -22, text, color, life: 1.9, max: 1.9 });
    },

    toHub() {
      this.game?.returnToHub?.("haus");
    },

    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "backspace") {
        e.preventDefault?.();
        this.toHub();
      } else if (this.state === "won" && k === "r") {
        this.resetLevel();
      }
    },

    onPointer(x, y) {
      for (let i = this.ui.length - 1; i >= 0; i--) {
        const b = this.ui[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          if (b.id === "hub") this.toHub();
          else if (b.id === "again") this.resetLevel();
          return;
        }
      }
    },

    moveInDollhouse(dx, dy) {
      const p = this.player;
      const onStairs = p.x >= STAIR.x1 && p.x <= STAIR.x2;
      const nx = clamp(p.x + dx, 56, W - 56);
      let ny = p.y + dy;

      if (onStairs) {
        ny = clamp(ny, 168, 380);
      } else if (p.y < 230) {
        ny = clamp(ny, 168, 220);
      } else {
        ny = clamp(ny, 320, 380);
      }

      const nextOnStairs = nx >= STAIR.x1 && nx <= STAIR.x2;
      if (onStairs && !nextOnStairs) {
        const validTop = ny >= 168 && ny <= 220;
        const validBot = ny >= 320 && ny <= 380;
        if (validTop || validBot) p.x = nx;
      } else {
        p.x = nx;
      }
      p.y = ny;
    },

    nearestPickable() {
      let best = null;
      let bestD = 48;
      for (const it of this.items) {
        if (it.placed) continue;
        const d = Math.hypot(this.player.x - it.x, this.player.y - it.y);
        if (d < bestD) {
          bestD = d;
          best = it;
        }
      }
      return best;
    },

    handleAction() {
      if (this.state !== "playing") return;
      const p = this.player;

      if (!this.carrying) {
        const target = this.nearestPickable();
        if (target) {
          this.carrying = target;
          this.spawnParticles(target.x, target.y - 12, target.color, 8, 70);
        }
        return;
      }

      const it = this.carrying;
      const distToGoal = Math.hypot(p.x - it.tx, p.y - it.ty);

      if (distToGoal < 50) {
        it.x = it.tx;
        it.y = it.ty;
        it.placed = true;
        this.carrying = null;
        this.placedCount += 1;

        this.spawnParticles(it.tx, it.ty - 12, "#fde047", 18, 130);
        this.spawnParticles(it.tx, it.ty - 12, it.color, 10, 100);
        this.addFloatingText(it.tx, it.ty - 34, `★ ${it.name} eingeräumt!`, "#4ade80");

        if (this.placedCount >= this.items.length) {
          this.startBedtime();
        }
      } else {
        if (p.y > 220 && p.y < 320) {
          this.addFloatingText(p.x, p.y - 44, "Nicht auf der Treppe abstellen!", "#fca5a5");
          return;
        }
        it.x = clamp(p.x, 66, W - 66);
        it.y = p.y;
        this.carrying = null;
      }
    },

    startBedtime() {
      this.state = "bedtime";
      this.addFloatingText(this.player.x, this.player.y - 48, "🎉 Alles aufgeräumt! Ab ins Bett!", "#fde047");
      const bed = this.items.find((i) => i.id === "bed");
      const pts = [];
      if (this.player.y > 230) {
        pts.push({ x: 360, y: 350 }, { x: 360, y: 194 });
      }
      pts.push({ x: bed.tx - 32, y: bed.ty + 4 }, { x: bed.tx, y: bed.ty });
      this.bedPath = pts;
    },

    update(dt, game, action) {
      this.clock += dt;

      this.particles = this.particles.filter((pt) => {
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        return pt.life > 0;
      });
      this.floatingTexts = this.floatingTexts.filter((ft) => {
        ft.life -= dt;
        ft.y += ft.vy * dt;
        return ft.life > 0;
      });
      this.zzz = this.zzz.filter((z) => {
        z.life -= dt;
        z.y -= 18 * dt;
        z.x += Math.sin(this.clock * 3 + z.ph) * 8 * dt;
        return z.life > 0;
      });

      if (this.state === "won") {
        if (action) this.resetLevel();
        return;
      }

      if (this.state === "bedtime") {
        const p = this.player;
        const target = this.bedPath[0];
        if (!target) {
          this.state = "sleeping";
          this.sleepTimer = 0;
          return;
        }
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 6) {
          this.bedPath.shift();
        } else {
          const sp = 145;
          p.x += (dx / d) * sp * dt;
          p.y += (dy / d) * sp * dt;
          if (Math.abs(dx) > 5) p.facing = dx > 0 ? 1 : -1;
          p.cycle += dt * 11;
        }
        return;
      }

      if (this.state === "sleeping") {
        this.sleepTimer += dt;
        this.dimAlpha = Math.min(0.45, this.sleepTimer * 0.28);
        if (Math.random() < dt * 2.4) {
          const bed = this.items.find((i) => i.id === "bed");
          this.zzz.push({ x: bed.tx + 10, y: bed.ty - 32, life: 1.6, max: 1.6, ph: Math.random() * TAU });
        }
        if (this.sleepTimer >= 2.6) {
          this.state = "won";
        }
        return;
      }

      this.elapsed += dt;
      if (action) this.handleAction();

      const p = this.player;
      const inp = game.input || {};
      let dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      let dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      const k = Math.min(1, 14 * dt);
      p.vx += (dx * MOVE_SPEED - p.vx) * k;
      p.vy += (dy * MOVE_SPEED - p.vy) * k;
      this.moveInDollhouse(p.vx * dt, p.vy * dt);

      if (Math.abs(p.vx) > 8) p.facing = p.vx > 0 ? 1 : -1;
      if (Math.hypot(p.vx, p.vy) > 12) p.cycle += dt * 11;
    },

    draw(ctx, t) {
      this.ui = [];

      // 1. Abendhimmel & Garten hinter dem Puppenhaus
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0b112e");
      sky.addColorStop(0.7, "#1e295b");
      sky.addColorStop(1, "#14532d");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      STARS.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.55 * Math.abs(Math.sin(t * 1.5 + s.ph))})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();
      });

      [[22, 376], [24, 392], [696, 378], [698, 394]].forEach(([bx, by]) => {
        ctx.fillStyle = "#166534";
        ctx.beginPath();
        ctx.arc(bx, by, 18, 0, TAU);
        ctx.fill();
      });

      this.drawRoofAndShell(ctx, t);
      this.drawRooms(ctx, t);
      this.drawSilhouettes(ctx, t);

      const drawList = this.items
        .filter((it) => it !== this.carrying)
        .map((it) => ({ kind: "item", y: it.y, it }));

      if (this.state !== "sleeping" && this.state !== "won") {
        drawList.push({ kind: "blaui", y: this.player.y });
      }
      drawList.sort((a, b) => a.y - b.y);

      drawList.forEach((entry) => {
        if (entry.kind === "item") {
          const it = entry.it;
          drawFurniture3D(ctx, it.id, it.x, it.y, it.w, it.h, t);
        } else {
          const p = this.player;
          const moving = Math.hypot(p.vx, p.vy) > 12 || this.state === "bedtime";
          const pose = this.carrying ? { armL: 2.5, armR: 2.5 } : null;
          window.BLAUI_DRAW?.(ctx, p.x, p.y, { facing: p.facing, cycle: p.cycle, moving, t, scale: 0.72, pose });
          if (this.carrying) {
            ctx.save();
            ctx.translate(p.x, p.y - 36);
            ctx.scale(0.68, 0.68);
            drawFurniture3D(ctx, this.carrying.id, 0, 0, this.carrying.w, this.carrying.h, t);
            ctx.restore();
          }
        }
      });

      if (this.state === "sleeping" || this.state === "won") {
        this.drawSleepingBlaui(ctx);
      }

      this.zzz.forEach((z) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, z.life / z.max);
        ctx.font = "900 14px Orbitron, sans-serif";
        ctx.fillStyle = "#fde047";
        ctx.fillText("Z", z.x, z.y);
        ctx.restore();
      });

      this.particles.forEach((pt) => {
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, TAU);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      this.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / 0.5);
        ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      if (this.dimAlpha > 0) {
        ctx.fillStyle = `rgba(10, 14, 38, ${this.dimAlpha})`;
        ctx.fillRect(0, 40, W, H - 40);
      }

      this.drawPrompt(ctx);
      this.drawHud(ctx);

      if (this.state === "won") {
        this.drawVictory(ctx);
      }
    },

    drawRoofAndShell(ctx, t) {
      // Schornstein mit Backstein-Optik & Rauch
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(540, 44, 26, 36);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(537, 42, 32, 5);
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.35 + i / 4) % 1;
        ctx.fillStyle = `rgba(226, 232, 240, ${0.45 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(553 + Math.sin(k * 6 + i) * 5, 40 - k * 24, 3 + k * 5, 0, TAU);
        ctx.fill();
      }

      // Dach mit Ziegelreihen
      const rg = ctx.createLinearGradient(0, 40, 0, 88);
      rg.addColorStop(0, "#b91c1c");
      rg.addColorStop(1, "#7f1d1d");
      ctx.fillStyle = rg;
      ctx.strokeStyle = "#450a0a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(22, 88);
      ctx.lineTo(360, 40);
      ctx.lineTo(698, 88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dachziegel-Linien
      ctx.strokeStyle = "rgba(69, 10, 10, 0.35)";
      ctx.lineWidth = 1.2;
      for (let row = 1; row <= 3; row++) {
        const y = 40 + row * 12;
        const span = row * 82;
        ctx.beginPath();
        ctx.moveTo(360 - span, y);
        ctx.lineTo(360 + span, y);
        ctx.stroke();
      }

      // Dachfenster
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(360, 66, 9, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Puppenhaus-Holzrahmen + Seitenwände mit 3D-Schatten
      ctx.fillStyle = "#451a03";
      ctx.fillRect(38, 86, 644, 304);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(34, 86, 6, 304);
      ctx.fillRect(680, 86, 6, 304);
    },

    drawRooms(ctx, t) {
      ROOMS.forEach((r) => {
        // Rückwand mit sanftem Lichtverlauf
        const wg = ctx.createLinearGradient(0, r.y, 0, r.wallBot);
        wg.addColorStop(0, r.wallCol);
        wg.addColorStop(1, "rgba(0,0,0,0.18)");
        ctx.fillStyle = r.wallCol;
        ctx.fillRect(r.x, r.y, r.w, r.wallBot - r.y);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(r.x, r.y, r.w, 8);
        // Fußleiste
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.fillRect(r.x, r.wallBot - 4, r.w, 4);

        if (r.id === "wohnzimmer") {
          // Tapetenstreifen
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          for (let x = r.x; x < r.x + r.w; x += 24) ctx.fillRect(x, r.y, 12, r.wallBot - r.y);
          // Großes Fenster mit Vorhängen
          drawCurtainWindow(ctx, r.x + 122, r.y + 16, 64, 40, "#db2777", true);
          // Unbewegliches Bücherregal links mit bunten Büchern
          ctx.fillStyle = "#78350f";
          ctx.fillRect(r.x + 18, r.y + 22, 42, 48);
          ctx.fillStyle = "#451a03";
          ctx.fillRect(r.x + 21, r.y + 25, 36, 18);
          ctx.fillRect(r.x + 21, r.y + 47, 36, 18);
          ["#ef4444", "#fde047", "#38bdf8", "#22c55e", "#f472b6"].forEach((bc, i) => {
            ctx.fillStyle = bc;
            ctx.fillRect(r.x + 23 + i * 6.5, r.y + 29, 5, 13);
            ctx.fillRect(r.x + 23 + i * 6.5, r.y + 51, 5, 13);
          });
          // Kamin rechts hinten mit warmem Feuer
          ctx.fillStyle = "#94a3b8";
          ctx.fillRect(r.x + 226, r.wallBot - 38, 44, 38);
          ctx.fillStyle = "#475569";
          ctx.fillRect(r.x + 222, r.wallBot - 41, 52, 5);
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(r.x + 248, r.wallBot, 12, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = `rgba(251, 146, 60, ${0.75 + 0.25 * Math.sin(t * 9)})`;
          ctx.beginPath();
          ctx.arc(r.x + 248, r.wallBot - 3, 6, Math.PI, 0);
          ctx.fill();
          // Kronleuchter an der Decke
          drawChandelier(ctx, r.x + 154, r.y + 2, t);
        } else if (r.id === "schlafzimmer") {
          // Fenster mit blauen Vorhängen & Mond
          drawCurtainWindow(ctx, r.x + 128, r.y + 16, 56, 38, "#60a5fa", true);
          // Lichterkette
          ctx.strokeStyle = "rgba(253, 224, 71, 0.45)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(r.x + 16, r.y + 10);
          ctx.quadraticCurveTo(r.x + 155, r.y + 24, r.x + 294, r.y + 10);
          ctx.stroke();
          for (let i = 0; i < 8; i++) {
            const lx = r.x + 28 + i * 36;
            const ly = r.y + 13 + Math.sin((i / 7) * Math.PI) * 6;
            ctx.fillStyle = i % 2 ? "#fde047" : "#f472b6";
            ctx.beginPath();
            ctx.arc(lx, ly, 2.8, 0, TAU);
            ctx.fill();
          }
          // Wandregal mit Teddybär & Büchern
          ctx.fillStyle = "#92400e";
          ctx.fillRect(r.x + 224, r.y + 34, 48, 4);
          ctx.fillStyle = "#d97706";
          ctx.beginPath();
          ctx.arc(r.x + 240, r.y + 28, 5.5, 0, TAU);
          ctx.arc(r.x + 240, r.y + 21, 4.2, 0, TAU);
          ctx.fill();
          // Kleiner unbeweglicher Nachttisch mit Lampe
          draw3DBox(ctx, r.x + 258, r.wallBot - 16, 18, 16, 5, "#78350f", "#b45309", "#451a03", "#451a03");
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(r.x + 267, r.wallBot - 22, 5, Math.PI, 0);
          ctx.fill();
        } else if (r.id === "kueche") {
          // Fliesen-Rückwand
          ctx.strokeStyle = "rgba(180, 140, 90, 0.25)";
          ctx.lineWidth = 1;
          for (let x = r.x; x < r.x + r.w; x += 18) {
            ctx.beginPath();
            ctx.moveTo(x, r.y + 38);
            ctx.lineTo(x, r.wallBot);
            ctx.stroke();
          }
          // Küchenfenster mit gelben Vorhängen
          drawCurtainWindow(ctx, r.x + 114, r.y + 14, 58, 34, "#fb923c", false);
          // Hängeschrank & Gewürzregal
          draw3DBox(ctx, r.x + 24, r.y + 14, 52, 24, 4, "#b45309", "#d97706", "#78350f", "#451a03");
          ctx.fillStyle = "#92400e";
          ctx.fillRect(r.x + 200, r.y + 34, 72, 5);
          ["#ef4444", "#22c55e", "#f59e0b"].forEach((c, idx) => {
            ctx.fillStyle = c;
            ctx.fillRect(r.x + 208 + idx * 18, r.y + 22, 10, 12);
          });
          // Unbewegliche Küchen-Arbeitsplatte mit Kaffeemaschine & Obstschale
          draw3DBox(ctx, r.x + 196, r.wallBot - 22, 78, 22, 6, "#cbd5e1", "#f8fafc", "#94a3b8", "#475569");
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(r.x + 210, r.wallBot - 34, 14, 12);
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(r.x + 250, r.wallBot - 26, 4, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(r.x + 256, r.wallBot - 26, 3.5, 0, TAU);
          ctx.fill();
        } else if (r.id === "bad") {
          // Kachel-Rückwand
          ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
          ctx.lineWidth = 1;
          for (let x = r.x; x < r.x + r.w; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, r.y);
            ctx.lineTo(x, r.wallBot);
            ctx.stroke();
          }
          // Großer beleuchteter Spiegel
          ctx.fillStyle = "#bae6fd";
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(r.x + 94, r.y + 34, 16, 20, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
          // Kleines Badfenster mit Vorhang
          drawCurtainWindow(ctx, r.x + 150, r.y + 14, 42, 30, "#38bdf8", false);
          // Handtuchhalter & Duschkopf
          ctx.fillStyle = "#f472b6";
          ctx.fillRect(r.x + 214, r.y + 32, 22, 24);
          ctx.fillStyle = "#475569";
          ctx.fillRect(r.x + 210, r.y + 30, 30, 3);
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(r.x + 276, r.wallBot);
          ctx.lineTo(r.x + 276, r.y + 18);
          ctx.lineTo(r.x + 262, r.y + 22);
          ctx.stroke();
        }

        // 3D-Bodenfläche
        ctx.fillStyle = r.floorTopCol;
        ctx.fillRect(r.x, r.wallBot, r.w, r.floorBot - r.wallBot);

        if (r.id === "wohnzimmer") {
          // Holzdielen + Fransen-Teppich
          ctx.strokeStyle = "rgba(69, 26, 3, 0.25)";
          ctx.lineWidth = 1;
          for (let y = r.wallBot + 14; y < r.floorBot; y += 14) {
            ctx.beginPath();
            ctx.moveTo(r.x, y);
            ctx.lineTo(r.x + r.w, y);
            ctx.stroke();
          }
          ctx.fillStyle = "#be185d";
          ctx.strokeStyle = "#fbcfe8";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(r.x + 82, r.wallBot + 14, 142, 38, 10);
          ctx.fill();
          ctx.stroke();
        } else if (r.id === "schlafzimmer") {
          ctx.fillStyle = "rgba(125, 211, 252, 0.35)";
          ctx.beginPath();
          ctx.ellipse(r.x + 170, r.wallBot + 34, 66, 19, 0, 0, TAU);
          ctx.fill();
        } else if (r.id === "kueche") {
          ctx.fillStyle = "#cbd5e1";
          for (let x = r.x; x < r.x + r.w; x += 22) {
            if ((Math.floor(x / 22) & 1) === 0) ctx.fillRect(x, r.wallBot, 22, 34);
            else ctx.fillRect(x, r.wallBot + 34, 22, 34);
          }
        } else if (r.id === "bad") {
          ctx.fillStyle = "#f472b6";
          ctx.beginPath();
          ctx.roundRect(r.x + 190, r.wallBot + 32, 64, 22, 6);
          ctx.fill();
          // Kleine gelbe Quietscheente
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(r.x + 162, r.wallBot + 42, 4, 0, TAU);
          ctx.arc(r.x + 165, r.wallBot + 38, 2.8, 0, TAU);
          ctx.fill();
        }

        // 3D-Bodenkante (Querschnitt)
        ctx.fillStyle = r.floorFrontCol;
        ctx.fillRect(r.x, r.floorBot, r.w, 8);

        // Zimmer-Schildchen
        ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
        ctx.beginPath();
        ctx.roundRect(r.x + 8, r.y + 6, 86, 16, 5);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 9px Orbitron, Rajdhani, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(r.name.toUpperCase(), r.x + 14, r.y + 17);
      });

      // Zentrale 3D-Holztreppe mit Läufer, Geländer & Wandlaterne
      const sw = STAIR.x2 - STAIR.x1;
      // Rückwand des Treppenhauses mit Tiefenschatten
      const stWall = ctx.createLinearGradient(STAIR.x1, 0, STAIR.x2, 0);
      stWall.addColorStop(0, "#291002");
      stWall.addColorStop(0.5, "#5c260a");
      stWall.addColorStop(1, "#291002");
      ctx.fillStyle = stWall;
      ctx.fillRect(STAIR.x1, 152, sw, 232);

      // Kleine leuchtende Wandlaterne im Treppenhaus
      const lg = ctx.createRadialGradient(360, 148, 2, 360, 148, 32);
      lg.addColorStop(0, "rgba(254, 240, 138, 0.45)");
      lg.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(360, 148, 32, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(360, 146, 3.5, 0, TAU);
      ctx.fill();

      // 3D-Treppenstufen (von oben nach unten perspektivisch gestaffelt)
      const steps = 13;
      const topY = 166;
      const botY = 374;
      const stepH = (botY - topY) / steps;
      for (let i = 0; i < steps; i++) {
        const sy = topY + i * stepH;
        const inset = (steps - 1 - i) * 0.45;
        const sx = STAIR.x1 + 5 + inset;
        const wStep = sw - 10 - inset * 2;
        // Trittfläche (3D-Tiefe nach hinten)
        ctx.fillStyle = "#d97706";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 4, sy - 5);
        ctx.lineTo(sx + wStep - 4, sy - 5);
        ctx.lineTo(sx + wStep, sy);
        ctx.closePath();
        ctx.fill();
        // Roter Treppenläufer auf der Trittfläche
        ctx.fillStyle = "#be185d";
        ctx.beginPath();
        ctx.moveTo(sx + wStep * 0.25, sy);
        ctx.lineTo(sx + wStep * 0.28, sy - 5);
        ctx.lineTo(sx + wStep * 0.72, sy - 5);
        ctx.lineTo(sx + wStep * 0.75, sy);
        ctx.closePath();
        ctx.fill();
        // Setzstufe (Vorderkante)
        ctx.fillStyle = "#92400e";
        ctx.fillRect(sx, sy, wStep, stepH * 0.52);
        ctx.fillStyle = "#451a03";
        ctx.fillRect(sx, sy + stepH * 0.52, wStep, 2);
        // Läufer auf der Setzstufe
        ctx.fillStyle = "#9d174d";
        ctx.fillRect(sx + wStep * 0.25, sy, wStep * 0.5, stepH * 0.52);
      }

      // 3D-Holzgeländer links & rechts mit Pfosten & Knäufen
      [STAIR.x1 + 3, STAIR.x2 - 5].forEach((gx) => {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(gx, 152, 3, 232);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(gx + 0.5, 152, 1, 232);
        // Pfostenköpfe oben & unten
        [150, 380].forEach((py) => {
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.arc(gx + 1.5, py, 4, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });
    },

    drawSilhouettes(ctx, t) {
      this.items.forEach((it) => {
        if (it.placed) return;
        const isTarget = this.carrying === it;
        const pulse = isTarget ? 0.65 + 0.35 * Math.sin(t * 7) : 0.45;

        ctx.save();
        ctx.translate(it.tx, it.ty);
        ctx.fillStyle = isTarget ? `rgba(253, 224, 71, ${0.28 * pulse})` : "rgba(15, 23, 42, 0.22)";
        ctx.strokeStyle = isTarget ? "#fde047" : "rgba(255, 255, 255, 0.65)";
        ctx.lineWidth = isTarget ? 2.4 : 1.4;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.ellipse(0, 0, it.w * 0.48, 11, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = isTarget ? "#fde047" : "#ffffff";
        ctx.font = "800 9px Rajdhani, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.name, 0, 0);
        ctx.restore();
      });
    },

    drawSleepingBlaui(ctx) {
      const bed = this.items.find((i) => i.id === "bed");
      if (!bed) return;
      ctx.save();
      ctx.translate(bed.tx + 12, bed.ty - 19);
      ctx.fillStyle = "#8fd3f4";
      ctx.strokeStyle = "#5db5e0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#d81b86";
      ctx.beginPath();
      ctx.arc(-1, 2, 2.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      [-4, 4].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex, -2, 2.1, 0, Math.PI);
        ctx.stroke();
      });
      ctx.restore();
    },

    drawPrompt(ctx) {
      if (this.state !== "playing") return;
      const p = this.player;
      let txt = null;
      let col = "#38bdf8";

      if (this.carrying) {
        const d = Math.hypot(p.x - this.carrying.tx, p.y - this.carrying.ty);
        if (d < 50) {
          txt = "✓ Abstellen (Aktion)";
          col = "#4ade80";
        }
      } else {
        const near = this.nearestPickable();
        if (near) {
          txt = `${near.name} aufheben`;
          col = "#fde047";
        }
      }
      if (!txt) return;

      ctx.save();
      ctx.font = "800 10px Orbitron, Rajdhani, sans-serif";
      const w = ctx.measureText(txt).width + 16;
      const x = clamp(p.x, w / 2 + 6, W - w / 2 - 6);
      const y = Math.max(50, p.y - (this.carrying ? 72 : 44));
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - 9, w, 18, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(txt, x, y);
      ctx.restore();
    },

    drawButton(ctx, id, label, x, y, w, h, color, size = 11) {
      this.ui.push({ id, x, y, w, h });
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 9);
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
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(251, 146, 60, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(12, 6, 566, 30, 9);
      ctx.fill();
      ctx.stroke();

      ctx.font = "800 12px Orbitron, Rajdhani, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "#fb923c";
      ctx.fillText(`🏠 Möbel: ${this.placedCount} / ${this.items.length}`, 24, 21);

      ctx.fillStyle = this.carrying ? "#fde047" : "#cbd5e1";
      ctx.font = "700 12px Rajdhani, sans-serif";
      const hint = this.carrying
        ? `Trägt: ${this.carrying.name} → ins ${ROOMS.find((r) => r.id === this.carrying.room)?.name}`
        : "Aktion (Leertaste/Enter): Aufheben · Treppe in der Mitte";
      ctx.fillText(hint, 178, 21);
      ctx.restore();

      this.drawButton(ctx, "hub", "↩ Oberwelt", W - 124, 6, 112, 30, "#fb923c", 11);
    },

    drawVictory(ctx) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 14, 38, 0.72)";
      ctx.fillRect(0, 0, W, H);

      const px = 160;
      const py = 74;
      const pw = 400;
      const ph = 256;

      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(30, 41, 82, 0.96)");
      g.addColorStop(1, "rgba(15, 23, 42, 0.96)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fde047";
      ctx.font = "900 19px Orbitron, Rajdhani, sans-serif";
      ctx.fillText("🌙 GUTE NACHT, BLAUI!", W / 2, py + 42);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 14px Rajdhani, sans-serif";
      ctx.fillText("Alles perfekt aufgeräumt.", W / 2, py + 78);
      ctx.fillStyle = "#bae6fd";
      ctx.fillText(`Aufräum-Zeit: ${fmtTime(this.elapsed)}`, W / 2, py + 106);

      this.drawButton(ctx, "again", "↻  NOCHMAL AUFRÄUMEN", px + 40, py + 146, pw - 80, 38, "#4ade80", 12);
      this.drawButton(ctx, "hub", "↩  ZURÜCK ZUR OBERWELT", px + 40, py + 194, pw - 80, 34, "#38bdf8", 12);
      ctx.restore();
    }
  };

  window.BLAUIS_WELT_LEVELS?.register(scene);
})();
