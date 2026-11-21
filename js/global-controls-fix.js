(() => {
  "use strict";

  const ROTATION_PAUSE_MS = 2500; // 2.5 Sekunden Pause beim Drehen des Handys

  const baseControls = window.GLOBAL_MOBILE_CONTROLS || null;

  const state = {
    isPortrait: window.innerHeight >= window.innerWidth,
    rotationTimer: null,
    rotationDeadline: 0,
    pausedByRotation: false,
    held: baseControls?.held || {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false
    },
    jumpCallbacks: new Set()
  };

  function getActiveGameEntry() {
    const reg = window.GAME_REGISTRY;
    if (!reg) return null;
    if (reg.activeGame) return reg.activeGame;
    if (reg.current) return reg.current;
    if (typeof reg.get === "function" && reg.activeId) {
      return reg.get(reg.activeId) || null;
    }
    if (Array.isArray(reg.items)) {
      return reg.items.find((g) => g && g.isActive) || null;
    }
    return null;
  }

  function removeDuplicateOverlays() {
    // #global-mini-controls aus hub.js bleibt als einziges Pad erhalten
    const selectors = [
      "#global-touch-controls",
      "#touch-controls",
      ".global-touch-controls",
      ".touch-controls",
      "[data-global-controls]",
      "[data-touch-controls]"
    ];
    const found = new Set();
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.id !== "global-mini-controls") {
          found.add(el);
        }
      });
    });

    found.forEach((el) => el.remove());
  }

  function releaseAllHeld() {
    Object.keys(state.held).forEach((k) => {
      state.held[k] = false;
    });
    try {
      baseControls?.releaseAll?.();
    } catch (_) {}
  }

  function syncGlobalPadState() {
    removeDuplicateOverlays();
    const miniPad = document.getElementById("global-mini-controls");
    const mode = baseControls?.mode || window.GLOBAL_MOBILE_CONTROLS?.mode || "buttons";
    const pauseOverlay = document.getElementById("pause-overlay");
    const modalOpen = pauseOverlay && !pauseOverlay.classList.contains("hidden");

    if (miniPad) {
      if (state.pausedByRotation || modalOpen || mode !== "buttons") {
        miniPad.classList.add("hidden");
        releaseAllHeld();
      }
    }
  }

  function ensureRotationBanner() {
    let banner = document.getElementById("global-rotation-pause-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "global-rotation-pause-banner";
      banner.className =
        "fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/75 backdrop-blur-xs pointer-events-none select-none";
      banner.innerHTML = `
        <div class="px-5 py-3 rounded-2xl bg-slate-900 border border-amber-400/40 text-amber-200 font-orbitron text-sm shadow-2xl text-center">
          🔄 HANDY WIRD GEDREHT... <span data-rot-sec="true">2.5</span>s
        </div>
      `;
      document.body.appendChild(banner);
    }
    return banner;
  }

  function pauseActiveGame() {
    const active = getActiveGameEntry();
    try {
      active?.pause?.();
      active?.instance?.pause?.();
      window.PANDIES_ABENTEUER_GAME?.pause?.();
    } catch (_) {}
  }

  function resumeActiveGame() {
    const active = getActiveGameEntry();
    try {
      active?.resize?.();
      active?.instance?.resize?.();
      window.PANDIES_ABENTEUER_GAME?.resize?.();
    } catch (_) {}

    try {
      active?.resume?.();
      active?.instance?.resume?.();
      window.PANDIES_ABENTEUER_GAME?.resume?.();
    } catch (_) {}
  }

  function startRotationGracePeriod() {
    state.pausedByRotation = true;
    state.rotationDeadline = performance.now() + ROTATION_PAUSE_MS;

    releaseAllHeld();
    pauseActiveGame();
    syncGlobalPadState();

    const banner = ensureRotationBanner();
    banner.classList.remove("hidden");
    banner.classList.add("flex");

    if (state.rotationTimer) {
      clearInterval(state.rotationTimer);
    }

    const secEl = banner.querySelector('[data-rot-sec="true"]');
    state.rotationTimer = setInterval(() => {
      const remMs = Math.max(0, state.rotationDeadline - performance.now());
      if (secEl) {
        secEl.textContent = (remMs / 1000).toFixed(1);
      }
      if (remMs <= 0) {
        clearInterval(state.rotationTimer);
        state.rotationTimer = null;
        state.pausedByRotation = false;
        banner.classList.add("hidden");
        banner.classList.remove("flex");
        syncGlobalPadState();
        resumeActiveGame();
      }
    }, 100);
  }

  function handleViewportChange() {
    const nowPortrait = window.innerHeight >= window.innerWidth;
    if (nowPortrait !== state.isPortrait) {
      state.isPortrait = nowPortrait;
      startRotationGracePeriod();
    } else {
      syncGlobalPadState();
    }
  }

  // Bestehende Hub-API erweitern, ohne sie zu verlieren
  window.GLOBAL_MOBILE_CONTROLS = {
    get mode() {
      return baseControls?.mode || "buttons";
    },
    setMode(nextMode) {
      baseControls?.setMode?.(nextMode);
      syncGlobalPadState();
    },
    held: state.held,
    triggerJump() {
      baseControls?.triggerJump?.();
      state.jumpCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (_) {}
      });
    },
    releaseAll: releaseAllHeld,
    onJump(cb) {
      state.jumpCallbacks.add(cb);
      return () => state.jumpCallbacks.delete(cb);
    },
    refresh() {
      syncGlobalPadState();
    },
    isRotating() {
      return state.pausedByRotation;
    }
  };

  window.addEventListener("orientationchange", () => {
    setTimeout(handleViewportChange, 80);
  });
  window.addEventListener("resize", handleViewportChange);

  const mo = new MutationObserver(() => {
    removeDuplicateOverlays();
  });

  document.addEventListener("DOMContentLoaded", () => {
    syncGlobalPadState();
    mo.observe(document.body, { childList: true, subtree: true });
  });

  if (document.body) {
    syncGlobalPadState();
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();