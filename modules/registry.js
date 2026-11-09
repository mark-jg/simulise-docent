/* Lijst van modules, gedeeld door content script en popup.
 * Elke module heeft een eigen aan/uit in de popup. `key` is de instelling in chrome.storage.sync;
 * die namen blijven gelijk aan v0.2, zodat bestaande instellingen blijven werken.
 * Nieuwe module: bestand modules/<id>.js met SD.register({ id, init, update, destroy }),
 * een regel hieronder, en het bestand toevoegen aan content_scripts in manifest.json.
 * Modules met dev: true staan niet in de lijst, maar onder "Ontwikkelaarsmodus" in de popup.
 */
globalThis.SD_MODULES = [
  { id: 'thema', naam: 'Thema', uitleg: 'Opmaak en thema\'s voor Simulise', key: 'enabled' },
  { id: 'beoordelen', naam: 'Filter in Beoordelen', uitleg: 'Meetmomenten van andere opleidingen verbergen; instellingen in de filterbalk', key: 'grading' },
  { id: 'meldingen', naam: 'Filter in Meldingen', uitleg: 'Meldingen over meetmomenten van andere opleidingen verbergen (menu en pagina)', key: 'notifFilter' },
  { id: 'zoeken', naam: 'Zoeken (Cmd+K)', uitleg: 'Snel naar menu-items en groepen springen; Ctrl+K op Windows', key: 'search' },
  { id: 'zijbalk', naam: 'Zijbalk inklappen', uitleg: 'Knop linksonder om de zijbalk tot iconen in te klappen', key: 'navToggle' },
  // dev: alleen in de ontwikkelaarsmodus (eigen schakelaar onderaan de popup)
  { id: 'inspector', naam: 'Inspector', uitleg: 'Alt+I: selectors en paginarapporten zonder namen', key: 'developer', dev: true },
  { id: 'hulpknop', naam: 'Hulpknop verbergen', uitleg: 'Zwevende knop "Hulp nodig?" weg; hulp blijft in het gebruikersmenu', key: 'hideSupport' },
];

globalThis.SD_DEFAULTS = {
  enabled: true,      // module thema
  theme: 'auto',
  compact: false,
  hideSupport: true,  // module hulpknop
  notifFilter: true,  // module meldingen
  search: true,       // module zoeken
  grading: true,      // module beoordelen
  bdModus: 'mijn',    // filter Beoordelen: 'alles', 'mijn' (opleidingen) of 'groepen'
  bdOpleidingen: 'MEP, MIP, MR',
  bdUitsluiten: '',
  bdGroepen: [],      // Beoordelen: gekozen groepen (sleutels uit Simulise) voor Mijn groepen
  bdEenPagina: true,  // Beoordelen: hele lijst op één pagina (modules/perpagina.js)
  navToggle: true,    // module zijbalk
  navMini: false,     // zijbalk ingeklapt
  updateCheck: true,  // updatepagina
  developer: false,   // ontwikkelaarsmodus (module inspector)
};
