/* Zijbalk inklappen (roadmap 2.7): een knop linksonder klapt de zijbalk in tot alleen iconen.
 * De menu-items krijgen een tooltip (title) met hun naam. De opmaak staat in theme.css onder
 * html[data-sim-nav-mini]. De stand wordt onthouden (navMini in chrome.storage.sync).
 * Ook bereikbaar via Cmd+K: "Zijbalk in- of uitklappen".
 */
SD.register({
  id: 'zijbalk',
  CSS: `
    :host { all: initial; }
    button { position: fixed; left: 12px; bottom: 12px; z-index: 2147482000; width: 32px; height: 32px; border-radius: 50%;
      border: 1px solid var(--sim-border, #e3e6ea); background: var(--sim-surface, #fff); color: var(--sim-text-2, #5b6470);
      font: 16px/1 system-ui, sans-serif; cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, .12); display: grid; place-items: center; padding: 0; }
    button:hover { color: var(--sim-accent, #0e8a74); border-color: var(--sim-accent, #0e8a74); }
    button:focus-visible { outline: 2px solid var(--sim-accent, #0e8a74); outline-offset: 2px; }
  `,

  init(SD) {
    this.SD = SD;
    SD.addCommand('zijbalk', 'Zijbalk in- of uitklappen', () => this.toggle());
    SD.ready(() => {
      if (!this.SD) return; // intussen uitgezet
      const { host, shadow } = SD.shadowHost('sim-docent-zijbalk', this.CSS);
      this.host = host;
      this.btn = document.createElement('button');
      this.btn.onclick = () => this.toggle();
      shadow.append(this.btn);
      this.tooltips();
      this._stop = SD.observe(() => this.tooltips(), 1000);
      this.update(SD);
    });
    this.update(SD);
  },

  update(SD) {
    const mini = SD.settings.navMini === true;
    SD.root.toggleAttribute('data-sim-nav-mini', mini);
    if (this.btn) {
      this.btn.textContent = mini ? '»' : '«';
      const label = mini ? 'Zijbalk uitklappen' : 'Zijbalk inklappen';
      this.btn.title = label;
      this.btn.setAttribute('aria-label', label);
    }
  },

  toggle() { chrome.storage.sync.set({ navMini: !(this.SD.settings.navMini === true) }); },

  /* Tooltip met de naam op elk menu-item, voor als alleen het icoon zichtbaar is. */
  tooltips() {
    for (const a of document.querySelectorAll('aside#nav .nav-main > li > a')) {
      const naam = a.textContent.replace(/\s+/g, ' ').trim();
      if (naam && !a.title) a.title = naam;
    }
  },

  destroy(SD) {
    SD.removeCommand('zijbalk');
    SD.root.removeAttribute('data-sim-nav-mini');
    this._stop?.();
    this.host?.remove();
    this.host = this.btn = null;
    this.SD = null;
  },
});
