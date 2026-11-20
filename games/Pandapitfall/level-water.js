(() => {
  "use strict";

  window.PANDA_PITFALL_LEVELS?.register({
    id: "water",
    name: "Unterwasser",
    aspect: 1.78,

    enter(game) {
      game.air = game.maxAir;
      const p = game.panda;
      p.climbing = false;
      p.activeVine = null;
      p.onPlatform = null;
      p.crouching = false;
      p.h = p.normalH;
      p.x = Math.max(70, game.field.w * 0.2);
      p.y = Math.max(game.field.surfaceY + 26, game.field.groundY * 0.5);
      p.vx = 0;
      p.vy = 0;
      p.onGround = false;

      this.spawnDriftLog(game, game.field.w * 0.52);
      this.spawnKelp(game, game.field.w * 0.72);
      game.addFloatingText(p.x + 25, p.y - 14, "UNTERWASSER!", "#38bdf8");
      game.updateHud();
    },

    spawnDriftLog(game, xPos = null) {
      const w = game.field.w;
      const surfaceY = game.field.surfaceY;
      const logW = 78 + Math.random() * 34;
      game.obstacles.push({
        kind: "driftlog",
        x: xPos ?? w + 45,
        y: Math.max(8, surfaceY - 12),
        w: logW,
        h: 18,
        vx: -18,
        hit: false
      });
    },

    spawnKelp(game, xPos = null) {
      const w = game.field.w;
      const groundY = game.field.groundY;
      const kelpH = 54 + Math.random() * 34;
      game.obstacles.push({
        kind: "kelp",
        x: xPos ?? w + 40,
        y: groundY - kelpH,
        w: 22,
        h: kelpH,
        vx: -10,
        phase: Math.random() * Math.PI * 2,
        hit: false
      });
    },

    spawnObstacle(game) {
      const w = game.field.w;
      const groundY = game.field.groundY;
      const surfaceY = game.field.surfaceY;
      const roll = Math.random();
      if (roll < 0.24) {
        this.spawnDriftLog(game);
      } else if (roll < 0.48) {
        this.spawnKelp(game);
      } else if (roll < 0.74) {
        const y = surfaceY + 34 + Math.random() * Math.max(35, groundY - surfaceY - 78);
        game.obstacles.push({ kind: "jelly", x: w + 35, y, baseY: y, w: 26, h: 24, vx: -26, phase: Math.random() * 6, hit: false });
      } else {
        const y = surfaceY + 42 + Math.random() * Math.max(35, groundY - surfaceY - 82);
        game.obstacles.push({ kind: "fish", x: w + 40, y, baseY: y, w: 30, h: 20, vx: -42, phase: Math.random() * 6, hit: false });
      }
    },

    update(game, dt, worldDx) {
      const p = game.panda;
      const w = game.field.w;
      const groundY = game.field.groundY;
      const surfaceY = game.field.surfaceY;

      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;
      if (moveX !== 0) p.vx += moveX * 760 * dt;
      else p.vx *= Math.pow(0.08, dt);
      p.vx = Math.max(-230, Math.min(230, p.vx));

      p.x += p.vx * dt - worldDx * 0.14;
      p.x = Math.max(24, Math.min(w - p.w - 28, p.x));

      if (game.input.up) p.vy -= 420 * dt;
      if (game.input.down) p.vy += 420 * dt;
      p.vy += 155 * dt;
      p.vy *= Math.pow(0.24, dt);
      p.vy = Math.max(-240, Math.min(230, p.vy));
      p.y += p.vy * dt;

      for (const o of game.obstacles) {
        if (o.kind === "driftlog") {
          const overlapX = p.x + p.w - 4 > o.x && p.x + 4 < o.x + o.w;
          if (overlapX && p.y <= o.y + o.h && p.y + p.h >= o.y) {
            if (p.vy < 0) p.vy = 25;
            p.y = Math.max(p.y, o.y + o.h);
          }
        }
      }

      if (p.y < surfaceY + 4) {
        p.y = surfaceY + 4;
        if (p.vy < 0) p.vy = 0;
      }
      if (p.y + p.h > groundY) {
        p.y = groundY - p.h;
        if (p.vy > 0) p.vy = 0;
      }

      const nearSurface = p.y <= surfaceY + 18;
      game.air = nearSurface ? Math.min(game.maxAir, game.air + 34 * dt) : Math.max(0, game.air - 9.5 * dt);
      if (game.air <= 0) {
        game.damagePanda(p.x + p.w * 0.5, p.y, "KEINE LUFT!");
        game.air = 55;
      }

      game.bubbleTimer -= dt;
      if (game.bubbleTimer <= 0) {
        game.bubbles.push({ x: 24 + Math.random() * (w - 48), y: groundY - 6, r: 2 + Math.random() * 3.5, spd: 28 + Math.random() * 28 });
        game.bubbleTimer = 0.25 + Math.random() * 0.25;
      }
      for (let i = game.bubbles.length - 1; i >= 0; i--) {
        const b = game.bubbles[i];
        b.y -= b.spd * dt;
        b.x += Math.sin(game.animClock * 3 + i) * 12 * dt;
        if (b.y < surfaceY) game.bubbles.splice(i, 1);
      }

      p.runCycle += dt * 7;
      game.updateHud();
    },

    draw(game, ctx, w, h) {
      const groundY = game.field.groundY;
      const surfaceY = game.field.surfaceY;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, surfaceY);
      skyGrad.addColorStop(0, "#0c4a6e");
      skyGrad.addColorStop(1, "#38bdf8");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, surfaceY);

      const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, groundY);
      waterGrad.addColorStop(0, "#0284c7");
      waterGrad.addColorStop(0.55, "#075985");
      waterGrad.addColorStop(1, "#082f49");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, surfaceY, w, groundY - surfaceY);

      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const waveOff = (game.distance * 0.6) % 36;
      for (let x = -waveOff; x <= w + 36; x += 18) {
        const wy = surfaceY + Math.sin((x + game.distance * 0.5) * 0.08) * 3;
        if (x === -waveOff) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(186, 230, 253, 0.35)";
      for (const b of game.bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const sandGrad = ctx.createLinearGradient(0, groundY, 0, h);
      sandGrad.addColorStop(0, "#854d0e");
      sandGrad.addColorStop(1, "#422006");
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(0, groundY - 3, w, 6);

      // Sauerstoff-Balken direkt im Wasser-Bild oben links
      const ratio = Math.max(0, Math.min(1, (game.air ?? 0) / (game.maxAir || 100)));
      const barW = 136;
      const barH = 12;
      const bx = 14;
      const by = surfaceY + 12;
      ctx.save();
      ctx.fillStyle = "rgba(8, 47, 73, 0.85)";
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW, barH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ratio < 0.3 ? "#fb7185" : "#38bdf8";
      if (ratio > 0) {
        ctx.beginPath();
        ctx.roundRect(bx + 2, by + 2, Math.max(4, (barW - 4) * ratio), barH - 4, 4);
        ctx.fill();
      }

      ctx.font = "800 10px Orbitron, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#f0f9ff";
      ctx.fillText(`SAUERSTOFF ${Math.ceil(game.air ?? 0)}%`, bx + barW + 8, by + 10);
      ctx.restore();
    }
  });
})();