(() => {
  "use strict";

  const W = 720;
  const H = 405;
  const TAU = Math.PI * 2;

  function rng(seed) {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PORTALS = [
    {
      id: "bambus", levelId: "bambus", name: "Bambus Wald", x: 105, y: 305, rx: 28, ry: 38,
      color: "#4ade80", dark: "#14532d", icon: "🎋",
      text: "Ein ruhiger Bambushain voller Rätsel und Waldlicht wartet auf Blaui."
    },
    {
      id: "disco", levelId: "disco", name: "Disco Raum", x: 105, y: 142, rx: 28, ry: 38,
      color: "#e879f9", dark: "#581c87", icon: "🪩",
      text: "Neonlichter, Discokugel und eine Tanzfläche voller Überraschungen."
    },
    {
      id: "wolken", levelId: "wolken", name: "Wolken Reich", x: 615, y: 142, rx: 28, ry: 38,
      color: "#fcd34d", dark: "#92400e", icon: "☁️",
      text: "Hoch oben auf flauschigen Wolken, zwischen Sternen und Regenbogen."
    },
    {
      id: "haus", levelId: "haus", name: "Blauis Haus", x: 615, y: 305, rx: 28, ry: 38, shape: "arch",
      color: "#fb923c", dark: "#7c2d12", icon: "🏡",
      text: "Gemütlich, warm und einladend – Blauis kuscheliges Zuhause."
    },
    {
      id: "heimat", levelId: "heimat", name: "Blauis Heimat", x: 360, y: 318, rx: 30, ry: 38,
      color: "#7dd3fc", dark: "#0c4a6e", icon: "❄️",
      text: "Eine magische Schnee- und Plüschwelt, in der Blaui zu Hause ist."
    },
    {
      id: "mama", levelId: "mama", name: "Mamas Haus", x: 282, y: 112, rx: 24, ry: 30, shape: "arch",
      color: "#f472b6", dark: "#831843", icon: "💐",
      text: "Ein liebevolles Haus voller Blumen, Kuchen und gemütlicher Wärme."
    },
    {
      id: "papa", levelId: "papa", name: "Haus von Papa", x: 438, y: 112, rx: 24, ry: 30, shape: "arch",
      color: "#38bdf8", dark: "#0c4a6e", icon: "🛠️",
      text: "Papas gemütliche Hütte mit Werkstatt, Kaffee und Bastel-Spaß."
    }
  ];

  const P = Object.fromEntries(PORTALS.map((p) => [p.id, p]));
  const PLAZA = { x: 360, y: 205 };

  // ---------- Deko-Daten (deterministisch, flackerfrei) ----------
  const r1 = rng(42);
  const STARS = Array.from({ length: 46 }, () => ({ x: r1() * W, y: r1() * 92, s: 0.6 + r1() * 1.4, ph: r1() * TAU }));
  const FLAKES = Array.from({ length: 26 }, () => ({ x: r1(), y: r1(), s: 1 + r1() * 1.8, sp: 0.05 + r1() * 0.08, ph: r1() * TAU }));
  const FIREFLIES = Array.from({ length: 12 }, () => ({ x: r1(), y: r1(), ph: r1() * TAU, sp: 0.4 + r1() * 0.6 }));
  const FLOWERS = Array.from({ length: 9 }, (_, i) => ({ dx: -64 + i * 16 + r1() * 6, dy: 6 + r1() * 10, c: ["#f472b6", "#fde047", "#f87171", "#c084fc"][i % 4], ph: r1() * TAU }));

  // ---------- Hilfsfunktionen ----------
  function shapePath(ctx, p, grow = 0) {
    ctx.beginPath();
    if (p.shape === "arch") {
      const rx = p.rx + grow;
      const top = p.y - p.ry - grow + p.rx;
      ctx.moveTo(p.x - rx, p.y + p.ry + grow);
      ctx.lineTo(p.x - rx, top);
      ctx.arc(p.x, top, rx, Math.PI, 0);
      ctx.lineTo(p.x + rx, p.y + p.ry + grow);
      ctx.closePath();
    } else {
      ctx.ellipse(p.x, p.y, p.rx + grow, p.ry + grow, 0, 0, TAU);
    }
  }

  function glow(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function cloud(ctx, x, y, s, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, y - 12 * s, 0, y + 10 * s);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#dbeafe");
    ctx.fillStyle = g;
    ctx.beginPath();
    [[-16, 2, 10], [-5, -5, 13], [9, -3, 12], [20, 3, 9], [2, 4, 12]].forEach(([dx, dy, r]) => {
      ctx.moveTo(x + (dx + r) * s, y + dy * s);
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    });
    ctx.fill();
    ctx.restore();
  }

  function star4(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r : r * 0.35;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
  }

  function swirl(ctx, p, t, c1, c2, c3, boost = 0) {
    ctx.save();
    shapePath(ctx, p);
    ctx.clip();
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.ry * 1.05);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.rx - 4, p.y - p.ry - 4, p.rx * 2 + 8, p.ry * 2 + 8);
    ctx.strokeStyle = c3;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.55 + boost * 0.3;
      ctx.beginPath();
      for (let a = 0; a <= 5.2; a += 0.2) {
        const r = a / 5.2;
        const ang = a + t * 1.7 + (i * TAU) / 4;
        const x = p.x + Math.cos(ang) * p.rx * r * 1.05;
        const y = p.y + Math.sin(ang) * p.ry * r * 1.05;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    glow(ctx, p.x, p.y, p.ry * 0.7, "#ffffff", 0.55 + 0.25 * Math.sin(t * 3) + boost * 0.2);
    ctx.restore();
  }

  function frame(ctx, p, t, color, width = 5, boost = 0) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 + 6 * Math.sin(t * 3) + boost * 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    shapePath(ctx, p, width * 0.5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1.3;
    shapePath(ctx, p, width * 0.5 - 1);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- Hintergrund ----------
  function drawHall(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#14123a");
    g.addColorStop(0.25, "#27307a");
    g.addColorStop(0.26, "#2d3f82");
    g.addColorStop(1, "#1f2d5c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Sternenkuppel
    STARS.forEach((s) => {
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.4 + s.ph));
      ctx.fillStyle = "#e0e7ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Hallen-Rückwand: Bögen
    ctx.fillStyle = "rgba(129,140,248,0.14)";
    for (let i = 0; i < 9; i++) {
      const cx = 40 + i * 80;
      ctx.beginPath();
      ctx.moveTo(cx - 28, 100);
      ctx.lineTo(cx - 28, 60);
      ctx.arc(cx, 60, 28, Math.PI, 0);
      ctx.lineTo(cx + 28, 100);
      ctx.fill();
    }
    glow(ctx, W / 2, 98, 260, "#a5b4fc", 0.18);

    // Farbzonen mit fließenden Übergängen
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    PORTALS.forEach((p) => glow(ctx, p.x, p.y + 10, 190, p.color, 0.2 + 0.04 * Math.sin(t * 1.5 + p.x)));
    ctx.restore();

    // Wege
    ctx.save();
    ctx.lineCap = "round";
    PORTALS.forEach((p) => {
      const ex = p.x;
      const ey = p.y + p.ry + 12;
      const cx = (PLAZA.x + ex) / 2 + (ex < PLAZA.x ? -20 : ex > PLAZA.x ? 20 : 0);
      const cy = (PLAZA.y + ey) / 2 + (ey < PLAZA.y ? 24 : -24) * (p.id === "heimat" ? 0 : 1);
      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(PLAZA.x, PLAZA.y);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
      };
      ctx.strokeStyle = "rgba(15,23,60,0.45)";
      ctx.lineWidth = 34;
      trace();
      ctx.stroke();
      const pg = ctx.createLinearGradient(PLAZA.x, PLAZA.y, ex, ey);
      pg.addColorStop(0, "rgba(224,231,255,0.34)");
      pg.addColorStop(1, p.color + "66");
      ctx.strokeStyle = pg;
      ctx.lineWidth = 28;
      trace();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 12]);
      ctx.lineDashOffset = -t * 6;
      trace();
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();

    // Zentrale Plaza
    ctx.save();
    ctx.translate(PLAZA.x, PLAZA.y);
    ctx.scale(1, 0.62);
    const pg = ctx.createRadialGradient(0, 0, 4, 0, 0, 62);
    pg.addColorStop(0, "rgba(255,255,255,0.45)");
    pg.addColorStop(0.7, "rgba(165,180,252,0.28)");
    pg.addColorStop(1, "rgba(165,180,252,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,231,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, TAU);
    ctx.stroke();
    ctx.rotate(t * 0.4);
    PORTALS.forEach((p, i) => {
      const a = (i * TAU) / PORTALS.length;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 44, Math.sin(a) * 44, 4.5, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
    star4(ctx, PLAZA.x, PLAZA.y, 10 + 2 * Math.sin(t * 2), "rgba(255,255,255,0.85)");
  }

  // ---------- Portal-Themen ----------
  function bambus(ctx, p, t, boost) {
    // Lichtstrahl
    ctx.save();
    const lg = ctx.createLinearGradient(p.x - 60, p.y - 80, p.x + 20, p.y + 50);
    lg.addColorStop(0, "rgba(254,240,138,0.30)");
    lg.addColorStop(1, "rgba(254,240,138,0)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(p.x - 70, p.y - 84);
    ctx.lineTo(p.x - 30, p.y - 84);
    ctx.lineTo(p.x + 50, p.y + 50);
    ctx.lineTo(p.x - 10, p.y + 50);
    ctx.fill();
    ctx.restore();

    // Gras
    ctx.fillStyle = "rgba(34,197,94,0.55)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.ry + 6, 74, 12, 0, 0, TAU);
    ctx.fill();

    // Halme
    const stalks = [[-64, 0.9], [-50, 1.1], [-38, 0.8], [44, 1.0], [56, 1.15], [70, 0.85]];
    stalks.forEach(([dx, hs], i) => {
      const x = p.x + dx;
      const top = p.y + p.ry - 95 * hs - 22;
      const sway = Math.sin(t * 1.1 + i) * 2.5;
      const bg = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
      bg.addColorStop(0, "#4d7c0f");
      bg.addColorStop(0.5, "#a3e635");
      bg.addColorStop(1, "#3f6212");
      ctx.strokeStyle = bg;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, p.y + p.ry + 6);
      ctx.quadraticCurveTo(x + sway * 0.4, (top + p.y) / 2, x + sway, top);
      ctx.stroke();
      ctx.strokeStyle = "#365314";
      ctx.lineWidth = 1.5;
      for (let y = p.y + p.ry - 10; y > top + 6; y -= 22) {
        const k = (y - top) / (p.y + p.ry - top);
        const nx = x + sway * (1 - k);
        ctx.beginPath();
        ctx.moveTo(nx - 4, y);
        ctx.lineTo(nx + 4, y);
        ctx.stroke();
        ctx.fillStyle = i % 2 ? "#65a30d" : "#84cc16";
        ctx.beginPath();
        ctx.ellipse(nx + (i % 2 ? 11 : -11), y - 4, 11, 3.2, (i % 2 ? -0.5 : 0.5) + Math.sin(t * 1.5 + i) * 0.12, 0, TAU);
        ctx.fill();
      }
    });

    swirl(ctx, p, t, "#f0fdf4", "#16a34a", "#bbf7d0", boost);
    frame(ctx, p, t, "#4ade80", 5, boost);
  }

  function disco(ctx, p, t, boost) {
    // Tanzfläche
    const cols = 6;
    const rows = 3;
    const tw = 17;
    const th = 11;
    const x0 = p.x - (cols * tw) / 2;
    const y0 = p.y + p.ry + 4;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const hue = (i * 45 + j * 70 + t * 120) % 360;
        const pulse = 0.4 + 0.3 * Math.sin(t * 4 + i + j * 1.7);
        ctx.fillStyle = `hsla(${hue},85%,58%,${pulse})`;
        ctx.fillRect(x0 + i * tw + 0.5, y0 + j * th + 0.5, tw - 1, th - 1);
      }
    }

    // Discokugel + Lichtstrahlen
    const bx = p.x + 54;
    const by = p.y - 30;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const a = t * 0.9 + (i * TAU) / 6;
      const dir = Math.PI / 2 + Math.sin(a) * 1.15;
      const hue = (i * 60 + t * 90) % 360;
      ctx.fillStyle = `hsla(${hue},90%,60%,0.16)`;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(dir - 0.09) * 120, by + Math.sin(dir - 0.09) * 120);
      ctx.lineTo(bx + Math.cos(dir + 0.09) * 120, by + Math.sin(dir + 0.09) * 120);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(226,232,240,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, 30);
    ctx.lineTo(bx, by - 11);
    ctx.stroke();
    const bg = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 11);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#64748b");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(15,23,42,0.35)";
    ctx.lineWidth = 0.7;
    for (let k = -6; k <= 6; k += 4) {
      ctx.beginPath();
      ctx.moveTo(bx + k, by - 9);
      ctx.lineTo(bx + k, by + 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 9, by + k);
      ctx.lineTo(bx + 9, by + k);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6);
    star4(ctx, bx + 5, by - 4, 4, "#fff");
    ctx.globalAlpha = 1;

    // Neon-Portal
    const hue = (t * 80) % 360;
    const neon = `hsl(${hue},95%,62%)`;
    swirl(ctx, p, t, "#ffffff", `hsl(${(hue + 90) % 360},85%,45%)`, `hsl(${(hue + 180) % 360},95%,70%)`, boost);
    frame(ctx, p, t, neon, 5 + Math.sin(t * 6), boost);
  }

  function wolken(ctx, p, t, boost) {
    // Regenbogen
    const cols = ["#f87171", "#fb923c", "#fde047", "#4ade80", "#38bdf8", "#818cf8", "#c084fc"];
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4.2;
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(p.x - 6, p.y + 28, 78 - i * 4.2, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    });
    ctx.restore();

    // Sternchen
    for (let i = 0; i < 7; i++) {
      const sx = p.x + Math.cos(i * 2.1) * 70;
      const sy = p.y - 20 + Math.sin(i * 3.3) * 52;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.3);
      star4(ctx, sx, sy, 3 + (i % 3), "#fde68a");
    }
    ctx.globalAlpha = 1;

    glow(ctx, p.x, p.y, 70, "#fde68a", 0.35 + boost * 0.2);
    cloud(ctx, p.x - 60 + Math.sin(t * 0.5) * 4, p.y + 8, 1.3, 0.9);
    cloud(ctx, p.x + 62 + Math.sin(t * 0.5 + 2) * 4, p.y - 18, 1.0, 0.85);

    swirl(ctx, p, t, "#ffffff", "#fbbf24", "#fef3c7", boost);
    frame(ctx, p, t, "#fde68a", 5, boost);

    cloud(ctx, p.x - 30, p.y + p.ry + 2, 1.5);
    cloud(ctx, p.x + 22, p.y + p.ry + 6, 1.7);
    cloud(ctx, p.x + 62, p.y + p.ry - 2, 1.0);
  }

  function haus(ctx, p, t, boost) {
    const wallTop = p.y - p.ry + 2;
    const wallBot = p.y + p.ry;
    // Hauswand
    const wg = ctx.createLinearGradient(0, wallTop, 0, wallBot);
    wg.addColorStop(0, "#fde68a");
    wg.addColorStop(1, "#d6a26a");
    ctx.fillStyle = wg;
    ctx.fillRect(p.x - 52, wallTop, 104, wallBot - wallTop);
    ctx.strokeStyle = "rgba(120,53,15,0.25)";
    ctx.lineWidth = 1;
    for (let y = wallTop + 8; y < wallBot; y += 9) {
      ctx.beginPath();
      ctx.moveTo(p.x - 52, y);
      ctx.lineTo(p.x + 52, y);
      ctx.stroke();
    }
    // Dach
    ctx.fillStyle = "#b45309";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - 64, wallTop + 4);
    ctx.lineTo(p.x, wallTop - 34);
    ctx.lineTo(p.x + 64, wallTop + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.fillRect(p.x + 28, wallTop - 32, 12, 22);
    // Rauch
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.35 + i / 3) % 1;
      ctx.fillStyle = `rgba(226,232,240,${0.5 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(p.x + 34 + Math.sin(k * 6 + i) * 4, wallTop - 36 - k * 28, 3 + k * 5, 0, TAU);
      ctx.fill();
    }
    // Fenster mit warmem Licht
    [-38, 38].forEach((dx) => {
      const wx = p.x + dx;
      const wy = p.y - 6;
      glow(ctx, wx, wy, 34, "#fbbf24", 0.45 + 0.1 * Math.sin(t * 3 + dx));
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(wx - 9, wy - 10, 18, 20);
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      ctx.strokeRect(wx - 9, wy - 10, 18, 20);
      ctx.beginPath();
      ctx.moveTo(wx, wy - 10);
      ctx.lineTo(wx, wy + 10);
      ctx.moveTo(wx - 9, wy);
      ctx.lineTo(wx + 9, wy);
      ctx.stroke();
      ctx.fillStyle = "#92400e";
      ctx.fillRect(wx - 11, wy + 11, 22, 5);
    });

    // Tür als Portal
    ctx.save();
    ctx.fillStyle = "#78350f";
    shapePath(ctx, p, 4);
    ctx.fill();
    ctx.restore();
    swirl(ctx, p, t, "#fff7ed", "#f97316", "#fed7aa", boost);
    frame(ctx, p, t, "#fb923c", 3, boost);
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(p.x + p.rx - 6, p.y + 6, 2.6, 0, TAU);
    ctx.fill();

    // Vorgarten: Zaun mit Lücke + Blumen
    ctx.fillStyle = "rgba(34,197,94,0.6)";
    ctx.beginPath();
    ctx.ellipse(p.x, wallBot + 8, 72, 10, 0, 0, TAU);
    ctx.fill();
    for (let dx = -64; dx <= 64; dx += 9) {
      if (Math.abs(dx) < 22) continue;
      ctx.fillStyle = "#fef3c7";
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x + dx - 3, wallBot + 14);
      ctx.lineTo(p.x + dx - 3, wallBot + 3);
      ctx.lineTo(p.x + dx, wallBot);
      ctx.lineTo(p.x + dx + 3, wallBot + 3);
      ctx.lineTo(p.x + dx + 3, wallBot + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    FLOWERS.forEach((f) => {
      if (Math.abs(f.dx) < 18) return;
      const fx = p.x + f.dx + Math.sin(t * 1.5 + f.ph) * 1.2;
      const fy = wallBot + 14 + f.dy;
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 6);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = f.c;
      ctx.beginPath();
      ctx.arc(fx, fy, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff7ed";
      ctx.beginPath();
      ctx.arc(fx, fy, 1.1, 0, TAU);
      ctx.fill();
    });
  }

  function heimat(ctx, p, t, boost) {
    glow(ctx, p.x, p.y, 92, "#bae6fd", 0.35 + 0.1 * Math.sin(t * 2) + boost * 0.15);
    // Schneehügel
    const sg = ctx.createLinearGradient(0, p.y + p.ry - 10, 0, p.y + p.ry + 18);
    sg.addColorStop(0, "#ffffff");
    sg.addColorStop(1, "#bae6fd");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.ry + 4, 84, 15, 0, 0, TAU);
    ctx.fill();
    // Eiskristalle
    [[-56, 0.9], [-40, 1.3], [46, 1.2], [60, 0.8]].forEach(([dx, s], i) => {
      const x = p.x + dx;
      const y = p.y + p.ry - 2;
      const h = 38 * s;
      const cg = ctx.createLinearGradient(x, y - h, x, y);
      cg.addColorStop(0, "#f0f9ff");
      cg.addColorStop(1, "#38bdf8");
      ctx.fillStyle = cg;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + 8 * s, y - h * 0.35);
      ctx.lineTo(x + 6 * s, y);
      ctx.lineTo(x - 6 * s, y);
      ctx.lineTo(x - 8 * s, y - h * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
      star4(ctx, x, y - h - 4, 4, "#ffffff");
      ctx.globalAlpha = 1;
    });
    // Plüsch-Puschel
    [[-70, 6], [-26, 11], [28, 12], [72, 6]].forEach(([dx, dy], i) => {
      ctx.fillStyle = "#fef3c7";
      ctx.strokeStyle = "#e7d7a8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = 0; a < 14; a++) {
        const ang = (a / 14) * TAU;
        const r = a % 2 ? 5.5 : 7.5;
        ctx.lineTo(p.x + dx + Math.cos(ang) * r, p.y + p.ry + dy + Math.sin(ang) * r * 0.8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    const shimmer = `hsl(${190 + Math.sin(t * 1.2) * 25},90%,${75 + Math.sin(t * 3) * 6}%)`;
    swirl(ctx, p, t, "#ffffff", "#38bdf8", "#e0f2fe", boost);
    // zarte Pink-Glitzer-Schlieren
    ctx.save();
    shapePath(ctx, p);
    ctx.clip();
    glow(ctx, p.x + Math.cos(t * 1.3) * 12, p.y + Math.sin(t * 1.7) * 18, 24, "#f9a8d4", 0.45);
    ctx.restore();
    frame(ctx, p, t, shimmer, 5, boost);
  }

  function miniHouse(ctx, p, t, boost, wallTopCol, wallBotCol, roofCol, swirlMid, swirlEdge, accentCol) {
    const wt = p.y - p.ry + 2;
    const wb = p.y + p.ry;
    const wg = ctx.createLinearGradient(0, wt, 0, wb);
    wg.addColorStop(0, wallTopCol);
    wg.addColorStop(1, wallBotCol);
    ctx.fillStyle = wg;
    ctx.fillRect(p.x - 40, wt, 80, wb - wt);

    // Dach
    ctx.fillStyle = roofCol;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x - 48, wt + 3);
    ctx.lineTo(p.x, wt - 24);
    ctx.lineTo(p.x + 48, wt + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Warme Fenster
    [-29, 29].forEach((dx) => {
      const wx = p.x + dx;
      const wy = p.y - 4;
      glow(ctx, wx, wy, 24, "#fde047", 0.4 + 0.1 * Math.sin(t * 3 + dx));
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(wx - 7, wy - 8, 14, 15);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx - 7, wy - 8, 14, 15);
    });

    // Tür als Portal
    ctx.fillStyle = "#451a03";
    shapePath(ctx, p, 3);
    ctx.fill();
    swirl(ctx, p, t, "#ffffff", swirlMid, swirlEdge, boost);
    frame(ctx, p, t, accentCol, 3, boost);
  }

  function mama(ctx, p, t, boost) {
    miniHouse(ctx, p, t, boost, "#fbcfe8", "#f472b6", "#be185d", "#ec4899", "#fbcfe8", "#f472b6");
    // Dampfender Kochtopf vorm Haus
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.roundRect(p.x - 36, p.y + p.ry - 6, 14, 10, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(p.x - 29 + Math.sin(t * 3) * 2, p.y + p.ry - 11, 2.5, 0, TAU);
    ctx.arc(p.x - 27 - Math.sin(t * 3) * 2, p.y + p.ry - 16, 2, 0, TAU);
    ctx.fill();
    // Blumenkasten rechts
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(p.x + 30, p.y + p.ry + 2, 5, 0, TAU);
    ctx.fill();
  }

  function papa(ctx, p, t, boost) {
    miniHouse(ctx, p, t, boost, "#bae6fd", "#60a5fa", "#1e3a8a", "#0284c7", "#bae6fd", "#38bdf8");
    // Kleines Zahlenschloss neben der Tür
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.fillRect(p.x + 28, p.y + 4, 8, 12);
    ctx.strokeRect(p.x + 28, p.y + 4, 8, 12);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(p.x + 30, p.y + 6, 4, 3);
    // Laterne links
    ctx.fillStyle = "#475569";
    ctx.fillRect(p.x - 33, p.y + p.ry - 8, 3, 12);
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(p.x - 31.5, p.y + p.ry - 10, 3, 0, TAU);
    ctx.fill();
  }

  const THEMES = { bambus, disco, wolken, haus, heimat, mama, papa };

  function drawPortals(ctx, t, state) {
    PORTALS.forEach((p) => {
      const boost = state?.nearId === p.id ? 1 : 0;
      THEMES[p.id](ctx, p, t, boost);
    });
  }

  function drawSigns(ctx, t, state) {
    ctx.save();
    ctx.font = "800 11px Orbitron, Rajdhani, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    PORTALS.forEach((p) => {
      const label = p.name;
      const w = ctx.measureText(label).width + 22;
      const h = 20;
      const sx = p.x;
      const sy = p.y - p.ry - (p.id === "haus" ? 50 : p.id === "bambus" ? 36 : p.id === "mama" || p.id === "papa" ? 34 : 22) + Math.sin(t * 1.6 + p.x) * 1.2;
      ctx.strokeStyle = "rgba(226,232,240,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - w / 2 + 6, sy - h / 2);
      ctx.lineTo(sx - w / 2 + 6, sy - h / 2 - 5);
      ctx.moveTo(sx + w / 2 - 6, sy - h / 2);
      ctx.lineTo(sx + w / 2 - 6, sy - h / 2 - 5);
      ctx.stroke();
      const g = ctx.createLinearGradient(0, sy - h / 2, 0, sy + h / 2);
      g.addColorStop(0, "rgba(15,23,42,0.92)");
      g.addColorStop(1, p.dark + "ee");
      ctx.fillStyle = g;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(sx - w / 2, sy - h / 2, w, h, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.fillText(label, sx, sy + 0.5);
      ctx.shadowBlur = 0;
      if (state?.visited?.has(p.id)) {
        ctx.fillStyle = "#fde047";
        ctx.fillText("★", sx + w / 2 - 2, sy - h / 2 - 1);
      }
    });
    ctx.restore();
  }

  function drawForeground(ctx, t) {
    // Waldlicht-Glühwürmchen
    const b = P.bambus;
    FIREFLIES.forEach((f) => {
      const x = b.x - 70 + f.x * 140 + Math.sin(t * f.sp + f.ph) * 10;
      const y = b.y - 60 + f.y * 120 + Math.cos(t * f.sp * 1.3 + f.ph) * 8;
      ctx.fillStyle = `rgba(253,224,71,${0.35 + 0.5 * Math.abs(Math.sin(t * 2 + f.ph))})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.fill();
    });
    // Schneeflocken + Glitzer um Blauis Heimat
    const h = P.heimat;
    FLAKES.forEach((f) => {
      const k = (f.y + t * f.sp) % 1;
      const x = h.x - 90 + f.x * 180 + Math.sin(t + f.ph) * 6;
      const y = h.y - 70 + k * 130;
      ctx.fillStyle = `rgba(255,255,255,${0.9 * Math.sin(k * Math.PI)})`;
      ctx.beginPath();
      ctx.arc(x, y, f.s, 0, TAU);
      ctx.fill();
    });
  }

  window.BLAUIS_WELT_LEVELS?.register({
    id: "hub",
    name: "Oberwelt",
    subtitle: "Portal-Halle",
    worldW: W,
    worldH: H,
    spawn: { x: PLAZA.x, y: PLAZA.y + 40 },
    bounds: { x1: 24, y1: 96, x2: W - 24, y2: 394 },
    portals: PORTALS,
    drawBackground(ctx, t, state) {
      drawHall(ctx, t);
      drawPortals(ctx, t, state);
    },
    drawSigns,
    drawForeground
  });
})();
