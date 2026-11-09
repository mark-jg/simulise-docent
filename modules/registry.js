/* Lijst van modules, gedeeld door content script en popup.
 * Elke module heeft een eigen aan/uit in de popup. `key` is de instelling in chrome.storage.sync;
 * die namen blijven gelijk aan v0.2, zodat bestaande instellingen blijven werken.
 * Nieuwe module: bestand modules/<id>.js met SD.register({ id, init, update, destroy }),
 * een regel hieronder, en het bestand toevoegen aan content_scripts in manifest.json.
 */
globalThis.SD_MODULES = [
  { id: 'thema', naam: 'Thema', uitleg: 'Opmaak en thema\'s voor Simulise', key: 'enabled' },
  { id: 'zoeken', naam: 'Zoeken (Cmd+K)', uitleg: 'Snel naar menu-items en groepen springen; Ctrl+K op Windows', key: 'search' },
  { id: 'zijbalk', naam: 'Zijbalk inklappen', uitleg: 'Knop linksonder om de zijbalk tot iconen in te klappen', key: 'navToggle' },
  { id: 'hulpknop', naam: 'Hulpknop verbergen', uitleg: 'Zwevende knop "Hulp nodig?" weg; hulp blijft in het gebruikersmenu', key: 'hideSupport' },
];

globalThis.SD_DEFAULTS = {
  enabled: true,      // module thema
  theme: 'auto',
  compact: false,
  hideSupport: true,  // module hulpknop
  search: true,       // module zoeken
  navToggle: true,    // module zijbalk
  navMini: false,     // zijbalk ingeklapt
  updateCheck: true,  // updatepagina
};
