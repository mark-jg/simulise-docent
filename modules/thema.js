/* Thema: zet data-sim-theme / data-sim-dark / data-sim-compact op <html>; theme.css doet de rest. */
SD.register({
  id: 'thema',
  DARK: new Set(['dark', 'discord', 'nord', 'mocha']),
  media: window.matchMedia('(prefers-color-scheme: dark)'),

  init(SD) {
    this._onMedia = () => this.update(SD);
    this.media.addEventListener('change', this._onMedia);
    this.update(SD);
  },

  update(SD) {
    const s = SD.settings;
    const theme = s.theme === 'auto' ? (this.media.matches ? 'dark' : 'light') : s.theme;
    SD.root.setAttribute('data-sim-theme', theme);
    SD.root.toggleAttribute('data-sim-dark', this.DARK.has(theme));
    SD.root.toggleAttribute('data-sim-compact', !!s.compact);
  },

  destroy(SD) {
    this.media.removeEventListener('change', this._onMedia);
    SD.root.setAttribute('data-sim-theme', 'off');
    SD.root.removeAttribute('data-sim-dark');
    SD.root.removeAttribute('data-sim-compact');
  },
});
