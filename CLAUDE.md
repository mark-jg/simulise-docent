# Simulise Docent: projectcontext voor Claude Code

Chrome-extensie (Manifest V3) voor `https://*.simulise.com/*`, de e-portfolio-omgeving van
Mediacollege Amsterdam (tenant `ma`). Gebruiker is docent/curriculumontwikkelaar (Mark). Hij heeft
geen testaccount of testklas; alles wordt getest op zijn eigen docentaccount.

Mapnaam: `simulise-docent`. Extensienaam in Chrome: "Simulise Docent".

Zusterproject: "Docent Tools voor Magister" (aparte extensie, zelfde maker, mark-jg/magister-docent).
Die heeft een eigen Inspector, maar die draait alleen op magister.net. Voor Simulise gebruik je de
Inspector van deze extensie (v0.5.0+, ontwikkelaarsmodus): rapporten komen als
`simulise-rapport-<pad>.md` met namen al vervangen.

## Huidige staat (v0.11.1)

```
manifest.json   MV3, permissions: storage, alarms; host_permissions alleen GitHub (updates);
                content_scripts op simulise.com (css + js, document_start)
background.js   Updatecontrole bij GitHub Releases (mark-jg/simulise-docent), om de 6 uur, badge
update/         updater.js (map kiezen, zip ophalen, schrijven, herladen), draait in de popup en op
                update.html (options_page, terugval voor map kiezen en aan/uit automatisch controleren)
scripts/release.sh, .github/workflows/release.yml   nieuw versienummer op main => tag + release met zip
tools/rooktest.js   rooktest headless Chromium, Simulise en GitHub nagebootst
theme.css       Alle opmaak. Tokens per thema bovenin, daarna generieke regels.
modules/        registry.js (SD_MODULES + SD_DEFAULTS, gedeeld met popup), core.js (SD.register/start),
                thema.js (data-sim-theme / -dark / -compact op <html>), hulpknop.js (data-sim-hide-support),
                beoordelen.js (filterbalk op /assignments/assigned: Alles / Mijn opleidingen +
                Mijn groepen + uitsluitwoorden + Alles op één pagina; bdModus (alles/mijn/groepen),
                bdOpleidingen, bdUitsluiten, bdEenPagina, bdGroepen; zet localStorage simDocentPerPage
                en simDocentGroepen voor perpagina.js),
                meldingen.js (meldingenmenu + /notifications filteren met dezelfde regels; volgende
                pagina's doorzoeken; teller met alleen relevante ongelezen meldingen; zet localStorage
                simDocentMeldingen en simDocentTeller), teller.js (world MAIN: vraagt ongelezen
                meldingen op met de headers van het eerste GraphQL-verzoek van de app, postMessage
                sd-teller; opnieuw bij sd-teller-vraag), regels.js (SD.regels: gedeelde
                regels opleidingscodes/uitsluitwoorden voor beoordelen en meldingen),
                zoeken.js (Cmd+K; indexeert alleen aside#nav-links en /groups/school/<uuid>, groepsnamen in
                chrome.storage.local.sdGroups), zijbalk.js (data-sim-nav-mini, knop linksonder)
                inspector.js (alleen als `developer` aan staat; Alt+I, R = rapport met namen vervangen,
                S = alleen structuur, N = netwerkrapport). netlog.js draait in de pagina (world MAIN) en
                legt fetch/XHR alleen vast bij data-sim-netlog op <html>; alleen opbouw, geen waarden.
                Modules met `dev: true` in registry staan onder Ontwikkelaarsmodus.
                core.js biedt ook SD.addCommand (voor Cmd+K), SD.ready, SD.shadowHost en SD.observe.
                Eigen UI altijd in een shadow root, met de --sim-*-tokens (die erven door).
content.js      Start de modules (SD.start())
popup.html/.js  Aan/uit per module (uit registry), themakeuze, compact, updatemelding
ROADMAP.md      Roadmap en backlog met status per item; bijwerken als iets klaar is
icons/          iconen, gemaakt met scripts/make-icons.py
```

Thema's zijn alleen tokenblokken (`html[data-sim-theme="naam"] { --sim-* }`). Donkere thema's
staan in `DARK` in modules/thema.js. Nieuwe thema toevoegen = tokenblok + naam in `THEMES` (popup.js)
+ evt. `DARK`.

Instellingen in `chrome.storage.sync`, plat: `{ enabled, theme, compact, hideSupport, grading, bdModus, bdOpleidingen, bdUitsluiten, bdEenPagina, bdGroepen, notifFilter, search, navToggle, navMini, updateCheck, developer }`.
`enabled` is de aan/uit van module thema, `hideSupport` die van module hulpknop (namen uit v0.2
bewaard). Nieuwe module: `modules/<id>.js`, regel in registry.js met eigen `key`, en in manifest.json.
Updatestatus in `chrome.storage.local.update`. Het updatemechanisme is overgenomen uit de
Magister-extensie (mark-jg/magister-docent), zonder het optionele GitHub-token.

