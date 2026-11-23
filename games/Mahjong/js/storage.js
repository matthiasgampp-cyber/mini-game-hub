// Persistenz via localStorage (Einstellungen + Bestzeiten pro Layout).
const SETTINGS_KEY = 'mahjong:settings:v1';
const BEST_PREFIX = 'mahjong:best:';

const DEFAULTS = { sound: true, dimBlocked: true, layout: 'turtle' };

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignorieren (z. B. privater Modus) */ }
}

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(safeGet(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}

/** Bestzeit in Millisekunden oder null. */
export function getBest(layoutId) {
  const v = Number(safeGet(BEST_PREFIX + layoutId));
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Speichert die Zeit, falls neuer Rekord. Gibt true bei Rekord zurück. */
export function submitTime(layoutId, ms) {
  const best = getBest(layoutId);
  if (best === null || ms < best) {
    safeSet(BEST_PREFIX + layoutId, String(Math.round(ms)));
    return true;
  }
  return false;
}

export function resetBest(layoutIds) {
  for (const id of layoutIds) {
    try { localStorage.removeItem(BEST_PREFIX + id); } catch { /* ignorieren */ }
  }
}

export function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
