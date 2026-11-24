const KEY_PREFIX = "solitaer_steckhalma_v1_";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // Ignorieren falls localStorage nicht verfügbar ist
  }
}

export function loadMuted() {
  return Boolean(readJSON("muted", false));
}

export function saveMuted(muted) {
  writeJSON("muted", Boolean(muted));
}

export function loadMode() {
  const mode = readJSON("mode", "classic");
  return mode === "european" ? "european" : "classic";
}

export function saveMode(mode) {
  writeJSON("mode", mode === "european" ? "european" : "classic");
}

export function loadBest(modeId) {
  return readJSON(`best_${modeId}`, null);
}

/**
 * Speichert eine abgeschlossene Partie, wenn sie besser ist als die bisherige Bestleistung:
 * 1. Weniger Reststeine
 * 2. Bei 1 Reststein: Perfekter Sieg schlägt normalen Sieg
 * 3. Bei gleicher Steinzahl (und gleichem Perfekt-Status): schnellere Zeit
 */
export function recordResult(modeId, { pegsLeft, elapsedSec, perfect }) {
  const prev = loadBest(modeId);
  const candidate = {
    bestPegs: pegsLeft,
    bestTimeSec: Math.max(0, Math.floor(elapsedSec)),
    perfect: Boolean(perfect)
  };

  let isNewRecord = false;
  if (!prev) {
    isNewRecord = true;
  } else if (candidate.bestPegs < prev.bestPegs) {
    isNewRecord = true;
  } else if (candidate.bestPegs === prev.bestPegs) {
    if (candidate.perfect && !prev.perfect) {
      isNewRecord = true;
    } else if (candidate.perfect === prev.perfect && candidate.bestTimeSec < prev.bestTimeSec) {
      isNewRecord = true;
    }
  }

  if (isNewRecord) {
    writeJSON(`best_${modeId}`, candidate);
  }

  return {
    isNewRecord,
    best: isNewRecord ? candidate : prev
  };
}

export function clearBest(modeId) {
  try {
    localStorage.removeItem(KEY_PREFIX + `best_${modeId}`);
  } catch {
    // Ignorieren
  }
}

export function formatTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export function formatBestSummary(best) {
  if (!best) return "–";
  const star = best.perfect ? "★" : "";
  return `${best.bestPegs}${star} · ${formatTime(best.bestTimeSec)}`;
}
