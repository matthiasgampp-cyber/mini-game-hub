import {
  BOARD_SIZE,
  CELL_EMPTY,
  CELL_INVALID,
  CELL_PEG,
  PegSolitaireGame
} from "./game.js";
import { WoodSoundEngine } from "./audio.js";
import {
  clearBest,
  formatBestSummary,
  formatTime,
  loadBest,
  loadMode,
  loadMuted,
  recordResult,
  saveMode,
  saveMuted
} from "./storage.js";

const DRAG_THRESHOLD_PX = 6;
const JUMP_ANIM_MS = 210;
const CAPTURE_ANIM_MS = 230;

const dom = {
  board: document.getElementById("board"),
  boardFrame: document.querySelector(".board-frame"),
  fxLayer: document.getElementById("fxLayer"),
  modeBadge: document.getElementById("modeBadge"),

  statPegs: document.getElementById("statPegs"),
  statMoves: document.getElementById("statMoves"),
  statTime: document.getElementById("statTime"),
  statBest: document.getElementById("statBest"),

  btnSound: document.getElementById("btnSound"),
  soundIcon: document.getElementById("soundIcon"),
  btnMenu: document.getElementById("btnMenu"),
  btnUndo: document.getElementById("btnUndo"),
  btnHint: document.getElementById("btnHint"),
  btnRestart: document.getElementById("btnRestart"),

  toast: document.getElementById("toast"),

  endModal: document.getElementById("endModal"),
  endIcon: document.getElementById("endIcon"),
  endTitle: document.getElementById("endTitle"),
  endSubtitle: document.getElementById("endSubtitle"),
  endPegs: document.getElementById("endPegs"),
  endMoves: document.getElementById("endMoves"),
  endTime: document.getElementById("endTime"),
  endRecord: document.getElementById("endRecord"),
  btnEndUndo: document.getElementById("btnEndUndo"),
  btnEndRestart: document.getElementById("btnEndRestart"),

  confirmModal: document.getElementById("confirmModal"),
  btnConfirmCancel: document.getElementById("btnConfirmCancel"),
  btnConfirmOk: document.getElementById("btnConfirmOk"),

  menuModal: document.getElementById("menuModal"),
  btnCloseMenu: document.getElementById("btnCloseMenu"),
  btnMenuDone: document.getElementById("btnMenuDone"),
  btnResetBest: document.getElementById("btnResetBest"),
  modeOptions: Array.from(document.querySelectorAll(".mode-option"))
};

const game = new PegSolitaireGame(loadMode());
const sound = new WoodSoundEngine(loadMuted());

let cellEls = [];
let selected = null; // { r, c, moves: [...] }
let hintMove = null;
let hintTimerId = null;
let toastTimerId = null;
let isAnimating = false;
let gameEnded = false;

// Timer-Zustand
let elapsedSeconds = 0;
let timerIntervalId = null;
let timerStarted = false;
let pausedByHub = false;

// Pointer-Drag-Zustand
let dragState = null;

/* =========================================================
   TIMER
   ========================================================= */
function startTimerIfNeeded() {
  if (timerStarted || gameEnded || pausedByHub) return;
  timerStarted = true;
  resumeTimer();
}

