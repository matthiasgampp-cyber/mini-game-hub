// Level 7 – "Der Große Roboter & der gefangene Panda"
// -------------------------------------------------------------------------
// Top-Down Labyrinth im Stil von Level 4:
// - Start links unten (Spawn).
// - Der Schlüssel liegt genau in der Mitte des Labyrinths.
// - Die Kiste / der Käfig mit dem 2. Panda befindet sich rechts oben.
// - In der rechten unteren Ecke patrouilliert ein GROSSER ROBOTER (ohne Schienen):
//   Schreitet von rechts unten nach links unten und dann von rechts unten nach rechts oben,
//   und wiederholt diesen Zyklus kontinuierlich.
// - Kommt man dem Roboter zu nahe, feuert er fliegende Mini-Computer auf Pandi!
//   (Pandi kann hinter Labyrinth-Wänden in Deckung gehen!)
// - Links oben patrouilliert ein Polizist, der sich frei im Labyrinth bewegen kann
//   und Pandi verfolgt (minimal langsamer als Pandi).
// - Alle Bambuswände sind großzügig angeordnet (überall 65-90 px breite Gänge),
//   sodass Panda und Polizist überall problemlos durchpassen und keine Wege blockiert sind!
// -------------------------------------------------------------------------

(() => {
  "use strict";

  const BASE_WORLD_W = 960;
  const BASE_WORLD_H = 540;

  let cachedBgCanvas = null;
  let cachedW = 0;
  let cachedH = 0;

  // -----------------------------------------------------------------------
  // 1. Hintergrund: High-Tech Zen-Labor & Cyber-Palastboden
  // -----------------------------------------------------------------------
  function buildLevel7Background(worldW, worldH) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    const off = document.createElement("canvas");
    off.width = ww;
    off.height = wh;
    const ctx = off.getContext("2d");

    const stoneW = 32;
    const stoneH = 24;
    const gap = 2.5;

    // Cyber-Zen Boden: Dunkles Schieferblau mit Tech-Akzenten
    const baseGrad = ctx.createLinearGradient(0, 0, 0, wh);
    baseGrad.addColorStop(0, "#060d17");
    baseGrad.addColorStop(0.5, "#0b1524");
    baseGrad.addColorStop(1, "#040911");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, ww, wh);

    const stoneShades = ["#131f31", "#1a2a40", "#162337", "#0f1a29"];
    const rows = Math.ceil(wh / stoneH) + 1;
    const cols = Math.ceil(ww / stoneW) + 2;

    for (let r = 0; r < rows; r++) {
      const rowShift = (r % 2) * (stoneW * 0.5);
      const sy = r * stoneH;
      for (let c = -1; c < cols; c++) {
        const sx = c * stoneW + rowShift;
        const hash = Math.abs((r * 53 + c * 37) % stoneShades.length);

        ctx.fillStyle = stoneShades[hash];
        ctx.beginPath();
        ctx.roundRect(sx + gap * 0.5, sy + gap * 0.5, stoneW - gap, stoneH - gap, 4);
        ctx.fill();

        ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + gap * 0.5 + 2, sy + gap * 0.5 + 1.5);
        ctx.lineTo(sx + stoneW - gap * 0.5 - 2, sy + gap * 0.5 + 1.5);
        ctx.stroke();

        // Neon-cyan leuchtende Schaltkreis-Knotenpunkte
        if ((r * 19 + c * 29) % 11 === 0) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
          ctx.beginPath();
          ctx.arc(sx + gap * 0.5 + 5, sy + gap * 0.5 + 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Zentrum-Plattform mit leuchtendem Yin-Yang / Zen-Tech-Symbol
    const cx = ww * 0.5;
    const cy = wh * 0.5;
    const rad = 56;

    ctx.save();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(250, 204, 21, 0.06)";
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    cachedBgCanvas = off;
    cachedW = ww;
    cachedH = wh;
    return off;
  }

  function drawLevel7Background(ctx, { viewW = 720, viewH = 405, worldW = BASE_WORLD_W, worldH = BASE_WORLD_H, camera }) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    if (!cachedBgCanvas || cachedW !== ww || cachedH !== wh) {
      buildLevel7Background(ww, wh);
    }
    if (!cachedBgCanvas) return;

    const camX = camera?.x || 0;
    const camY = camera?.y || 0;
    const sx = Math.max(0, Math.min(cachedBgCanvas.width - 1, camX));
    const sy = Math.max(0, Math.min(cachedBgCanvas.height - 1, camY));
    const sw = Math.min(cachedBgCanvas.width - sx, viewW);
    const sh = Math.min(cachedBgCanvas.height - sy, viewH);

    if (sw > 0 && sh > 0) {
      ctx.drawImage(cachedBgCanvas, sx, sy, sw, sh, sx - camX, sy - camY, sw, sh);
    }
  }

  // -----------------------------------------------------------------------
  // 2. Zeichnung des Großen Roboters & der fliegenden Mini-Computer
  // -----------------------------------------------------------------------

  // Zeichnet den imposanten, großen Mech-Roboter (ohne Schienen)
  function drawBigRobot(ctx, robot, animClock) {
    const rx = robot.x;
    const ry = robot.y;
    const facing = robot.facing || { x: -1, y: 0 };
    const isTargeting = robot.isTargeting || false;
    const isWalking = robot.isWalking !== false;

    ctx.save();
    ctx.translate(rx, ry);

    // 1. Weicher dynamischer Schatten unter dem großen Roboter
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Schwere, animierte Mech-Beine mit Tritten
    const walkPhase = isWalking ? animClock * 7 : 0;
    const leftFootLift = Math.max(0, Math.sin(walkPhase)) * 6;
    const rightFootLift = Math.max(0, Math.sin(walkPhase + Math.PI)) * 6;

    const drawMechLeg = (side, lift) => {
      ctx.save();
      const lx = side * 16;
      const ly = 6 - lift;

      // Oberschenkel / Hydraulikzylinder
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(lx - 4, -4, 8, 14, 3);
      ctx.fill();
      ctx.stroke();

      // Knie-Gelenk mit Metallbolzen
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.arc(lx, 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Schwerer Stahl-Fuß / Trittfläche
      const footGrad = ctx.createLinearGradient(lx - 8, ly, lx + 8, ly + 10);
      footGrad.addColorStop(0, "#475569");
      footGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = footGrad;
      ctx.beginPath();
      ctx.roundRect(lx - 8, ly + 6, 16, 9, [3, 3, 2, 2]);
      ctx.fill();
      ctx.stroke();

      // Tritt-Licht an der Fußspitze
      ctx.fillStyle = isTargeting ? "#ef4444" : "#38bdf8";
      ctx.fillRect(lx - 5, ly + 12, 10, 2);

      ctx.restore();
    };

    drawMechLeg(-1, leftFootLift);
    drawMechLeg(1, rightFootLift);

    // 3. Massiver Mech-Körper (Gepanzerter Rumpf)
    const bodyGrad = ctx.createLinearGradient(-22, -22, 22, 22);
    bodyGrad.addColorStop(0, "#475569");
    bodyGrad.addColorStop(0.3, "#334155");
    bodyGrad.addColorStop(0.7, "#1e293b");
    bodyGrad.addColorStop(1, "#0f172a");

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-22, -18, 44, 32, 8);
    ctx.fill();
    ctx.stroke();

    // 4. Schwere Schulterpanzerung mit Warnstreifen
    const drawShoulder = (side) => {
      ctx.save();
      const sx = side * 24;
      const sy = -14;

      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(sx - 7, sy - 6, 14, 20, 5);
      ctx.fill();
      ctx.stroke();

      // Gelb-schwarze Warnmarkierung
      ctx.fillStyle = "#facc15";
      ctx.fillRect(sx - 5, sy - 2, 10, 3.5);
      ctx.fillRect(sx - 5, sy + 5, 10, 3.5);

      // Raketen-/Minicomputer-Werferrohr auf jeder Schulter
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(sx, sy - 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    drawShoulder(-1);
    drawShoulder(1);

    // 5. Pulsierender Reaktor-Kern in der Brust
    const corePulse = 0.75 + Math.sin(animClock * 6) * 0.25;
    const coreGrad = ctx.createRadialGradient(0, -2, 2, 0, -2, 12);
    if (isTargeting) {
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.3, "#ef4444");
      coreGrad.addColorStop(0.8, "rgba(185, 28, 28, 0.4)");
      coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else {
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.3, "#38bdf8");
      coreGrad.addColorStop(0.8, "rgba(2, 132, 199, 0.4)");
      coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    }

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -2, 12 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isTargeting ? "#ef4444" : "#38bdf8";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -2, 7, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Mech-Kopf & Zyklopen-Sensor (dreht sich in Blickrichtung)
    const lookAngle = Math.atan2(facing.y, facing.x);
    ctx.save();
    ctx.translate(0, -18);
    ctx.rotate(lookAngle);

    // Gepanzerter Kopfhelm
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-10, -9, 20, 18, 5);
    ctx.fill();
    ctx.stroke();

    // Großes Zyklopen-Auge / Optik
    ctx.fillStyle = isTargeting ? "#ef4444" : "#38bdf8";
    ctx.beginPath();
    ctx.roundRect(3, -5, 7, 10, 2);
    ctx.fill();

    // Augen-Glanzpunkt
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(6.5, -2, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 7. Hohe Kommunikationsantenne mit Warnlicht
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(8, -26);
    ctx.lineTo(8, -37);
    ctx.stroke();

    const beaconFlash = isTargeting || Math.sin(animClock * 9) > 0;
    ctx.fillStyle = isTargeting ? "#ef4444" : beaconFlash ? "#facc15" : "#64748b";
    ctx.beginPath();
    ctx.arc(8, -37, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 8. Zielerfassungs-Laser bei Erkennung
    if (isTargeting && robot.target) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(robot.target.x - rx, robot.target.y - ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Zeichnet die geflogenen Mini-Computer (Retro-PC Projektile)
  function drawMiniComputerProjectile(ctx, proj) {
    const px = proj.x;
    const py = proj.y;
    const rot = proj.rot || 0;
    const size = 18;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);

    // Digitaler Schweif
    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.beginPath();
    ctx.arc(-9, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Retro-PC Monitor (Beige / Retro-Computer-Gehäuse)
    ctx.fillStyle = "#f1f5f9";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-size * 0.5, -size * 0.5, size, size, 3.5);
    ctx.fill();
    ctx.stroke();

    // Röhrenbildschirm mit grün leuchtendem Matrix-Code
    ctx.fillStyle = "#022c22";
    ctx.beginPath();
    ctx.roundRect(-size * 0.38, -size * 0.38, size * 0.76, size * 0.65, 2);
    ctx.fill();

    // Matrix-Grüner Smile / Code auf dem Bildschirm
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(-2.5, -1, 1.2, 0, Math.PI * 2);
    ctx.arc(2.5, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 1.2, 2.6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Monitor-Standfuß
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(-3.5, size * 0.5 - 2, 7, 2.5);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 3. Level-Bau (Labyrinth, Spawn, Schlüssel in Mitte, Kiste rechts oben)
  // -----------------------------------------------------------------------
  function buildLevel7(viewW, viewH) {
    const worldW = BASE_WORLD_W;
    const worldH = BASE_WORLD_H;
    const t = 16; // Saubere, kräftige Wandstärke

    // Start unten links (Spawn)
    const spawn = { x: 100, y: 460 };

    // Schlüssel liegt genau in der Mitte
    const centerKey = {
      x: Math.round(worldW * 0.5),
      y: Math.round(worldH * 0.5),
      collected: false,
      isGift: false,
      order: 0
    };

    // Die Kiste / der Käfig mit dem gefangenen Panda befindet sich rechts oben
    const cage = {
      x: 855,
      y: 75,
      w: 42,
      h: 42,
      freed: false
    };

    // ---------------------------------------------------------------------
    // Labyrinth-Wände:
    // ALLE Gänge sind garantiert 65 bis 95 px breit, sodass Panda (24x32)
    // und Polizist (24x32) überall großzügig und ohne Klemmen durchpassen!
    // Keine Wege sind blockiert; alles ist in offenen Runden verbunden.
    // ---------------------------------------------------------------------
    const walls = [
      // 1. Außenmauern mit großzügigen Ecken
      { x: 30, y: 30, w: 780, h: t },        // Nordwand (lässt rechts oben 150px Platz für Kiste & Roboter)
      { x: 30, y: 30, w: t, h: 480 },        // Westwand ganz links
      { x: 30, y: 495, w: 890, h: t },       // Südwand ganz unten
      { x: 920, y: 30, w: t, h: 480 },       // Ostwand ganz rechts

      // 2. Äußere Trennpfeiler (trennen die äußere Patrouillenspur vom Innenraum mit 80-95px Durchgängen)
      // Untere Trennwand (Gangbreite nach unten zur Südwand: 75px)
      { x: 140, y: 420, w: 140, h: t },
      { x: 360, y: 420, w: 160, h: t },
      { x: 600, y: 420, w: 140, h: t },

      // Rechte Trennwand (Gangbreite nach rechts zur Ostwand: 110px)
      { x: 795, y: 130, w: t, h: 90 },
      { x: 795, y: 290, w: t, h: 95 },

      // 3. Zentrum-Chamber um den Schlüssel (4 Eingänge: N, O, S, W, alle 65-75px breit)
      { x: 425, y: 200, w: 110, h: t },      // Nordwand Zentrum
      { x: 425, y: 340, w: 110, h: t },      // Südwand Zentrum
      { x: 365, y: 235, w: t, h: 70 },       // Westwand Zentrum
      { x: 595, y: 235, w: t, h: 70 },       // Ostwand Zentrum

      // 4. Quadrant Oben-Links (Startgebiet des Polizisten: freie Runden, Gangbreite 75-85px)
      { x: 130, y: 125, w: 150, h: t },
      { x: 215, y: 141, w: t, h: 70 },

      // 5. Quadrant Unten-Links (Spawn-Aufgang: Gangbreite 75-90px)
      { x: 130, y: 340, w: 150, h: t },
      { x: 215, y: 235, w: t, h: 70 },

      // 6. Quadrant Oben-Rechts (Weg zur Kiste: Gangbreite 70-85px)
      { x: 640, y: 125, w: 95, h: t },
      { x: 700, y: 141, w: t, h: 70 },

      // 7. Quadrant Unten-Rechts (Abfangzone: Gangbreite 70-85px)
      { x: 640, y: 340, w: 95, h: t },
      { x: 700, y: 235, w: t, h: 70 }
    ];

    // Polizist: Startet links oben und bewegt sich frei im Labyrinth
    // chaseSpeed: 172 px/s (Pandi läuft 190 px/s -> Polizist ist minimal langsamer als Pandi!)
    const cops = [
      {
        x: 95,
        y: 85,
        w: 24,
        h: 32,
        patrolSpeed: 85,
        chaseSpeed: 172,
        dir: { x: 1, y: 0 },
        dirTimer: 0.8,
        isChasing: false
      }
    ];

    // GROSSER ROBOTER (ohne Schienen) in der rechten unteren Ecke
    // Patrol-Route:
    // 0: Rechts unten (850, 460)
    // 1: Links unten (100, 460)
    // 2: Rechts unten (850, 460)
    // 3: Rechts oben (850, 90)
    // 4: Rechts unten (850, 460) -> Endlosschleife!
    const robot = {
      x: 850,
      y: 460,
      w: 44,
      h: 40,
      speed: 120, // Schwerer, bedrohlicher Mech-Schritt
      routeIndex: 0,
      waypoints: [
        { x: 850, y: 460 }, // 0: Rechts unten
        { x: 100, y: 460 }, // 1: Links unten
        { x: 850, y: 460 }, // 2: Rechts unten
        { x: 850, y: 90  }, // 3: Rechts oben
        { x: 850, y: 460 }  // 4: Zurück nach Rechts unten
      ],
      facing: { x: -1, y: 0 },
      shootCooldown: 1.5,
      shootInterval: 2.0,
      isTargeting: false,
      target: null,
      isWalking: true
    };

    // Array für abgeschossene Mini-Computer-Projektile
    const miniComputerProjectiles = [];

    // Optional: Bonus-Münzen im Labyrinth
    const coins = [
      { x: 140, y: 220, radius: 8, collected: false, order: 0 },
      { x: 740, y: 80,  radius: 8, collected: false, order: 1 },
      { x: 260, y: 380, radius: 8, collected: false, order: 2 },
      { x: 750, y: 380, radius: 8, collected: false, order: 3 }
    ];

    const state = {
      robot,
      projectiles: miniComputerProjectiles,
      walls,
      coins,
      centerKey,
      cage
    };

    // ---------------------------------------------------------------------
    // Update-Logik: Roboter-Schreiten & Minicomputer-Schüsse
    // ---------------------------------------------------------------------
    function update(g, dt) {
      const p = g.pandi;
      const pcx = p.x + p.w * 0.5;
      const pcy = p.y + p.h * 0.5;
      const r = state.robot;

      // 1. Großer Roboter bewegt sich entlang der Wegpunkte (ohne Schienen)
      const targetWp = r.waypoints[r.routeIndex];
      const dx = targetWp.x - r.x;
      const dy = targetWp.y - r.y;
      const distToWp = Math.hypot(dx, dy);

      if (distToWp < 5) {
        // Wegpunkt erreicht: Nächsten Wegpunkt ansteuern
        r.routeIndex = (r.routeIndex + 1) % r.waypoints.length;
      } else {
        const moveDist = Math.min(distToWp, r.speed * dt);
        const dirX = dx / distToWp;
        const dirY = dy / distToWp;
        r.x += dirX * moveDist;
        r.y += dirY * moveDist;
        r.facing = { x: dirX, y: dirY };
        r.isWalking = true;
      }

      // 2. Annäherungsprüfung für Minicomputer-Schüsse
      // "wenn er uns zu nahe kommt kann er minicomputer auf uns schießen"
      const distToPandi = Math.hypot(pcx - r.x, pcy - r.y);
      const DETECTION_RADIUS = 270;

      r.shootCooldown -= dt;

      if (distToPandi <= DETECTION_RADIUS) {
        r.isTargeting = true;
        r.target = { x: pcx, y: pcy };

        // Schuss abfeuern, wenn Cooldown abgelaufen
        if (r.shootCooldown <= 0) {
          r.shootCooldown = r.shootInterval;

          // Geschoss-Richtung berechnen
          const shootAngle = Math.atan2(pcy - r.y, pcx - r.x);
          const projSpeed = 230;

          state.projectiles.push({
            x: r.x + Math.cos(shootAngle) * 20,
            y: r.y + Math.sin(shootAngle) * 20,
            vx: Math.cos(shootAngle) * projSpeed,
            vy: Math.sin(shootAngle) * projSpeed,
            rot: 0,
            w: 18,
            h: 18,
            life: 2.8
          });

          // Sound & Schusseffekt
          g.ctx?.sound?.playHit?.();
          g.spawnParticles(r.x, r.y, "#38bdf8", 12);
          g.spawnParticles(r.x, r.y, "#facc15", 10);
          g.addFloatingText(r.x - g.camera.x, r.y - g.camera.y - 24, "ALARM! MINICOMPUTER!", "#38bdf8");
        }
      } else {
        r.isTargeting = false;
        r.target = null;
      }

      // 3. Roboter-Kollision mit Pandi
      if (g.invulnTimer <= 0) {
        const robOverlap = g._rectsOverlap(p.x, p.y, p.w, p.h, r.x - r.w * 0.5, r.y - r.h * 0.5, r.w, r.h);
        if (robOverlap) {
          g.damagePandi("VOM GROSSEN ROBOTER GERAMMT!");
        }
      }

      // 4. Minicomputer-Projektile aktualisieren & Kollisionen prüfen
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const proj = state.projectiles[i];
        proj.life -= dt;
        proj.rot += dt * 8; // Rotiert im Flug
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        // Trefferprüfung mit Labyrinth-Wänden (Pandi kann hinter Wänden in Deckung gehen!)
        let hitWall = false;
        for (const wall of state.walls) {
          if (g._rectsOverlap(proj.x - proj.w * 0.5, proj.y - proj.h * 0.5, proj.w, proj.h, wall.x, wall.y, wall.w, wall.h)) {
            hitWall = true;
            break;
          }
        }

        if (hitWall) {
          // Explodiert an der Wand in kleine Tastatur- & Pixel-Partikel
          g.spawnParticles(proj.x, proj.y, "#38bdf8", 10);
          g.spawnParticles(proj.x, proj.y, "#4ade80", 8);
          state.projectiles.splice(i, 1);
          continue;
        }

        // Trefferprüfung mit Pandi
        const hitPandi = g._rectsOverlap(
          proj.x - proj.w * 0.5,
          proj.y - proj.h * 0.5,
          proj.w,
          proj.h,
          p.x + 2,
          p.y + 2,
          p.w - 4,
          p.h - 4
        );

        if (hitPandi) {
          g.damagePandi("MINICOMPUTER-TREFFER!");
          g.spawnParticles(proj.x, proj.y, "#ef4444", 16);
          g.spawnParticles(proj.x, proj.y, "#38bdf8", 12);
          state.projectiles.splice(i, 1);
          continue;
        }

        if (proj.life <= 0) {
          state.projectiles.splice(i, 1);
        }
      }
    }

    // ---------------------------------------------------------------------
    // Zeichnung aller Entities im Level
    // ---------------------------------------------------------------------
    function drawEntities(g, ctx) {
      const time = g.animClock || 0;

      // 1. Großer Roboter
      drawBigRobot(ctx, state.robot, time);

      // 2. Fliegende Minicomputer-Projektile
      for (const proj of state.projectiles) {
        drawMiniComputerProjectile(ctx, proj);
      }
    }

    return {
      mode: "maze",
      worldW,
      worldH,
      spawn,
      walls,
      coins,
      keys: [centerKey],
      keysRequired: 1,
      cage,
      cops,
      exit: null, // Ziel ist die Kiste rechts oben mit dem gefangenen Panda!
      update,
      drawEntities,
      hudText: (g) =>
        g.keysCollected >= 1
          ? "🔑 SCHLÜSSEL DA! ➔ ZUR KISTE RECHTS OBEN! 🐼"
          : "🔑 HOL DEN SCHLÜSSEL IN DER MITTE! 🤖",
      drawBackground: drawLevel7Background
    };
  }

  // -----------------------------------------------------------------------
  // Registrierung bei den Level-Modulen
  // -----------------------------------------------------------------------
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level7 = drawLevel7Background;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-7",
    shortLabel: "Großer Roboter",
    name: "DER GROSSE ROBOTER & DER GEFANGENE PANDA",
    mode: "maze",
    keysRequired: 1,
    drawBackground: drawLevel7Background,
    build: buildLevel7
  });
})();
