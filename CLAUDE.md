# Simulise Docent: projectcontext voor Claude Code

Chrome-extensie (Manifest V3) voor `https://*.simulise.com/*`, de e-portfolio-omgeving van
Mediacollege Amsterdam (tenant `ma`). Gebruiker is docent/curriculumontwikkelaar (Mark). Hij heeft
geen testaccount of testklas; alles wordt getest op zijn eigen docentaccount.

Mapnaam: `simulise-docent`. Extensienaam in Chrome: "Simulise Docent".

Zusterproject: "Docent Tools voor Magister" (aparte extensie, zelfde maker, mark-jg/magister-docent).
Die heeft een eigen Inspector, maar die draait alleen op magister.net. Voor Simulise gebruik je de
Inspector van deze extensie (v0.5.0+, ontwikkelaarsmodus): rapporten komen als
`simulise-rapport-<pad>.md` met namen al vervangen.

## Huidige staat (v0.19.0)

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
                vandaag.js (scherm Vandaag, roadmap 2.2: eigen startscherm in een shadow root, geplaatst in #content: de kinderen van #content worden verborgen en komen
                terug bij sluiten, bovenbalk en zijbalk blijven staan; hoogte calc(100vh - top) omdat #content een tabelcel is;
                menu-item bovenaan aside#nav, Cmd+K, of #vandaag in het adres; eigen vraag sdDocentVandaag via gql.js
                voor open (BEING_PROCESSED, FEEDBACK_ASKED, HANDED_IN) en FINISHED, 100 per pagina; één regel per
                opdracht en groep; regels uit regels.js; chrome.storage.local vdDag = { datum, start, dagen } met
                alleen tellers en datums),
                klassen.js (SD.klassen: huidige klassen via sdDocentKlassen = viewer.groupsByType(only: SCHOOL_GROUP), zonder
                gearchiveerde; wat op jou wacht per klas via sdDocentKlasTellers; vaste kleur per klas op volgorde van naam;
                chrome.storage.local sdKlassen = { tijd, lijst: [{ id, naam, wacht }] }, 5 minuten houdbaar),
                schil.js (proef, alleen als theme === 'helder': zet data-sim-schil op <html>; zijbalk rond taken met CSS
                order en data-sd-deel per li, koppen li.sd-schil-kop, klassen li.sd-schil-klas > a.sim-docent-klas[data-klas];
                woordenlijst TAAL voor vaste woorden in #content en de bovenbalk, alleen hele tekstknopen; label .sd-klaschip
                per rij in Beoordelen uit ?group= in de reviewlink; terug() zet alles terug bij een ander thema).
                vandaag.js doet ook de thuispagina per klas: open({ id }) of #klas=<uuid>, filter group:<uuid>, tegels uit
                aggregations.statuses (DEADLINE_PAST, NOT_STARTED, FINISHED), snelkoppelingen naar /groups/school/<uuid>/...
                Kop `.held` met klasse ochtend | middag | avond (naar het uur) of klas (kleur van de klas); voornaam uit
                `.nav-user .dropdown-toggle` (alleen in beeld); weekstippen uit vdDag.dagen; op de klaspagina een derde vraag
                (status:NOT_STARTED,IN_PROGRESS,DEADLINE_PAST) voor de stippenkaart, de tegels tellen dan de rijen zelf.
                tools/rooktest.js bewaart met SD_BEELD=<map> schermafbeeldingen van Vandaag en de klaspagina.
                core.js heeft SD.gql(operationName, query, variables) voor vragen via de brug.
                focus.js (focusmodus op /@gebruiker/assignment/<uuid>/review: zet data-sim-focus, data-sim-focus-opdracht en
                data-sim-focus-kolom op <html>, opmaak in theme.css; markeert de blokken met h2 "Omschrijving", "Reflecties"
                en "Feedback" als data-sd-focus="omschrijving | rubric | feedback"; zijkolom vanaf 1100px: rubric, feedback en
                .assignment-status-bar met position: fixed rechts, hoogtes gemeten in --sdf-balk en --sdf-onder (ResizeObserver);
                de blokken worden niet verplaatst in de DOM (Vue beheert ze); eigen balk #sim-docent-focus in een shadow root;
                klikt op het item van Simulise om naar een andere student te gaan; instellingen focus, focusAan, focusKolom).
                Zet ook --sdf-klas, --sdf-klasnaam, --sdf-kop en --sdf-tel op <html> (klas uit ?group= via SD.klassen, tellers uit
                de lijst); theme.css toont die teksten met content: var(...) op ::before/::after van elementen van Simulise, zodat
                er niets in de door Vue beheerde kop hoeft te worden ingevoegd. theme.css heeft drie focusblokken: "Focusmodus bij
                het beoordelen" (alle thema's), "Focusmodus: lijst met alleen namen, en een compacte rubric" (alle thema's) en
                "Focusmodus in het thema Helder (één samenhangend ontwerp)". Dat laatste blok is het hele Helder-ontwerp; de
                selectors beginnen met html:root:root[...] zodat het wint van de algemene blokken. Pas het als geheel aan en proef
                het als geheel: eerdere gestapelde Helder-blokken botsten onderling (een regel met een extra klasse won van een
                latere), wat in de proef niet te zien was omdat daar alleen het nieuwste blok in zat. focus.js meet ook
                --sdf-rubric en toont de toelichting (.tip in de shadow root) bij een niveau.
                De eigen balk is een vaste strook van 52px bovenaan; plaats() meet de rechterrand van .review-group-panel en de
                breedte van de kolom (uit de plek van .assignment-status-bar) en zet --fb-l en --fb-r op de shadow host.
                zoeken.js (Cmd+K; indexeert alleen aside#nav-links en /groups/school/<uuid>, groepsnamen in
                chrome.storage.local.sdGroups), zijbalk.js (data-sim-nav-mini, knop linksonder)
                inspector.js (alleen als `developer` aan staat; Alt+I, R = rapport met namen vervangen,
                S = alleen structuur, N = netwerkrapport). netlog.js draait in de pagina (world MAIN) en
                legt fetch/XHR alleen vast bij data-sim-netlog op <html>; alleen opbouw, geen waarden.
                Modules met `dev: true` in registry staan onder Ontwikkelaarsmodus.
                core.js biedt ook SD.addCommand (voor Cmd+K), SD.ready, SD.shadowHost en SD.observe.
                Eigen UI altijd in een shadow root, met de --sim-*-tokens (die erven door).
