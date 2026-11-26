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
  paginering (page, per_page, total, ...) en vaste codes zoals HANDED_IN. Daarnaast: alle adressen die
  de browser opvroeg (ook van vóór de log) en de opbouw van JSON die al in de pagina staat. Herlaad de
  pagina na het aanzetten van de ontwikkelaarsmodus, dan wordt alles vanaf het laden gezien. Vastgelegd door
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
- 0.28.0: het zijpaneel heeft tabbladen (Onderdelen, Toetsplan, Uiterlijk, Meer). Onder Toetsplan stel je Fasen,
  Modules, Beslismomenten en Normen elk apart in en koppel je ze: een module hoort bij een fase, een beslismoment bij
  een module en een norm. Bij de basisvaardigheden geldt de te behalen stap (in te stellen), niet meer "voldoende".
  BAVA wordt goed gelezen: de hoogste behaalde stap telt, ook als de lagere stappen niet apart zijn behaald. Het
  overzicht vanuit Inzicht kijkt altijd tot vandaag, ook als Simulise een oudere einddatum had onthouden.
- 0.27.1: in de vergaderlijst staan "Norm" en "Stand op" los van elkaar; de knop "Zet op meetmoment" zet de datum
  op het meetmoment van de gekozen norm. De kruimelkop blijft op één regel: bij Inzicht staat daar weer de korte naam
  van de rapportage.
- 0.27.0: normen duidelijk en per module te toetsen. In de vergaderlijst kies je "Norm van" een module: de stand
  op het meetmoment van die module, getoetst aan haar eigen norm, met de eisen in woorden erbij. In het zijpaneel staat
  bij elke module "Op koers als ..." in gewone taal, met velden voor het aantal leerlijnen, de stap, verplichte
  leerlijnen, de eis per leerlijn, de vakken en de dag waarop gemeten wordt.
- 0.26.1: het voortgangsrapport van een groep vond geen studenten meer ("geen studenten gevonden"). De studenten
  worden nu weer gevonden op de studentenpagina van de klas, met de opdrachtentabel als tweede route.
- 0.26.0: fases en modules. Een module is een periode met begin en eind; meerdere modules kunnen onder één fase
  vallen, en overal waar je op module filtert kun je ook een fase kiezen. Een opdracht of meetmoment zonder deadline
  hoort bij de module waarvan de code in de titel staat ("Meetmoment Engels M1"), zodat die niet meer ontbreekt. Bij
  een norm kun je per leerlijn een eigen vereiste stap opgeven, met het aantal leerlijnen dat eraan moet voldoen.
- 0.25.3: "Alle opdrachten in deze klas" op de klaspagina: alle rijen even hoog (de knop Nakijken staat rechts),
  sorteren op wacht op jou, deadline of naam, filteren op periode, en de meetmomenten in een eigen groep.
- 0.25.2: de weergave met alle deadlines van de klas bleef leeg; de plugin haalt de opdrachten nu op zoals Simulise
  de tabel zelf ophaalt. De keuze heet "mijn opdrachten" of "alle opdrachten".
- 0.25.1: de opdrachtenpagina van een klas past weer in het venster: de pagina schuift nu en de gedraaide tabel is
  op de hoogte van het venster afgestemd. Het blok Deadlines op de klaspagina heeft een tweede weergave "alle
  opdrachten": alle deadlines in de gekozen periode op datum, ook die van collega's, met de meetmomenten
  apart.
- 0.25.0: de instellingen staan in een zijpaneel naast de pagina (klik op het icoon), niet meer in een venster
  eroverheen. Onderdelen staan per soort werk, en er is een blok "Periodes en normen": periodes met begin en eind,
  de norm in woorden en de doelstap per opleiding. Die periodes gelden overal: voortgangsrapport en vergaderlijst, een
  filter op deadline in de gedraaide matrix en de deadlines op de klaspagina. De gedraaide matrix sorteert studenten
  (voornaam, achternaam, wacht op jou, te laat, klaar) en opdrachten (volgorde van Simulise, deadline, code), en heeft
  meer ruimte aan de onderkant. Op de klaspagina staat bij elke opdracht klein de deadline, met een blok Deadlines:
  per periode wat nog komt en wat voorbij is.
- 0.24.0: de opdrachten van een klas per student kun je draaien. Met de knop "Draaien" staan de studenten onder elkaar
  en de opdrachten als kolommen, met bovenaan een korte code uit de titel (PS_1.8, ENG_2.3); de hele titel en de
  deadline zie je als je de code aanwijst. De keuze wordt onthouden. Op de klaspagina zijn de opdrachten doorklikbaar:
  de titel opent het overzicht per student met die opdracht gemarkeerd, de knop "Nakijken" de eerste inlevering die op
  jou wacht.