function resumeTimer() {
  if (!timerStarted || gameEnded || pausedByHub || timerIntervalId !== null) return;
  timerIntervalId = window.setInterval(() => {
    elapsedSeconds += 1;
    dom.statTime.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function pauseTimer() {
  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function resetTimer() {
  pauseTimer();
  elapsedSeconds = 0;
  timerStarted = false;
  dom.statTime.textContent = "00:00";
}

/* =========================================================
   TOAST & SOUND UI
   ========================================================= */
function showToast(message, durationMs = 2000) {
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  if (toastTimerId) window.clearTimeout(toastTimerId);
  toastTimerId = window.setTimeout(() => {
    dom.toast.hidden = true;
    toastTimerId = null;
  }, durationMs);
}

function updateSoundUI() {
  dom.soundIcon.textContent = sound.muted ? "🔇" : "🔊";
  dom.btnSound.classList.toggle("is-muted", sound.muted);
  dom.btnSound.setAttribute("aria-pressed", String(sound.muted));
}

function toggleSound() {
  sound.setMuted(!sound.muted);
  saveMuted(sound.muted);
  updateSoundUI();
  if (!sound.muted) {
    sound.playSelect();
  }
}

/* =========================================================
   SPIELBRETT-AUFBAU & RENDERING
   ========================================================= */
function buildBoardDOM() {
  dom.board.innerHTML = "";
  cellEls = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE));

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.setAttribute("role", "gridcell");

      const val = game.getCell(r, c);
      if (val === CELL_INVALID) {
        cell.classList.add("invalid");
        cell.setAttribute("aria-hidden", "true");
      } else {
        if (game.isGoalCell(r, c)) {
          cell.classList.add("is-goal");
        }
        const hole = document.createElement("div");
        hole.className = "hole";
        cell.appendChild(hole);
      }

      dom.board.appendChild(cell);
      cellEls[r][c] = cell;
    }
  }
}

function clearHint() {
  hintMove = null;
  if (hintTimerId) {
    window.clearTimeout(hintTimerId);
    hintTimerId = null;
  }
}

function clearSelection() {
  selected = null;
}

function renderStats() {
  dom.statPegs.textContent = String(game.pegsLeft);
  dom.statMoves.textContent = String(game.moves);
  dom.statTime.textContent = formatTime(elapsedSeconds);
  dom.statBest.textContent = formatBestSummary(loadBest(game.modeId));
  dom.modeBadge.textContent = game.mode.badge;
  dom.btnUndo.disabled = !game.canUndo() || isAnimating;
  dom.btnHint.disabled = gameEnded || isAnimating;
}

function renderBoard({ skipCell = null, restoringCells = [] } = {}) {
  const targetKeys = new Set();
  if (selected) {
    for (const m of selected.moves) {
      targetKeys.add(`${m.toR},${m.toC}`);
    }
  }

  const restoreSet = new Set(restoringCells.map((p) => `${p.r},${p.c}`));

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = cellEls[r][c];
      const val = game.getCell(r, c);
      if (val === CELL_INVALID) continue;

      const hole = cell.firstElementChild;
      const key = `${r},${c}`;
      const isSelected = Boolean(selected && selected.r === r && selected.c === c);
      const isTarget = targetKeys.has(key);
      const isHintFrom = Boolean(hintMove && hintMove.fromR === r && hintMove.fromC === c);
      const isHintTo = Boolean(hintMove && hintMove.toR === r && hintMove.toC === c);
      const canMove = val === CELL_PEG && game.getValidMovesFrom(r, c).length > 0;

      cell.classList.toggle("is-selected", isSelected);
      cell.classList.toggle("is-target", isTarget);
      cell.classList.toggle("is-hint-from", isHintFrom);
      cell.classList.toggle("is-hint-to", isHintTo);
      cell.classList.toggle("can-move", canMove);
      if (!dragState) {
        cell.classList.remove("is-dragging-source", "is-drop-hover");
      }

      if (skipCell && skipCell.r === r && skipCell.c === c) {
        continue;
      }

      const existingPeg = hole.querySelector(".peg");
      if (val === CELL_PEG) {
        if (!existingPeg) {
          const peg = document.createElement("div");
          peg.className = "peg";
          if (restoreSet.has(key)) {
            peg.classList.add("is-restoring");
          }
          hole.appendChild(peg);
        } else {
          existingPeg.classList.remove("is-capturing");
        }
      } else if (existingPeg && !existingPeg.classList.contains("is-capturing")) {
        existingPeg.remove();
      }
    }
  }

  renderStats();
}

/* =========================================================
   KOORDINATEN & ANIMATIONEN
   ========================================================= */
function getHoleCenterInFrame(r, c) {
  const frameRect = dom.boardFrame.getBoundingClientRect();
  const holeRect = cellEls[r][c].firstElementChild.getBoundingClientRect();
  return {
    x: holeRect.left + holeRect.width / 2 - frameRect.left,
    y: holeRect.top + holeRect.height / 2 - frameRect.top,
    size: holeRect.width * 0.92
  };
}

