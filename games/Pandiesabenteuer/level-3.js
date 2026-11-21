(() => {
  "use strict";

  const BASE_W = 720;
  const BASE_H = 405;

  function drawMiniFallingHearts(ctx, viewW, viewH, time) {
    const count = 18;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const speed = 22 + (i % 4) * 6;
      const xBase = ((i * 97 + 31) % Math.max(120, Math.round(viewW - 24))) + 12;
      const sway = Math.sin(time * 2.0 + i * 1.15) * 8;
      const yCycle = ((time * speed + i * 47) % (viewH + 30)) - 15;
      const x = xBase + sway;
      const s = 3.2 + (i % 3) * 0.9;

      ctx.save();
      ctx.translate(x, yCycle);
      ctx.rotate(Math.sin(time * 1.5 + i) * 0.22);
      ctx.globalAlpha = 0.32 + (i % 3) * 0.1;
      ctx.fillStyle = i % 2 === 0 ? "#fb7185" : "#f472b6";

      ctx.beginPath();
      ctx.moveTo(0, s * 0.85);
      ctx.bezierCurveTo(-s * 1.35, s * 0.1, -s * 1.35, -s * 0.85, 0, -s * 0.25);
      ctx.bezierCurveTo(s * 1.35, -s * 0.85, s * 1.35, s * 0.1, 0, s * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawChineseHouseBackground(ctx, { viewW = BASE_W, viewH = BASE_H, time = 0 }) {
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, "#090d1a");
    sky.addColorStop(0.25, "#1e1b4b");
    sky.addColorStop(0.58, "#581c87");
    sky.addColorStop(0.82, "#9f1239");
    sky.addColorStop(1, "#f97316");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    // Funkelnde Sterne
    ctx.save();
    for (let i = 0; i < 32; i++) {
      const sx = ((i * 67 + 17) % Math.max(80, Math.round(viewW - 20))) + 10;
      const sy = ((i * 23 + 9) % Math.max(36, Math.round(viewH * 0.26))) + 6;
      const alpha = 0.25 + 0.65 * Math.abs(Math.sin(time * 2.2 + i * 0.8));
      ctx.fillStyle = `rgba(255, 251, 235, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 5 === 0 ? 1.6 : 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Sanft leuchtende Mondsichel
    const moonX = viewW * 0.14;
    const moonY = viewH * 0.15;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 68);
    moonGlow.addColorStop(0, "rgba(255, 251, 235, 0.95)");
    moonGlow.addColorStop(0.35, "rgba(254, 240, 138, 0.28)");
    moonGlow.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 68, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fef9c3";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(moonX + 5, moonY - 3, 13, 0, Math.PI * 2);
    ctx.fill();

    // Silhouetten der fernen Berge
    const mtnFar = ctx.createLinearGradient(0, viewH * 0.36, 0, viewH * 0.78);
    mtnFar.addColorStop(0, "rgba(30, 27, 75, 0.65)");
    mtnFar.addColorStop(1, "rgba(88, 28, 135, 0.15)");
    ctx.fillStyle = mtnFar;
    ctx.beginPath();
    ctx.moveTo(0, viewH * 0.75);
    ctx.lineTo(viewW * 0.14, viewH * 0.43);
    ctx.lineTo(viewW * 0.31, viewH * 0.58);
    ctx.lineTo(viewW * 0.52, viewH * 0.38);
    ctx.lineTo(viewW * 0.74, viewH * 0.56);
    ctx.lineTo(viewW * 0.90, viewH * 0.42);
    ctx.lineTo(viewW, viewH * 0.59);
    ctx.lineTo(viewW, viewH);
    ctx.lineTo(0, viewH);
    ctx.closePath();
    ctx.fill();

    // Pagoden-Palast im Hintergrund
    const houseLeft = Math.round(viewW * 0.08);
    const houseRight = Math.round(viewW * 0.92);
    const houseW = houseRight - houseLeft;
    const baseY = viewH - 18;
    const wallTop = Math.round(viewH * 0.36);
    const upperWallTop = Math.round(viewH * 0.22);

    const stoneGrad = ctx.createLinearGradient(0, baseY - 14, 0, baseY + 4);
    stoneGrad.addColorStop(0, "#475569");
    stoneGrad.addColorStop(1, "#1e293b");
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(houseLeft - 18, baseY - 12, houseW + 36, 30);

    ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
    ctx.lineWidth = 1;
    for (let sx = houseLeft - 14; sx < houseRight + 14; sx += 24) {
      ctx.beginPath();
      ctx.moveTo(sx, baseY - 12);
      ctx.lineTo(sx, baseY + 16);
      ctx.stroke();
    }

    const stairW = Math.max(46, Math.round(houseW * 0.12));
    const stairX = Math.round(viewW * 0.5 - stairW * 0.5);
    for (let s = 0; s < 4; s++) {
      const sy = baseY - 14 + s * 3;
      const expand = (3 - s) * 3;
      ctx.fillStyle = s % 2 === 0 ? "#64748b" : "#475569";
      ctx.fillRect(stairX - expand, sy, stairW + expand * 2, 3.5);
    }

    const wallGrad = ctx.createLinearGradient(0, upperWallTop, 0, baseY - 12);
    wallGrad.addColorStop(0, "#f5ebd6");
    wallGrad.addColorStop(0.55, "#e7d5b5");
    wallGrad.addColorStop(1, "#cfa97e");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(houseLeft + 10, upperWallTop, houseW - 20, baseY - 12 - upperWallTop);

    const timberDark = "#3b1812";
    const timberMid = "#6b271a";
    const timberHighlight = "#8c3827";

    ctx.fillStyle = timberMid;
    ctx.fillRect(houseLeft + 8, baseY - 16, houseW - 16, 5);
    ctx.fillRect(houseLeft + 6, wallTop + 2, houseW - 12, 6);
    ctx.fillStyle = timberDark;
    ctx.fillRect(houseLeft + 6, wallTop + 6, houseW - 12, 2);

    const pillars = [0.11, 0.28, 0.50, 0.72, 0.89];
    for (const ratio of pillars) {
      const px = Math.round(houseLeft + houseW * ratio);

      ctx.fillStyle = "rgba(28, 12, 8, 0.16)";
      ctx.fillRect(px + 5, upperWallTop, 6, baseY - 12 - upperWallTop);

      const pGrad = ctx.createLinearGradient(px - 5, 0, px + 5, 0);
      pGrad.addColorStop(0, timberDark);
      pGrad.addColorStop(0.35, timberHighlight);
      pGrad.addColorStop(0.8, timberMid);
      pGrad.addColorStop(1, timberDark);

      ctx.fillStyle = pGrad;
      ctx.fillRect(px - 5, upperWallTop, 10, baseY - 12 - upperWallTop);

      ctx.fillStyle = "#334155";
      ctx.fillRect(px - 6.5, baseY - 17, 13, 5);
    }

    const doorW = Math.max(38, Math.round(houseW * 0.095));
    const doorH = Math.max(44, Math.round((baseY - 16 - (wallTop + 8)) * 0.68));
    const doorX = Math.round(viewW * 0.5 - doorW * 0.5);
    const doorY = baseY - 16 - doorH;

    ctx.fillStyle = timberDark;
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(doorX, doorY, doorW, doorH, 2);
    ctx.fill();
    ctx.stroke();

    const drawCurvedTileRoof = (peakY, eaveY, leftX, rightX, overhang) => {
      const centerX = (leftX + rightX) * 0.5;
      const spanW = rightX - leftX;

      ctx.save();
      const rGrad = ctx.createLinearGradient(0, peakY, 0, eaveY + 6);
      rGrad.addColorStop(0, "#1e293b");
      rGrad.addColorStop(0.5, "#0f172a");
      rGrad.addColorStop(1, "#020617");

      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.moveTo(centerX, peakY);
      ctx.bezierCurveTo(
        centerX + spanW * 0.22,
        peakY + (eaveY - peakY) * 0.35,
        centerX + spanW * 0.40,
        eaveY - 4,
        rightX + overhang,
        eaveY - 12
      );
      ctx.quadraticCurveTo(rightX + overhang * 0.5, eaveY + 5, rightX - 4, eaveY + 3);
      ctx.quadraticCurveTo(centerX, eaveY - 3, leftX + 4, eaveY + 3);
      ctx.quadraticCurveTo(leftX - overhang * 0.5, eaveY + 5, leftX - overhang, eaveY - 12);
      ctx.bezierCurveTo(
        centerX - spanW * 0.40,
        eaveY - 4,
        centerX - spanW * 0.22,
        peakY + (eaveY - peakY) * 0.35,
        centerX,
        peakY
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(217, 167, 74, 0.78)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    };

    drawCurvedTileRoof(Math.round(viewH * 0.10), upperWallTop + 4, houseLeft + 14, houseRight - 14, 24);
    drawCurvedTileRoof(Math.round(viewH * 0.31), wallTop + 8, houseLeft - 4, houseRight + 4, 28);

    // Warm leuchtende rote Lampions
    const lanternPositions = [
      { x: houseLeft + houseW * 0.20, y: wallTop + 18 },
      { x: houseLeft + houseW * 0.80, y: wallTop + 18 }
    ];
    for (let i = 0; i < lanternPositions.length; i++) {
      const lp = lanternPositions[i];
      const swing = Math.sin(time * 2.0 + i * 1.7) * 2.2;
      const lx = lp.x + swing;
      const ly = lp.y;

      const lHalo = ctx.createRadialGradient(lx, ly + 2, 2, lx, ly + 4, 28);
      lHalo.addColorStop(0, "rgba(251, 146, 60, 0.4)");
      lHalo.addColorStop(1, "rgba(251, 146, 60, 0)");
      ctx.fillStyle = lHalo;
      ctx.beginPath();
      ctx.arc(lx, ly + 4, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(lp.x, wallTop + 6);
      ctx.lineTo(lx, ly - 6);
      ctx.moveTo(lx, ly + 8);
      ctx.lineTo(lx, ly + 14);
      ctx.stroke();

      ctx.fillStyle = "#b91c1c";
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 1, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    drawMiniFallingHearts(ctx, viewW, viewH, time);
  }

  function drawHeartShape(ctx, x, y, r, fill = "#f43f5e", stroke = "#881337", time = 0) {
    const pulse = 1 + Math.sin(time * 8) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);

    // Sanfte Leuchtaura
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.8);
    glow.addColorStop(0, "rgba(244, 63, 94, 0.4)");
    glow.addColorStop(1, "rgba(244, 63, 94, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = r >= 9 ? 1.8 : 1.3;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.9);
    ctx.bezierCurveTo(-r * 1.35, r * 0.1, -r * 1.35, -r * 0.9, 0, -r * 0.25);
    ctx.bezierCurveTo(r * 1.35, -r * 0.9, r * 1.35, r * 0.1, 0, r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glanzpunkt
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.beginPath();
    ctx.arc(-r * 0.42, -r * 0.4, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawDragonBarrel(ctx, x, y, dir, recoilTimer = 0, time = 0) {
    const recoil = recoilTimer > 0 ? Math.sin((recoilTimer / 0.18) * Math.PI) * 4 * -dir : 0;

    ctx.save();
    ctx.translate(x + recoil, y);

    const barrelGrad = ctx.createLinearGradient(0, -6, 0, 6);
    barrelGrad.addColorStop(0, "#fef08a");
    barrelGrad.addColorStop(0.3, "#f59e0b");
    barrelGrad.addColorStop(0.7, "#78350f");
    barrelGrad.addColorStop(1, "#292524");

    ctx.fillStyle = barrelGrad;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 1.5;

    if (dir < 0) {
      // Drachenkanonen-Rohr nach links
      ctx.beginPath();
      ctx.moveTo(-14, -4.5);
      ctx.lineTo(10, -6);
      ctx.lineTo(10, 6);
      ctx.lineTo(-14, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Goldene Ringe
      ctx.fillStyle = "#facc15";
      ctx.fillRect(6, -6.5, 2.5, 13);
      ctx.fillRect(-2, -5.5, 2.5, 11);

      // Schnauze / Drachenmaul
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-12, -5.5);
      ctx.lineTo(-20, -3);
      ctx.lineTo(-20, 3);
      ctx.lineTo(-12, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glühendes Drachenauge
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(-14, -1.8, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(-14, -1.8, 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Drachenkanonen-Rohr nach rechts
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(14, -4.5);
      ctx.lineTo(14, 4.5);
      ctx.lineTo(-10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.fillRect(-8.5, -6.5, 2.5, 13);
      ctx.fillRect(-0.5, -5.5, 2.5, 11);

      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(12, -5.5);
      ctx.lineTo(20, -3);
      ctx.lineTo(20, 3);
      ctx.lineTo(12, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(14, -1.8, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(14, -1.8, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawSingleDragonCannon(ctx, cannon, time = 0) {
    const dir = cannon.dir || -1;
    const wheelY = cannon.y + 11;

    ctx.save();
    // Holzgestell / Lafette
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cannon.x - 7, cannon.y + 3);
    ctx.lineTo(cannon.x - 9, wheelY);
    ctx.moveTo(cannon.x + 7, cannon.y + 3);
    ctx.lineTo(cannon.x + 9, wheelY);
    ctx.moveTo(cannon.x - 11, wheelY);
    ctx.lineTo(cannon.x + 11, wheelY);
    ctx.stroke();

    // Bronzeräder
    for (const wx of [-9, 9]) {
      ctx.fillStyle = "#b45309";
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cannon.x + wx, wheelY, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(cannon.x + wx, wheelY, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawDragonBarrel(ctx, cannon.x, cannon.y, dir, cannon.recoilTimer, time);
    ctx.restore();
  }

  function drawStackedDragonCannons(ctx, lowerCannon, upperCannon, time = 0) {
    const x = lowerCannon.x;
    const topY = upperCannon.y;
    const botY = lowerCannon.y;
    const wheelY = botY + 11;

    ctx.save();
    // Robuster hölzerner Ständer
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x + 2, topY);
    ctx.lineTo(x + 2, botY + 4);
    ctx.stroke();

    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x + 2, topY + 4);
    ctx.lineTo(x - 10, wheelY);
    ctx.moveTo(x + 2, botY + 2);
    ctx.lineTo(x + 10, wheelY);
    ctx.moveTo(x - 12, wheelY);
    ctx.lineTo(x + 12, wheelY);
    ctx.stroke();

    for (const ry of [topY, botY]) {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(x - 3, ry - 4, 10, 8, 2);
      ctx.fill();
      ctx.stroke();
    }

    for (const wx of [-10, 10]) {
      ctx.fillStyle = "#b45309";
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + wx, wheelY, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(x + wx, wheelY, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawDragonBarrel(ctx, lowerCannon.x, lowerCannon.y, lowerCannon.dir || -1, lowerCannon.recoilTimer, time);
    drawDragonBarrel(ctx, upperCannon.x, upperCannon.y, upperCannon.dir || -1, upperCannon.recoilTimer, time);
    ctx.restore();
  }

  function randomInterval(minSec, maxSec) {
    return minSec + Math.random() * (maxSec - minSec);
  }

  function buildLevel3(viewW, viewH) {
    const w = BASE_W;
    const h = BASE_H;

    const plat1Y = 381;
    const plat2Y = 259;
    const plat3Y = 138;

    const plat2X = 72;
    const plat2W = 576;

    const plat3X = 72;
    const plat3W = 576;

    const miniPlatW = 60;
    const miniPlatH = 10;
    const miniPlatX = 390 - Math.round(miniPlatW * 0.5);
    const miniPlatY = plat2Y - 46;

    const platforms = [
      { x: 18, y: plat1Y, w: w - 36, h: 20 },
      { x: plat2X, y: plat2Y, w: plat2W, h: 14 },
      { x: miniPlatX, y: miniPlatY, w: miniPlatW, h: miniPlatH },
      { x: plat3X, y: plat3Y, w: plat3W, h: 14 }
    ];

    const spawnPos = { x: 50, y: plat1Y };
    const lowerLadderX = plat2X + plat2W - 32;
    const upperLadderX = plat3X + 32;

    const bamboos = [
      { x: lowerLadderX, top: plat2Y, bottom: plat1Y, width: 28 },
      { x: upperLadderX, top: plat3Y, bottom: plat2Y, width: 28 }
    ];

    const keys = [
      { x: miniPlatX + miniPlatW * 0.5, y: miniPlatY - 14, collected: false }
    ];

    const cage = {
      x: plat3X + plat3W - 36,
      y: plat3Y - 38,
      w: 38,
      h: 38,
      freed: false
    };

    const bottomStopX = spawnPos.x + 30;
    const midCannonX = plat2X + 24;
    const midStopX = lowerLadderX - 24;

    // Obere Doppelkanone (vor dem Käfig)
    // Unten (plat3Y - 12): kleines Herzchen (r: 6) -> darüber springen
    // Oben (plat3Y - 30): großes Herzchen (r: 10) -> geduckt darunter durchkrabbeln
    const stackedCannonX = cage.x - 72;
    const lowerCannonY = plat3Y - 12;
    const upperCannonY = plat3Y - 30;
    const topCyclePeriod = 3.2;
    const topHalfPeriod = topCyclePeriod * 0.5;
    const topHeartSpeed = 145;
    const topStopX = upperLadderX + 24;

    const state = {
      stackedPair: {
        lower: {
          x: stackedCannonX,
          y: lowerCannonY,
          dir: -1,
          projectileRadius: 6,
          cooldown: 0.4,
          fixedInterval: topCyclePeriod,
          fixedSpeed: topHeartSpeed,
          maxX: topStopX,
          recoilTimer: 0
        },
        upper: {
          x: stackedCannonX,
          y: upperCannonY,
          dir: -1,
          projectileRadius: 10,
          cooldown: 0.4 + topHalfPeriod,
          fixedInterval: topCyclePeriod,
          fixedSpeed: topHeartSpeed,
          maxX: topStopX,
          recoilTimer: 0
        }
      },
      cannons: [
        {
          x: w - 38,
          y: plat1Y - 13,
          dir: -1,
          projectileRadius: 6,
          cooldown: randomInterval(0.8, 2.0),
          minInterval: 1.2,
          maxInterval: 2.8,
          minSpeed: 130,
          maxSpeed: 175,
          maxX: bottomStopX,
          recoilTimer: 0
        },
        {
          x: midCannonX,
          y: plat2Y - 13,
          dir: 1,
          projectileRadius: 6,
          cooldown: randomInterval(0.6, 1.8),
          minInterval: 1.1,
          maxInterval: 2.7,
          minSpeed: 130,
          maxSpeed: 170,
          maxX: midStopX,
          recoilTimer: 0
        }
      ],
      heartProjectiles: []
    };

    state.cannons.push(state.stackedPair.lower, state.stackedPair.upper);

    return {
      mode: "platform",
      worldW: w,
      worldH: h,
      spawn: spawnPos,
      platforms,
      bamboos,
      keys,
      cage,
      cops: [],
      drawBackground: drawChineseHouseBackground,
      update(game, dt) {
        const diff = game.getDifficultyMultiplier ? game.getDifficultyMultiplier() : 1;
        for (const cannon of state.cannons) {
          if (cannon.recoilTimer > 0) {
            cannon.recoilTimer = Math.max(0, cannon.recoilTimer - dt);
          }
          cannon.cooldown -= dt;
          if (cannon.cooldown <= 0) {
            const baseCooldown =
              cannon.fixedInterval ??
              randomInterval(cannon.minInterval, cannon.maxInterval);
            cannon.cooldown = baseCooldown / Math.sqrt(diff);
            cannon.recoilTimer = 0.18;
            const baseSpeed =
              cannon.fixedSpeed ??
              cannon.minSpeed + Math.random() * (cannon.maxSpeed - cannon.minSpeed);
            const speed = baseSpeed * diff;
            const life = cannon.maxFlightTime ?? 5.0;

            state.heartProjectiles.push({
              x: cannon.x + cannon.dir * 19,
              y: cannon.y,
              vx: cannon.dir * speed,
              r: cannon.projectileRadius ?? 6,
              life,
              maxX: cannon.maxX ?? null,
              dir: cannon.dir
            });

            // Kleiner Rauchpuff beim Schuss
            game.spawnParticles(cannon.x + cannon.dir * 20, cannon.y, "rgba(254, 202, 202, 0.75)", 6);
          }
        }

        const p = game.pandi;

        // Kollision mit Drachenkanonen als physische Hindernisse
        // Bei den gestapelten Kanonen kann Pandi darüber springen (Höhe 38px, Sprunghöhe ~82px)
        const stackedBox = {
          x: stackedCannonX - 10,
          y: plat3Y - 36,
          w: 22,
          h: 36
        };

        const overlapsStacked =
          p.x + p.w > stackedBox.x &&
          p.x < stackedBox.x + stackedBox.w &&
          p.y + p.h > stackedBox.y &&
          p.y < stackedBox.y + stackedBox.h;

        if (overlapsStacked) {
          // Wenn Pandi von oben auf die Kanone landet:
          if (p.vy > 0 && p.y + p.h <= stackedBox.y + 10) {
            p.y = stackedBox.y - p.h;
            p.vy = 0;
            p.onGround = true;
          } else {
            // Seitlich gestoßen: Pandi wird geblockt und kann nicht hindurchlaufen
            if (p.x + p.w * 0.5 < stackedBox.x + stackedBox.w * 0.5) {
              p.x = stackedBox.x - p.w;
            } else {
              p.x = stackedBox.x + stackedBox.w;
            }
          }
        }

        // Geschoss-Update & Trefferprüfung
        for (let i = state.heartProjectiles.length - 1; i >= 0; i--) {
          const hp = state.heartProjectiles[i];
          hp.life -= dt;
          hp.x += hp.vx * dt;

          const reachedStopX =
            hp.maxX !== null &&
            ((hp.dir > 0 && hp.x >= hp.maxX) || (hp.dir < 0 && hp.x <= hp.maxX));

          if (hp.life <= 0 || reachedStopX || hp.x < 0 || hp.x > game.world.w) {
            state.heartProjectiles.splice(i, 1);
            game.spawnParticles(hp.x, hp.y, "#f43f5e", 4);
            continue;
          }

          // Präzise Hitbox-Prüfung
          // Duckt Pandi: p.h = 16, Kopf bei plat3Y - 16.
          // Oberes Herz (r: 10): y = plat3Y - 30 -> Unterkante bei plat3Y - 20 -> 4px sicherer Freiraum!
          // Unteres Herz (r: 6): y = plat3Y - 12 -> Unterkante bei plat3Y - 6 -> trifft geduckten Panda -> muss übersprungen werden!
          const px = p.x + 3;
          const py = p.y + 2;
          const pw = p.w - 6;
          const ph = p.h - 3;

          const hr = hp.r * 0.78;
          const closestX = Math.max(px, Math.min(hp.x, px + pw));
          const closestY = Math.max(py, Math.min(hp.y, py + ph));
          const distSq = (hp.x - closestX) ** 2 + (hp.y - closestY) ** 2;

          if (distSq < hr * hr) {
            state.heartProjectiles.splice(i, 1);
            game.spawnParticles(hp.x, hp.y, "#f43f5e", 14);
            game.damagePandi("HERZ-TREFFER!");
          }
        }
      },
      drawEntities(game, ctx) {
        for (const cannon of state.cannons) {
          if (cannon === state.stackedPair.lower || cannon === state.stackedPair.upper) continue;
          drawSingleDragonCannon(ctx, cannon, game.animClock);
        }

        drawStackedDragonCannons(
          ctx,
          state.stackedPair.lower,
          state.stackedPair.upper,
          game.animClock
        );

        for (const hp of state.heartProjectiles) {
          drawHeartShape(ctx, hp.x, hp.y, hp.r, "#f43f5e", "#881337", game.animClock);
        }
      }
    };
  }

  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level3 = drawChineseHouseBackground;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-3",
    shortLabel: "Herzchen Apokalypse",
    name: "HERZCHEN APOKALYPSE",
    mode: "platform",
    keysRequired: 1,
    drawBackground: drawChineseHouseBackground,
    build: buildLevel3
  });
})();
