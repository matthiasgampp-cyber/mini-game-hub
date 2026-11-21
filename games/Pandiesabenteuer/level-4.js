(() => {
  "use strict";

  const BASE_WORLD_W = 960;
  const BASE_WORLD_H = 540;

  let cachedBgCanvas = null;
  let cachedW = 0;
  let cachedH = 0;

  function buildLevel4Background(worldW, worldH) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    const off = document.createElement("canvas");
    off.width = ww;
    off.height = wh;
    const ctx = off.getContext("2d");

    const stoneW = 28;
    const stoneH = 20;
    const gap = 2.5;

    // Nächtlicher Palastgarten-Bodenverlauf
    const baseGrad = ctx.createLinearGradient(0, 0, 0, wh);
    baseGrad.addColorStop(0, "#090d16");
    baseGrad.addColorStop(0.5, "#0f172a");
    baseGrad.addColorStop(1, "#020617");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, ww, wh);

    const stoneShades = ["#1e293b", "#334155", "#243247", "#1a2436"];
    const rows = Math.ceil(wh / stoneH) + 1;
    const cols = Math.ceil(ww / stoneW) + 2;

    for (let r = 0; r < rows; r++) {
      const rowShift = (r % 2) * (stoneW * 0.5);
      const sy = r * stoneH;
      for (let c = -1; c < cols; c++) {
        const sx = c * stoneW + rowShift;
        const hash = Math.abs((r * 67 + c * 41) % stoneShades.length);

        ctx.fillStyle = stoneShades[hash];
        ctx.beginPath();
        ctx.roundRect(sx + gap * 0.5, sy + gap * 0.5, stoneW - gap, stoneH - gap, 4);
        ctx.fill();

        ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + gap * 0.5 + 2, sy + gap * 0.5 + 1.5);
        ctx.lineTo(sx + stoneW - gap * 0.5 - 2, sy + gap * 0.5 + 1.5);
        ctx.stroke();

        // Winzige leuchtende Moos- und Glühwürmchen-Punkte
        if ((r * 17 + c * 31) % 9 === 0) {
          ctx.fillStyle = "rgba(74, 222, 128, 0.22)";
          ctx.beginPath();
          ctx.arc(sx + gap * 0.5 + 5, sy + gap * 0.5 + 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Großes rundes Zen-Garten-Ornament im Zentrum
    const cx = ww * 0.5;
    const cy = wh * 0.5;
    const rad = Math.min(ww, wh) * 0.28;

    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.arc(cx, cy, rad * 0.65, 0, Math.PI * 2);
    ctx.arc(cx, cy, rad * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(250, 204, 21, 0.08)";
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    cachedBgCanvas = off;
    cachedW = ww;
    cachedH = wh;
    return off;
  }

  function drawLevel4Background(ctx, { viewW = 720, viewH = 405, worldW = BASE_WORLD_W, worldH = BASE_WORLD_H, camera }) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    if (!cachedBgCanvas || cachedW !== ww || cachedH !== wh) {
      buildLevel4Background(ww, wh);
    }
    if (!cachedBgCanvas) return;

    const camX = camera?.x || 0;
    const camY = camera?.y || 0;
    const sx = Math.max(0, Math.min(cachedBgCanvas.width - 1, camX));
    const sy = Math.max(0, Math.min(cachedBgCanvas.height - 1, camY));
    const sw = Math.min(cachedBgCanvas.width - sx, viewW);
    const sh = Math.min(cachedBgCanvas.height - sy, viewH);

    if (sw > 0 && sh > 0) {
      ctx.drawImage(cachedBgCanvas, sx, sy, sw, sh, sx - camX, sy - camY, sw, sh);
    }
  }

  function rectHitsCircle(rx, ry, rw, rh, cx, cy, pad = 16) {
    const closestX = Math.max(rx - pad, Math.min(cx, rx + rw + pad));
    const closestY = Math.max(ry - pad, Math.min(cy, ry + rh + pad));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < pad * pad;
  }

  function buildLevel4Maze(worldW, worldH, t, spawn, gift1, gift2, gift3, cage) {
    const cols = 11;
    const rows = 8;
    const marginX = 44;
    const marginY = 38;
    const spanW = Math.max(440, worldW - marginX * 2);
    const spanH = Math.max(300, worldH - marginY * 2);
    const cellW = spanW / cols;
    const cellH = spanH / rows;

    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        r,
        c,
        visited: false,
        walls: { top: true, right: true, bottom: true, left: true }
      }))
    );

    // Jedes Mal zufälliger Seed für ein komplett neues Labyrinth bei jedem Spielstart
    let seed = Math.floor(Math.random() * 99999999) + 1;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const dirs = [
      { dr: -1, dc: 0, wall: "top", opp: "bottom" },
      { dr: 0, dc: 1, wall: "right", opp: "left" },
      { dr: 1, dc: 0, wall: "bottom", opp: "top" },
      { dr: 0, dc: -1, wall: "left", opp: "right" }
    ];

    const stack = [grid[rows - 1][0]];
    grid[rows - 1][0].visited = true;

    while (stack.length > 0) {
      const cur = stack[stack.length - 1];
      const candidates = [];

      for (const d of dirs) {
        const nr = cur.r + d.dr;
        const nc = cur.c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
          candidates.push({ next: grid[nr][nc], d });
        }
      }

      if (candidates.length === 0) {
        stack.pop();
      } else {
        const pick = candidates[Math.floor(rand() * candidates.length)];
        cur.walls[pick.d.wall] = false;
        pick.next.walls[pick.d.opp] = false;
        pick.next.visited = true;
        stack.push(pick.next);
      }
    }

    // Zusätzliche Querverbindungen für spannende Ausweichmanöver vor den 4 Polizisten
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.16) {
          if (c < cols - 1 && grid[r][c].walls.right) {
            grid[r][c].walls.right = false;
            grid[r][c + 1].walls.left = false;
          } else if (r < rows - 1 && grid[r][c].walls.bottom) {
            grid[r][c].walls.bottom = false;
            grid[r + 1][c].walls.top = false;
          }
        }
      }
    }

    const rawWalls = [
      { x: 0, y: 0, w: worldW, h: t },
      { x: 0, y: worldH - t, w: worldW, h: t },
      { x: 0, y: 0, w: t, h: worldH },
      { x: worldW - t, y: 0, w: t, h: worldH }
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const x0 = marginX + c * cellW;
        const y0 = marginY + r * cellH;
        const x1 = x0 + cellW;
        const y1 = y0 + cellH;

        if (cell.walls.right && c < cols - 1) {
          rawWalls.push({
            x: Math.round(x1 - t * 0.5),
            y: Math.round(y0),
            w: t,
            h: Math.round(cellH + t * 0.5)
          });
        }
        if (cell.walls.bottom && r < rows - 1) {
          rawWalls.push({
            x: Math.round(x0),
            y: Math.round(y1 - t * 0.5),
            w: Math.round(cellW + t * 0.5),
            h: t
          });
        }
      }
    }

    // Schutzzonen um Start, die 3 Geschenke und den Käfig
    const safeWalls = rawWalls.filter((w) => {
      const blocksSpawn = rectHitsCircle(w.x, w.y, w.w, w.h, spawn.x, spawn.y - 14, 26);
      const blocksGift1 = rectHitsCircle(w.x, w.y, w.w, w.h, gift1.x, gift1.y, 24);
      const blocksGift2 = rectHitsCircle(w.x, w.y, w.w, w.h, gift2.x, gift2.y, 24);
      const blocksGift3 = rectHitsCircle(w.x, w.y, w.w, w.h, gift3.x, gift3.y, 24);
      const blocksCage = rectHitsCircle(w.x, w.y, w.w, w.h, cage.x, cage.y + 16, 32);
      return !blocksSpawn && !blocksGift1 && !blocksGift2 && !blocksGift3 && !blocksCage;
    });

    return safeWalls;
  }

  function buildLevel4(viewW, viewH) {
    const worldW = BASE_WORLD_W;
    const worldH = BASE_WORLD_H;
    const t = 16;

    const cols = 11;
    const rows = 8;
    const marginX = 44;
    const marginY = 38;
    const spanW = Math.max(440, worldW - marginX * 2);
    const spanH = Math.max(300, worldH - marginY * 2);
    const cellW = spanW / cols;
    const cellH = spanH / rows;

    const getCellCenter = (c, r) => ({
      x: Math.round(marginX + (c + 0.5) * cellW),
      y: Math.round(marginY + (r + 0.5) * cellH)
    });

    // Start unten links
    const spawnPos = getCellCenter(0, rows - 1);
    const spawn = { x: spawnPos.x, y: spawnPos.y + 10 };

    // 3 Geschenke mit Schlüsselteil 1, 2 und 3 verteilt im Labyrinth
    // Geschenk 1: Oben links
    const g1Pos = getCellCenter(1, 1);
    const gift1 = {
      x: g1Pos.x,
      y: g1Pos.y,
      isGift: true,
      partIndex: 1,
      collected: false,
      order: 0
    };

    // Geschenk 2: Unten rechts
    const g2Pos = getCellCenter(cols - 2, rows - 2);
    const gift2 = {
      x: g2Pos.x,
      y: g2Pos.y,
      isGift: true,
      partIndex: 2,
      collected: false,
      order: 1
    };

    // Geschenk 3: Oben rechts
    const g3Pos = getCellCenter(cols - 2, 1);
    const gift3 = {
      x: g3Pos.x,
      y: g3Pos.y,
      isGift: true,
      partIndex: 3,
      collected: false,
      order: 2
    };

    // Der Käfig mit dem gefangenen Panda oben in der Mitte
    const cagePos = getCellCenter(5, 0);
    const cage = {
      x: cagePos.x,
      y: cagePos.y - 14,
      w: 38,
      h: 38,
      freed: false
    };

    const walls = buildLevel4Maze(worldW, worldH, t, spawn, gift1, gift2, gift3, cage);

    // 4 Polizisten in unterschiedlichen Bereichen des Labyrinths
    // Pandi läuft mit 190 px/s; die verfolgenden Polizisten laufen mit 168 px/s (Pandi ist minimal schneller!)
    // Bei normaler Patrouille laufen die Polizisten gemütlich mit 82 px/s
    const cop1Pos = getCellCenter(4, rows - 2);
    const cop2Pos = getCellCenter(cols - 2, 4);
    const cop3Pos = getCellCenter(2, 3);
    const cop4Pos = getCellCenter(8, 2);

    const cops = [
      {
        x: cop1Pos.x - 12,
        y: cop1Pos.y - 16,
        w: 24,
        h: 32,
        patrolSpeed: 70,
        chaseSpeed: 154, // Minimal langsamer als Pandis 190 px/s!
        maxChaseSpeed: 162,
        dir: { x: 1, y: 0 },
        dirTimer: 0.8,
        isChasing: false
      },
      {
        x: cop2Pos.x - 12,
        y: cop2Pos.y - 16,
        w: 24,
        h: 32,
        patrolSpeed: 72,
        chaseSpeed: 154,
        maxChaseSpeed: 162,
        dir: { x: 0, y: 1 },
        dirTimer: 1.0,
        isChasing: false
      },
      {
        x: cop3Pos.x - 12,
        y: cop3Pos.y - 16,
        w: 24,
        h: 32,
        patrolSpeed: 68,
        chaseSpeed: 152,
        maxChaseSpeed: 160,
        dir: { x: 0, y: -1 },
        dirTimer: 0.9,
        isChasing: false
      },
      {
        x: cop4Pos.x - 12,
        y: cop4Pos.y - 16,
        w: 24,
        h: 32,
        patrolSpeed: 70,
        chaseSpeed: 154,
        maxChaseSpeed: 162,
        dir: { x: -1, y: 0 },
        dirTimer: 0.7,
        isChasing: false
      }
    ];

    return {
      mode: "maze",
      worldW,
      worldH,
      spawn,
      walls,
      coins: [],
      keys: [gift1, gift2, gift3],
      keysRequired: 3,
      cage,
      cops,
      exit: null, // Ziel ist die Befreiung des Pandas im Käfig!
      hudText: (game) =>
        game.keysCollected >= 3
          ? "🔑 SCHLÜSSEL VOLLSTÄNDIG! ➔ KÄFIG!"
          : `🎁 ${game.keysCollected}/3 SCHLÜSSELTEILE ➔ KÄFIG`,
      drawBackground: drawLevel4Background
    };
  }

  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level4 = drawLevel4Background;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-4",
    shortLabel: "Geschenke-Jagd",
    name: "GESCHENKE-JAGD",
    mode: "maze",
    keysRequired: 3,
    drawBackground: drawLevel4Background,
    build: buildLevel4
  });
})();