function executeMove(move, { fromDrag = false } = {}) {
  if (isAnimating || gameEnded) return;

  const fromPos = getHoleCenterInFrame(move.fromR, move.fromC);
  const toPos = getHoleCenterInFrame(move.toR, move.toC);

  const result = game.makeMove(move.fromR, move.fromC, move.toR, move.toC);
  if (!result) return;

  startTimerIfNeeded();
  clearSelection();
  clearHint();
  isAnimating = true;

  // 1. Übersprungenen Stein sanft schrumpfen & ausblenden
  const overHole = cellEls[move.overR][move.overC].firstElementChild;
  const overPeg = overHole.querySelector(".peg");
  if (overPeg) {
    overPeg.classList.add("is-capturing");
    window.setTimeout(() => {
      if (overPeg.parentNode) overPeg.remove();
    }, CAPTURE_ANIM_MS);
  }

  // 2. Ausgangsstein entfernen
  const fromPeg = cellEls[move.fromR][move.fromC].firstElementChild.querySelector(".peg");
  if (fromPeg) fromPeg.remove();

  // Wenn per Drag & Drop abgelegt: direkt einrasten, sonst Bogen-Sprung animieren
  if (fromDrag) {
    sound.playJump();
    renderBoard();
    window.setTimeout(() => {
      isAnimating = false;
      renderStats();
      handlePostMoveStatus(result.status);
    }, 140);
    return;
  }

  // Bogen-Sprung-Animation über die FX-Ebene
  renderBoard({ skipCell: { r: move.toR, c: move.toC } });

  const fxPeg = document.createElement("div");
  fxPeg.className = "fx-peg";
  fxPeg.style.width = `${fromPos.size}px`;
  fxPeg.style.height = `${fromPos.size}px`;
  fxPeg.style.left = `${fromPos.x}px`;
  fxPeg.style.top = `${fromPos.y}px`;
  fxPeg.style.transform = "translate(-50%, -50%)";
  dom.fxLayer.appendChild(fxPeg);

  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const liftY = -Math.max(10, fromPos.size * 0.28);

  const anim = fxPeg.animate(
    [
      { transform: "translate(-50%, -50%) scale(1.04)" },
      {
        transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 + liftY}px)) scale(1.18)`,
        offset: 0.5
      },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)` }
    ],
    {
      duration: JUMP_ANIM_MS,
      easing: "cubic-bezier(0.28, 0.84, 0.42, 1)",
      fill: "forwards"
    }
  );

  sound.playJump();

  anim.onfinish = () => {
    fxPeg.remove();
    isAnimating = false;
    renderBoard();
    handlePostMoveStatus(result.status);
  };
}

function handlePostMoveStatus(status) {
  if (status === "playing") return;

  gameEnded = true;
  pauseTimer();

  const isPerfect = status === "perfect_win";
  const isWin = status === "win" || isPerfect;

  const { isNewRecord } = recordResult(game.modeId, {
    pegsLeft: game.pegsLeft,
    elapsedSec: elapsedSeconds,
    perfect: isPerfect
  });

  renderStats();

  if (isWin) {
    sound.playWin(isPerfect);
  } else {
    sound.playDeadlock();
  }

  openEndModal({ status, isNewRecord });
}

/* =========================================================
   STEUERUNG: KLICK/TAP & DRAG & DROP (POINTER EVENTS)
   ========================================================= */
function getCellFromEvent(e) {
  const cell = e.target.closest(".cell");
  if (!cell || cell.classList.contains("invalid")) return null;
  return {
    r: Number(cell.dataset.r),
    c: Number(cell.dataset.c),
    el: cell
  };
}

function findClosestDropTarget(clientX, clientY, validMoves) {
  let bestMove = null;
  let bestDist = Infinity;

  for (const m of validMoves) {
    const holeRect = cellEls[m.toR][m.toC].firstElementChild.getBoundingClientRect();
    const cx = holeRect.left + holeRect.width / 2;
    const cy = holeRect.top + holeRect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    const snapRadius = Math.max(holeRect.width * 0.95, 34);

    if (dist <= snapRadius && dist < bestDist) {
      bestDist = dist;
      bestMove = m;
    }
  }

  return bestMove;
}

