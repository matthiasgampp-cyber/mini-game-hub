(() => {
  "use strict";

  window.YETI_ADVENTURE_LEVELS?.register({
    id: "ice_boss",
    name: "Eismonster-Boss",
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

      this.snowballsThrown = [];
      this.throwCooldown = 0;
      this.hitFlashTimer = 0;
      this.bossRespawnTimer = 0;

      this.boss = {
        x: Math.round(w * 0.76),
        baseX: Math.round(w * 0.76),
        y: groundY - 6,
        w: 84,
        h: 112,
        maxHp: 20,
        hp: 20,
        state: "idle", // "idle" | "windup" | "strike" | "recover" | "defeated"
        stateTimer: 0,
        attackTimer: 3.2 + Math.random() * 2.0,
        strikeType: "low", // "low" (springen) | "high" (ducken)
        icicleLen: 96,
        hurtTimer: 0,
        breathPhase: 0
      };

      const y = game.yeti;
      y.onFloe = null;
      y.crouching = false;
      y.h = y.normalH;
      y.x = Math.round(Math.max(70, w * 0.18));
      y.y = groundY - 6 - y.h;
      y.vx = 0;
      y.vy = 0;
      y.coyoteTimer = 0.16;
      y.jumpBufferTimer = 0;

      this._onKeyDown = (e) => {
        if (game.phase !== "playing" || game.paused || game.mode !== "ice_boss") return;
        const k = e.key.toLowerCase();
        if (k === "f" || k === "enter" || k === "e" || k === "x" || e.code === "Space") {
          e.preventDefault();
          this.throwSnowball(game);
        }
      };
      window.addEventListener("keydown", this._onKeyDown);

      this._onHubSnowball = () => {
        if (game.phase !== "playing" || game.paused || game.mode !== "ice_boss") return;
        this.throwSnowball(game);
      };
      window.addEventListener("hub:snowball", this._onHubSnowball);

      this._onCanvasPointerDown = (e) => {
        if (game.phase !== "playing" || game.paused || game.mode !== "ice_boss") return;
        if (e.button === 2) {
          e.preventDefault();
          this.throwSnowball(game);
        }
      };
      game.canvas?.addEventListener("pointerdown", this._onCanvasPointerDown);

      game.addFloatingText(
        w * 0.5,
        groundY - 160,
        "SCHNEEBÄLLE: LEERTASTE / F / ❄ BALL • SPRINGEN (▲/W) & DUCKEN (▼/S)!",
        "#f472b6"
      );
    },

    exit(game) {
      if (this._onKeyDown) {
        window.removeEventListener("keydown", this._onKeyDown);
        this._onKeyDown = null;
      }
      if (this._onHubSnowball) {
        window.removeEventListener("hub:snowball", this._onHubSnowball);
        this._onHubSnowball = null;
      }
      if (this._onCanvasPointerDown) {
        game.canvas?.removeEventListener("pointerdown", this._onCanvasPointerDown);
        this._onCanvasPointerDown = null;
      }
    },

    throwSnowball(game) {
      if (this.throwCooldown > 0 || !this.boss || this.boss.state === "defeated") return;
      const y = game.yeti;
      this.throwCooldown = 0.28;
      this.snowballsThrown.push({
        x: y.x + y.w + 8,
        y: y.y + y.h * 0.42,
        r: 8,
        vx: 410,
        vy: -28,
        rot: 0
      });
      game.playSfx("playHit");
    },

    startBossAttack(game) {
      const b = this.boss;
      if (!b || b.state === "defeated") return;
      b.state = "windup";
      b.stateTimer = 0.78;
      b.strikeType = Math.random() < 0.5 ? "low" : "high";
      const hint = b.strikeType === "low" ? "BODEN-HIEB -> SPRINGEN!" : "KOPF-HIEB -> DUCKEN!";
      game.addFloatingText(b.x - 24, b.y - b.h - 32, hint, "#facc15");
    },

    getIcicleHitSegment(game) {
      const b = this.boss;
      if (!b || b.state !== "strike") return null;

      const groundY = game.field.riverY;
      const pivotX = b.x - 14;
      const pivotY = b.strikeType === "low" ? groundY - 20 : groundY - 56;
      const reach = Math.min(b.icicleLen + 46, b.x - game.yeti.x + 28);

      return {
        x1: pivotX,
        y1: pivotY,
        x2: pivotX - reach,
        y2: pivotY + (b.strikeType === "low" ? 5 : 2)
      };
    },

    segmentHitsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
          return true;
        }
      }
      return false;
    },

    update(game, dt) {
      const y = game.yeti;
      const w = game.field.w;
      const h = game.field.h;
      const groundY = game.field.riverY;
      const floorY = groundY - 6;
      const b = this.boss;

      if (this.throwCooldown > 0) {
        this.throwCooldown = Math.max(0, this.throwCooldown - dt);
      }
      if (this.hitFlashTimer > 0) {
        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
      }

      // Geworfene Schneebälle bewegen & Treffer prüfen
      for (let i = this.snowballsThrown.length - 1; i >= 0; i--) {
        const sb = this.snowballsThrown[i];
        sb.x += sb.vx * dt;
        sb.vy += 110 * dt;
        sb.y += sb.vy * dt;
        sb.rot += dt * 15;

        if (b && b.state !== "defeated") {
          const hitBoss =
            sb.x + sb.r > b.x - b.w * 0.48 &&
            sb.x - sb.r < b.x + b.w * 0.52 &&
            sb.y + sb.r > b.y - b.h - 14 &&
            sb.y - sb.r < b.y;

          if (hitBoss) {
            b.hp = Math.max(0, b.hp - 1);
            b.hurtTimer = 0.2;
            this.hitFlashTimer = 0.12;
            game.score += 75;
            game.playSfx("playScore");
            game.spawnParticles(sb.x, sb.y, "#7dd3fc", 12);
            game.addFloatingText(b.x - 8, b.y - b.h - 16, "-1 HP", "#67e8f9");
            game.updateHud();
            this.snowballsThrown.splice(i, 1);

            if (b.hp <= 0) {
              b.state = "defeated";
              b.stateTimer = 0;
              this.bossRespawnTimer = 2.6;
              game.score += 600;
              game.treasures += 3;
              game.spawnParticles(b.x, b.y - b.h * 0.5, "#38bdf8", 30);
              game.addFloatingText(w * 0.5, floorY - 125, "EISMONSTER BESIEGT! +600 PUNKTE!", "#4ade80");
              game.updateHud();
            }
            continue;
          }
        }

        if (sb.x > w + 40 || sb.y > floorY + 10) {
          this.snowballsThrown.splice(i, 1);
        }
      }

      // Boss-Angriffszyklus alle 3–6 Sekunden
      if (b) {
        b.breathPhase += dt * 4.5;
        if (b.hurtTimer > 0) b.hurtTimer = Math.max(0, b.hurtTimer - dt);

        if (b.state === "defeated") {
          this.bossRespawnTimer -= dt;
          if (this.bossRespawnTimer <= 0) {
            b.maxHp += 6;
            b.hp = b.maxHp;
            b.state = "idle";
            b.attackTimer = 3.2 + Math.random() * 2.0;
            game.addFloatingText(b.x, b.y - b.h - 24, "NEUES EISMONSTER ERSCHEINT!", "#f472b6");
          }
        } else if (b.state === "idle") {
          b.x = b.baseX + Math.sin(game.animClock * 2.1) * 12;
          b.attackTimer -= dt;
          if (b.attackTimer <= 0) {
            this.startBossAttack(game);
          }
        } else if (b.state === "windup") {
          b.x = b.baseX + Math.sin(game.animClock * 52) * 3.5;
          b.stateTimer -= dt;
          if (b.stateTimer <= 0) {
            b.state = "strike";
            b.stateTimer = 0.42;
            game.playSfx("playWall");
            game.spawnParticles(b.x - 52, floorY - 10, "#bae6fd", 14);
          }
        } else if (b.state === "strike") {
          b.x = b.baseX - 12;
          b.stateTimer -= dt;
          if (b.stateTimer <= 0) {
            b.state = "recover";
            b.stateTimer = 0.45;
          }
        } else if (b.state === "recover") {
          b.x += (b.baseX - b.x) * Math.min(1, 10 * dt);
          b.stateTimer -= dt;
          if (b.stateTimer <= 0) {
            b.state = "idle";
            b.attackTimer = 3.0 + Math.random() * 3.0;
          }
        }
      }

      // Ducken
      const onGround = y.y + y.h >= floorY - 2 && y.vy >= 0;
      const wantsCrouch = Boolean(game.input.crouch) || Boolean(game.input.down);
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

      // Links / Rechts
      let moveX = 0;
      if (game.input.left) moveX -= 1;
      if (game.input.right) moveX += 1;

      if (moveX !== 0) y.vx += moveX * 1150 * dt;
      else y.vx *= Math.pow(0.05, dt);
      y.vx = Math.max(-260, Math.min(260, y.vx));

      y.x += y.vx * dt;
      const maxYetiX = b && b.state !== "defeated" ? b.x - b.w * 0.55 - y.w : w - y.w - 20;
      y.x = Math.max(24, Math.min(Math.max(80, maxYetiX), y.x));

      // Springen
      if (onGround) y.coyoteTimer = 0.16;
      else y.coyoteTimer = Math.max(0, y.coyoteTimer - dt);

      if (y.jumpBufferTimer > 0) y.jumpBufferTimer = Math.max(0, y.jumpBufferTimer - dt);
      if (y.jumpBufferTimer > 0 && y.coyoteTimer > 0) {
        if (y.crouching) {
          y.crouching = false;
          y.y -= y.normalH - y.crouchH;
          y.h = y.normalH;
        }
        y.vy = -495;
        y.y -= 4;
        y.coyoteTimer = 0;
        y.jumpBufferTimer = 0;
        game.playSfx("playHit");
      }

      if (!onGround || y.vy < 0) {
        y.vy += 880 * dt;
        y.y += y.vy * dt;
      }

      if (y.y + y.h >= floorY && y.vy >= 0) {
        y.y = floorY - y.h;
        y.vy = 0;
      }
      if (y.y > h + 30) {
        y.y = floorY - y.h;
        y.vy = 0;
      }

      // Eiszapfen-Trefferprüfung
      const seg = this.getIcicleHitSegment(game);
      if (seg) {
        const yetiBox = {
          x: y.x + 5,
          y: y.y + 4,
          w: y.w - 10,
          h: y.h - 4
        };
        if (
          this.segmentHitsRect(
            seg.x1,
            seg.y1,
            seg.x2,
            seg.y2,
            yetiBox.x,
            yetiBox.y,
            yetiBox.w,
            yetiBox.h
          )
        ) {
          const msg = b.strikeType === "low" ? "BODEN-HIEB! SPRINGEN!" : "KOPF-HIEB! DUCKEN!";
          game.damagePanda(y.x + y.w * 0.5, y.y + y.h * 0.5, msg);
          if (game.phase !== "playing") return;
          b.state = "recover";
          b.stateTimer = 0.45;
        }
      }

      y.runCycle += dt * (onGround ? 9 : 4.5);
    },

    drawBoss(game, ctx) {
      const b = this.boss;
      if (!b || b.state === "defeated") return;

      const groundY = game.field.riverY;
      const floorY = groundY - 6;
      const topY = floorY - b.h;
      const pulse = Math.sin(b.breathPhase) * 2.5;
      const flash = b.hurtTimer > 0;

      ctx.save();

      // Frost-Aura & Bodenschatten
      const aura = ctx.createRadialGradient(b.x, topY + b.h * 0.5, 10, b.x, topY + b.h * 0.5, 76);
      aura.addColorStop(0, "rgba(56, 189, 248, 0.24)");
      aura.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(b.x, topY + b.h * 0.5, 76, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(2, 6, 23, 0.48)";
      ctx.beginPath();
      ctx.ellipse(b.x, floorY + 2, 52, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Massige Eis-Beine mit Krallen
      ctx.fillStyle = flash ? "#ffffff" : "#0c4a6e";
      ctx.strokeStyle = "#020617";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(b.x - 34, floorY - 26, 22, 26, 5);
      ctx.roundRect(b.x + 10, floorY - 26, 22, 26, 5);
      ctx.fill();
      ctx.stroke();

      // Breiter Monster-Rumpf & Schultern
      const torsoGrad = ctx.createLinearGradient(b.x - 46, topY, b.x + 46, floorY - 20);
      torsoGrad.addColorStop(0, flash ? "#ffffff" : "#7dd3fc");
      torsoGrad.addColorStop(0.45, flash ? "#e0f2fe" : "#0284c7");
      torsoGrad.addColorStop(1, "#082f49");

      ctx.fillStyle = torsoGrad;
      ctx.strokeStyle = "#020617";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(b.x - 36, floorY - 22);
      ctx.lineTo(b.x - 50, topY + 34 + pulse); // breite linke Monstroschulter
      ctx.lineTo(b.x - 34, topY + 8);
      ctx.lineTo(b.x - 22, topY - 18); // linkes Eishorn
      ctx.lineTo(b.x - 8, topY - 2);
      ctx.lineTo(b.x + 4, topY - 24); // mittleres Eishorn
      ctx.lineTo(b.x + 16, topY - 3);
      ctx.lineTo(b.x + 28, topY - 16); // rechtes Eishorn
      ctx.lineTo(b.x + 42, topY + 12);
      ctx.lineTo(b.x + 48, topY + 38 + pulse);
      ctx.lineTo(b.x + 32, floorY - 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Leuchtende Eis-Risse im Brustpanzer
      ctx.strokeStyle = flash ? "#f472b6" : "#bae6fd";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x - 8, topY + 52);
      ctx.lineTo(b.x - 18, topY + 64);
      ctx.lineTo(b.x - 6, topY + 74);
      ctx.moveTo(b.x + 14, topY + 54);
      ctx.lineTo(b.x + 24, topY + 66);
      ctx.stroke();

      // Fiese dunkle Augenhöhlen & zornige Brauen
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.moveTo(b.x - 32, topY + 24);
      ctx.lineTo(b.x - 8, topY + 34);
      ctx.lineTo(b.x - 10, topY + 46);
      ctx.lineTo(b.x - 30, topY + 42);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(b.x + 16, topY + 24);
      ctx.lineTo(b.x - 4, topY + 34);
      ctx.lineTo(b.x - 2, topY + 46);
      ctx.lineTo(b.x + 16, topY + 42);
      ctx.closePath();
      ctx.fill();

      // Glühende rote/pinke Monster-Pupillen
      ctx.fillStyle = "rgba(255, 42, 133, 0.28)";
      ctx.beginPath();
      ctx.arc(b.x - 19, topY + 36, 7.5, 0, Math.PI * 2);
      ctx.arc(b.x + 5, topY + 36, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff2a85";
      ctx.beginPath();
      ctx.arc(b.x - 19, topY + 36, 4.4, 0, Math.PI * 2);
      ctx.arc(b.x + 5, topY + 36, 4.4, 0, Math.PI * 2);
      ctx.fill();

      // Aufgerissener Monster-Rachen mit spitzen Eis-Reißzähnen
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.roundRect(b.x - 25, topY + 50, 38, 18, 6);
      ctx.fill();

      ctx.fillStyle = "#f0f9ff";
      // Obere Zähne
      for (let tx = b.x - 21; tx <= b.x + 7; tx += 7) {
        ctx.beginPath();
        ctx.moveTo(tx, topY + 50);
        ctx.lineTo(tx + 3.5, topY + 58);
        ctx.lineTo(tx + 7, topY + 50);
        ctx.closePath();
        ctx.fill();
      }
      // Untere Zähne
      for (let tx = b.x - 18; tx <= b.x + 4; tx += 7.5) {
        ctx.beginPath();
        ctx.moveTo(tx, topY + 68);
        ctx.lineTo(tx + 3.5, topY + 60);
        ctx.lineTo(tx + 7, topY + 68);
        ctx.closePath();
        ctx.fill();
      }

      // Monster-Arm + Riesen-Eiszapfen-Waffe
      const pivotX = b.x - 26;
      const pivotY =
        b.state === "strike"
          ? b.strikeType === "low"
            ? floorY - 20
            : floorY - 56
          : topY + 48;

      ctx.save();
      ctx.translate(pivotX, pivotY);

      if (b.state === "windup") {
        const targetY = b.strikeType === "low" ? floorY - 20 - pivotY : floorY - 56 - pivotY;
        ctx.strokeStyle = "#facc15";
        ctx.setLineDash([7, 4]);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(-Math.min(200, b.x - game.yeti.x), targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.rotate(-0.72);
      } else if (b.state === "strike") {
        ctx.rotate(b.strikeType === "low" ? 0.14 : -0.04);
      } else {
        ctx.rotate(-0.38);
      }

      // Muskulöser Eis-Arm
      ctx.fillStyle = "#0369a1";
      ctx.strokeStyle = "#020617";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8, -10, 24, 20, 7);
      ctx.fill();
      ctx.stroke();

      // Riesen-Eiszapfen mit Zacken & Glanz
      const iceGrad = ctx.createLinearGradient(0, -18, -b.icicleLen, 18);
      iceGrad.addColorStop(0, "#0284c7");
      iceGrad.addColorStop(0.5, "#38bdf8");
      iceGrad.addColorStop(1, "#ffffff");

      ctx.fillStyle = iceGrad;
      ctx.strokeStyle = "#082f49";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-4, -15);
      ctx.lineTo(-b.icicleLen * 0.35, -22);
      ctx.lineTo(-b.icicleLen * 0.45, -13);
      ctx.lineTo(-b.icicleLen * 0.72, -16);
      ctx.lineTo(-b.icicleLen, 0);
      ctx.lineTo(-b.icicleLen * 0.72, 16);
      ctx.lineTo(-b.icicleLen * 0.45, 13);
      ctx.lineTo(-b.icicleLen * 0.35, 22);
      ctx.lineTo(-4, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -5);
      ctx.lineTo(-b.icicleLen * 0.85, -1);
      ctx.stroke();

      ctx.restore();

      // Boss-HP-Balken oben rechts
      const barW = 148;
      const barH = 10;
      const barX = game.field.w - barW - 18;
      const barY = 16;
      const hpRatio = Math.max(0, b.hp / b.maxHp);

      ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = hpRatio > 0.35 ? "#38bdf8" : "#fb7185";
      ctx.beginPath();
      ctx.roundRect(barX + 1.5, barY + 1.5, Math.max(0, (barW - 3) * hpRatio), barH - 3, 4);
      ctx.fill();

      ctx.font = "700 9px Orbitron, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "#e0f2fe";
      ctx.fillText(`EISMONSTER ${b.hp}/${b.maxHp}`, barX + barW, barY + barH + 12);

      ctx.restore();
    },

    draw(game, ctx, w, h) {
      const groundY = game.field.riverY;

      const bg = ctx.createLinearGradient(0, 0, 0, groundY);
      bg.addColorStop(0, "#04101f");
      bg.addColorStop(0.45, "#0c4a6e");
      bg.addColorStop(0.85, "#38bdf8");
      bg.addColorStop(1, "#bae6fd");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, groundY);

      ctx.fillStyle = "rgba(8, 47, 73, 0.45)";
      const peakSpan = 160;
      for (let x = -40; x < w + peakSpan; x += peakSpan) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + peakSpan * 0.5, groundY - 125);
        ctx.lineTo(x + peakSpan, groundY);
        ctx.closePath();
        ctx.fill();
      }

      const floorGrad = ctx.createLinearGradient(0, groundY - 6, 0, h);
      floorGrad.addColorStop(0, "#ffffff");
      floorGrad.addColorStop(0.2, "#7dd3fc");
      floorGrad.addColorStop(0.7, "#0284c7");
      floorGrad.addColorStop(1, "#041627");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, groundY - 6, w, h - (groundY - 6));

      for (const sb of this.snowballsThrown) {
        ctx.save();
        ctx.translate(sb.x, sb.y);
        ctx.rotate(sb.rot);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, sb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      this.drawBoss(game, ctx);
    }
  });
})();