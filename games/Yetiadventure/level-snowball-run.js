(() => {
  "use strict";

  window.YETI_ADVENTURE_LEVELS?.register({
    id: "snowball_run",
    name: "Schneeball-Flucht",
    aspect: 1.78,
    vertical: false,

    enter(game) {
      const w = game.field.w || 720;
      const groundY = game.field.riverY || Math.round(game.field.h * 0.78);

      game.floes = [];
      game.obstacles = [];
      game.treasuresList = [];
      game.ramps = [];
      game.cracks = [];
      game.funnels = [];

      this.snowballs = [];
      this.snowballTimer = 1.15;
      this.hutDistance = 0;

      // Schneefall-Partikel initialisieren
      this.snowflakes = [];
      for (let i = 0; i < 65; i++) {
        this.snowflakes.push({
          x: Math.random() * w,
          y: Math.random() * groundY,
          r: 1.4 + Math.random() * 2.4,
          vy: 28 + Math.random() * 38,
          vx: -18 - Math.random() * 22,
          phase: Math.random() * Math.PI * 2
        });
      }

      const y = game.yeti;
      y.onFloe = null;
      y.crouching = false;
      y.h = y.normalH;
      y.x = Math.round(Math.max(85, w * 0.22));
      y.y = groundY - y.h - 6;
      y.vx = 0;
      y.vy = 0;
      y.coyoteTimer = 0.16;
      y.jumpBufferTimer = 0;

      game.addFloatingText(w * 0.5, groundY - 140, "SCHNEEBALL-FLUCHT • ÜBER ROLLENDE BÄLLE SPRINGEN!", "#67e8f9");
    },

    spawnSnowball(game) {
      const w = game.field.w;
      const groundY = game.field.riverY;
      const startRadius = 11 + Math.random() * 4;
      const maxRadius = 31 + Math.random() * 8;
      const rollSpeed = 125 + Math.random() * 55;

      this.snowballs.push({
        x: w + startRadius + 24,
        y: groundY - 6 - startRadius,
        radius: startRadius,
        startRadius,
        maxRadius,
        growthRate: 11.5 + Math.random() * 4.5,
        rollSpeed,
        angle: 0,
        hit: false
      });
    },

    update(game, dt, worldDx) {
      const y = game.yeti;
      const w = game.field.w;
      const h = game.field.h;
      const groundY = game.field.riverY;

      this.hutDistance += worldDx * 0.25;

      // Schneefall aktualisieren
      for (const sf of this.snowflakes) {
        sf.phase += dt * 2.5;
        sf.x += (sf.vx - worldDx * 0.25 + Math.sin(sf.phase) * 14) * dt;
        sf.y += sf.vy * dt;
        if (sf.y > groundY) {
          sf.y = -6;
          sf.x = Math.random() * (w + 60);
        }
        if (sf.x < -10) {
          sf.x = w + 10;
        }
      }

      // Neue Schneebälle von rechts spawnen
      this.snowballTimer -= dt;
      if (this.snowballTimer <= 0) {
        this.spawnSnowball(game);
        this.snowballTimer = 1.25 + Math.random() * 0.85;
      }

      // Wachsende Schneebälle bewegen & vergrößern
      const yetiHitBox = {
        x: y.x + 7,
        y: y.y + 5,
        w: y.w - 14,
        h: y.h - 6
      };

      for (let i = this.snowballs.length - 1; i >= 0; i--) {
        const sb = this.snowballs[i];
        sb.radius = Math.min(sb.maxRadius, sb.radius + sb.growthRate * dt);
        sb.x -= (sb.rollSpeed + worldDx * 0.55) * dt;
        sb.y = groundY - 6 - sb.radius;
        sb.angle -= ((sb.rollSpeed + worldDx * 0.55) * dt) / Math.max(8, sb.radius);

        if (!sb.hit) {
          const hitR = sb.radius * 0.78;
          const closestX = Math.max(yetiHitBox.x, Math.min(sb.x, yetiHitBox.x + yetiHitBox.w));
          const closestY = Math.max(yetiHitBox.y, Math.min(sb.y, yetiHitBox.y + yetiHitBox.h));
          const dx = sb.x - closestX;
          const dy = sb.y - closestY;

          if (dx * dx + dy * dy < hitR * hitR) {
            sb.hit = true;
            game.damagePanda(sb.x, sb.y, "SCHNEEBALL!");
            if (game.phase !== "playing") return;
          }
        }

        if (sb.x + sb.radius < -70) {
          this.snowballs.splice(i, 1);
        }
      }

      // Ducken
      const onGround = y.y + y.h >= groundY - 7 && y.vy >= 0;
      const wantsCrouch = Boolean(game.input.crouch);
      if (wantsCrouch && onGround) {
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

      // Links / Rechts bewegen
      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;

      if (moveX !== 0) y.vx += moveX * 1150 * dt;
      else y.vx *= Math.pow(0.05, dt);
      y.vx = Math.max(-270, Math.min(270, y.vx));

      y.x += y.vx * dt;
      y.x = Math.max(20, Math.min(w - y.w - 20, y.x));

      // Coyote-Time & Sprungpuffer
      if (onGround) y.coyoteTimer = 0.16;
      else y.coyoteTimer = Math.max(0, y.coyoteTimer - dt);

      if (y.jumpBufferTimer > 0) y.jumpBufferTimer = Math.max(0, y.jumpBufferTimer - dt);
      if (y.jumpBufferTimer > 0 && y.coyoteTimer > 0) {
        y.vy = -495;
        y.y -= 4;
        y.coyoteTimer = 0;
        y.jumpBufferTimer = 0;
        game.playSfx("playHit");
      }

      // Schwerkraft & Boden
      if (!onGround || y.vy < 0) {
        y.vy += 880 * dt;
        y.y += y.vy * dt;
      }

      const floorY = groundY - 6;
      if (y.y + y.h >= floorY && y.vy >= 0) {
        y.y = floorY - y.h;
        y.vy = 0;
      }

      if (y.y > h + 30) {
        y.y = floorY - y.h;
        y.vy = 0;
      }

      y.runCycle += dt * (onGround ? 10 : 4.5);
    },

    drawSnowCabin(ctx, x, baseY) {
      ctx.save();

      // Schatten im Schnee
      ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
      ctx.beginPath();
      ctx.ellipse(x + 28, baseY + 3, 34, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Holzwände
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(x + 4, baseY - 26, 48, 26, 2);
      ctx.fill();
      ctx.stroke();

      // Holzbretter-Linien
      ctx.strokeStyle = "rgba(69, 26, 3, 0.45)";
      ctx.lineWidth = 1.1;
      for (let ly = baseY - 20; ly < baseY; ly += 6) {
        ctx.beginPath();
        ctx.moveTo(x + 5, ly);
        ctx.lineTo(x + 51, ly);
        ctx.stroke();
      }

      // Schornstein mit Schnee
      ctx.fillStyle = "#475569";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.4;
      ctx.fillRect(x + 38, baseY - 44, 8, 16);
      ctx.strokeRect(x + 38, baseY - 44, 8, 16);

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(x + 36, baseY - 46, 12, 5, 2.5);
      ctx.fill();

      // Warm leuchtendes Fenster
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 1.4;
      ctx.fillRect(x + 12, baseY - 18, 12, 11);
      ctx.strokeRect(x + 12, baseY - 18, 12, 11);

      // Tür
      ctx.fillStyle = "#5c260a";
      ctx.fillRect(x + 32, baseY - 17, 11, 17);
      ctx.strokeRect(x + 32, baseY - 17, 11, 17);

      // Dach
      ctx.fillStyle = "#991b1b";
      ctx.strokeStyle = "#450a0a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 2, baseY - 25);
      ctx.lineTo(x + 28, baseY - 47);
      ctx.lineTo(x + 58, baseY - 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dicke Schneedecke auf dem Dach
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 3, baseY - 24);
      ctx.lineTo(x + 28, baseY - 48);
      ctx.lineTo(x + 59, baseY - 24);
      ctx.lineTo(x + 52, baseY - 23);
      ctx.lineTo(x + 28, baseY - 40);
      ctx.lineTo(x + 4, baseY - 23);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    },

    drawSnowball(ctx, sb) {
      ctx.save();
      ctx.translate(sb.x, sb.y);

      // Bodenschatten
      ctx.fillStyle = "rgba(15, 23, 42, 0.24)";
      ctx.beginPath();
      ctx.ellipse(0, sb.radius + 4, sb.radius * 0.92, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(sb.angle);

      const grad = ctx.createRadialGradient(
        -sb.radius * 0.32,
        -sb.radius * 0.32,
        sb.radius * 0.12,
        0,
        0,
        sb.radius
      );
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.68, "#e0f2fe");
      grad.addColorStop(1, "#7dd3fc");

      ctx.fillStyle = grad;
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, sb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Roll-Struktur & kleine Schneeklumpen
      ctx.strokeStyle = "rgba(2, 132, 199, 0.42)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, sb.radius * 0.62, 0.2, 1.5);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-sb.radius * 0.28, -sb.radius * 0.24, sb.radius * 0.16, 0, Math.PI * 2);
      ctx.arc(sb.radius * 0.3, sb.radius * 0.18, sb.radius * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    draw(game, ctx, w, h) {
      const groundY = game.field.riverY;

      // Winterlicher Gebirgshimmel
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, "#0f172a");
      sky.addColorStop(0.45, "#1e3a8a");
      sky.addColorStop(0.82, "#7dd3fc");
      sky.addColorStop(1, "#e0f2fe");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      // Gebirgslandschaft im Hintergrund (dynamisch mitlaufend)
      const span = 210;
      const offset = game.distance * 0.18;
      const startIdx = Math.floor(offset / span) - 1;
      const endIdx = startIdx + Math.ceil(w / span) + 3;

      for (let idx = startIdx; idx <= endIdx; idx++) {
        const baseX = idx * span - offset;
        const hScale = 0.8 + 0.35 * Math.sin(idx * 1.3 + game.animClock * 0.35);
        const wScale = 0.88 + 0.24 * Math.cos(idx * 0.95);
        const halfW = (span * 0.62) * wScale;
        const peakH = 140 * hScale;
        const cx = baseX + span * 0.5;

        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.moveTo(cx - halfW, groundY);
        ctx.lineTo(cx, groundY - peakH);
        ctx.lineTo(cx + halfW, groundY);
        ctx.closePath();
        ctx.fill();

        // Schneegipfel
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(cx, groundY - peakH);
        ctx.lineTo(cx - halfW * 0.36, groundY - peakH * 0.56);
        ctx.lineTo(cx - halfW * 0.12, groundY - peakH * 0.48);
        ctx.lineTo(cx, groundY - peakH * 0.64);
        ctx.lineTo(cx + halfW * 0.14, groundY - peakH * 0.48);
        ctx.lineTo(cx + halfW * 0.36, groundY - peakH * 0.56);
        ctx.closePath();
        ctx.fill();
      }

      // Verschneite Gebirgshütte mitlaufend im Hintergrund
      const cabinSpan = 620;
      const cabinOffset = (game.distance * 0.26) % cabinSpan;
      for (let cx = w - cabinOffset; cx > -160; cx -= cabinSpan) {
        this.drawSnowCabin(ctx, cx, groundY - 2);
      }

      // Verschneite Bodenbahn von links nach rechts
      const snowGround = ctx.createLinearGradient(0, groundY - 6, 0, h);
      snowGround.addColorStop(0, "#ffffff");
      snowGround.addColorStop(0.22, "#e0f2fe");
      snowGround.addColorStop(0.7, "#38bdf8");
      snowGround.addColorStop(1, "#0c4a6e");
      ctx.fillStyle = snowGround;
      ctx.fillRect(0, groundY - 6, w, h - (groundY - 6));

      // Laufspuren im Schnee (wandern nach links)
      const trackStep = 44;
      const trackShift = (game.distance * 0.9) % trackStep;
      ctx.strokeStyle = "rgba(2, 132, 199, 0.28)";
      ctx.lineWidth = 1.6;
      for (let tx = -trackShift; tx < w + trackStep; tx += trackStep) {
        ctx.beginPath();
        ctx.moveTo(tx, groundY + 6);
        ctx.lineTo(tx + 18, groundY + 6);
        ctx.stroke();
      }

      // Rollende, größer werdende Schneebälle zeichnen
      for (const sb of this.snowballs) {
        this.drawSnowball(ctx, sb);
      }

      // Schneefall zeichnen
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      for (const sf of this.snowflakes) {
        ctx.beginPath();
        ctx.arc(sf.x, sf.y, sf.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  });
})();