(() => {
  "use strict";

  const LEVEL_SCRIPTS = [
    "./games/Pandiesabenteuer/level-1.js",
    "./games/Pandiesabenteuer/level-2.js"
  ];

  function loadScriptsSequential(urls, index = 0) {
    if (index >= urls.length) {
      window.PANDIES_ABENTEUER_GAME?.reloadLevels?.();
      return;
    }

    const src = urls[index];
    const existing = Array.from(document.scripts).find((s) => s.getAttribute("src") === src);
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
    script.src = src;
    script.async = false;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
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
    subtitle: "Schlüssel rechts Mitte holen & 2. Panda oben befreien",
    description:
      "Starte unten in der Mitte, hole rechts in der Mitte den Schlüssel, weiche den Polizisten aus und befreie den 2. Panda ganz oben – danach geht es ins große Bambus-Labyrinth.",
    init: (ctx) => window.PANDIES_ABENTEUER_GAME?.init(ctx),
    start: () => window.PANDIES_ABENTEUER_GAME?.start(),
    pause: () => window.PANDIES_ABENTEUER_GAME?.pause(),
    resume: () => window.PANDIES_ABENTEUER_GAME?.resume(),
    resize: () => window.PANDIES_ABENTEUER_GAME?.resize(),
    destroy: () => window.PANDIES_ABENTEUER_GAME?.destroy()
  });
})();