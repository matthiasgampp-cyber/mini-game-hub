// Layouts für Mahjong Solitaire.
// Koordinaten in "Halbeinheiten": ein Stein belegt 2x2 Halbeinheiten (x..x+1, y..y+1).
// Dadurch sind halbversetzte Steine (z. B. bei der Schildkröte) möglich.
// Jedes Layout enthält exakt 144 Steine (wird in tests/verify.mjs geprüft).

/** Rechteck aus Steinen: x,y in Halbeinheiten, cols/rows in Steinen. */
function rect(z, x, y, cols, rows) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out.push({ x: x + c * 2, y: y + r * 2, z });
  }
  return out;
}

/** Ebene aus ASCII-Zeilen ('#' = Stein), Zellgröße = 1 Stein. */
function ascii(z, rows, ox = 0, oy = 0) {
  const out = [];
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') out.push({ x: ox + c * 2, y: oy + r * 2, z });
    });
  });
  return out;
}

const turtle = [
  ...rect(0, 2, 0, 12, 1),
  ...rect(0, 6, 2, 8, 1),
  ...rect(0, 4, 4, 10, 1),
  ...rect(0, 2, 6, 12, 2),
  ...rect(0, 4, 10, 10, 1),
  ...rect(0, 6, 12, 8, 1),
  ...rect(0, 2, 14, 12, 1),
  { x: 0, y: 7, z: 0 },
  { x: 26, y: 7, z: 0 },
  { x: 28, y: 7, z: 0 },
  ...rect(1, 8, 2, 6, 6),
  ...rect(2, 10, 4, 4, 4),
  ...rect(3, 12, 6, 2, 2),
  { x: 13, y: 7, z: 4 },
];

const pyramid = [
  ...rect(0, 0, 0, 12, 6),
  ...rect(1, 2, 1, 10, 5),
  ...rect(2, 6, 3, 6, 3),
  ...rect(3, 8, 5, 4, 1),
];

const fortress = [
  ...ascii(0, [
    '##############',
    '##..........##',
    '##..######..##',
    '##..######..##',
    '##..######..##',
    '##..######..##',
    '##..........##',
    '##############',
  ]),
  ...ascii(1, [
    '##..######..##',
    '##..........##',
    '....######....',
    '....######....',
    '....######....',
    '....######....',
    '##..........##',
    '##..######..##',
  ]),
  ...ascii(2, [
    '##..........##',
    '##..........##',
    '..............',
    '..............',
    '..............',
    '..............',
    '##..........##',
    '##..........##',
  ]),
];

const arenaRing = [
  '...##########...',
  '.####......####.',
  '.##..........##.',
  '##............##',
  '##............##',
  '##............##',
  '##............##',
  '.##..........##.',
  '.####......####.',
  '...##########...',
];
const arena = [
  ...ascii(0, arenaRing),
  ...ascii(1, arenaRing),
  ...ascii(2, [
    '.....######.....',
    '....#......#....',
    '................',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '................',
    '....#......#....',
    '.....######.....',
  ]),
];

const bridge = [
  ...rect(0, 0, 0, 4, 8),
  ...rect(0, 28, 0, 4, 8),
  ...rect(0, 8, 6, 10, 2),
  ...rect(1, 0, 2, 4, 6),
  ...rect(1, 28, 2, 4, 6),
  ...rect(1, 16, 6, 2, 2),
  ...rect(2, 2, 6, 2, 2),
  ...rect(2, 30, 6, 2, 2),
];

export const LAYOUTS = [
  { id: 'turtle', name: 'Schildkröte', tiles: turtle },
  { id: 'pyramid', name: 'Pyramide', tiles: pyramid },
  { id: 'fortress', name: 'Festung', tiles: fortress },
  { id: 'arena', name: 'Arena', tiles: arena },
  { id: 'bridge', name: 'Brücke / Tor', tiles: bridge },
];
