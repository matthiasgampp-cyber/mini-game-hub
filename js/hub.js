(() => {
  "use strict";

  const STORAGE_PREFIX = "neon_hub_v1_";

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

  const games = new Map();
  let activeGameId = null;
  let isPaused = false;

  const dom = {
    hubView: document.getElementById("hub-view"),
    stageWrapper: document.getElementById("game-stage-wrapper"),
    stage: document.getElementById("game-stage"),
    gameGrid: document.getElementById("game-grid"),
    homeBtn: document.getElementById("hub-home-btn"),
    pauseBtn: document.getElementById("pause-toggle-btn"),
    soundBtn: document.getElementById("sound-toggle-btn"),
    headerTitle: document.getElementById("header-title"),
    headerSubtitle: document.getElementById("header-subtitle"),
    pauseOverlay: document.getElementById("pause-overlay"),
    resumeBtn: document.getElementById("resume-btn"),
    restartFromPauseBtn: document.getElementById("restart-from-pause-btn"),
    exitToHubBtn: document.getElementById("exit-to-hub-btn")
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
      const badgeColor = game.accent || "cyan";
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
    dom.pauseOverlay.classList.add("hidden");
    dom.stage.innerHTML = "";
  }

  function launchGame(gameId) {
    const game = games.get(gameId);
    if (!game) return;

    destroyActiveGame();

    activeGameId = gameId;
    isPaused = false;

    dom.hubView.classList.add("hidden");
    dom.stageWrapper.classList.remove("hidden");
    dom.homeBtn.classList.remove("hidden");
    dom.homeBtn.classList.add("inline-flex");
    dom.pauseBtn.classList.remove("hidden");
    dom.pauseBtn.textContent = "Pause";

    dom.headerTitle.textContent = game.name.toUpperCase();
    dom.headerSubtitle.textContent = game.subtitle || game.tag || "Minispiel";

    const ctx = createHubContext(gameId);

    if (typeof game.init === "function") {
      game.init(ctx);
    }
    if (typeof game.resize === "function") {
      game.resize();
    }
    if (typeof game.start === "function") {
      game.start();
    }
  }

  function pauseActiveGame() {
    if (!activeGameId || isPaused) return;
    const game = games.get(activeGameId);
    isPaused = true;
    dom.pauseBtn.textContent = "Weiter";
    dom.pauseOverlay.classList.remove("hidden");
    if (game && typeof game.pause === "function") {
      game.pause();
    }
  }

  function resumeActiveGame() {
    if (!activeGameId || !isPaused) return;
    const game = games.get(activeGameId);
    isPaused = false;
    dom.pauseBtn.textContent = "Pause";
    dom.pauseOverlay.classList.add("hidden");
    if (game && typeof game.resume === "function") {
      game.resume();
    }
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

  window.addEventListener("resize", () => {
    if (!activeGameId) return;
    const game = games.get(activeGameId);
    if (game && typeof game.resize === "function") {
      game.resize();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && activeGameId && !isPaused) {
      pauseActiveGame();
    }
  });

  dom.homeBtn?.addEventListener("click", exitToHub);
  dom.exitToHubBtn?.addEventListener("click", exitToHub);
  dom.pauseBtn?.addEventListener("click", () => {
    if (isPaused) resumeActiveGame();
    else pauseActiveGame();
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
  renderGameCards();
})();