(() => {
  "use strict";

  const ROW_STEP = 84;

  window.PANDA_PITFALL_LEVELS?.register({
    id: "tree",
    name: "Riesenbaum",
    aspect: 0.62,
    vertical: true,

    enter(game) {
      game.climbHeight = 0;
      const w = game.field.w || 420;
      const h = game.field.h || 640;
      game.vines = [];
      game.platforms = [];
      game.obstacles = [];
      game.treasuresList = [];

      const startY = Math.round(h * 0.52);

      // Startplattform mittig im Sichtfeld
      game.platforms.push({
        x: w * 0.5 - 78,
        y: startY,
        w: 156,
        h: 14
      });

      // Plattformen & Lianen nach oben (Richtung Aufstieg)
      this.nextRowIndex = 1;
      for (let i = 1; i <= 7; i++) {
        this.spawnRowAt(game, startY - i * ROW_STEP, i);
        this.nextRowIndex = i + 1;
      }

      // Einige Sicherheits-Plattformen unterhalb der Mitte als Puffer beim Start
      for (let d = 1; d <= 3; d++) {
        const downY = startY + d * ROW_STEP;
        const platW = 86;
        const slots = [0.14, 0.5 - (platW / w) * 0.5, 0.86 - platW / w];
        const platX = Math.max(14, Math.min(w - platW - 14, w * slots[d % slots.length]));
        game.platforms.push({
          x: platX,
          y: downY,
          w: platW,
          h: 14
        });
      }

      const p = game.panda;
      p.climbing = false;
      p.activeVine = null;
      p.vineRegrabCooldown = 0;
      p.dropThroughTimer = 0;
      p.x = w * 0.5 - p.w * 0.5;
      p.y = startY - p.h;
      p.vx = 0;
      p.vy = 0;
      p.onGround = true;
      p.onPlatform = game.platforms[0];
      p.crouching = false;
      p.h = p.normalH;

      game.addFloatingText(w * 0.5, startY - 36, "RIESENBAUM • MITTIG STARTEN!", "#a3e635");
    },

    spawnRowAt(game, yPos, index) {
      const w = game.field.w;
      const platW = 84;
      const slots = [0.12, 0.5 - (platW / w) * 0.5, 0.88 - platW / w];
      const slot = slots[index % slots.length];
      const platX = Math.max(14, Math.min(w - platW - 14, w * slot));

      game.platforms.push({
        x: platX,
        y: yPos,
        w: platW,
        h: 14
      });

      if (index % 2 === 1) {
        game.spawnTreasure(platX + platW * 0.5, yPos - 22, false);
      }

      // Kurzes, schwingendes Seilsegment (56px–68px), das frei im Raum endet
      const vineLen = 56 + (index % 3) * 6;
      const vineX = index % 2 === 1 ? w * 0.34 : w * 0.66;
      const vineTopY = yPos - 74;
      game.vines.push({
        x: vineX,
        topY: vineTopY,
        botY: vineTopY + vineLen,
        swingAmp: 22,
        swayPhase: index * 1.35,
        swaySpeed: 2.8 + (index % 3) * 0.3,
        hasGem: false,
        gemCollected: true
      });
    },

    spawnRowAbove(game) {
      let highestY = 9999;
      for (const pl of game.platforms) {
        if (pl.y < highestY) highestY = pl.y;
      }
      const newY = highestY - ROW_STEP;
      this.spawnRowAt(game, newY, this.nextRowIndex++);
    },

    spawnObstacle(game) {
      const w = game.field.w;
      const fromLeft = Math.random() < 0.5;
      const y = -36 - Math.random() * 80;
      game.obstacles.push({
        kind: "cloud",
        x: fromLeft ? -55 : w + 15,
        y,
        baseY: y,
        w: 46,
        h: 24,
        vx: fromLeft ? 34 + Math.random() * 14 : -(34 + Math.random() * 14),
        phase: Math.random() * Math.PI * 2,
        hit: false
      });
    },

    update(game, dt) {
      const p = game.panda;
      const w = game.field.w;
      const h = game.field.h;

      const climbScroll = p.y < h * 0.36 ? 64 : 44;
      const dyScroll = climbScroll * dt;
      game.climbHeight += dyScroll;

      p.y += dyScroll;
      for (const pl of game.platforms) {
        pl.y += dyScroll;
      }
      for (const v of game.vines) {
        v.topY += dyScroll;
        v.botY += dyScroll;
        v.swayPhase += dt * (v.swaySpeed ?? 2.8);
      }
      for (const t of game.treasuresList) {
        t.baseY += dyScroll;
        t.y += dyScroll;
      }
      for (const o of game.obstacles) {
        o.baseY += dyScroll;
        o.y += dyScroll;
        o.x += o.vx * dt;
        if (o.x < -80) o.x = w + 60;
        else if (o.x > w + 80) o.x = -60;
      }

      let minTop = 9999;
      for (const pl of game.platforms) {
        if (pl.y < minTop) minTop = pl.y;
      }
      if (minTop > -ROW_STEP) {
        this.spawnRowAbove(game);
      }

      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        this.spawnObstacle(game);
        game.spawnTimer = 2.0 + Math.random() * 1.0;
      }

      for (let i = game.platforms.length - 1; i >= 0; i--) {
        if (game.platforms[i].y > h + 70) {
          if (p.onPlatform === game.platforms[i]) {
            p.onPlatform = null;
            p.onGround = false;
          }
          game.platforms.splice(i, 1);
        }
      }
      for (let i = game.vines.length - 1; i >= 0; i--) {
        if (game.vines[i].topY > h + 90) {
          if (p.activeVine === game.vines[i]) {
            p.climbing = false;
            p.activeVine = null;
          }
          game.vines.splice(i, 1);
        }
      }

      if (p.vineRegrabCooldown > 0) p.vineRegrabCooldown = Math.max(0, p.vineRegrabCooldown - dt);
      if (p.dropThroughTimer > 0) p.dropThroughTimer = Math.max(0, p.dropThroughTimer - dt);

      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;

      if (moveX !== 0) p.vx += moveX * 1020 * dt;
      else p.vx *= Math.pow(0.06, dt);
      p.vx = Math.max(-285, Math.min(285, p.vx));

      p.x += p.vx * dt;
      p.x = Math.max(14, Math.min(w - p.w - 14, p.x));

      if (p.climbing) {
        p.onPlatform = null;
        p.onGround = false;

        let climbDir = 0;
        if (game.input.up) climbDir -= 1;
        if (game.input.down) climbDir += 1;
        p.y += climbDir * 195 * dt;

        if (p.activeVine) {
          const midY = p.y + p.h * 0.5;
          const vinePt = game.getVinePointAtY(p.activeVine, midY);
          const swingVx = game.getVineSwingVelocityX(p.activeVine, midY);
          p.x += (vinePt.x - p.w * 0.5 - p.x) * Math.min(1, 16 * dt);
          p.vx = swingVx;

          if (p.y < p.activeVine.topY + 2) p.y = p.activeVine.topY + 2;
          if (p.y > p.activeVine.botY - 6) {
            p.climbing = false;
            p.activeVine = null;
            p.vineRegrabCooldown = 0.16;
          }
        }

        if (p.jumpBufferTimer > 0) {
          const prevVine = p.activeVine;
          const midY = p.y + p.h * 0.5;
          const swingBoost = prevVine ? game.getVineSwingVelocityX(prevVine, midY) * 1.9 : 0;
          const dirBoost = moveX !== 0 ? moveX * 190 : Math.sign(swingBoost || 1) * 140;
          p.climbing = false;
          p.activeVine = prevVine;
          p.vineRegrabCooldown = 0.16;
          p.vy = -475;
          p.vx = Math.max(-320, Math.min(320, swingBoost + dirBoost));
          p.jumpBufferTimer = 0;
          game.playSfx("playHit");
        }
      } else {
        if (p.onPlatform) {
          const pl = p.onPlatform;
          const feetX = p.x + p.w * 0.5;
          if (feetX < pl.x - 8 || feetX > pl.x + pl.w + 8 || p.dropThroughTimer > 0) {
            p.onPlatform = null;
            p.onGround = false;
          } else {
            p.y = pl.y - p.h;
            p.vy = 0;
            p.onGround = true;
          }
        }

        if (p.onGround || p.onPlatform) p.coyoteTimer = 0.14;
        else p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);

        const wantsJump = p.jumpBufferTimer > 0 || (game.input.up && (p.onGround || p.onPlatform));
        if (p.jumpBufferTimer > 0) p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);

        if (wantsJump && p.coyoteTimer > 0) {
          p.vy = -475;
          p.y -= 4;
          p.onGround = false;
          p.onPlatform = null;
          p.coyoteTimer = 0;
          p.jumpBufferTimer = 0;
          game.playSfx("playHit");
        }

        const prevBottom = p.y + p.h;
        if (!p.onPlatform) {
          p.vy += 880 * dt;
          p.y += p.vy * dt;
        }
        const nextBottom = p.y + p.h;

        if (!p.onPlatform && p.vy > 0 && p.dropThroughTimer <= 0) {
          for (const pl of game.platforms) {
            const overlapX = p.x + p.w - 4 > pl.x && p.x + 4 < pl.x + pl.w;
            if (overlapX && prevBottom <= pl.y + 4 && nextBottom >= pl.y) {
              p.y = pl.y - p.h;
              p.vy = 0;
              p.onGround = true;
              p.onPlatform = pl;
              break;
            }
          }
        }

        if (p.vineRegrabCooldown <= 0 && (game.input.up || p.vy > 55)) {
          const candidate = game.findOverlappingVine(p.activeVine);
          if (candidate) {
            p.climbing = true;
            p.activeVine = candidate;
            p.onPlatform = null;
            p.onGround = false;
            p.vy = 0;
            p.jumpBufferTimer = 0;
          }
        }

        if (p.y > h + 24) {
          game.damagePanda(p.x + p.w * 0.5, h - 20, "ABGESTÜRZT!");
          if (game.phase !== "playing") return;
          const safePlat = game.platforms.find((pl) => pl.y > h * 0.4 && pl.y < h * 0.86) || game.platforms[0];
          if (safePlat) {
            p.climbing = false;
            p.activeVine = null;
            p.onPlatform = safePlat;
            p.onGround = true;
            p.x = safePlat.x + safePlat.w * 0.5 - p.w * 0.5;
            p.y = safePlat.y - p.h;
            p.vx = 0;
            p.vy = 0;
          }
        }
      }

      p.runCycle += dt * 9;
    },

    draw(game, ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c4a6e");
      bg.addColorStop(0.55, "#0f3f25");
      bg.addColorStop(1, "#061b10");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const trunkW = Math.min(92, w * 0.24);
      const trunkX = w * 0.5 - trunkW * 0.5;
      const trunkGrad = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
      trunkGrad.addColorStop(0, "#2d180c");
      trunkGrad.addColorStop(0.45, "#4a2815");
      trunkGrad.addColorStop(1, "#241208");
      ctx.fillStyle = trunkGrad;
      ctx.fillRect(trunkX, 0, trunkW, h);

      const barkStep = 48;
      const bOff = game.climbHeight % barkStep;
      ctx.strokeStyle = "rgba(24, 12, 5, 0.55)";
      ctx.lineWidth = 2;
      for (let y = -bOff; y < h + barkStep; y += barkStep) {
        ctx.beginPath();
        ctx.moveTo(trunkX + trunkW * 0.28, y);
        ctx.lineTo(trunkX + trunkW * 0.28, y + 26);
        ctx.moveTo(trunkX + trunkW * 0.72, y + 14);
        ctx.lineTo(trunkX + trunkW * 0.72, y + 40);
        ctx.stroke();
      }

      game.drawPlatforms(ctx);
      game.drawVines(ctx);
    }
  });
})();