- 0.23.0: media bij het nakijken. Simulise toont een ingeleverde portfoliopagina op het beoordeelscherm als pdf, waarin
  video en audio niet afspelen. Onder die pdf staat nu "Media op deze pagina": een speler voor elke video en elk
  audiobestand, afbeeldingen, en voor andere bestanden een knop die de voorvertoning van Simulise in de pagina opent,
  met de links van de student erbij. Alleen lezen; er wordt niets bewaard.
- 0.22.0: snelle opdracht. Een opdracht aanmaken op één scherm in plaats van vier pagina's: knop "Snelle opdracht" bij
  Opdrachten (ook via Cmd+K). De indeling volgt Opdrachten in Teams: bovenin Annuleren en Aanmaken met in één zin wat er
  wordt aangemaakt, links de inhoud (titel, instructies, links, rubrics, inleverstukken) en rechts een smalle kolom met
  alle kleine keuzes: toewijzen aan, start en deadline, beoordelaars, reflectie, labels, feedbackvragen, doorlooptijd
  en auteurs. Rubrics kies je in een popup met een zoekveld; inleverstukken hebben hun eigen instellingen. Opslaan gaat
  in de vijf stappen van Simulise; weigert Simulise een stap, dan zie je de melding en kun je opnieuw proberen of
  verder gaan in Simulise. Je vaste keuzes worden onthouden. Niet in dit formulier: afbeelding, bestanden en video's,
  een paginasjabloon als inleverstuk, virtuele groepen, losse studenten en meer dan één groep beoordelaars.
- 0.21.0: rapporten voor het hele team. Een vergaderlijst per klas: één rij per student met het signaal (onder de norm,
  bespreken, op koers), de stand per opleiding en waarom iemand op de lijst staat; ook als afdruk (met een kolom voor het
  besluit) en als Excel-export. Het toetsplan (normen, periodes) kan uit een gedeelde OneDrive- of SharePoint-link komen,
  zodat iedereen dezelfde regels gebruikt. Een Excel-bestand met aanwezigheid achter zo'n link komt naast de resultaten
  te staan en telt mee als bespreekpunt onder een grens die je instelt. Instellen op de pagina Rapportprofielen; de
  extensie leest alleen en vraagt eerst om toestemming voor OneDrive. Verder een verfijning van het ontwerp: dezelfde
  kleuren en titels in alle eigen schermen, ronde knoppen in Helder ook op de knoppen van Simulise, labels, tooltips en
  voortgangsbalken in elk thema, en de popup, updatepagina en Rapportprofielen volgen het gekozen thema.
