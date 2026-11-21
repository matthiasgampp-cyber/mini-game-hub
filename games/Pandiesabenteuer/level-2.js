(() => {
  "use strict";

  window.PANDIES_ABENTEUER_LEVELS = window.PANDIES_ABENTEUER_LEVELS || {
    _items: [],
    register(lvl) {
      if (!lvl || !lvl.id) return;
      const idx = this._items.findIndex((item) => item.id === lvl.id);
      if (idx >= 0) this._items[idx] = lvl;
      else this._items.push(lvl);
    },
    list() {
      return this._items.slice();
    }
  };

  window.PANDIES_ABENTEUER_LEVELS.register({
    id: "level_2",
    name: "Level 2: Feines Bambus-Irrgarten-Labyrinth",
    mode: "maze",
    build(w, h) {
      // Großes Scroll-Spielfeld (deutlich größer als der sichtbare Bildschirm)
      const worldW = Math.max(1380, Math.round(w * 1.95));
      const worldH = Math.max(820, Math.round(h * 1.95));

      const cols = 31;
      const rows = 19;
      const cellW = worldW / cols;
      const cellH = worldH / rows;

      // Deterministischer Zufallsgenerator für verschlungene Irrwege
      let seed = 20261120;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      // 1 = Wand, 0 = Gang
      const grid = Array.from({ length: rows }, () => Array(cols).fill(1));

      const startC = 0;
      const startR = rows - 2; // 17
      const exitC = cols - 1;  // 30
      const exitR = 1;

      grid[startR][startC] = 0;
      grid[startR][1] = 0;
      grid[exitR][exitC] = 0;
      grid[exitR][cols - 2] = 0;

      // Recursive Backtracker auf ungeraden Zellen
      const stack = [[1, startR]];
      grid[startR][1] = 0;

      const dirs = [
        [0, -2],
        [2, 0],
        [0, 2],
        [-2, 0]
      ];

      while (stack.length > 0) {
        const [cc, cr] = stack[stack.length - 1];
        const neighbors = [];

        for (const [dc, dr] of dirs) {
          const nc = cc + dc;
          const nr = cr + dr;
          if (nc >= 1 && nc <= cols - 2 && nr >= 1 && nr <= rows - 2 && grid[nr][nc] === 1) {
            neighbors.push([nc, nr, cc + dc / 2, cr + dr / 2]);
          }
        }

        if (neighbors.length > 0) {
          const [nc, nr, wc, wr] = neighbors[Math.floor(rand() * neighbors.length)];
          grid[wr][wc] = 0;
          grid[nr][nc] = 0;
          stack.push([nc, nr]);
        } else {
          stack.pop();
        }
      }

      // Ausgang sicher anbinden
      grid[exitR][cols - 2] = 0;
      if (grid[exitR][cols - 3] === 1 && grid[exitR + 1][cols - 2] === 1) {
        grid[exitR][cols - 3] = 0;
      }

      // Zusätzliche Querverbindungen für mehr Irrwege
      for (let r = 2; r < rows - 2; r += 2) {
        for (let c = 2; c < cols - 2; c += 2) {
          if (grid[r][c] === 1 && rand() < 0.3) {
            const horizOpen = grid[r][c - 1] === 0 && grid[r][c + 1] === 0;
            const vertOpen = grid[r - 1][c] === 0 && grid[r + 1][c] === 0;
            if (horizOpen !== vertOpen) {
              grid[r][c] = 0;
            }
          }
        }
      }

      // BFS-Weg von Start bis Ausgang für die Münzspur
      const keyOf = (c, r) => `${c},${r}`;
      const queue = [[1, startR]];
      const parent = new Map();
      parent.set(keyOf(1, startR), null);

      while (queue.length > 0) {
        const [cc, cr] = queue.shift();
        if (cc === cols - 2 && cr === exitR) break;

        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = cc + dc;
          const nr = cr + dr;
          if (nc >= 1 && nc <= cols - 2 && nr >= 1 && nr <= rows - 2 && grid[nr][nc] === 0) {
            const k = keyOf(nc, nr);
            if (!parent.has(k)) {
              parent.set(k, [cc, cr]);
              queue.push([nc, nr]);
            }
          }
        }
      }

      const mainPath = [];
      let cur = [cols - 2, exitR];
      while (cur) {
        mainPath.push(cur);
        cur = parent.get(keyOf(cur[0], cur[1])) || null;
      }
      mainPath.reverse();
      mainPath.unshift([startC, startR]);
      mainPath.push([exitC, exitR]);

      const cellCenter = (c, r) => ({
        x: Math.round((c + 0.5) * cellW),
        y: Math.round((r + 0.5) * cellH)
      });

      // Dünne, ZUSAMMENHÄNGENDE Wandbalken statt einzelner Punkte:
      // Horizontale Wandsegmente (für r = 0, 2, 4, ...)
      const walls = [];
      const barThick = 5;

      for (let r = 0; r < rows; r += 2) {
        let c = 0;
        while (c < cols) {
          if (grid[r][c] === 1) {
            const startSegC = c;
            while (c < cols && grid[r][c] === 1) c++;
            const segW = Math.round((c - startSegC) * cellW);
            const segX = Math.round(startSegC * cellW);
            const segY = Math.round(r * cellH + (cellH - barThick) * 0.5);
            walls.push({ x: segX, y: segY, w: segW, h: barThick });
          } else {
            c++;
          }
        }
      }

      // Vertikale Wandsegmente (für c = 0, 2, 4, ...)
      for (let c = 0; c < cols; c += 2) {
        let r = 0;
        while (r < rows) {
          if (grid[r][c] === 1) {
            const startSegR = r;
            while (r < rows && grid[r][c] === 1) r++;
            const segH = Math.round((r - startSegR) * cellH);
            const segX = Math.round(c * cellW + (cellW - barThick) * 0.5);
            const segY = Math.round(startSegR * cellH);
            walls.push({ x: segX, y: segY, w: barThick, h: segH });
          } else {
            r++;
          }
        }
      }

      // Münzen entlang des Weges zum Ausgang (mit Abständen & an Kurven, sodass man genau hinschauen muss)
      const coins = [];
      let order = 0;
      for (let i = 2; i < mainPath.length - 1; i++) {
        const [pc, pr] = mainPath[i - 1];
        const [cc, cr] = mainPath[i];
        const [nc, nr] = mainPath[Math.min(mainPath.length - 1, i + 1)];

        const isTurn = (cc - pc) !== (nc - cc) || (cr - pr) !== (nr - cr);
        if (isTurn || i % 4 === 0) {
          const pos = cellCenter(cc, cr);
          order += 1;
          coins.push({
            x: pos.x,
            y: pos.y,
            radius: 8,
            collected: false,
            order
          });
        }
      }

      const startPos = cellCenter(startC, startR);
      const endPos = cellCenter(exitC, exitR);

      return {
        mode: "maze",
        worldW,
        worldH,
        spawn: {
          x: startPos.x,
          y: startPos.y
        },
        walls,
        coins,
        exit: {
          x: endPos.x,
          y: endPos.y,
          w: Math.max(24, Math.round(cellW * 0.72)),
          h: Math.max(24, Math.round(cellH * 0.72))
        }
      };
    }
  });
})();