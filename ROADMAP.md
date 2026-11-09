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

## 2. Beoordelen voor docenten (L2/L3)

| # | Item | Status | Opmerking |
|---|------|--------|-----------|
| 2.1 | **Filter in Beoordelen**: Mijn groepen / Verberg meetmomenten / Alles | 🔧 v0.6, prioriteit | Klaar: Alles / Mijn opleidingen (meetmomenten op opleidingscode in de titel), uitsluitwoorden, verborgen aantal, "toon even alles", alles op één pagina (v0.7), Mijn groepen (v0.8). Nog: dashboardtegel |
| 2.2 | Beoordeelqueue over alle groepen heen | ⏳ v0.3 | Per-groep actionable-lijsten samenvoegen: student, opdracht, groep, ingeleverd op, wachttijd |
| 2.3 | Beoordeelscherm met statusbalk | ⏳ | Welke rubrics mag je invullen, wat doet afronden met het competentiediagram, hoeveel criteria nog leeg |
| 2.4 | "Volgende student"-knop binnen één opdracht | ⏳ | Hele klas achter elkaar nakijken |
| 2.5 | Sneltoetsen en Cmd+K (groepen, opdrachten, studenten) | 🔧 v0.4 | Cmd+K/Ctrl+K: menu-items, groepen (+ "te beoordelen") en extensie-opdrachten. Studenten bewust niet (privacy); opdrachten volgen met de Beoordelen-rapporten |
| 2.6 | Export groepsoverzicht naar Excel | 💡 | Sluit aan op bestaande voortgangsrapporten uit leerlijndiagrammen |
| 2.7 | Zijbalk inklappen naar alleen iconen met tooltips | 🔧 v0.4 | Module zijbalk, knop linksonder en via Cmd+K. Nog bevestigen in Simulise of breedte en iconen kloppen |
| 2.8 | Dashboard: groepen bovenaan met openstaande beoordelingen als grote getallen | 💡 | L2, hangt samen met 1.8 |
| 2.9 | Student-op-één-pagina: portfolio, leerlijnen, opdrachten | 💡 | L3 |
| 2.11 | Voortgangsrapport per student (profiel) en per groep (/groups) | 🔧 v0.13 | Profielen met normen, perioden, categorieën, doelstap uitvergroot, vergelijking vorige periode; knop op profiel en in groepsmenu, gegevens uit Simulise. Nog bevestigen met echte rapporten |
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

## Benodigde input (bijgewerkt na v0.6)

Ontvangen: Beoordelen-lijst, beoordeelscherm, opdrachten van een groep. Nog nodig:
- Dashboard (voor de Beoordelen-tegel).
- Controleren of de URL verandert als je in Simulise zelf een Groep-filter aanzet in Beoordelen.

## Oorspronkelijk gevraagd voor v0.3

Inspector-rapporten (Simulise Docent > Ontwikkelaarsmodus > Alt+I > R) van:
1. Beoordelen, de lijst, met minimaal één rij van een meetmoment van een andere opleiding en één eigen opdracht
2. Eén opdracht in beoordeling
3. Opdrachtenpagina van één groep (`/groups/{id}/assignments`)

Plus: controleren of de URL verandert als je in Simulise zelf een filter aanzet in Beoordelen.

## Afspraken

- Geen persoonsgegevens van studenten in code, rapporten, commits of documentatie. Klasnamen zijn ok.
- Alles lokaal in de browser, geen externe servers.
- Nederlandse UI-teksten, geen gedachtestreepjes.
