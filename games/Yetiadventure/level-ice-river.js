(() => {
  "use strict";

  const BREAK_DURATION = 2.0;

  window.YETI_ADVENTURE_LEVELS?.register({
    id: "ice_river",
    name: "Eisfluss",
    aspect: 1.78,

    enter(game) {
      const w = game.field.w || 720;
      const riverY = game.field.riverY || 315;
      game.floes = [];
      game.obstacles = [];
      game.treasuresList = [];

      const startFloe = {
        x: 75,
        y: riverY - 4,
        baseY: riverY - 4,
        w: 136,
        h: 16,
        type: "white",
        driftVx: -32,
        phase: 0,
        steppedOn: false,
        breakTimer: BREAK_DURATION,
        broken: false
      };
      game.floes.push(startFloe);

      // Lücken bewusst moderat halten (28px–46px), damit keine zu weiten Sprünge entstehen
      let cursorX = 238;
      let idx = 1;
      while (cursorX < w + 200) {
        const isGray = idx % 3 === 0;
        const floeW = isGray ? 92 : 112 + (idx % 2) * 18;
        const floeY = riverY - 4 - ((idx % 2) * 6);
        game.floes.push({
          x: cursorX,
          y: floeY,
          baseY: floeY,
          w: floeW,
          h: 16,
          type: isGray ? "gray" : "white",
          driftVx: -34 - (idx % 3) * 6,
          phase: idx * 0.9,
          steppedOn: false,
          breakTimer: BREAK_DURATION,
          broken: false
        });
        cursorX += floeW + 28 + (idx % 3) * 8;
        idx++;
      }

      const y = game.yeti;
      y.x = 115;
      y.y = startFloe.y - y.h;
      y.vx = 0;
      y.vy = 0;
      y.onFloe = startFloe;
      y.crouching = false;
      y.h = y.normalH;
      y.coyoteTimer = 0.15;
      y.jumpBufferTimer = 0;
      y.dropThroughTimer = 0;

      game.addFloatingText(w * 0.5, riverY - 125, "EISFLUSS • WEISS = SICHER, GRAU = 2s!", "#67e8f9");
    },

    spawnFloe(game) {
      const w = game.field.w;
      const riverY = game.field.riverY;
      let rightmostEdge = w + 10;
      for (const fl of game.floes) {
        if (!fl.broken && fl.x + fl.w > rightmostEdge) {
          rightmostEdge = fl.x + fl.w;
        }
      }

      // Moderater Abstand (28px–48px), damit alle Sprünge bequem schaffbar sind
      const gap = 28 + Math.random() * 20;
      const isGray = Math.random() < 0.34;
      const floeW = isGray ? 90 + Math.random() * 14 : 108 + Math.random() * 26;
      const floeY = riverY - 4 - Math.random() * 9;

      const floe = {
        x: Math.max(w + 20, rightmostEdge + gap),
        y: floeY,
        baseY: floeY,
        w: floeW,
        h: 16,
        type: isGray ? "gray" : "white",
        driftVx: -(game.scrollSpeed * 0.22 + Math.random() * 16),
        phase: Math.random() * Math.PI * 2,
        steppedOn: false,
        breakTimer: BREAK_DURATION,
        broken: false
      };
      game.floes.push(floe);

      if (!isGray && Math.random() < 0.55) {
        game.spawnTreasure(floe.x + floe.w * 0.5, floe.y - 26);
      }
    },

    spawnObstacle(game) {
      const w = game.field.w;
      const riverY = game.field.riverY;
      const y = riverY - 22;
      game.obstacles.push({
        kind: "ice_shard",
        x: w + 30,
        y,
        baseY: y,
        w: 24,
        h: 22,
        vx: -20,
        phase: Math.random() * Math.PI * 2,
        hit: false
      });
    },

    update(game, dt, worldDx) {
      const y = game.yeti;
      const w = game.field.w;
      const h = game.field.h;
      const riverY = game.field.riverY;

      game.floeSpawnTimer -= dt;
      if (game.floeSpawnTimer <= 0) {
        this.spawnFloe(game);
        game.floeSpawnTimer = 0.42 + Math.random() * 0.22;
      }

      for (let i = game.floes.length - 1; i >= 0; i--) {
        const fl = game.floes[i];
        fl.phase += dt * 3.4;
        fl.x += (fl.driftVx - worldDx * 0.4) * dt;

        if (fl.type === "gray" && fl.steppedOn && !fl.broken) {
          fl.breakTimer -= dt;
          fl.y = fl.baseY + Math.sin(game.animClock * 42) * 2.2;
          if (fl.breakTimer <= 0) {
            fl.broken = true;
            game.playSfx("playHit");
            game.spawnParticles(fl.x + fl.w * 0.5, fl.y + fl.h * 0.5, "#94a3b8", 12);
            if (y.onFloe === fl) {
              y.onFloe = null;
            }
          }
        } else if (!fl.broken) {
          fl.y = fl.baseY + Math.sin(fl.phase) * 2.2;
        }

        if (fl.x + fl.w < -80 || (fl.broken && fl.y > h + 40)) {
          if (y.onFloe === fl) y.onFloe = null;
          game.floes.splice(i, 1);
        }
      }

      const wantsCrouch = Boolean(game.input.crouch);
      if (wantsCrouch && y.onFloe) {
        if (!y.crouching) {
          y.crouching = true;
          y.y += y.normalH - y.crouchH;
          y.h = y.crouchH;
        }
      } else if (y.crouching) {
        y.crouching = false;
        y.y -= y.normalH - y.crouchH;
        y.h = y.normalH;
      }

      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;

      if (moveX !== 0) y.vx += moveX * 1100 * dt;
      else y.vx *= Math.pow(0.05, dt);
      y.vx = Math.max(-270, Math.min(270, y.vx));

      y.x += y.vx * dt;
      y.x = Math.max(16, Math.min(w - y.w - 16, y.x));

      if (y.onFloe) {
        const fl = y.onFloe;
        const feetX = y.x + y.w * 0.5;
        if (fl.broken || feetX < fl.x - 8 || feetX > fl.x + fl.w + 8) {
          y.onFloe = null;
        } else {
          y.x += (fl.driftVx - worldDx * 0.4) * dt;
          y.y = fl.y - y.h;
          y.vy = 0;
          if (fl.type === "gray") fl.steppedOn = true;
        }
      }

      if (y.onFloe) y.coyoteTimer = 0.16;
      else y.coyoteTimer = Math.max(0, y.coyoteTimer - dt);

      if (y.jumpBufferTimer > 0) y.jumpBufferTimer = Math.max(0, y.jumpBufferTimer - dt);
      if (y.jumpBufferTimer > 0 && y.coyoteTimer > 0) {
        y.vy = -465;
        y.y -= 4;
        y.onFloe = null;
        y.coyoteTimer = 0;
        y.jumpBufferTimer = 0;
        game.playSfx("playHit");
      }

      const prevBottom = y.y + y.h;
      if (!y.onFloe) {
        y.vy += 840 * dt;
        y.y += y.vy * dt;
      }
      const nextBottom = y.y + y.h;

      if (!y.onFloe && y.vy >= 0) {
        for (const fl of game.floes) {
          if (fl.broken) continue;
          const overlapX = y.x + y.w - 4 > fl.x && y.x + 4 < fl.x + fl.w;
          if (overlapX && prevBottom <= fl.y + 9 && nextBottom >= fl.y) {
            y.y = fl.y - y.h;
            y.vy = 0;
            y.onFloe = fl;
            if (fl.type === "gray") fl.steppedOn = true;
            break;
          }
        }
      }

      if (y.y + y.h > riverY + 14) {
        game.damagePanda(y.x + y.w * 0.5, riverY + 6, "EISKALTES WASSER!");
        if (game.phase !== "playing") return;

        const rescueFloe = {
          x: Math.max(40, y.x - 24),
          y: riverY - 4,
          baseY: riverY - 4,
          w: 124,
          h: 16,
          type: "white",
          driftVx: -32,
          phase: 0,
          steppedOn: false,
          breakTimer: BREAK_DURATION,
          broken: false
        };
        game.floes.push(rescueFloe);
        y.onFloe = rescueFloe;
        y.y = rescueFloe.y - y.h;
        y.vy = 0;
      }

      y.runCycle += dt * (y.onFloe ? 9 : 4);
    },

    draw(game, ctx, w, h) {
      const riverY = game.field.riverY;

      const sky = ctx.createLinearGradient(0, 0, 0, riverY);
      sky.addColorStop(0, "#082f49");
      sky.addColorStop(0.55, "#0e7490");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, riverY);

      // Dynamisch mitlaufende Berge mit variierender Höhe & Breite (wie bei Panda)
      const spanA = 220;
      const offsetA = game.distance * 0.16;
      const startIndexA = Math.floor(offsetA / spanA) - 1;
      const endIndexA = startIndexA + Math.ceil(w / spanA) + 3;

      for (let idx = startIndexA; idx <= endIndexA; idx++) {
        const baseX = idx * spanA - offsetA;
        const widthScale = 0.82 + 0.34 * Math.sin(idx * 1.45 + game.animClock * 0.35);
        const heightScale = 0.72 + 0.42 * Math.cos(idx * 1.12 + game.animClock * 0.5);
        const peakHalfW = (spanA * 0.58) * widthScale;
        const peakH = 135 * heightScale;
        const centerX = baseX + spanA * 0.5;

        ctx.fillStyle = "#335c81";
        ctx.beginPath();
        ctx.moveTo(centerX - peakHalfW, riverY);
        ctx.lineTo(centerX, riverY - peakH);
        ctx.lineTo(centerX + peakHalfW, riverY);
        ctx.closePath();
        ctx.fill();

        const snowH = peakH * 0.42;
        ctx.fillStyle = "#f0f9ff";
        ctx.beginPath();
        ctx.moveTo(centerX, riverY - peakH);
        ctx.lineTo(centerX - peakHalfW * 0.34, riverY - peakH + snowH);
        ctx.lineTo(centerX - peakHalfW * 0.12, riverY - peakH + snowH * 0.78);
        ctx.lineTo(centerX, riverY - peakH + snowH * 1.05);
        ctx.lineTo(centerX + peakHalfW * 0.14, riverY - peakH + snowH * 0.78);
        ctx.lineTo(centerX + peakHalfW * 0.34, riverY - peakH + snowH);
        ctx.closePath();
        ctx.fill();
      }

      // Vordere Gletscherkuppen mit dynamischer Größenänderung
      const spanB = 165;
      const offsetB = game.distance * 0.32;
      const startIndexB = Math.floor(offsetB / spanB) - 1;
      const endIndexB = startIndexB + Math.ceil(w / spanB) + 3;

      for (let idx = startIndexB; idx <= endIndexB; idx++) {
        const baseX = idx * spanB - offsetB;
        const widthScale = 0.84 + 0.3 * Math.cos(idx * 1.7 - game.animClock * 0.45);
        const heightScale = 0.7 + 0.45 * Math.sin(idx * 1.3 + game.animClock * 0.6);
        const peakHalfW = (spanB * 0.56) * widthScale;
        const peakH = 82 * heightScale;
        const centerX = baseX + spanB * 0.5;

        ctx.fillStyle = "#1d4ed8";
        ctx.beginPath();
        ctx.moveTo(centerX - peakHalfW, riverY);
        ctx.lineTo(centerX, riverY - peakH);
        ctx.lineTo(centerX + peakHalfW, riverY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#e0f2fe";
        ctx.beginPath();
        ctx.moveTo(centerX, riverY - peakH);
        ctx.lineTo(centerX - peakHalfW * 0.3, riverY - peakH * 0.56);
        ctx.lineTo(centerX, riverY - peakH * 0.64);
        ctx.lineTo(centerX + peakHalfW * 0.3, riverY - peakH * 0.56);
        ctx.closePath();
        ctx.fill();
      }

      const water = ctx.createLinearGradient(0, riverY, 0, h);
      water.addColorStop(0, "#0284c7");
      water.addColorStop(0.45, "#0369a1");
      water.addColorStop(1, "#082f49");
      ctx.fillStyle = water;
      ctx.fillRect(0, riverY, w, h - riverY);

      ctx.strokeStyle = "rgba(224, 242, 254, 0.45)";
      ctx.lineWidth = 1.6;
      const waveShift = (game.distance * 0.65) % 90;
      for (let wy = riverY + 12; wy < h; wy += 16) {
        ctx.beginPath();
        for (let wx = -90 - waveShift; wx < w + 90; wx += 45) {
          ctx.moveTo(wx, wy + Math.sin((wx + game.animClock * 90) * 0.04) * 2);
          ctx.lineTo(wx + 24, wy - Math.sin((wx + game.animClock * 90) * 0.04) * 2);
        }
        ctx.stroke();
      }

      for (const fl of game.floes) {
        if (fl.broken) continue;
        ctx.save();
        ctx.translate(fl.x, fl.y);

        if (fl.type === "white") {
          ctx.fillStyle = "#f8fafc";
          ctx.strokeStyle = "#7dd3fc";
        } else {
          const ratio = Math.max(0, fl.breakTimer / BREAK_DURATION);
          ctx.fillStyle = ratio < 0.45 ? "#64748b" : "#94a3b8";
          ctx.strokeStyle = "#334155";
        }

        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(0, 0, fl.w, fl.h, 5);
        ctx.fill();
        ctx.stroke();

        if (fl.type === "gray" && fl.steppedOn) {
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(fl.w * 0.3, 1);
          ctx.lineTo(fl.w * 0.38, fl.h * 0.65);
          ctx.lineTo(fl.w * 0.28, fl.h - 1);
          ctx.moveTo(fl.w * 0.68, 1);
          ctx.lineTo(fl.w * 0.62, fl.h * 0.7);
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  });
})();