// SVG-Gesichter der Steine (unabhängig von Systemschriften für Mahjong-Unicode).
const FONT = "'KaiTi','STKaiti','Noto Serif CJK SC','Source Han Serif SC','Microsoft YaHei','PingFang SC',serif";
const COL = { green: '#1b7a4b', red: '#c8322b', blue: '#1f5fa8', dark: '#23262b', orange: '#d35400', purple: '#8e3a8f' };

const wrap = (inner) =>
  `<svg viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${inner}</svg>`;

const text = (ch, x, y, size, fill) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-family="${FONT}" font-weight="700" text-anchor="middle" fill="${fill}">${ch}</text>`;

function pip(x, y, r, color) {
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>` +
    `<circle cx="${x}" cy="${y}" r="${(r * 0.58).toFixed(2)}" fill="none" stroke="#fff" stroke-width="${(r * 0.2).toFixed(2)}" opacity=".85"/>` +
    `<circle cx="${x}" cy="${y}" r="${(r * 0.2).toFixed(2)}" fill="#fff"/>`
  );
}

function stick(x, y, h, color) {
  return (
    `<rect x="${x - 2.7}" y="${y - h / 2}" width="5.4" height="${h}" rx="2.4" fill="${color}" stroke="#0d3b24" stroke-width=".6"/>` +
    `<rect x="${x - 2.7}" y="${y - 0.6}" width="5.4" height="1.2" fill="#fff" opacity=".75"/>`
  );
}

const PIPS = {
  1: { r: 11, p: [[20, 26]] },
  2: { r: 8, p: [[20, 14], [20, 38]] },
  3: { r: 7, p: [[10, 10], [20, 26], [30, 42]] },
  4: { r: 7.5, p: [[12, 14], [28, 14], [12, 38], [28, 38]] },
  5: { r: 7, p: [[12, 12], [28, 12], [20, 26], [12, 40], [28, 40]] },
  6: { r: 6.5, p: [[12, 10], [28, 10], [12, 26], [28, 26], [12, 42], [28, 42]] },
  7: { r: 5.5, p: [[9, 8], [20, 12], [31, 16], [12, 32], [28, 32], [12, 44], [28, 44]] },
  8: { r: 5.5, p: [[12, 8], [28, 8], [12, 20], [28, 20], [12, 32], [28, 32], [12, 44], [28, 44]] },
  9: { r: 5.5, p: [[9, 10], [20, 10], [31, 10], [9, 26], [20, 26], [31, 26], [9, 42], [20, 42], [31, 42]] },
};
const PIP_COLORS = [COL.green, COL.red, COL.blue];

function circles(n) {
  const { r, p } = PIPS[n];
  return p
    .map(([x, y], i) => {
      let c = PIP_COLORS[i % 3];
      if (n === 1) c = COL.red;
      if (n === 5 && i === 2) c = COL.red;
      if (n === 9) c = PIP_COLORS[Math.floor(i / 3) % 3];
      return pip(x, y, r, c);
    })
    .join('');
}

const STICKS = {
  2: { h: 20, p: [[20, 14], [20, 38]] },
  3: { h: 20, p: [[20, 14], [12, 38], [28, 38]] },
  4: { h: 20, p: [[12, 14], [28, 14], [12, 38], [28, 38]] },
  5: { h: 18, p: [[12, 13], [28, 13], [20, 26], [12, 39], [28, 39]] },
  6: { h: 19, p: [[11, 14], [20, 14], [29, 14], [11, 38], [20, 38], [29, 38]] },
  7: { h: 14, p: [[20, 9], [11, 26], [20, 26], [29, 26], [11, 43], [20, 43], [29, 43]] },
  8: { h: 18, p: [[8, 14], [16, 14], [24, 14], [32, 14], [8, 38], [16, 38], [24, 38], [32, 38]] },
  9: { h: 14, p: [[10, 9], [20, 9], [30, 9], [10, 26], [20, 26], [30, 26], [10, 43], [20, 43], [30, 43]] },
};

function bamboo(n) {
  if (n === 1) {
    return (
      `<ellipse cx="20" cy="31" rx="9" ry="12" fill="${COL.green}"/>` +
      `<circle cx="20" cy="15" r="6" fill="${COL.red}"/>` +
      `<polygon points="26,14 33,16 26,18" fill="#e0a526"/>` +
      `<circle cx="22" cy="13.5" r="1.3" fill="#fff"/>` +
      `<path d="M13 40 Q6 48 12 50 Q16 46 18 42Z" fill="${COL.blue}"/>` +
      `<path d="M27 40 Q34 48 28 50 Q24 46 22 42Z" fill="${COL.red}"/>`
    );
  }
  const { h, p } = STICKS[n];
  return p
    .map(([x, y], i) => {
      let c = COL.green;
      if ((n === 5 && i === 2) || (n === 7 && i === 0)) c = COL.red;
      if (n === 9) c = [COL.green, COL.red, COL.blue][i % 3];
      if (n === 3 && i === 0) c = COL.red;
      return stick(x, y, h, c);
    })
    .join('');
}

const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WIND = { E: '東', S: '南', W: '西', N: '北' };
const SEASON = ['春', '夏', '秋', '冬'];
const FLOWER = ['梅', '蘭', '菊', '竹'];

function dots(n, color) {
  let out = '';
  for (let i = 0; i < n; i++) out += `<circle cx="${20 + (i - (n - 1) / 2) * 5}" cy="46" r="1.6" fill="${color}"/>`;
  return out;
}

function build(face) {
  if (face.startsWith('cir')) return wrap(circles(+face.slice(3)));
  if (face.startsWith('bam')) return wrap(bamboo(+face.slice(3)));
  if (face.startsWith('chr')) {
    const n = +face.slice(3);
    return wrap(text(NUM[n - 1], 20, 24, 23, COL.blue) + text('萬', 20, 47, 22, COL.red));
  }
  if (face.startsWith('wind')) {
    return wrap(text(WIND[face.slice(4)], 20, 37, 34, COL.dark) + `<rect x="8" y="42" width="24" height="1.6" rx=".8" fill="${COL.dark}" opacity=".5"/>`);
  }
  if (face === 'drgR') return wrap(text('中', 20, 38, 36, COL.red));
  if (face === 'drgG') return wrap(text('發', 20, 38, 34, COL.green));
  if (face === 'drgW') {
    return wrap(
      `<rect x="7" y="8" width="26" height="36" rx="3" fill="none" stroke="${COL.blue}" stroke-width="2.6"/>` +
        `<rect x="11" y="12" width="18" height="28" rx="2" fill="none" stroke="${COL.blue}" stroke-width="1" opacity=".6"/>`
    );
  }
  if (face.startsWith('sea')) {
    const n = +face.slice(3);
    return wrap(text(SEASON[n - 1], 20, 33, 30, COL.orange) + dots(n, COL.orange) + `<rect x="6" y="6" width="28" height="40" rx="3" fill="none" stroke="${COL.orange}" stroke-width=".8" opacity=".5"/>`);
  }
  if (face.startsWith('flw')) {
    const n = +face.slice(3);
    return wrap(text(FLOWER[n - 1], 20, 33, 30, COL.purple) + dots(n, COL.purple) + `<rect x="6" y="6" width="28" height="40" rx="3" fill="none" stroke="${COL.purple}" stroke-width=".8" opacity=".5"/>`);
  }
  return wrap('');
}

const cache = new Map();
export function faceSvg(face) {
  if (!cache.has(face)) cache.set(face, build(face));
  return cache.get(face);
}