function setDropHoverCell(move) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      cellEls[r][c].classList.remove("is-drop-hover");
    }
  }
  if (move) {
    cellEls[move.toR][move.toC].classList.add("is-drop-hover");
  }
}

function cleanupDrag() {
  if (!dragState) return;
  if (dragState.fxPeg && dragState.fxPeg.parentNode) {
    dragState.fxPeg.remove();
  }
  const srcCell = cellEls[dragState.fromR]?.[dragState.fromC];
  if (srcCell) srcCell.classList.remove("is-dragging-source");
  setDropHoverCell(null);
  dragState = null;
}

dom.board.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  if (isAnimating || gameEnded) return;

  const target = getCellFromEvent(e);
  if (!target) {
    if (selected) {
      clearSelection();
      renderBoard();
    }
    return;
  }

  const val = game.getCell(target.r, target.c);

  // Fall A: Klick auf ein leeres Feld (Zielfeld eines ausgewählten Steins?)
  if (val === CELL_EMPTY) {
    if (selected) {
      const move = selected.moves.find((m) => m.toR === target.r && m.toC === target.c);
      if (move) {
        executeMove(move, { fromDrag: false });
        return;
      }
      clearSelection();
      renderBoard();
    }
    return;
  }

  // Fall B: Klick oder Drag-Start auf einen Spielstein
  if (val === CELL_PEG) {
    e.preventDefault();
    const moves = game.getValidMovesFrom(target.r, target.c);

    dragState = {
      pointerId: e.pointerId,
      fromR: target.r,
      fromC: target.c,
      startX: e.clientX,
      startY: e.clientY,
      moves,
      isDragging: false,
      hoveredMove: null,
      fxPeg: null
    };

    try {
      dom.board.setPointerCapture(e.pointerId);
    } catch {
      // Fallback falls PointerCapture nicht unterstützt wird
    }
  }
});

dom.board.addEventListener("pointermove", (e) => {
  if (!dragState || e.pointerId !== dragState.pointerId) return;

  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  const dist = Math.hypot(dx, dy);

  if (!dragState.isDragging) {
    if (dist < DRAG_THRESHOLD_PX) return;

    // Nur Steine mit gültigen Zügen lassen sich ziehen
    if (dragState.moves.length === 0) {
      return;
    }

    dragState.isDragging = true;
    clearHint();
    selected = {
      r: dragState.fromR,
      c: dragState.fromC,
      moves: dragState.moves
    };
    renderBoard();

    const originPos = getHoleCenterInFrame(dragState.fromR, dragState.fromC);
    const fxPeg = document.createElement("div");
    fxPeg.className = "fx-peg is-dragging";
    fxPeg.style.width = `${originPos.size}px`;
    fxPeg.style.height = `${originPos.size}px`;
    dom.fxLayer.appendChild(fxPeg);

    dragState.fxPeg = fxPeg;
    cellEls[dragState.fromR][dragState.fromC].classList.add("is-dragging-source");
    sound.playPickup();
  }

  const frameRect = dom.boardFrame.getBoundingClientRect();
  dragState.fxPeg.style.left = `${e.clientX - frameRect.left}px`;
  dragState.fxPeg.style.top = `${e.clientY - frameRect.top}px`;

  const hoverMove = findClosestDropTarget(e.clientX, e.clientY, dragState.moves);
  dragState.hoveredMove = hoverMove;
  setDropHoverCell(hoverMove);
});

