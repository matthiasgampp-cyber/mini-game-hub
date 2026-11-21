(() => {
  "use strict";

  const BASE_W = 720;
  const BASE_H = 405;

  function drawLevel1Background(ctx, { viewW = BASE_W, viewH = BASE_H, time = 0 }) {
    // Weicher Himmelsverlauf mit sanftem Morgenlicht
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, "#0284c7");
    sky.addColorStop(0.35, "#38bdf8");
    sky.addColorStop(0.68, "#bae6fd");
    sky.addColorStop(0.88, "#dcfce7");
    sky.addColorStop(1, "#86efac");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    // Warm leuchtende Morgensonne
    const sunX = viewW * 0.82;
    const sunY = viewH * 0.16;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 74);
    sunGlow.addColorStop(0, "rgba(254, 249, 195, 0.95)");
    sunGlow.addColorStop(0.35, "rgba(253, 224, 71, 0.45)");
    sunGlow.addColorStop(0.7, "rgba(253, 224, 71, 0.12)");
    sunGlow.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 74, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Sanft ziehende stilisierte Wolken
    const drawCloud = (cx, cy, scale) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.arc(14, -6, 12, 0, Math.PI * 2);
      ctx.arc(28, 0, 14, 0, Math.PI * 2);
      ctx.arc(-14, 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const cloud1X = ((time * 12 + 40) % (viewW + 120)) - 60;
    const cloud2X = ((time * 8 + 360) % (viewW + 140)) - 70;
    drawCloud(cloud1X, viewH * 0.18, 0.9);
    drawCloud(cloud2X, viewH * 0.28, 0.7);

    // Weiche Bergsilhouetten im Hintergrund (Parallaxe & Tiefe)
    ctx.fillStyle = "rgba(125, 211, 252, 0.55)";
    ctx.beginPath();
    ctx.moveTo(0, viewH * 0.72);
    ctx.bezierCurveTo(viewW * 0.12, viewH * 0.44, viewW * 0.22, viewH * 0.52, viewW * 0.35, viewH * 0.38);
    ctx.bezierCurveTo(viewW * 0.52, viewH * 0.22, viewW * 0.68, viewH * 0.46, viewW * 0.85, viewH * 0.32);
    ctx.bezierCurveTo(viewW * 0.93, viewH * 0.28, viewW * 0.98, viewH * 0.48, viewW, viewH * 0.52);
    ctx.lineTo(viewW, viewH);
    ctx.lineTo(0, viewH);
    ctx.closePath();
    ctx.fill();

    // Vordere sanft geschwungene Hügel
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.moveTo(0, viewH);
    ctx.quadraticCurveTo(viewW * 0.22, viewH * 0.54, viewW * 0.48, viewH * 0.66);
    ctx.quadraticCurveTo(viewW * 0.75, viewH * 0.50, viewW, viewH * 0.62);
    ctx.lineTo(viewW, viewH);
    ctx.closePath();
    ctx.fill();

    // Im Wind wiegender Bambushain im Hintergrund
    const groveCount = 18;
    for (let i = 0; i < groveCount; i++) {
      const bx = 16 + i * ((viewW - 32) / (groveCount - 1));
      const topRatio = 0.24 + ((i * 19) % 10) * 0.024;
      const sway = Math.sin(time * 1.4 + i * 0.65) * 4.2;
      const stalkW = i % 3 === 0 ? 6.5 : 4.5;

      ctx.strokeStyle = i % 2 === 0 ? "rgba(21, 128, 61, 0.45)" : "rgba(22, 163, 74, 0.38)";
      ctx.lineWidth = stalkW;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx, viewH);
      ctx.quadraticCurveTo(bx + sway * 0.4, viewH * 0.62, bx + sway, viewH * topRatio);
      ctx.stroke();

      // Kleine Bambusblätter an den Gelenken
      const leafSway = Math.sin(time * 2.1 + i) * 3;
      ctx.fillStyle = "rgba(74, 222, 128, 0.65)";
      ctx.beginPath();
      ctx.ellipse(bx + sway + 5, viewH * topRatio + 4, 8, 3, 0.4 + leafSway * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sanft herabsegelnde Blätter/Blüten im Wind
    ctx.save();
    for (let p = 0; p < 8; p++) {
      const px = ((p * 92 + time * 28) % (viewW + 40)) - 20;
      const py = ((p * 58 + time * 38) % (viewH + 30)) - 15;
      const rot = Math.sin(time * 2.2 + p) * 0.8;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = p % 2 === 0 ? "rgba(244, 114, 182, 0.55)" : "rgba(134, 239, 172, 0.65)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function buildLevel1(viewW, viewH) {
    const w = BASE_W;
    const h = BASE_H;
    const groundY = 381;
    const row1Y = 292;
    const row2Y = 203;
    const row3Y = 114;

    const platforms = [
      { x: 14, y: groundY, w: w - 28, h: 20 },
      { x: 55, y: row1Y, w: 250, h: 14 },
      { x: 415, y: row1Y, w: 250, h: 14 },
      { x: 115, y: row2Y, w: 225, h: 14 },
      { x: 385, y: row2Y, w: 235, h: 14 },
      { x: 230, y: row3Y, w: 260, h: 14 }
    ];

    const bamboos = [
      { x: 180, top: row1Y, bottom: groundY, width: 28 },
      { x: 540, top: row1Y, bottom: groundY, width: 28 },
      { x: 250, top: row2Y, bottom: row1Y, width: 28 },
      { x: 480, top: row2Y, bottom: row1Y, width: 28 },
      { x: 360, top: row3Y, bottom: row2Y, width: 28 }
    ];

    const keys = [
      { x: 575, y: row2Y - 22, collected: false }
    ];

    const cage = {
      x: 360,
      y: row3Y - 38,
      w: 38,
      h: 38,
      freed: false
    };

    const cops = [
      {
        x: 160,
        y: groundY - 34,
        w: 24,
        h: 34,
        vx: 68,
        vy: 0,
        dirTimer: 1.0,
        onLadder: false,
        activeLadder: null,
        ladderCooldown: 0
      },
      {
        x: 460,
        y: row1Y - 34,
        w: 24,
        h: 34,
        vx: -70,
        vy: 0,
        dirTimer: 1.2,
        onLadder: false,
        activeLadder: null,
        ladderCooldown: 0
      },
      {
        x: 260,
        y: row2Y - 34,
        w: 24,
        h: 34,
        vx: 66,
        vy: 0,
        dirTimer: 0.9,
        onLadder: false,
        activeLadder: null,
        ladderCooldown: 0
      }
    ];

    return {
      mode: "platform",
      worldW: w,
      worldH: h,
      spawn: { x: Math.round(w * 0.50), y: groundY },
      platforms,
      bamboos,
      keys,
      cage,
      cops,
      drawBackground: drawLevel1Background
    };
  }

  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level1 = drawLevel1Background;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-1",
    shortLabel: "Polizisten-Level",
    name: "POLIZISTEN-LEVEL",
    mode: "platform",
    keysRequired: 1,
    drawBackground: drawLevel1Background,
    build: buildLevel1
  });
})();
