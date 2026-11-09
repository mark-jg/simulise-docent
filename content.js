// Thema-attribuut op <html>, zo vroeg mogelijk zodat de CSS direct geldt.
(function () {
  const DARK = new Set(['dark', 'discord', 'nord', 'mocha']);
  const DEFAULTS = { enabled: true, theme: 'auto', compact: false };
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function apply(s) {
    if (s.enabled === false) {
      root.setAttribute('data-sim-theme', 'off');
      root.removeAttribute('data-sim-dark');
      root.removeAttribute('data-sim-compact');
      return;
    }
    const theme = s.theme === 'auto' ? (media.matches ? 'dark' : 'light') : s.theme;
    root.setAttribute('data-sim-theme', theme);
    root.toggleAttribute('data-sim-dark', DARK.has(theme));
    root.toggleAttribute('data-sim-compact', !!s.compact);
  }

  const refresh = () => chrome.storage.sync.get(DEFAULTS, apply);
  refresh();
  chrome.storage.onChanged.addListener((_, area) => { if (area === 'sync') refresh(); });
  media.addEventListener('change', refresh);
})();