rapport/        Voortgangsrapporten. standaard.js (SD_RAPPORT_STANDAARD: profiel MEP/MIP 2026-2027,
                SD_RAPPORT_VOORBEELD: verzonnen student), render.js (SDRapport.bereken/html: A4-rapport met
                SVG-diagrammen, doelstap uitvergroot, vergelijking vorige periode, categorieën, normen),
                profielen.html/.js (profielen beheren in chrome.storage.local rpProfielen, live voorbeeld).
                modules/rapporten.js: knop "Voortgangsrapport" op het profiel (kaart Opleidingen) en
                "Voortgangsrapporten" in het menu per groep op /groups; haalt via modules/gql.js (world MAIN,
                GraphQL-brug met de headers van de app, postMessage sd-gql / sd-gql-antwoord) de
                opleidingen (sdRapportStudent) en diagrammen (sdRapportDiagram) op; studenten van een groep
                uit de HTML van /groups/school/<uuid>/students (links /@gebruiker). Rapport opent in een
                nieuw tabblad (alleen geheugen) met een werkbalk (rapporten.js toonRapport): soort
                (student | gesprek | groep), peildatum (historisch via historie), vergelijkMet, onderdelen,
                opleidingen, nadruk, sorteer, filter, CSV. Keuzes in chrome.storage.local rpOpties.
                render.js: SDRapport.paginas/shell/csv/modellen naast html. Soort `perioden` ("Meetmomenten
                naast elkaar"): per leerlijn een kolom per periode met de stap aan het eind ervan (stapOp).
                Op /analytics/educationbygroups/result knop "Overzicht & rapporten" (analyticsRapport): herhaalt
                de getResults-vraag van de app (gql.js kijkt mee) voor alle pagina's (hasMore) en voor elke
                opleiding uit /api/autocomplete/analytics/educations die het profiel herkent (picker EDUCATION
                vervangen, pickers met ASPECT/LEERLIJN alleen bij de huidige opleiding); rijen per student
                samengevoegd; opleidingen zonder enige beoordeling (ander cohort) vallen weg.
                rapport/weergave.js (SDWeergave.open/toon): het rapport in de pagina zelf. Verbergt de kinderen van
                #scrollable-page-wrapper (anders #content), knop Terug zet ze terug. Bewust geen shadow root: de
                opmaak komt van de klassen van Simulise (panel, table-index, label, btn, form-control); eigen
                klassen met voorvoegsel sdw-, stijl in <style id="sdw-css">. Weergaven perioden | groep | student
                (keuze in rpOpties webSoortGroep/webSoortStudent). Excel = CSV-export; Afdrukken roept
                rapporten.js toonRapport aan met een echt venster (printVenster), de A4-versie van render.js.
content.js      Start de modules (SD.start())
popup.html/.js  Aan/uit per module (uit registry), themakeuze, compact, updatemelding
ROADMAP.md      Roadmap en backlog met status per item; bijwerken als iets klaar is
icons/          iconen, gemaakt met scripts/make-icons.py
```

Thema's zijn alleen tokenblokken (`html[data-sim-theme="naam"] { --sim-* }`). Donkere thema's
staan in `DARK` in modules/thema.js. Nieuwe thema toevoegen = tokenblok + naam in `THEMES` (popup.js)
+ evt. `DARK`.

Instellingen in `chrome.storage.sync`, plat: `{ enabled, theme, compact, hideSupport, grading, bdModus, bdOpleidingen, bdUitsluiten, bdEenPagina, bdGroepen, today, shell, shellMeer, focus, focusAan, focusKolom, notifFilter, reports, search, navToggle, navMini, updateCheck, developer }`.
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
  Volledige query van de app: `phases { id phase weights { level title } reviews { id color score title
  maxScore scoreName } currentScore reviewProgress reviewsAchieved reviewsRequired }`. Weights: -1 Niet
  beoordeeld, 0 Nog niet aangetoond, 1 Op koers, 2 Boven verwachting. Review-`title` is "Beoordeling
  DD-MM-JJJJ: <niveau>" (enige bron van de datum). Een fase is behaald als reviewsAchieved >=
  reviewsRequired; currentScore is het niveau. Opleidingen bij een MEP/MIP-student: "BAVA 4" en
  "Mediaproducer / Music Industry Professional". De studentenpagina van een groep doet geen GraphQL
  voor de lijst (HTML), en daar stonden geen links naar /@gebruiker: rapporten.js valt terug op de
  opdrachtenpagina van de groep (`th.rotated a[href=/@gebruiker/assignments]`, naam in
  `.rotated-header-content`). Of `skill { name }` bestaat is niet bekend; rapporten.js probeert het.
  Een eigen vraag `user(id: <gebruikersnaam>) { id name username dashboardEducations ... }` gaf
  "This action is unauthorized." Daarom kijkt modules/gql.js mee met de vragen van de app
  (dashboardTileEducationDiagram, getUserEducationDiagram: tekst, variabelen, opleidingen) en
  hergebruikt rapporten.js die. Het soort id (gebruikersnaam / dashboardId) en de vraagteksten staan in
  chrome.storage.local.rpAppKennis (geen studentgegevens); het netwerkrapport toont bij id-variabelen
  alleen het soort («gebruikersnaam uit de url», «uuid»).
- **/groups**: `userGroupsByType(page, perPage 15, filters, orderBy, only: SCHOOL_GROUP)` met per groep
  `id name fullPath permalink studentsCount teachersCount actionableAssignmentsCount ...`. Tabel
  `table.table-index`, per rij `td > div.btn-group.m-t-none > button.btn.btn-sm.btn-info.dropdown-toggle`
  met een menu (links naar community, students, teachers, assignments, templates, settings).
  Plek voor "Voortgangsrapporten" (wens van de gebruiker).
- **Analytics** (`/analytics`): zes kaarten in `#scrollable-page-wrapper div.row > div.col-lg-4.col-sm-12.col-xs-12.m-b-xs.col-md-6 >
  section.panel.panel-link.hbox` (icoon `div.panel-link-icon.bg-*` met `a.h3` titel, `button.btn.btn-success.btn-sm`
  "Nieuwe rapportage", `div.panel-link-body`, `div.panel-footer` "Geen opgeslagen rapportages"): Leerlijnen,
  Leerlijnen per groep, Opdrachten per student, Status opdracht over groepen, Portfolio, Status sjablonen.
  GraphQL `analyticsQueryTypes { type icon title color description reportCount }`. Wat een rapportage
  "Leerlijnen" ophaalt is nog niet gezien (kan de voortgang van een hele groep in één keer geven).
  rapporten.js voegt een zevende kaart "Voortgangsrapporten" toe (groepen uit sdGroups).
- **Analytics, Opleiding per groep** (`/analytics/educationbygroups/result?type=educationbygroups&view=table&education=…&users=…&timerange=…`):
  GraphQL `getResults($reportId, $query: AnalyticsQueryInput)` -> `analyticsQuery { table { rows { header { link value { ... on User
  { id name username } } } columns { ... on EducationByGroupsTableRowCell { aspect { id name skill { id color } } phases { phase score
  color maxScore scoreName aspectPhaseUrl reviewProgress reviewsAchieved reviewsRequired weights { level title } reviews { id score
  color title maxScore } } } } } header { columns { value { id ... on Skill { name } } } } total hasMore } }`. Variabelen
  `{ reportId: null, query: { type, pickers: [{ key, values }] x4 (EDUCATION en andere), options, page, orderBy { field: LASTNAME } } }`;
  25 rijen per pagina, knop "Laad meer...". Fasen: beroeps 4, BAVA 5. Opleidingen: `/api/autocomplete/analytics/educations?query=&page=1`
  ([{ id text value prefix }]). Kop: `header .header-title` met `div.btn-group` Filters en `a.btn.btn-info` met `i.fa-download`;
  keuzes als `ul.list-inline li.list-group-item` (opleiding met `i.fa-school`, groep, tijdsbereik, weergave tabel/diagram).
  Tabel `#scrollable-page-wrapper table.table-index`, cellen `a.score-dot[href=/@{gebruiker}/education/aspect/{uuid}/phase/{n}]`.
- Op /groups staan in het groepsmenu links met teksten als "Studenten"; zoeken.js slaat links in
  `.nav-tabs, .dropdown-menu, .btn-group` over en ruimt zulke namen op (GEEN_NAAM).
- Inline in de pagina: Vue-modals hebben id's als `vue-modal-<hash>`: niet op selecteren.

## Wat we weten uit de live analyse (november 2026)

- **Beoordelen, filters in de URL**: `filters=group:<uuid>,<uuid>|status:A,B` (meerdere groepen met komma's). De schakelaar
  Meetmomenten zet `for_educations:true` (alleen meetmomenten); `for_educations:false` haalt Simulise zelf weer weg.
  In GraphQL is `filters` een lijst met dezelfde stukken: `["status:BEING_PROCESSED,FEEDBACK_ASKED,HANDED_IN"]`,
  `orderBy: AssignedAssignmentsOrder { field: UPDATED, direction: ASC }`.
- **assignmentsAssigned, bevestigd**: per rij `status`, `deliveredAt`, `endDate`, `connectableKey` ("connectable:<uuid>"),
  `assignment { id title forEducations }`, `assignmentConnection { id connectable { id } }` (connectable.id = de groep, gelijk
  aan `aggregations.groups[].key`), `user { username }`. `aggregations.statuses[] { key count }` bevat ook FINISHED, ook als
  je daar niet op filtert. De reviewlink is
  `/@{gebruiker}/assignment/<rij-id>/review?_continue=/assignments/assigned&group=<groep>&filter_source=GROUP_ASSIGNMENTS&filters=reviewer:*|group:<groep>|connectable:<uuid>`.
  Een eigen vraag met `aggregations { ... }` geeft "Internal server error" (path assignedAssignments.aggregations) tenzij
  `__typename` in dat blok staat; de rijen zelf hebben dat niet nodig. Bevestigd met de vraag van modules/vandaag.js.
- **Opdracht aanmaken** (`/school/assignment/create`, bewerken: tabs `/edit`, `/badges`, `/deliverables`, `/connections/create`):
  vier stappen plus afronden, elke stap slaat op. Mutaties (uit de code van Simulise, niet zelf verstuurd):
  `assignmentCreate` / `assignmentUpdate`, `assignmentBadgesUpdate`, `assignmentDeliverablesUpdate`,
  `assignmentConnectionCreate`, `assignmentWizardFinish(id, activate)`. Verplicht: Opleidingen, Groepen, Startdatum.
- **Labels ("school topics")**: per onderdeel aan of uit (`getTopicsForFeature`, `schoolTopicUpdateEnabled`, beheerpagina
  `pages/manage/topics`), met `required` en `canCreateLabelsInline`. Bij opdrachten: Opleidingen, Deelaspecten, Tags, Cohorten,
  Modules (M01 t/m M12), Versies. Het label **Vakken** (`labels(only: [SUBJECTS])`) bestaat en staat op rubrics (Nederlands,
  Burgerschap, Engels, Rekenen); de opdrachten- en lesplannenlijst hebben een kolom Vakken, maar het opdrachtformulier
  heeft het veld niet.
- **Paginaopbouw**: `body > section#app.vbox` (display table) > `header.header.navbar` (bovenbalk, 60px) + `section`
  (position absolute, top 60px, met `transition: 0.3s linear`) > `section.hbox.stretch` > `aside#nav` + `section#content`
  (tabelcel). Wie de bovenbalk verbergt moet dat vak op `top: 0` zetten met `transition: none`.
- **Beoordeelscherm, aangevuld**: `#scrollable-page-wrapper > div.flex-wrapper.flex-row` > `div.review-group-panel` (sticky,
  150px; alleen plaatjes, geen namen in tekst) + `div.flex-wrapper.flex-column.flex-grow` met `div.width-filling-header`
  (omslag, 250px, daarin `div.assignment-details > h1`, een `div.badge-pill` en `div.footer-details`), dan
  `div.fluid-container-max-width` (max 1600px) met blokken met een `h2`: Omschrijving (bij deze opdracht 1400px hoog, staat
  boven het werk), de inleverstukken (bijv. "Ingevulde pagina"), Reflecties, Feedback; daaronder
  `div.fixed-bottom-bar.assignment-status-bar` (sticky). In de lijst: `a.item` per student, de huidige is
  `div.selected.item`; status `div.user-status.bg-backport-success | warning | danger | blank`. Een klik op `a.item` gaat
  zonder herladen naar die student. Een inlevering openen die al "Wordt beoordeeld, door mij" is verandert niets.
  De lijst klapt uit met de knop `div.circle-button` onderaan (class `expanded`, 300px breed, rijen van 45px met
  `div.usercard > div.user-name` en `div.user-status` van 60px; onthouden in localStorage
  `ui:assignment:review-group-panel:expanded`). `#scrollable-page-wrapper` heeft soms `top: 54px` (hoogte van de kruimelkop).
  De onderbalk: `div.progress-wrapper > div.progress-items > div.d-flex.flex-column.flex-md-row` met
  `div.assignment-review-container` (de drie keuzes) en `div.assignment-review-submit` (knop en melding). Geen voorouder
  met transform of contain, dus position: fixed werkt ten opzichte van het venster.
  De drie keuzes zijn `div.group-list-items > div.d-flex.flex-md-row.flex-column` met `div.control` (rondje), `div.meta`
  (tekst) en `div.extra` (melding): een regel op `.flex-md-row` in de onderbalk raakt dus ook deze rijen. Rubric:
  `div.wrapper-reflection > div.badge-wrapper` met `h3.collapsable` (`span.title`, 20px), `div.badges-title-wrapper`
  (niveaus met plaatjes van 50px) en per onderdeel `div.reflection-wrapper` (`h4` + `div.reflection-items > div.item`).
  Feedback: `div.new-chat-item > div.author + div.message.input-group` (textarea en twee `div.btn-info`).
  Kleuren van Simulise op dit scherm: lijst `rgb(74, 77, 87)`, groen `rgb(7, 181, 151)` (knoppen, `.background-brand-success`)
  en `rgb(13, 146, 121)` (koppen `h3.collapsable`), statusvakken `bg-backport-*` als lichte tinten; overal
  `letter-spacing: 0.75px` binnen `.smls-ui`. Toestanden: gekozen niveau in de rubric is `.content.selected`; een niet-gekozen
  keuze in de onderbalk heeft `background-brand-light-3` en `border-gray-c` (de gekozen stand is niet gezien, dus alleen die
  twee klassen overschrijven). De ingebouwde browser van de Claude-app kan geen bestanden van localhost laden op een
  https-pagina; proefopmaak moet als tekst in de pagina worden gezet.
  In een niveaukaart bevat de verborgen `strong.d-md-none` de naam van het niveau ("Niet voldaan", "Voldaan") plus een
  mobiele `div.authors.d-lg-none`; de zichtbare `div.authors.d-none.d-md-flex` (absoluut, bottom -15px, `a.avatar > img` van
  30px) is het plaatje van de student bij het niveau dat hij zelf koos. `div.badges-title-wrapper` herhaalt de niveaunamen met
  percentage. `h3.collapsable` bevat een `div.invisible` met de knop Reset (neemt ruimte in zolang hij onzichtbaar is).
  Onder de omslag: `.full-width-wrapper` heeft margin-bottom 30px en de eerste `h2` margin-top 30px.
  Ingeklapt is elke rij `a.item` (110x45) > `div.usercard` (60x45, padding 5px 10px) > `img.avatar` (34x34); de lijst
  `div.groups-table` krijgt van Simulise een vaste max-height (scrolt zelf). Een keuze in de onderbalk is `div.control`
  (22x22, geen input) + `div.meta` + `div.extra`. Les uit de reeks aanpassingen aan de balk: eerst het geheel ontwerpen en
  op de echte pagina proeven, dan pas in theme.css zetten; losse correcties op elkaar leveren een rommelig beeld op.
  Ingeklapt staat er in de lijst geen naam in de DOM (alleen `img.avatar`, zonder alt of title); uitgeklapt staat er alleen
  `div.user-name`, zonder plaatje. Een niveaukaart is `div.item > div.flex > div.content` (flex kolom) met een verborgen
  `strong` en als laatste kind de `div` met de tekst; `div.authors` hangt er absoluut onder.
  In de zijkolom (v0.19) staan deze drie zonder eigen kader op één achtergrondvlak (`#content::after`); zo paste de
  rubric van deze opdracht (567px) in zijn geheel, met feedback (137px) en onderbalk (165px) eronder, bij 983px hoogte.
- **Zijbalk**: `aside#nav.bg-dark.aside-md` (ingeklapt door Simulise zelf: class `nav-xs`) > `section.vbox` > ... >
  `ul.nav.nav-main` met `li[data-page?] > a[href][data-original-title][vue-href?] > i.fa.fa-fw + span` en scheidingen
  `div.line.dker` tussen de li's. Start is `li[data-page="dashboard"]` met href de kale site.
- **Klassen**: `viewer.groupsByType(page, first, filters: [String!]!, orderBy: GroupsOrder, only: GroupType!)` met
  `... on SchoolGroup { id name isArchived isFavorited actionableAssignmentsCount studentsCount }`. Voor deze docent 33
  groepen waarvan 27 gearchiveerd (eerdere jaren, zelfde namen). In `assignedAssignments` werkt een groepsfilter als
  eigen element in de lijst: `filters: ["status:...", "group:<uuid>"]` (niet met een | in één tekst). De
  `aggregations.statuses` volgen dan het groepsfilter maar niet het statusfilter.
- **Tellers**: de Beoordelen-tegel telt alleen waar jij beoordelaar bent; de groepstellers (`status:actionable`) tellen alle
  beoordelaars. In de matrix verbergt "Actie nodig" alleen rijen, niet de cellen.
- **Andere beoordeelroutes**: Bulk in Beoordelen ("Afronden met beoordeling" naar `/assignments/review/bulk`) en beoordelen op
  leerlijn (`/@{gebruiker}/education/<id>/review`, `/@{gebruiker}/education/aspect/<id>/review`).
- **Analytics**: zeven kaarten met `href="#"`; kaart, tussenpagina `/analytics/<type>/reports`, dan `/analytics/<type>` met een
  wizard. Het resultaatadres bevat alle keuzes.
- Een eigen introspectievraag (`__type`) is niet geprobeerd op de echte server; blijf bij vragen die de app zelf ook stelt.

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
2. Beoordeelqueue over alle groepen (2.2): scherm Vandaag staat in v0.18.0, nog bevestigen in Simulise zelf.
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
