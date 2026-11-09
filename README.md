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
icoon een gele badge en staat bovenin de popup "Nu bijwerken". Dat opent de updatepagina
(ook bereikbaar via rechtsklik op het icoon > Opties):
1. De eerste keer kies je de map waarin de extensie staat (de map met `manifest.json`); die keuze
   wordt onthouden.
2. Klik "Nu bijwerken naar X". Chrome vraagt om toestemming voor de map (één klik). De extensie
   haalt de zip op, schrijft de bestanden in de map en herlaadt zichzelf. Herlaad daarna je
   Simulise-tabbladen.

Er worden alleen bestanden geschreven of overschreven, nooit verwijderd. Het manifest wordt als
laatste geschreven, zodat een afgebroken update geen half nieuwe extensie achterlaat. Handmatig kan
ook: zip downloaden, over de extensiemap uitpakken en op ↻ klikken bij `chrome://extensions`.
Met git: deze repo clonen, die map laden, en bijwerken met `git pull` plus ↻.

Versie 0.2.0 had nog geen updater: zet 0.2.1 één keer handmatig over je extensiemap, daarna gaat het
vanzelf.

## Bestanden
- `theme.css`  alle opmaak, met tokens per thema bovenin
- `modules/`  modulelijst (`registry.js`), kern (`core.js`) en de modules zelf (`thema.js`, `hulpknop.js`)
- `content.js` start de modules
- `ROADMAP.md`  roadmap en backlog
- `popup.html` / `popup.js`  modules aan/uit, themakeuze, compacte weergave, updates
- `background.js` updatecontrole bij GitHub Releases (om de 6 uur), badge op het icoon
- `update/`  updatepagina en zelf-updater (`updater.js`)
- `scripts/release.sh`  nieuwe versie uitbrengen
- `.github/workflows/release.yml`  bouwt bij elke tag `v*` de zip en publiceert de release
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

## Nieuwe versie uitbrengen
1. Pas de code aan en zet een regel `- X.Y.Z: ...` bovenaan **Wijzigingen** hieronder. Commit op `main`.
2. Voer uit: `scripts/release.sh X.Y.Z`. Dat zet het versienummer in `manifest.json`, commit, maakt
   tag `vX.Y.Z` en pusht.
3. GitHub Actions bouwt `simulise-docent-vX.Y.Z.zip` en zet die als release op GitHub. Klopt het
   versienummer in `manifest.json` niet met de tag, dan stopt de workflow.
4. Geïnstalleerde extensies zien de nieuwe versie bij de volgende controle (uiterlijk na 6 uur, of
   direct via "Controleer op updates" in de popup).

## Testen
`node tools/rooktest.js` laadt de extensie in headless Chromium. Simulise en GitHub worden lokaal
nagebootst (geen netwerk, geen echte data). De test controleert het content script, de popup, de
updatecontrole met badge, en of een zip zoals de workflow die bouwt goed uitpakt.

## Wijzigingen
- 0.3.0: modules met eigen aan/uit in de popup (Thema, Hulpknop verbergen). Dark mode voor modals,
  popovers, selectize-keuzelijsten, tabs, lijsten, paginering en witte achtergronden van Bootstrap 3.
- 0.2.1: updates via GitHub Releases, zoals bij Docent Tools voor Magister. Om de 6 uur controleren,
  badge op het icoon, "Nu bijwerken" in de popup en een updatepagina die de nieuwe versie zelf in de
  extensiemap zet.
- 0.2.0: thema's (auto, licht, donker, Discord, Tiimo, Nord, Papier, Mokka), aan/uit en compacte weergave.
