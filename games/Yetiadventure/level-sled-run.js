(() => {
  "use strict";

  const METERS_PER_PX = 1 / 18;
  const RAMP_INTERVAL_METERS = 75;

  window.YETI_ADVENTURE_LEVELS?.register({
    id: "sled_run",
    name: "Schlittenfahrt",
    aspect: 0.62,
    vertical: true,

    enter(game) {
      const w = game.field.w || 420;
      const h = game.field.h || 640;

      game.floes = [];
      game.obstacles = [];
      game.treasuresList = [];
      game.ramps = [];
      game.cracks = [];
      game.funnels = [];
      this.trees = [];

      this.climbPx = 0;
      this.nextRampMeters = Math.floor(game.distance * METERS_PER_PX) + RAMP_INTERVAL_METERS;
      this.boulderTimer = 1.15;
      this.treeTimer = 0.35;
      this.airTime = 0;
      this.maxAirTime = 1.05;
      this.rampGraceTimer = 0;
      this.lastRampRef = null;

      this.curveSeedA = Math.random() * Math.PI * 2;
      this.curveSeedB = Math.random() * Math.PI * 2;
      this.curveAmp = 34 + Math.random() * 20;

      for (let ty = -40; ty < h + 80; ty += 78) {
        this.spawnTreeAt(game, ty, Math.random() < 0.5 ? "left" : "right");
      }

      const startCenter = this.getTrackCenterAt(game, h * 0.76);
      const y = game.yeti;
      y.onFloe = null;
      y.crouching = false;
      y.h = y.normalH;
      y.x = Math.round(startCenter - y.w * 0.5);
      y.y = Math.round(h * 0.76 - y.h);
      y.vx = 0;
      y.vy = 0;
      y.coyoteTimer = 0.16;
      y.jumpBufferTimer = 0;

      game.addFloatingText(w * 0.5, y.y - 34, "BERGAUF • SELBST LENKEN & SCHANZE TREFFEN!", "#38bdf8");
    },

    getWorldTrackCoord(screenY) {
      return this.climbPx - screenY;
    },

    getTrackCenterAt(game, screenY) {
      const w = game.field.w;
      const baseCenter = w * 0.5;
      const worldCoord = this.getWorldTrackCoord(screenY) * 0.011;
      const maxSwing = Math.max(20, Math.min(50, w * 0.12));
      const wave =
        Math.sin(worldCoord + this.curveSeedA) * 0.65 +
        Math.sin(worldCoord * 2.15 + this.curveSeedB) * 0.35;
      return baseCenter + wave * Math.min(this.curveAmp, maxSwing);
    },

    // Normale Pistenbreite (mit Kurven)
    getTrackBounds(game, screenY) {
      const w = game.field.w;
      const baseHalfW = Math.min(w * 0.4, 165);
      const centerX = this.getTrackCenterAt(game, screenY);
      return {
        left: centerX - baseHalfW,
        right: centerX + baseHalfW,
        centerX,
        halfW: baseHalfW
      };
    },

    // Prüft, ob screenY in einem Engpass-Bereich liegt und liefert den schmalen Durchlass
    getActiveFunnelAt(game, screenY) {
      const y = game.yeti;
      const narrowHalfW = Math.max((y?.w || 36) * 0.5 + 10, 28);

      for (const f of game.funnels || []) {
        if (screenY <= f.yStart && screenY >= f.yEnd) {
          return {
            left: f.centerX - narrowHalfW,
            right: f.centerX + narrowHalfW,
            centerX: f.centerX,
            halfW: narrowHalfW,
            funnel: f
          };
        }
      }
      return null;
    },

    spawnTreeAt(game, screenY, forcedSide = null) {
      const w = game.field.w;
      const bounds = this.getTrackBounds(game, screenY);
      const side = forcedSide || (Math.random() < 0.5 ? "left" : "right");
      const scale = 0.82 + Math.random() * 0.36;
      const treeW = 30 * scale;

      let x;
      if (side === "left") {
        const maxLeft = bounds.left - treeW * 0.55 - 6;
        const minLeft = 8;
        if (maxLeft < minLeft + 4) return;
        x = minLeft + Math.random() * (maxLeft - minLeft);
      } else {
        const minRight = bounds.right + treeW * 0.55 + 6;
        const maxRight = w - 8;
        if (maxRight < minRight + 4) return;
        x = minRight + Math.random() * (maxRight - minRight);
      }

      this.trees.push({
        x,
        y: screenY,
        scale,
        side,
        swayPhase: Math.random() * Math.PI * 2
      });
    },

    spawnRampAndCrack(game) {
      const w = game.field.w;
      const spawnY = -95;
      const centerX = this.getTrackCenterAt(game, spawnY);

      const funnelApproachH = 150;
      const rampH = 66;
      const crackH = 74;

      const rampW = 58;
      const rampY = spawnY - rampH * 0.5;
      const crackY = rampY - crackH - 4;

      const safeApproachBottom = spawnY + funnelApproachH + 165;
      for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const o = game.obstacles[i];
        if (o.y <= safeApproachBottom && o.y >= crackY - 95) {
          game.obstacles.splice(i, 1);
        }
      }

      game.funnels.push({
        centerX,
        yStart: spawnY + funnelApproachH,
        yEnd: crackY - 10,
        triggered: false
      });

      game.ramps.push({
        x: centerX - rampW * 0.5,
        y: rampY,
        w: rampW,
        h: rampH,
        jumpedFrom: false
      });

      // Gletscherspalte breit von links nach rechts über das Spielfeld
      game.cracks.push({
        x: 6,
        y: crackY,
        w: Math.max(80, w - 12),
        h: crackH
      });

      game.spawnTreasure(centerX, crackY - 24);
      game.addFloatingText(centerX, rampY + rampH + 14, "ENGPASS & SCHANZE!", "#facc15");
    },

    spawnObstacle(game) {
      const spawnY = -40;

      for (const f of game.funnels || []) {
        if (spawnY <= f.yStart + 155 && spawnY >= f.yEnd - 75) {
          return;
        }
      }
      for (const r of game.ramps || []) {
        if (spawnY <= r.y + r.h + 200 && spawnY >= r.y - 120) {
          return;
        }
      }

      const bounds = this.getTrackBounds(game, spawnY);
      const rockW = 34 + Math.random() * 10;
      const rockH = 26 + Math.random() * 8;
      const minX = bounds.left + 6;
      const maxX = Math.max(minX + 6, bounds.right - rockW - 6);
      const x = minX + Math.random() * (maxX - minX);

      game.obstacles.push({
        kind: "boulder",
        x,
        y: spawnY,
        baseY: spawnY,
        w: rockW,
        h: rockH,
        vx: 0,
        phase: Math.random() * Math.PI * 2,
        hit: false
      });
    },

    findNearbyRamp(game) {
      const y = game.yeti;
      const cx = y.x + y.w * 0.5;
      const cy = y.y + y.h * 0.5;

      for (const r of game.ramps || []) {
        if (
          cx >= r.x - 10 &&
          cx <= r.x + r.w + 10 &&
          cy >= r.y - 14 &&
          cy <= r.y + r.h + 22
        ) {
          return r;
        }
      }
      return null;
    },

    update(game, dt, worldDx) {
      const y = game.yeti;
      const h = game.field.h;

      const dyScroll = worldDx * 1.12;
      this.climbPx += dyScroll;

      const currentMeters = Math.floor(game.distance * METERS_PER_PX);
      if (currentMeters >= this.nextRampMeters) {
        this.spawnRampAndCrack(game);
        this.nextRampMeters += RAMP_INTERVAL_METERS;
      }

      this.boulderTimer -= dt;
      if (this.boulderTimer <= 0) {
        this.spawnObstacle(game);
        this.boulderTimer = 1.15 + Math.random() * 0.65;
      }

      this.treeTimer -= dt;
      if (this.treeTimer <= 0) {
        this.spawnTreeAt(game, -48);
        this.treeTimer = 0.42 + Math.random() * 0.35;
      }

      for (let i = this.trees.length - 1; i >= 0; i--) {
        this.trees[i].y += dyScroll;
        this.trees[i].swayPhase += dt * 2.4;
        if (this.trees[i].y > h + 90) {
          this.trees.splice(i, 1);
        }
      }

      for (let i = game.funnels.length - 1; i >= 0; i--) {
        game.funnels[i].yStart += dyScroll;
        game.funnels[i].yEnd += dyScroll;
        if (game.funnels[i].yStart > h + 120) {
          game.funnels.splice(i, 1);
        }
      }

      for (let i = game.ramps.length - 1; i >= 0; i--) {
        game.ramps[i].y += dyScroll;
        if (game.ramps[i].y > h + 110) {
          game.ramps.splice(i, 1);
        }
      }

      for (let i = game.cracks.length - 1; i >= 0; i--) {
        game.cracks[i].y += dyScroll;
        if (game.cracks[i].y > h + 110) {
          game.cracks.splice(i, 1);
        }
      }

      for (let i = game.treasuresList.length - 1; i >= 0; i--) {
        const t = game.treasuresList[i];
        t.baseY += dyScroll;
        t.y += dyScroll;
        if (t.y > h + 60) {
          game.treasuresList.splice(i, 1);
        }
      }

      for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const o = game.obstacles[i];
        o.baseY += dyScroll;
        o.y += dyScroll;
        if (o.y > h + 70) {
          game.obstacles.splice(i, 1);
        }
      }

      // Freie Steuerung links / rechts – KEIN automatisches Führen
      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;

      if (moveX !== 0) y.vx += moveX * 1150 * dt;
      else y.vx *= Math.pow(0.05, dt);
      y.vx = Math.max(-255, Math.min(255, y.vx));

      y.x += y.vx * dt;

      const yetiCenterY = y.y + y.h * 0.5;
      const yetiCenterX = y.x + y.w * 0.5;
      const activeFunnel = this.getActiveFunnelAt(game, yetiCenterY);

      if (activeFunnel && this.airTime <= 0) {
        // Wenn der Yeti am Engpass außerhalb des schmalen Durchlasses ist -> Absturz / Runterfallen!
        const outsideGap =
          y.x + y.w * 0.25 < activeFunnel.left ||
          y.x + y.w * 0.75 > activeFunnel.right;

        if (outsideGap && !activeFunnel.funnel.triggered) {
          activeFunnel.funnel.triggered = true;
          game.damagePanda(yetiCenterX, yetiCenterY, "ABGESTÜRZT AM ENGPASS!");
          if (game.phase !== "playing") return;
          y.x = Math.max(
            activeFunnel.left + 2,
            Math.min(activeFunnel.right - y.w - 2, activeFunnel.centerX - y.w * 0.5)
          );
          y.vx = 0;
        }
      } else {
        const track = this.getTrackBounds(game, yetiCenterY);
        const minTrackX = track.left + 2;
        const maxTrackX = Math.max(minTrackX + 2, track.right - y.w - 2);
        if (y.x < minTrackX) {
          y.x = minTrackX;
          y.vx = Math.max(0, y.vx);
        } else if (y.x > maxTrackX) {
          y.x = maxTrackX;
          y.vx = Math.min(0, y.vx);
        }
      }

      // Absprung über die Rampe
      const activeRamp = this.findNearbyRamp(game);
      if (activeRamp) {
        this.rampGraceTimer = 0.34;
        this.lastRampRef = activeRamp;
      } else if (this.rampGraceTimer > 0) {
        this.rampGraceTimer = Math.max(0, this.rampGraceTimer - dt);
      }

      if (y.jumpBufferTimer > 0) y.jumpBufferTimer = Math.max(0, y.jumpBufferTimer - dt);
      if (y.jumpBufferTimer > 0 && this.airTime <= 0) {
        const ramp = activeRamp || (this.rampGraceTimer > 0 ? this.lastRampRef : null);
        if (ramp && !ramp.jumpedFrom) {
          ramp.jumpedFrom = true;
          this.rampGraceTimer = 0;
          this.airTime = this.maxAirTime;
          y.jumpBufferTimer = 0;
          game.score += 120;
          game.playSfx("playHit");
          game.spawnParticles(ramp.x + ramp.w * 0.5, ramp.y + ramp.h * 0.5, "#e0f2fe", 16);
          game.addFloatingText(ramp.x + ramp.w * 0.5, ramp.y - 10, "+120 SCHANZENSPRUNG!", "#67e8f9");
          game.updateHud();
        } else {
          this.airTime = 0.16;
          y.jumpBufferTimer = 0;
          game.playSfx("playHit");
        }
      }

      if (this.airTime > 0) {
        this.airTime = Math.max(0, this.airTime - dt);
      }

      // Breite Gletscherspalte: Nur mit Rampensprung (airTime > 0.25) kommt man sicher drüber
      const clearsCrack = this.airTime > 0.25;
      if (!clearsCrack) {
        for (const c of game.cracks) {
          const overlapsX = y.x + y.w - 6 > c.x && y.x + 6 < c.x + c.w;
          const overlapsY = y.y + y.h > c.y + 6 && y.y < c.y + c.h - 6;
          if (overlapsX && overlapsY) {
            game.damagePanda(y.x + y.w * 0.5, c.y + c.h * 0.5, "IN GLETSCHERSPALTE GEFALLEN!");
            if (game.phase !== "playing") return;
            y.y = Math.min(h - y.h - 24, c.y + c.h + 26);
            break;
          }
        }
      }

      const targetY = h * 0.76 - y.h;
      y.y += (targetY - y.y) * Math.min(1, 3.5 * dt);
      y.runCycle += dt * 8;
    },

    drawSnowTree(ctx, t) {
      ctx.save();
      const s = t.scale;
      const sway = Math.sin(t.swayPhase) * 1.4;
      const cx = t.x + sway;
      const cy = t.y;

      ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
      ctx.beginPath();
      ctx.ellipse(cx + 3 * s, cy + 16 * s, 12 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#451a03";
      ctx.fillRect(cx - 3 * s, cy + 7 * s, 6 * s, 10 * s);

      const tiers = [
        { topY: -22 * s, botY: -5 * s, halfW: 11 * s },
        { topY: -13 * s, botY: 4 * s, halfW: 14.5 * s },
        { topY: -4 * s, botY: 13 * s, halfW: 17.5 * s }
      ];

      for (const tier of tiers) {
        const yTop = cy + tier.topY;
        const yBot = cy + tier.botY;

        const treeGrad = ctx.createLinearGradient(cx - tier.halfW, yTop, cx + tier.halfW, yBot);
        treeGrad.addColorStop(0, "#15803d");
        treeGrad.addColorStop(0.65, "#166534");
        treeGrad.addColorStop(1, "#14532d");

        ctx.fillStyle = treeGrad;
        ctx.strokeStyle = "#052e16";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, yTop);
        ctx.lineTo(cx - tier.halfW, yBot);
        ctx.lineTo(cx + tier.halfW, yBot);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(cx, yTop);
        ctx.lineTo(cx - tier.halfW * 0.72, yBot - 2.5 * s);
        ctx.lineTo(cx - tier.halfW * 0.25, yBot - 5.2 * s);
        ctx.lineTo(cx, yBot - 3.2 * s);
        ctx.lineTo(cx + tier.halfW * 0.25, yBot - 5.2 * s);
        ctx.lineTo(cx + tier.halfW * 0.72, yBot - 2.5 * s);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    },

    drawCrevasse(ctx, c) {
      ctx.save();
      const x0 = c.x;
      const y0 = c.y;
      const cw = c.w;
      const ch = c.h;

      const steps = 22;
      const topPts = [];
      const botPts = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x0 + t * cw;
        const jagTop = Math.sin(t * Math.PI * 9.0 + x0 * 0.05) * 4.5 + Math.cos(t * Math.PI * 15.0) * 2.0;
        const jagBot = Math.cos(t * Math.PI * 8.4 + y0 * 0.05) * 4.5 + Math.sin(t * Math.PI * 14.0) * 2.0;
        topPts.push({ x: px, y: y0 + Math.max(0, jagTop * 0.65) });
        botPts.push({ x: px, y: y0 + ch - Math.max(0, jagBot * 0.65) });
      }

      const depthGrad = ctx.createLinearGradient(x0, y0, x0, y0 + ch);
      depthGrad.addColorStop(0, "#0c4a6e");
      depthGrad.addColorStop(0.22, "#041627");
      depthGrad.addColorStop(0.55, "#020617");
      depthGrad.addColorStop(0.82, "#041627");
      depthGrad.addColorStop(1, "#082f49");

      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < topPts.length; i++) {
        ctx.lineTo(topPts[i].x, topPts[i].y);
      }
      for (let i = botPts.length - 1; i >= 0; i--) {
        ctx.lineTo(botPts[i].x, botPts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = depthGrad;
      ctx.fill();

      ctx.save();
      ctx.clip();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1.6;
      for (let sx = x0 - 20; sx < x0 + cw + 20; sx += 22) {
        ctx.beginPath();
        ctx.moveTo(sx, y0);
        ctx.lineTo(sx + 12, y0 + ch * 0.4);
        ctx.lineTo(sx + 5, y0 + ch);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
      ctx.beginPath();
      ctx.moveTo(x0 + cw * 0.04, y0 + ch * 0.2);
      ctx.lineTo(x0 + cw * 0.5, y0 + ch * 0.12);
      ctx.lineTo(x0 + cw * 0.96, y0 + ch * 0.24);
      ctx.lineTo(x0 + cw * 0.92, y0 + ch * 0.85);
      ctx.lineTo(x0 + cw * 0.48, y0 + ch * 0.9);
      ctx.lineTo(x0 + cw * 0.06, y0 + ch * 0.78);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(186, 230, 253, 0.34)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 1; i < 6; i++) {
        const fx = x0 + (cw * i) / 6;
        ctx.moveTo(fx, y0 + ch * 0.18);
        ctx.lineTo(fx - 8, y0 + ch * 0.55);
        ctx.lineTo(fx + 6, y0 + ch * 0.82);
      }
      ctx.stroke();

      ctx.restore();

      ctx.strokeStyle = "#0369a1";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < topPts.length; i++) {
        ctx.lineTo(topPts[i].x, topPts[i].y);
      }
      for (let i = botPts.length - 1; i >= 0; i--) {
        ctx.lineTo(botPts[i].x, botPts[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = "rgba(240, 249, 255, 0.88)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < topPts.length; i++) {
        const p = topPts[i];
        if (i === 0) ctx.moveTo(p.x, p.y + 1.5);
        else ctx.lineTo(p.x, p.y + 1.5);
      }
      ctx.stroke();

      ctx.restore();
    },

    drawBoulder(ctx, o) {
      ctx.save();
      const cx = o.x + o.w * 0.5;
      const cy = o.y + o.h * 0.5;
      const hw = o.w * 0.5;
      const hh = o.h * 0.5;

      ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
      ctx.beginPath();
      ctx.ellipse(cx + 2, cy + hh * 0.72, hw * 0.96, hh * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      const rockGrad = ctx.createLinearGradient(cx - hw, cy - hh, cx + hw, cy + hh);
      rockGrad.addColorStop(0, "#64748b");
      rockGrad.addColorStop(0.55, "#475569");
      rockGrad.addColorStop(1, "#1e293b");

      ctx.fillStyle = rockGrad;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.88, cy + hh * 0.42);
      ctx.lineTo(cx - hw * 0.95, cy - hh * 0.22);
      ctx.lineTo(cx - hw * 0.42, cy - hh * 0.88);
      ctx.lineTo(cx + hw * 0.18, cy - hh * 0.94);
      ctx.lineTo(cx + hw * 0.86, cy - hh * 0.45);
      ctx.lineTo(cx + hw * 0.94, cy + hh * 0.34);
      ctx.lineTo(cx + hw * 0.25, cy + hh * 0.82);
      ctx.lineTo(cx - hw * 0.48, cy + hh * 0.76);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(226, 232, 240, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.42, cy - hh * 0.88);
      ctx.lineTo(cx - hw * 0.08, cy + hh * 0.05);
      ctx.lineTo(cx - hw * 0.48, cy + hh * 0.76);
      ctx.stroke();

      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.56, cy - hh * 0.55);
      ctx.lineTo(cx - hw * 0.42, cy - hh * 0.88);
      ctx.lineTo(cx + hw * 0.18, cy - hh * 0.94);
      ctx.lineTo(cx + hw * 0.45, cy - hh * 0.65);
      ctx.lineTo(cx + hw * 0.05, cy - hh * 0.48);
      ctx.lineTo(cx - hw * 0.22, cy - hh * 0.62);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    },

    draw(game, ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0c4a6e");
      bg.addColorStop(0.35, "#bae6fd");
      bg.addColorStop(1, "#e0f2fe");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#93c5fd";
      ctx.fillRect(0, 0, w, h);

      const sampleStep = 10;
      ctx.fillStyle = "#f0f9ff";
      ctx.beginPath();
      for (let py = h + sampleStep; py >= -sampleStep; py -= sampleStep) {
        const b = this.getTrackBounds(game, py);
        if (py === h + sampleStep) ctx.moveTo(b.left, py);
        else ctx.lineTo(b.left, py);
      }
      for (let py = -sampleStep; py <= h + sampleStep; py += sampleStep) {
        const b = this.getTrackBounds(game, py);
        ctx.lineTo(b.right, py);
      }
      ctx.closePath();
      ctx.fill();

      const stepY = 56;
      const offsetY = this.climbPx % stepY;
      ctx.strokeStyle = "rgba(2, 132, 199, 0.25)";
      ctx.lineWidth = 1.6;
      for (let sy = -stepY + offsetY; sy < h + stepY; sy += stepY) {
        const b = this.getTrackBounds(game, sy);
        const lx = b.left + b.halfW * 0.55;
        const rx = b.right - b.halfW * 0.55;
        ctx.beginPath();
        ctx.moveTo(lx, sy);
        ctx.lineTo(lx, sy + 20);
        ctx.moveTo(rx, sy + 14);
        ctx.lineTo(rx, sy + 34);
        ctx.stroke();
      }

      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let py = h + sampleStep; py >= -sampleStep; py -= sampleStep) {
        const b = this.getTrackBounds(game, py);
        if (py === h + sampleStep) ctx.moveTo(b.left, py);
        else ctx.lineTo(b.left, py);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let py = h + sampleStep; py >= -sampleStep; py -= sampleStep) {
        const b = this.getTrackBounds(game, py);
        if (py === h + sampleStep) ctx.moveTo(b.right, py);
        else ctx.lineTo(b.right, py);
      }
      ctx.stroke();

      // Engpass-Markierung (kein Führen, nur sichtbare Kanten)
      const narrowHalfW = Math.max((game.yeti?.w || 36) * 0.5 + 10, 28);
      for (const f of game.funnels || []) {
        const topY = Math.max(-20, f.yEnd);
        const botY = Math.min(h + 20, f.yStart);
        if (botY <= topY) continue;
        ctx.save();
        ctx.fillStyle = "rgba(14, 116, 144, 0.14)";
        ctx.fillRect(f.centerX - narrowHalfW, topY, narrowHalfW * 2, botY - topY);
        ctx.strokeStyle = "rgba(3, 105, 161, 0.65)";
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.8;
        ctx.strokeRect(f.centerX - narrowHalfW, topY, narrowHalfW * 2, botY - topY);
        ctx.restore();
      }

      for (const t of this.trees) {
        this.drawSnowTree(ctx, t);
      }

      for (const c of game.cracks) {
        this.drawCrevasse(ctx, c);
      }

      for (const r of game.ramps) {
        ctx.save();
        const rampGrad = ctx.createLinearGradient(r.x, r.y + r.h, r.x, r.y);
        rampGrad.addColorStop(0, "#0284c7");
        rampGrad.addColorStop(0.55, "#38bdf8");
        rampGrad.addColorStop(1, "#ffffff");

        ctx.fillStyle = rampGrad;
        ctx.strokeStyle = "#0369a1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 6);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x + r.w * 0.28, r.y + r.h * 0.72);
        ctx.lineTo(r.x + r.w * 0.5, r.y + r.h * 0.5);
        ctx.lineTo(r.x + r.w * 0.72, r.y + r.h * 0.72);

        ctx.moveTo(r.x + r.w * 0.28, r.y + r.h * 0.42);
        ctx.lineTo(r.x + r.w * 0.5, r.y + r.h * 0.2);
        ctx.lineTo(r.x + r.w * 0.72, r.y + r.h * 0.42);
        ctx.stroke();
        ctx.restore();
      }

      for (const o of game.obstacles) {
        if (o.kind === "boulder") {
          this.drawBoulder(ctx, o);
        }
      }

      const y = game.yeti;
      const airProgress = this.airTime > 0 ? 1 - this.airTime / this.maxAirTime : 0;
      const airScale = this.airTime > 0 ? 1 + Math.sin(airProgress * Math.PI) * 0.26 : 1;
      const sledW = (y.w + 10) * airScale;
      const sledH = 8 * airScale;
      const sledX = y.x + y.w * 0.5 - sledW * 0.5;
      const sledY = y.y + y.h - 2;

      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sledX - 2, sledY);
      ctx.lineTo(sledX - 2, sledY + sledH);
      ctx.moveTo(sledX + sledW + 2, sledY);
      ctx.lineTo(sledX + sledW + 2, sledY + sledH);
      ctx.stroke();

      ctx.fillStyle = "#b45309";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(sledX, sledY, sledW, sledH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });
})();