// Level 5 – "Steintreppe & rollende Felsen"
// ------------------------------------------------
// Sidescroller: Chinesische Steintreppe im Hochgebirge.
// Die Treppe läuft endlos weiter, bis man alle 20 Hindernisse gemeistert hat!
// Jeder 5. Felsbrocken ist ein hoch hüpfender Gummiball, unter dem man sich ducken kann.
// Unter der Treppe erstreckt sich eine malerische Klippenlandschaft mit Wasserfall & Laternen.
// Erst nach 20 Hindernissen erscheint der Gipfel mit Tor und Fahndungsplakat ("WANTED")!

(() => {
  "use strict";

  const START_WORLD_W = 4200;
  const BASE_WORLD_H = 2200;
  const STEP_W = 48;
  const STEP_RISE = 10;
  const STEP_H = 34;

  // -----------------------------------------------------------------------
  // 1. Hintergrund: Chinesisches Gebirge im Nebel (Huangshan-Stil)
  // -----------------------------------------------------------------------
  function drawLevel5Background(ctx, { viewW = 720, viewH = 405, camera, time = 0 }) {
    const camX = camera?.x || 0;

    // Himmel-Farbverlauf
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, "#070d18");
    sky.addColorStop(0.35, "#112238");
    sky.addColorStop(0.65, "#1f3b58");
    sky.addColorStop(0.85, "#426079");
    sky.addColorStop(1, "#8195a8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    // Funkelnde Sterne
    ctx.save();
    for (let i = 0; i < 42; i++) {
      const sx = ((i * 79 + 17) % Math.max(120, viewW - 20)) + 10;
      const sy = ((i * 31 + 11) % Math.max(40, Math.round(viewH * 0.35))) + 6;
      const alpha = 0.2 + 0.65 * Math.abs(Math.sin(time * 1.6 + i * 0.8));
      ctx.fillStyle = `rgba(254, 249, 195, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 5 === 0 ? 1.6 : 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Ferne Bergspitzen (Ebene 1 – Parallax langsam: 0.08)
    const px1 = (camX * 0.08) % (viewW * 2);
    ctx.save();
    ctx.fillStyle = "#0a1522";
    ctx.beginPath();
    ctx.moveTo(-60, viewH);
    ctx.lineTo(-px1, viewH * 0.58);
    ctx.lineTo(-px1 + viewW * 0.18, viewH * 0.38);
    ctx.lineTo(-px1 + viewW * 0.36, viewH * 0.54);
    ctx.lineTo(-px1 + viewW * 0.58, viewH * 0.34);
    ctx.lineTo(-px1 + viewW * 0.78, viewH * 0.52);
    ctx.lineTo(-px1 + viewW * 0.96, viewH * 0.36);
    ctx.lineTo(-px1 + viewW * 1.25, viewH * 0.55);
    ctx.lineTo(-px1 + viewW * 1.55, viewH * 0.37);
    ctx.lineTo(-px1 + viewW * 1.85, viewH * 0.56);
    ctx.lineTo(viewW + 60, viewH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Nebelschleier zwischen den fernen Bergen
    const mist1 = ctx.createLinearGradient(0, viewH * 0.42, 0, viewH * 0.65);
    mist1.addColorStop(0, "rgba(226, 232, 240, 0)");
    mist1.addColorStop(0.5, "rgba(203, 213, 225, 0.16)");
    mist1.addColorStop(1, "rgba(226, 232, 240, 0)");
    ctx.fillStyle = mist1;
    ctx.fillRect(0, viewH * 0.42, viewW, viewH * 0.23);

    // Mittlere Bergketten & Karstfelsen (Ebene 2 – Parallax: 0.2)
    const px2 = (camX * 0.2) % (viewW * 2);
    ctx.save();
    ctx.fillStyle = "#122536";
    ctx.beginPath();
    ctx.moveTo(-60, viewH);
    ctx.lineTo(-px2, viewH * 0.68);
    ctx.lineTo(-px2 + viewW * 0.15, viewH * 0.48);
    ctx.lineTo(-px2 + viewW * 0.32, viewH * 0.62);
    ctx.lineTo(-px2 + viewW * 0.48, viewH * 0.44);
    ctx.lineTo(-px2 + viewW * 0.68, viewH * 0.58);
    ctx.lineTo(-px2 + viewW * 0.88, viewH * 0.46);
    ctx.lineTo(-px2 + viewW * 1.15, viewH * 0.64);
    ctx.lineTo(-px2 + viewW * 1.42, viewH * 0.48);
    ctx.lineTo(-px2 + viewW * 1.75, viewH * 0.66);
    ctx.lineTo(viewW + 60, viewH);
    ctx.closePath();
    ctx.fill();

    // Chinesische Kiefern auf den Kämmen
    ctx.fillStyle = "#08121c";
    for (let t = 0; t < 10; t++) {
      const tx = -px2 + viewW * (0.08 + t * 0.2);
      const ty = viewH * (0.47 + (t % 3) * 0.05);
      if (tx > -20 && tx < viewW + 20) {
        ctx.beginPath();
        ctx.arc(tx, ty - 6, 6, 0, Math.PI * 2);
        ctx.arc(tx + 5, ty - 4, 5, 0, Math.PI * 2);
        ctx.arc(tx - 5, ty - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(tx - 1, ty - 4, 2, 7);
      }
    }
    ctx.restore();

    // Talnebel
    const mist2 = ctx.createLinearGradient(0, viewH * 0.72, 0, viewH);
    mist2.addColorStop(0, "rgba(226, 232, 240, 0)");
    mist2.addColorStop(0.5, "rgba(203, 213, 225, 0.18)");
    mist2.addColorStop(1, "rgba(148, 163, 184, 0.32)");
    ctx.fillStyle = mist2;
    ctx.fillRect(0, viewH * 0.72, viewW, viewH * 0.28);
  }

  // -----------------------------------------------------------------------
  // 2. Malerische Landschaft direkt unter der Steintreppe
  // -----------------------------------------------------------------------
  function drawUnderStairLandscape(ctx, steps, camX, camY, viewW, viewH, time) {
    ctx.save();

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.x + s.w < camX - 60 || s.x > camX + viewW + 60) continue;

      const topY = s.y + s.h - 4;
      const cliffH = Math.min(600, BASE_WORLD_H - topY);

      // Felsfundament unter den Stufen
      const rockGrad = ctx.createLinearGradient(s.x, topY, s.x, topY + cliffH);
      rockGrad.addColorStop(0, "#2c3e50");
      rockGrad.addColorStop(0.2, "#1e293b");
      rockGrad.addColorStop(0.65, "#0f172a");
      rockGrad.addColorStop(1, "#020617");

      ctx.fillStyle = rockGrad;
      ctx.fillRect(s.x, topY, s.w + 2, cliffH);

      // Holzbalken & Stützpfeiler (traditionelle Bergweg-Konstruktion)
      if (i % 3 === 0) {
        ctx.fillStyle = "#5c2a13";
        ctx.strokeStyle = "#38180a";
        ctx.lineWidth = 1.2;
        ctx.fillRect(s.x + 8, topY, 7, 48);
        ctx.strokeRect(s.x + 8, topY, 7, 48);

        ctx.beginPath();
        ctx.moveTo(s.x + 8, topY + 14);
        ctx.lineTo(s.x + 36, topY + 44);
        ctx.stroke();
      }

      // Hängende Efeuranken und Moos an den Kanten
      if (s.hasMoss) {
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.ellipse(s.x + s.w * 0.4, topY + 6, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#22c55e";
        const vineLen = 14 + ((i * 17) % 18);
        for (let v = 0; v < 3; v++) {
          const vx = s.x + 12 + v * 10;
          ctx.beginPath();
          ctx.moveTo(vx, topY);
          ctx.quadraticCurveTo(vx + 3, topY + vineLen * 0.5, vx, topY + vineLen);
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = "#16a34a";
          ctx.stroke();

          ctx.fillStyle = "#4ade80";
          ctx.beginPath();
          ctx.arc(vx + 2, topY + vineLen * 0.7, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rote Gebirgslaternen an Aussichtspunkten der Treppe
      if (i % 16 === 10) {
        const lx = s.x + 6;
        const ly = s.y - 18;

        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, s.y);
        ctx.lineTo(lx, ly - 8);
        ctx.lineTo(lx + 8, ly - 8);
        ctx.stroke();

        const lanGlow = 0.75 + Math.sin(time * 4 + i) * 0.25;
        const gGrad = ctx.createRadialGradient(lx + 8, ly, 1, lx + 8, ly, 14);
        gGrad.addColorStop(0, `rgba(251, 146, 60, ${lanGlow * 0.5})`);
        gGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(lx + 8, ly, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#dc2626";
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(lx + 8, ly, 4.5, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Malerischer Wasserfall unterhalb einer der Treppenpassagen im Blickfeld
    for (let wfi = 16; wfi < steps.length; wfi += 35) {
      const wfStep = steps[wfi];
      if (wfStep && wfStep.x > camX - 100 && wfStep.x < camX + viewW + 100) {
        const wfx = wfStep.x + 10;
        const wfy = wfStep.y + wfStep.h;

        const wfGrad = ctx.createLinearGradient(wfx, wfy, wfx + 24, wfy + 140);
        wfGrad.addColorStop(0, "rgba(186, 230, 253, 0.75)");
        wfGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.65)");
        wfGrad.addColorStop(1, "rgba(14, 165, 233, 0.4)");

        ctx.fillStyle = wfGrad;
        ctx.beginPath();
        ctx.moveTo(wfx, wfy);
        ctx.lineTo(wfx + 22, wfy);
        ctx.lineTo(wfx + 30, wfy + 130);
        ctx.lineTo(wfx - 8, wfy + 130);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(240, 249, 255, 0.85)";
        for (let f = 0; f < 5; f++) {
          const fx = wfx + 4 + Math.sin(time * 8 + f * 1.5) * 8;
          const fy = wfy + 125 + Math.cos(time * 6 + f) * 4;
          ctx.beginPath();
          ctx.arc(fx, fy, 4 + (f % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 3. Fahndungsplakat ("WANTED") mit Pandis Bild unter dem Gipfeltor
  // -----------------------------------------------------------------------
  function drawWantedPoster(ctx, x, y, time) {
    ctx.save();
    ctx.translate(x, y);

    const w = 46;
    const h = 56;
    const halfW = w * 0.5;

    const swing = Math.sin(time * 2.2) * 0.04;
    ctx.rotate(swing);

    // Kordeln
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-halfW + 6, -10);
    ctx.lineTo(-halfW + 6, 0);
    ctx.moveTo(halfW - 6, -10);
    ctx.lineTo(halfW - 6, 0);
    ctx.stroke();

    // Schatten
    ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
    ctx.beginPath();
    ctx.roundRect(-halfW + 2, 3, w, h, 3);
    ctx.fill();

    // Pergament
    const paperGrad = ctx.createLinearGradient(-halfW, 0, halfW, h);
    paperGrad.addColorStop(0, "#fef3c7");
    paperGrad.addColorStop(0.5, "#fde68a");
    paperGrad.addColorStop(1, "#fcd34d");

    ctx.fillStyle = paperGrad;
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-halfW, 0, w, h, 2.5);
    ctx.fill();
    ctx.stroke();

    // Nägel
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(-halfW + 5, 5, 1.8, 0, Math.PI * 2);
    ctx.arc(halfW - 5, 5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Banner "GESUCHT"
    ctx.fillStyle = "#7f1d1d";
    ctx.font = "900 7.5px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GESUCHT", 0, 9);

    // Bildrahmen
    const frameW = 34;
    const frameH = 26;
    const frameX = -frameW * 0.5;
    const frameY = 12;

    ctx.fillStyle = "#fffbeb";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1;
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    // PANDIS GESICHT IM PLAKAT
    const pcx = 0;
    const pcy = frameY + frameH * 0.55;

    // Ohren
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(pcx - 8, pcy - 8, 3.8, 0, Math.PI * 2);
    ctx.arc(pcx + 8, pcy - 8, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Kopf
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pcx, pcy, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Augenringe
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(pcx - 3.8, pcy - 1.5, 3.2, 2.4, -0.25, 0, Math.PI * 2);
    ctx.ellipse(pcx + 3.8, pcy - 1.5, 3.2, 2.4, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Pupillen
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pcx - 3.4, pcy - 1.8, 1.0, 0, Math.PI * 2);
    ctx.arc(pcx + 3.4, pcy - 1.8, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // Schnauze
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(pcx, pcy + 2.5, 2.2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bambusstab im Mund
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pcx + 1, pcy + 4);
    ctx.lineTo(pcx + 9, pcy + 6.5);
    ctx.stroke();

    // Text
    ctx.fillStyle = "#451a03";
    ctx.font = "800 5.5px Rajdhani, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PANDI DER AUSBRECHER", 0, 44);

    ctx.fillStyle = "#b91c1c";
    ctx.font = "900 6px Orbitron, sans-serif";
    ctx.fillText("10.000 🎋 BELOHNUNG", 0, 51);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 4. Level-Bau & Dynamischer Treppenverlauf
  // -----------------------------------------------------------------------
  function buildLevel5(viewW, viewH, game) {
    if (game) {
      game.rocksJumped = 0;
      game.rocksTarget = 20;
    }
    const worldW = START_WORLD_W;
    const worldH = BASE_WORLD_H;

    // Start-Plateau im Tal
    const startY = 1950;
    const valleyPlatform = {
      x: 20,
      y: startY,
      w: 160,
      h: STEP_H,
      isStone: true,
      hasMoss: false
    };

    const steps = [valleyPlatform];

    // Erste 40 Stufen initial anlegen
    const startX = 180;
    for (let i = 0; i < 40; i++) {
      const x = startX + i * STEP_W;
      const y = startY - (i + 1) * STEP_RISE;
      const hasMoss = i % 3 === 1 || i % 7 === 0;
      steps.push({
        x,
        y,
        w: STEP_W + 2,
        h: STEP_H,
        isStone: true,
        hasMoss,
        stepIndex: i
      });
    }

    const spawn = { x: valleyPlatform.x + 60, y: valleyPlatform.y };

    const state = {
      rocks: [],
      rockSpawnTimer: 1.2,
      spawnIndex: 0,
      rocksJumped: 0,
      rocksTarget: 20,
      steps,
      valleyPlatform,
      summitPlatform: null, // Wird erst nach Erreichen von 20 Hindernissen generiert!
      gateSparkles: []
    };

    // Hilfsfunktion: Stufen dynamisch endlos weiterbauen solange das Ziel noch nicht erreicht ist
    function extendStairsAhead(pandiX) {
      if (state.summitPlatform) return; // Gipfel bereits gebaut

      const lastStep = steps[steps.length - 1];
      // Wenn Panda sich dem Ende der bisherigen Stufen nähert, 20 weitere anfügen
      if (pandiX + 1100 > lastStep.x) {
        const batchSize = 20;
        const baseIdx = lastStep.stepIndex !== undefined ? lastStep.stepIndex + 1 : 1;
        for (let j = 0; j < batchSize; j++) {
          const idx = baseIdx + j;
          const x = lastStep.x + (j + 1) * STEP_W;
          const y = lastStep.y - (j + 1) * STEP_RISE;
          const hasMoss = idx % 3 === 1 || idx % 7 === 0;
          steps.push({
            x,
            y,
            w: STEP_W + 2,
            h: STEP_H,
            isStone: true,
            hasMoss,
            stepIndex: idx
          });
        }
      }
    }

    // ---------------------------------------------------------------------
    // Logik-Update
    // ---------------------------------------------------------------------
    function update(game, dt) {
      if ((game.rocksJumped || 0) > state.rocksJumped) {
        state.rocksJumped = game.rocksJumped;
      }
      game.rocksJumped = state.rocksJumped;
      game.rocksTarget = state.rocksTarget;

      const p = game.pandi;
      const pCx = p.x + p.w * 0.5;
      const pFootY = p.y + p.h;

      // 1. ENDLOS-TREPPE WEITERFÜHREN SOLANGE NOCH NICHT ALLE 20 HINDERNISSE GEMEISTERT SIND
      if (state.rocksJumped < state.rocksTarget) {
        extendStairsAhead(p.x);
        // Spielfeld-Breite dynamisch anpassen damit Panda immer weiterlaufen kann
        const highestStep = steps[steps.length - 1];
        game.world.w = Math.max(game.world.w, highestStep.x + 1200);
      }

      // 2. ERST NACH 20 GEMEISTERTEN HINDERNISSEN: GIPFEL-TERRASSE & AUSGANGS-TOR GENERIEREN!
      if (state.rocksJumped >= state.rocksTarget && !state.summitPlatform) {
        // Finde Stufe ca. 5 Schritte vor Panda
        let targetIdx = steps.findIndex((s) => s.x >= p.x + 240);
        if (targetIdx === -1) targetIdx = steps.length - 1;
        const lastStairStep = steps[targetIdx];

        // Überflüssige Stufen hinter dem Gipfel kappen
        steps.splice(targetIdx + 1);

        // Gipfel-Terrasse anbauen
        const summitPlatform = {
          x: lastStairStep.x + STEP_W,
          y: lastStairStep.y,
          w: 280,
          h: STEP_H,
          isStone: true,
          hasMoss: true,
          isSummit: true
        };
        steps.push(summitPlatform);
        state.summitPlatform = summitPlatform;

        // Welt-Grenze an Gipfel anpassen
        game.world.w = summitPlatform.x + summitPlatform.w + 60;

        // Ausgangs-Tor genau auf der Gipfel-Terrasse platzieren
        game.exit = {
          x: summitPlatform.x + summitPlatform.w * 0.5,
          y: summitPlatform.y - 32,
          w: 52,
          h: 64,
          isOpen: true
        };
        game.currentLevelBuilt.exit = game.exit;

        game.ctx?.sound?.playScore?.();
        game.spawnParticles(game.exit.x, game.exit.y, "#4ade80", 48);
        game.spawnParticles(game.exit.x, game.exit.y, "#facc15", 42);
        game.addFloatingText(
          pCx - game.camera.x,
          p.y - game.camera.y - 24,
          "🏁 20 HINDERNISSE GESCHAFFT! ➔ DER GIPFEL LIEGT DIREKT VOR DIR!",
          "#4ade80"
        );
        game._updateHud();
      }

      // 3. HINDERNISSE SPAWNEN (Felsen & hüpfende Gummibälle vor Panda auf der Treppe)
      if (state.rocksJumped < state.rocksTarget) {
        state.rockSpawnTimer -= dt;

        // Angenehmes Zeitintervall für klare Lücken, skaliert mit Runden-Schwierigkeit
        if (state.rockSpawnTimer <= 0) {
          const diff = game.getDifficultyMultiplier ? game.getDifficultyMultiplier() : 1;
          state.rockSpawnTimer = (2.5 + Math.random() * 0.35) / Math.sqrt(diff);
          state.spawnIndex += 1;

          // JEDER 5. IST EIN HÜPFENDER GUMMIBALL!
          const isRubberBall = state.spawnIndex % 5 === 0;

          // Fels spawnt ca. 750px vor Panda oben auf der Treppe (knapp außerhalb des Bildschirms)
          const targetSpawnX = Math.max(p.x + 720, (game.camera?.x || p.x) + (game.view?.w || 720) + 90);
          let spawnStep = steps.find((s) => s.x >= targetSpawnX);
          if (!spawnStep) spawnStep = steps[steps.length - 1];

          state.rocks.push({
            id: state.spawnIndex,
            isRubberBall,
            x: spawnStep.x + 10,
            y: spawnStep.y - 24,
            radius: isRubberBall ? 13 : 11,
            vx: -135 * diff,
            vy: isRubberBall ? -220 * Math.sqrt(diff) : 0,
            rot: 0,
            bounceTimer: 0,
            squash: 1,
            jumped: false
          });
        }
      }

      // 4. HINDERNISSE BEWEGEN & PRÜFEN
      for (let i = state.rocks.length - 1; i >= 0; i--) {
        const r = state.rocks[i];

        r.x += r.vx * dt;
        r.rot -= (r.vx / r.radius) * dt;

        // Finde aktuelle Stufe unter dem Hindernis
        let currentStep = null;
        for (const s of steps) {
          if (r.x + r.radius >= s.x && r.x + r.radius <= s.x + s.w) {
            currentStep = s;
            break;
          }
        }

        const groundY = currentStep ? currentStep.y - r.radius * 2 : BASE_WORLD_H;

        if (r.isRubberBall) {
          // --- GUMMIBALL-PHYSIK: HÜPFT HOCH (~60px) ---
          r.bounceTimer += dt;
          r.vy += 620 * dt;
          r.y += r.vy * dt;

          if (r.y >= groundY) {
            r.y = groundY;
            r.vy = -290; // Hoher Abprall
            r.squash = 0.65;
            game.spawnParticles(r.x + r.radius, groundY + r.radius * 2, "#f43f5e", 3);
          }

          r.squash += (1 - r.squash) * Math.min(1, 14 * dt);
        } else {
          // --- ROLLENDER FELS ---
          if (currentStep) {
            r.y += (groundY - r.y) * Math.min(1, 20 * dt);
          } else {
            r.y += 260 * dt;
          }

          if (Math.random() < 0.22) {
            game.spawnParticles(r.x + r.radius, r.y + r.radius * 2, "#94a3b8", 1);
          }
        }

        const distCenter = Math.abs(pCx - (r.x + r.radius));
        const obstacleTop = r.y;
        const obstacleBottom = r.y + r.radius * 2;

        // 1. DUCKEN UNTER DEM HÜPFENDEN GUMMIBALL
        if (r.isRubberBall && p.isDucking && distCenter < 28 && obstacleBottom < pFootY - 6) {
          if (!r.jumped) {
            r.jumped = true;
            state.rocksJumped += 1;
            game.rocksJumped = state.rocksJumped;
            game.score += 150;
            game.ctx?.sound?.playScore?.();

            game.spawnParticles(pCx, p.y + p.h * 0.5, "#38bdf8", 14);
            game.spawnParticles(r.x + r.radius, r.y + r.radius, "#f43f5e", 10);
            game.addFloatingText(pCx - game.camera.x, p.y - game.camera.y - 14, "UNTER DEM BALL GEDUCKT! 🎾 (+1)", "#38bdf8");
            game._updateHud();
          }
        }

        // 2. ERFOLGREICHES ÜBERSPRINGEN
        const inAir = !p.onGround;
        const aboveObstacle = pFootY <= obstacleTop + 6;

        if (inAir && aboveObstacle && distCenter < 26 && !r.jumped) {
          r.jumped = true;
          state.rocksJumped += 1;
          game.rocksJumped = state.rocksJumped;
          game.score += 100;
          game.ctx?.sound?.playScore?.();

          const sparkleColor = r.isRubberBall ? "#f43f5e" : "#facc15";
          game.spawnParticles(pCx, pFootY - 4, sparkleColor, 14);
          game.spawnParticles(r.x + r.radius, r.y + 4, "#38bdf8", 8);

          const label = r.isRubberBall ? "BALL ÜBERSPRUNGEN! 🎾" : "+1! 🪨";
          game.addFloatingText(pCx - game.camera.x, p.y - game.camera.y - 14, `${label} (${state.rocksJumped}/${state.rocksTarget})`, "#fef08a");
          game._updateHud();
        }

        // 3. KOLLISION & SCHADEN
        const overlaps = game._rectsOverlap(
          p.x + 3,
          p.y + 3,
          p.w - 6,
          p.h - 4,
          r.x + 2,
          r.y + 2,
          r.radius * 2 - 4,
          r.radius * 2 - 4
        );

        if (overlaps && !r.jumped) {
          const safelyUnder = r.isRubberBall && p.isDucking && obstacleBottom < pFootY - 4;
          if (!safelyUnder) {
            game.damagePandi(r.isRubberBall ? "GUMMIBALL!" : "ROLLENDER FELS!");
            game.spawnParticles(r.x + r.radius, r.y + r.radius, r.isRubberBall ? "#f43f5e" : "#64748b", 16);
            state.rocks.splice(i, 1);
            continue;
          }
        }

        // 4. Weit hinter Panda aus dem Spiel entfernen
        if (r.x < p.x - 700 || r.x < -60) {
          state.rocks.splice(i, 1);
        }
      }

      // Glitzer-Effekt am Gipfeltor wenn offen
      if (game.exit && Math.random() < 0.35) {
        state.gateSparkles.push({
          x: game.exit.x + (Math.random() - 0.5) * 40,
          y: game.exit.y + (Math.random() - 0.5) * 44,
          vy: -20 - Math.random() * 25,
          life: 0.6,
          maxLife: 0.6,
          color: Math.random() < 0.5 ? "#facc15" : "#4ade80"
        });
      }

      for (let g = state.gateSparkles.length - 1; g >= 0; g--) {
        const sp = state.gateSparkles[g];
        sp.life -= dt;
        sp.y += sp.vy * dt;
        if (sp.life <= 0) state.gateSparkles.splice(g, 1);
      }
    }

    // ---------------------------------------------------------------------
    // Grafisches Zeichnen der Entities
    // ---------------------------------------------------------------------
    function drawEntities(game, ctx) {
      const camX = game.camera.x;
      const camY = game.camera.y;
      const viewW = game.view.w;
      const viewH = game.view.h;

      // 1. Schöne Landschaft unter der Steintreppe
      drawUnderStairLandscape(ctx, steps, camX, camY, viewW, viewH, game.animClock);

      // 2. Felsen & Gummibälle
      for (const r of state.rocks) {
        const rcx = r.x + r.radius;
        const rcy = r.y + r.radius;
        const rad = r.radius;

        ctx.save();

        if (r.isRubberBall) {
          // Gummiball mit Schatten
          const distAboveGround = Math.max(0, 1 - (rcy % 80) / 80);
          ctx.fillStyle = `rgba(15, 23, 42, ${0.2 + distAboveGround * 0.3})`;
          ctx.beginPath();
          ctx.ellipse(rcx, rcy + rad + 4, rad * (0.6 + distAboveGround * 0.4), 3, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(rcx, rcy);
          ctx.rotate(r.rot);
          ctx.scale(1 / (r.squash || 1), r.squash || 1);

          const ballGrad = ctx.createRadialGradient(-rad * 0.35, -rad * 0.35, 1, 0, 0, rad * 1.05);
          ballGrad.addColorStop(0, "#ffffff");
          ballGrad.addColorStop(0.3, "#f43f5e");
          ballGrad.addColorStop(0.7, "#06b6d4");
          ballGrad.addColorStop(1, "#0f172a");

          ctx.fillStyle = ballGrad;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(0, 0, rad * 0.65, -0.8, 1.4);
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(-rad * 0.3, -rad * 0.3, rad * 0.25, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Felsen
          ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
          ctx.beginPath();
          ctx.ellipse(rcx, r.y + rad * 2 + 1, rad * 0.9, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(rcx, rcy);
          ctx.rotate(r.rot);

          const rockGrad = ctx.createRadialGradient(-rad * 0.35, -rad * 0.35, 1, 0, 0, rad * 1.05);
          rockGrad.addColorStop(0, "#94a3b8");
          rockGrad.addColorStop(0.35, "#64748b");
          rockGrad.addColorStop(0.75, "#475569");
          rockGrad.addColorStop(1, "#1e293b");

          ctx.fillStyle = rockGrad;
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = "rgba(15, 23, 42, 0.65)";
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(-rad * 0.4, -rad * 0.2);
          ctx.lineTo(-rad * 0.1, rad * 0.1);
          ctx.lineTo(rad * 0.4, -rad * 0.1);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(-rad * 0.1, rad * 0.1);
          ctx.lineTo(0, rad * 0.45);
          ctx.stroke();

          ctx.fillStyle = "rgba(34, 197, 94, 0.45)";
          ctx.beginPath();
          ctx.arc(rad * 0.3, rad * 0.25, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 3. Gipfel-Tor & Fahndungsplakat (erscheint erst wenn Gipfel gebaut wurde!)
      if (state.summitPlatform && game.exit) {
        const summitX = state.summitPlatform.x + state.summitPlatform.w * 0.5;
        const summitY = state.summitPlatform.y;

        ctx.save();
        const glow = 0.8 + Math.sin(game.animClock * 6) * 0.2;
        const gateGlow = ctx.createRadialGradient(summitX, summitY - 30, 6, summitX, summitY - 30, 52);
        gateGlow.addColorStop(0, "rgba(250, 204, 21, 0.55)");
        gateGlow.addColorStop(0.6, "rgba(74, 222, 128, 0.25)");
        gateGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gateGlow;
        ctx.beginPath();
        ctx.arc(summitX, summitY - 30, 52, 0, Math.PI * 2);
        ctx.fill();

        // Rote Pagoden-Säulen
        ctx.fillStyle = "#b91c1c";
        ctx.strokeStyle = "#450a0a";
        ctx.lineWidth = 1.6;
        ctx.fillRect(summitX - 26, summitY - 60, 8, 60);
        ctx.strokeRect(summitX - 26, summitY - 60, 8, 60);
        ctx.fillRect(summitX + 18, summitY - 60, 8, 60);
        ctx.strokeRect(summitX + 18, summitY - 60, 8, 60);

        // Goldenes Portal-Licht
        ctx.fillStyle = `rgba(254, 240, 138, ${glow * 0.65})`;
        ctx.fillRect(summitX - 18, summitY - 58, 36, 58);

        // Geschwungenes chinesisches Torbogen-Dach
        ctx.fillStyle = "#991b1b";
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(summitX - 38, summitY - 58);
        ctx.quadraticCurveTo(summitX, summitY - 72, summitX + 38, summitY - 58);
        ctx.lineTo(summitX + 30, summitY - 50);
        ctx.quadraticCurveTo(summitX, summitY - 62, summitX - 30, summitY - 50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 10px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GIPFEL", summitX, summitY - 42);

        // Tor-Glitzer
        for (const sp of state.gateSparkles) {
          ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
          ctx.fillStyle = sp.color;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 4. FAHNDUNGSPLAKAT ("WANTED") MIT PANDIS BILD AM GIPFELTOR
        drawWantedPoster(ctx, summitX - 44, summitY - 54, game.animClock);

        ctx.restore();
      }
    }

    return {
      mode: "side",
      worldW,
      worldH,
      spawn,
      platforms: steps,
      bamboos: [],
      keys: [],
      cage: null,
      cops: [],
      exit: null,
      keysRequired: 0,
      get summitPlatform() { return state.summitPlatform; },
      update,
      drawEntities,
      hudText: (game) =>
        (game.rocksJumped || 0) >= 20
          ? "🏁 GIPFEL ERREICHT! ➔ TOR!"
          : `🪨 ${game.rocksJumped || 0}/20 HINDERNISSE GEMEISTERT`,
      drawBackground: drawLevel5Background
    };
  }

  // -----------------------------------------------------------------------
  // Registrierung bei den Level-Modulen
  // -----------------------------------------------------------------------
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS =
    window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level5 = drawLevel5Background;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-5",
    shortLabel: "Steintreppe",
    name: "STEINTREPPE & ROLLENDE FELSEN",
    mode: "side",
    keysRequired: 0,
    drawBackground: drawLevel5Background,
    build: buildLevel5
  });
})();
