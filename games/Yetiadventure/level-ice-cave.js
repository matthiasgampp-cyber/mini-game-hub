(() => {
  "use strict";

  window.YETI_ADVENTURE_LEVELS?.register({
    id: "ice_cave",
    name: "Eishöhle",
    aspect: 1.78,
    vertical: false,

    getCeilingY(game, screenX) {
      const h = game.field.h || 405;
      const baseCeil = h * 0.16;
      const worldCoord = (game.distance + screenX) * 0.0085;
      const wave =
        Math.sin(worldCoord) * 14 +
        Math.cos(worldCoord * 1.85 + 1.1) * 7;
      return Math.max(h * 0.07, Math.min(h * 0.25, baseCeil + wave));
    },

    getFloorY(game, screenX) {
      const h = game.field.h || 405;
      const baseFloor = game.field.riverY || h * 0.78;
      const worldCoord = (game.distance + screenX) * 0.0085;
      const wave =
        Math.cos(worldCoord * 0.92 + 0.4) * 15 -
        Math.sin(worldCoord * 1.7) * 6;
      return Math.max(h * 0.68, Math.min(h * 0.87, baseFloor + wave));
    },

    createIrregularSpikePoints(w, h, isCeiling, seed = 1) {
      const rnd = (n) => {
        const x = Math.sin(seed * 23.17 + n * 17.31) * 43758.5453;
        return x - Math.floor(x);
      };

      const tipX = w * (0.3 + rnd(1) * 0.4);
      const bL = w * (0.04 + rnd(2) * 0.14);
      const bR = w * (0.82 + rnd(3) * 0.14);
      const mL = Math.max(2, Math.min(tipX - 2, w * (0.14 + rnd(4) * 0.18)));
      const mR = Math.min(w - 2, Math.max(tipX + 2, w * (0.68 + rnd(5) * 0.18)));

      if (isCeiling) {
        const mY1 = h * (0.36 + rnd(6) * 0.26);
        const mY2 = h * (0.36 + rnd(7) * 0.26);
        return [
          { x: bL, y: 0 },
          { x: mL, y: mY1 },
          { x: tipX, y: h },
          { x: mR, y: mY2 },
          { x: bR, y: 0 }
        ];
      }

      const mY1 = h * (0.32 + rnd(8) * 0.24);
      const mY2 = h * (0.32 + rnd(9) * 0.24);
      return [
        { x: bL, y: h },
        { x: mL, y: mY1 },
        { x: tipX, y: 0 },
        { x: mR, y: mY2 },
        { x: bR, y: h }
      ];
    },

    enter(game) {
      const w = game.field.w || 720;

      game.floes = [];
      game.obstacles = [];
      game.treasuresList = [];
      game.ramps = [];
      game.cracks = [];
      game.funnels = [];

      this.stalagmites = [];
      this.stalactites = [];
      this.fallingStalactites = [];

      this.stalagmiteTimer = 0.42;
      this.stalactiteTimer = 0.9;
      this.dropCheckTimer = 1.45;
      this._spikeSeed = Math.floor(Math.random() * 1000) + 1;
      this.propellerPhase = 0;
      this.wingPhase = 0;

      // Unregelmäßige Eis-Stalagmiten in verschiedenen Größen am Höhlenboden
      for (let sx = 190; sx < w + 220; sx += 58) {
        const fy = this.getFloorY(game, sx);
        const sw = 15 + ((sx * 7) % 21);
        const sh = 17 + ((sx * 11) % 26);
        const sy = fy - sh;

        this.stalagmites.push({
          x: sx,
          y: sy,
          w: sw,
          h: sh,
          pts: this.createIrregularSpikePoints(sw, sh, false, this._spikeSeed++),
          hit: false
        });
      }

      // Unregelmäßige Eis-Stalaktiten oben an der geschwungenen Höhlendecke
      for (let cx = 75; cx < w + 180; cx += 92) {
        const cy = this.getCeilingY(game, cx);
        const sw = 15 + ((cx * 5) % 21);
        const sh = 18 + ((cx * 9) % 26);

        this.stalactites.push({
          x: cx,
          y: cy - 2,
          w: sw,
          h: sh,
          pts: this.createIrregularSpikePoints(sw, sh, true, this._spikeSeed++),
          dropping: false
        });
      }

      const startX = Math.round(Math.max(85, w * 0.22));
      const startCeil = this.getCeilingY(game, startX);
      const startFloor = this.getFloorY(game, startX);

      const y = game.yeti;
      y.onFloe = null;
      y.crouching = false;
      y.h = y.normalH;
      y.x = startX;
      y.y = Math.round((startCeil + startFloor) * 0.5 - y.h * 0.5);
      y.vx = 0;
      y.vy = -40;
      y.coyoteTimer = 0;
      y.jumpBufferTimer = 0;

      game.addFloatingText(w * 0.5, startCeil + 36, "EISHÖHLE • FLIEGER-YETI IM STURZ- & AUFWINDFLUG!", "#67e8f9");
    },

    spawnStalagmite(game) {
      const w = game.field.w;
      const sw = 15 + Math.random() * 21;
      const sh = 17 + Math.random() * 26;
      const x = w + 26 + Math.random() * 42;
      const fy = this.getFloorY(game, x + sw * 0.5);
      const yTop = fy - sh;

      this.stalagmites.push({
        x,
        y: yTop,
        w: sw,
        h: sh,
        pts: this.createIrregularSpikePoints(sw, sh, false, this._spikeSeed++),
        hit: false
      });
    },

    spawnCeilingStalactite(game) {
      const w = game.field.w;
      const sw = 15 + Math.random() * 22;
      const sh = 18 + Math.random() * 26;
      const x = w + 28 + Math.random() * 65;
      const cy = this.getCeilingY(game, x + sw * 0.5);

      this.stalactites.push({
        x,
        y: cy - 2,
        w: sw,
        h: sh,
        pts: this.createIrregularSpikePoints(sw, sh, true, this._spikeSeed++),
        dropping: false
      });
    },

    triggerStalactiteFall(game) {
      const w = game.field.w;
      const candidates = this.stalactites.filter(
        (s) => !s.dropping && s.x > w * 0.24 && s.x < w * 0.92
      );
      if (candidates.length === 0) return;

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      chosen.dropping = true;

      this.fallingStalactites.push({
        x: chosen.x,
        y: chosen.y,
        w: chosen.w,
        h: chosen.h,
        pts: chosen.pts,
        vy: 60,
        warnTimer: 0.34,
        hit: false
      });

      const idx = this.stalactites.indexOf(chosen);
      if (idx !== -1) this.stalactites.splice(idx, 1);
    },

    update(game, dt, worldDx) {
      const y = game.yeti;
      const w = game.field.w;
      const h = game.field.h;

      this.propellerPhase += dt * 44;
      this.wingPhase += dt * 15;

      // Boden-Stalagmiten nachladen
      this.stalagmiteTimer -= dt;
      if (this.stalagmiteTimer <= 0) {
        this.spawnStalagmite(game);
        this.stalagmiteTimer = 0.36 + Math.random() * 0.32;
      }

      // Decken-Stalaktiten nachladen
      this.stalactiteTimer -= dt;
      if (this.stalactiteTimer <= 0) {
        this.spawnCeilingStalactite(game);
        this.stalactiteTimer = 0.78 + Math.random() * 0.55;
      }

      // Ab und zu einen oberen Stalaktiten herunterfallen lassen
      this.dropCheckTimer -= dt;
      if (this.dropCheckTimer <= 0) {
        this.triggerStalactiteFall(game);
        this.dropCheckTimer = 1.4 + Math.random() * 1.05;
      }

      for (let i = this.stalagmites.length - 1; i >= 0; i--) {
        const sm = this.stalagmites[i];
        sm.x -= worldDx * 0.85;
        const fy = this.getFloorY(game, sm.x + sm.w * 0.5);
        sm.y = fy - sm.h;
        if (sm.x + sm.w < -70) {
          this.stalagmites.splice(i, 1);
        }
      }

      for (let i = this.stalactites.length - 1; i >= 0; i--) {
        const st = this.stalactites[i];
        st.x -= worldDx * 0.85;
        st.y = this.getCeilingY(game, st.x + st.w * 0.5) - 2;
        if (st.x + st.w < -70) {
          this.stalactites.splice(i, 1);
        }
      }

      for (let i = this.fallingStalactites.length - 1; i >= 0; i--) {
        const fs = this.fallingStalactites[i];
        fs.x -= worldDx * 0.35;
        const localFloor = this.getFloorY(game, fs.x + fs.w * 0.5);

        if (fs.warnTimer > 0) {
          fs.warnTimer = Math.max(0, fs.warnTimer - dt);
        } else {
          fs.vy += 700 * dt;
          fs.y += fs.vy * dt;
        }

        if (fs.y + fs.h >= localFloor) {
          game.spawnParticles(fs.x + fs.w * 0.5, localFloor - 2, "#7dd3fc", 10);
          this.fallingStalactites.splice(i, 1);
        }
      }

      // Horizontale Flugsteuerung links / rechts
      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;

      if (moveX !== 0) y.vx += moveX * 1100 * dt;
      else y.vx *= Math.pow(0.06, dt);
      y.vx = Math.max(-250, Math.min(250, y.vx));

      y.x += y.vx * dt;
      y.x = Math.max(22, Math.min(w - y.w - 22, y.x));

     // Vertikale Flugsteuerung: kontrolliertes Steigen & aktives Sinken über Hoch/Runter
      const wantsUp = Boolean(game.input.up);
      const wantsDown = Boolean(game.input.down);

      if (y.jumpBufferTimer > 0) {
        y.jumpBufferTimer = Math.max(0, y.jumpBufferTimer - dt);
        // Sanfter Auftriebsimpuls statt hartem Sprung an die Decke
        y.vy = Math.min(y.vy, -110);
        this.wingPhase += dt * 14;
      }

      if (wantsUp && !wantsDown) {
        // Gleichmäßiges Steigen mit begrenzter Steiggeschwindigkeit
        y.vy -= 520 * dt;
        y.vy = Math.max(-155, y.vy);
        this.wingPhase += dt * 12;
      } else if (wantsDown && !wantsUp) {
        // Aktives, klares Sinken nach unten
        y.vy += 580 * dt;
        y.vy = Math.min(185, y.vy);
      } else {
        // Kein Druck: sanft abbremsen und langsam sinken (kein Ducken)
        y.vy *= Math.pow(0.18, dt);
        y.vy += 85 * dt;
        y.vy = Math.max(-140, Math.min(75, y.vy));
      }

      y.y += y.vy * dt;

      const yetiFloor = this.getFloorY(game, y.x + y.w * 0.5);
      const yetiCeil = this.getCeilingY(game, y.x + y.w * 0.5);

      if (y.y < yetiCeil + 10) {
        y.y = yetiCeil + 10;
        if (y.vy < 0) y.vy = 20;
      }

      if (y.y + y.h > yetiFloor - 2) {
        y.y = yetiFloor - 2 - y.h;
        if (y.vy > 0) y.vy = -45;
      }

      // Kollision mit Eis-Stalagmiten unten
      const hitBox = { x: y.x + 6, y: y.y + 4, w: y.w - 12, h: y.h - 6 };
      for (const sm of this.stalagmites) {
        if (sm.hit) continue;
        const collides =
          hitBox.x < sm.x + sm.w - 4 &&
          hitBox.x + hitBox.w > sm.x + 4 &&
          hitBox.y + hitBox.h > sm.y + 4 &&
          hitBox.y < sm.y + sm.h;

        if (collides) {
          sm.hit = true;
          game.damagePanda(sm.x + sm.w * 0.5, sm.y + 4, "STALAGMITE AUS EIS!");
          if (game.phase !== "playing") return;
          y.vy = -190;
        }
      }

      // Kollision mit fallenden Eis-Stalaktiten
      for (let i = this.fallingStalactites.length - 1; i >= 0; i--) {
        const fs = this.fallingStalactites[i];
        if (fs.hit) continue;
        const collides =
          hitBox.x < fs.x + fs.w - 4 &&
          hitBox.x + hitBox.w > fs.x + 4 &&
          hitBox.y < fs.y + fs.h - 3 &&
          hitBox.y + hitBox.h > fs.y + 4;

        if (collides) {
          fs.hit = true;
          game.spawnParticles(fs.x + fs.w * 0.5, fs.y + fs.h * 0.5, "#bae6fd", 12);
          this.fallingStalactites.splice(i, 1);
          game.damagePanda(fs.x + fs.w * 0.5, fs.y + fs.h * 0.5, "FALLENDER STALAKTIT!");
          if (game.phase !== "playing") return;
        }
      }

      y.runCycle += dt * 11;
    },

    drawIrregularIceSpike(ctx, spike, isCeiling, isFalling = false) {
      ctx.save();
      const shakeX = isFalling && spike.warnTimer > 0 ? Math.sin(spike.warnTimer * 90) * 3 : 0;
      ctx.translate(spike.x + shakeX, spike.y);

      const grad = isCeiling
        ? ctx.createLinearGradient(0, 0, spike.w, spike.h)
        : ctx.createLinearGradient(0, spike.h, spike.w, 0);

      grad.addColorStop(0, "#0369a1");
      grad.addColorStop(0.5, "#38bdf8");
      grad.addColorStop(1, "#e0f2fe");

      ctx.fillStyle = grad;
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      spike.pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const tipPt = spike.pts[2] || { x: spike.w * 0.5, y: isCeiling ? spike.h : 0 };
      const midPt = spike.pts[1] || { x: spike.w * 0.3, y: spike.h * 0.5 };
      ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(midPt.x, midPt.y);
      ctx.lineTo(tipPt.x, tipPt.y);
      ctx.stroke();

      if (isFalling) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tipPt.x, tipPt.y + (isCeiling ? -5 : 5), 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    },

    drawPilotYeti(game, ctx) {
      const y = game.yeti;
      if (game.invulnTimer > 0 && Math.floor(game.animClock * 18) % 2 === 0) return;

      ctx.save();
      const cx = y.x + y.w * 0.5;
      const cy = y.y + y.h * 0.5;
      const pitch = Math.max(-0.26, Math.min(0.28, (y.vy || 0) * 0.0011));

      ctx.translate(cx, cy);
      ctx.rotate(pitch);

      const flap = Math.sin(this.wingPhase || game.animClock * 14);
      const propScaleY = Math.max(0.2, Math.abs(Math.cos(this.propellerPhase || game.animClock * 42)));

      // 1. Propeller hinten am Heck
      const tailX = -16;
      const tailY = 2;

      ctx.fillStyle = "#475569";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(tailX - 5, tailY - 4, 7, 8, 2);
      ctx.fill();
      ctx.stroke();

      // Propellerblätter (vertikal mit Rotations-Perspektive)
      const bladeHalf = 14 * propScaleY;
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(tailX - 6, tailY - bladeHalf * 0.55, 2.6, Math.max(2.5, bladeHalf * 0.55), 0, 0, Math.PI * 2);
      ctx.ellipse(tailX - 6, tailY + bladeHalf * 0.55, 2.6, Math.max(2.5, bladeHalf * 0.55), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Nabe
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(tailX - 6, tailY, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Beine im Flug nach hinten gestreckt
      const legKick = Math.sin(game.animClock * 12) * 2.5;
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-14, 7 + legKick * 0.4, 8, 5.5, 2.5);
      ctx.roundRect(-13, 12 - legKick * 0.4, 8, 5.5, 2.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#bae6fd";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(-16, 9.8 + legKick * 0.4, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(-15, 14.8 - legKick * 0.4, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3. Yeti-Körper
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 5, 13.5, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Arme zu schlagenden Flügeln geformt
      const wingAngle = flap * 0.68;
      ctx.save();
      ctx.translate(1, 1);
      ctx.rotate(wingAngle);

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.quadraticCurveTo(13, -15, 22, -6);
      ctx.quadraticCurveTo(14, 1, 2, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Flügelspitzen-Feder-/Eis-Akzent
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.ellipse(17, -6.5, 5.5, 2.8, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Kopf & Fliegerhaube
      const headX = 3;
      const headY = -9;

      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(headX, headY, 12.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Braune Fliegerhaube
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(headX, headY - 1, 12.8, Math.PI * 0.96, Math.PI * 2.04);
      ctx.lineTo(headX + 12.5, headY + 2);
      ctx.lineTo(headX + 7.5, headY + 3);
      ctx.lineTo(headX + 6.5, headY - 7);
      ctx.lineTo(headX - 8.5, headY - 7);
      ctx.lineTo(headX - 12.5, headY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ohrenklappe der Fliegerhaube
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.ellipse(headX - 2, headY + 3.5, 4.5, 5.5, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Kinnriemen
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(headX - 1, headY + 8.5);
      ctx.lineTo(headX + 6, headY + 10.5);
      ctx.stroke();

      // Gesicht & Fliegerbrille
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.ellipse(headX + 5.2, headY + 1.5, 6.2, 7.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nasen & Mund
      ctx.fillStyle = "#be185d";
      ctx.beginPath();
      ctx.ellipse(headX + 9.5, headY + 1.5, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(headX + 7.2, headY + 4.5, 3.8, 0.15 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();

      // Brillenband um die Fliegerhaube
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(headX - 11, headY - 3.5);
      ctx.lineTo(headX + 4, headY - 3.5);
      ctx.stroke();

      // Fliegerbrille (Gläser & Rahmen)
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(headX + 1.5, headY - 7.5, 9.5, 7.5, 3);
      ctx.fill();
      ctx.stroke();

      // Glanzreflex auf der Fliegerbrille
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(headX + 3.5, headY - 5.8);
      ctx.lineTo(headX + 6.5, headY - 2.2);
      ctx.stroke();

      ctx.restore();
    },

    draw(game, ctx, w, h) {
      const stepX = 12;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "#070d18");
      bgGrad.addColorStop(0.28, "#162436");
      bgGrad.addColorStop(0.62, "#19364a");
      bgGrad.addColorStop(1, "#09111e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const strataSpan = 190;
      const strataOffset = (game.distance * 0.24) % strataSpan;
      for (let x = -strataSpan - strataOffset; x < w + strataSpan; x += strataSpan) {
        const cTop = this.getCeilingY(game, x + strataSpan * 0.45);
        const fBot = this.getFloorY(game, x + strataSpan * 0.45);
        const caveH = Math.max(40, fBot - cTop);

        ctx.fillStyle = "rgba(15, 23, 42, 0.52)";
        ctx.beginPath();
        ctx.moveTo(x + 18, cTop);
        ctx.lineTo(x + 68, cTop + caveH * 0.24);
        ctx.lineTo(x + 96, fBot - caveH * 0.28);
        ctx.lineTo(x + 42, fBot);
        ctx.lineTo(x - 10, fBot - caveH * 0.35);
        ctx.closePath();
        ctx.fill();

        const icePatch = ctx.createLinearGradient(x + 35, cTop + 10, x + 130, fBot - 10);
        icePatch.addColorStop(0, "rgba(125, 211, 252, 0.16)");
        icePatch.addColorStop(0.55, "rgba(14, 165, 233, 0.08)");
        icePatch.addColorStop(1, "rgba(224, 242, 254, 0.15)");
        ctx.fillStyle = icePatch;
        ctx.beginPath();
        ctx.moveTo(x + 56, cTop + caveH * 0.08);
        ctx.lineTo(x + 126, cTop + caveH * 0.22);
        ctx.lineTo(x + 142, fBot - caveH * 0.18);
        ctx.lineTo(x + 76, fBot - caveH * 0.06);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x + 28, cTop + caveH * 0.18);
        ctx.lineTo(x + 58, cTop + caveH * 0.46);
        ctx.lineTo(x + 46, cTop + caveH * 0.72);
        ctx.stroke();
      }

      // Geschwungene Felsdecke mit Eis-Schicht
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let px = 0; px <= w + stepX; px += stepX) {
        ctx.lineTo(px, this.getCeilingY(game, px));
      }
      ctx.lineTo(w, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let px = 0; px <= w + stepX; px += stepX) {
        const cy = this.getCeilingY(game, px) - 1;
        if (px === 0) ctx.moveTo(px, cy);
        else ctx.lineTo(px, cy);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(240, 249, 255, 0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let px = 0; px <= w + stepX; px += stepX) {
        const cy = this.getCeilingY(game, px) + 1;
        if (px === 0) ctx.moveTo(px, cy);
        else ctx.lineTo(px, cy);
      }
      ctx.stroke();

      for (const st of this.stalactites) {
        this.drawIrregularIceSpike(ctx, st, true, false);
      }
      for (const fs of this.fallingStalactites) {
        this.drawIrregularIceSpike(ctx, fs, true, true);
      }

      // Geschwungener Felsboden mit Eisdecke
      const floorGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
      floorGrad.addColorStop(0, "#334155");
      floorGrad.addColorStop(0.45, "#1e293b");
      floorGrad.addColorStop(1, "#070d18");
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let px = 0; px <= w + stepX; px += stepX) {
        ctx.lineTo(px, this.getFloorY(game, px));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let px = 0; px <= w + stepX; px += stepX) {
        ctx.lineTo(px, this.getFloorY(game, px));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.clip();

      ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
      ctx.lineWidth = 1.6;
      const rockStep = 46;
      const rockShift = (game.distance * 0.85) % rockStep;
      for (let rx = -rockShift; rx < w + rockStep; rx += rockStep) {
        const fy = this.getFloorY(game, rx);
        ctx.beginPath();
        ctx.moveTo(rx, fy + 6);
        ctx.lineTo(rx - 22, h);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      for (let px = 0; px <= w + stepX; px += stepX) {
        const fy = this.getFloorY(game, px) + 1;
        if (px === 0) ctx.moveTo(px, fy);
        else ctx.lineTo(px, fy);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(240, 249, 255, 0.9)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let px = 0; px <= w + stepX; px += stepX) {
        const fy = this.getFloorY(game, px) - 1;
        if (px === 0) ctx.moveTo(px, fy);
        else ctx.lineTo(px, fy);
      }
      ctx.stroke();

      for (const sm of this.stalagmites) {
        this.drawIrregularIceSpike(ctx, sm, false, false);
      }

      // Flieger-Yeti anstelle des Standard-Yetis zeichnen
      this.drawPilotYeti(game, ctx);
    }
  });
})();