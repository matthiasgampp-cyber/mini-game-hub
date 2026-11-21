(() => {
  "use strict";

  const ROTATION_PAUSE_MS = 2500; // 2.5 Sekunden Pause beim Drehen des Handys

  const state = {
    isPortrait: window.innerHeight >= window.innerWidth,
    rotationTimer: null,
    rotationDeadline: 0,
    pausedByRotation: false,
    overlayEl: null,
    held: {
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
    if (Array.isArray(reg.items)) {
      return reg.items.find((g) => g && g.isActive) || null;
    }
    return null;
  }

  function isFlightModeActive() {
    const active = getActiveGameEntry();
    const gameObj =
      active?.instance ||
      active?.game ||
      window.PANDIES_ABENTEUER_GAME ||
      null;

    const modeStr = String(
      gameObj?.levelMode ||
        gameObj?.mode ||
        gameObj?.gameMode ||
        active?.mode ||
        active?.tag ||
        ""
    ).toLowerCase();

    if (
      modeStr.includes("fly") ||
      modeStr.includes("flieg") ||
      modeStr.includes("flight") ||
      modeStr.includes("air")
    ) {
      return true;
    }

    // Falls ein Spiel explizit meldet, dass der Action-Button nach oben fliegen soll
    if (gameObj?.actionFliesUp === true || gameObj?.useJumpAsUp === true) {
      return true;
    }

    return false;
  }

  function removeDuplicateOverlays(keepEl = null) {
    const selectors = [
      "#global-touch-controls",
      "#touch-controls",
      ".global-touch-controls",
      "[data-global-controls]",
      "[data-touch-controls]"
    ];
    const found = new Set();
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => found.add(el));
    });

    found.forEach((el) => {
      if (el !== keepEl) {
        el.remove();
      }
    });
  }

  function setHeld(dir, isDown) {
    state.held[dir] = Boolean(isDown);

    // Falls vorhanden, bestehendes Controls-Objekt synchron halten
    const ctrl = window.HUB_CONTROLS || window.CONTROLS || window.GameControls;
    if (ctrl && ctrl.held) {
      ctrl.held[dir] = Boolean(isDown);
    }

    if (dir === "jump" && isDown) {
      state.jumpCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (_) {}
      });
    }
  }

  function triggerActionOrUp(isDown) {
    if (isFlightModeActive()) {
      setHeld("up", isDown);
    } else {
      setHeld("jump", isDown);
      if (isDown) {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true })
        );
      } else {
        window.dispatchEvent(
          new KeyboardEvent("keyup", { code: "Space", key: " ", bubbles: true })
        );
      }
    }
  }

  function buildCleanControls() {
    removeDuplicateOverlays(null);

    const existing = document.getElementById("global-touch-controls");
    if (existing) existing.remove();

    const flightMode = isFlightModeActive();
    const hasJumpButton = true;
    const showUpArrow = flightMode || !hasJumpButton;

    const root = document.createElement("div");
    root.id = "global-touch-controls";
    root.setAttribute("data-global-controls", "true");
    root.className =
      "fixed inset-x-0 bottom-3 z-40 px-4 flex items-end justify-between pointer-events-none select-none";

    // Links/Rechts mit deutlichem Abstand zueinander
    const moveGroup = document.createElement("div");
    moveGroup.className = "flex items-center gap-7 pointer-events-auto";

    const mkBtn = (label, ariaLabel, onPressChange) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", ariaLabel);
      btn.className =
        "w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-amber-400 active:text-slate-950 text-white border border-white/25 shadow-xl flex items-center justify-center text-xl font-bold touch-none";
      btn.textContent = label;

      const down = (e) => {
        e.preventDefault();
        onPressChange(true);
      };
      const up = (e) => {
        e.preventDefault();
        onPressChange(false);
      };

      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("pointerleave", up);
      return btn;
    };

    const leftBtn = mkBtn("◀", "Links", (v) => setHeld("left", v));
    const rightBtn = mkBtn("▶", "Rechts", (v) => setHeld("right", v));
    moveGroup.appendChild(leftBtn);
    moveGroup.appendChild(rightBtn);

    // Rechte Seite: optional Hoch/Runter oder bei Flugmodus Action-Button als "HOCH"
    const rightGroup = document.createElement("div");
    rightGroup.className = "flex items-center gap-4 pointer-events-auto";

    if (showUpArrow && !flightMode) {
      const upBtn = mkBtn("▲", "Hoch", (v) => setHeld("up", v));
      rightGroup.appendChild(upBtn);
    }

    const downBtn = mkBtn("▼", "Runter", (v) => setHeld("down", v));
    rightGroup.appendChild(downBtn);

    const actionLabel = flightMode ? "HOCH ▲" : "SPRINGEN";
    const actionAria = flightMode ? "Nach oben fliegen" : "Springen";
    const actionBtn = mkBtn(actionLabel, actionAria, (v) => triggerActionOrUp(v));
    actionBtn.className =
      "px-4 h-14 rounded-2xl bg-amber-400/90 active:bg-amber-300 text-slate-950 border border-amber-200 shadow-xl flex items-center justify-center text-xs font-orbitron font-extrabold tracking-wide touch-none";
    rightGroup.appendChild(actionBtn);

    root.appendChild(moveGroup);
    root.appendChild(rightGroup);

    document.body.appendChild(root);
    state.overlayEl = root;
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

    // Alle gedrückten Richtungen beim Drehen sauber lösen
    Object.keys(state.held).forEach((k) => setHeld(k, false));

    pauseActiveGame();
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
        buildCleanControls();
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
      removeDuplicateOverlays(state.overlayEl);
    }
  }

  // Öffentliche Hilfs-API für alle Spiele
  window.GLOBAL_MOBILE_CONTROLS = {
    held: state.held,
    onJump(cb) {
      state.jumpCallbacks.add(cb);
      return () => state.jumpCallbacks.delete(cb);
    },
    refresh() {
      buildCleanControls();
    },
    isRotating() {
      return state.pausedByRotation;
    }
  };

  window.addEventListener("orientationchange", () => {
    setTimeout(handleViewportChange, 80);
  });
  window.addEventListener("resize", handleViewportChange);

  // Periodisch prüfen, ob ein Spiel oder Hub doppelte Overlays erzeugt hat
  const mo = new MutationObserver(() => {
    const all = document.querySelectorAll('[data-global-controls="true"], #touch-controls, .touch-controls');
    if (all.length > 1) {
      removeDuplicateOverlays(state.overlayEl);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    buildCleanControls();
    mo.observe(document.body, { childList: true, subtree: true });
  });

  if (document.body) {
    buildCleanControls();
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();