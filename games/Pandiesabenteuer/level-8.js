// Level 8 – "Der Roboter-Panda & der Polizei-Roboter" (Episches Boss-Level)
// -------------------------------------------------------------------------
// Konzept:
// 1. Großes, boss-würdiges Spielfeld (1200 x 750) im Cyber-Arena-Stil mit
//    dynamischer Kameraführung, Laser-Begrenzungen und Energie-Generatoren.
// 2. In der Mitte steht der mächtige ROBOTER-PANDA – anfangs noch im Standby-Modus
//    ohne Energie.
// 3. Oben rechts befindet sich der HAUPT-GENERATOR (Schalter), der von 2 Polizisten
//    bewacht wird, die Pandi jagen. WICHTIG: Pandi ist ein kleines bisschen
//    schneller als die Polizisten (Pandi 190 px/s vs. Polizisten 166 px/s)!
// 4. Sobald Pandi den Schalter umlegt, fließt Energie zum Roboter-Panda und er
//    wird aktiviert. Pandi kann nun in den Roboter-Panda einsteigen und ihn steuern.
// 5. Die beiden Polizisten flüchten erschrocken vor dem Riesen-Panda.
// 6. Sofort bricht der POLIZEI-ROBOTER (Mega-Mech Boss) mit Blaulicht & Sirenen
//    in die Arena ein!
// 7. Der Roboter-Panda kämpft mit einem mächtigen BAMBUSSTAB (Bambus-Schlag per
//    Leertaste, Touch / Klick oder Jump-Taste). Der Polizei-Roboter schlägt mit
//    seinem POLIZEIKNÜPPEL (Elektro-Schock-Baton) zu.
// 8. Beide Mechs besitzen sichtbare Lebensbalken (im oberen Boss-HUD & über dem
//    jeweiligen Mech). Fällt ein Lebensbalken auf 0, wird der jeweilige Roboter
//    spektakulär zerstört!
// -------------------------------------------------------------------------

