export const BOARD_SIZE = 7;

export const CELL_INVALID = -1;
export const CELL_EMPTY = 0;
export const CELL_PEG = 1;

export const MODES = {
  classic: {
    id: "classic",
    name: "Klassisch",
    badge: "Klassisch · 33 Felder",
    totalCells: 33,
    startHole: { r: 3, c: 3 },
    goalHole: { r: 3, c: 3 },
    isValidCell(r, c) {
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
      const inCornerRow = r < 2 || r > 4;
      const inCornerCol = c < 2 || c > 4;
      return !(inCornerRow && inCornerCol);
    }
  },
  european: {
    id: "european",
    name: "Europäisch",
    badge: "Europäisch · 37 Felder",
    totalCells: 37,
    startHole: { r: 2, c: 3 },
    goalHole: { r: 2, c: 3 },
    isValidCell(r, c) {
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
      const outerRow = r === 0 || r === 6;
      const outerCol = c === 0 || c === 6;
      if (outerRow && (c < 2 || c > 4)) return false;
      if (outerCol && (r < 2 || r > 4)) return false;
      return true;
    }
  }
};

const DIRECTIONS = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2]
];

export class PegSolitaireGame {
  constructor(modeId = "classic") {
    this.modeId = MODES[modeId] ? modeId : "classic";
    this.board = [];
    this.history = [];
    this.pegsLeft = 0;
    this.moves = 0;
    this._hintCursor = 0;
    this.reset(this.modeId);
  }

  get mode() {
    return MODES[this.modeId];
  }

  reset(modeId = this.modeId) {
    this.modeId = MODES[modeId] ? modeId : "classic";
    const mode = this.mode;

    this.board = Array.from({ length: BOARD_SIZE }, (_, r) =>
      Array.from({ length: BOARD_SIZE }, (_, c) => {
        if (!mode.isValidCell(r, c)) return CELL_INVALID;
        if (r === mode.startHole.r && c === mode.startHole.c) return CELL_EMPTY;
        return CELL_PEG;
      })
    );

    this.history = [];
    this.moves = 0;
    this.pegsLeft = mode.totalCells - 1;
    this._hintCursor = 0;
  }

  getCell(r, c) {
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return CELL_INVALID;
    return this.board[r][c];
  }

  isGoalCell(r, c) {
    return r === this.mode.goalHole.r && c === this.mode.goalHole.c;
  }

  getValidMovesFrom(r, c) {
    if (this.getCell(r, c) !== CELL_PEG) return [];
    const result = [];

    for (const [dr, dc] of DIRECTIONS) {
      const overR = r + dr / 2;
      const overC = c + dc / 2;
      const toR = r + dr;
      const toC = c + dc;

      if (this.getCell(overR, overC) === CELL_PEG && this.getCell(toR, toC) === CELL_EMPTY) {
        result.push({ fromR: r, fromC: c, overR, overC, toR, toC });
      }
    }

    return result;
  }

  getAllValidMoves() {
    const all = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.board[r][c] === CELL_PEG) {
          const moves = this.getValidMovesFrom(r, c);
          for (const m of moves) all.push(m);
        }
      }
    }
    return all;
  }

  findMove(fromR, fromC, toR, toC) {
    const dr = toR - fromR;
    const dc = toC - fromC;
    const isOrthoJump =
      (Math.abs(dr) === 2 && dc === 0) || (Math.abs(dc) === 2 && dr === 0);
    if (!isOrthoJump) return null;

    const overR = fromR + dr / 2;
    const overC = fromC + dc / 2;

    if (
      this.getCell(fromR, fromC) === CELL_PEG &&
      this.getCell(overR, overC) === CELL_PEG &&
      this.getCell(toR, toC) === CELL_EMPTY
    ) {
      return { fromR, fromC, overR, overC, toR, toC };
    }
    return null;
  }

  makeMove(fromR, fromC, toR, toC) {
    const move = this.findMove(fromR, fromC, toR, toC);
    if (!move) return null;

    this.board[move.fromR][move.fromC] = CELL_EMPTY;
    this.board[move.overR][move.overC] = CELL_EMPTY;
    this.board[move.toR][move.toC] = CELL_PEG;

    this.history.push(move);
    this.moves += 1;
    this.pegsLeft -= 1;
    this._hintCursor = 0;

    return {
      move,
      status: this.getStatus()
    };
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    if (!this.canUndo()) return null;
    const move = this.history.pop();

    this.board[move.fromR][move.fromC] = CELL_PEG;
    this.board[move.overR][move.overC] = CELL_PEG;
    this.board[move.toR][move.toC] = CELL_EMPTY;

    this.moves = Math.max(0, this.moves - 1);
    this.pegsLeft += 1;
    this._hintCursor = 0;

    return move;
  }

  getStatus() {
    if (this.getAllValidMoves().length > 0) {
      return "playing";
    }
    if (this.pegsLeft === 1) {
      const { r, c } = this.mode.goalHole;
      return this.board[r][c] === CELL_PEG ? "perfect_win" : "win";
    }
    return "deadlock";
  }

  getHint() {
    const validMoves = this.getAllValidMoves();
    if (validMoves.length === 0) return null;

    // Bevorzuge Züge, die näher zur Mitte führen
    const center = 3;
    const scored = validMoves
      .map((m) => {
        const distFrom = Math.abs(m.fromR - center) + Math.abs(m.fromC - center);
        const distTo = Math.abs(m.toR - center) + Math.abs(m.toC - center);
        return { move: m, score: distTo - distFrom };
      })
      .sort((a, b) => a.score - b.score);

    const chosen = scored[this._hintCursor % scored.length].move;
    this._hintCursor += 1;
    return chosen;
  }
}
