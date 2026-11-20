(() => {
  "use strict";

  window.GAME_REGISTRY?.register({
    id: "template_game",
    name: "Vorlage Minispiel",
    subtitle: "Boilerplate für neue Module",
    tag: "Template",
    icon: "🧩",
    hidden: true,

    init(ctx) {
      this.ctx = ctx;
      this.container = document.createElement("div");
      this.container.className = "w-full h-full flex items-center justify-center p-6 text-center";
      this.container.innerHTML = `
        <div class="max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-6">
          <h3 class="font-orbitron text-lg font-bold text-cyan-300 mb-2">Neues Modul bereit</h3>
          <p class="text-sm text-slate-400">Kopiere diese Datei, setze <code>hidden: false</code> und baue deine Spiellogik ein.</p>
        </div>
      `;
      ctx.stage.appendChild(this.container);
    },

    start() {},
    pause() {},
    resume() {},
    resize() {},

    destroy() {
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = null;
      this.ctx = null;
    }
  });
})();