function finishPointerInteraction(e, cancelled = false) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;

  try {
    if (dom.board.hasPointerCapture(e.pointerId)) {
      dom.board.releasePointerCapture(e.pointerId);
    }
  } catch {
    // Ignorieren
  }

  const state = dragState;
  cleanupDrag();

  if (cancelled) {
    clearSelection();
    renderBoard();
    return;
  }

  // Wenn es ein Drag & Drop war:
  if (state.isDragging) {
    const dropMove = findClosestDropTarget(e.clientX, e.clientY, state.moves);
    if (dropMove) {
      executeMove(dropMove, { fromDrag: true });
    } else {
      sound.playInvalid();
      clearSelection();
      renderBoard();
    }
    return;
  }

  // Wenn es ein einfacher Klick/Tap war:
  if (state.moves.length === 0) {
    sound.playInvalid();
    if (selected) {
      clearSelection();
      renderBoard();
    }
    return;
  }

  clearHint();
  if (selected && selected.r === state.fromR && selected.c === state.fromC) {
    clearSelection();
    renderBoard();
  } else {
    selected = {
      r: state.fromR,
      c: state.fromC,
      moves: state.moves
    };
    sound.playSelect();
    renderBoard();
  }
}

dom.board.addEventListener("pointerup", (e) => finishPointerInteraction(e, false));
dom.board.addEventListener("pointercancel", (e) => finishPointerInteraction(e, true));

/* =========================================================
   AKTIONEN: UNDO, TIPP, NEUSTART, MODUS
   ========================================================= */
function performUndo() {
  if (isAnimating || !game.canUndo()) return;

  const wasEnded = gameEnded;
  const undone = game.undo();
  if (!undone) return;

  gameEnded = false;
  closeModal(dom.endModal);
  clearSelection();
  clearHint();

  if (wasEnded && timerStarted) {
    resumeTimer();
  }

  sound.playUndo();
  renderBoard({
    restoringCells: [
      { r: undone.fromR, c: undone.fromC },
      { r: undone.overR, c: undone.overC }
    ]
  });
}

function showHint() {
  if (isAnimating || gameEnded) return;
  const move = game.getHint();
  if (!move) {
    showToast("Keine gültigen Züge mehr verfügbar.");
    return;
  }

  clearSelection();
  clearHint();
  hintMove = move;
  sound.playHint();
  renderBoard();

  hintTimerId = window.setTimeout(() => {
    clearHint();
    renderBoard();
  }, 2400);
}

function startNewGame(modeId = game.modeId) {
  cleanupDrag();
  clearSelection();
  clearHint();
  closeModal(dom.endModal);
  closeModal(dom.confirmModal);
  closeModal(dom.menuModal);

  isAnimating = false;
  gameEnded = false;

  const modeChanged = modeId !== game.modeId;
  game.reset(modeId);
  if (modeChanged) {
    saveMode(modeId);
    buildBoardDOM();
  }
  resetTimer();
  updateModeMenuUI();
  renderBoard();
}

function requestRestart() {
  if (isAnimating) return;
  if (game.moves > 0 && !gameEnded) {
    openModal(dom.confirmModal);
  } else {
    startNewGame(game.modeId);
    sound.playSelect();
  }
}

/* =========================================================
   MODALS
   ========================================================= */
function openModal(modalEl) {
  modalEl.hidden = false;
  if (modalEl === dom.menuModal || modalEl === dom.confirmModal) {
    pauseTimer();
  }
}

function closeModal(modalEl) {
  if (modalEl.hidden) return;
  modalEl.hidden = true;
  if (!gameEnded && dom.menuModal.hidden && dom.confirmModal.hidden && dom.endModal.hidden) {
    resumeTimer();
  }
}

function openEndModal({ status, isNewRecord }) {
  if (status === "perfect_win") {
    dom.endIcon.textContent = "👑";
    dom.endTitle.textContent = "Perfekter Sieg!";
    dom.endSubtitle.textContent =
      game.modeId === "classic"
        ? "Unglaublich! Nur noch 1 Stein – exakt im Mittelfeld!"
        : "Meisterhaft! Nur noch 1 Stein – genau auf dem Zielfeld!";
  } else if (status === "win") {
    dom.endIcon.textContent = "🏆";
    dom.endTitle.textContent = "Gewonnen!";
    dom.endSubtitle.textContent = "Stark gespielt! Es ist nur noch 1 Stein übrig.";
  } else {
    dom.endIcon.textContent = "🪵";
    dom.endTitle.textContent = "Keine Züge mehr möglich";
    dom.endSubtitle.textContent = `Es sind noch ${game.pegsLeft} Steine auf dem Brett übrig.`;
  }

  dom.endPegs.textContent = String(game.pegsLeft);
  dom.endMoves.textContent = String(game.moves);
  dom.endTime.textContent = formatTime(elapsedSeconds);
  dom.endRecord.hidden = !isNewRecord;

  // Bei Deadlock & Sieg immer Undo anbieten, falls man einen Zug zurückprobieren möchte
  dom.btnEndUndo.hidden = !game.canUndo();
  openModal(dom.endModal);
}

