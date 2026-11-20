(() => {
  "use strict";

  const BALLOON_COLORS = ["#fb7185", "#facc15", "#38bdf8", "#c084fc", "#4ade80"];

  window.PANDA_PITFALL_LEVELS?.register({
    id: "balloon",
    name: "Ballonflug",
    aspect: 1.78,

    enter(game) {
      game.balloonColor = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
      const p = game.panda;
      p.climbing = false;
      p.activeVine = null;
      p.onPlatform = null;
      p.crouching = false;
      p.h = p.normalH;
      p.x = Math.max(70, game.field.w * 0.2);
      p.y = Math.max(56, game.field.groundY * 0.32);
      p.vx = 0;
      p.vy = -45;
      p.onGround = false;

      const y = 65 + Math.random() * Math.max(35, game.field.groundY - 175);
      game.obstacles.push({
        kind: "bird",
        x: game.field.w * 0.72,
        y,
        baseY: y,
        w: 30,
        h: 22,
        vx: -48,
        phase: Math.random() * 6,
        hit: false
      });
      game.addFloatingText(p.x + 25, p.y - 16, "BALLONFLUG!", "#f472b6");
    },

    spawnObstacle(game) {
      const w = game.field.w;
      const groundY = game.field.groundY;
      const roll = Math.random();
      if (roll < 0.56) {
        const y = 50 + Math.random() * Math.max(40, groundY - 165);
        game.obstacles.push({
          kind: "bird",
          x: w + 35,
          y,
          baseY: y,
          w: 30,
          h: 22,
          vx: -(42 + Math.random() * 24),
          phase: Math.random() * 6,
          hit: false
        });
      } else {
        const y = 42 + Math.random() * Math.max(40, groundY - 160);
        game.obstacles.push({
          kind: "cloud",
          x: w + 45,
          y,
          baseY: y,
          w: 48,
          h: 26,
          vx: -24,
          phase: Math.random() * 6,
          hit: false
        });
      }
    },

    update(game, dt, worldDx) {
      const p = game.panda;
      const w = game.field.w;
      const groundY = game.field.groundY;

      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;
      if (moveX !== 0) p.vx += moveX * 760 * dt;
      else p.vx *= Math.pow(0.08, dt);
      p.vx = Math.max(-230, Math.min(230, p.vx));

      p.x += p.vx * dt - worldDx * 0.12;
      p.x = Math.max(24, Math.min(w - p.w - 28, p.x));

      if (game.input.up) p.vy -= 430 * dt;
      if (game.input.down) p.vy += 380 * dt;
      p.vy += 170 * dt;
      p.vy *= Math.pow(0.28, dt);
      p.vy = Math.max(-245, Math.min(220, p.vy));
      p.y += p.vy * dt;

      if (p.y < 36) {
        p.y = 36;
        if (p.vy < 0) p.vy = 0;
      }
      if (p.y + p.h > groundY - 8) {
        p.y = groundY - 8 - p.h;
        if (p.vy > 0) p.vy = -70;
      }

      p.runCycle += dt * 6;
    },

    draw(game, ctx, w, h) {
      const groundY = game.field.groundY;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1d4ed8");
      sky.addColorStop(0.55, "#38bdf8");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      const cOff = (game.distance * 0.2) % 220;
      for (let x = -cOff; x < w + 220; x += 220) {
        ctx.beginPath();
        ctx.arc(x + 40, 56, 18, 0, Math.PI * 2);
        ctx.arc(x + 60, 50, 22, 0, Math.PI * 2);
        ctx.arc(x + 82, 57, 17, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gleichmäßige, durchgängige Bergkette ohne plötzliche Gipfelwechsel
      const scroll = game.distance * 0.22;
      const step = 16;
      const mGrad = ctx.createLinearGradient(0, groundY - 95, 0, groundY + 12);
      mGrad.addColorStop(0, "#64748b");
      mGrad.addColorStop(1, "#334155");
      ctx.fillStyle = mGrad;

      ctx.beginPath();
      ctx.moveTo(-step, groundY + 12);
      for (let sx = -step; sx <= w + step * 2; sx += step) {
        const worldX = sx + scroll;
        const peakY = game.getMountainPeakYAt(worldX);
        ctx.lineTo(sx, peakY);
      }
      ctx.lineTo(w + step * 2, groundY + 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, groundY, w, h - groundY);
    }
  });
})();