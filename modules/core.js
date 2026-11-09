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
