(() => {
  "use strict";

  /**
   * Blauis Welt – Level "Disco Raum" (Rhythmus- & Tanzspiel)
   * ------------------------------------------------------------------
   * Eigene Szene (custom: true): Das Hauptspiel ruft enter / update / draw /
   * onKey / onPointer / onPause / onResume / leave auf (siehe games/blauiswelt.js).
   *
   * NEUE LIEDER HINZUFÜGEN: einfach einen Eintrag in SONGS ergänzen, z. B.
   *   { id: "mein-song", title: "Mein Song", artist: "Ich", bpm: 124,
   *     audioSrc: "./assets/audio/mein-song.mp3", duration: 180, firstBeat: 0.35 }
   * - bpm        : Tempo des Liedes (bestimmt das Raster der Tanz-Symbole)
   * - duration   : Länge in Sekunden (wird bei geladener MP3 durch die echte Länge ersetzt)
   * - firstBeat  : Sekunde, in der der erste Schlag der MP3 liegt (optional, Standard 0)
   * - audioSrc   : Pfad zur MP3. Fehlt die Datei, spielt automatisch der Synth-Beat (Fallback).
   */
  const SONGS = [
    {
      id: "disco-demo",
      title: "Neon Nights",
      artist: "Blauis Synth-Band",
      bpm: 120,
      audioSrc: "./assets/audio/disco-demo.mp3",
      duration: 64,
      firstBeat: 0
    },
    {
      id: "wenn-es-passiert",
      title: "Wenn es passiert",
      artist: "Wir sind Helden",
      bpm: 115,
      audioSrc: "./assets/audio/wenn-es-passiert.mp3",
      duration: 213,
      firstBeat: 0.4
    }
  ];

  const W = 720;
  const H = 405;
  const TAU = Math.PI * 2;

  // Richtungs-Bits: oben 1, unten 2, links 4, rechts 8
  const MOVES = [
    { id: "finger", name: "Disco-Finger", short: "FINGER", mask: 1, arrow: "↑", color: "#f472b6", dur: 0.7 },
    { id: "duck", name: "Duck-Groove", short: "DUCK", mask: 2, arrow: "↓", color: "#fbbf24", dur: 0.7 },
    { id: "slideL", name: "Slide links", short: "SLIDE ←", mask: 4, arrow: "←", color: "#38bdf8", dur: 0.7 },
    { id: "slideR", name: "Slide rechts", short: "SLIDE →", mask: 8, arrow: "→", color: "#34d399", dur: 0.7 },
    { id: "spin", name: "Pirouette", short: "DREHUNG", mask: 5, arrow: "↖", color: "#c084fc", dur: 0.7 },
    { id: "star", name: "Stern-Pose", short: "STERN", mask: 9, arrow: "↗", color: "#fde047", dur: 0.7 },
    { id: "hip", name: "Hüftschwung", short: "HÜFTE", mask: 6, arrow: "↙", color: "#fb923c", dur: 0.7 },
    { id: "wave", name: "Arm-Welle", short: "WELLE", mask: 10, arrow: "↘", color: "#22d3ee", dur: 0.7 }
  ];
  const MOVE_BY_MASK = Object.fromEntries(MOVES.map((m) => [m.mask, m]));
  // Anordnung der Touch-Buttons wie eine Richtungsrose
  const BUTTON_ORDER = [4, 0, 5, 2, 3, 6, 1, 7];
  // Zusatztasten für die Diagonalen (PC): Q E Z C
  const KEY_MOVES = { q: 5, e: 9, z: 6, c: 10 };

  const JUDGE = {
    perfect: { text: "PERFEKT!", color: "#fde047", pts: 300, win: 0.11 },
    good: { text: "GUT", color: "#4ade80", pts: 200, win: 0.19 },
    ok: { text: "OK", color: "#38bdf8", pts: 100, win: 0.3 },
    miss: { text: "DANEBEN", color: "#f87171", pts: 0, win: 0.36 }
  };

  const SPEED = 140; // Pixel pro Sekunde in der Beat-Leiste (kleiner = längere Anlaufzeit)

  // --- Rundenkonfiguration ---
  const MAX_DURATION = 60; // Sekunden; pro Song mit song.maxDuration überschreibbar, gilt immer als Obergrenze
  const FADE_OUT = 3; // Sekunden Ausblenden vor Rundenende
  const BEATS_PER_MOVE = 2; // global: alle 2 (oder 4) Beats eine neue Bewegung; pro Song mit song.beatsPerMove
  MOVES.forEach((m) => (m.dur = 0.9)); // etwas gemütlichere Animationen

  /** Rundenlänge: nie länger als maxDuration, auch wenn die MP3 länger ist. */
  function songDuration(song) {
    const real = song._realDuration || song.duration;
    return Math.min(real, song.maxDuration ?? MAX_DURATION);
  }
  const RING_X = 96;
  const LANE_Y = 346;

  // ---------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function mulberry(seed) {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function buildChart(song) {
    const spb = 60 / song.bpm;
    const first = song.firstBeat || 0;
    const dur = songDuration(song);
    const totalBeats = Math.floor((dur - first) / spb);
    const rand = mulberry(hash(song.id));
    const notes = [];
    let prev = -1;
    const step = song.beatsPerMove || BEATS_PER_MOVE;
    let count = 0;
    for (let b = 4; b < totalBeats - FADE_OUT * (song.bpm / 60) - 1; b += step) {
      count++;
      if (count > 8 && count % 8 === 0) continue; // kurze Verschnaufpause
      const poolSize = count <= 8 ? 4 : 8; // zuerst nur die 4 Grundrichtungen
      let idx = Math.floor(rand() * poolSize);
      if (idx === prev) idx = (idx + 1 + Math.floor(rand() * (poolSize - 1))) % poolSize;
      prev = idx;
      notes.push({ t: first + b * spb, move: MOVES[idx], state: 0, fade: 0 });
    }
    return notes;
  }

  function loadHighscore(id) {
    try {
      return Number(localStorage.getItem(`blauiswelt_disco_hs_${id}`)) || 0;
    } catch (_) {
      return 0;
    }
  }
  function saveHighscore(id, v) {
    try {
      localStorage.setItem(`blauiswelt_disco_hs_${id}`, String(v));
    } catch (_) {}
  }

  // ---------------------------------------------------------------
  // Web-Audio 80er-Synth-Beat (Fallback, wenn keine MP3 vorhanden ist)
  // ---------------------------------------------------------------
  function createSynth(song, durationSec) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ac = new AC();
    const master = ac.createGain();
    master.gain.value = 0.55;
    const comp = ac.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ac.destination);

    const stepDur = 60 / song.bpm / 4;
    const t0 = ac.currentTime + 0.2;
    let step = 0;
    let timer = null;

    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const env = (g, t, a, peak, d) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    };
    const kick = (t) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      env(g, t, 0.005, 1, 0.3);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.35);
    };
    const noise = (t, hp, peak, d) => {
      const s = ac.createBufferSource();
      s.buffer = noiseBuf;
      const f = ac.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = hp;
      const g = ac.createGain();
      env(g, t, 0.002, peak, d);
      s.connect(f).connect(g).connect(master);
      s.start(t);
      s.stop(t + d + 0.05);
    };
    const tone = (t, freq, len, type, peak, cutoff) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(cutoff, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.3), t + len);
      const g = ac.createGain();
      env(g, t, 0.01, peak, len);
      o.connect(f).connect(g).connect(master);
      o.start(t);
      o.stop(t + len + 0.1);
    };

    // Am – F – C – G
    const roots = [55, 43.65, 65.41, 49];
    const triads = [[1, 1.189, 1.498], [1, 1.26, 1.498], [1, 1.26, 1.498], [1, 1.26, 1.498]];

    const playStep = (n, t) => {
      const bar = Math.floor(n / 16);
      const s = n % 16;
      const chord = bar % 4;
      const root = roots[chord];
      if (s % 4 === 0) kick(t);
      if (bar >= 1 && (s === 4 || s === 12)) {
        noise(t, 1800, 0.38, 0.17);
        tone(t, 190, 0.1, "triangle", 0.25, 3000);
      }
      if (s % 2 === 0) noise(t, 7500, s % 4 === 2 ? 0.16 : 0.07, s % 4 === 2 ? 0.09 : 0.04);
      if (bar >= 1 && s % 2 === 0 && s % 4 !== 0) tone(t, root * (s % 8 === 6 ? 2 : 1), stepDur * 1.6, "sawtooth", 0.3, 700);
      if (bar >= 1 && s % 4 === 0) tone(t, root, stepDur * 1.8, "sawtooth", 0.26, 650);
      if (bar >= 2 && (s === 0 || s === 10)) {
        triads[chord].forEach((r) => tone(t, root * 4 * r, stepDur * 3, "sawtooth", 0.05, 2400));
      }
      if (bar >= 4 && s % 2 === 0) {
        const arp = [0, 1, 2, 1, 2, 1, 0, 1][(s / 2) % 8];
        tone(t, root * 8 * triads[chord][arp], stepDur * 1.6, "square", 0.06, 3200);
      }
    };

    const pump = () => {
      while (t0 + step * stepDur < ac.currentTime + 0.3) {
        if (step * stepDur > durationSec) {
          clearInterval(timer);
          timer = null;
          return;
        }
        playStep(step, t0 + step * stepDur);
        step++;
      }
    };
    pump();
    timer = setInterval(pump, 40);

    return {
      kind: "synth",
      time: () => ac.currentTime - t0,
      setVolume(v) {
        master.gain.setTargetAtTime(0.55 * v, ac.currentTime, 0.05);
      },
      stop() {
        if (timer) clearInterval(timer);
        timer = null;
        try {
          master.gain.setTargetAtTime(0, ac.currentTime, 0.05);
          setTimeout(() => ac.close().catch(() => {}), 400);
        } catch (_) {}
      },
      pause() {
        ac.suspend().catch(() => {});
      },
      resume() {
        ac.resume().catch(() => {});
      }
    };
  }

  // ---------------------------------------------------------------
  // Tanz-Posen (p = 0..1 Fortschritt der Bewegung)
  // ---------------------------------------------------------------
  function poseFor(id, p) {
    const s = Math.sin(p * Math.PI);
    switch (id) {
      case "finger":
        return {
          armR: Math.PI * 0.88 + Math.sin(p * Math.PI * 4) * 0.18,
          armL: 1.25,
          rot: -0.07 * s,
          hip: 3 * s,
          dy: -3 * s,
          legs: [{ dx: 0, lift: 0 }, { dx: 4 * s, lift: 3 * s }]
        };
      case "duck":
        return {
          sy: 1 - 0.3 * s + Math.sin(p * Math.PI * 4) * 0.04,
          sx: 1 + 0.12 * s,
          armL: 1.0 + 0.5 * Math.sin(p * TAU * 2),
          armR: 1.0 - 0.5 * Math.sin(p * TAU * 2),
          legs: [{ dx: -5 * s, lift: 0 }, { dx: 5 * s, lift: 0 }]
        };
      case "slideL":
      case "slideR": {
        const d = id === "slideL" ? -1 : 1;
        const l = 4 * Math.abs(Math.sin(p * TAU * 2));
        return {
          dx: d * 46 * s,
          face: d,
          rot: d * 0.2 * s,
          armL: d > 0 ? 0.7 : 2.0,
          armR: d > 0 ? 2.0 : 0.7,
          legs: [{ dx: 0, lift: l }, { dx: 0, lift: 4 - l }]
        };
      }
      case "spin": {
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        return {
          sx: Math.cos(e * TAU * 1.0),
          dy: -9 * s,
          armL: 1.9,
          armR: 1.9,
          legs: [{ dx: 0, lift: 3 * s }, { dx: 0, lift: 0 }]
        };
      }
      case "star":
        return {
          dy: -28 * s,
          sx: 1 + 0.08 * s,
          armL: 2.5,
          armR: 2.5,
          legs: [{ dx: -10 * s, lift: 3 * s }, { dx: 10 * s, lift: 3 * s }]
        };
      case "hip": {
        const w = Math.sin(p * TAU * 2);
        return {
          hip: 9 * w,
          rot: -0.18 * w,
          bob: 1 + Math.abs(w),
          armL: 0.95,
          armR: 0.95,
          legs: [{ dx: 0, lift: Math.max(0, w) * 3 }, { dx: 0, lift: Math.max(0, -w) * 3 }]
        };
      }
      case "wave": {
        const w = p * TAU * 2;
        return {
          armL: 1.2 + 0.95 * Math.sin(w),
          armR: 1.2 + 0.95 * Math.sin(w - 1.4),
          rot: 0.07 * Math.sin(w),
          hip: 2 * Math.sin(w),
          bob: 1 + Math.abs(Math.sin(w))
        };
      }
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------
  // Szene
  // ---------------------------------------------------------------
  const scene = {
    id: "disco",
    name: "Disco Raum",
    subtitle: "80er Tanz-Rhythmus",
    custom: true,

    // --- Zustand ---
    state: "menu", // menu | playing | results
    clock: 0,
    songIndex: 0,
    beat: { idx: 0, phase: 0, pulse: 0, f: 0 },
    lastBeatIdx: -1,
    demoIdx: 0,
    dance: null,
    particles: [],
    judge: null,
    flash: new Array(8).fill(0),
    ui: [],
    stats: null,
    chart: [],
    audio: null,
    audioEnded: false,
    mask: 0,
    lastMask: 0,
    pending: null,
    game: null,
    results: null,

    // --- Lebenszyklus ---
    enter(game) {
      this.game = game;
      this.state = "menu";
      this.clock = 0;
      this.dance = null;
      this.particles = [];
      this.judge = null;
      this.mask = this.lastMask = 0;
      this.pending = null;
      this.lastBeatIdx = -1;
      this.probeSongs();
    },

    leave() {
      this.stopAudio();
      this.game = null;
    },

    onPause() {
      this.audio?.pause?.();
    },

    onResume() {
      if (this.state === "playing") this.audio?.resume?.();
    },

    probeSongs() {
      SONGS.forEach((song) => {
        if (!song.audioSrc || song._mp3 !== undefined || song._probing) return;
        song._probing = true;
        const a = new Audio();
        a.preload = "metadata";
        a.onloadedmetadata = () => {
          song._mp3 = true;
          if (Number.isFinite(a.duration) && a.duration > 5) song._realDuration = a.duration;
          song._probing = false;
        };
        a.onerror = () => {
          song._mp3 = false;
          song._probing = false;
        };
        a.src = song.audioSrc;
      });
    },

    stopAudio() {
      if (this.audio) {
        try {
          this.audio.stop();
        } catch (_) {}
      }
      this.audio = null;
    },

    // --- Song-Steuerung ---
    startSong() {
      const song = SONGS[this.songIndex];
      if (!song) return;
      this.stopAudio();
      this.song = song;
      this.chart = buildChart(song);
      this.stats = { score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, ok: 0, miss: 0 };
      this.audioEnded = false;
      this.judge = null;
      this.dance = null;
      this.mask = this.lastMask = 0;
      this.pending = null;
      this.endTimer = 0;
      this.state = "playing";
      this.beginAudio(song._mp3 === true);
    },

    beginAudio(useMp3) {
      this.stopAudio();
      const song = this.song;
      const dur = songDuration(song);
      if (useMp3) {
        const el = new Audio(song.audioSrc);
        el.volume = 0.9;
        el.onended = () => {
          this.audioEnded = true;
        };
        this.audio = {
          kind: "mp3",
          el,
          time: () => el.currentTime,
          setVolume(v) {
            el.volume = Math.max(0, Math.min(1, 0.9 * v));
          },
          stop() {
            el.pause();
            el.removeAttribute("src");
            el.load();
          },
          pause() {
            el.pause();
          },
          resume() {
            el.play().catch(() => {});
          }
        };
        el.play().catch(() => {
          // Autoplay/Decode-Fehler -> Synth-Beat
          if (this.state === "playing" && this.audio?.el === el) {
            song._mp3 = false;
            this.beginAudio(false);
          }
        });
      } else {
        this.audio = createSynth(song, dur);
        if (!this.audio) {
          // Kein Web-Audio: lautlos mit eigener Uhr weiterlaufen
          const start = performance.now();
          this.audio = { kind: "silent", time: () => (performance.now() - start) / 1000 - 0.2, stop() {}, pause() {}, resume() {} };
        }
      }
    },

    songTime() {
      return this.audio ? this.audio.time() : 0;
    },

    finishSong() {
      const st = this.stats;
      const total = this.chart.length || 1;
      const hits = st.perfect + st.good + st.ok;
      const acc = Math.round((hits / total) * 100);
      const prevHs = loadHighscore(this.song.id);
      const isNew = st.score > prevHs;
      if (isNew) saveHighscore(this.song.id, st.score);
      const grade = acc >= 95 ? "S" : acc >= 85 ? "A" : acc >= 70 ? "B" : acc >= 50 ? "C" : "D";
      this.results = { ...st, acc, grade, isNew, highscore: Math.max(prevHs, st.score), total };
      this.stopAudio();
      this.state = "results";
      this.dance = { move: MOVES[5], t0: this.clock };
    },

    quitToMenu() {
      this.stopAudio();
      this.state = "menu";
    },

    toHub() {
      this.stopAudio();
      this.game?.returnToHub?.("disco");
    },

    // --- Eingabe ---
    onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "escape" || k === "backspace") {
        e.preventDefault?.();
        if (this.state === "playing") this.quitToMenu();
        else this.toHub();
        return;
      }
      if (this.state === "menu" && !e.repeat) {
        if (k === "arrowup" || k === "w") this.songIndex = (this.songIndex + SONGS.length - 1) % SONGS.length;
        else if (k === "arrowdown" || k === "s") this.songIndex = (this.songIndex + 1) % SONGS.length;
      }
      if (this.state === "playing" && !e.repeat && KEY_MOVES[k]) {
        this.commitMove(MOVE_BY_MASK[KEY_MOVES[k]], this.songTime());
      }
    },

    onPointer(x, y) {
      for (let i = this.ui.length - 1; i >= 0; i--) {
        const b = this.ui[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.onButton(b.id);
          return;
        }
      }
    },

    onButton(id) {
      if (id.startsWith("m:")) {
        if (this.state === "playing") this.commitMove(MOVES[Number(id.slice(2))], this.songTime());
      } else if (id.startsWith("song:")) {
        this.songIndex = Number(id.slice(5));
      } else if (id === "start" || id === "again") {
        this.startSong();
      } else if (id === "hub") {
        this.toHub();
      } else if (id === "songs") {
        this.state = "menu";
      } else if (id === "quit") {
        this.quitToMenu();
      }
    },

    // --- Tanz-Logik ---
    commitMove(move, time) {
      if (!move || this.state !== "playing") return;
      const idx = MOVES.indexOf(move);
      this.flash[idx] = 0.25;
      this.dance = { move, t0: this.clock };

      // nächste unaufgelöste Note suchen
      let best = null;
      let bestD = Infinity;
      for (const n of this.chart) {
        if (n.state !== 0) continue;
        const d = Math.abs(n.t - time);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
        if (n.t - time > 0.5) break;
      }

      const st = this.stats;
      if (best && bestD <= JUDGE.miss.win) {
        if (best.move === move && bestD <= JUDGE.ok.win) {
          const key = bestD <= JUDGE.perfect.win ? "perfect" : bestD <= JUDGE.good.win ? "good" : "ok";
          const mult = Math.min(4, 1 + Math.floor(st.combo / 8));
          st.score += JUDGE[key].pts * mult;
          st.combo += 1;
          st.maxCombo = Math.max(st.maxCombo, st.combo);
          st[key] += 1;
          best.state = 1;
          best.fade = 0.25;
          this.setJudge(key);
          this.spawnHit(move, key === "perfect" ? 16 : 10);
          return;
        }
        // falsche Bewegung zur falschen Zeit
        best.state = 2;
        best.fade = 0.4;
        this.registerMiss();
        return;
      }
      // Tanzen ohne passende Note
      st.combo = 0;
      this.setJudge("miss");
    },

    registerMiss() {
      this.stats.miss += 1;
      this.stats.combo = 0;
      this.setJudge("miss");
    },

    setJudge(key) {
      const mult = Math.min(4, 1 + Math.floor(this.stats.combo / 8));
      this.judge = { key, text: JUDGE[key].text, color: JUDGE[key].color, t: 0, mult };
    },

    spawnHit(move, n) {
      const cx = 360 + (this.dance?.move?.id?.startsWith("slide") ? 0 : 0);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const sp = 60 + Math.random() * 150;
        this.particles.push({
          x: cx,
          y: 245,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 70,
          life: 0.7 + Math.random() * 0.4,
          max: 1.1,
          color: Math.random() < 0.5 ? move.color : "#ffffff",
          size: 2 + Math.random() * 2.4,
          ch: null
        });
      }
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: cx + (Math.random() - 0.5) * 80,
          y: 215 + Math.random() * 30,
          vx: (Math.random() - 0.5) * 70,
          vy: -50 - Math.random() * 50,
          life: 1.2,
          max: 1.2,
          color: move.color,
          size: 16 + Math.random() * 8,
          ch: ["♪", "♫", "♩", "♬"][i % 4]
        });
      }
    },

    // --- Update ---
    update(dt, game, action) {
      this.clock += dt;
      this.flash = this.flash.map((f) => Math.max(0, f - dt));
      if (this.judge) {
        this.judge.t += dt;
        if (this.judge.t > 0.9) this.judge = null;
      }
      this.particles = this.particles.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.ch ? 20 : 260) * dt;
        return p.life > 0;
      });

      // Musikuhr / Beat
      const song = this.state === "playing" ? this.song : null;
      const bpm = song ? song.bpm : 120;
      const first = song ? song.firstBeat || 0 : 0;
      const mt = song ? this.songTime() : this.clock;
      this.musicT = mt;
      const bf = (mt - first) * (bpm / 60);
      const bi = Math.floor(bf);
      this.beat = { f: bf, idx: bi, phase: bf - bi, pulse: Math.exp(-(bf - bi) * 3.5) };

      if (this.state === "menu" || this.state === "results") {
        if (bi !== this.lastBeatIdx && bi % 2 === 0) {
          this.dance = { move: MOVES[this.demoIdx++ % MOVES.length], t0: this.clock };
        }
        this.lastBeatIdx = bi;
        if (action) {
          if (this.state === "menu") this.startSong();
          else this.startSong();
        }
        return;
      }

      // --- playing ---
      this.processDirections(dt);

      for (const n of this.chart) {
        if (n.fade > 0) n.fade = Math.max(0, n.fade - dt);
        if (n.state === 0 && mt - n.t > JUDGE.ok.win) {
          n.state = 3;
          n.fade = 0.4;
          this.registerMiss();
        }
      }

      const dur = songDuration(song);
      // sanftes Ausblenden in den letzten Sekunden
      this.audio?.setVolume?.(Math.max(0, Math.min(1, (dur - mt) / FADE_OUT)));
      const last = this.chart.length ? this.chart[this.chart.length - 1].t : dur;
      if ((mt > dur + 0.3 || this.audioEnded || mt > last + 3) && this.chart.every((n) => n.state !== 0)) {
        this.endTimer += dt;
        if (this.endTimer > 0.8) this.finishSong();
      }
    },

    /** Richtungs-Eingabe (Tastatur / Joystick) -> 8 Tanzbewegungen. */
    processDirections() {
      const inp = this.game?.input || {};
      const mask = (inp.up ? 1 : 0) | (inp.down ? 2 : 0) | (inp.left ? 4 : 0) | (inp.right ? 8 : 0);
      const now = this.songTime();
      if (mask !== this.lastMask) {
        this.lastMask = mask;
        if (mask !== 0) {
          if (!this.pending) this.pending = { start: now, seen: mask, begun: performance.now() };
          else this.pending.seen |= mask;
        } else if (this.pending) {
          this.fire(this.pending.seen, this.pending.start);
          this.pending = null;
        }
      }
      // kurze Wartezeit, damit Diagonalen (zwei Tasten) sauber erkannt werden
      if (this.pending && performance.now() - this.pending.begun > 70) {
        this.fire(MOVE_BY_MASK[mask] ? mask : this.pending.seen, this.pending.start);
        this.pending = null;
      }
    },

    fire(mask, time) {
      const move = MOVE_BY_MASK[mask] || MOVE_BY_MASK[mask & 5] || MOVE_BY_MASK[mask & 10];
      if (move) this.commitMove(move, time);
    },

    // ---------------------------------------------------------------
    // Zeichnen
    // ---------------------------------------------------------------
    draw(ctx, t, game) {
      this.ui = [];
      const t2 = this.clock;
      const b = this.beat;
      this.drawWall(ctx, t2, b);
      this.drawSpots(ctx, t2, b);
      this.drawSpeakers(ctx, t2, b);
      this.drawDJ(ctx, t2, b);
      this.drawFloor(ctx, t2, b);
      this.drawDancer(ctx, t2, b);
      this.drawBall(ctx, t2, b);
      this.drawParticles(ctx);

      if (this.state === "playing") {
        this.drawHud(ctx);
        this.drawLane(ctx, t2, b);
        this.drawJudge(ctx);
        this.drawButtons(ctx);
      } else if (this.state === "menu") {
        this.drawMenu(ctx, t2);
      } else {
        this.drawResults(ctx, t2);
      }
    },

    text(ctx, str, x, y, size, color, align = "center", weight = 800, font = "Orbitron, Rajdhani, sans-serif") {
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    },

    button(ctx, id, label, x, y, w, h, color, opts = {}) {
      this.ui.push({ id, x, y, w, h });
      const lit = opts.lit || 0;
      ctx.save();
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, `rgba(25,10,60,${0.92})`);
      g.addColorStop(1, `rgba(60,20,110,${0.92})`);
      ctx.fillStyle = lit > 0 ? color : g;
      ctx.globalAlpha = lit > 0 ? 0.55 + lit * 1.2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, opts.r ?? 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = opts.selected ? 3 : 2;
      ctx.stroke();
      ctx.restore();
      if (label) this.text(ctx, label, x + w / 2, y + h / 2 + 1, opts.size || 12, "#fff", "center", 800);
    },

    drawWall(ctx, t, b) {
      const g = ctx.createLinearGradient(0, 0, 0, 200);
      g.addColorStop(0, "#08011a");
      g.addColorStop(1, "#240a52");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 80er-Neon-Wellen an der Wand
      ctx.save();
      ctx.lineWidth = 2.2;
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = `hsla(${(k * 70 + t * 40 + 280) % 360},95%,62%,${0.35 + 0.35 * b.pulse})`;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 10) {
          const y = 170 + k * 6 + Math.sin(x * 0.02 + t * 1.6 + k) * 5;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Neon-Schilder
      const flick = Math.sin(t * 23) > 0.93 ? 0.45 : 1;
      this.text(ctx, "DISCO", 96, 76, 30, `rgba(255,120,230,${flick})`, "center", 900);
      this.text(ctx, "'80s", 624, 76, 30, "#a5f3fc", "center", 900);
    },

    drawSpots(ctx, t, b) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const spots = [
        { x: 90, h: 300, c: 320, f: 0.9, p: 0 },
        { x: 630, h: 190, c: 190, f: 1.1, p: 2 },
        { x: 250, h: 120, c: 60, f: 1.3, p: 4 },
        { x: 470, h: 280, c: 120, f: 1.0, p: 1 }
      ];
      spots.forEach((s) => {
        const tx = s.x + Math.sin(t * s.f + s.p) * 170 + (360 - s.x) * 0.4;
        const ty = 300;
        const hue = (s.c + t * 20) % 360;
        const gr = ctx.createLinearGradient(s.x, 0, tx, ty);
        gr.addColorStop(0, `hsla(${hue},95%,70%,${0.32 + 0.2 * b.pulse})`);
        gr.addColorStop(1, `hsla(${hue},95%,60%,0.02)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(s.x - 6, 0);
        ctx.lineTo(s.x + 6, 0);
        ctx.lineTo(tx + 46, ty);
        ctx.lineTo(tx - 46, ty);
        ctx.fill();
      });
      ctx.restore();
    },

    drawSpeakers(ctx, t, b) {
      [46, 674].forEach((x) => {
        ctx.fillStyle = "#14082e";
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - 28, 112, 56, 110, 6);
        ctx.fill();
        ctx.stroke();
        [[146, 15], [194, 20]].forEach(([y, r], i) => {
          const rr = r * (1 + 0.12 * b.pulse * (i ? 1.2 : 0.8));
          const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, rr);
          g.addColorStop(0, "#6b7280");
          g.addColorStop(1, "#111827");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = `rgba(240,171,252,${0.5 + 0.5 * b.pulse})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      });
    },

    drawDJ(ctx, t, b) {
      // Equalizer-Balken im Takt
      const eq = (x0) => {
        for (let i = 0; i < 10; i++) {
          const level = 0.15 + 0.85 * Math.min(1, b.pulse * (0.45 + 0.55 * Math.abs(Math.sin(i * 1.7 + b.idx))) + 0.2 * Math.abs(Math.sin(t * 7 + i * 1.3)));
          const segs = Math.round(level * 9);
          for (let s = 0; s < 9; s++) {
            const lit = s < segs;
            ctx.fillStyle = s > 6 ? (lit ? "#ef4444" : "#3b0a0a") : s > 4 ? (lit ? "#facc15" : "#3b330a") : lit ? "#4ade80" : "#0a3b1a";
            ctx.fillRect(x0 + i * 12, 106 - s * 4.4, 9, 3.4);
          }
        }
      };
      eq(200);
      eq(396);

      // Pult
      const x = 190;
      const y = 112;
      const w = 340;
      const h = 52;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, "#2a1458");
      g.addColorStop(1, "#12072e");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#e879f9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();

      // Plattenteller
      [x + 62, x + w - 62].forEach((cx, di) => {
        const cy = y + 26;
        ctx.fillStyle = "#050509";
        ctx.beginPath();
        ctx.arc(cx, cy, 21, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        for (let r = 8; r < 20; r += 3) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, TAU);
          ctx.stroke();
        }
        const ang = t * (di ? -3.2 : 3.2);
        ctx.fillStyle = di ? "#22d3ee" : "#f472b6";
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * 19, cy + Math.sin(ang) * 19);
        ctx.stroke();
        // Tonarm
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 24, cy - 18);
        ctx.lineTo(cx + 8, cy + 4);
        ctx.stroke();
      });

      // Mischpult
      const mx = x + w / 2;
      ctx.fillStyle = "#0b0720";
      ctx.fillRect(mx - 40, y + 6, 80, 40);
      for (let i = 0; i < 4; i++) {
        const fx = mx - 30 + i * 20;
        ctx.fillStyle = "#334155";
        ctx.fillRect(fx - 1.5, y + 16, 3, 24);
        ctx.fillStyle = ["#f472b6", "#22d3ee", "#facc15", "#4ade80"][i];
        const fy = y + 20 + 12 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.5));
        ctx.fillRect(fx - 5, fy, 10, 5);
      }
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = (b.idx + i) % 2 ? "#ef4444" : "#4c0519";
        ctx.beginPath();
        ctx.arc(mx - 30 + i * 20, y + 11, 2.4, 0, TAU);
        ctx.fill();
      }
    },

    drawFloor(ctx, t, b) {
      const yT = 178;
      const yB = 324;
      const xTL = 190;
      const xTR = 530;
      const xBL = -40;
      const xBR = 760;
      const rows = 7;
      const cols = 10;
      const rr = (v) => Math.pow(v / rows, 1.35);
      const pt = (u, v) => {
        const r = rr(v);
        const l = lerp(xTL, xBL, r);
        const rt = lerp(xTR, xBR, r);
        return [lerp(l, rt, u / cols), lerp(yT, yB, r)];
      };
      ctx.fillStyle = "#07011a";
      ctx.fillRect(0, yT, W, yB - yT + 4);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const lit = (i + j + b.idx) % 2 === 0;
          const hue = (i * 34 + j * 22 + t * 45) % 360;
          const a = lit ? 0.3 + 0.65 * b.pulse : 0.14 + 0.1 * Math.sin(t * 2 + i + j);
          const [x1, y1] = pt(i, j);
          const [x2, y2] = pt(i + 1, j);
          const [x3, y3] = pt(i + 1, j + 1);
          const [x4, y4] = pt(i, j + 1);
          ctx.fillStyle = `hsla(${hue},90%,${lit ? 58 : 38}%,${a})`;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x3, y3);
          ctx.lineTo(x4, y4);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(240,171,252,0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      // Glow unter Blaui
      const g = ctx.createRadialGradient(360, 300, 4, 360, 300, 130);
      g.addColorStop(0, `rgba(255,255,255,${0.18 + 0.25 * b.pulse})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(200, 220, 320, 110);
    },

    drawDancer(ctx, t, b) {
      const d = this.dance;
      let pose = null;
      let facing = 1;
      let move = null;
      let p = 0;
      if (d) {
        p = (this.clock - d.t0) / d.move.dur;
        if (p < 1) {
          move = d.move;
          pose = poseFor(move.id, p);
          facing = pose?.face || 1;
        }
      }
      if (!pose) {
        const pl = b.pulse;
        pose = { bob: 2.2 * pl, sy: 1 - 0.03 * pl, armL: 0.35 + 0.3 * pl, armR: 0.35 + 0.3 * pl, rot: Math.sin(b.f * Math.PI) * 0.03, hip: Math.sin(b.f * Math.PI) * 2 };
      }
      const cx = 360;
      const cy = 304;

      // Aura / Effekt hinter Blaui
      if (move) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = move.color;
        ctx.globalAlpha = 0.7 * (1 - p);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy - 60, 30 + p * 90, 0, TAU);
        ctx.stroke();
        if (move.id === "star") {
          ctx.globalAlpha = 0.8 * Math.sin(p * Math.PI);
          ctx.fillStyle = move.color;
          ctx.translate(cx, cy - 70);
          ctx.rotate(p * 3);
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 ? 40 : 100;
            const a = (i * Math.PI) / 5;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      if (window.BLAUI_DRAW) {
        window.BLAUI_DRAW(ctx, cx, cy, { facing, t, scale: 1.75, pose });
      }
    },

    drawBall(ctx, t, b) {
      const bx = 360;
      const by = 46;
      const r = 22;
      ctx.strokeStyle = "rgba(226,232,240,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx, by - r);
      ctx.stroke();
      const g = ctx.createRadialGradient(bx - 7, by - 8, 2, bx, by, r);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.6, "#94a3b8");
      g.addColorStop(1, "#334155");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, TAU);
      ctx.fill();
      // Facetten
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, TAU);
      ctx.clip();
      ctx.strokeStyle = "rgba(15,23,42,0.45)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 8; i++) {
        const w = Math.cos(t * 1.2 + (i * Math.PI) / 8) * r;
        ctx.beginPath();
        ctx.ellipse(bx, by, Math.abs(w), r, 0, 0, TAU);
        ctx.stroke();
      }
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(bx - r, by + k * 6);
        ctx.lineTo(bx + r, by + k * 6);
        ctx.stroke();
      }
      for (let i = 0; i < 14; i++) {
        const a = t * 1.2 + i * 2.4;
        const sx = bx + Math.sin(a) * r * 0.8;
        const sy = by + Math.sin(i * 7.3) * r * 0.85;
        ctx.fillStyle = `hsla(${(i * 40 + t * 80) % 360},100%,80%,${0.5 + 0.5 * Math.sin(t * 6 + i)})`;
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
      ctx.restore();

      // wandernde Lichtpunkte im Raum
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 26; i++) {
        const a = t * (0.35 + (i % 5) * 0.06) + i * 1.7;
        const x = bx + Math.cos(a) * (150 + (i % 7) * 40);
        const y = 90 + (0.5 + 0.5 * Math.sin(a * 1.3 + i)) * 230;
        ctx.fillStyle = `hsla(${(i * 29 + t * 60) % 360},95%,70%,${0.25 + 0.35 * Math.abs(Math.sin(t * 3 + i))})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + b.pulse * 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    },

    drawParticles(ctx) {
      this.particles.forEach((p) => {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        if (p.ch) {
          ctx.font = `800 ${p.size}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = p.color;
          ctx.fillText(p.ch, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    },

    drawHud(ctx) {
      const st = this.stats;
      const mult = Math.min(4, 1 + Math.floor(st.combo / 8));
      ctx.save();
      ctx.fillStyle = "rgba(8,3,26,0.7)";
      ctx.beginPath();
      ctx.roundRect(8, 6, 330, 52, 10);
      ctx.fill();
      ctx.restore();
      this.text(ctx, String(st.score).padStart(6, "0"), 18, 24, 22, "#fde047", "left", 900);
      this.text(ctx, `COMBO ${st.combo}`, 168, 22, 13, "#f9a8d4", "left", 800);
      this.text(ctx, `×${mult}`, 168, 40, 15, mult > 1 ? "#4ade80" : "#94a3b8", "left", 900);
      this.text(ctx, `${this.song.title}`, 330, 22, 11, "#c7d2fe", "right", 700);

      const dur = songDuration(this.song);
      const prog = Math.max(0, Math.min(1, this.songTime() / dur));
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(18, 48, 310, 5);
      ctx.fillStyle = "#e879f9";
      ctx.fillRect(18, 48, 310 * prog, 5);

      this.button(ctx, "quit", "✕", 670, 8, 40, 30, "#f87171", { size: 14, r: 8 });

      // nächste Bewegung
      const next = this.chart.find((n) => n.state === 0);
      if (next) {
        const m = next.move;
        ctx.fillStyle = "rgba(8,3,26,0.75)";
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(8, 66, 170, 28, 14);
        ctx.fill();
        ctx.stroke();
        this.text(ctx, `${m.arrow}  ${m.name}`, 93, 81, 12, m.color, "center", 900);
      }
    },

    noteIcon(ctx, x, y, move, r, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = move.color;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = alpha;
      this.text(ctx, move.arrow, x, y + 1, r * 1.25, "#12072e", "center", 900, "sans-serif");
      ctx.globalAlpha = 1;
    },

    drawLane(ctx, t, b) {
      const now = this.songTime();
      ctx.fillStyle = "rgba(10,4,30,0.88)";
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(14, 322, 692, 44, 10);
      ctx.fill();
      ctx.stroke();

      // Beat-Raster
      const spb = 60 / this.song.bpm;
      const first = this.song.firstBeat || 0;
      const k0 = Math.ceil((now - first - 0.4) / spb);
      for (let k = k0; k < k0 + 14; k++) {
        const x = RING_X + (first + k * spb - now) * SPEED;
        if (x < 40 || x > 700) continue;
        ctx.fillStyle = k % 4 === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)";
        ctx.fillRect(x - 1, 328, 2, 32);
      }

      // Noten
      for (let i = this.chart.length - 1; i >= 0; i--) {
        const n = this.chart[i];
        const x = RING_X + (n.t - now) * SPEED;
        if (x > 700 || x < RING_X - 60) continue;
        if (n.state === 0) this.noteIcon(ctx, x, LANE_Y, n.move, 15);
        else if (n.state === 1) {
          if (n.fade > 0) this.noteIcon(ctx, RING_X, LANE_Y, n.move, 15 + (1 - n.fade / 0.25) * 12, n.fade / 0.25);
        } else if (n.fade > 0) {
          ctx.globalAlpha = n.fade / 0.4;
          this.noteIcon(ctx, x, LANE_Y, { ...n.move, color: "#64748b" }, 13, 0.6 * (n.fade / 0.4));
          ctx.globalAlpha = 1;
        }
      }

      // Zielring
      ctx.save();
      ctx.strokeStyle = "rgba(232, 121, 249, 0.35)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(RING_X, LANE_Y, 20 + 3 * b.pulse, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    },

    drawJudge(ctx) {
      const j = this.judge;
      if (!j) return;
      const a = Math.max(0, 1 - j.t / 0.9);
      const sc = 1 + Math.max(0, 0.35 - j.t * 1.4);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(360, 188 - j.t * 24);
      ctx.scale(sc, sc);
      this.text(ctx, j.text, 0, 0, 30, j.color, "center", 900);
      if (j.key !== "miss" && j.mult > 1) this.text(ctx, `COMBO ×${j.mult}`, 0, 28, 13, "#fff", "center", 800);
      ctx.restore();
    },

    drawButtons(ctx) {
      const bw = 82;
      const gap = 4;
      const x0 = (W - (8 * bw + 7 * gap)) / 2;
      BUTTON_ORDER.forEach((mi, i) => {
        const m = MOVES[mi];
        const x = x0 + i * (bw + gap);
        this.button(ctx, `m:${mi}`, "", x, 370, bw, 31, m.color, { lit: this.flash[mi] * 4, r: 9 });
        this.text(ctx, m.arrow, x + 16, 386, 18, m.color, "center", 900, "sans-serif");
        this.text(ctx, m.short, x + 52, 386, 9, "#fff", "center", 800);
      });
    },

    drawMenu(ctx, t) {
      ctx.fillStyle = "rgba(5,1,20,0.62)";
      ctx.fillRect(0, 0, W, H);
      const px = 170;
      const pw = 380;
      const py = 46;
      const ph = 316;
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(46,16,101,0.95)");
      g.addColorStop(1, "rgba(15,5,40,0.95)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#e879f9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();

      this.text(ctx, "🎧 DJ-PULT", 360, py + 26, 20, "#fff", "center", 900);
      this.text(ctx, "Song wählen und Musik starten", 360, py + 48, 11, "#c4b5fd", "center", 700, "Rajdhani, sans-serif");

      // Songliste (max. 3 sichtbar, scrollt mit Auswahl)
      const visible = 3;
      const start = Math.max(0, Math.min(this.songIndex - 1, SONGS.length - visible));
      SONGS.slice(start, start + visible).forEach((s, i) => {
        const idx = start + i;
        const y = py + 64 + i * 46;
        const sel = idx === this.songIndex;
        this.button(ctx, `song:${idx}`, "", px + 18, y, pw - 36, 40, sel ? "#facc15" : "#7c3aed", { selected: sel, r: 10 });
        this.text(ctx, `${sel ? "▶ " : ""}${s.title}`, px + 32, y + 14, 13, sel ? "#fde047" : "#fff", "left", 900);
        const src = s._mp3 === true ? "MP3" : s._mp3 === false ? "Synth-Beat" : "…";
        const dur = songDuration(s);
        this.text(ctx, `${s.artist || ""} · ${s.bpm} BPM · ${fmtTime(dur)} · ${src}`, px + 32, y + 29, 10, "#c4b5fd", "left", 600, "Rajdhani, sans-serif");
        const hs = loadHighscore(s.id);
        if (hs) this.text(ctx, `★ ${hs}`, px + pw - 30, y + 14, 11, "#fde047", "right", 800);
      });

      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      this.button(ctx, "start", "▶  MUSIK STARTEN", px + 40, py + 214, pw - 80, 36, "#4ade80", { size: 14, lit: pulse * 0.08 });
      this.button(ctx, "hub", "↩  ZURÜCK ZUR OBERWELT", px + 40, py + 258, pw - 80, 30, "#38bdf8", { size: 11 });
      this.text(ctx, "↑↓ Song · Aktion/Enter Start · Esc Zurück", 360, py + 302, 9, "#a78bfa", "center", 700, "Rajdhani, sans-serif");
    },

    drawResults(ctx, t) {
      const r = this.results;
      if (!r) return;
      ctx.fillStyle = "rgba(5,1,20,0.7)";
      ctx.fillRect(0, 0, W, H);
      const px = 150;
      const pw = 420;
      const py = 34;
      const ph = 340;
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, "rgba(46,16,101,0.96)");
      g.addColorStop(1, "rgba(15,5,40,0.96)");
      ctx.fillStyle = g;
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 18);
      ctx.fill();
      ctx.stroke();

      this.text(ctx, "AUSWERTUNG", 360, py + 24, 18, "#fff", "center", 900);
      this.text(ctx, this.song.title, 360, py + 44, 11, "#c4b5fd", "center", 700, "Rajdhani, sans-serif");

      const gradeCol = { S: "#fde047", A: "#4ade80", B: "#38bdf8", C: "#fb923c", D: "#f87171" }[r.grade];
      this.text(ctx, r.grade, px + 70, py + 110, 70 + 4 * Math.sin(t * 4), gradeCol, "center", 900);

      this.text(ctx, "PUNKTE", px + 150, py + 80, 11, "#c4b5fd", "left", 700);
      this.text(ctx, String(r.score), px + 150, py + 104, 28, "#fde047", "left", 900);
      this.text(ctx, `Trefferquote: ${r.acc}%  (${r.perfect + r.good + r.ok}/${r.total})`, px + 150, py + 132, 13, "#fff", "left", 800);
      this.text(ctx, `Max. Combo: ${r.maxCombo}`, px + 150, py + 152, 12, "#f9a8d4", "left", 700);

      const hsTxt = r.isNew ? `🏆 NEUER HIGHSCORE: ${r.highscore}` : `Highscore: ${r.highscore}`;
      this.text(ctx, hsTxt, 360, py + 186, 14, r.isNew ? "#4ade80" : "#fde047", "center", 900);

      const row = (label, val, col, x) => {
        this.text(ctx, label, x, py + 214, 10, col, "center", 800);
        this.text(ctx, String(val), x, py + 232, 18, "#fff", "center", 900);
      };
      row("PERFEKT", r.perfect, JUDGE.perfect.color, px + 60);
      row("GUT", r.good, JUDGE.good.color, px + 150);
      row("OK", r.ok, JUDGE.ok.color, px + 240);
      row("DANEBEN", r.miss, JUDGE.miss.color, px + 340);

      this.button(ctx, "again", "↻  NOCHMAL", px + 30, py + 252, 175, 34, "#4ade80", { size: 13 });
      this.button(ctx, "songs", "🎵  SONGLISTE", px + 215, py + 252, 175, 34, "#c084fc", { size: 12 });
      this.button(ctx, "hub", "↩  ZURÜCK ZUR OBERWELT", px + 30, py + 294, 360, 30, "#38bdf8", { size: 11 });
    }
  };

  window.BLAUIS_WELT_LEVELS?.register(scene);
  window.BLAUIS_DISCO_SONGS = SONGS;
})();