Release: regel `- X.Y.Z: ...` onder `## Wijzigingen` in README.md en het versienummer in
manifest.json ophogen; na een push naar `main` maakt de workflow zelf tag en release (Claude Code-
sessies in de cloud kunnen geen tags pushen, dit werkt wel). Draai voor elke release `node tools/rooktest.js`.

## Wat we over Simulise weten (uit het dashboard-rapport)

- Stack: Bootstrap 3 (`.panel`, `.panel-heading`, `.navbar`, `.table`), Font Awesome 5 Pro
  (`fa fas fad fal`), Inter als font, Vue 3 gemengd met legacy Angular (`ng-app`) en jQuery.
- Vue-componenten hebben `data-v-xxxx` hashes die per release wijzigen: NIET op selecteren.
  Stabiel: `#nav`, `#content`, `#scrollable-page-wrapper`, `.s-card`, `.nav-main`, `.panel*`,
  `.table-index`, `.badge`, `.label-*`, `.support-button`.
- Dashboard is een Masonry-grid met absoluut gepositioneerde `.s-card`; indeling niet met CSS
  te herschikken, inhoud wel.
- Globals op `window`: `USER`, `API` (GraphQL op `api.simulise.com` en `ma.simulise.com/api`),
  `CSRF`, `TENANT`, `PORTFOLIO`. Portfolio draait op `portfolio.simulise.com`.
- Groepstellers op dashboard linken naar `/groups/{id}/assignments?filters=status:actionable`.
  Beoordelen-tegel linkt naar `/assignments/assigned?status:BEING_PROCESSED,FEEDBACK_ASKED,HANDED_IN`.
- Simulise's eigen "Hulp nodig?"-knop is `a.support-button`, fixed rechts; die overlapt de
  Inspector-knop van de Magister-extensie. Wordt nu verborgen in theme.css; dezelfde hulp zit
  in het gebruikersmenu.

## Wat we weten uit de Inspector-rapporten (Beoordelen, beoordeelscherm, groepsopdrachten)

- **Persoonsgegevens in URL's**: profielen en inleveringen staan onder `/@<gebruikersnaam>/...`
  (bijv. `/@<gebruiker>/assignment/<uuid>/review`). Gebruikersnamen zijn van namen afgeleid: nooit
  opslaan, loggen of in code/documentatie zetten. De Inspector maskeert ze als `@{gebruiker}`.
- **Groepen**: `/groups/school/<uuid>/{community,files,students,teachers,assignments,templates,settings}`.
  Kop: `p.header-text` met spans "Groepen" / "/" / "<groepsnaam>".
- **Beoordelen** (`/assignments/assigned?filters=status:BEING_PROCESSED,FEEDBACK_ASKED,HANDED_IN`):
  `#content table.table.table-v-a-m.table-index`, 25 rijen per pagina, paginering met knoppen
  onder de tabel, tekst "1-25 van de N record(s)" in `div.panel-footer.table-footer`.
  Kolommen (versleepbaar via `th.drag-handle`, aan/uit via het tandwiel-dropdown): checkbox,
  Opdracht titel (`td > a > strong`), Toegewezen aan, Ingeleverd op, Deadline, Status
  (`p.badge.bg-warning` "Te beoordelen" + `p.text-muted` "Door: Mij"/"Door: <naam>").
  Kolommen dus op koptekst zoeken, niet op positie. Geen groepskolom; de reviewlink heeft wel
  `group=<...>&filter_source=GROUP_ASSIGNMENTS` in de query.
  Eigen filterpaneel van Simulise (off-canvas `div.col-off-canvas`, knop "Filters" in de kop):
  statussen Te beantwoorden, Te beoordelen, Wordt beoordeeld, Mee bezig, Opnieuw inleveren,
  Afgerond (met aantallen), selectize-filters Groep / Student / Opdracht, filter opslaan, sortering.
  Of een groepsfilter in de URL komt is nog niet bekeken.
  Titels van meetmomenten bevatten de opleiding: "Meetmoment SD Engels M4", "Meetmoment GA ...",
  "Meetmoment MEP/MIP Engels M1 (Cohort 2026)".
