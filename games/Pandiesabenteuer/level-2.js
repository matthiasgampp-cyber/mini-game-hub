(() => {
  "use strict";

  const BASE_WORLD_W = 960;
  const BASE_WORLD_H = 540;

  let cachedBgCanvas = null;
  let cachedW = 0;
  let cachedH = 0;

  function buildMazeBackground(worldW, worldH) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    const off = document.createElement("canvas");
    off.width = ww;
    off.height = wh;
    const ctx = off.getContext("2d");

    const stoneW = 28;
    const stoneH = 20;
    const gap = 2.5;

    const baseGrad = ctx.createLinearGradient(0, 0, 0, wh);
    baseGrad.addColorStop(0, "#334155");
    baseGrad.addColorStop(0.5, "#1e293b");
    baseGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, ww, wh);

    const stoneShades = ["#64748b", "#475569", "#526074", "#3b4759"];
    const rows = Math.ceil(wh / stoneH) + 1;
    const cols = Math.ceil(ww / stoneW) + 2;

    for (let r = 0; r < rows; r++) {
      const rowShift = (r % 2) * (stoneW * 0.5);
      const sy = r * stoneH;
      for (let c = -1; c < cols; c++) {
        const sx = c * stoneW + rowShift;
        const hash = Math.abs((r * 73 + c * 37) % stoneShades.length);

        ctx.fillStyle = stoneShades[hash];
        ctx.beginPath();
        ctx.roundRect(sx + gap * 0.5, sy + gap * 0.5, stoneW - gap, stoneH - gap, 4);
        ctx.fill();

        ctx.strokeStyle = "rgba(241, 245, 249, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + gap * 0.5 + 2, sy + gap * 0.5 + 1.5);
        ctx.lineTo(sx + stoneW - gap * 0.5 - 2, sy + gap * 0.5 + 1.5);
        ctx.stroke();

        // Winzige Moosflecken zwischen einzelnen Steinen
        if ((r * 13 + c * 29) % 7 === 0) {
          ctx.fillStyle = "rgba(74, 222, 128, 0.28)";
          ctx.beginPath();
          ctx.arc(sx + gap * 0.5 + 4, sy + gap * 0.5 + 4, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Dezentes Panda-Mosaik in der Mitte des Pflasters
    const cx = ww * 0.5;
    const cy = wh * 0.5;
    const tile = 14;
    const radius = Math.min(ww, wh) * 0.32;

    for (let ox = -radius; ox <= radius; ox += tile) {
      for (let oy = -radius; oy <= radius; oy += tile) {
        const px = cx + ox;
        const py = cy + oy;
        const nx = ox / radius;
        const ny = oy / radius;

        const onEar =
          Math.hypot(nx + 0.56, ny + 0.58) < 0.28 ||
          Math.hypot(nx - 0.56, ny + 0.58) < 0.28;
        const onEyePatch =
          Math.hypot((nx + 0.3) / 0.2, (ny + 0.04) / 0.25) < 1 ||
          Math.hypot((nx - 0.3) / 0.2, (ny + 0.04) / 0.25) < 1;
        const onNose = Math.hypot(nx / 0.14, (ny - 0.22) / 0.1) < 1;
        const onHead = Math.hypot(nx / 0.72, (ny + 0.04) / 0.68) < 1;

        let fill = null;
        if (onEar || onEyePatch || onNose) {
          fill = "rgba(15, 23, 42, 0.35)";
        } else if (onHead) {
          fill = "rgba(248, 250, 252, 0.22)";
        }

        if (fill) {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.roundRect(px - tile * 0.42, py - tile * 0.42, tile * 0.84, tile * 0.84, 3);
          ctx.fill();

          ctx.strokeStyle = "rgba(15, 23, 42, 0.2)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    cachedBgCanvas = off;
    cachedW = ww;
    cachedH = wh;
    return off;
  }

  function drawLevel2Background(ctx, { viewW = 720, viewH = 405, worldW = BASE_WORLD_W, worldH = BASE_WORLD_H, camera }) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    if (!cachedBgCanvas || cachedW !== ww || cachedH !== wh) {
      buildMazeBackground(ww, wh);
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

  function buildFullFieldMaze(worldW, worldH, t, spawn, exit) {
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

    let seed = 4829103; // Stabiler Seed für konsistentes, exzellent navigierbares Labyrinth
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

    // Gezielte Durchbrüche für alternative Wege und flüssigeren Spielfluss
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.1) {
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

    const safeWalls = rawWalls.filter((w) => {
      const blocksSpawn = rectHitsCircle(w.x, w.y, w.w, w.h, spawn.x, spawn.y - 14, 24);
      const blocksExit = rectHitsCircle(w.x, w.y, w.w, w.h, exit.x, exit.y, 32);
      return !blocksSpawn && !blocksExit;
    });

    const startR = rows - 1;
    const startC = 0;
    const goalR = 0;
    const goalC = cols - 1;

    const queue = [{ r: startR, c: startC }];
    const visitedBfs = Array.from({ length: rows }, () => Array(cols).fill(false));
    const parent = Array.from({ length: rows }, () => Array(cols).fill(null));
    visitedBfs[startR][startC] = true;

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.r === goalR && cur.c === goalC) break;
      const cell = grid[cur.r][cur.c];
      for (const d of dirs) {
        if (cell.walls[d.wall]) continue;
        const nr = cur.r + d.dr;
        const nc = cur.c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visitedBfs[nr][nc]) {
          visitedBfs[nr][nc] = true;
          parent[nr][nc] = { r: cur.r, c: cur.c };
          queue.push({ r: nr, c: nc });
        }
      }
    }

    const pathCells = [];
    let trace = { r: goalR, c: goalC };
    while (trace) {
      pathCells.push(trace);
      trace = parent[trace.r][trace.c];
    }
    pathCells.reverse();

    const isWallFree = (px, py) =>
      !safeWalls.some((w) => rectHitsCircle(w.x, w.y, w.w, w.h, px, py, 14));

    const coins = [];
    const stepCount = Math.min(22, Math.max(14, Math.floor(pathCells.length * 0.8)));

    for (let i = 0; i < stepCount; i++) {
      const idx = Math.min(
        pathCells.length - 1,
        Math.max(0, Math.round(((i + 0.5) / stepCount) * (pathCells.length - 1)))
      );
      const cell = pathCells[idx];
      const baseX = marginX + (cell.c + 0.5) * cellW;
      const baseY = marginY + (cell.r + 0.5) * cellH;

      const jitterX = (rand() - 0.5) * cellW * 0.32;
      const jitterY = (rand() - 0.5) * cellH * 0.32;

      let cx = Math.max(t + 18, Math.min(worldW - t - 18, Math.round(baseX + jitterX)));
      let cy = Math.max(t + 18, Math.min(worldH - t - 18, Math.round(baseY + jitterY)));

      if (!isWallFree(cx, cy)) {
        cx = Math.round(baseX);
        cy = Math.round(baseY);
      }

      const tooCloseToStart = Math.hypot(cx - spawn.x, cy - (spawn.y - 14)) < 32;
      const tooCloseToExit = Math.hypot(cx - exit.x, cy - exit.y) < 36;
      if (!tooCloseToStart && !tooCloseToExit) {
        coins.push({
          x: cx,
          y: cy,
          radius: 10,
          collected: false,
          order: coins.length
        });
      }
    }

    return { walls: safeWalls, coins };
  }

  function buildLevel2(viewW, viewH) {
    const worldW = BASE_WORLD_W;
    const worldH = BASE_WORLD_H;
    const t = 16;

    const spawn = { x: 76, y: worldH - 44 };
    const exit = { x: worldW - 76, y: 68, w: 46, h: 46 };

    const { walls, coins } = buildFullFieldMaze(worldW, worldH, t, spawn, exit);

    return {
      mode: "maze",
      worldW,
      worldH,
      spawn,
      walls,
      coins,
      exit,
      drawBackground: drawLevel2Background
    };
  }

  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level2 = drawLevel2Background;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-2",
    shortLabel: "Münzenjagd",
    name: "MÜNZENJAGD",
    mode: "maze",
    drawBackground: drawLevel2Background,
    build: buildLevel2
  });
})();
