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
    id: "level_1",
    name: "Level 1: Berg-Bambushain",
    keysRequired: 1,
    build(w, h) {
      const floorY = h - 22;
      const platforms = [
        // Unten (Startbereich Mitte)
        { x: Math.round(w * 0.14), y: floorY, w: Math.round(w * 0.72), h: 16 },
        // Links unten -> Aufstieg
        { x: Math.round(w * 0.08), y: Math.round(h * 0.72), w: Math.round(w * 0.28), h: 14 },
        // Rechts Mitte (Schlüssel-Hügel)
        { x: Math.round(w * 0.62), y: Math.round(h * 0.54), w: Math.round(w * 0.28), h: 14 },
        // Mitte (Patrouillen-Hügel)
        { x: Math.round(w * 0.34), y: Math.round(h * 0.52), w: Math.round(w * 0.24), h: 14 },
        // Links oben -> Zugang zum Käfig
        { x: Math.round(w * 0.12), y: Math.round(h * 0.32), w: Math.round(w * 0.28), h: 14 },
        // Ganz oben (Käfig mit 2. Panda)
        { x: Math.round(w * 0.36), y: Math.round(h * 0.16), w: Math.round(w * 0.28), h: 14 }
      ];

      const bamboos = [
        { x: Math.round(w * 0.21), top: Math.round(h * 0.72), bottom: floorY, width: 30 },
        { x: Math.round(w * 0.36), top: Math.round(h * 0.52), bottom: Math.round(h * 0.72), width: 30 },
        { x: Math.round(w * 0.65), top: Math.round(h * 0.54), bottom: floorY, width: 30 },
        { x: Math.round(w * 0.18), top: Math.round(h * 0.32), bottom: Math.round(h * 0.72), width: 30 },
        { x: Math.round(w * 0.39), top: Math.round(h * 0.16), bottom: Math.round(h * 0.32), width: 30 }
      ];

      const midPlat = platforms[3];
      const rightMidPlat = platforms[2];
      const bottomPlat = platforms[0];

      const cops = [
        {
          x: Math.round(midPlat.x + 12),
          y: midPlat.y - 36,
          w: 32,
          h: 36,
          vx: 66,
          vy: 0,
          onLadder: false,
          activeLadder: null,
          ladderCooldown: 0.4,
          dirTimer: 0.9
        },
        {
          x: Math.round(rightMidPlat.x + 16),
          y: rightMidPlat.y - 36,
          w: 32,
          h: 36,
          vx: -70,
          vy: 0,
          onLadder: false,
          activeLadder: null,
          ladderCooldown: 0.5,
          dirTimer: 0.8
        },
        {
          x: Math.round(bottomPlat.x + bottomPlat.w * 0.62),
          y: bottomPlat.y - 36,
          w: 32,
          h: 36,
          vx: 72,
          vy: 0,
          onLadder: false,
          activeLadder: null,
          ladderCooldown: 0.3,
          dirTimer: 0.7
        }
      ];

      return {
        spawn: {
          x: Math.round(w * 0.5),
          y: floorY
        },
        platforms,
        bamboos,
        keys: [
          { x: Math.round(w * 0.82), y: Math.round(h * 0.54) - 24, collected: false }
        ],
        cage: {
          x: Math.round(w * 0.5),
          y: Math.round(h * 0.16) - 36,
          w: 46,
          h: 36,
          freed: false
        },
        cops
      };
    }
  });
})();