- 0.20.0: de opdrachten van een klas rustig en geordend. Standaard een overzicht: bovenaan "Wacht op jou" met de
  opdrachten waar jij iets moet nakijken, daaronder de opdrachten per vak (de code uit de titel), inklapbaar, met per
  opdracht één balk en in woorden wat ertoe doet. Zonder studenten in beeld. De knop "Per student" toont de matrix van
  Simulise als stippenkaart: smalle kolommen, één stip per inlevering, een grote stip voor wat op jou wacht.
  Inzicht (Analytics) is vriendelijker: in plaats van zeven tegels een overzicht met de rapportages als vragen ("Wie
  heeft deze opdracht af?"), geordend naar klas, studenten en opdracht, met je klassen bovenaan voor het voortgangsrapport
  in één klik. De keuzes voor een rapportage staan in gewone taal. Het resultaat is rustiger: knoppen met woorden
  (Keuzes wijzigen, Bewaren, Downloaden), een tabel die kop en namen in beeld houdt en bij "Opleiding per groep" de
  stand van de klas erboven: per leerlijn en stap hoeveel studenten die hebben behaald. De pagina met bewaarde
  rapportages heeft de vraag als kop en een knop "Nieuwe rapportage".
- 0.19.0: nieuw thema Helder met een nieuwe schil (proef). De zijbalk is ingedeeld rond taken: Vandaag, Nakijken, Mijn
  klassen, Maken, Inzicht en Meer. Elke klas heeft een eigen kleur, in de zijbalk en bij elke rij in Beoordelen. Vaste
  woorden van Simulise staan in gewone taal ("Wacht op jou" in plaats van "Te beoordelen"). Klik op een klas voor de
  thuispagina van die klas: wat op jou wacht, wat te laat is en snelkoppelingen naar de klas in Simulise. Bij een ander
  thema blijft Simulise zoals het was.
  Vandaag en de klaspagina zijn levendiger: een begroeting die meekleurt met het moment van de dag, de werkdagen van
  deze week waarop je hebt nagekeken, een kaart Volgende, een kaart per groep met een eigen ring, en op de klaspagina
  een stippenkaart met één stip per inlevering. Is alles nagekeken, dan valt er even confetti.
  Nieuw is ook de focusmodus op het beoordeelscherm: het werk van de student met rubric, feedback en "beoordeling
  toekennen" vast in een kolom ernaast, zodat je tijdens het nakijken kunt typen zonder te scrollen. De lijst met
  studenten blijft staan, compacter. De omschrijving van de opdracht klapt dicht. Bovenaan een balk met vorige,
  volgende en "volgende die wacht". Alt+F of Esc zet de focusmodus uit; de knop Zijkolom zet alleen de kolom uit.
  In het thema Helder volgt het beoordeelscherm dezelfde stijl: lichte lijst, zachte vlakken, één accentkleur.
  De lijst links toont alleen namen (zonder plaatjes) en de rubric is compact: niveaus als één regel, omschrijvingen op
  drie regels, de hele tekst als je er met de muis overheen gaat.
  In Helder heeft het beoordeelscherm de vormtaal van Vandaag en de klaspagina's: een kop in de kleur van de klas met
  de plek in de klas en de tellers, een ring in de balk, en rechts een witte balk met drie delen: Rubric (per onderdeel
  de naam met eronder een schuifknop voor het niveau; de omschrijving verschijnt als toelichting als je een niveau aanwijst), Feedback (een
  tekstvak met de knoppen erin) en Afronden (de keuzes en één grote knop). De lijst links heeft ruimte: namen als hij is
  uitgeklapt, ronde plaatjes als hij is ingeklapt.
  De knop om de lijst in of uit te klappen staat altijd rechtsboven in de lijst.
  De balk bovenaan is een vaste strook die aansluit tussen de lijst links en de balk rechts.
- 0.18.0: nieuw scherm Vandaag, een eigen startscherm in Simulise zelf (bovenbalk en zijbalk blijven staan) met je
  beoordeelwachtrij over alle groepen. Per opdracht en
  groep één regel met vak, wachttijd en voortgang; een ring met wat je vandaag hebt nagekeken; knop "Start met langst
  wachtend" die het beoordeelscherm van Simulise opent. Openen via "Vandaag" bovenaan de zijbalk, Cmd+K of een adres
  dat eindigt op #vandaag. Toont geen studenten en bewaart alleen tellers en datums.
- 0.17.0: rapporten verschijnen nu in Simulise zelf, als gewone pagina in de opmaak van Simulise, in plaats van in
  een apart afdrukvenster. Weergaven: Meetmomenten naast elkaar, Groepsoverzicht en Per student (diagram,
  leerlijnen, norm en gespreksadvies, met bladeren tussen studenten; klik op een naam). Knop Terug brengt de pagina
  terug. Excel alleen als export; Afdrukken opent de A4-versie (rapport of gespreksformulier, één of alle studenten).
- 0.16.0: Analytics, Opleiding per groep: knop "Overzicht & rapporten" op de resultatenpagina. Die haalt alle
  studenten op (niet alleen de eerste 25) en ook de andere opleiding uit je profiel (beroeps en BAVA), en zet alles
  samen. Nieuwe soort "Meetmomenten naast elkaar": per leerlijn een kolom per periode (M1, M2, ...), gekleurd als de
  doelstap van die periode gehaald is. Voortgangsrapporten, gespreksformulieren, groepsoverzicht en CSV werken ook
  met deze gegevens.
- 0.15.0: voortgangsrapporten ook vanaf Analytics: een extra kaart "Voortgangsrapporten" naast de rapportages van
  Simulise, met een keuzelijst van je groepen. Zoeken onthield bij Groepen soms "Studenten" of "Community" als
  groepsnaam; dat is opgelost en zulke namen worden opgeruimd.
- 0.14.0: voortgangsrapporten flexibeler. In het rapporttabblad staat een werkbalk: soort (voortgangsrapport,
  gespreksformulier met invulvakken, groepsoverzicht op één liggende pagina), peildatum (ook in het verleden,
  bijvoorbeeld de stand aan het eind van M1), vergelijken met een periode naar keuze, onderdelen aan en uit,
  opleidingen kiezen, doelstap groot, sorteren (aandacht eerst) en filteren (alleen niet op koers), en export
  naar CSV voor Excel. Het gespreksadvies en de gespreksvakken zijn zelf aan te passen voor het afdrukken.
  Groepsrapporten zoeken de interne id van een student op zoals Simulise dat doet.
- 0.13.1: voortgangsrapporten: op het profiel gebruikt de extensie nu precies de vragen van Simulise zelf (eerder
  "This action is unauthorized"), en onthoudt ze hoe, voor de groepsrapporten. De studenten van een groep komen
  zo nodig van de opdrachtenpagina van de groep. Duidelijkere foutmeldingen.
- 0.13.0: voortgangsrapporten met echte gegevens. Op het profiel van een student staat bij het diagram de knop
  "Voortgangsrapport"; op Groepen staat in het menu van elke groep "Voortgangsrapporten" voor alle studenten.
  Het rapport opent in een nieuw tabblad, gemaakt met het gekozen rapportprofiel; afdrukken of opslaan als
  PDF kan daar. De gegevens komen met je eigen sessie uit Simulise en worden niet bewaard.
- 0.12.0: voortgangsrapporten, deel 1: de pagina Rapportprofielen (link onderaan de popup) met normen,
  perioden, categorieën en weergave per opleiding, en een live voorbeeld met een verzonnen student. De
  doelstap van de periode kan groter in beeld, en een latere periode wordt vergeleken met de vorige.
  De koppeling met de gegevens uit Simulise volgt.
- 0.11.1: netwerkrapport (N): GraphQL-vragen staan er volledig in, en bij de verzoeken over leerlijndiagrammen
  ook de waarden (stappen, scores, niveaus, datums), zonder id's, gebruikersnamen en namen van personen.
  Nodig voor de voortgangsrapporten.
- 0.11.0: knop "Alles als gelezen markeren" op de pagina Meldingen. Vraagt eerst om bevestiging en gebruikt
  dan de eigen knop van Simulise (het vinkje onderaan het meldingenmenu).
- 0.10.2: meldingenteller telt alle ongelezen meldingen, ook als Simulise ze maar per 100 geeft: de
  volgende pagina's worden ook opgehaald (tot 10). Dan staat er een exact getal in plaats van "34+".
- 0.10.1: meldingenteller: als Simulise 200 meldingen in één keer weigert, probeert de extensie 100 en
  dan 50. Het netwerkrapport (N) toont wat de teller deed, met eventuele foutmeldingen van Simulise.
- 0.10.0: de meldingenteller (het getal op het belletje, in het gebruikersmenu en bij Meldingen) telt
  alleen nog ongelezen meldingen voor jouw opleidingen. Het echte totaal staat in de tooltip. De
  meldingen blijven in Simulise zelf gewoon ongelezen.
- 0.9.0: filter in Meldingen. In het meldingenmenu en op de pagina Meldingen worden meldingen over
  meetmomenten van andere opleidingen (en met je uitsluitwoorden) verborgen, met dezelfde instellingen
  als in Beoordelen. Het menu haalt meer meldingen op, zodat er 5 relevante overblijven. Op de pagina
  Meldingen zoekt "Volgende pagina's doorzoeken" verder en voegt de relevante meldingen toe.
- 0.8.1: Inspector: het paginarapport (R) beschrijft ook de omgeving van het element onder de muis als
  dat buiten de pagina-inhoud staat, zoals het meldingenmenu in de bovenbalk.
- 0.8.0: Beoordelen: "Mijn groepen". Kies bij Instellingen in de filterbalk je groepen (of laat ze kiezen
  op basis van je opleidingscodes); dan zie je alleen de opdrachten van die groepen. Welke groepen er
  zijn en bij welke groep een rij hoort, komt uit wat Simulise zelf al meestuurt. Rijen zonder groep
  blijven zichtbaar en worden apart geteld.
- 0.7.0: Beoordelen: "Alles op één pagina" (standaard aan). Simulise laadt de hele lijst in één keer in
  plaats van per 25, zodat de filter over alle opdrachten werkt en je niet meer hoeft te bladeren.
  Weigert Simulise dat, dan blijft het gewoon per 25 werken.
- 0.6.2: netwerkrapport (N) legt nu ook verzoeken vast die direct bij het laden van de pagina gebeuren,
  toont alle adressen die de browser opvroeg en de opbouw van gegevens die al in de pagina staan.
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
