import { LAYOUTS } from './layouts.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { SoundFx } from './audio.js';
import { GameTimer } from './timer.js';
import { loadSettings, saveSettings, getBest, submitTime, resetBest, formatTime } from './storage.js';

const $ = (id) => document.getElementById(id);

const settings = loadSettings();
const sfx = new SoundFx(settings.sound);
const renderer = new Renderer($('boardWrap'), $('board'));
const timer = new GameTimer((ms) => { $('timer').textContent = formatTime(ms); });

let game = null;
let layout = null;
let selected = null;
let hintTimer = null;
let stuckTimer = null;
let toastTimer = null;

/* ---------- Hilfsfunktionen ---------- */

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function applySettings() {
  document.body.classList.toggle('dim-blocked', settings.dimBlocked);
  $('optSound').checked = settings.sound;
  $('optDim').checked = settings.dimBlocked;
  sfx.enabled = settings.sound;
  $('btnSound').textContent = settings.sound ? '🔊' : '🔇';
  saveSettings(settings);
}

function updateBest() {
  const best = getBest(layout.id);
  $('bestTime').textContent = best ? formatTime(best) : '–';
}

function clearHint() {
  clearTimeout(hintTimer);
  renderer.clearHint();
}

function hideStuck() {
  clearTimeout(stuckTimer);
  $('stuckBanner').hidden = true;
}

function showModal(id, show) {
  $(id).hidden = !show;
}

/* ---------- Spielfluss ---------- */

function newGame() {
  clearHint();
  hideStuck();
  showModal('winModal', false);
  showModal('settingsModal', false);
  layout = LAYOUTS.find((l) => l.id === settings.layout) || LAYOUTS[0];
  $('layoutSelect').value = layout.id;
  game = new Game(layout);
  selected = null;
  renderer.build(game);
  timer.reset();
  timer.start();
  updateBest();
  refresh();
}

function refresh() {
  renderer.update(game);
  const moves = game.countMoves();
  $('movesCount').textContent = String(moves);
  $('movesStat').classList.toggle('zero', moves === 0 && !game.isWon);
  $('tilesLeft').textContent = String(game.remaining);
  $('btnUndo').disabled = !game.canUndo;

  if (game.isWon) {
    hideStuck();
    win();
    return;
  }
  if (moves === 0) {
    clearTimeout(stuckTimer);
    stuckTimer = setTimeout(() => {
      if (game && !game.isWon && game.countMoves() === 0) {
        $('stuckBanner').hidden = false;
        sfx.play('stuck');
      }
    }, 450);
  } else {
    hideStuck();
  }
}

function win() {
  timer.stop();
  const ms = timer.ms;
  const record = submitTime(layout.id, ms);
  sfx.play('win');
  $('winTime').textContent = formatTime(ms);
  $('winRecord').hidden = !record;
  const best = getBest(layout.id);
  $('winBest').textContent = best ? formatTime(best) : '–';
  updateBest();
  setTimeout(() => showModal('winModal', true), 500);
}

function onTileClick(id) {
  if (!game || game.isWon) return;
  sfx.unlock();
  clearHint();
  if (!game.tiles[id].alive) return;

  if (!game.isFree(id)) {
    renderer.shake(id);
    sfx.play('blocked');
    return;
  }
  if (selected === null) {
    selected = id;
    renderer.setSelected(id);
    sfx.play('select');
    return;
  }
  if (selected === id) {
    selected = null;
    renderer.setSelected(null);
    sfx.play('deselect');
    return;
  }
  if (game.matches(selected, id)) {
    const a = selected;
    selected = null;
    renderer.setSelected(null);
    game.remove(a, id);
    sfx.play('match');
    refresh();
  } else {
    selected = id;
    renderer.setSelected(id);
    sfx.play('error');
  }
}

function undo() {
  if (!game || !game.canUndo) return;
  clearHint();
  selected = null;
  renderer.setSelected(null);
  game.undo();
  sfx.play('undo');
  hideStuck();
  if (!timer.running) timer.start();
  refresh();
}

function hint() {
  if (!game || game.isWon) return;
  sfx.unlock();
  selected = null;
  renderer.setSelected(null);
  const moves = game.findMoves();
  if (!moves.length) {
    toast('Kein Zug verfügbar – bitte Undo oder Mischen nutzen.');
    return;
  }
  const [a, b] = moves[Math.floor(Math.random() * moves.length)];
  renderer.showHint(a, b);
  sfx.play('hint');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => renderer.clearHint(), 3500);
}

function shuffle() {
  if (!game || game.isWon) return;
  sfx.unlock();
  clearHint();
  selected = null;
  renderer.setSelected(null);
  if (game.shuffle()) {
    sfx.play('shuffle');
    hideStuck();
    toast('Gemischt – das Brett ist wieder lösbar.');
    refresh();
  } else {
    toast('Mischen nicht möglich – bitte einen Zug zurücknehmen.');
  }
}

/* ---------- Event-Verdrahtung ---------- */

function init() {
  for (const l of LAYOUTS) {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.name;
    $('layoutSelect').appendChild(opt);
  }
  $('layoutSelect').addEventListener('change', (e) => {
    settings.layout = e.target.value;
    saveSettings(settings);
    newGame();
  });

  $('board').addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (tile) onTileClick(Number(tile.dataset.id));
  });

  $('btnNew').addEventListener('click', () => { sfx.unlock(); newGame(); });
  $('btnUndo').addEventListener('click', undo);
  $('btnHint').addEventListener('click', hint);
  $('btnShuffle').addEventListener('click', shuffle);
  $('btnSound').addEventListener('click', () => {
    settings.sound = !settings.sound;
    applySettings();
    sfx.unlock();
    sfx.play('select');
  });
  $('btnSettings').addEventListener('click', () => showModal('settingsModal', true));
  $('closeSettings').addEventListener('click', () => showModal('settingsModal', false));
  $('optSound').addEventListener('change', (e) => { settings.sound = e.target.checked; applySettings(); });
  $('optDim').addEventListener('change', (e) => { settings.dimBlocked = e.target.checked; applySettings(); });
  $('btnResetBest').addEventListener('click', () => {
    resetBest(LAYOUTS.map((l) => l.id));
    updateBest();
    toast('Bestzeiten zurückgesetzt.');
  });

  $('stuckUndo').addEventListener('click', undo);
  $('stuckShuffle').addEventListener('click', shuffle);
  $('stuckNew').addEventListener('click', newGame);
  $('winAgain').addEventListener('click', newGame);
  $('winLayout').addEventListener('click', () => {
    showModal('winModal', false);
    $('layoutSelect').focus();
  });

  document.addEventListener('visibilitychange', () => {
    if (!game || game.isWon) return;
    if (document.hidden) timer.stop();
    else timer.start();
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'u' || e.key === 'z') undo();
    else if (e.key === 'h') hint();
    else if (e.key === 'm') shuffle();
    else if (e.key === 'n') newGame();
  });

  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'hub-pause') {
      if (game && !game.isWon) timer.stop();
    } else if (data.type === 'hub-resume') {
      if (game && !game.isWon) timer.start();
    } else if (data.type === 'hub-sound') {
      sfx.enabled = !data.muted && settings.sound;
    }
  });

  applySettings();
  newGame();
}

init();
