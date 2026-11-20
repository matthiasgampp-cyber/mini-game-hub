(() => {
  "use strict";

  window.PANDA_PITFALL_LEVELS?.register({
    id: "jungle",
    name: "Dschungel",
    aspect: 1.78,

    enter(game) {
      const p = game.panda;
      const groundY = game.field.groundY;
      p.x = Math.max(70, game.field.w * 0.18);
      p.y = groundY - p.h;
      p.onGround = true;
      p.onPlatform = null;

      this.spawnPlatform(game, game.field.w * 0.36, groundY - 76, 130, true);
      this.spawnPlatform(game, game.field.w * 0.66, groundY - 134, 145, true);
      this.spawnVine(game, game.field.w * 0.56);
      game.addFloatingText(p.x + 25, p.y - 12, "DSCHUNGEL!", "#4ade80");
    },

    spawnPlatform(game, xPos = null, yPos = null, widthVal = null, withTreasure = true) {
      const w = game.field.w;
      const h = game.field.h;
      const groundY = game.field.groundY;
      const pw = widthVal ?? (105 + Math.random() * 65);
      const x = xPos ?? w + 35;
      const highTier = Math.random() < 0.48;
      const minTop = Math.max(66, h * 0.24);
      const y = yPos ?? (highTier
        ? Math.max(minTop, groundY - 128 - Math.random() * 24)
        : groundY - 68 - Math.random() * 18);

      const plat = { x, y, w: pw, h: 14 };
      game.platforms.push(plat);

      if (withTreasure) {
        const count = Math.random() < 0.45 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const tx = x + 22 + ((pw - 44) * (count === 1 ? 0.5 : i));
          const ty = y - 22 - (i === 1 ? 18 : 0);
          game.spawnTreasure(tx, ty, true);
        }
      }
      return plat;
    },

    spawnVine(game, xPos = null) {
      const w = game.field.w;
      const h = game.field.h;
      const groundY = game.field.groundY;
      const x = xPos ?? w + 45 + Math.random() * 110;
      const hangRatio = 0.7 + Math.random() * 0.2;
      game.vines.push({
        x,
        topY: 0,
        botY: Math.min(groundY - 6, h * hangRatio),
        swingAmp: 22 + Math.random() * 7,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 3.0 + Math.random() * 0.9,
        hasGem: true,
        gemCollected: false
      });
    },

    spawnObstacle(game) {
      const w = game.field.w;
      const groundY = game.field.groundY;
      const roll = Math.random();
      if (roll < 0.28) {
        game.obstacles.push({
          kind: "log",
          x: w + 35,
          y: groundY - 22,
          w: 28,
          h: 22,
          vx: -(game.scrollSpeed * 0.42 + 45),
          rot: 0,
          hit: false
        });
      } else if (roll < 0.52) {
        const hBranch = 24;
        game.obstacles.push({
          kind: "branch",
          x: w + 45,
          y: groundY - game.panda.normalH - hBranch + 3,
          w: 74,
          h: hBranch,
          vx: 0,
          hit: false
        });
      } else if (roll < 0.76) {
        game.obstacles.push({
          kind: "croc",
          x: w + 50,
          y: groundY - 24,
          w: 50,
          h: 24,
          vx: -20,
          jawPhase: Math.random() * Math.PI * 2,
          hit: false
        });
      } else {
        game.obstacles.push({
          kind: "pit",
          x: w + 40,
          y: groundY,
          w: 54,
          h: 24,
          vx: 0,
          hit: false
        });
      }
    },

    update(game, dt, worldDx) {
      const p = game.panda;
      const groundY = game.field.groundY;
      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;

      if (moveX !== 0) p.vx += moveX * 920 * dt;
      else p.vx *= Math.pow(0.06, dt);
      p.vx = Math.max(-260, Math.min(260, p.vx));

      p.x += p.vx * dt - worldDx * 0.22;
      p.x = Math.max(24, Math.min(game.field.w - p.w - 36, p.x));

      if (p.dropThroughTimer > 0) p.dropThroughTimer = Math.max(0, p.dropThroughTimer - dt);
      if (p.vineGraceTimer > 0) p.vineGraceTimer = Math.max(0, p.vineGraceTimer - dt);

      for (let i = game.platforms.length - 1; i >= 0; i--) {
        const pl = game.platforms[i];
        pl.x -= worldDx;
        if (pl.x + pl.w < -60) {
          if (p.onPlatform === pl) {
            p.onPlatform = null;
            p.onGround = false;
          }
          game.platforms.splice(i, 1);
        }
      }

      const nearVine = game.findOverlappingVine();
      if (!p.climbing && nearVine && (game.input.up || (game.input.down && !p.onGround))) {
        p.climbing = true;
        p.activeVine = nearVine;
        p.vineGraceTimer = 0.14;
        p.vy = 0;
        p.onGround = false;
        p.onPlatform = null;
        p.crouching = false;
      }

      if (p.climbing) {
        p.crouching = false;
        p.h = p.normalH;
        let climbDir = 0;
        if (game.input.up) climbDir -= 1;
        if (game.input.down) climbDir += 1;
        p.y += climbDir * 160 * dt;

        if (p.activeVine) {
          const midY = p.y + p.h * 0.5;
          const vinePt = game.getVinePointAtY(p.activeVine, midY);
          const swingVx = game.getVineSwingVelocityX(p.activeVine, midY);
          p.x += (vinePt.x - p.w * 0.5 - p.x) * Math.min(1, 16 * dt);
          p.vx = swingVx * 1.4;

          if (Math.abs(p.x + p.w * 0.5 - vinePt.x) <= 36 && p.y + p.h >= p.activeVine.topY && p.y <= p.activeVine.botY) {
            p.vineGraceTimer = 0.12;
          }
          if (p.vineGraceTimer <= 0) {
            p.climbing = false;
            p.activeVine = null;
          } else {
            if (p.y <= p.activeVine.topY + 4) p.y = p.activeVine.topY + 4;
            if (p.y + p.h >= groundY) {
              p.y = groundY - p.h;
              p.climbing = false;
              p.activeVine = null;
              p.onGround = true;
            }
          }
        }

        if (p.jumpBufferTimer > 0) {
          const vineRef = p.activeVine;
          const midY = p.y + p.h * 0.5;
          const swingBoost = vineRef ? game.getVineSwingVelocityX(vineRef, midY) * 2.4 : 0;
          const dirBoost = moveX !== 0 ? moveX * 150 : Math.sign(swingBoost || 1) * 135;
          p.climbing = false;
          p.activeVine = null;
          p.vineGraceTimer = 0;
          p.vy = -430;
          p.vx = Math.max(-350, Math.min(350, swingBoost + dirBoost));
          p.jumpBufferTimer = 0;
          game.spawnParticles(p.x + p.w * 0.5, p.y + p.h * 0.5, "#a3e635", 9);
          game.playSfx("playHit");
        }
      } else {
        // 1. Auf Plattform stehen lassen (nur wenn wir nicht gerade abspringen)
        if (p.onPlatform && p.vy >= 0) {
          const pl = p.onPlatform;
          const feetX = p.x + p.w * 0.5;
          if (feetX < pl.x - 4 || feetX > pl.x + pl.w + 4 || p.dropThroughTimer > 0) {
            p.onPlatform = null;
            p.onGround = false;
          } else {
            p.y = pl.y - p.h;
            p.vy = 0;
            p.onGround = true;
          }
        }

        // 2. Coyote-Timer pflegen
        if (p.onGround || p.onPlatform) {
          p.coyoteTimer = 0.14;
        } else {
          p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
        }

        // 3. Sprung-Buffer direkt auslösen, sobald Boden/Plattform oder Coyote aktiv ist
        if (p.jumpBufferTimer > 0) {
          p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
          if (p.coyoteTimer > 0) {
            if (p.crouching) {
              p.crouching = false;
              p.y -= p.normalH - p.crouchH;
              p.h = p.normalH;
            }
            p.vy = -425;
            p.y -= 2;
            p.onGround = false;
            p.onPlatform = null;
            p.coyoteTimer = 0;
            p.jumpBufferTimer = 0;
            game.playSfx("playHit");
          }
        }

        // 4. Ducken aktualisieren
        const wantCrouch = Boolean(game.input.crouch || game.input.down);
        if (wantCrouch && p.onGround) {
          if (!p.crouching) {
            p.crouching = true;
            p.h = p.crouchH;
            p.y += p.normalH - p.crouchH;
          }
        } else if (p.crouching) {
          p.crouching = false;
          p.y -= p.normalH - p.crouchH;
          p.h = p.normalH;
        }

        // 5. Schwerkraft & Kollisionen
        const prevBottom = p.y + p.h;
        if (!p.onPlatform) {
          p.vy += 980 * dt;
          p.y += p.vy * dt;
        }
        const nextBottom = p.y + p.h;

        if (!p.onPlatform && p.vy >= 0 && p.dropThroughTimer <= 0) {
          for (const pl of game.platforms) {
            const overlapX = p.x + p.w - 6 > pl.x && p.x + 6 < pl.x + pl.w;
            if (overlapX && prevBottom <= pl.y + 8 && nextBottom >= pl.y) {
              p.y = pl.y - p.h;
              p.vy = 0;
              p.onGround = true;
              p.onPlatform = pl;
              break;
            }
          }
        }

        if (!p.onPlatform) {
          if (p.y + p.h >= groundY) {
            p.y = groundY - p.h;
            p.vy = 0;
            p.onGround = true;
          } else {
            p.onGround = false;
          }
        }
      }

      game.platformSpawnTimer -= dt;
      if (game.platformSpawnTimer <= 0) {
        this.spawnPlatform(game);
        game.platformSpawnTimer = 1.4 + Math.random() * 0.95;
      }

      game.vineSpawnTimer -= dt;
      if (game.vineSpawnTimer <= 0) {
        this.spawnVine(game);
        game.vineSpawnTimer = 2.6 + Math.random() * 1.8;
      }

      for (let i = game.vines.length - 1; i >= 0; i--) {
        const v = game.vines[i];
        v.x -= worldDx;
        v.swayPhase += dt * (v.swaySpeed ?? 3.1);
        if (v.hasGem && !v.gemCollected) {
          const gemPt = game.getVinePointAtY(v, v.topY + 46);
          if (Math.abs(p.x + p.w / 2 - gemPt.x) < 26 && Math.abs(p.y + p.h / 2 - gemPt.y) < 28) {
            v.gemCollected = true;
            game.treasures += 1;
            game.score += 150;
            game.playSfx("playScore");
            game.spawnParticles(gemPt.x, gemPt.y, "#38bdf8", 12);
            game.addFloatingText(gemPt.x, gemPt.y - 6, "+150", "#38bdf8");
            game.updateHud();
          }
        }
        if (v.x < -70) {
          if (p.activeVine === v) {
            p.climbing = false;
            p.activeVine = null;
          }
          game.vines.splice(i, 1);
        }
      }

      p.runCycle += dt * (p.onGround && !p.crouching && !p.climbing ? game.scrollSpeed * 0.065 : p.climbing ? 11 : 5);
    },

    draw(game, ctx, w, h) {
      const groundY = game.field.groundY;
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, "#072214");
      sky.addColorStop(0.5, "#0f3f25");
      sky.addColorStop(1, "#185934");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      const farOffset = (game.distance * 0.16) % 160;
      ctx.fillStyle = "#0b321e";
      for (let x = -farOffset - 80; x < w + 180; x += 160) {
        ctx.beginPath();
        ctx.arc(x + 80, groundY - 18, 98, Math.PI, 0);
        ctx.fill();
      }

      const midOffset = (game.distance * 0.38) % 135;
      for (let x = -midOffset - 70; x < w + 160; x += 135) {
        ctx.fillStyle = "#3b2314";
        ctx.fillRect(x + 28, 22, 14, groundY - 22);
        ctx.fillStyle = "#14532d";
        ctx.beginPath();
        ctx.arc(x + 35, 32, 36, 0, Math.PI * 2);
        ctx.arc(x + 10, 44, 25, 0, Math.PI * 2);
        ctx.arc(x + 60, 44, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(x + 35, 26, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      const fernStep = 76;
      const fOff = (game.distance * 0.75) % fernStep;
      for (let fx = -fOff - 30; fx < w + fernStep; fx += fernStep) {
        ctx.fillStyle = "#15803d";
        for (let a = -0.8; a <= 0.8; a += 0.4) {
          ctx.save();
          ctx.translate(fx, groundY - 3);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.ellipse(0, -14, 5, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      const canopyOffset = (game.distance * 0.65) % 58;
      ctx.fillStyle = "#061b10";
      for (let x = -canopyOffset - 32; x < w + 64; x += 58) {
        ctx.beginPath();
        ctx.arc(x + 29, 4, 34, 0, Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = "#15803d";
      for (let x = -canopyOffset - 24; x < w + 64; x += 58) {
        ctx.beginPath();
        ctx.arc(x + 29, 0, 24, 0, Math.PI);
        ctx.fill();
      }

      game.drawVines(ctx);
      game.drawPlatforms(ctx);

      const earthGrad = ctx.createLinearGradient(0, groundY, 0, h);
      earthGrad.addColorStop(0, "#3b2314");
      earthGrad.addColorStop(1, "#180d07");
      ctx.fillStyle = earthGrad;
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(0, groundY - 4, w, 9);

      const grassStep = 20;
      const gOff = game.distance % grassStep;
      ctx.fillStyle = "#4ade80";
      for (let gx = -gOff; gx < w + grassStep; gx += grassStep) {
        ctx.beginPath();
        ctx.moveTo(gx, groundY - 3);
        ctx.lineTo(gx + 5, groundY - 12);
        ctx.lineTo(gx + 10, groundY - 3);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
})();