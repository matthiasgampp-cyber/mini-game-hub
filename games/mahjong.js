(() => {
  "use strict";

  window.GAME_REGISTRY?.register({
    id: "mahjong",
    name: "Mahjong Solitaire",
    subtitle: "5 Layouts • Garantierte Lösbarkeit • Hinweise & Undo",
    tag: "Puzzle Klassiker",
    icon: "🀄",
    description: "Klassisches Mahjong Solitaire mit 5 Layouts, garantierter Lösbarkeit, Hinweisen, Undo und Bestzeiten.",
    hidden: false,

    init(ctx) {
      this.ctx = ctx;
      this.iframe = document.createElement("iframe");
      const version = encodeURIComponent(window.APP_VERSION || "2.3.0");
      this.iframe.src = `./games/Mahjong/index.html?v=${version}`;
      this.iframe.title = "Mahjong Solitaire";
      this.iframe.className = "w-full h-full border-0 block bg-[#14573c]";
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
