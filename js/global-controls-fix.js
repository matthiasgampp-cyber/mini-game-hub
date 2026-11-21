(() => {
  "use strict";

  const ROTATION_PAUSE_MS = 180; // Schnelle, weiche Entprellung beim Drehen des Handys

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
    try {
      window.VIRTUAL_JOYSTICK?.reset?.();
    } catch (_) {}
  }

  function syncGlobalPadState() {
    removeDuplicateOverlays();
    const miniPad = document.getElementById("global-mini-controls");
    const mode = baseControls?.mode || window.GLOBAL_MOBILE_CONTROLS?.mode || "buttons";
    const dpadMode = baseControls?.dpadMode || window.GLOBAL_MOBILE_CONTROLS?.dpadMode || "joystick";
    const pauseOverlay = document.getElementById("pause-overlay");
    const modalOpen = pauseOverlay && !pauseOverlay.classList.contains("hidden");

    if (miniPad) {
      if (modalOpen || mode !== "buttons") {
        miniPad.classList.add("hidden");
        releaseAllHeld();
      } else {
        miniPad.classList.remove("hidden");
        const joystickCont = miniPad.querySelector("#gpad-joystick-container");
        const arrowsCont = miniPad.querySelector("#gpad-arrows-container");
        const padToggleBtn = miniPad.querySelector("#gpad-toggle-type-btn");

        if (joystickCont) {
          joystickCont.classList.toggle("hidden", dpadMode !== "joystick");
          if (dpadMode === "joystick") {
            window.VIRTUAL_JOYSTICK?.updateGeometry?.();
          }
        }
        if (arrowsCont) {
          arrowsCont.classList.toggle("hidden", dpadMode !== "arrows");
        }
        if (padToggleBtn) {
          padToggleBtn.textContent = dpadMode === "joystick" ? "🕹️ Stick" : "◀▶ Pfeile";
        }
      }
    }
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
    releaseAllHeld();
    pauseActiveGame();

    if (state.rotationTimer) {
      clearTimeout(state.rotationTimer);
    }

    state.rotationTimer = setTimeout(() => {
      state.rotationTimer = null;
      state.pausedByRotation = false;
      syncGlobalPadState();
      resumeActiveGame();
    }, ROTATION_PAUSE_MS);
  }

  function handleViewportChange() {
    const nowPortrait = window.innerHeight >= window.innerWidth;
    if (nowPortrait !== state.isPortrait) {
      state.isPortrait = nowPortrait;
      startRotationGracePeriod();
    } else {
      syncGlobalPadState();
      const active = getActiveGameEntry();
      try {
        active?.resize?.();
        active?.instance?.resize?.();
        window.PANDIES_ABENTEUER_GAME?.resize?.();
      } catch (_) {}
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
    get dpadMode() {
      return baseControls?.dpadMode || "joystick";
    },
    setDpadMode(nextDpad) {
      baseControls?.setDpadMode?.(nextDpad);
      syncGlobalPadState();
    },
    toggleDpadMode() {
      baseControls?.toggleDpadMode?.();
      syncGlobalPadState();
    },
    setDirection(action, active) {
      baseControls?.setDirection?.(action, active);
    },
    setDirections(dirs) {
      baseControls?.setDirections?.(dirs);
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
    setTimeout(handleViewportChange, 60);
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
