(() => {
  "use strict";

  /**
   * VirtualJoystick Modul für Neon Arcade Hub
   * Bietet einen responsiven, multi-touch-fähigen virtuellen Analog-Joystick
   * mit 8-Wege-Richtungserkennung, Deadzone und visuellem Neon-Cyberpunk-HUD.
   */
  class VirtualJoystick {
    constructor(options = {}) {
      this.container = options.container || null;
      this.onMove = typeof options.onMove === "function" ? options.onMove : null;
      this.onRelease = typeof options.onRelease === "function" ? options.onRelease : null;
      this.deadzoneRatio = options.deadzoneRatio || 0.18; // 18% Deadzone

      this.baseEl = null;
      this.stickEl = null;
      this.dirEls = {};

      this.activePointerId = null;
      this.centerX = 0;
      this.centerY = 0;
      this.maxRadius = 38;

      this.currentX = 0;
      this.currentY = 0;
      this.clampedX = 0;
      this.clampedY = 0;

      this.directions = {
        left: false,
        right: false,
        up: false,
        down: false
      };

      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);

      if (this.container) {
        this.mount(this.container);
      }
    }

    mount(container) {
      if (!container) return;
      this.unmount();
      this.container = container;

      // Base Element
      const base = document.createElement("div");
      base.className = "virtual-joystick-base";
      base.setAttribute("role", "presentation");
      base.setAttribute("aria-label", "Virtueller Analog-Joystick");

      // 4 Richtungsindikatoren (N, S, W, E)
      const dirUp = document.createElement("span");
      dirUp.className = "virtual-joystick-dir dir-up";
      dirUp.textContent = "▲";

      const dirDown = document.createElement("span");
      dirDown.className = "virtual-joystick-dir dir-down";
      dirDown.textContent = "▼";

      const dirLeft = document.createElement("span");
      dirLeft.className = "virtual-joystick-dir dir-left";
      dirLeft.textContent = "◀";

      const dirRight = document.createElement("span");
      dirRight.className = "virtual-joystick-dir dir-right";
      dirRight.textContent = "▶";

      base.appendChild(dirUp);
      base.appendChild(dirDown);
      base.appendChild(dirLeft);
      base.appendChild(dirRight);

      // Thumb Stick (Knob)
      const stick = document.createElement("div");
      stick.className = "virtual-joystick-stick";

      const pip = document.createElement("div");
      pip.className = "virtual-joystick-pip";
      stick.appendChild(pip);

      base.appendChild(stick);
      this.container.appendChild(base);

      this.baseEl = base;
      this.stickEl = stick;
      this.dirEls = {
        up: dirUp,
        down: dirDown,
        left: dirLeft,
        right: dirRight
      };

      base.addEventListener("pointerdown", this.handlePointerDown, { passive: false });
      window.addEventListener("pointermove", this.handlePointerMove, { passive: false });
      window.addEventListener("pointerup", this.handlePointerUp, { passive: false });
      window.addEventListener("pointercancel", this.handlePointerUp, { passive: false });
      base.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    unmount() {
      if (this.baseEl) {
        this.baseEl.removeEventListener("pointerdown", this.handlePointerDown);
        window.removeEventListener("pointermove", this.handlePointerMove);
        window.removeEventListener("pointerup", this.handlePointerUp);
        window.removeEventListener("pointercancel", this.handlePointerUp);
        if (this.baseEl.parentNode) {
          this.baseEl.parentNode.removeChild(this.baseEl);
        }
      }
      this.baseEl = null;
      this.stickEl = null;
      this.dirEls = {};
      this.activePointerId = null;
    }

    updateGeometry() {
      if (!this.baseEl) return;
      const rect = this.baseEl.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      // Maximaler Bewegungsradius für den Knauf
      this.maxRadius = Math.max(26, rect.width / 2 - 14);
    }

    handlePointerDown(e) {
      if (this.activePointerId !== null) return;
      e.preventDefault();
      e.stopPropagation();

      this.activePointerId = e.pointerId;
      try {
        this.baseEl?.setPointerCapture(e.pointerId);
      } catch (_) {}

      this.baseEl?.classList.add("is-active");
      this.stickEl?.classList.add("is-dragging");

      this.updateGeometry();
      this.processCoords(e.clientX, e.clientY);
    }

    handlePointerMove(e) {
      if (e.pointerId !== this.activePointerId) return;
      e.preventDefault();
      e.stopPropagation();
      this.processCoords(e.clientX, e.clientY);
    }

    handlePointerUp(e) {
      if (e.pointerId !== this.activePointerId) return;
      e.preventDefault();
      e.stopPropagation();

      try {
        this.baseEl?.releasePointerCapture(e.pointerId);
      } catch (_) {}

      this.reset();
    }

    processCoords(clientX, clientY) {
      const rawDx = clientX - this.centerX;
      const rawDy = clientY - this.centerY;
      const dist = Math.hypot(rawDx, rawDy);

      let clampedDist = dist;
      let nx = 0;
      let ny = 0;

      if (dist > 0.0001) {
        nx = rawDx / dist;
        ny = rawDy / dist;
      }

      if (dist > this.maxRadius) {
        clampedDist = this.maxRadius;
        this.clampedX = nx * this.maxRadius;
        this.clampedY = ny * this.maxRadius;
      } else {
        this.clampedX = rawDx;
        this.clampedY = rawDy;
      }

      // Knauf flüssig rendern (nur bei spürbarer Änderung)
      if (this.stickEl) {
        const nextX = Math.round(this.clampedX * 10) / 10;
        const nextY = Math.round(this.clampedY * 10) / 10;
        if (nextX !== this.currentX || nextY !== this.currentY) {
          this.currentX = nextX;
          this.currentY = nextY;
          this.stickEl.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
        }
      }

      // Richtungen mit Deadzone und 8-Wege-Erkennung bestimmen
      const deadzone = this.maxRadius * this.deadzoneRatio;
      let nextLeft = false;
      let nextRight = false;
      let nextUp = false;
      let nextDown = false;

      if (dist >= deadzone) {
        // Schwellenwert 0.38 erlaubt diagonale Eingaben (z. B. oben+rechts)
        nextRight = nx > 0.38;
        nextLeft = nx < -0.38;
        nextDown = ny > 0.38;
        nextUp = ny < -0.38;
      }

      const changed =
        this.directions.left !== nextLeft ||
        this.directions.right !== nextRight ||
        this.directions.up !== nextUp ||
        this.directions.down !== nextDown;

      if (changed) {
        // Visuelle Indikatoren nur bei Richtungswechsel aktualisieren (spart DOM-Writes pro Frame)
        this.updateIndicators(nextLeft, nextRight, nextUp, nextDown);

        this.directions.left = nextLeft;
        this.directions.right = nextRight;
        this.directions.up = nextUp;
        this.directions.down = nextDown;

        if (this.onMove) {
          this.onMove({
            directions: { ...this.directions },
            dx: nx * (clampedDist / this.maxRadius),
            dy: ny * (clampedDist / this.maxRadius),
            distance: clampedDist / this.maxRadius,
            angle: Math.atan2(ny, nx)
          });
        }
      }
    }

    updateIndicators(left, right, up, down) {
      if (!this.dirEls) return;
      this.dirEls.left?.classList.toggle("active", left);
      this.dirEls.right?.classList.toggle("active", right);
      this.dirEls.up?.classList.toggle("active", up);
      this.dirEls.down?.classList.toggle("active", down);
    }

    reset() {
      this.activePointerId = null;
      this.currentX = 0;
      this.currentY = 0;

      if (this.baseEl) {
        this.baseEl.classList.remove("is-active");
      }
      if (this.stickEl) {
        this.stickEl.classList.remove("is-dragging");
        this.stickEl.style.transform = "translate3d(0px, 0px, 0)";
      }

      this.updateIndicators(false, false, false, false);

      const wasActive =
        this.directions.left ||
        this.directions.right ||
        this.directions.up ||
        this.directions.down;

      this.directions.left = false;
      this.directions.right = false;
      this.directions.up = false;
      this.directions.down = false;

      if (wasActive && this.onRelease) {
        this.onRelease();
      }
    }
  }

  window.VirtualJoystick = VirtualJoystick;
})();
