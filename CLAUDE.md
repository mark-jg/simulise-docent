# Simulise Docent: projectcontext voor Claude Code

Chrome-extensie (Manifest V3) voor `https://*.simulise.com/*`, de e-portfolio-omgeving van
Mediacollege Amsterdam (tenant `ma`). Gebruiker is docent/curriculumontwikkelaar (Mark). Hij heeft
geen testaccount of testklas; alles wordt getest op zijn eigen docentaccount.

Mapnaam: `simulise-docent`. Extensienaam in Chrome: "Simulise Docent".

Zusterproject: "Docent Tools voor Magister" (aparte extensie, zelfde maker). Daar zit een
"Inspector" in die pagina-rapporten (outerHTML + screenshot) oplevert; die wordt ook op Simulise
gebruikt door het Simulise-domein aan de `matches` toe te voegen.

## Huidige staat (v0.2.0)

```
manifest.json   MV3, permissions: storage, content_scripts op simulise.com (css + js, document_start)
theme.css       Alle opmaak. Tokens per thema bovenin, daarna generieke regels.
content.js      Zet data-sim-theme / data-sim-dark / data-sim-compact op <html> vanuit chrome.storage.sync
popup.html/.js  Themakeuze (auto, light, dark, discord, tiimo, nord, paper, mocha), aan/uit, compact
icons/          placeholder-iconen
```

Thema's zijn alleen tokenblokken (`html[data-sim-theme="naam"] { --sim-* }`). Donkere thema's
staan in `DARK` in content.js. Nieuwe thema toevoegen = tokenblok + naam in `THEMES` (popup.js)
+ evt. `DARK`.

Instellingen in `chrome.storage.sync`: `{ enabled, theme, compact }`.

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

## Open punten / bekende issues

- Lege band onder de topbar: huidige fix zit op
  `#content > .vbox > .vbox > header.header-md { margin-top: 0 }`. Nog niet bevestigd dat dit werkt.
- Alleen het dashboard is gestyled op basis van een echt rapport. Beoordelen, Groepen en
  Portfolio hebben alleen de generieke regels.
- Dark mode op Bootstrap 3: modals, selectize en de Help Scout-widget hebben mogelijk nog
  hardcoded wit.

## Volgende stap: module "Beoordelen" (v0.3)

Wacht op Inspector-rapporten van: (1) Beoordelen-lijst, (2) één opdracht in beoordeling,
(3) opdrachtenpagina van één groep. Dan bouwen:

1. **Filter in Beoordelen** (prioriteit): filterbalk boven de lijst met
   "Mijn groepen" (MEP1A, MEP2A, MIP1A, MIP1B, MR1A), "Verberg meetmomenten", "Alles".
   Plus beheerbare uitsluitwoorden in het popup. Verborgen aantal zichtbaar houden
   ("12 verborgen"). Zelfde regels toepassen op de Beoordelen-tegel op het dashboard.
   Filteren op rij-inhoud (groep, titel, type), niet op id's. MutationObserver voor
   re-renders en paginering. Check of Simulise groep/opleiding in de URL-filters ondersteunt.
2. **Beoordeelqueue over alle groepen**: samenvoegen van de per-groep actionable-lijsten tot
   één lijst (student, opdracht, groep, ingeleverd op, wachttijd).
3. **Beoordeelscherm**: statusbalk met welke rubrics in te vullen zijn en wat afronden doet
   met het competentiediagram; "volgende student"-knop binnen één opdracht.
4. Later: Cmd+K zoeken, export naar Excel, studentkant (startscherm "wat moet ik nu doen").

Architectuur-idee: `modules/<naam>.js` per feature, elk met eigen aan/uit in het popup,
zoals in de Magister-extensie.

## Regels

- Nederlands in UI-teksten en commentaar. Geen gedachtestreepjes (—) in Nederlands.
- Geen persoonsgegevens van studenten in code, commits, logs of documentatie. Klasnamen zijn ok.
- Niets naar externe servers sturen; alles lokaal in de browser. Alleen de bestaande
  Simulise-sessie gebruiken, geen eigen opslag van studentdata buiten `chrome.storage` voor
  instellingen.
- Buiten scope: Teams-koppeling. Simulise heeft geen publieke API; Teams for Education geen LTI.
  Een koppeling zou via Microsoft Graph + Simulise's interne GraphQL moeten.
