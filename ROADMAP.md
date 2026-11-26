# Simulise Docent: roadmap en backlog

Alle besproken en mogelijke verbeteringen, geordend op laag en prioriteit. Staat naast `CLAUDE.md`;
Claude Code kan er uit putten. Werk de status bij als een item klaar is.

Legenda voor de lagen:
- **L1 opmaak**: alleen CSS. Stabiel, laag risico.
- **L2 verbouwen**: DOM-manipulatie, elementen verplaatsen/toevoegen. MutationObserver nodig.
- **L3 eigen schermen**: data ophalen via Simulise's interne GraphQL met de bestaande sessie.
- **L4 vervangen**: Simulise alleen als backend. Afgeraden.

Status: ✅ klaar · 🔧 in ontwikkeling · ⏳ gepland · 💡 idee · ⛔ buiten scope

---

## 1. Thema en opmaak (L1)

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 1.1 | Neutraal licht en donker thema | ✅ v0.1 | |
| 1.2 | Extra thema's: Discord, Tiimo, Nord, Papier, Mokka | ✅ v0.2 | Tokens per thema, uitbreidbaar |
| 1.3 | Automatisch (volgt systeem) en compacte weergave | ✅ v0.2 | |
| 1.4 | Hulpknop van Simulise verbergen (overlapt Inspector) | ✅ v0.2 | Sinds v0.3 een eigen module met aan/uit; hulp blijft bereikbaar via gebruikersmenu |
| 1.5 | Lege band onder topbar wegwerken | 🔧 | Fix aanwezig, nog niet bevestigd |
| 1.6 | Pagina's Beoordelen, Groepen, Portfolio nalopen | ⏳ | Alleen generieke regels, geen echt rapport |
| 1.7 | Dark mode: modals, selectize, Help Scout-widget | 🔧 v0.3 | Modals, popovers, selectize, tabs, lijsten, paginering en `.bg-white` klaar (getest op nagebootste pagina, nog bevestigen in Simulise). Help Scout draait in een iframe van een ander domein: niet te stylen |
| 1.8 | Masonry-tegels op dashboard: eigen grid | 💡 | L2 nodig, CSS alleen kan de indeling niet aanpassen |
| 1.9 | MCA-huisstijl als extra thema | 💡 | Design tokens bestaan al in het MCA design system |
| 1.10 | Statusbadges in gewone taal (concept, ingeleverd, wacht op reflectie, beoordeeld) | 💡 | Ook relevant voor studentkant |

