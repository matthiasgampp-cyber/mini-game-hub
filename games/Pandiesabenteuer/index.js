(() => {
  "use strict";

  const registeredLevels = [];

  window.PANDIES_ABENTEUER_LEVELS = window.PANDIES_ABENTEUER_LEVELS || {
    register(level) {
      if (!level || typeof level.build !== "function") return;
      const existingIdx = registeredLevels.findIndex((item) => item.id && item.id === level.id);
      if (existingIdx >= 0) {
        registeredLevels[existingIdx] = level;
      } else {
        registeredLevels.push(level);
      }
    },
    list() {
      return registeredLevels;
    }
  };

  const LEVEL_SCRIPTS = [
    "./games/Pandiesabenteuer/level-1.js",
    "./games/Pandiesabenteuer/level-2.js",
    "./games/Pandiesabenteuer/level-3.js",
    "./games/Pandiesabenteuer/level-4.js",
    "./games/Pandiesabenteuer/level-5.js",
    "./games/Pandiesabenteuer/level-6.js",
    "./games/Pandiesabenteuer/level-7.js",
    "./games/Pandiesabenteuer/level-8.js"
  ];

  function attachBackgroundsToLevels() {
    const bgMap = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
    const list = window.PANDIES_ABENTEUER_LEVELS?.list?.();
    if (Array.isArray(list)) {
      if (list[0] && typeof list[0].drawBackground !== "function" && typeof bgMap.level1 === "function") {
        list[0].drawBackground = bgMap.level1;
      }
      if (list[1] && typeof list[1].drawBackground !== "function" && typeof bgMap.level2 === "function") {
        list[1].drawBackground = bgMap.level2;
      }
      if (list[2] && typeof list[2].drawBackground !== "function" && typeof bgMap.level3 === "function") {
        list[2].drawBackground = bgMap.level3;
      }
      if (list[3] && typeof list[3].drawBackground !== "function" && typeof bgMap.level4 === "function") {
        list[3].drawBackground = bgMap.level4;
      }
      if (list[4] && typeof list[4].drawBackground !== "function" && typeof bgMap.level5 === "function") {
        list[4].drawBackground = bgMap.level5;
      }
      if (list[5] && typeof list[5].drawBackground !== "function" && typeof bgMap.level6 === "function") {
        list[5].drawBackground = bgMap.level6;
      }
      if (list[6] && typeof list[6].drawBackground !== "function" && typeof bgMap.level7 === "function") {
        list[6].drawBackground = bgMap.level7;
      }
      if (list[7] && typeof list[7].drawBackground !== "function" && typeof bgMap.level8 === "function") {
        list[7].drawBackground = bgMap.level8;
      }
    }
  }

  function loadScriptsSequential(urls, index = 0) {
    if (index >= urls.length) {
      attachBackgroundsToLevels();
      window.PANDIES_ABENTEUER_GAME?.reloadLevels?.();
      return;
    }

    const src = urls[index];
    const v = window.APP_VERSION || "2.3.0";
    const versionedSrc = `${src}?v=${v}`;
    const existing = Array.from(document.scripts).find((s) => {
      const sSrc = s.getAttribute("src") || "";
      return sSrc === src || sSrc.startsWith(`${src}?`);
    });
    if (existing) {
      if (existing.dataset.loaded === "true") {
        loadScriptsSequential(urls, index + 1);
      } else {
        existing.addEventListener("load", () => loadScriptsSequential(urls, index + 1), { once: true });
        existing.addEventListener("error", () => loadScriptsSequential(urls, index + 1), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = versionedSrc;
    script.async = false;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        attachBackgroundsToLevels();
        loadScriptsSequential(urls, index + 1);
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        console.warn("[Pandiesabenteuer] Level-Skript konnte nicht geladen werden:", src);
        loadScriptsSequential(urls, index + 1);
      },
      { once: true }
    );
    document.head.appendChild(script);
  }

  loadScriptsSequential(LEVEL_SCRIPTS);

  window.GAME_REGISTRY?.register({
    id: "pandiesabenteuer",
    name: "Pandies Abenteuer",
    icon: "🐼",
    tag: "Adventure",
    subtitle: "Labyrinth, Drachenkanonen, Dschungel & der epische Roboter-Panda Bosskampf!",
    description:
      "Schwinge dich über Krokodile, aktiviere den Riesen-Roboterpanda, schlage mit dem Bambusstab zu und besiege den Polizeiroboter-Boss!",
    init: (ctx) => window.PANDIES_ABENTEUER_GAME?.init(ctx),
    start: () => window.PANDIES_ABENTEUER_GAME?.start(),
    pause: () => window.PANDIES_ABENTEUER_GAME?.pause(),
    resume: () => window.PANDIES_ABENTEUER_GAME?.resume(),
    resize: () => window.PANDIES_ABENTEUER_GAME?.resize(),
    destroy: () => window.PANDIES_ABENTEUER_GAME?.destroy()
  });
})();