function updateModeMenuUI() {
  for (const btn of dom.modeOptions) {
    const active = btn.dataset.mode === game.modeId;
    btn.setAttribute("aria-checked", String(active));
  }
}

/* =========================================================
   EVENT-BINDINGS & HUB-INTEGRATION
   ========================================================= */
dom.btnSound.addEventListener("click", toggleSound);
dom.btnUndo.addEventListener("click", performUndo);
dom.btnHint.addEventListener("click", showHint);
dom.btnRestart.addEventListener("click", requestRestart);

dom.btnEndUndo.addEventListener("click", performUndo);
dom.btnEndRestart.addEventListener("click", () => {
  startNewGame(game.modeId);
  sound.playSelect();
});

dom.btnConfirmCancel.addEventListener("click", () => closeModal(dom.confirmModal));
dom.btnConfirmOk.addEventListener("click", () => {
  startNewGame(game.modeId);
  sound.playSelect();
});

dom.btnMenu.addEventListener("click", () => {
  updateModeMenuUI();
  openModal(dom.menuModal);
});
dom.btnCloseMenu.addEventListener("click", () => closeModal(dom.menuModal));
dom.btnMenuDone.addEventListener("click", () => closeModal(dom.menuModal));

dom.menuModal.addEventListener("click", (e) => {
  if (e.target === dom.menuModal) closeModal(dom.menuModal);
});
dom.confirmModal.addEventListener("click", (e) => {
  if (e.target === dom.confirmModal) closeModal(dom.confirmModal);
});

for (const btn of dom.modeOptions) {
  btn.addEventListener("click", () => {
    const chosenMode = btn.dataset.mode;
    if (chosenMode && chosenMode !== game.modeId) {
      startNewGame(chosenMode);
      sound.playSelect();
      showToast(`Modus gewechselt: ${game.mode.badge}`);
    } else {
      closeModal(dom.menuModal);
    }
  });
}

dom.btnResetBest.addEventListener("click", () => {
  clearBest(game.modeId);
  renderStats();
  showToast("Bestleistung zurückgesetzt.");
});

// Tastatur-Kurzbefehle für Desktop
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();

  if (key === "escape") {
    if (!dom.menuModal.hidden) closeModal(dom.menuModal);
    else if (!dom.confirmModal.hidden) closeModal(dom.confirmModal);
    else if (selected) {
      clearSelection();
      renderBoard();
    }
    return;
  }

  if (!dom.menuModal.hidden || !dom.confirmModal.hidden) return;

  if ((e.ctrlKey && key === "z") || (!e.ctrlKey && (key === "z" || key === "u"))) {
    e.preventDefault();
    performUndo();
  } else if (!e.ctrlKey && key === "h") {
    e.preventDefault();
    showHint();
  } else if (!e.ctrlKey && key === "r") {
    e.preventDefault();
    requestRestart();
  } else if (!e.ctrlKey && key === "s") {
    e.preventDefault();
    toggleSound();
  }
});

// Integration mit Mini Game Hub (Sound & Pause)
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "hub-pause") {
    pausedByHub = true;
    pauseTimer();
  } else if (data.type === "hub-resume") {
    pausedByHub = false;
    resumeTimer();
  } else if (data.type === "hub-sound") {
    sound.setMuted(Boolean(data.muted));
    updateSoundUI();
  }
});

/* =========================================================
   INITIALISIERUNG
   ========================================================= */
updateSoundUI();
updateModeMenuUI();
buildBoardDOM();
renderBoard();
