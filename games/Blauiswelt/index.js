(() => {
  "use strict";

  /**
   * Blauis Welt – Level-Registry
   * ------------------------------------------------------------
   * - Szenen/Level registrieren sich über window.BLAUIS_WELT_LEVELS.register({ id, ... })
   * - Die 5 Portale der Oberwelt verweisen über `levelId` auf ihre späteren Einzel-Level.
   *   Sobald z. B. level-bambus.js existiert und `ready: true` gesetzt ist, wird es
   *   automatisch nachgeladen und das Portal startet statt der Vorschau das Level.
   */

  const registeredLevels = [];

  const PORTAL_TARGETS = [
    { portalId: "bambus", levelId: "bambus", script: "./games/Blauiswelt/level-bambus.js", ready: true },
    { portalId: "disco", levelId: "disco", script: "./games/Blauiswelt/level-disco.js", ready: true },
    { portalId: "wolken", levelId: "wolken", script: "./games/Blauiswelt/level-wolken.js", ready: true },
    { portalId: "haus", levelId: "haus", script: "./games/Blauiswelt/level-haus.js", ready: true },
    { portalId: "heimat", levelId: "heimat", script: "./games/Blauiswelt/level-heimat.js", ready: true },
    { portalId: "mama", levelId: "mama", script: "./games/Blauiswelt/level-mamas-haus.js", ready: true },
    { portalId: "papa", levelId: "papa", script: "./games/Blauiswelt/level-papas-haus.js", ready: true }
  ];

  const LEVEL_SCRIPTS = [
    "./games/Blauiswelt/level-hub.js",
    ...PORTAL_TARGETS.filter((t) => t.ready).map((t) => t.script)
  ];

  window.BLAUIS_WELT_LEVELS = window.BLAUIS_WELT_LEVELS || {
    register(level) {
      if (!level || !level.id) return;
      const idx = registeredLevels.findIndex((l) => l.id === level.id);
      if (idx >= 0) registeredLevels[idx] = level;
      else registeredLevels.push(level);
    },
    get(id) {
      return registeredLevels.find((l) => l.id === id) || null;
    },
    list() {
      return registeredLevels;
    },
    portalTargets() {
      return PORTAL_TARGETS;
    },
    targetForPortal(portalId) {
      return PORTAL_TARGETS.find((t) => t.portalId === portalId) || null;
    }
  };

  function loadScripts(list, done) {
    const v = window.APP_VERSION ? `?v=${window.APP_VERSION}` : "";
    let pending = list.length;
    if (!pending) return done?.();
    list.forEach((src) => {
      const s = document.createElement("script");
      s.src = src + v;
      s.async = false;
      s.onload = s.onerror = () => {
        pending -= 1;
        if (pending === 0) done?.();
      };
      document.head.appendChild(s);
    });
  }

  loadScripts(LEVEL_SCRIPTS, () => {
    window.BLAUIS_WELT_GAME?.reloadLevels?.();
  });
})();