(() => {
  "use strict";

  const BASE_WORLD_W = 1200;
  const BASE_WORLD_H = 750;

  let cachedBgCanvas = null;
  let cachedW = 0;
  let cachedH = 0;

  // -----------------------------------------------------------------------
  // 1. Hintergrund: Großes Cyber-Kolosseum & Meisterhafte Boss-Arena
  // -----------------------------------------------------------------------
  function buildLevel8Background(worldW, worldH) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    const off = document.createElement("canvas");
    off.width = ww;
    off.height = wh;
    const ctx = off.getContext("2d");

    // 1. Tiefer titan-dunkelblauer Weltraum-/Hangar-Boden
    const baseGrad = ctx.createRadialGradient(ww * 0.5, wh * 0.5, 90, ww * 0.5, wh * 0.5, ww * 0.7);
    baseGrad.addColorStop(0, "#0e1a30");
    baseGrad.addColorStop(0.35, "#091222");
    baseGrad.addColorStop(0.7, "#050a14");
    baseGrad.addColorStop(1, "#020408");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, ww, wh);

    // 2. Titan-Panzerplatten (Industrial Metal Tiles) mit Schatten und 3D-Kanten
    const tileW = 60;
    const tileH = 50;
    const cols = Math.ceil(ww / tileW) + 1;
    const rows = Math.ceil(wh / tileH) + 1;
    const shades = ["#0e192c", "#111f35", "#0d1728", "#14233c"];

    for (let r = 0; r < rows; r++) {
      const rowOffset = (r % 2) * (tileW * 0.5);
      const ty = r * tileH;
      for (let c = -1; c < cols; c++) {
        const tx = c * tileW + rowOffset;
        const hash = Math.abs((r * 47 + c * 31) % shades.length);

        // Kachel-Körper
        ctx.fillStyle = shades[hash];
        ctx.beginPath();
        ctx.roundRect(tx + 2, ty + 2, tileW - 4, tileH - 4, 3);
        ctx.fill();

        // 3D-Lichtkante oben & links
        ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx + 3, ty + tileH - 3);
        ctx.lineTo(tx + 3, ty + 3);
        ctx.lineTo(tx + tileW - 3, ty + 3);
        ctx.stroke();

        // Dunkle Schattenkante unten & rechts
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.moveTo(tx + tileW - 3, ty + 3);
        ctx.lineTo(tx + tileW - 3, ty + tileH - 3);
        ctx.lineTo(tx + 3, ty + tileH - 3);
        ctx.stroke();

        // Nieten / Schraubbolzen an den Ecken
        ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
        ctx.fillRect(tx + 5, ty + 5, 2, 2);
        ctx.fillRect(tx + tileW - 7, ty + 5, 2, 2);
        ctx.fillRect(tx + 5, ty + tileH - 7, 2, 2);
        ctx.fillRect(tx + tileW - 7, ty + tileH - 7, 2, 2);
      }
    }

    // 3. Industrielle Gefahrenzonen & Warnstreifen (Hazard Stripes) entlang der Ränder
    const drawHazardStripe = (x, y, w, h, isVertical = false) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x, y, w, h);

      const stripeW = 14;
      ctx.fillStyle = "rgba(250, 204, 21, 0.75)"; // Warn-Gelb
      if (!isVertical) {
        for (let sx = x - h; sx < x + w + h; sx += stripeW * 2) {
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.lineTo(sx + stripeW, y);
          ctx.lineTo(sx + stripeW - h, y + h);
          ctx.lineTo(sx - h, y + h);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        for (let sy = y - w; sy < y + h + w; sy += stripeW * 2) {
          ctx.beginPath();
          ctx.moveTo(x, sy);
          ctx.lineTo(x + w, sy + w);
          ctx.lineTo(x + w, sy + w + stripeW);
          ctx.lineTo(x, sy + stripeW);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Schutzlack-Kanten
      ctx.strokeStyle = "rgba(250, 204, 21, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    };

    // 4 Rand-Warnstreifen (innen an den Begrenzungswänden)
    drawHazardStripe(32, 28, ww - 64, 14, false); // Oben
    drawHazardStripe(32, wh - 42, ww - 64, 14, false); // Unten
    drawHazardStripe(28, 32, 14, wh - 64, true); // Links
    drawHazardStripe(ww - 42, 32, 14, wh - 64, true); // Rechts

    // 4. Eingelassene Belüftungs- & Kühlgitter (Ventilation Grates)
    const drawCoolingGrate = (gx, gy, gw, gh, glowColor) => {
      ctx.save();
      // Vertiefung
      ctx.fillStyle = "#030712";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(gx, gy, gw, gh, 4);
      ctx.fill();
      ctx.stroke();

      // Glühender Reaktor-Dunst unter dem Gitter
      const grateGrad = ctx.createLinearGradient(gx, gy, gx, gy + gh);
      grateGrad.addColorStop(0, "rgba(0,0,0,0)");
      grateGrad.addColorStop(0.5, glowColor);
      grateGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grateGrad;
      ctx.fillRect(gx + 2, gy + 2, gw - 4, gh - 4);

      // Schutzstäbe des Gitters
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2.5;
      for (let lx = gx + 7; lx < gx + gw - 4; lx += 8) {
        ctx.beginPath();
        ctx.moveTo(lx, gy + 2);
        ctx.lineTo(lx, gy + gh - 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    drawCoolingGrate(220, 90, 84, 26, "rgba(56, 189, 248, 0.28)");
    drawCoolingGrate(ww - 304, 90, 84, 26, "rgba(250, 204, 21, 0.28)");
    drawCoolingGrate(220, wh - 116, 84, 26, "rgba(16, 185, 129, 0.28)");
    drawCoolingGrate(ww - 304, wh - 116, 84, 26, "rgba(56, 189, 248, 0.28)");

    // 5. Massive doppelte Starkstrom-Kabeltrasse (vom Generator zur Mitte)
    const cx = ww * 0.5;
    const cy = wh * 0.5;

    ctx.save();
    // Kabelbett / Führungskanal im Boden
    ctx.strokeStyle = "#080e1a";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(1040, 130);
    ctx.lineTo(1040, 375);
    ctx.lineTo(cx + 85, cy);
    ctx.stroke();

    // Schweres schwarzes Starkstromkabel
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(1040, 130);
    ctx.lineTo(1040, 375);
    ctx.lineTo(cx + 85, cy);
    ctx.stroke();

    // Glänzende Kupfer- & Neon-Leitbahnen
    ctx.strokeStyle = "rgba(250, 204, 21, 0.55)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(1040, 130);
    ctx.lineTo(1040, 375);
    ctx.lineTo(cx + 85, cy);
    ctx.stroke();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(1040, 130);
    ctx.lineTo(1040, 375);
    ctx.lineTo(cx + 85, cy);
    ctx.stroke();

    // Kabel-Klammern (Haltebrücken)
    const cablePoints = [
      { x: 1040, y: 190 },
      { x: 1040, y: 260 },
      { x: 1040, y: 330 },
      { x: 940, y: 375 },
      { x: 840, y: 375 },
      { x: 740, y: 375 }
    ];
    for (const cp of cablePoints) {
      ctx.fillStyle = "#475569";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(cp.x - 7, cp.y - 7, 14, 14, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 6. DER MEISTERHAFTE KAMPFRING & CYBER-PANDA WAPPEN IM ZENTRUM
    ctx.save();
    // A. Äußerer Tech-Zahnkranz (Radius 225)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 225, 0, Math.PI * 2);
    ctx.stroke();

    // Radialmarkierungen & Skalenstriche am Außenring
    for (let i = 0; i < 36; i++) {
      const ang = (Math.PI * 2 * i) / 36;
      const isMajor = i % 3 === 0;
      const rIn = isMajor ? 212 : 218;
      const rOut = 225;
      ctx.strokeStyle = isMajor ? "rgba(16, 185, 129, 0.55)" : "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = isMajor ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * rIn, cy + Math.sin(ang) * rIn);
      ctx.lineTo(cx + Math.cos(ang) * rOut, cy + Math.sin(ang) * rOut);
      ctx.stroke();
    }

    // B. Smaragdgrüner Haupt-Kampfring (Radius 165)
    ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 165, 0, Math.PI * 2);
    ctx.stroke();

    // Goldene Zentrums-Leitungen (8 Haupt-Vektoren)
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8;
      ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 95, cy + Math.sin(ang) * 95);
      ctx.lineTo(cx + Math.cos(ang) * 165, cy + Math.sin(ang) * 165);
      ctx.stroke();

      // Leuchtende Knotenpunkte
      ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * 165, cy + Math.sin(ang) * 165, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // C. Octagonale Mech-Ladeplattform (Radius 90)
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8;
      const px = cx + Math.cos(ang) * 90;
      const py = cy + Math.sin(ang) * 90;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(250, 204, 21, 0.6)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // D. In den Boden eingelassenes stilisiertes CYBER-PANDA WAPPEN
    ctx.translate(cx, cy);

    // Panda-Wappen Hintergrund-Glow
    const crestGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 75);
    crestGlow.addColorStop(0, "rgba(16, 185, 129, 0.22)");
    crestGlow.addColorStop(0.5, "rgba(56, 189, 248, 0.12)");
    crestGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = crestGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.fill();

    // Panda-Ohren (Boden-Gravur)
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-34, -28, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(34, -28, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Panda-Kopf (Geometrische Cyber-Platte)
    ctx.fillStyle = "rgba(248, 250, 252, 0.15)";
    ctx.strokeStyle = "rgba(250, 204, 21, 0.65)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-42, -32, 84, 64, 16);
    ctx.fill();
    ctx.stroke();

    // Schwarze Augenflecken
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(-18, -4, 11, 15, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(18, -4, 11, 15, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Leuchtende Cyber-Augen
    ctx.fillStyle = "#34d399";
    ctx.fillRect(-22, -6, 9, 4);
    ctx.fillRect(13, -6, 9, 4);

    // Dreiecks-Nase
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-7, 3);
    ctx.lineTo(7, 3);
    ctx.closePath();
    ctx.fill();

    // Zentrales Zen-Symbol / Reaktor-Symbol
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 20, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(0, 20, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 7. Stadion-Architektur im oberen Hangar-Bereich (Stahlträger & Zuschauerränge)
    ctx.save();
    // Erhöhte VIP-Tribüne oben
    ctx.fillStyle = "rgba(7, 13, 24, 0.95)";
    ctx.fillRect(40, 2, ww - 80, 24);

    // Neon-Glasgeländer der Tribüne
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 25);
    ctx.lineTo(ww - 40, 25);
    ctx.stroke();

    // Zuschauerschatten-Silhouetten in den Rängen
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    for (let hx = 60; hx < ww - 60; hx += 16) {
      ctx.beginPath();
      ctx.arc(hx, 14, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(hx - 5, 18, 10, 7);
    }

    // Stahlfachwerk-Dachstreben (Gitterträger)
    ctx.strokeStyle = "rgba(30, 41, 59, 0.7)";
    ctx.lineWidth = 2.2;
    for (let tx = 80; tx < ww - 80; tx += 90) {
      ctx.beginPath();
      ctx.moveTo(tx, 0);
      ctx.lineTo(tx + 45, 26);
      ctx.lineTo(tx + 90, 0);
      ctx.stroke();
    }
    ctx.restore();

    cachedBgCanvas = off;
    cachedW = ww;
    cachedH = wh;
    return off;
  }

  function drawLevel8Background(ctx, { viewW = 720, viewH = 405, worldW = BASE_WORLD_W, worldH = BASE_WORLD_H, camera, time = 0 }) {
    const ww = Math.max(1, Math.round(worldW));
    const wh = Math.max(1, Math.round(worldH));
    if (!cachedBgCanvas || cachedW !== ww || cachedH !== wh) {
      buildLevel8Background(ww, wh);
    }
    if (!cachedBgCanvas) return;

    const camX = camera?.x || 0;
    const camY = camera?.y || 0;
    const sx = Math.max(0, Math.min(cachedBgCanvas.width - 1, camX));
    const sy = Math.max(0, Math.min(cachedBgCanvas.height - 1, camY));
    const sw = Math.min(cachedBgCanvas.width - sx, viewW);
    const sh = Math.min(cachedBgCanvas.height - sy, viewH);

    // 1. Basis-Hintergrund aus dem High-Res Cache zeichnen
    if (sw > 0 && sh > 0) {
      ctx.drawImage(cachedBgCanvas, sx, sy, sw, sh, sx - camX, sy - camY, sw, sh);
    }

    // ---------------------------------------------------------------------
    // 2. DYNAMISCHE LIVE-EFFEKTE (Scheinwerfer, Lauflicht, Holo-Displays)
    // ---------------------------------------------------------------------
    ctx.save();
    ctx.translate(-camX, -camY);

    // A. Pulsierende Energie-Lauflichter entlang der Hauptleitungen
    const pulseOffset = (-time * 110) % 30;
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3.5;
    ctx.setLineDash([8, 14]);
    ctx.lineDashOffset = pulseOffset;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(1040, 130);
    ctx.lineTo(1040, 375);
    ctx.lineTo(ww * 0.5 + 85, wh * 0.5);
    ctx.stroke();

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.lineDashOffset = pulseOffset * 1.5;
    ctx.stroke();
    ctx.restore();

    // B. Pulsierender Reaktor-Glow im Zentrum der Arena
    const corePulse = 0.85 + Math.sin(time * 4) * 0.18;
    const coreGlow = ctx.createRadialGradient(ww * 0.5, wh * 0.5, 5, ww * 0.5, wh * 0.5, 95 * corePulse);
    coreGlow.addColorStop(0, "rgba(52, 211, 153, 0.35)");
    coreGlow.addColorStop(0.4, "rgba(56, 189, 248, 0.18)");
    coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(ww * 0.5, wh * 0.5, 95 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    // C. 4 Majestätische Arena-Suchscheinwerfer (Volumetric Spotlights)
    const spotlights = [
      { x: 120, y: 110, baseAngle: 0.85, speed: 0.6, amp: 0.65, color: "rgba(56, 189, 248, " },
      { x: ww - 152, y: 110, baseAngle: 2.28, speed: 0.55, amp: 0.65, color: "rgba(250, 204, 21, " },
      { x: 120, y: wh - 142, baseAngle: -0.85, speed: 0.65, amp: 0.65, color: "rgba(16, 185, 129, " },
      { x: ww - 152, y: wh - 142, baseAngle: -2.28, speed: 0.58, amp: 0.65, color: "rgba(56, 189, 248, " }
    ];

    for (let i = 0; i < spotlights.length; i++) {
      const sp = spotlights[i];
      const ang = sp.baseAngle + Math.sin(time * sp.speed + i * 1.6) * sp.amp;
      const beamLen = 320;
      const beamSpread = 0.26;

      ctx.save();
      // Lichtkegel
      const p1x = sp.x + Math.cos(ang - beamSpread) * beamLen;
      const p1y = sp.y + Math.sin(ang - beamSpread) * beamLen;
      const p2x = sp.x + Math.cos(ang + beamSpread) * beamLen;
      const p2y = sp.y + Math.sin(ang + beamSpread) * beamLen;

      const beamGrad = ctx.createRadialGradient(sp.x, sp.y, 10, (p1x + p2x) * 0.5, (p1y + p2y) * 0.5, beamLen);
      beamGrad.addColorStop(0, sp.color + "0.35)");
      beamGrad.addColorStop(0.5, sp.color + "0.12)");
      beamGrad.addColorStop(1, sp.color + "0.0)");

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fill();

      // Heller Leuchtfleck am Boden am Ende des Lichtkegels
      const targetX = sp.x + Math.cos(ang) * (beamLen * 0.75);
      const targetY = sp.y + Math.sin(ang) * (beamLen * 0.75);
      const spotGrad = ctx.createRadialGradient(targetX, targetY, 4, targetX, targetY, 48);
      spotGrad.addColorStop(0, sp.color + "0.28)");
      spotGrad.addColorStop(1, sp.color + "0.0)");
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.ellipse(targetX, targetY, 48, 26, ang, 0, Math.PI * 2);
      ctx.fill();

      // Scheinwerfer-Linse auf der Säule
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // D. Schwebendes Hologramm-Display an der oberen Wand
    ctx.save();
    const holoY = 46 + Math.sin(time * 2.5) * 2.5;
    ctx.fillStyle = "rgba(8, 14, 26, 0.75)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(ww * 0.5 - 160, holoY - 14, 320, 28, 6);
    ctx.fill();
    ctx.stroke();

    // Scanlines im Hologramm
    ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
    ctx.lineWidth = 1;
    for (let sy = holoY - 11; sy < holoY + 13; sy += 3.5) {
      ctx.beginPath();
      ctx.moveTo(ww * 0.5 - 156, sy);
      ctx.lineTo(ww * 0.5 + 156, sy);
      ctx.stroke();
    }

    ctx.font = "bold 11px Orbitron, sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.textAlign = "center";
    ctx.fillText("★ CYBER MECH ARENA • FINAL BATTLE ★", ww * 0.5, holoY + 4);
    ctx.shadowBlur = 0;
    ctx.restore();

    // E. Stadion-Kamerablitze (Zufällige Flashlights in den Rängen)
    const flashSeed = Math.floor(time * 7);
    if (flashSeed % 3 === 0) {
      const flashX = 100 + ((flashSeed * 173) % (ww - 200));
      const flashY = 12 + ((flashSeed * 37) % 10);
      ctx.save();
      const flGrad = ctx.createRadialGradient(flashX, flashY, 1, flashX, flashY, 22);
      flGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      flGrad.addColorStop(0.3, "rgba(56, 189, 248, 0.6)");
      flGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = flGrad;
      ctx.beginPath();
      ctx.arc(flashX, flashY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 2. Zeichnung: Generator & Schalter
  // -----------------------------------------------------------------------
  function drawSwitchTerminal(ctx, sw, animClock) {
    const x = sw.x;
    const y = sw.y;
    const isOn = sw.isOn;

    ctx.save();
    ctx.translate(x, y);

    // Boden-Plattform des Generators
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.beginPath();
    ctx.roundRect(-30, -25, 60, 50, 8);
    ctx.fill();

    // Generator-Hauptgehäuse
    const boxGrad = ctx.createLinearGradient(-24, -20, 24, 20);
    boxGrad.addColorStop(0, "#334155");
    boxGrad.addColorStop(0.5, "#1e293b");
    boxGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = boxGrad;
    ctx.strokeStyle = isOn ? "#10b981" : "#f59e0b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-24, -20, 48, 40, 6);
    ctx.fill();
    ctx.stroke();

    // Kühler-Rippen / Akkus
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-18, -14, 8, 28);
    ctx.fillRect(10, -14, 8, 28);

    // Pulsierende Energielicht-Spulen
    const glow = 0.5 + Math.sin(animClock * 8) * 0.5;
    ctx.fillStyle = isOn ? `rgba(16, 185, 129, ${0.4 + glow * 0.6})` : `rgba(245, 158, 11, ${0.4 + glow * 0.6})`;
    ctx.fillRect(-16, -12, 4, 24);
    ctx.fillRect(12, -12, 4, 24);

    // Der Hebel / Schalter (in der Mitte)
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hebelarm
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    if (isOn) {
      // Hebel nach unten gekippt (GRÜN)
      ctx.lineTo(0, 14);
      ctx.stroke();
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(0, 14, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Hebel nach oben gekippt (ROT/GELB)
      ctx.lineTo(0, -14);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, -14, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blitz-Symbol über dem Terminal
    ctx.fillStyle = isOn ? "#34d399" : "#fbbf24";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚡", 0, -28);

    // Status-Text
    ctx.font = "bold 9px Orbitron, sans-serif";
    ctx.fillStyle = isOn ? "#6ee7b7" : "#fcd34d";
    ctx.fillText(isOn ? "ONLINE" : "OFFLINE", 0, 32);

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 3. Zeichnung: Großer Roboter-Panda (Standby & Aktiv / Kampf)
  // -----------------------------------------------------------------------
  function drawRobotPanda(ctx, pandaMech, animClock, inMech, facing = 1, isAttacking = false, slashTimer = 0) {
    const x = pandaMech.x;
    const y = pandaMech.y;
    const isStandby = !pandaMech.isActivated;

    ctx.save();
    ctx.translate(x, y);

    // 1. Schatten
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.beginPath();
    ctx.ellipse(0, 28, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Geh-Phase bei Bewegung
    const isMoving = pandaMech.vx !== 0 || pandaMech.vy !== 0;
    const walkPhase = isMoving ? animClock * 9 : 0;
    const leftFootY = Math.sin(walkPhase) * 4;
    const rightFootY = Math.sin(walkPhase + Math.PI) * 4;

    // 2. Roboter-Füße & Beine
    const drawLeg = (offsetX, footY) => {
      ctx.save();
      // Oberschenkel / Gelenk
      ctx.fillStyle = isStandby ? "#1e293b" : "#334155";
      ctx.fillRect(offsetX - 6, 6, 12, 16);

      // Große Mech-Panda-Tatzen
      const footGrad = ctx.createLinearGradient(offsetX - 10, 20 + footY, offsetX + 10, 30 + footY);
      footGrad.addColorStop(0, "#1e293b");
      footGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = footGrad;
      ctx.strokeStyle = isStandby ? "#0f172a" : "#10b981";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(offsetX - 10, 20 + footY, 20, 12, [4, 4, 3, 3]);
      ctx.fill();
      ctx.stroke();

      // Krallen
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(offsetX - 8, 30 + footY, 3, 3);
      ctx.fillRect(offsetX - 1, 30 + footY, 3, 3);
      ctx.fillRect(offsetX + 5, 30 + footY, 3, 3);
      ctx.restore();
    };

    drawLeg(-16, leftFootY);
    drawLeg(16, rightFootY);

    // 3. Massiver Panda-Mech-Körper (Weiß-silberner Torso mit schwarzem Rückenpanzer)
    ctx.save();
    // Schwarze Schulter- und Rückenpanzerung
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = isStandby ? "#1e293b" : "#059669";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-28, -24, 56, 36, 12);
    ctx.fill();
    ctx.stroke();

    // Weißer Panzer-Bauch
    const chestGrad = ctx.createLinearGradient(0, -18, 0, 10);
    chestGrad.addColorStop(0, "#f8fafc");
    chestGrad.addColorStop(1, "#cbd5e1");
    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.roundRect(-20, -16, 40, 26, 8);
    ctx.fill();

    // Energie-Reaktorkern auf der Brust (Pulsierendes Bambus-Grün bei Aktivierung)
    const corePulse = isStandby ? 0.3 : 0.75 + Math.sin(animClock * 8) * 0.25;
    const coreGrad = ctx.createRadialGradient(0, -2, 2, 0, -2, 10);
    if (isStandby) {
      coreGrad.addColorStop(0, "#64748b");
      coreGrad.addColorStop(1, "#1e293b");
    } else {
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.3, "#34d399");
      coreGrad.addColorStop(0.8, "#059669");
      coreGrad.addColorStop(1, "rgba(5, 150, 105, 0)");
    }
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, -2, 10 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Panda-Mech-Kopf & Cockpit
    ctx.save();
    ctx.translate(0, -30);

    // Große Roboter-Panda-Ohren
    const earGrad = ctx.createLinearGradient(0, -16, 0, -4);
    earGrad.addColorStop(0, "#0f172a");
    earGrad.addColorStop(1, "#1e293b");
    ctx.fillStyle = earGrad;

    // Linkes Ohr
    ctx.beginPath();
    ctx.arc(-18, -12, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isStandby ? "#0f172a" : "#10b981";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rechtes Ohr
    ctx.beginPath();
    ctx.arc(18, -12, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hauptkopf
    const headGrad = ctx.createLinearGradient(-22, -18, 22, 14);
    headGrad.addColorStop(0, "#f8fafc");
    headGrad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-22, -16, 44, 28, 10);
    ctx.fill();
    ctx.stroke();

    // Schwarze Panda-Augenflecken (Gepanzerte Optik-Umrandung)
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(-10, -2, 6, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, -2, 6, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Leuchtendes Visier / Mech-Augen
    if (isStandby) {
      // Schlafende / inaktive Augen (dunkles Blau)
      ctx.fillStyle = "#334155";
      ctx.fillRect(-12, -3, 5, 2);
      ctx.fillRect(7, -3, 5, 2);
    } else {
      // Hell leuchtendes Cyber-Visor (Smaragdgrün)
      ctx.fillStyle = "#34d399";
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(-13, -4, 7, 5, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(6, -4, 7, 5, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Panda-Nase
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.closePath();
    ctx.fill();

    // Cockpit-Kanzel (Glaskuppel oben): Wenn Pandi drin ist, sieht man Pandi am Steuer!
    if (inMech) {
      ctx.save();
      // Transparente Glaskanzel
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-12, -26, 24, 13, [8, 8, 2, 2]);
      ctx.fill();
      ctx.stroke();

      // Pandi winkt/steuert im Cockpit
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -19, 5, 0, Math.PI * 2);
      ctx.fill();
      // Pandi-Öhrchen
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(-4, -23, 2, 0, Math.PI * 2);
      ctx.arc(4, -23, 2, 0, Math.PI * 2);
      ctx.fill();
      // Pandi-Augen
      ctx.fillRect(-2.5, -20, 1.5, 1.5);
      ctx.fillRect(1, -20, 1.5, 1.5);
      ctx.restore();
    }
    ctx.restore();

    // 5. Bambusstab & Arme (mit Hieb-Animation!)
    ctx.save();
    const armX = facing >= 0 ? 24 : -24;
    const armY = -12;

    // Schultergelenk
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(armX, armY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Schlag-Winkel
    let staffAngle = 0;
    if (isAttacking) {
      // Schneller wuchtiger Schwung von oben nach unten
      const progress = Math.max(0, Math.min(1, 1 - slashTimer / 0.35));
      staffAngle = (facing >= 0 ? -1.2 + progress * 2.6 : 1.2 - progress * 2.6);
    } else {
      // Im Standby oder Laufen: Stab aufrecht in Kampfhaltung gehalten
      staffAngle = facing >= 0 ? -0.3 + Math.sin(animClock * 3) * 0.1 : 0.3 - Math.sin(animClock * 3) * 0.1;
    }

    ctx.translate(armX, armY);
    ctx.rotate(staffAngle);

    // Der mächtige BAMBUSSTAB
    const staffLen = 68;
    const staffW = 7;

    // Bambus-Stange (Mehrere Segmente mit Bambusringen)
    const staffGrad = ctx.createLinearGradient(0, -staffLen * 0.5, 0, staffLen * 0.5);
    staffGrad.addColorStop(0, "#22c55e");
    staffGrad.addColorStop(0.5, "#15803d");
    staffGrad.addColorStop(1, "#166534");

    ctx.fillStyle = staffGrad;
    ctx.strokeStyle = "#14532d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-staffW * 0.5, -staffLen * 0.5, staffW, staffLen, 3);
    ctx.fill();
    ctx.stroke();

    // Bambus-Ringe / Knoten mit Gold & Cyber-Leuchten
    const numNodes = 4;
    for (let i = 0; i <= numNodes; i++) {
      const ny = -staffLen * 0.5 + (staffLen / numNodes) * i;
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-staffW * 0.5 - 1.5, ny - 1.5, staffW + 3, 3);

      if (!isStandby) {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(-staffW * 0.5 - 0.5, ny - 0.5, staffW + 1, 1);
      }
    }

    // Leuchtende Energiespitze am Bambusstab
    if (!isStandby) {
      ctx.fillStyle = "#86efac";
      ctx.beginPath();
      ctx.moveTo(-staffW * 0.5, -staffLen * 0.5);
      ctx.lineTo(0, -staffLen * 0.5 - 8);
      ctx.lineTo(staffW * 0.5, -staffLen * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Grüner Schweif-Effekt während des Schlags
    if (isAttacking) {
      ctx.save();
      ctx.strokeStyle = "rgba(74, 222, 128, 0.65)";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, staffLen * 0.5, -0.6, 0.6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 4. Zeichnung: Polizei-Roboter (Boss-Gegner mit Polizeiknüppel)
  // -----------------------------------------------------------------------
  function drawPoliceRobotBoss(ctx, boss, animClock) {
    if (!boss || boss.hp <= 0 && boss.deathTimer > 2.5) return;

    const x = boss.x;
    const y = boss.y;
    const facing = boss.facing || -1;
    const isAttacking = boss.isAttacking;
    const attackTimer = boss.attackTimer || 0;
    const isTelegraphing = boss.isTelegraphing;

    ctx.save();
    ctx.translate(x, y);

    // Flackern bei Treffer
    if (boss.hitFlashTimer > 0 && Math.floor(animClock * 24) % 2 === 0) {
      ctx.filter = "brightness(2) contrast(1.5)";
    }

    // Bei Zerstörung: Schütteln & Rauchen
    if (boss.isDying) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }

    // 1. Weicher Mech-Schatten
    ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
    ctx.beginPath();
    ctx.ellipse(0, 32, 38, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Geh-Phase
    const walkPhase = boss.vx !== 0 || boss.vy !== 0 ? animClock * 7 : 0;
    const leftFootY = Math.sin(walkPhase) * 5;
    const rightFootY = Math.sin(walkPhase + Math.PI) * 5;

    // 2. Schwere hydraulische Beine
    const drawBossLeg = (offsetX, footY) => {
      ctx.save();
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(offsetX - 7, 8, 14, 18);

      // Stahl-Panzerfuß mit blauem Trittlicht
      const footGrad = ctx.createLinearGradient(offsetX - 12, 22 + footY, offsetX + 12, 34 + footY);
      footGrad.addColorStop(0, "#334155");
      footGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = footGrad;
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(offsetX - 12, 24 + footY, 24, 13, [4, 4, 2, 2]);
      ctx.fill();
      ctx.stroke();

      // Blinker am Fuß
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(offsetX - 8, 33 + footY, 16, 2.5);
      ctx.restore();
    };

    drawBossLeg(-18, leftFootY);
    drawBossLeg(18, rightFootY);

    // 3. Massiver SWAT-Körper (Polizeiblau & Panzerstahl)
    ctx.save();
    const torsoGrad = ctx.createLinearGradient(-32, -26, 32, 26);
    torsoGrad.addColorStop(0, "#1e3a8a");
    torsoGrad.addColorStop(0.4, "#1e293b");
    torsoGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = torsoGrad;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(-32, -26, 64, 42, 10);
    ctx.fill();
    ctx.stroke();

    // POLIZEI / POLICE Abzeichen auf der Brust
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(8, -8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "bold 8px Rajdhani, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("POLIZEI", 0, 10);
    ctx.restore();

    // 4. Blaulicht & Rotes Sirenen-Licht auf den Schultern (Blinken abwechselnd!)
    const flashPhase = Math.floor(animClock * 10) % 2 === 0;

    // Linke Schulter: BLAULICHT
    ctx.save();
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-34, -34, 14, 8);
    ctx.fillStyle = flashPhase ? "#38bdf8" : "#0284c7";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = flashPhase ? 16 : 4;
    ctx.beginPath();
    ctx.roundRect(-33, -33, 12, 6, 2);
    ctx.fill();
    ctx.restore();

    // Rechte Schulter: ROTLICHT
    ctx.save();
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(20, -34, 14, 8);
    ctx.fillStyle = !flashPhase ? "#ef4444" : "#991b1b";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = !flashPhase ? 16 : 4;
    ctx.beginPath();
    ctx.roundRect(21, -33, 12, 6, 2);
    ctx.fill();
    ctx.restore();

    // 5. Kopfhelm & Zyklopen-Sensor
    ctx.save();
    ctx.translate(0, -34);

    const headGrad = ctx.createLinearGradient(-18, -14, 18, 14);
    headGrad.addColorStop(0, "#1e3a8a");
    headGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-18, -14, 36, 24, 6);
    ctx.fill();
    ctx.stroke();

    // Weißes Visier / Sensor
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-12, -4, 24, 8);

    // Rotes Sucher-Auge / Scanner (bewegt sich hin und her)
    const eyeScanX = Math.sin(animClock * 5) * 7;
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(eyeScanX, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. POLIZEIKNÜPPEL & Schlagarm
    ctx.save();
    const batonArmX = facing >= 0 ? 28 : -28;
    const batonArmY = -12;

    ctx.translate(batonArmX, batonArmY);

    // Schlag-Winkel
    let batonAngle = 0;
    if (isTelegraphing) {
      // Knüppel wird drohend nach oben gezogen / aufgeladen
      batonAngle = facing >= 0 ? -1.4 : 1.4;
    } else if (isAttacking) {
      // Wuchtiger Schlag nach unten
      const progress = Math.max(0, Math.min(1, 1 - attackTimer / 0.4));
      batonAngle = facing >= 0 ? -1.4 + progress * 2.8 : 1.4 - progress * 2.8;
    } else {
      // Normale Tragestellung
      batonAngle = facing >= 0 ? 0.3 + Math.sin(animClock * 3) * 0.1 : -0.3 - Math.sin(animClock * 3) * 0.1;
    }

    ctx.rotate(batonAngle);

    // Der schwere POLIZEIKNÜPPEL (Elektro-Schock-Baton)
    const batonLen = 64;
    const batonW = 8;

    // Griff
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-3, -10, 6, 14);

    // Knüppel-Körper (Schwarz-Gelbe Gefahrenstreifen)
    const batonGrad = ctx.createLinearGradient(0, -batonLen, 0, -10);
    batonGrad.addColorStop(0, "#1e293b");
    batonGrad.addColorStop(0.5, "#334155");
    batonGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = batonGrad;
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-batonW * 0.5, -batonLen, batonW, batonLen - 10, 4);
    ctx.fill();
    ctx.stroke();

    // Gefahrenstreifen auf dem Knüppel
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-batonW * 0.5, -batonLen + 10, batonW, 6);
    ctx.fillRect(-batonW * 0.5, -batonLen + 24, batonW, 6);
    ctx.fillRect(-batonW * 0.5, -batonLen + 38, batonW, 6);

    // Knisternde Elektro-Funken / Schockspitze
    if (isTelegraphing || isAttacking) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-batonW * 0.5 - 4, -batonLen - 4);
      ctx.lineTo(batonW * 0.5 + 4, -batonLen);
      ctx.lineTo(-2, -batonLen + 12);
      ctx.stroke();

      ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
      ctx.beginPath();
      ctx.moveTo(batonW * 0.5 + 4, -batonLen - 6);
      ctx.lineTo(-4, -batonLen - 1);
      ctx.lineTo(2, -batonLen + 10);
      ctx.stroke();
    }

    // Schlag-Spur
    if (isAttacking) {
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, batonLen * 0.8, -0.7, 0.7);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 5. HUD-Lebensbalken (Boss-Healthbars)
  // -----------------------------------------------------------------------
  function drawBossHudHealthBars(ctx, viewW, viewH, pandaMech, bossMech) {
    if (!pandaMech.inMech && !bossMech.isSpawned) return;

    ctx.save();

    // Top-Center Banner Hintergrund
    const barW = Math.min(220, viewW * 0.28);
    const barH = 14;
    const topY = 14;

    // 1. Roboter-Panda Lebensbalken (Links oben)
    const pandaRatio = Math.max(0, Math.min(1, pandaMech.hp / pandaMech.maxHp));
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(14, topY, barW, barH, 4);
    ctx.fill();
    ctx.stroke();

    // Grüner Füllbalken
    const pandaGrad = ctx.createLinearGradient(14, topY, 14 + barW * pandaRatio, topY);
    pandaGrad.addColorStop(0, "#10b981");
    pandaGrad.addColorStop(1, "#34d399");
    ctx.fillStyle = pandaGrad;
    ctx.beginPath();
    ctx.roundRect(15, topY + 1, (barW - 2) * pandaRatio, barH - 2, 3);
    ctx.fill();

    // Beschriftung
    ctx.font = "bold 10px Orbitron, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(`🐼 MECH-PANDA: ${Math.round(pandaMech.hp)} HP`, 16, topY - 3);

    // 2. Polizei-Roboter Lebensbalken (Rechts oben)
    if (bossMech.isSpawned) {
      const bossRatio = Math.max(0, Math.min(1, bossMech.hp / bossMech.maxHp));
      const rightX = viewW - 14 - barW;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(rightX, topY, barW, barH, 4);
      ctx.fill();
      ctx.stroke();

      // Roter Boss-Füllbalken
      const bossGrad = ctx.createLinearGradient(rightX, topY, rightX + barW * bossRatio, topY);
      bossGrad.addColorStop(0, "#ef4444");
      bossGrad.addColorStop(1, "#f97316");
      ctx.fillStyle = bossGrad;
      ctx.beginPath();
      ctx.roundRect(rightX + 1, topY + 1, (barW - 2) * bossRatio, barH - 2, 3);
      ctx.fill();

      // Beschriftung
      ctx.font = "bold 10px Orbitron, sans-serif";
      ctx.fillStyle = "#fca5a5";
      ctx.textAlign = "right";
      ctx.fillText(`🚨 BOSS POLIZEI-MECH: ${Math.round(bossMech.hp)} HP`, viewW - 16, topY - 3);
    }

    // 3. Steuerungs-Hinweis für Mobile & Desktop
    if (pandaMech.inMech && !bossMech.isDying) {
      ctx.font = "bold 10px Orbitron, sans-serif";
      ctx.fillStyle = "#fef08a";
      ctx.textAlign = "center";
      ctx.fillText("🎋 [SPACE] / [SPRINGEN] / [TOUCH] = BAMBUS-SCHLAG!", viewW * 0.5, topY + 11);
    }

    ctx.restore();
  }

  // -----------------------------------------------------------------------
  // 6. Hauptfunktion: Level 8 Aufbau
  // -----------------------------------------------------------------------
  function buildLevel8(virtualW, virtualH, gameInstance) {
    const worldW = BASE_WORLD_W;
    const worldH = BASE_WORLD_H;

    // Start-Position von Pandi: Links mittig in der Arena
    const spawn = { x: 160, y: Math.round(worldH * 0.5) };

    // Begrenzungswände der Arena (Außenwände + 4 Ecksäulen)
    const walls = [
      // Äußere Wände
      { x: 0, y: 0, w: worldW, h: 28 }, // Oben
      { x: 0, y: worldH - 28, w: worldW, h: 28 }, // Unten
      { x: 0, y: 0, w: 28, h: worldH }, // Links
      { x: worldW - 28, y: 0, w: 28, h: worldH }, // Rechts

      // 4 Ecksäulen / Reaktor-Pfeiler
      { x: 120, y: 110, w: 32, h: 32 },
      { x: 120, y: worldH - 142, w: 32, h: 32 },
      { x: worldW - 152, y: 110, w: 32, h: 32 },
      { x: worldW - 152, y: worldH - 142, w: 32, h: 32 }
    ];

    // Schalter-Terminal oben rechts
    const switchTerminal = {
      x: 1040,
      y: 130,
      w: 48,
      h: 40,
      isOn: false
    };

    // Roboter-Panda in der Mitte (noch inaktiv)
    const pandaMech = {
      x: Math.round(worldW * 0.5),
      y: Math.round(worldH * 0.5),
      w: 48,
      h: 56,
      vx: 0,
      vy: 0,
      facing: 1,
      isActivated: false,
      inMech: false,
      hp: 100,
      maxHp: 100,
      isAttacking: false,
      slashTimer: 0,
      slashCooldown: 0
    };

    // 2 Polizisten, die den Schalter bewachen und Pandi jagen
    // Wichtig: Pandi läuft mit 190 px/s -> Polizisten jagen mit 166 px/s (Pandi ist schneller!)
    const cops = [
      {
        x: 960,
        y: 150,
        w: 24,
        h: 30,
        speed: 90,
        patrolSpeed: 90,
        chaseSpeed: 166, // Ein kleines bisschen langsamer als Pandi (190)
        isChasing: true,
        dir: { x: -1, y: 0 },
        isFleeing: false
      },
      {
        x: 1040,
        y: 230,
        w: 24,
        h: 30,
        speed: 92,
        patrolSpeed: 92,
        chaseSpeed: 168, // Ein kleines bisschen langsamer als Pandi (190)
        isChasing: true,
        dir: { x: 0, y: 1 },
        isFleeing: false
      }
    ];

    // Polizei-Roboter Boss
    const bossMech = {
      x: worldW - 140,
      y: Math.round(worldH * 0.5),
      w: 58,
      h: 68,
      vx: 0,
      vy: 0,
      facing: -1,
      hp: 120,
      maxHp: 120,
      isSpawned: false,
      spawnDelay: 1.2,
      isAttacking: false,
      attackTimer: 0,
      attackCooldown: 1.3,
      isTelegraphing: false,
      telegraphTimer: 0,
      hitFlashTimer: 0,
      isDying: false,
      deathTimer: 0
    };

    // Status-State
    const state = {
      switchTerminal,
      pandaMech,
      cops,
      bossMech,
      walls,
      announcementText: "",
      announcementTimer: 0,
      levelWon: false
    };

    // ---------------------------------------------------------------------
    // Update-Logik des Levels
    // ---------------------------------------------------------------------
    function update(g, dt) {
      const p = g.pandi;
      const pm = state.pandaMech;
      const bm = state.bossMech;
      const sw = state.switchTerminal;

      if (state.announcementTimer > 0) {
        state.announcementTimer -= dt;
      }

      // -------------------------------------------------------------------
      // PHASE 1: Schalter umlegen & Roboter-Panda aktivieren
      // -------------------------------------------------------------------
      if (!sw.isOn) {
        // Abstand von Pandi zum Schalter prüfen
        const distToSwitch = Math.hypot(p.x + p.w * 0.5 - sw.x, p.y + p.h * 0.5 - sw.y);
        if (distToSwitch < 38) {
          sw.isOn = true;
          pm.isActivated = true;
          g.ctx?.sound?.playScore?.();
          g.spawnParticles(sw.x, sw.y, "#10b981", 20);
          g.spawnParticles(sw.x, sw.y, "#facc15", 16);
          g.addFloatingText(sw.x - g.camera.x, sw.y - g.camera.y - 20, "⚡ SCHALTER UMGELEGT! ROBOTER AKTIVIERT!", "#34d399");

          // Energie-Funken zum Zentrum
          g.spawnParticles(pm.x, pm.y, "#34d399", 25);
          g.spawnParticles(pm.x, pm.y, "#38bdf8", 20);
        }
      }

      // -------------------------------------------------------------------
      // Einstieg in den Roboter-Panda
      // -------------------------------------------------------------------
      if (pm.isActivated && !pm.inMech) {
        const distToMech = Math.hypot(p.x + p.w * 0.5 - pm.x, p.y + p.h * 0.5 - pm.y);
        if (distToMech < 48) {
          pm.inMech = true;
          g.currentLevelBuilt.hidePandi = true;
          g.ctx?.sound?.playWin?.();
          g.spawnParticles(pm.x, pm.y, "#38bdf8", 30);
          g.spawnParticles(pm.x, pm.y, "#facc15", 25);
          g.addFloatingText(pm.x - g.camera.x, pm.y - g.camera.y - 30, "🤖 ROBOTER-PANDA GESTARTET! KÄMPFE!", "#38bdf8");

          // Die 2 Polizisten flüchten erschrocken!
          for (const cop of g.cops) {
            cop.isChasing = false;
            cop.isFleeing = true;
            cop.patrolSpeed = 220;
          }
          // Polizisten nach kurzer Flucht entfernen
          setTimeout(() => {
            g.cops = [];
          }, 1200);

          // Boss-Auftritt einleiten
          bm.isSpawned = true;
          bm.spawnDelay = 1.0;
        }
      }

      // -------------------------------------------------------------------
      // PHASE 2: Mech-Steuerung & Bosskampf
      // -------------------------------------------------------------------
      if (pm.inMech) {
        // Mobile-Jump-Button dynamisch auf "🎋 Schlag" anpassen
        const jumpBtn = document.querySelector('[data-gpad="jump"]');
        if (jumpBtn && jumpBtn.textContent !== "🎋 Schlag") {
          jumpBtn.textContent = "🎋 Schlag";
        }

        // Roboter-Panda folgt exakt der Steuerung von Pandi
        pm.x = p.x + p.w * 0.5;
        pm.y = p.y + p.h * 0.5;
        pm.vx = p.vx;
        pm.vy = p.vy;
        if (p.vx !== 0) pm.facing = p.vx > 0 ? 1 : -1;

        // Bambus-Schlag Timer
        if (pm.slashTimer > 0) {
          pm.slashTimer -= dt;
          if (pm.slashTimer <= 0) {
            pm.isAttacking = false;
          }
        }
        if (pm.slashCooldown > 0) {
          pm.slashCooldown -= dt;
        }

        // Schlag ausführen (Leertaste / Touch / Jump-Button)
        const triggerAttack = g.input.jumpBuffered > 0;
        if (triggerAttack && pm.slashCooldown <= 0 && !bm.isDying) {
          pm.isAttacking = true;
          pm.slashTimer = 0.35;
          pm.slashCooldown = 0.38;
          g.input.jumpBuffered = 0; // Puffer verbraucht

          // Schwung-Sound & Partikel
          g.ctx?.sound?.playHit?.();
          const slashX = pm.x + pm.facing * 35;
          const slashY = pm.y - 10;
          g.spawnParticles(slashX, slashY, "#4ade80", 12);

          // Trefferprüfung am Polizei-Roboter
          if (bm.isSpawned && !bm.isDying) {
            const distToBoss = Math.hypot(slashX - bm.x, slashY - bm.y);
            const inFrontOfPanda = pm.facing > 0 ? bm.x > pm.x - 10 : bm.x < pm.x + 10;

            if (distToBoss < 72 && inFrontOfPanda) {
              // TREFFER AM BOSS!
              const dmg = 15;
              bm.hp -= dmg;
              bm.hitFlashTimer = 0.25;
              // Leichter Rückstoß
              bm.x += pm.facing * 18;

              g.ctx?.sound?.playHit?.();
              g.spawnParticles(bm.x, bm.y, "#facc15", 18);
              g.spawnParticles(bm.x, bm.y, "#38bdf8", 14);
              g.addFloatingText(bm.x - g.camera.x, bm.y - g.camera.y - 25, `-${dmg} HP! BAMBUS-TREFFER!`, "#4ade80");

              // Boss besiegt?
              if (bm.hp <= 0 && !bm.isDying) {
                bm.hp = 0;
                bm.isDying = true;
                bm.deathTimer = 0;
                g.score += 3000;
                g.ctx?.sound?.playWin?.();
                g.addFloatingText(bm.x - g.camera.x, bm.y - g.camera.y - 40, "🏆 POLIZEI-ROBOTER ZERSTÖRT! SIEG! 🏆", "#fef08a");
              }
            }
          }
        }

        // -----------------------------------------------------------------
        // Boss-KI & Polizei-Roboter Angriffe
        // -----------------------------------------------------------------
        if (bm.isSpawned && !bm.isDying) {
          if (bm.hitFlashTimer > 0) bm.hitFlashTimer -= dt;
          if (bm.attackCooldown > 0) bm.attackCooldown -= dt;

          const dx = pm.x - bm.x;
          const dy = pm.y - bm.y;
          const distToPanda = Math.hypot(dx, dy);
          bm.facing = dx >= 0 ? 1 : -1;

          // Verfolgung
          const MELEE_RANGE = 74;
          if (distToPanda > MELEE_RANGE && !bm.isTelegraphing && !bm.isAttacking) {
            const bossSpeed = 118;
            bm.vx = (dx / distToPanda) * bossSpeed;
            bm.vy = (dy / distToPanda) * bossSpeed;
            bm.x += bm.vx * dt;
            bm.y += bm.vy * dt;

            // Wandkollision für Boss
            bm.x = Math.max(48, Math.min(worldW - 48, bm.x));
            bm.y = Math.max(48, Math.min(worldH - 48, bm.y));
          } else {
            bm.vx = 0;
            bm.vy = 0;
          }

          // Angriffsvorbereitung (Telegraph / Ausholen mit Polizeiknüppel)
          if (distToPanda <= MELEE_RANGE && bm.attackCooldown <= 0 && !bm.isTelegraphing && !bm.isAttacking) {
            bm.isTelegraphing = true;
            bm.telegraphTimer = 0.42; // Zeitfenster für den Spieler zum Ausweichen!
            g.addFloatingText(bm.x - g.camera.x, bm.y - g.camera.y - 30, "⚠️ ACHTUNG: KNÜPPEL-SCHLAG!", "#ef4444");
          }

          // Telegraph abarbeiten
          if (bm.isTelegraphing) {
            bm.telegraphTimer -= dt;
            if (bm.telegraphTimer <= 0) {
              bm.isTelegraphing = false;
              bm.isAttacking = true;
              bm.attackTimer = 0.4;
              bm.attackCooldown = 1.35;

              // Knüppel schlägt zu!
              g.ctx?.sound?.playHit?.();
              const hitX = bm.x + bm.facing * 34;
              const hitY = bm.y;
              g.spawnParticles(hitX, hitY, "#38bdf8", 15);
              g.spawnParticles(hitX, hitY, "#facc15", 12);

              // Trefferprüfung am Roboter-Panda
              const distToHit = Math.hypot(hitX - pm.x, hitY - pm.y);
              if (distToHit < 65) {
                // TREFFER AM PANDA-MECH!
                const dmg = 12;
                pm.hp -= dmg;
                g.ctx?.sound?.playLose?.();
                g.spawnParticles(pm.x, pm.y, "#ef4444", 20);
                g.addFloatingText(pm.x - g.camera.x, pm.y - g.camera.y - 25, `-${dmg} HP! KNÜPPEL-TREFFER!`, "#f87171");

                // Panda-Mech zerstört?
                if (pm.hp <= 0) {
                  pm.hp = 0;
                  pm.inMech = false;
                  g.currentLevelBuilt.hidePandi = false;
                  g.damagePandi("ROBOTER-PANDA ZERSTÖRT!");
                  // Reset für neuen Versuch
                  pm.hp = 100;
                  pm.isActivated = true;
                }
              }
            }
          }

          // Angriffsschwung-Timer
          if (bm.isAttacking) {
            bm.attackTimer -= dt;
            if (bm.attackTimer <= 0) {
              bm.isAttacking = false;
            }
          }
        }

        // -----------------------------------------------------------------
        // Boss-Todessequenz (Kettenreaktion-Explosionen)
        // -----------------------------------------------------------------
        if (bm.isDying) {
          bm.deathTimer += dt;
          if (Math.random() < 0.35) {
            const rx = bm.x + (Math.random() - 0.5) * 50;
            const ry = bm.y + (Math.random() - 0.5) * 50;
            g.spawnParticles(rx, ry, Math.random() < 0.5 ? "#f97316" : "#facc15", 16);
            g.ctx?.sound?.playHit?.();
          }

          if (bm.deathTimer >= 2.4 && !state.levelWon) {
            state.levelWon = true;
            const jumpBtn = document.querySelector('[data-gpad="jump"]');
            if (jumpBtn) jumpBtn.textContent = "Springen";
            g.spawnParticles(bm.x, bm.y, "#4ade80", 40);
            g.spawnParticles(bm.x, bm.y, "#facc15", 40);
            g.advanceLevel();
          }
        }
      }
    }

    // ---------------------------------------------------------------------
    // Zeichnung aller Entities im Level
    // ---------------------------------------------------------------------
    function drawEntities(g, ctx) {
      const time = g.animClock || 0;

      // 1. Schalter-Terminal
      drawSwitchTerminal(ctx, state.switchTerminal, time);

      // 2. Roboter-Panda
      drawRobotPanda(
        ctx,
        state.pandaMech,
        time,
        state.pandaMech.inMech,
        state.pandaMech.facing,
        state.pandaMech.isAttacking,
        state.pandaMech.slashTimer
      );

      // 3. Polizei-Roboter Boss
      if (state.bossMech.isSpawned) {
        drawPoliceRobotBoss(ctx, state.bossMech, time);
      }

      // 4. Boss-HUD Lebensbalken (im Screen-Space zeichnen)
      ctx.save();
      ctx.translate(g.camera.x, g.camera.y);
      drawBossHudHealthBars(ctx, g.view.w, g.view.h, state.pandaMech, state.bossMech);
      ctx.restore();
    }

    return {
      mode: "maze",
      worldW,
      worldH,
      spawn,
      walls,
      coins: [],
      keys: [],
      keysRequired: 0,
      cage: null,
      cops,
      exit: null, // Sieg erfolgt durch Zerstörung des Bosses!
      hidePandi: false,
      update,
      drawEntities,
      hudText: (g) => {
        if (state.levelWon) return "🏆 BOSS BESIEGT! LEVEL GEMEISTERT! 🏆";
        if (state.pandaMech.inMech) {
          return `⚔️ ROBOTER-KAMPF! [SPACE/TOUCH]=BAMBUS-SCHLAG 🎋`;
        }
        if (state.switchTerminal.isOn) {
          return "🤖 ROBOTER-PANDA AKTIV! STEIGE EIN! 🐼";
        }
        return "⚡ LEGE DEN SCHALTER UM! WEICHE POLIZISTEN AUS! 🚨";
      },
      drawBackground: drawLevel8Background
    };
  }

  // -----------------------------------------------------------------------
  // Registrierung bei den Level-Modulen
  // -----------------------------------------------------------------------
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS = window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS || {};
  window.PANDIES_ABENTEUER_LEVEL_BACKGROUNDS.level8 = drawLevel8Background;

  window.PANDIES_ABENTEUER_LEVELS?.register?.({
    id: "level-8",
    shortLabel: "Boss-Level",
    name: "BOSS: DER ROBOTER-PANDA & DER POLIZEI-ROBOTER",
    mode: "maze",
    keysRequired: 0,
    drawBackground: drawLevel8Background,
    build: buildLevel8
  });
})();
