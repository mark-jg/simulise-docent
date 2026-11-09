# Simulise Docent

Chrome-extensie voor Simulise: thema's (v0.2) en vanaf v0.3 docent-tools zoals filteren en
sneller beoordelen. Geen netwerkverkeer naar externe servers.

## Installeren (lokaal)
1. Ga naar `chrome://extensions`, zet rechtsboven "Ontwikkelaarsmodus" aan.
2. Klik "Uitgepakte extensie laden" en kies deze map.
3. Open ma.simulise.com. Via het extensie-icoon kies je een thema.

## Bestanden
- `theme.css`  alle opmaak, met tokens per thema bovenin
- `content.js` zet `data-sim-theme` op `<html>` op basis van je instelling
- `popup.html` / `popup.js`  themakeuze, aan/uit, compacte weergave
- `CLAUDE.md`  projectcontext voor Claude Code

## Thema toevoegen
Kopieer een tokenblok in `theme.css`, geef het een nieuwe naam, en zet die naam in `THEMES`
(popup.js) en, als het donker is, in `DARK` (content.js).

## Bekende aandachtspunten
- Lege band onder de topbar: fix zit op `#content > .vbox > .vbox > header.header-md`. Nog te bevestigen.
- Alleen het dashboard is gestyled op basis van een echt rapport.

## Testen
`node tools/rooktest.js` laadt de extensie in headless Chromium op een nagebootste
Simulise-pagina (geen netwerk, geen echte data) en controleert content script en popup.
