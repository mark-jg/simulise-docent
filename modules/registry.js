/* Lijst van modules, gedeeld door content script en popup.
 * Elke module heeft een eigen aan/uit in de popup. `key` is de instelling in chrome.storage.sync;
 * die namen blijven gelijk aan v0.2, zodat bestaande instellingen blijven werken.
 * Nieuwe module: bestand modules/<id>.js met SD.register({ id, init, update, destroy }),
 * een regel hieronder, en het bestand toevoegen aan content_scripts in manifest.json.
 * `groep` bepaalt onder welk kopje de module in het zijpaneel staat (nakijken, klassen, rapporten, uiterlijk, overig).
 * Modules met dev: true staan niet in de lijst, maar onder "Ontwikkelaarsmodus" in de popup.
 */
globalThis.SD_MODULES = [
  { id: 'thema', groep: 'uiterlijk', naam: 'Thema', uitleg: 'Opmaak en thema\'s voor Simulise', key: 'enabled' },
  { id: 'vandaag', groep: 'nakijken', naam: 'Vandaag', uitleg: 'Eigen startscherm met je beoordeelwachtrij over alle groepen; bovenaan de zijbalk en via Cmd+K', key: 'today' },
  { id: 'schil', groep: 'uiterlijk', naam: 'Nieuwe schil (thema Helder)', uitleg: 'Zijbalk rond taken, gewone taal en een kleur per klas; werkt alleen met het thema Helder', key: 'shell' },
  { id: 'focus', groep: 'nakijken', naam: 'Focusmodus bij beoordelen', uitleg: 'Het werk met rubric, feedback en beoordeling toekennen ernaast, en een compacte lijst van de klas; Alt+F', key: 'focus' },
  { id: 'media', groep: 'nakijken', naam: 'Media bij het nakijken', uitleg: 'Video, audio en bestanden van een ingeleverde portfoliopagina afspelen op het beoordeelscherm', key: 'reviewMedia' },
  { id: 'matrix', groep: 'klassen', naam: 'Opdrachten van een klas', uitleg: 'Rustig overzicht per vak met wat op jou wacht bovenaan; de matrix per student als stippenkaart', key: 'matrixView' },
  { id: 'inzicht', groep: 'rapporten', naam: 'Inzicht in gewone taal', uitleg: 'Analytics als vragen, geordend, met je klassen bovenaan; de keuzes voor een rapportage in gewone taal', key: 'insight' },
  { id: 'opdracht', groep: 'klassen', naam: 'Snelle opdracht', uitleg: 'Een opdracht aanmaken op één scherm: knop bij Opdrachten en via Cmd+K', key: 'quickAssign' },
  { id: 'beoordelen', groep: 'nakijken', naam: 'Filter in Beoordelen', uitleg: 'Meetmomenten van andere opleidingen verbergen; instellingen in de filterbalk', key: 'grading' },
  { id: 'meldingen', groep: 'nakijken', naam: 'Filter in Meldingen', uitleg: 'Meldingen over meetmomenten van andere opleidingen verbergen (menu en pagina)', key: 'notifFilter' },
  { id: 'rapporten', groep: 'rapporten', naam: 'Voortgangsrapporten', uitleg: 'Knop op het profiel van een student en in het menu bij Groepen', key: 'reports' },
  { id: 'zoeken', groep: 'overig', naam: 'Zoeken (Cmd+K)', uitleg: 'Snel naar menu-items en groepen springen; Ctrl+K op Windows', key: 'search' },
  { id: 'zijbalk', groep: 'overig', naam: 'Zijbalk inklappen', uitleg: 'Knop linksonder om de zijbalk tot iconen in te klappen', key: 'navToggle' },
  // dev: alleen in de ontwikkelaarsmodus (eigen schakelaar onderaan de popup)
  { id: 'inspector', groep: 'overig', naam: 'Inspector', uitleg: 'Alt+I: selectors en paginarapporten zonder namen', key: 'developer', dev: true },
  { id: 'hulpknop', groep: 'overig', naam: 'Hulpknop verbergen', uitleg: 'Zwevende knop "Hulp nodig?" weg; hulp blijft in het gebruikersmenu', key: 'hideSupport' },
];

globalThis.SD_DEFAULTS = {
  enabled: true,      // module thema
  theme: 'auto',
  compact: false,
  hideSupport: true,  // module hulpknop
  notifFilter: true,  // module meldingen
  reports: true,      // module rapporten
  search: true,       // module zoeken
  grading: true,      // module beoordelen
  today: true,        // module vandaag
  insight: true,      // module inzicht
  vdDeadlines: 'mij', // klaspagina, blok Deadlines: 'mij' (waar jij beoordelaar bent) of 'klas' (alle opdrachten van de klas)
  quickAssign: true,  // module opdracht (snelle opdracht)
  reviewMedia: true,  // module media (media bij het nakijken)
  qaStandaard: {},    // snelle opdracht: je vaste keuzes (deadline, inleverstukken, labels, actief)
  matrixView: true,   // module matrix
  matrixMij: false,   // matrix: alles behalve wat op jou wacht lichter
  matrixSorteer: 'voornaam', // gedraaide matrix: studenten op voornaam, achternaam, wacht, laat of klaar
  matrixKolommen: 'simulise', // gedraaide matrix: opdrachten in de volgorde van Simulise, op deadline of op code
  matrixPeriode: '',  // gedraaide matrix: alleen opdrachten met een deadline in deze periode (code), leeg = alle
  matrixDraai: true,  // matrix per student gedraaid: studenten als rijen, opdrachten als kolommen
  matrixWeergave: 'overzicht', // opdrachten van een klas: 'overzicht' (per vak) of 'student' (stippenkaart)
  focus: true,        // module focus
  focusAan: true,     // focusmodus staat aan op het beoordeelscherm
  focusKolom: true,   // focusmodus: rubric, feedback en onderbalk in een zijkolom
  shell: true,        // module schil (alleen actief bij thema helder)
  shellMeer: false,   // schil: groep Meer in de zijbalk uitgeklapt
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
