// Level 6 – "Dschungel-Lianen & Krokodile"
// -------------------------------------------------------------------------
// Dschungel-Sidescroller: Pandi muss über mehrere Wasserpfützen springen,
// indem er sich von Liane zu Liane schwingt.
// Die Lianen schwingen in unterschiedlichen Takten (Frequenzen & Amplituden),
// sodass gutes Timing gefordert ist!
//
// Struktur:
// - Start-Plattform
// - 1. Pfütze: 3 Lianen
// - Kleine Plattform
// - 2. Pfütze: 2 Lianen, kleine Plattform, 1 Liane
// - Kleine Plattform
// - 3. Pfütze: 3 Lianen, kleine Plattform, 2 Lianen
// - Plattform mit Ausgang (Dschungel-Tor)
//
// In den Pfützen lauern Krokodile, die regelmäßig mit weiten Kiefern
// nach oben schnappen ("schneppen"), Pandi jedoch auf den Lianen oder
// Plattformen niemals erreichen können!
// -------------------------------------------------------------------------

(() => {
  "use strict";

  const BASE_WORLD_W = 2800;
  const BASE_WORLD_H = 405;
  const PLATFORM_Y = 345;
  const WATER_SURFACE_Y = 368;

  // -----------------------------------------------------------------------
  // 1. Hintergrund: Dichter tropischer Dschungel mit Lichtstrahlen & Farnen
  // -----------------------------------------------------------------------
  function drawLevel6Background(ctx, { viewW = 720, viewH = 405, worldW = BASE_WORLD_W, worldH = BASE_WORLD_H, camera, time = 0 }) {
    const camX = camera?.x || 0;

    // Dschungel-Himmel: feuchtwarmes Smaragd- & Dschungelgrün
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, "#022c22");
    sky.addColorStop(0.3, "#064e3b");
    sky.addColorStop(0.65, "#065f46");
    sky.addColorStop(0.85, "#047857");
    sky.addColorStop(1, "#10b981");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, viewH);

    // Ferne Dschungelberge & antike Tempelsilhouetten (Parallaxe 0.08)
    const px1 = (camX * 0.08) % (viewW * 2);
    ctx.save();
    ctx.fillStyle = "#022018";
    ctx.beginPath();
    ctx.moveTo(-50, viewH);
    ctx.lineTo(-px1, viewH * 0.62);
    ctx.lineTo(-px1 + viewW * 0.22, viewH * 0.40);
    ctx.lineTo(-px1 + viewW * 0.45, viewH * 0.58);
    ctx.lineTo(-px1 + viewW * 0.72, viewH * 0.35);
    ctx.lineTo(-px1 + viewW * 0.95, viewH * 0.55);
    ctx.lineTo(-px1 + viewW * 1.25, viewH * 0.38);
    ctx.lineTo(-px1 + viewW * 1.55, viewH * 0.56);
    ctx.lineTo(-px1 + viewW * 1.85, viewH * 0.42);
    ctx.lineTo(viewW + 50, viewH);
    ctx.closePath();
    ctx.fill();

    // Ferner Wasserfall im Hintergrund
    const wfX = ((viewW * 0.72 - camX * 0.08) % (viewW * 1.5) + viewW * 1.5) % (viewW * 1.5) - 40;
    if (wfX > -30 && wfX < viewW + 30) {
      const wfGrad = ctx.createLinearGradient(wfX, viewH * 0.38, wfX, viewH * 0.75);
      wfGrad.addColorStop(0, "rgba(224, 242, 254, 0.7)");
      wfGrad.addColorStop(1, "rgba(56, 189, 248, 0.3)");
      ctx.fillStyle = wfGrad;
      ctx.fillRect(wfX, viewH * 0.38, 6, viewH * 0.37);

      // Gischt am Fuß
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(wfX + 3, viewH * 0.75, 9 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Mittlere Palmen- & Baumkronenebene (Parallaxe 0.25)
    const px2 = (camX * 0.25) % (viewW * 1.5);
    ctx.save();
    ctx.fillStyle = "#033b2c";
    for (let i = 0; i < 14; i++) {
      const cx = -px2 + i * (viewW * 0.16);
      const cy = viewH * (0.36 + (i % 4) * 0.05);
      if (cx > -80 && cx < viewW + 80) {
        ctx.beginPath();
        ctx.arc(cx, cy, 38 + (i % 3) * 8, 0, Math.PI * 2);
        ctx.fill();

        // Palmwedel-Zacken
        for (let a = -1.2; a <= 1.2; a += 0.45) {
          const fx = cx + Math.cos(a + 1.57) * 48;
          const fy = cy + Math.sin(a + 1.57) * 48;
          ctx.beginPath();
          ctx.ellipse(fx, fy, 14, 6, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // Sanfte Sonnenstrahlen (Lichtkegel durchs Blätterdach)
    ctx.save();
    const rayCount = 5;
    for (let r = 0; r < rayCount; r++) {
      const rx = ((r * 180 + time * 6 - camX * 0.12) % (viewW + 240)) - 100;
      const rayAlpha = 0.06 + Math.sin(time * 1.5 + r * 1.3) * 0.035;
      const rayGrad = ctx.createLinearGradient(rx, 0, rx + 120, viewH);
      rayGrad.addColorStop(0, `rgba(254, 240, 138, ${rayAlpha * 1.8})`);
      rayGrad.addColorStop(0.5, `rgba(167, 243, 208, ${rayAlpha})`);
      rayGrad.addColorStop(1, "rgba(254, 240, 138, 0)");

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rx - 15, 0);
      ctx.lineTo(rx + 35, 0);
      ctx.lineTo(rx + 160, viewH);
      ctx.lineTo(rx + 80, viewH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Schwebende Glühwürmchen & Dschungelsporen
    ctx.save();
    for (let p = 0; p < 22; p++) {
      const sx = ((p * 83 + time * 18 - camX * 0.3) % (viewW + 40) + viewW + 40) % (viewW + 40) - 20;
      const sy = ((p * 47 + Math.sin(time * 2 + p) * 22) % (viewH * 0.85) + viewH * 0.85) % (viewH * 0.85);
      const alpha = 0.25 + 0.65 * Math.abs(Math.sin(time * 2.4 + p * 0.9));
      ctx.fillStyle = p % 2 === 0 ? `rgba(250, 204, 21, ${alpha})` : `rgba(134, 239, 172, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, p % 3 === 0 ? 2.0 : 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Oberes Blätterdach im Vordergrund (hängende Lianen & Tropenblätter)
    ctx.save();
    const canopyGrad = ctx.createLinearGradient(0, 0, 0, 85);
    canopyGrad.addColorStop(0, "rgba(2, 44, 34, 0.95)");
    canopyGrad.addColorStop(0.65, "rgba(4, 120, 87, 0.75)");
    canopyGrad.addColorStop(1, "rgba(6, 78, 59, 0)");
    ctx.fillStyle = canopyGrad;
    ctx.fillRect(0, 0, viewW, 85);

    // Hängendes Dschungellaub an der Decke
    ctx.fillStyle = "#064e3b";
    for (let lx = -20; lx < viewW + 40; lx += 32) {
      const leafH = 24 + ((lx * 13) % 20);
      const leafSway = Math.sin(time * 2 + lx * 0.05) * 4;
      ctx.beginPath();
      ctx.ellipse(lx + leafSway, 12, 18, leafH, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 2. Zeichnung von Lianen, Pfützen, Krokodilen & Plattformen
  // -----------------------------------------------------------------------

  // Zeichnet eine schwingende Liane mit Dschungel-Struktur & Blättern
  function drawVine(ctx, vine, animClock) {
    const ax = vine.anchorX;
    const ay = vine.anchorY;
    const angle = vine.angle;
    const L = vine.length;

    ctx.save();

    // Oberer Aufhänge-Ast / Dschungelast
    ctx.fillStyle = "#3e2211";
    ctx.strokeStyle = "#1e1008";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(ax - 20, ay - 6, 40, 9, 4);
    ctx.fill();
    ctx.stroke();

    // Liane als geschwungene Kette / Naturseil
    const segments = 10;
    const points = [{ x: ax, y: ay }];

    // Leichte Biegekurve während des Schwunges
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const lag = Math.sin(angle * 2) * (t * (1 - t) * 14);
      const segAngle = angle + lag * 0.05;
      const segL = L * t;
      points.push({
        x: ax + Math.sin(segAngle) * segL,
        y: ay + Math.cos(segAngle) * segL
      });
    }

    // Seil-Körper
    ctx.strokeStyle = vine.isGrabbed ? "#4ade80" : "#2d5a27";
    ctx.lineWidth = vine.isGrabbed ? 5.5 : 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Hellerer Kern der Liane
    ctx.strokeStyle = vine.isGrabbed ? "#86efac" : "#4d7c0f";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Dschungelblätter an den Knotenpunkten der Liane
    for (let i = 2; i < points.length; i += 2) {
      const pt = points[i];
      const side = (i % 4 === 0) ? 1 : -1;
      const leafRot = angle + side * 0.8 + Math.sin(animClock * 3 + i) * 0.15;

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(leafRot);
      ctx.fillStyle = i % 4 === 0 ? "#22c55e" : "#16a34a";
      ctx.strokeStyle = "#14532d";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(side * 8, 0, 7.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Greif-Schlaufe / unterer Knoten der Liane
    const tip = points[points.length - 1];
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(angle);

    // Dicker Schlingen-Knoten
    ctx.fillStyle = vine.isGrabbed ? "#facc15" : "#65a30d";
    ctx.strokeStyle = "#14532d";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Kleine Blattspitzen am Ende
    ctx.fillStyle = "#86efac";
    ctx.beginPath();
    ctx.ellipse(3, 7, 4.5, 2, 0.6, 0, Math.PI * 2);
    ctx.ellipse(-3, 7, 4.5, 2, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // Sanfter Leuchteffekt, wenn Pandi daran hängt
    if (vine.isGrabbed) {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  // Zeichnet eine Wasserpfütze mit Dschungel-Sumpfwasser & Seerosen
  function drawPuddle(ctx, puddle, animClock) {
    const { x, w, y = WATER_SURFACE_Y, h = 45 } = puddle;

    ctx.save();

    // Schlammiges Ufer links & rechts
    ctx.fillStyle = "#291508";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 14, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w, y + 4, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiefes Dschungel-Wasser (Sumpf-Farbverlauf)
    const waterGrad = ctx.createLinearGradient(0, y, 0, y + h);
    waterGrad.addColorStop(0, "#064e3b");
    waterGrad.addColorStop(0.3, "#042f2e");
    waterGrad.addColorStop(0.7, "#022c22");
    waterGrad.addColorStop(1, "#021c16");

    ctx.fillStyle = waterGrad;
    ctx.fillRect(x, y, w, h);

    // Wasser-Oberfläche mit sanften Wellen
    ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let wx = x; wx <= x + w; wx += 16) {
      const wave = Math.sin(animClock * 3.5 + wx * 0.06) * 1.8;
      ctx.lineTo(wx, y + wave);
    }
    ctx.stroke();

    // Schwimmende Seerosenblätter
    const padCount = Math.max(1, Math.floor(w / 110));
    for (let i = 0; i < padCount; i++) {
      const lx = x + 35 + i * 105 + Math.sin(animClock * 1.2 + i * 2) * 5;
      const ly = y + 4 + Math.sin(animClock * 2.2 + i) * 1.5;

      ctx.fillStyle = "#15803d";
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 11, 4.5, 0, 0.2, Math.PI * 2 - 0.2);
      ctx.lineTo(lx, ly);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rosa Lotusblüte auf jedem zweiten Blatt
      if (i % 2 === 1) {
        ctx.fillStyle = "#f472b6";
        ctx.beginPath();
        ctx.arc(lx, ly - 2.5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(lx, ly - 2.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Zeichnet das Krokodil mit animierten Kiefern ("schneppen")
  // Wichtig: Das Krokodil schnappt nach oben, erreicht Pandi aber niemals!
  function drawCrocodile(ctx, croc, animClock) {
    const cx = croc.x;
    const cy = croc.y;
    const facing = croc.facing || 1;
    const snapProgress = croc.snapProgress || 0; // 0 bis 1 (Kieferöffnung)

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(facing, 1);

    // Krokodil-Körper / Schuppenrücken im Wasser
    ctx.fillStyle = "#14532d";
    ctx.strokeStyle = "#052e16";
    ctx.lineWidth = 1.4;

    // Rücken-Panzer mit Zacken
    ctx.beginPath();
    ctx.roundRect(-24, -3, 44, 16, [6, 12, 4, 4]);
    ctx.fill();
    ctx.stroke();

    // Krokodil-Schuppenzacken auf dem Rücken
    ctx.fillStyle = "#166534";
    for (let z = -18; z <= 12; z += 7) {
      ctx.beginPath();
      ctx.moveTo(z - 3, -3);
      ctx.lineTo(z, -8);
      ctx.lineTo(z + 3, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Unterkiefer
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.roundRect(4, 2, 28, 7, 3);
    ctx.fill();
    ctx.stroke();

    // Scharfe weiße Zähne am Unterkiefer
    ctx.fillStyle = "#ffffff";
    for (let t = 8; t <= 28; t += 5) {
      ctx.beginPath();
      ctx.moveTo(t - 1.5, 2);
      ctx.lineTo(t, -1);
      ctx.lineTo(t + 1.5, 2);
      ctx.fill();
    }

    // Oberkiefer mit Schnapp-Winkel (beim "Schneppen" hebt sich der Oberkiefer deutlich!)
    const jawOpenAngle = -snapProgress * 0.72;

    ctx.save();
    ctx.translate(6, 0);
    ctx.rotate(jawOpenAngle);

    // Roter/rosa Gaumen innen
    if (snapProgress > 0.15) {
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.ellipse(12, 1, 10, 3 * snapProgress, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Oberkiefer-Schnauze
    ctx.fillStyle = "#166534";
    ctx.strokeStyle = "#052e16";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(0, -6, 26, 7, [4, 6, 2, 2]);
    ctx.fill();
    ctx.stroke();

    // Zähne am Oberkiefer
    ctx.fillStyle = "#ffffff";
    for (let t = 4; t <= 23; t += 5) {
      ctx.beginPath();
      ctx.moveTo(t - 1.5, 1);
      ctx.lineTo(t, 4);
      ctx.lineTo(t + 1.5, 1);
      ctx.fill();
    }

    // Nasenloch
    ctx.fillStyle = "#052e16";
    ctx.beginPath();
    ctx.arc(22, -4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Gelbes Reptilien-Auge mit schwarzem Schlitz
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#052e16";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(5, -7, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#052e16";
    ctx.beginPath();
    ctx.ellipse(5, -7, 0.9, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Spritzer und Wasserringe um das Krokodil
    ctx.strokeStyle = "rgba(110, 231, 183, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 6, 26 + Math.sin(animClock * 4) * 3, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Wenn frisch zugeschnappt: kleine Wasserspritzer
    if (croc.snapEffectTimer > 0) {
      ctx.fillStyle = "rgba(224, 242, 254, 0.85)";
      for (let s = 0; s < 5; s++) {
        const sx = 18 + Math.cos(s * 1.2) * 12;
        const sy = -10 - Math.sin(s * 1.2) * 10 * croc.snapEffectTimer;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Zeichnet das Dschungel-Zieltor
  function drawJungleExitGate(ctx, exit, animClock) {
    const { x, y, w = 52, h = 64 } = exit;
    const baseY = y + h * 0.5;
    const topY = y - h * 0.5;
    const glow = 0.8 + Math.sin(animClock * 5) * 0.2;

    ctx.save();

    // Magisches Dschungel-Portal-Leuchten
    const portalGlow = ctx.createRadialGradient(x, y, 4, x, y, w * 1.4);
    portalGlow.addColorStop(0, `rgba(52, 211, 153, ${glow * 0.65})`);
    portalGlow.addColorStop(0.5, `rgba(250, 204, 21, ${glow * 0.3})`);
    portalGlow.addColorStop(1, "rgba(52, 211, 153, 0)");
    ctx.fillStyle = portalGlow;
    ctx.beginPath();
    ctx.arc(x, y, w * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Antike Dschungeltor-Steinsäulen mit Moos
    ctx.fillStyle = "#334155";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.8;
    ctx.fillRect(x - w * 0.5 - 6, topY, 12, h);
    ctx.strokeRect(x - w * 0.5 - 6, topY, 12, h);
    ctx.fillRect(x + w * 0.5 - 6, topY, 12, h);
    ctx.strokeRect(x + w * 0.5 - 6, topY, 12, h);

    // Grünes Portal-Licht im Durchgang
    const innerLight = ctx.createLinearGradient(0, topY, 0, baseY);
    innerLight.addColorStop(0, `rgba(167, 243, 208, ${glow * 0.85})`);
    innerLight.addColorStop(1, `rgba(16, 185, 129, ${glow * 0.95})`);
    ctx.fillStyle = innerLight;
    ctx.fillRect(x - w * 0.5 + 6, topY + 6, w - 12, h - 6);

    // Torbogen-Dach mit Lianen & Lotus
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5 - 14, topY);
    ctx.quadraticCurveTo(x, topY - 18, x + w * 0.5 + 14, topY);
    ctx.lineTo(x + w * 0.5 + 8, topY + 8);
    ctx.quadraticCurveTo(x, topY - 8, x - w * 0.5 - 8, topY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Umwickelnde Lianen an den Säulen
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let sy = topY + 10; sy < baseY; sy += 12) {
      ctx.moveTo(x - w * 0.5 - 6, sy);
      ctx.lineTo(x - w * 0.5 + 6, sy + 6);
      ctx.moveTo(x + w * 0.5 - 6, sy);
      ctx.lineTo(x + w * 0.5 + 6, sy + 6);
    }
    ctx.stroke();

    // Goldene Schrift
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 10px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DSCHUNGEL", x, topY - 4);
    ctx.fillText("ZIEL", x, topY + 22);

    ctx.restore();
  }

  // Zeichnet Sammelobjekte (Goldene Dschungel-Mangos entlang der Lianen-Schwünge)
  function drawJungleCoins(ctx, coins, animClock) {
    ctx.save();
    for (const c of coins) {
      if (c.collected) continue;
      const bob = Math.sin(animClock * 4 + c.x * 0.05) * 3;
      const cx = c.x;
      const cy = c.y + bob;

      // Schein
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
      glow.addColorStop(0, "rgba(250, 204, 21, 0.7)");
      glow.addColorStop(1, "rgba(250, 204, 21, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      // Goldene Tropenfrucht / Lotusmünze
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blatt an der Frucht
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy - 7, 3.5, 1.8, -0.6, 0, Math.PI * 2);
      ctx.fill();

      // Glanzpunkt
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 2.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 3. Level-Bau (Platforms, Lianen, Krokodile, Pfützen & Ziel)
  // -----------------------------------------------------------------------
  function buildLevel6(viewW, viewH, game) {
    const worldW = BASE_WORLD_W;
    const worldH = BASE_WORLD_H;
    const groundY = PLATFORM_Y;

    // A. Start-Plattform
    const startPlat = { x: 30, y: groundY, w: 180, h: 60 };

    // B. Plattform 1 (nach 1. Pfütze)
    const plat1 = { x: 720, y: groundY, w: 100, h: 60 };

    // C. Plattform 2 (mitten in der 2. Pfütze)
    const plat2 = { x: 1220, y: groundY, w: 85, h: 60 };

    // D. Plattform 3 (nach 2. Pfütze)
    const plat3 = { x: 1540, y: groundY, w: 100, h: 60 };

    // E. Plattform 4 (mitten in der 3. Pfütze)
    const plat4 = { x: 2150, y: groundY, w: 90, h: 60 };

    // F. Ziel-Plattform am Ende mit Ausgang
    const endPlat = { x: 2600, y: groundY, w: 200, h: 60 };

    const platforms = [startPlat, plat1, plat2, plat3, plat4, endPlat];

    // Pfützen unter den Lianen
    const puddles = [
      // 1. Pfütze: x: 210 bis 720 (unter 3 Lianen)
      { x: 210, w: 510, y: WATER_SURFACE_Y, h: 45 },
      // 2. Pfütze - Teil A: x: 820 bis 1220 (unter 2 Lianen)
      { x: 820, w: 400, y: WATER_SURFACE_Y, h: 45 },
      // 2. Pfütze - Teil B: x: 1305 bis 1540 (unter 1 Liane)
      { x: 1305, w: 235, y: WATER_SURFACE_Y, h: 45 },
      // 3. Pfütze - Teil A: x: 1640 bis 2150 (unter 3 Lianen)
      { x: 1640, w: 510, y: WATER_SURFACE_Y, h: 45 },
      // 3. Pfütze - Teil B: x: 2240 bis 2600 (unter 2 Lianen)
      { x: 2240, w: 360, y: WATER_SURFACE_Y, h: 45 }
    ];

    // Lianen-Konfiguration:
    // Die Lianen schwingen in verschiedenem Takt (unterschiedliche Geschwindigkeiten,
    // Amplituden & Phasenverschiebungen), sodass man den richtigen Moment abpassen muss!
    const vines = [
      // === 1. Pfütze (3 Lianen) ===
      {
        id: "v1_1",
        anchorX: 310,
        anchorY: 28,
        length: 220,
        speed: 1.8,
        maxAngle: 0.44,
        phase: 0,
        angle: 0,
        tipX: 310,
        tipY: 248,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },
      {
        id: "v1_2",
        anchorX: 475,
        anchorY: 26,
        length: 225,
        speed: 2.2,
        maxAngle: 0.48,
        phase: 1.6,
        angle: 0,
        tipX: 475,
        tipY: 251,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },
      {
        id: "v1_3",
        anchorX: 635,
        anchorY: 28,
        length: 220,
        speed: 1.9,
        maxAngle: 0.42,
        phase: 3.1,
        angle: 0,
        tipX: 635,
        tipY: 248,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },

      // === 2. Pfütze - Teil A (2 Lianen) ===
      {
        id: "v2_1",
        anchorX: 930,
        anchorY: 26,
        length: 220,
        speed: 2.3,
        maxAngle: 0.46,
        phase: 0.5,
        angle: 0,
        tipX: 930,
        tipY: 246,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },
      {
        id: "v2_2",
        anchorX: 1105,
        anchorY: 28,
        length: 225,
        speed: 1.7,
        maxAngle: 0.43,
        phase: 2.4,
        angle: 0,
        tipX: 1105,
        tipY: 253,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },

      // === 2. Pfütze - Teil B (1 Liane) ===
      {
        id: "v2_3",
        anchorX: 1425,
        anchorY: 26,
        length: 225,
        speed: 2.5,
        maxAngle: 0.50,
        phase: 1.1,
        angle: 0,
        tipX: 1425,
        tipY: 251,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },

      // === 3. Pfütze - Teil A (3 Lianen) ===
      {
        id: "v3_1",
        anchorX: 1740,
        anchorY: 28,
        length: 220,
        speed: 2.0,
        maxAngle: 0.45,
        phase: 0.8,
        angle: 0,
        tipX: 1740,
        tipY: 248,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },
      {
        id: "v3_2",
        anchorX: 1905,
        anchorY: 26,
        length: 228,
        speed: 2.6,
        maxAngle: 0.52,
        phase: 2.9,
        angle: 0,
        tipX: 1905,
        tipY: 254,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },
      {
        id: "v3_3",
        anchorX: 2065,
        anchorY: 28,
        length: 220,
        speed: 1.9,
        maxAngle: 0.43,
        phase: 4.4,
        angle: 0,
        tipX: 2065,
        tipY: 248,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },

      // === 3. Pfütze - Teil B (2 Lianen) ===
      {
        id: "v3_4",
        anchorX: 2335,
        anchorY: 26,
        length: 225,
        speed: 2.4,
        maxAngle: 0.48,
        phase: 1.3,
        angle: 0,
        tipX: 2335,
        tipY: 251,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      },
      {
        id: "v3_5",
        anchorX: 2495,
        anchorY: 28,
        length: 220,
        speed: 1.8,
        maxAngle: 0.44,
        phase: 3.6,
        angle: 0,
        tipX: 2495,
        tipY: 248,
        tangentVx: 0,
        tangentVy: 0,
        cooldown: 0,
        isGrabbed: false
      }
    ];

    // Krokodile in den Pfützen:
    // Sie schwimmen gemütlich im Wasser und schneppen regelmäßig nach oben,
    // erreichen Pandi auf den Lianen oder Plattformen aber bewusst nicht!
    const crocodiles = [
      // Krokodil 1 in der 1. Pfütze
      {
        x: 395,
        y: WATER_SURFACE_Y - 2,
        minX: 270,
        maxX: 610,
        speed: 32,
        facing: 1,
        snapTimer: 1.8,
        snapPeriod: 2.6,
        snapPhase: 0,
        snapProgress: 0,
        snapEffectTimer: 0
      },
      // Krokodil 2 in der 2. Pfütze (Teil A)
      {
        x: 1010,
        y: WATER_SURFACE_Y - 2,
        minX: 890,
        maxX: 1150,
        speed: 36,
        facing: -1,
        snapTimer: 1.2,
        snapPeriod: 2.8,
        snapPhase: 0,
        snapProgress: 0,
        snapEffectTimer: 0
      },
      // Krokodil 3 in der 2. Pfütze (Teil B)
      {
        x: 1410,
        y: WATER_SURFACE_Y - 2,
        minX: 1335,
        maxX: 1480,
        speed: 28,
        facing: 1,
        snapTimer: 2.1,
        snapPeriod: 3.0,
        snapPhase: 0,
        snapProgress: 0,
        snapEffectTimer: 0
      },
      // Krokodil 4 in der 3. Pfütze (Teil A)
      {
        x: 1820,
        y: WATER_SURFACE_Y - 2,
        minX: 1710,
        maxX: 2060,
        speed: 38,
        facing: 1,
        snapTimer: 1.5,
        snapPeriod: 2.5,
        snapPhase: 0,
        snapProgress: 0,
        snapEffectTimer: 0
      },
      // Krokodil 5 in der 3. Pfütze (Teil B)
      {
        x: 2415,
        y: WATER_SURFACE_Y - 2,
        minX: 2310,
        maxX: 2520,
        speed: 34,
        facing: -1,
        snapTimer: 2.0,
        snapPeriod: 2.7,
        snapPhase: 0,
        snapProgress: 0,
        snapEffectTimer: 0
      }
    ];

    // Sammelbare Tropenfrüchte / Lotusmünzen entlang der Lianen-Flugbahnen
    const coins = [
      { x: 390, y: 220, collected: false },
      { x: 555, y: 215, collected: false },
      { x: 1015, y: 220, collected: false },
      { x: 1425, y: 210, collected: false },
      { x: 1820, y: 215, collected: false },
      { x: 1985, y: 210, collected: false },
      { x: 2415, y: 215, collected: false }
    ];

    // Ausgang: Majestätisches Dschungeltor am Ende von Plattform 6
    const exit = {
      x: 2715,
      y: groundY - 32,
      w: 52,
      h: 64,
      customDraw: true
    };

    const state = {
      attachedVine: null,
      lastSafePlatform: startPlat,
      swingTime: 0,
      vineFlightTimer: 0,
      vineFlightVx: 0,
      vines,
      puddles,
      crocodiles,
      coins
    };

    // ---------------------------------------------------------------------
    // Update-Logik für Physik, Lianen-Schwingen, Krokodil-Schnappen & Wasser
    // ---------------------------------------------------------------------
    function update(g, dt) {
      const p = g.pandi;
      state.swingTime += dt;

      // 1. Lianen schwingen lassen
      for (const v of state.vines) {
        if (v.cooldown > 0) {
          v.cooldown = Math.max(0, v.cooldown - dt);
        }

        // Harmonische Pendelbewegung: angle = maxAngle * sin(time * speed + phase)
        const t = state.swingTime;
        v.angle = v.maxAngle * Math.sin(t * v.speed + v.phase);

        // Position des Griffendes
        v.tipX = v.anchorX + Math.sin(v.angle) * v.length;
        v.tipY = v.anchorY + Math.cos(v.angle) * v.length;

        // Tangentiale Geschwindigkeit am Ende der Liane
        const angularVelocity = v.maxAngle * v.speed * Math.cos(t * v.speed + v.phase);
        v.tangentVx = angularVelocity * v.length * Math.cos(v.angle);
        v.tangentVy = -angularVelocity * v.length * Math.sin(v.angle);
      }

      // 2. Letzte sichere Plattform merken (wenn Pandi fest am Boden steht)
      if (p.onGround) {
        p.isSwinging = false;
        for (const plat of platforms) {
          if (p.x + p.w * 0.5 >= plat.x && p.x + p.w * 0.5 <= plat.x + plat.w) {
            state.lastSafePlatform = plat;
            break;
          }
        }
      }

      // 3. Wenn Pandi an einer Liane hängt
      if (state.attachedVine) {
        const v = state.attachedVine;
        v.isGrabbed = true;
        p.isSwinging = true;

        // Pandi exakt mit dem Griffende mitschwingen lassen
        p.x = Math.round(v.tipX - p.w * 0.5);
        p.y = Math.round(v.tipY - p.h * 0.65);
        p.vx = v.tangentVx;
        p.vy = v.tangentVy;
        p.onGround = false;
        p.onBamboo = false;
        p.facing = v.tangentVx >= 0 ? 1 : -1;

        // Kamera folgt Pandi sanft
        g._updateCamera(dt);

        // Sprung-Taste (Leertaste, W, Up oder Touch-Jump-Button) -> ABSPRUNG!
        const wantsJump = g.input.jumpBuffered > 0 || g.input.up;
        if (wantsJump) {
          // Absprung mit ausbalanciertem Schwung (Mischung aus gutem Timing & Vorwärtstrieb)
          const jumpDir = g.input.left ? -1 : 1;
          let launchVx;
          if (jumpDir > 0) {
            // Vorwärtsschwung: Gutes Schwungtiming belohnt mit mehr Weite!
            const swingBonus = Math.max(0, v.tangentVx) * 0.95;
            launchVx = 175 + swingBonus + (g.input.right ? 35 : 0);
          } else {
            // Nach links / rückwärts
            const backBonus = Math.min(0, v.tangentVx) * 0.95;
            launchVx = -175 + backBonus - (g.input.left ? 35 : 0);
          }

          const launchVy = Math.min(-305, v.tangentVy - 145);

          p.vx = launchVx;
          p.vy = launchVy;
          p.squashY = 1.25;
          p.isSwinging = false;

          v.isGrabbed = false;
          v.cooldown = 0.38; // Verhindert sofortiges Wiederanhaften an derselben Liane
          state.attachedVine = null;
          state.vineFlightTimer = 0.32; // Kurze Flugimpuls-Unterstützung
          state.vineFlightVx = launchVx;
          g.input.jumpBuffered = 0;

          // Sound & Blätter-Partikel beim Absprung
          g.ctx?.sound?.playHit?.();
          g.spawnParticles(v.tipX, v.tipY, "#86efac", 14);
          g.spawnParticles(v.tipX, v.tipY, "#fef08a", 8);
        }
      } else {
        // Vorwärtsschwung kurz nach dem Absprung stützen
        if (state.vineFlightTimer > 0) {
          state.vineFlightTimer -= dt;
          if (!g.input.left && !g.input.right && p.vy < 280) {
            p.vx = state.vineFlightVx;
          }
        }

        // 4. In der Luft: AUTOMATISCHES FESTHALTEN (AUSBALANCIERTER HITBOX-SWEETSPOT)
        // Hält sich automatisch fest, erfordert aber gutes Zielen auf die Liane
        if (!p.onGround) {
          const pandiCx = p.x + p.w * 0.5;
          const pandiCy = p.y + p.h * 0.5;

          for (const v of state.vines) {
            if (v.cooldown > 0) continue;

            // A. Distanz zum unteren Griffende (Tip) – Ausbalanciert auf 54px (alt 36, neu 88)
            const distTip = Math.hypot(pandiCx - v.tipX, pandiCy - v.tipY);

            // B. Distanz zur unteren Hälfte der Liane (Projektion auf das Seil)
            const abx = v.tipX - v.anchorX;
            const aby = v.tipY - v.anchorY;
            const apx = pandiCx - v.anchorX;
            const apy = pandiCy - v.anchorY;
            const lenSq = abx * abx + aby * aby;
            const t = Math.max(0, Math.min(1.15, (apx * abx + apy * aby) / lenSq));
            const projX = v.anchorX + t * abx;
            const projY = v.anchorY + t * aby;
            const distToVine = Math.hypot(pandiCx - projX, pandiCy - projY);

            // Ausbalancierte Hitbox:
            // - Bis zu 54px um das Griffende ODER
            // - Bis zu 46px Abstand zur Liane entlang der unteren Hälfte (t >= 0.50)
            const canGrab = distTip <= 54 || (t >= 0.50 && distToVine <= 46);

            if (canGrab) {
              state.attachedVine = v;
              state.vineFlightTimer = 0;
              v.isGrabbed = true;
              p.isSwinging = true;
              p.onGround = false;
              p.vy = 0;
              p.vx = 0;

              // Sound & Partikel
              g.ctx?.sound?.playScore?.();
              g.spawnParticles(v.tipX, v.tipY, "#4ade80", 12);
              g.addFloatingText(v.tipX - g.camera.x, v.tipY - g.camera.y - 14, "FESTGEHALTEN!", "#86efac");
              break;
            }
          }
        }
      }

      // 5. Krokodile aktualisieren & Schneppen-Zyklus animieren
      for (const croc of state.crocodiles) {
        // Horizontale Schwimmbewegung im Wasser
        croc.x += croc.facing * croc.speed * dt;
        if (croc.x > croc.maxX) {
          croc.x = croc.maxX;
          croc.facing = -1;
        } else if (croc.x < croc.minX) {
          croc.x = croc.minX;
          croc.facing = 1;
        }

        // Schneppen-Timer
        croc.snapTimer -= dt;
        if (croc.snapEffectTimer > 0) {
          croc.snapEffectTimer = Math.max(0, croc.snapEffectTimer - dt);
        }

        // Phasen: 0 = ruhig, 1 = Kiefer öffnet sich, 2 = SCHNAPP! (schnappt zu), 3 = schließt sich
        if (croc.snapTimer <= 0) {
          croc.snapPhase = 1;
          croc.snapTimer = croc.snapPeriod;
        }

        // Fortschritt der Kieferöffnung steuern
        if (croc.snapPhase === 1) {
          croc.snapProgress += dt * 4.2;
          if (croc.snapProgress >= 1) {
            croc.snapProgress = 1;
            croc.snapPhase = 2; // SCHNAPP-MOMENT!
            croc.snapEffectTimer = 0.35;

            // Lustiges Schnapp-Geräusch & Text
            const sounds = ["*SCHNAPP!*", "*SCHNEPP!*", "*HAPS!*", "*KLAPP!*"];
            const txt = sounds[Math.floor(Math.random() * sounds.length)];
            g.addFloatingText(croc.x - g.camera.x, croc.y - g.camera.y - 18, txt, "#fbbf24");
            g.spawnParticles(croc.x + croc.facing * 14, croc.y - 6, "#67e8f9", 8);
          }
        } else if (croc.snapPhase === 2) {
          croc.snapProgress -= dt * 7.5; // Kiefer klappt blitzschnell zu
          if (croc.snapProgress <= 0) {
            croc.snapProgress = 0;
            croc.snapPhase = 0;
          }
        }
      }

      // 6. Sammeln der Tropenfrüchte
      for (const c of state.coins) {
        if (c.collected) continue;
        const dist = Math.hypot(p.x + p.w * 0.5 - c.x, p.y + p.h * 0.5 - c.y);
        if (dist <= 26) {
          c.collected = true;
          g.score += 75;
          g.ctx?.sound?.playScore?.();
          g.spawnParticles(c.x, c.y, "#facc15", 14);
          g.spawnParticles(c.x, c.y, "#4ade80", 10);
          g.addFloatingText(c.x - g.camera.x, c.y - g.camera.y - 12, "+75 🥭", "#fef08a");
        }
      }

      // 7. Wasser-Pfützen-Kollision (falls Pandi ins Wasser stürzt)
      // Krokodile schnappen zwar harmlos, aber das tiefe Sumpfwasser schadet Pandi!
      if (!state.attachedVine && p.y + p.h >= WATER_SURFACE_Y + 12) {
        p.isSwinging = false;
        state.attachedVine = null;

        // Plumps ins Wasser!
        g.spawnParticles(p.x + p.w * 0.5, WATER_SURFACE_Y + 4, "#38bdf8", 24);
        g.spawnParticles(p.x + p.w * 0.5, WATER_SURFACE_Y + 4, "#4ade80", 16);
        g.damagePandi("PLUMPS! INS WASSER!");

        // Sicherer Respawn auf der letzten Plattform
        const safePlat = state.lastSafePlatform || startPlat;
        p.x = Math.round(safePlat.x + safePlat.w * 0.5 - p.w * 0.5);
        p.y = Math.round(safePlat.y - p.h);
        p.vx = 0;
        p.vy = 0;
        p.onGround = true;
        g.invulnTimer = 1.35; // Kurze Unverwundbarkeit nach Respawn

        g.spawnParticles(p.x + p.w * 0.5, p.y + p.h, "#4ade80", 18);
        g.addFloatingText(p.x - g.camera.x, p.y - g.camera.y - 16, "ZURÜCK ZUR PLATTFORM!", "#facc15");
      }
    }

    // ---------------------------------------------------------------------
    // Zeichnung aller Entities im Spielraum
    // ---------------------------------------------------------------------
    function drawEntities(g, ctx) {
      const time = g.animClock || 0;

      // 1. Wasserpfützen
      for (const pud of state.puddles) {
        drawPuddle(ctx, pud, time);
      }

      // 2. Krokodile in den Pfützen
      for (const croc of state.crocodiles) {
        drawCrocodile(ctx, croc, time);
      }

      // 3. Lianen
      for (const v of state.vines) {
        drawVine(ctx, v, time);
      }

      // 4. Tropenfrüchte / Münzen
      drawJungleCoins(ctx, state.coins, time);

      // 5. Zieltor
      if (g.exit) {
        drawJungleExitGate(ctx, g.exit, time);
      }
    }

    return {
      mode: "platform",
      worldW,
      worldH,
      spawn: { x: 100, y: groundY },
      platforms,
      bamboos: [],
      keys: [],
      cage: null,
      cops: [],
      exit,
      keysRequired: 0,
      update,
      drawEntities,
      hudText: (g) => {
        const remaining = state.coins.filter((c) => !c.collected).length;
        return remaining === 0
          ? "🌟 ALLE FRÜCHTE! ➔ DSCHUNGEL-TOR"
          : `🌿 SCHWINGE DICH ZUM TOR! 🐊 (🥭 ${state.coins.length - remaining}/${state.coins.length})`;
      },
      drawBackground: drawLevel6Background
    };
  }

  // -----------------------------------------------------------------------
  // Registrierung bei den Level-Modulen
  // -----------------------------------------------------------------------
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level6 = drawLevel6Background;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-6",
    shortLabel: "Dschungel-Lianen",
    name: "DSCHUNGEL-LIANEN & KROKODILE",
    mode: "platform",
    keysRequired: 0,
    drawBackground: drawLevel6Background,
    build: buildLevel6
  });
})();
