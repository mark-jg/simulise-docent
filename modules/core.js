/* Kern: modules registreren en starten of stoppen op basis van de instellingen.
 * Een module is { id, init(SD), update(SD)?, destroy(SD)? }. update wordt aangeroepen bij elke
 * wijziging van de instellingen zolang de module aan staat.
 */
(() => {
  if (globalThis.SD) return;
  const modules = new Map();
  const SD = {
    settings: { ...globalThis.SD_DEFAULTS },
    root: document.documentElement,
    register(mod) { modules.set(mod.id, { ...mod, active: false }); },
    /* Opdrachten voor het zoekvenster (Cmd+K), zoals "Zijbalk in- of uitklappen". */
    commands: new Map(),
    addCommand(id, naam, run) { SD.commands.set(id, { naam, run }); },
    removeCommand(id) { SD.commands.delete(id); },
    /* Voert fn uit zodra <body> bestaat (content scripts starten bij document_start). */
    ready(fn) {
      if (document.body) fn();
      else document.addEventListener('DOMContentLoaded', fn, { once: true });
    },
    /* Eigen UI in een shadow root, zodat de CSS van Simulise (Bootstrap) er niet aan zit. */
    shadowHost(id, css) {
      const host = document.createElement('div');
      host.id = id;
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = css;
      shadow.append(style);
      document.body.append(host);
      return { host, shadow };
    },
    /* MutationObserver met vertraging, voor pagina's die Vue opnieuw opbouwt. */
    observe(fn, wait = 500) {
      let t;
      const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(fn, wait); });
      mo.observe(document.body, { childList: true, subtree: true });
      return () => { clearTimeout(t); mo.disconnect(); };
    },
/* Een vraag aan Simulise via de brug in de pagina (modules/gql.js), met je eigen sessie.
     * Geeft { data, errors }; bij geen antwoord een fout na 20 seconden. */
    gql(operationName, query, variables) {
      if (!SD._gqlWacht) {
        SD._gqlWacht = new Map();
        window.addEventListener('message', (e) => {
          if (e.source !== window || e.data?.type !== 'sd-gql-antwoord') return;
          const klaar = SD._gqlWacht.get(e.data.id);
          if (klaar) { SD._gqlWacht.delete(e.data.id); klaar(e.data); }
        });
      }
      return new Promise((klaar) => {
        const id = `sd-kern-${Date.now()}-${SD._gqlWacht.size}-${Math.random().toString(36).slice(2, 8)}`;
        const t = setTimeout(() => { SD._gqlWacht.delete(id); klaar({ data: null, errors: ['Simulise gaf geen antwoord. Herlaad de pagina en probeer opnieuw.'] }); }, 20000);
        SD._gqlWacht.set(id, (a) => { clearTimeout(t); klaar(a); });
        window.postMessage({ type: 'sd-gql', id, operationName, query, variables }, location.origin);
      });
    },
        isOn(id) {
      const meta = globalThis.SD_MODULES.find((m) => m.id === id);
      return meta ? SD.settings[meta.key] !== false : true;
    },
    run() {
      for (const mod of modules.values()) {
        const on = SD.isOn(mod.id);
        try {
          if (on && !mod.active) { mod.init(SD); mod.active = true; }
          else if (!on && mod.active) { mod.destroy?.(SD); mod.active = false; }
          else if (on) mod.update?.(SD);
        } catch (e) { console.warn(`[Simulise Docent] module ${mod.id} faalde`, e); }
      }
    },
    async start() {
      const load = async () => { SD.settings = await chrome.storage.sync.get(globalThis.SD_DEFAULTS); SD.run(); };
      await load();
      chrome.storage.onChanged.addListener((_, area) => { if (area === 'sync') load(); });
    },
  };
  globalThis.SD = SD;
})();