- **Beoordeelscherm** (`/@<gebruiker>/assignment/<uuid>/review`): links `div.review-group-panel` met
  `div.groups-table > a.item` per student (`div.user-status.bg-backport-{success,blank,warning,danger}`,
  geselecteerde student = `div.selected.item`); midden `h1` titel, Omschrijving, Reflecties
  (`div.wrapper-reflection`, rubric-niveaus), Feedback (`textarea`); onderin
  `div.fixed-bottom-bar.assignment-status-bar` met opties Opdracht teruggeven / Beoordeling
  toekennen ("Minimaal 1 rubric moet ingevuld zijn.") / Afronden zonder beoordeling, knop
  `button.ladda-button` "Afronden & volgende" en de deadline. Modal "Rubrics toekenning"
  (`.rubrics-review`) toont per rubric "N criteria nog niet beoordeeld" en een vue-slider.
- **Opdrachten van een groep** (`/groups/school/<uuid>/assignments`): matrix
  `table.table-bordered.rotated-header`, kolommen = studenten (`th.rotated`), rijen = opdrachten
  (`a.divider-plan > mark` titel, aantal beoordelaars), cellen `td[data-status=FINISHED|NOT_STARTED|...]`.
  Filter `select#group-assignments-filter` (selectize) met voorvoegsels Status:, Leerlijn:, Rubric:,
  Student:, Reviewer:, Opdracht:; statussen o.a. Actie nodig, Ingeleverd en verwerkt, Wordt aan
  gewerkt, Niet begonnen, Te laat, Wordt verwerkt.
- **Netwerk (uit het netwerkrapport)**: de app praat GraphQL met `api.simulise.com/graphql` (fetch,
  Apollo-achtig, met `operationName`). Beoordelen-lijst = `assignmentsAssigned` met variabelen
  `page`, `perPage` (standaard 25), `filters` (strings zoals `status:HANDED_IN`) en
  `orderBy { field: UPDATED, direction: ASC }`. Antwoord `assignedAssignments`: `data[]` met o.a.
  `assignment { id title forEducations }`, `user {...}` (persoonsgegevens!), `status`, `deliveredAt`,
  `aspects[].aspect.education`, `educationStatus`, `canBeReviewed`; `aggregations` met `users`,
  `groups`, `statuses`, `assignments` (aantallen per filterwaarde); `paginatorInfo` met `total`,
  `lastPage`, `currentPage`, `hasMorePages`. De URL krijgt `&page=N`.
  Andere operaties: `getTableSettingsForUser` / `userTableSettingsUpdate` (kolommen per gebruiker),
  `shortcutFilterByType` (opgeslagen filters), meldingen via een subscription.
  Derde partijen op de pagina: Help Scout (cloudfront), Cloudflare Insights, visibility.on.simulise.cloud.
- `modules/perpagina.js` (world MAIN) zet bij "Alles op één pagina" `perPage` op 200 (dan 100, dan
  origineel als de server weigert) en `page` op 1, alleen op /assignments/assigned.
  Daarnaast leest het uit het antwoord `aggregations.groups` (key, autocompletion.id/text/value,
  count) en koppelt het elke rij (`data[].id`, = de uuid in de reviewlink `/assignment/<uuid>/`)
  aan groepen door de id's in de rij (zonder `user` e.d.) te vergelijken met die van de groepen.
  Resultaat als JSON op `<html data-sim-groepen>` + postMessage `sd-groepen`. Nog niet op de echte
  Simulise bevestigd welk veld de groep bevat (waarschijnlijk `assignmentConnection.connectable.id`);
  komen alle rijen als "zonder groep", dan klopt de koppeling niet.
- **Meldingen**: menu `#notifications-dropdown > section.dropdown-menu > section.panel` met
  `div.panel-heading` ("Je hebt N ongelezen meldingen.") en `div.list-group > a.media.list-group-item`
  (href `/notification/<id>/process`), gevuld via GraphQL `getLatestUnreadNotification`
  (`notifications(first: 5, unread: true)` letterlijk in de query; velden id, text, icon, owner,
  permalink, createdAt). Pagina `/notifications`: door de server gemaakt (geen JSON), `div.timeline` met
  `article.timeline-item` (eerste = `.active` kop, daarna afwisselend `.alt`), tekst in
  `a.h5.font-thin` met `<b>`-delen, archiveerknop `a[href=/notification/<id>/archive][data-method=POST]`,
  15 per pagina, `ul.pagination` met `?page=N`. Teksten: "<b>naam</b> heeft opdracht <b>titel</b>
  ingeleverd." en "<b>titel</b> van <b>naam</b> staat klaar om beoordeeld te worden".
  Teller: `#notifications-dropdown > a.dropdown-toggle > span.badge.badge-sm.up.bg-danger.count`, ook
  `.nav-user a[href="/notifications"] .badge` (gebruikersmenu) en het tabblad Meldingen op
  /notifications; kop `#notifications-dropdown .panel-heading strong`. `#notifications-dropdown` is
  een `li.hidden-xs` zonder class `.dropdown`. De lijst in het menu wordt pas geladen als je het
  opent (eerst een spinner). Voet van het menu: `div.panel-footer` met tandwiel (instellingen), een
  link met `i.fa-check` (vermoedelijk "alles gelezen"; meldingen.js gebruikt die voor de knop
  "Alles als gelezen markeren", eerst op tooltip, anders op het vinkje) en "Bekijk alle meldingen...". Of `text` in GraphQL HTML met `<b>` is of platte tekst, is nog niet
  gezien; meldingen.js kan beide. `notifications(first: 200, unread: true)` gaf een GraphQL-fout
  (path viewer.notifications, viewer null); waarschijnlijk een maximum. teller.js probeert daarom
  200, 100, 50 en zet wat het deed in `window.__sdTellerStatus` (zichtbaar in het netwerkrapport).
  Bevestigd in de praktijk (v0.10.2): per verzoek komen er hooguit 100, en `page: N` werkt voor de
  volgende pagina's; de teller telt zo alle ongelezen meldingen.
