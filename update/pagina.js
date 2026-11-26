/* Zet het gekozen thema op <html> van de eigen pagina's (popup, updates, rapportprofielen), zodat ze dezelfde
 * kleuren hebben als Simulise met de extensie. Zie update/pagina.css. */
(() => {
  const DONKER = ['dark', 'discord', 'nord', 'mocha'];
  const zet = (thema) => {
    const root = document.documentElement;
    if (!thema || thema === 'auto' || thema === 'off') { root.removeAttribute('data-thema'); root.removeAttribute('data-donker'); return; }
    root.setAttribute('data-thema', thema);
    root.toggleAttribute('data-donker', DONKER.includes(thema));
  };
  try {
    chrome.storage.sync.get({ theme: 'auto' }).then((s) => zet(s.theme));
    chrome.storage.onChanged.addListener((wijziging, gebied) => { if (gebied === 'sync' && wijziging.theme) zet(wijziging.theme.newValue); });
  } catch { /* buiten de extensie geopend: de standaardkleuren blijven */ }
})();
