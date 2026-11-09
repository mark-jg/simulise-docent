# Simulise Docent

Chrome-extensie voor Simulise: thema's (v0.2) en vanaf v0.3 docent-tools zoals filteren en
sneller beoordelen. Alles draait lokaal in je browser. Het enige netwerkverkeer buiten Simulise
is de updatecontrole bij GitHub (alleen versienummer en downloadlink, er gaat niets over jou mee).

## Installeren (lokaal)
1. Download de nieuwste `simulise-docent-vX.Y.Z.zip` van de
   [Releases-pagina](https://github.com/mark-jg/simulise-docent/releases/latest) en pak hem uit in een
   map die je laat staan (bijvoorbeeld `Documenten/simulise-docent`).
2. Ga naar `chrome://extensions`, zet rechtsboven "Ontwikkelaarsmodus" aan.
3. Klik "Uitgepakte extensie laden" en kies de map met `manifest.json`.
4. Open ma.simulise.com. Via het extensie-icoon kies je een thema.

## Bijwerken
De extensie kijkt om de 6 uur op GitHub of er een nieuwere release is. Is die er, dan krijgt het
icoon een gele badge en staat bovenin de popup een blok met "Nu bijwerken naar X". Alles gebeurt in
de popup:
1. De eerste keer klik je op "Extensiemap kiezen" en kies je de map waarin de extensie staat (de map
   met `manifest.json`); die keuze wordt onthouden. Lukt het kiezen niet vanuit de popup, dan opent
   de updatepagina (ook bereikbaar via rechtsklik op het icoon > Opties) en kies je de map daar.
2. Klik "Nu bijwerken naar X". Chrome vraagt om toestemming voor de map (één klik). De extensie
   haalt de zip op, schrijft de bestanden in de map en herlaadt zichzelf. Herlaad daarna je
   Simulise-tabbladen.

Op de updatepagina zet je ook het automatisch controleren aan of uit.

Er worden alleen bestanden geschreven of overschreven, nooit verwijderd. Het manifest wordt als
laatste geschreven, zodat een afgebroken update geen half nieuwe extensie achterlaat. Handmatig kan
ook: zip downloaden, over de extensiemap uitpakken en op ↻ klikken bij `chrome://extensions`.
Met git: deze repo clonen, die map laden, en bijwerken met `git pull` plus ↻.

Versie 0.2.0 had nog geen updater: zet 0.2.1 één keer handmatig over je extensiemap, daarna gaat het
vanzelf.

## Bestanden
- `theme.css`  alle opmaak, met tokens per thema bovenin
- `modules/`  modulelijst (`registry.js`), kern (`core.js`) en de modules zelf (`thema.js`, `zoeken.js`,
  `zijbalk.js`, `inspector.js`, `hulpknop.js`)
- `scripts/make-icons.py`  maakt de iconen in `icons/` (`python3 scripts/make-icons.py icons`, vereist Pillow)
- `content.js` start de modules
- `ROADMAP.md`  roadmap en backlog
- `popup.html` / `popup.js`  modules aan/uit, themakeuze, compacte weergave, updates
- `background.js` updatecontrole bij GitHub Releases (om de 6 uur), badge op het icoon
- `update/`  updatepagina en zelf-updater (`updater.js`)
- `scripts/release.sh`  nieuwe versie uitbrengen
- `.github/workflows/release.yml`  maakt automatisch een release bij een nieuw versienummer op `main`
- `tools/rooktest.js`  rooktest in headless Chromium (zie Testen)
- `CLAUDE.md`  projectcontext voor Claude Code

## Thema toevoegen
Kopieer een tokenblok in `theme.css`, geef het een nieuwe naam, en zet die naam in `THEMES`
(popup.js) en, als het donker is, in `DARK` (modules/thema.js).

## Module toevoegen
Maak `modules/<naam>.js` met `SD.register({ id, init, update, destroy })`, zet een regel in
`modules/registry.js` (naam, uitleg, instelling) en voeg het bestand toe aan `content_scripts` in
`manifest.json`, vóór `content.js`. De popup toont de aan/uit-knop dan vanzelf.

## Bekende aandachtspunten
- Lege band onder de topbar: fix zit op `#content > .vbox > .vbox > header.header-md`. Nog te bevestigen.
- Alleen het dashboard is gestyled op basis van een echt rapport.

## Ontwikkelaarsmodus en Inspector
Zet onderaan de popup **Ontwikkelaarsmodus** aan. Daarna start je de Inspector met **Alt+I** op een
Simulise-pagina, met de knop **Inspector starten** in de popup, of via Cmd+K.
- Beweeg over een element: onderin staat de CSS-selector. Klik om die te kopiëren.
- **R**: paginarapport (koppen, tabellen met de eerste rijen, filters en knoppen, linkpatronen en de
  structuur van de pagina). Wordt gedownload als `.md` en gekopieerd; stuur het naar Claude.
- **S**: alleen de structuur (tags en classes), zonder enige tekst. Voor als je twijfelt.
- **N**: netwerkrapport: welke verzoeken de pagina deed sinds het laden (met de ontwikkelaarsmodus
  aan), met adres, namen van parameters en velden en hun type. Geen waarden, behalve getallen bij
  paginering (page, per_page, total, ...) en vaste codes zoals HANDED_IN. Vastgelegd door
  `modules/netlog.js`, dat alleen meekijkt als de ontwikkelaarsmodus aan staat.
- **Esc**: stoppen.

Privacy: namen die Simulise als persoon toont (links naar personen, avatars, elementen met
"name"/"student"/"user" in de class) worden "Student 1", "Student 2"; andere namen van twee of
meer woorden met hoofdletter worden [naam]; e-mailadressen [e-mail]; nummers van 6 tot 9 cijfers
[nummer]; gebruikersnamen (@...) @[gebruiker] en in links /@{gebruiker}; getallen in URL's {id}. Een losse voornaam zonder achternaam ergens in de tekst wordt
niet altijd herkend: kijk een rapport daarom even na voordat je het deelt, of gebruik S.

## Nieuwe versie uitbrengen
Releases gaan automatisch: zodra er op `main` een nieuw versienummer in `manifest.json` staat,
maakt GitHub Actions de tag `vX.Y.Z`, de zip `simulise-docent-vX.Y.Z.zip` en de release.
1. Pas de code aan en zet een regel `- X.Y.Z: ...` bovenaan **Wijzigingen** hieronder. Die regel
   wordt de tekst van de release; zonder die regel stopt de workflow met een foutmelding.
2. Zet het versienummer in `manifest.json` op X.Y.Z en push naar `main`. Of laat
   `scripts/release.sh X.Y.Z` dat doen.
3. Geïnstalleerde extensies zien de nieuwe versie bij de volgende controle (uiterlijk na 6 uur, of
   direct via "Controleer op updates" in de popup).

Een push zonder nieuw versienummer maakt geen release. De workflow is ook met de hand te starten
(Actions > Release > Run workflow).

## Testen
`node tools/rooktest.js` laadt de extensie in headless Chromium. Simulise en GitHub worden lokaal
nagebootst (geen netwerk, geen echte data). De test controleert het content script, de popup, de
updatecontrole met badge, en of een zip zoals de workflow die bouwt goed uitpakt.

## Wijzigingen
- 0.6.1: Inspector: netwerkrapport met toets N. Laat zien welke verzoeken Simulise doet (adres, parameters,
  veldnamen en paginering), zonder waarden. Nodig om de Beoordelen-lijst straks in één keer op te halen.
- 0.6.0: filter in Beoordelen. Boven de lijst staat een balk met Alles / Mijn opleidingen: meetmomenten
  van andere opleidingen (bijv. SD, GA) worden verborgen, met het aantal erbij en "Toon even alles".
  Opleidingen en uitsluitwoorden stel je in via Instellingen in die balk. Inspector: gebruikersnamen
  (@...) in links en tekst worden nu ook vervangen. Zoeken vindt groepen met hun echte adres.
- 0.5.0: ontwikkelaarsmodus met Inspector (Alt+I of de knop in de popup): selectors opzoeken en
  paginarapporten maken voor Claude. Namen van studenten, e-mailadressen en studentnummers worden
  vervangen voordat het rapport wordt opgeslagen. S maakt een rapport met alleen de structuur.
- 0.4.0: zoeken met Cmd+K (Ctrl+K op Windows): spring naar menu-items, groepen en de opdrachten om te
  beoordelen per groep. Zijbalk inklappen tot iconen met tooltips (knop linksonder, ook via Cmd+K).
  Nieuwe iconen. Beide nieuwe onderdelen zijn modules met een eigen aan/uit in de popup.
- 0.3.2: bijwerken gebeurt nu helemaal in de popup, zonder apart tabblad. Alleen als het kiezen van de
  extensiemap vanuit de popup niet lukt, opent de updatepagina.
- 0.3.1: de updatepagina toont wanneer er voor het laatst is gecontroleerd. Eerste update via "Nu bijwerken".
- 0.3.0: modules met eigen aan/uit in de popup (Thema, Hulpknop verbergen). Dark mode voor modals,
  popovers, selectize-keuzelijsten, tabs, lijsten, paginering en witte achtergronden van Bootstrap 3.
- 0.2.1: updates via GitHub Releases, zoals bij Docent Tools voor Magister. Om de 6 uur controleren,
  badge op het icoon, "Nu bijwerken" in de popup en een updatepagina die de nieuwe versie zelf in de
  extensiemap zet.
- 0.2.0: thema's (auto, licht, donker, Discord, Tiimo, Nord, Papier, Mokka), aan/uit en compacte weergave.