- **Dashboard** (`/@<gebruiker>`): tegels via GraphQL, o.a. `dashboardTileGroups` (`user(id).groupsActive`
  met `id name icon path permalink actionableAssignmentsCount`) en `dashboardTileAssignmentsReviewCount`
  (`assignedAssignments(filters: $filters, page: 1, first: 5)`, `first: 5` letterlijk in de query;
  `data[] { id state permalink assignment { id icon title } deliveredAt statusMessage }`,
  `paginatorInfo.total`). Bruikbaar voor de Beoordelen-tegel op het dashboard (2.1, nog open).
- **Leerlijndiagram** (profiel `/@<gebruiker>`): `dashboardTileEducationDiagram($id)` geeft
  `user.dashboardEducations { id name groups { id name } isDefault isReviewer }` (bij een MEP/MIP-
  student 2: beroeps en BAVA, vermoedelijk). `getUserEducationDiagram($educationId: ID!, $userId: String!)`
  geeft `user.diagramForEducation(id) { id phaseCount aspects { id aspect { id name skill { id color } }
  phases { id phase weights { level title } reviews { id color ... } currentScore reviewProgress
  reviewsAchieved reviewsRequired } } canViewAspectPage canViewReviewPage }` (5 aspecten x 4 fasen).
  `user(id:)` werkt met een String (waarschijnlijk de gebruikersnaam of het id). Netwerkrapport toont
  sinds v0.11.1 de volledige query en voor deze twee operaties ontdane waarden.
- **/groups**: `userGroupsByType(page, perPage 15, filters, orderBy, only: SCHOOL_GROUP)` met per groep
  `id name fullPath permalink studentsCount teachersCount actionableAssignmentsCount ...`. Tabel
  `table.table-index`, per rij `td > div.btn-group.m-t-none > button.btn.btn-sm.btn-info.dropdown-toggle`
  met een menu (links naar community, students, teachers, assignments, templates, settings).
  Plek voor "Voortgangsrapporten" (wens van de gebruiker).
- Inline in de pagina: Vue-modals hebben id's als `vue-modal-<hash>`: niet op selecteren.

## Open punten / bekende issues

- Lege band onder de topbar: huidige fix zit op
  `#content > .vbox > .vbox > header.header-md { margin-top: 0 }`. Nog niet bevestigd dat dit werkt.
- Alleen het dashboard is gestyled op basis van een echt rapport. Beoordelen, Groepen en
  Portfolio hebben alleen de generieke regels.
- Dark mode op Bootstrap 3: modals, selectize en de Help Scout-widget hebben mogelijk nog
  hardcoded wit.

## Volgende stappen (zie ROADMAP.md)

1. Filter in Beoordelen (2.1) staat in v0.6.0. Nog open: dezelfde regels op de Beoordelen-tegel
   van het dashboard (rapport van het dashboard nodig). "Mijn groepen" staat in v0.8.0.
2. Beoordeelqueue over alle groepen (2.2).
3. Beoordeelscherm (2.3/2.4): statusbalk met open rubrics/criteria, volgende student. De structuur
   staat hierboven.

## Regels

- Nederlands in UI-teksten en commentaar. Geen gedachtestreepjes (—) in Nederlands.
- Geen persoonsgegevens van studenten in code, commits, logs of documentatie. Klasnamen zijn ok.
- Niets naar externe servers sturen; alles lokaal in de browser. Enige uitzondering: de
  updatecontrole haalt bij GitHub het versienummer en de zip op (er gaat niets mee). Alleen de bestaande
  Simulise-sessie gebruiken, geen eigen opslag van studentdata buiten `chrome.storage` voor
  instellingen.
- Buiten scope: Teams-koppeling. Simulise heeft geen publieke API; Teams for Education geen LTI.
  Een koppeling zou via Microsoft Graph + Simulise's interne GraphQL moeten.
