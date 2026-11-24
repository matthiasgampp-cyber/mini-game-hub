(() => {
  "use strict";

  window.GAME_REGISTRY?.register({
    id: "solitaer",
    name: "Solitär (Steckhalma)",
    subtitle: "Englisches Kreuz & Europäisch • Klick & Drag-and-Drop",
    tag: "Brettspiel Klassiker",
    icon: "🪵",
    description: "Klassisches Steckhalma (Peg Solitaire) in warmer Holzbrett-Optik mit 33- & 37-Felder-Modus, Drag & Drop, Undo, Tipp und Bestleistungen.",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.iframe = document.createElement("iframe");
      const version = encodeURIComponent(window.APP_VERSION || "2.3.1");
      this.iframe.src = `./games/Solitaer/index.html?v=${version}`;
      this.iframe.title = "Solitär – Steckhalma";
      this.iframe.className = "w-full h-full border-0 block bg-[#1a1009]";
      this.iframe.allow = "autoplay";

      this._onLoad = () => {
        this._post({ type: "hub-sound", muted: Boolean(this.ctx?.sound?.muted) });
      };
      this.iframe.addEventListener("load", this._onLoad);

      ctx.stage.appendChild(this.iframe);
    },

    _post(message) {
      try {
        this.iframe?.contentWindow?.postMessage(message, "*");
      } catch {
        // Ignorieren falls Frame noch nicht bereit ist
      }
    },

    start() {},

    pause() {
      this._post({ type: "hub-pause" });
    },

    resume() {
      this._post({ type: "hub-resume" });
    },

    resize() {},

    destroy() {
      if (this.iframe) {
        if (this._onLoad) {
          this.iframe.removeEventListener("load", this._onLoad);
        }
        if (this.iframe.parentNode) {
          this.iframe.parentNode.removeChild(this.iframe);
        }
      }
      this.iframe = null;
      this._onLoad = null;
      this.ctx = null;
    }
  });
})();