## 1b. Nieuwe schil (thema Helder, proef)

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 7.1 | Thema Helder | 🔧 v0.19 | Tokenblok plus zachtere vormen; de schil hieronder werkt alleen bij dit thema |
| 7.2 | Zijbalk rond taken: Vandaag, Nakijken, Mijn klassen, Maken, Inzicht, Meer | 🔧 v0.19 | modules/schil.js; volgorde met CSS order, items van Simulise blijven bestaan. Nog bevestigen in Simulise zelf, ook met ingeklapte zijbalk |
| 7.3 | Gewone taal voor vaste woorden | 🔧 v0.19 | Woordenlijst TAAL in schil.js; alleen tekst die precies overeenkomt |
| 7.4 | Kleur per klas | 🔧 v0.19 | modules/klassen.js; zijbalk, Vandaag en label per rij in Beoordelen. Later: zelf een kleur kiezen, ook in de matrix |
| 7.5 | Thuispagina per klas | 🔧 v0.19 | Scherm Vandaag voor één klas (#klas=<uuid>): Wacht op jou, Te laat, Nog niet gestart, Klaar, snelkoppelingen. Later: wie loopt achter, komende deadlines, stippenkaart van de matrix |
| 7.5b | Levendiger Vandaag en klaspagina | 🔧 v0.19 | Begroeting per dagdeel, weekstippen, kaart Volgende, kaart per groep met ring, stippenkaart per opdracht (zonder namen), confetti als alles klaar is. Schermafbeeldingen: `SD_BEELD=<map> node tools/rooktest.js` |
| 7.6 | Focusmodus bij het beoordelen | 🔧 v0.19 | modules/focus.js: bovenbalk, zijbalk en kruimelkop weg, lijst met studenten compacter, omschrijving dichtgeklapt, zijkolom met rubric, feedback en de onderbalk van Simulise, eigen balk met vorige, volgende en volgende die wacht; sneltoetsen. De opmaak (ook de zijkolom) is op de echte pagina uitgeprobeerd, de balk alleen in de rooktest. Dekt ook 2.4. Stippen per student geprobeerd en weer weggehaald: de lijst van Simulise met namen werkt beter. Later: statusbalk met open criteria (2.3) |
| 7.6c | Beoordeelscherm: namenlijst en compacte rubric | 🔧 v0.19 | Focusmodus klapt de lijst van Simulise uit (namen zonder plaatjes), 190px breed, rijen van 27px. Rubric in de zijkolom: niveaus zonder plaatjes, omschrijving op drie regels en volledig bij aanwijzen; op de echte pagina van 512 naar 311px. Nog te beoordelen in gebruik: is drie regels genoeg |
| 7.6b | Beoordeelscherm in Helder: één samenhangend ontwerp | 🔧 v0.19 | Eén blok onderaan theme.css ("Focusmodus in het thema Helder"), in zijn geheel op de echte pagina geproefd: kop als band in de klaskleur met 12px lucht onder de balk, werk in themakleuren, lijst links (uitgeklapt namen, ingeklapt ronde plaatjes, inklapknop altijd rechtsboven, lijst scrolt binnen het paneel) en een witte balk rechts (264 tot 320px) met Rubric (per onderdeel de naam met de schuifknop eronder, toelichting bij aanwijzen), Feedback (direct onder de rubric) en Afronden. Vervangt drie gestapelde blokken die met elkaar botsten (dubbel kopje, grijze regels). Niet gezien: gekozen standen, de toelichting, rubrics met meer niveaus |
| 7.7 | Opdracht aanmaken als recept | 💡 | Stappen van Simulise als doorlopende lijst met vinkjes |
| 7.8 | Rustig einde van de dag, weekoverzicht, thema dat meekleurt met de dag | 💡 | |
| 7.9 | Persoonlijk en toegankelijk: lettergrootte, leesvriendelijk lettertype, hoog contrast | 💡 | |

## 2. Beoordelen voor docenten (L2/L3)

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 2.1 | **Filter in Beoordelen**: Mijn groepen / Verberg meetmomenten / Alles | 🔧 v0.6, prioriteit | Klaar: Alles / Mijn opleidingen (meetmomenten op opleidingscode in de titel), uitsluitwoorden, verborgen aantal, "toon even alles", alles op één pagina (v0.7), Mijn groepen (v0.8). Nog: dashboardtegel |
| 2.2 | Beoordeelqueue over alle groepen heen | 🔧 v0.18 | Scherm Vandaag (modules/vandaag.js): wachtrij per opdracht en groep met vak, wachttijd en voortgang, ring met wat vandaag is nagekeken, "Start met langst wachtend". Getest in de rooktest; nog bevestigen in Simulise zelf (eigen vraag sdDocentVandaag, link naar het beoordeelscherm) |
| 2.3 | Beoordeelscherm met statusbalk | ⏳ | Welke rubrics mag je invullen, wat doet afronden met het competentiediagram, hoeveel criteria nog leeg |
| 2.4 | "Volgende student"-knop binnen één opdracht | ⏳ | Hele klas achter elkaar nakijken |
| 2.5 | Sneltoetsen en Cmd+K (groepen, opdrachten, studenten) | 🔧 v0.4 | Cmd+K/Ctrl+K: menu-items, groepen (+ "te beoordelen") en extensie-opdrachten. Studenten bewust niet (privacy); opdrachten volgen met de Beoordelen-rapporten |
| 2.6 | Export groepsoverzicht naar Excel | 💡 | Sluit aan op bestaande voortgangsrapporten uit leerlijndiagrammen |
| 2.7 | Zijbalk inklappen naar alleen iconen met tooltips | 🔧 v0.4 | Module zijbalk, knop linksonder en via Cmd+K. Nog bevestigen in Simulise of breedte en iconen kloppen |
| 2.8 | Dashboard: groepen bovenaan met openstaande beoordelingen als grote getallen | 💡 | L2, hangt samen met 1.8 |
| 2.9 | Student-op-één-pagina: portfolio, leerlijnen, opdrachten | 💡 | L3 |
| 2.11 | Voortgangsrapport per student (profiel) en per groep (/groups) | 🔧 v0.13 | Profielen met normen, perioden, categorieën, doelstap uitvergroot, vergelijking vorige periode; knop op profiel en in groepsmenu, gegevens uit Simulise; werkbalk met gespreksformulier, groepsoverzicht, peildatum, vergelijken, onderdelen, CSV (v0.14). Vanaf Analytics > Opleiding per groep met alle studenten en beide opleidingen in één keer, soort "Meetmomenten naast elkaar" (v0.16). In de pagina zelf in de opmaak van Simulise, A4 alleen bij afdrukken (v0.17). Groepsrapport nog bevestigen |
| 2.12 | Rapporten voor het team: gedeeld toetsplan, aanwezigheid en vergaderlijst | 🔧 v0.21 | rapport/bron.js, xlsx.js. Toetsplan (.json) en aanwezigheid (Excel of CSV) achter een gedeelde OneDrive- of SharePoint-link, in te stellen op Rapportprofielen; vergaderlijst met signaal (onder de norm, bespreken, op koers), ook als afdruk en CSV. Alleen in de rooktest gezien, met een nagebootst antwoord van Microsoft; een echte link en een echte export (Magister nu, later Osiris) zijn nog niet geprobeerd. Kolomkoppen instelbaar in het profiel |
| 2.13 | Ontwerp verfijnd na een audit | 🔧 v0.21 | Tokens voor goed/info/tekst op accent/titels, Helder-regels die verloren van de algemene regels hersteld, ontbrekende Bootstrap-onderdelen (labels, tooltips, voortgangsbalken, tekstkleuren), eigen pagina's volgen het thema (update/pagina.css). Niet op de echte site bekeken. Open: focusmodus en Vandaag hebben nog eigen maten voor knoppen en pillen; 'groep' en 'klas' lopen door elkaar |
| 2.10 | Meldingen filteren (menu en /notifications) op opleiding en uitsluitwoorden | ✅ v0.9 | Zelfde regels als 2.1; menu haalt 40 op en toont 5 relevante; pagina: volgende pagina's doorzoeken; teller telt alleen relevante (v0.10) |

## 3. Studentkant (L1/L2)

Afhankelijk van een studentaccount of een collega/student die het scherm wil delen; er is geen
testaccount.

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 3.1 | Startscherm "wat moet ik nu doen": open opdrachten met deadline, wachtende reflecties, nieuwe feedback | 💡 | |
| 3.2 | Opdracht, rubric en competentiediagram op één scherm | 💡 | Reflectie krijgt betekenis |
| 3.3 | Statusbadges in gewone taal | 💡 | Zie 1.10 |
| 3.4 | Rustiger, ronder, minder tekst (Tiimo-achtig) | 💡 | Thema Tiimo is een voorzet |

## 4. Techniek en onderhoud

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 4.1 | Modulestructuur `modules/<naam>.js` met aan/uit per module in popup | ✅ v0.3 | `modules/registry.js` + `core.js`; modules thema en hulpknop |
| 4.2 | Inspector in Magister-extensie: eigen plek (sneltoets + popup-knop) in plaats van zwevende knop | 💡 | Voorkomt overlap met site-elementen |
| 4.3 | Gedeelde codebasis met Magister-extensie (één repo, gedeelde utils) | 💡 | Alleen als er echt dubbel werk ontstaat |
| 4.4 | Echte iconen in plaats van placeholders | ✅ v0.4 | `scripts/make-icons.py`, zelfde stijl als de Magister-extensie |
| 4.5 | Updates via GitHub Releases, zelf bijwerken vanuit de extensie | ✅ v0.2.1 | Zelfde mechanisme als de Magister-extensie |
| 4.6 | Rooktest in headless Chromium (Simulise en GitHub nagebootst) | ✅ v0.2.1 | `node tools/rooktest.js` |
| 4.7 | Eigen Inspector in Simulise Docent (ontwikkelaarsmodus, Alt+I) | ✅ v0.5 | Rapporten met namen vervangen; de Magister-Inspector draait alleen op magister.net |

## 5. Buiten scope van de extensie

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 5.1 | Koppeling met Microsoft Teams for Education | ⛔ | Simulise heeft geen publieke API; Teams geen LTI. Zou via Microsoft Graph + Simulise's interne GraphQL moeten, met een app-registratie in de MCA-tenant. Alleen als experiment. |
| 5.2 | Eigen MCA-variant van bepaalde Simulise-werkvormen | ⛔ voorlopig | Beslissen nadat L2/L3 hebben laten zien welke werkvormen echt wringen |
| 5.3 | Simulise volledig vervangen (L4) | ⛔ | Elke functie die je niet nabouwt ben je kwijt |

---

## Uit de analyse van november 2026 (live bekeken, nog niet gebouwd)

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 6.1 | Vakken aanzetten voor Opdrachten | ⏳ vraag aan beheer | Het label Vakken bestaat al (op 20 rubrics); in het opdrachtformulier ontbreekt het. Geen code nodig |
| 6.2 | "Mijn groepen" in Beoordelen via het eigen URL-filter van Simulise | 💡 | `filters=group:<uuid>,<uuid>` werkt; telling en paginering kloppen dan vanzelf |
| 6.3 | Opdrachten van een klas: overzicht per vak en stippenkaart | 🔧 v0.20 | modules/matrix.js. Overzicht (standaard): blok "Wacht op jou", daarna per vak (code uit de titel) inklapbaar met één balk per opdracht, zonder studenten. Per student: de matrix als stippenkaart (kolommen van 32px, grote stip voor wat op jou wacht, uit de toelichting van de cel). De stippenkaart alleen bleek te druk en niet geordend. De stippenkaart is op de echte pagina geproefd; het overzicht alleen in de rooktest (schermafbeelding via SD_BEELD). Later: volledige vaknamen bij de codes, of het veld Vakken van Simulise zodra beheer dat aanzet (6.1) |
| 6.3b | Inzicht (Analytics) in gewone taal | 🔧 v0.20 | modules/inzicht.js. /analytics: eigen overzicht in plaats van de tegels, rapportages als vragen en geordend (klas, studenten, opdracht of sjabloon), elke regel rechtstreeks naar /analytics/<soort> zonder tussenpagina, klassen bovenaan voor het voortgangsrapport, tegels van Simulise achter een knop. /analytics/<soort>: de vraag als titel, stappen en meldingen in gewone taal, rustiger opmaak. Het overzicht alleen in de rooktest gezien; de vertalingen zijn op de echte wizard nagelopen (zonder te wijzigen). /analytics/<soort>/reports: kop met de vraag en de knop Nieuwe rapportage, tegel weg (alleen de lege pagina gezien; er zijn geen bewaarde rapportages en bewaren mag niet in de proef). /analytics/<soort>/result: knoppen met woorden, keuzes als labels, tabel met vaste kop en namen; bij Opleiding per groep de stand van de klas boven de tabel (opmaak en telling geproefd op de echte pagina van MEP1A, de module zelf alleen in de rooktest). Alleen Opleiding per groep is als resultaat gezien; de andere zes soorten krijgen de algemene opmaak ongezien. Diagrammen naast elkaar geprobeerd en verworpen (worden te klein) |
| 6.4 | Naamgevingscontrole in de opdrachtenlijst | 💡 | Sjabloon bestaat: "[Vakcode] [periode week]: [type opdracht] [titel opdracht] [klas]" |
| 6.5 | Cmd+K: Nieuwe opdracht, Beoordelen per groep, matrix Actie nodig | 💡 | Vaste adressen |
| 6.6 | Groepstellers op het dashboard: "van mij: N" | 💡 | De teller telt alle beoordelaars |
| 6.7 | Eén eigen formulier voor opdracht aanmaken | 🔧 v0.22 | modules/opdracht.js: scherm Snelle opdracht in de indeling van Teams (inhoud links, alle kleine instellingen in de smalle kolom rechts, knoppen bovenin, rubrics in een popup), met alle instellingen van de vier pagina's van Simulise; opslaan in de vijf stappen met herstel per stap. Alleen getest tegen een nagebootste server; de eerste echte opdracht moet Mark zelf maken (geen testklas). Nog niet: afbeelding, bestanden en video, paginasjabloon als inleverstuk, virtuele groepen en losse studenten, meer dan één groep beoordelaars (en dus de volgorde van beoordelaars), een bestaande opdracht als vertrekpunt |
| 6.8 | Media bij het nakijken | 🔧 v0.23 | modules/media.js: onder de pdf van een ingeleverde portfoliopagina spelers voor video en audio, afbeeldingen, andere bestanden (voorvertoning van Simulise op verzoek) en links. De vraag en het afspelen van een video zijn geproefd op een echte inlevering; de module zelf alleen in de rooktest. Audio, afbeeldingen en andere bestandssoorten zijn niet op een echte inlevering gezien |
| 6.9 | Matrix draaien en doorklikken vanaf de klaspagina | 🔧 v0.24 | Knop Draaien in de weergave per student (studenten als rijen, opdrachten als kolommen met een korte code); titels op de klaspagina openen het overzicht per student, knop Nakijken de eerste wachtende inlevering. Alleen in de rooktest gezien |
| 6.10 | Zijpaneel, periodes en deadlines | 🔧 v0.25 | Instellingen als zijpaneel van de browser met periodes en normen; periodes als gedeelde bron (modules/perioden.js) voor rapporten, matrix (filter op deadline) en klaspagina (deadlines aankomend en afgelopen); sorteren in de gedraaide matrix. Alleen in de rooktest gezien; of endDate op de echte server altijd gevuld is, is niet nagegaan. Nog niet: de regels achter een norm bewerken in het zijpaneel (blijft Rapportprofielen), periodes als filter in Beoordelen en Inzicht |
| 6.11 | Fases en modules, eis per leerlijn | 🔧 v0.26 | Modules (periodes) met een fase erboven; filters op module of fase in de matrix en op de klaspagina; opdrachten zonder deadline via de modulecode in de titel; norm met een eigen vereiste stap per leerlijn (zijpaneel). Alleen in de rooktest gezien. Open: gewone opdrachten zonder deadline en zonder modulecode vallen alleen onder "Alle modules"; het label Modules (M01 t/m M12) van Simulise wordt nog niet gelezen |
| 6.12 | Normen per module toetsen en bewerken | 🔧 v0.27 | Vergaderlijst: keuze Norm van een module op haar meetmoment, eisen in woorden; zijpaneel: Op koers als in gewone taal met velden per opleiding, per leerlijn en voor de vakken. Alleen in de rooktest gezien. Open: de standaardnormen in rapport/standaard.js zijn een eerste invulling uit het stroomschema en moeten door Mark worden nagelopen |
| 6.13 | Toetsplan in tabbladen, BAVA goed gelezen | 🔧 v0.28 | Zijpaneel met tabbladen; Fasen, Modules, Beslismomenten en Normen als losse, koppelbare lijsten; vakkenregel op de te behalen stap; BAVA telt de hoogste behaalde stap; overzicht vanuit Inzicht tot vandaag. De opbouw van BAVA is op een echte rapportage bekeken, de rest alleen in de rooktest. Open: per module telt alleen het laatste beslismoment; het rapport per student via het profiel (diagramForEducation) is voor BAVA niet apart nagekeken |

## Benodigde input (bijgewerkt na v0.6)

Ontvangen: Beoordelen-lijst, beoordeelscherm, opdrachten van een groep. Nog nodig:
- Dashboard (voor de Beoordelen-tegel).
- (Beantwoord: een Groep-filter in Beoordelen komt in de URL als `filters=group:<uuid>,<uuid>|status:...`.)

## Oorspronkelijk gevraagd voor v0.3

Inspector-rapporten (Simulise Docent > Ontwikkelaarsmodus > Alt+I > R) van:
1. Beoordelen, de lijst, met minimaal één rij van een meetmoment van een andere opleiding en één eigen opdracht
2. Eén opdracht in beoordeling
3. Opdrachtenpagina van één groep (`/groups/{id}/assignments`)

Plus: controleren of de URL verandert als je in Simulise zelf een filter aanzet in Beoordelen.

## Afspraken

- Geen persoonsgegevens van studenten in code, rapporten, commits of documentatie. Klasnamen zijn ok.
- Alles lokaal in de browser, geen externe servers. Uitzonderingen: updatecontrole bij GitHub en, na toestemming, het lezen van het toetsplan en de aanwezigheid van een gedeelde OneDrive-link.
- Nederlandse UI-teksten, geen gedachtestreepjes.
