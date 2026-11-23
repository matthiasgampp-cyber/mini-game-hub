(() => {
  "use strict";

  const STORAGE_PREFIX = "neon_hub_v1_";

  // Zentrales DPR-Cap für Tablets und schwächere Mobilgeräte (max 1.25 auf Touch/Mobilgeräten, max 2 auf Desktop)
  window.getOptimalDPR = function getOptimalDPR() {
    const raw = window.devicePixelRatio || 1;
    const isTouchOrMobile =
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
      "ontouchstart" in window ||
      (navigator.maxTouchPoints || 0) > 0 ||
      window.innerWidth <= 1024;
    return isTouchOrMobile ? Math.min(raw, 1.25) : Math.min(raw, 2);
  };

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = this.loadMuteState();
    }

    loadMuteState() {
      try {
        return localStorage.getItem(`${STORAGE_PREFIX}muted`) === "true";
      } catch {
        return false;
      }
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}muted`, String(this.muted));
      } catch {
        // Ignorieren falls Storage blockiert ist
      }
      updateSoundButton();
    }

    toggleMute() {
      this.setMuted(!this.muted);
    }

    ensureContext() {
      if (this.muted) return null;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    playTone({ freq = 440, endFreq = null, duration = 0.09, type = "square", volume = 0.08 }) {
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    }

    playHit() {
      this.playTone({ freq: 520, endFreq: 760, duration: 0.06, type: "triangle", volume: 0.09 });
    }

    playWall() {
      this.playTone({ freq: 260, endFreq: 210, duration: 0.07, type: "sine", volume: 0.08 });
    }

    playScore() {
      this.playTone({ freq: 660, endFreq: 990, duration: 0.14, type: "square", volume: 0.07 });
    }

    playLose() {
      this.playTone({ freq: 220, endFreq: 90, duration: 0.24, type: "sawtooth", volume: 0.08 });
    }
  }

  const sound = new SoundEngine();

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
      } catch {
        // Ignorieren
      }
    }
  };

  const JOYSTICK_GAMES = new Set(["pandiesabenteuer", "yetiadventure", "pandapitfall", "blauiswelt"]);

  let controlMode = storage.get("control_mode", "buttons"); // "buttons" | "touch"
  let dpadMode = storage.get("dpad_mode", "joystick"); // "joystick" | "arrows"
  const heldControls = { left: false, right: false, up: false, down: false, jump: false };
  const jumpListeners = new Set();
  let virtualJoystickInstance = null;

  const games = new Map();
  let activeGameId = null;
  let isPaused = false;
  let globalPadEl = null;
  let lastInnerW = window.innerWidth;
  let lastInnerH = window.innerHeight;
  let rotatePauseTimer = null;

  const dom = {
    hubView: document.getElementById("hub-view"),
    stageWrapper: document.getElementById("game-stage-wrapper"),
    stage: document.getElementById("game-stage"),
    gameGrid: document.getElementById("game-grid"),
    homeBtn: document.getElementById("hub-home-btn"),
    hubCtrlJoystickBtn: document.getElementById("hub-ctrl-joystick-btn"),
    hubCtrlArrowsBtn: document.getElementById("hub-ctrl-arrows-btn"),
    controlModeBtn: document.getElementById("control-mode-btn"),
    pauseBtn: document.getElementById("pause-toggle-btn"),
    soundBtn: document.getElementById("sound-toggle-btn"),
    headerTitle: document.getElementById("header-title"),
    headerSubtitle: document.getElementById("header-subtitle"),
    pauseOverlay: document.getElementById("pause-overlay"),
    resumeBtn: document.getElementById("resume-btn"),
    restartFromPauseBtn: document.getElementById("restart-from-pause-btn"),
    exitToHubBtn: document.getElementById("exit-to-hub-btn")
  };

  const dirMap = {
    left: { key: "ArrowLeft", code: "ArrowLeft" },
    right: { key: "ArrowRight", code: "ArrowRight" },
    up: { key: "ArrowUp", code: "ArrowUp" },
    down: { key: "ArrowDown", code: "ArrowDown" }
  };

  function dispatchKey(type, key, code) {
    window.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code,
        bubbles: true,
        cancelable: true
      })
    );
  }

  function setDirection(action, active) {
    if (action === "jump") {
      if (active && !heldControls.jump) {
        heldControls.jump = true;
        triggerGlobalJump();
      } else if (!active && heldControls.jump) {
        heldControls.jump = false;
        dispatchKey("keyup", " ", "Space");
      }
      return;
    }

    const spec = dirMap[action];
    if (!spec) return;
    const isCurrentlyHeld = Boolean(heldControls[action]);
    const nextState = Boolean(active);

    if (isCurrentlyHeld !== nextState) {
      heldControls[action] = nextState;
      dispatchKey(nextState ? "keydown" : "keyup", spec.key, spec.code);
    }
  }

  function setDirections(dirs) {
    if (!dirs) return;
    for (const [action, active] of Object.entries(dirs)) {
      setDirection(action, active);
    }
  }

  function releaseAllHeldControls() {
    if (heldControls.left) {
      heldControls.left = false;
      dispatchKey("keyup", "ArrowLeft", "ArrowLeft");
    }
    if (heldControls.right) {
      heldControls.right = false;
      dispatchKey("keyup", "ArrowRight", "ArrowRight");
    }
    if (heldControls.up) {
      heldControls.up = false;
      dispatchKey("keyup", "ArrowUp", "ArrowUp");
    }
    if (heldControls.down) {
      heldControls.down = false;
      dispatchKey("keyup", "ArrowDown", "ArrowDown");
    }
    if (heldControls.jump) {
      heldControls.jump = false;
      dispatchKey("keyup", " ", "Space");
    }
    try {
      virtualJoystickInstance?.reset?.();
    } catch (_) {}
  }

  function triggerGlobalJump() {
    dispatchKey("keydown", " ", "Space");
    setTimeout(() => dispatchKey("keyup", " ", "Space"), 45);
    for (const fn of jumpListeners) {
      try {
        fn();
      } catch {
        // Ignorieren
      }
    }
  }

  function updateHubControlSelector() {
    if (dom.hubCtrlJoystickBtn && dom.hubCtrlArrowsBtn) {
      const isStick = dpadMode === "joystick";
      dom.hubCtrlJoystickBtn.className = isStick
        ? "px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
        : "px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition text-slate-400 hover:text-slate-200 border border-transparent";

      dom.hubCtrlArrowsBtn.className = !isStick
        ? "px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
        : "px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition text-slate-400 hover:text-slate-200 border border-transparent";
    }
  }

  function syncControlUI() {
    updateHubControlSelector();

    if (dom.controlModeBtn) dom.controlModeBtn.classList.add("hidden");
    if (dom.dpadToggleBtn) dom.dpadToggleBtn.classList.add("hidden");

    if (globalPadEl) {
      const isJoystickGame = JOYSTICK_GAMES.has(activeGameId);
      const showPad = isJoystickGame && Boolean(activeGameId) && !isPaused;
      globalPadEl.classList.toggle("hidden", !showPad);

      if (showPad) {
        const joystickCont = globalPadEl.querySelector("#gpad-joystick-container");
        const arrowsCont = globalPadEl.querySelector("#gpad-arrows-container");

        if (joystickCont) {
          joystickCont.classList.toggle("hidden", dpadMode !== "joystick");
          if (dpadMode === "joystick" && virtualJoystickInstance) {
            virtualJoystickInstance.updateGeometry();
          }
        }
        if (arrowsCont) {
          arrowsCont.classList.toggle("hidden", dpadMode !== "arrows");
        }
      } else {
        releaseAllHeldControls();
      }
    }
  }

  function setControlMode(nextMode) {
    controlMode = nextMode === "touch" ? "touch" : "buttons";
    storage.set("control_mode", controlMode);
    if (controlMode !== "buttons") {
      releaseAllHeldControls();
    }
    syncControlUI();
  }

  function setDpadMode(nextDpad) {
    dpadMode = nextDpad === "arrows" ? "arrows" : "joystick";
    storage.set("dpad_mode", dpadMode);
    releaseAllHeldControls();
    syncControlUI();
  }

  function toggleDpadMode() {
    setDpadMode(dpadMode === "joystick" ? "arrows" : "joystick");
  }

  function ensureGlobalPad() {
    if (globalPadEl && globalPadEl.isConnected) {
      syncControlUI();
      return;
    }
    if (!dom.stage) return;

    const existing = document.getElementById("global-mini-controls");
    if (existing) {
      globalPadEl = existing;
      syncControlUI();
      return;
    }

    const pad = document.createElement("div");
    pad.id = "global-mini-controls";
    pad.className =
      "hidden pointer-events-none absolute inset-x-0 z-25 flex items-center justify-between px-3 py-2 touch-none select-none";
    pad.innerHTML = `
      <div class="pointer-events-auto flex items-center">
        <div id="gpad-joystick-container" class="touch-none select-none"></div>

        <div id="gpad-arrows-container" class="hidden flex items-center gap-1.5 sm:gap-2">
          <button type="button" data-gpad="left" aria-label="Links" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-cyan-400/40 bg-slate-900/85 text-cyan-200 font-bold text-base shadow-lg shadow-cyan-950/40 active:scale-95 active:bg-cyan-500/30 touch-none select-none">◀</button>
          <button type="button" data-gpad="right" aria-label="Rechts" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-cyan-400/40 bg-slate-900/85 text-cyan-200 font-bold text-base shadow-lg shadow-cyan-950/40 active:scale-95 active:bg-cyan-500/30 touch-none select-none">▶</button>
          <button type="button" data-gpad="up" aria-label="Hoch" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-emerald-400/40 bg-slate-900/85 text-emerald-200 font-bold text-base shadow-lg shadow-emerald-950/40 active:scale-95 active:bg-emerald-500/30 touch-none select-none">▲</button>
          <button type="button" data-gpad="down" aria-label="Runter" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-amber-400/40 bg-slate-900/85 text-amber-200 font-bold text-base shadow-lg shadow-amber-950/40 active:scale-95 active:bg-amber-500/30 touch-none select-none">▼</button>
        </div>
      </div>

      <div class="pointer-events-auto flex items-center">
        <button type="button" data-gpad="jump" aria-label="Springen" class="px-5 h-12 sm:h-13 rounded-2xl border border-cyan-300/60 bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-orbitron text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-cyan-500/35 active:scale-95 touch-none select-none">Springen</button>
      </div>
    `;

    // Virtual Joystick montieren
    const joystickContainer = pad.querySelector("#gpad-joystick-container");
    if (window.VirtualJoystick && joystickContainer) {
      virtualJoystickInstance = new window.VirtualJoystick({
        container: joystickContainer,
        onMove: ({ directions }) => {
          if (!activeGameId || isPaused) return;
          sound.ensureContext();
          setDirections(directions);
        },
        onRelease: () => {
          setDirections({ left: false, right: false, up: false, down: false });
        }
      });
      window.VIRTUAL_JOYSTICK = virtualJoystickInstance;
    }

    // Touch-Buttons für D-Pad und Jump
    pad.querySelectorAll("[data-gpad]").forEach((btn) => {
      const action = btn.getAttribute("data-gpad");

      const press = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof btn.setPointerCapture === "function") {
          try {
            btn.setPointerCapture(ev.pointerId);
          } catch (_) {}
        }
        if (!activeGameId || isPaused) return;
        sound.ensureContext();

        setDirection(action, true);
      };

      const release = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof btn.releasePointerCapture === "function") {
          try {
            btn.releasePointerCapture(ev.pointerId);
          } catch (_) {}
        }
        setDirection(action, false);
      };

      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointercancel", release);
      btn.addEventListener("contextmenu", (ev) => ev.preventDefault());
    });

    dom.stage.appendChild(pad);
    globalPadEl = pad;
    syncControlUI();
  }

  window.GLOBAL_MOBILE_CONTROLS = {
    get mode() {
      return controlMode;
    },
    setMode: setControlMode,
    get dpadMode() {
      return dpadMode;
    },
    setDpadMode,
    toggleDpadMode,
    held: heldControls,
    setDirection,
    setDirections,
    triggerJump: triggerGlobalJump,
    releaseAll: releaseAllHeldControls
  };

  function updateSoundButton() {
    if (!dom.soundBtn) return;
    dom.soundBtn.textContent = sound.muted ? "🔇 Aus" : "🔊 Sound";
  }

  function createHubContext(gameId) {
    return {
      gameId,
      stage: dom.stage,
      sound,
      controls: {
        get mode() {
          return controlMode;
        },
        held: heldControls,
        onJump(cb) {
          if (typeof cb === "function") {
            jumpListeners.add(cb);
            return () => jumpListeners.delete(cb);
          }
          return () => {};
        }
      },
      storage: {
        get: (k, fb) => storage.get(`${gameId}_${k}`, fb),
        set: (k, v) => storage.set(`${gameId}_${k}`, v)
      },
      exitToHub: () => exitToHub(),
      restartGame: () => launchGame(gameId),
      setSubtitle: (text) => {
        if (dom.headerSubtitle && text) {
          dom.headerSubtitle.textContent = text;
        }
      }
    };
  }

  function renderGameCards() {
    if (!dom.gameGrid) return;
    dom.gameGrid.innerHTML = "";

    const list = Array.from(games.values()).filter((g) => g && g.hidden !== true);

    if (list.length === 0) {
      dom.gameGrid.innerHTML = `
        <div class="col-span-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
          Keine Spiele registriert.
        </div>
      `;
      return;
    }

    for (const game of list) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "game-card text-left p-5 flex flex-col justify-between gap-4";
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-2xl">${game.icon || "🕹️"}</span>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-400/25">
              ${game.tag || "Arcade"}
            </span>
          </div>
          <h3 class="font-orbitron text-lg font-bold text-white">${game.name}</h3>
          <p class="text-sm text-slate-400 mt-1 leading-relaxed">${game.description || ""}</p>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-800/90 text-xs font-bold uppercase tracking-wider text-cyan-300">
          <span>Starten</span>
          <span>→</span>
        </div>
      `;
      card.addEventListener("click", () => {
        sound.ensureContext();
        sound.playHit();
        launchGame(game.id);
      });
      dom.gameGrid.appendChild(card);
    }
  }

  function destroyActiveGame() {
    if (rotatePauseTimer) {
      clearTimeout(rotatePauseTimer);
      rotatePauseTimer = null;
    }
    releaseAllHeldControls();
    jumpListeners.clear();
    if (virtualJoystickInstance) {
      virtualJoystickInstance.unmount();
      virtualJoystickInstance = null;
    }
    if (!activeGameId) return;
    const current = games.get(activeGameId);
    if (current && typeof current.destroy === "function") {
      try {
        current.destroy();
      } catch (err) {
        console.error(`Fehler beim Beenden von ${activeGameId}:`, err);
      }
    }
    activeGameId = null;
    isPaused = false;
    globalPadEl = null;
    dom.pauseOverlay.classList.add("hidden");
    dom.stage.innerHTML = "";
    syncControlUI();
  }

  function launchGame(gameId) {
    const game = games.get(gameId);
    if (!game) return;

    destroyActiveGame();

    activeGameId = gameId;
    if (window.GAME_REGISTRY) window.GAME_REGISTRY.activeId = gameId;
    isPaused = false;

    dom.hubView.classList.add("hidden");
    dom.stageWrapper.classList.remove("hidden");
    dom.homeBtn.classList.remove("hidden");
    dom.homeBtn.classList.add("inline-flex");
    dom.pauseBtn.classList.remove("hidden");
    dom.pauseBtn.textContent = "Pause";

    dom.headerTitle.textContent = game.name.toUpperCase();
    dom.headerSubtitle.textContent = game.subtitle || game.tag || "Minispiel";

    if (JOYSTICK_GAMES.has(gameId)) {
      ensureGlobalPad();
    }
    const ctx = createHubContext(gameId);

    if (typeof game.init === "function") {
      game.init(ctx);
    }
    if (JOYSTICK_GAMES.has(gameId)) {
      ensureGlobalPad();
    }
    syncControlUI();

    if (typeof game.resize === "function") {
      game.resize();
    }
    if (typeof game.start === "function") {
      game.start();
    }
  }

  function pauseActiveGame({ showOverlay = true } = {}) {
    if (!activeGameId || isPaused) return;
    const game = games.get(activeGameId);
    isPaused = true;
    releaseAllHeldControls();
    syncControlUI();
    dom.pauseBtn.textContent = "Weiter";
    if (showOverlay) {
      dom.pauseOverlay.classList.remove("hidden");
    }
    if (game && typeof game.pause === "function") {
      game.pause();
    }
  }

  function resumeActiveGame() {
    if (!activeGameId || !isPaused) return;
    const game = games.get(activeGameId);
    isPaused = false;
    syncControlUI();
    dom.pauseBtn.textContent = "Pause";
    dom.pauseOverlay.classList.add("hidden");
    if (game && typeof game.resume === "function") {
      game.resume();
    }
  }

  function triggerRotatePause() {
    if (!activeGameId || isPaused) return;
    pauseActiveGame({ showOverlay: false });
    if (rotatePauseTimer) clearTimeout(rotatePauseTimer);
    rotatePauseTimer = setTimeout(() => {
      rotatePauseTimer = null;
      const game = games.get(activeGameId);
      if (game && typeof game.resize === "function") {
        game.resize();
      }
      if (activeGameId && isPaused && dom.pauseOverlay.classList.contains("hidden")) {
        resumeActiveGame();
      }
    }, 160);
  }

  function exitToHub() {
    destroyActiveGame();
    dom.stageWrapper.classList.add("hidden");
    dom.hubView.classList.remove("hidden");
    dom.homeBtn.classList.add("hidden");
    dom.homeBtn.classList.remove("inline-flex");
    dom.pauseBtn.classList.add("hidden");
    dom.headerTitle.textContent = "NEON ARCADE HUB";
    dom.headerSubtitle.textContent = "Modular Mini Game Collection";
    syncControlUI();
    renderGameCards();
  }

  window.GAME_REGISTRY = {
    register(gameModule) {
      if (!gameModule || !gameModule.id) {
        console.warn("Spielmodul ohne gültige id ignoriert.", gameModule);
        return;
      }
      games.set(gameModule.id, gameModule);
      if (!activeGameId) {
        renderGameCards();
      }
    },
    get(id) {
      return games.get(id);
    },
    list() {
      return Array.from(games.values());
    }
  };

  window.addEventListener("orientationchange", () => {
    lastInnerW = window.innerWidth;
    lastInnerH = window.innerHeight;
    triggerRotatePause();
  });

  window.addEventListener("resize", () => {
    const curW = window.innerWidth;
    const curH = window.innerHeight;
    const flippedRatio =
      (lastInnerW > lastInnerH && curH > curW) ||
      (lastInnerH > lastInnerW && curW > curH);
    lastInnerW = curW;
    lastInnerH = curH;

    if (flippedRatio) {
      triggerRotatePause();
      return;
    }

    if (!activeGameId) return;
    const game = games.get(activeGameId);
    if (game && typeof game.resize === "function") {
      game.resize();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && activeGameId && !isPaused) {
      pauseActiveGame({ showOverlay: true });
    }
  });

  dom.hubCtrlJoystickBtn?.addEventListener("click", () => {
    sound.ensureContext();
    setDpadMode("joystick");
  });
  dom.hubCtrlArrowsBtn?.addEventListener("click", () => {
    sound.ensureContext();
    setDpadMode("arrows");
  });
  dom.homeBtn?.addEventListener("click", exitToHub);
  dom.exitToHubBtn?.addEventListener("click", exitToHub);
  dom.pauseBtn?.addEventListener("click", () => {
    if (isPaused) resumeActiveGame();
    else pauseActiveGame({ showOverlay: true });
  });
  dom.resumeBtn?.addEventListener("click", resumeActiveGame);
  dom.restartFromPauseBtn?.addEventListener("click", () => {
    if (activeGameId) launchGame(activeGameId);
  });
  dom.soundBtn?.addEventListener("click", () => {
    sound.ensureContext();
    sound.toggleMute();
  });

  updateSoundButton();
  syncControlUI();
  renderGameCards();

  // =========================================================
  // Automatischer Update- & Cache-Buster-Mechanismus für Handys
  // =========================================================
  const APP_VERSION = window.APP_VERSION || "2.3.1";

  // Bereinige etwaige alte / verwaiste Service Worker & Cache-Storage auf Mobilgeräten
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if (window.caches) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    }).catch(() => {});
  }

  let isCheckingUpdate = false;
  async function checkForAppUpdates() {
    if (isCheckingUpdate) return;
    isCheckingUpdate = true;
    try {
      const res = await fetch(`./version.json?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.version && data.version !== APP_VERSION) {
        console.log(`[App Update] Neue Version verfügbar: ${data.version} (aktuell: ${APP_VERSION}). Aktualisiere...`);
        if (window.caches) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch (_) {}
        }
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("_v", Date.now());
        window.location.replace(nextUrl.toString());
      }
    } catch (_) {
      // Offline oder Netzwerk-Fehler ignorieren
    } finally {
      isCheckingUpdate = false;
    }
  }

  // Update-Prüfung beim Start
  checkForAppUpdates();

  // Update-Prüfung, wenn der Tab wieder in den Vordergrund kommt (z. B. Handy entsperrt / App gewechselt)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      checkForAppUpdates();
    }
  });

  // Auf iOS Safari: Wenn Seite aus dem bfcache wiederhergestellt wird
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      checkForAppUpdates();
    }
  });
})();