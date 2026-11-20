(() => {
  "use strict";

  const registry = new Map();

  window.PANDA_PITFALL_LEVELS = {
    register(level) {
      if (!level || !level.id) return;
      registry.set(level.id, level);
    },
    get(id) {
      return registry.get(id) || null;
    },
    list() {
      return Array.from(registry.values());
    }
  };
})();