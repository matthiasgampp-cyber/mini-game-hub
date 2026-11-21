(() => {
  "use strict";

  const BASE_PATH = "./games/Pandapitfall";
  const LEVEL_SCRIPTS = [
    "level-jungle.js",
    "level-water.js",
    "level-balloon.js",
    "level-tree.js"
  ];

  function loadScript(src) {
    const v = window.APP_VERSION || "2.3.0";
    const versionedSrc = `${src}?v=${v}`;
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src*="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = versionedSrc;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Konnte Skript nicht laden: ${src}`));
      document.head.appendChild(script);
    });
  }

  window.PANDA_PITFALL_BOOT = (async () => {
    await loadScript(`${BASE_PATH}/levels.js`);
    for (const file of LEVEL_SCRIPTS) {
      await loadScript(`${BASE_PATH}/${file}`);
    }
  })();
})();