/* Standaard rapportprofiel: MEP/MIP 2026-2027, op basis van het stroomschema meet- en beslismomenten.
 * Een profiel bepaalt welke opleidingen (diagrammen) in het rapport komen, de perioden met hun doelstap
 * en normen, de categorieën (zoals bij BAVA) en de weergave. Aan te passen op de pagina Rapportprofielen.
 *
 * Opbouw:
 *   opleidingen[]   rol (beroeps | bava | eigen naam), herken (tekst of regex op de naam van de opleiding
 *                   in Simulise), titel, kop (bovenaan de pagina), categorieen[] (naam, kleur, leerlijnen[]),
 *                   stappen { leerlijnnummer: { stap: omschrijving } }
 *   perioden[]      code, naam, van, tot (JJJJ-MM-DD), moment (bijv. meetmoment), beslis (true = besluit),
 *                   normNaam (bijv. VSA-norm), norm (tekst), doel { rol: stap }, regels[]
 *   regels          { rol, stap, minAantal, verplicht: [leerlijnnummers] }  of
 *                   { rol, soort: 'categorieen', minAantal, perCategorie: { minLeerlijnen, stap } };
 *                   met telt: false telt een regel niet mee in het oordeel "op koers"
 *   categorieen     naam, woord (zo in een zin: "rekenen", "Engels"), kleur, leerlijnen[], beoordeeldVanaf (periodecode)
 *   jaardoel        { rol: stap } voor de ondertitel ("jaar 1 werkt toe naar stap 2")
 *   weergave        nadrukDoelstap (doelstap groter in beeld), nadrukFactor, accent, vergelijk (vorige periode tonen)
 */
globalThis.SD_RAPPORT_STANDAARD = {
  id: 'mepmip-2026-2027',
  naam: 'MEP/MIP 2026-2027',
  bron: 'stroomschema meet- en beslismomenten MEP/MIP 2026-2027',
  opleidingen: [
    {
      rol: 'beroeps', herken: 'Mediaproducer|Music Industry|MEP|MIP', titel: 'Beroepsleerlijnen', kop: 'BEROEPSLEERLIJNEN',
      // Omschrijving per leerlijn (nummer) en stap, voor de tabel. Aan te vullen voor de andere stappen.
      stappen: {
        1: { 1: 'Ontdekken wat adviseren is en wat de rol van de mediamanager is bij opdrachtgevers.' },
        2: { 1: 'Begrijpen wat er komt kijken bij de voorbereiding en wat jouw rol daarin is.' },
        3: { 1: 'Ontdekken wat coördineren is en waarom overzicht houden belangrijk is.' },
        4: { 1: 'Basisgedrag laten zien: afspraken nakomen, je aan de regels houden en inzet tonen.' },
        5: { 1: 'Kennismaken met de mediasector en basiskennis en -vaardigheden ontwikkelen.' },
      },
    },
    {
      rol: 'bava', herken: 'BAVA|basisvaardig', titel: 'Basisvaardigheden', kop: 'BASISVAARDIGHEDEN',
      categorieen: [
        { naam: 'Nederlands', woord: 'Nederlands', kleur: '#e8650a', leerlijnen: ['Gesprekken', 'Lezen', 'Luisteren', 'Schrijven', 'Spreken'] },
        { naam: 'Rekenen', kleur: '#1f9d55', leerlijnen: ['2D en 3D', 'Grootheden en eenheden', 'Kwantitatieve informatie', 'Procenten', 'Verhoudingen'] },
        { naam: 'Engels', woord: 'Engels', kleur: '#24388f', leerlijnen: ['Conversing', 'Listening', 'Reading', 'Speaking', 'Writing'] },
        { naam: 'Burgerschap', kleur: '#7b2fd0', leerlijnen: ['Individu en groep', 'Maatschappijvisies en maatschappelijke vraagstukken', 'Macht en besluitvorming', 'Vrijheid en gelijkheid'], beoordeeldVanaf: 'M2' },
      ],
      kernvakken: ['Nederlands', 'Rekenen', 'Engels'],
    },
  ],
  jaardoel: { beroeps: 2 },
  perioden: [
    {
      code: 'M1', naam: 'Periode 1', van: '2026-08-24', tot: '2026-11-13', moment: 'meetmoment', beslis: false,
      norm: 'beroepsleerlijnen op stap 1. Dit is formatief, er volgt nog geen besluit.',
      doel: { beroeps: 1, bava: 1 },
      regels: [{ rol: 'beroeps', stap: 1, minAantal: 5 }],
    },
    {
      code: 'M2', naam: 'Periode 2', van: '2026-11-16', tot: '2027-02-05', moment: 'voorlopig studieadvies', beslis: true, normNaam: 'VSA-norm',
      norm: 'minimaal 4 van de 5 beroepsleerlijnen op stap 1 (waarvan leerlijn 1, 2 en 3) en minimaal 3 van de 4 basisvaardigheden voldoende.',
      doel: { beroeps: 1, bava: 1 },
      regels: [
        { rol: 'beroeps', stap: 1, minAantal: 4, verplicht: [1, 2, 3] },
        // "Voldoende" bij basisvaardigheden telt standaard niet mee: in het diagram staat geen voldoende.
        // Zet "telt" op true om een vak als voldoende te rekenen bij minstens 1 leerlijn met een behaalde stap.
        { rol: 'bava', soort: 'categorieen', minAantal: 3, perCategorie: { minLeerlijnen: 1, stap: 1 }, telt: false },
      ],
    },
  ],
  weergave: { nadrukDoelstap: true, nadrukFactor: 1.9, accent: '#e6007e', vergelijk: true },
};

/* Voorbeeldstudent voor de voorvertoning (verzonnen). Zelfde vorm als wat later uit Simulise komt. */
globalThis.SD_RAPPORT_VOORBEELD = {
  student: { naam: 'Voorbeeldstudent', groep: 'MEP1A' },
  peildatum: '2026-11-06',
  opleidingen: [
    {
      naam: 'Mediaproducer / Music Industry Professional', maxStap: 4,
      leerlijnen: [
        { naam: '1. Adviseren over mediaproducten', kleur: '#2f6fed', stap: 1, datum: '2026-11-02', historie: [{ datum: '2026-11-02', stap: 1 }, { datum: '2026-12-01', stap: 2 }] },
        { naam: '2. Voorbereiden van de mediaproductie', kleur: '#f07c1b', stap: 1, bovenVerwachting: true, datum: '2026-10-29', historie: [{ datum: '2026-10-29', stap: 1 }] },
        { naam: '3. Coördineren van de mediaproductie', kleur: '#2aa84a', stap: 1, datum: '2026-11-04', historie: [{ datum: '2026-11-04', stap: 1 }] },
        { naam: '4. Professioneel handelen', kleur: '#8e44e8', stap: 0, beoordeeldNiet: true, datum: '2026-11-03', historie: [{ datum: '2026-11-25', stap: 1 }] },
        { naam: '5. Vakvaardigheden', kleur: '#1b7f9a', stap: 1, datum: '2026-11-04', historie: [{ datum: '2026-11-04', stap: 1 }] },
      ],
    },
    {
      naam: 'BAVA 4', maxStap: 5,
      leerlijnen: [
        ...['Gesprekken', 'Lezen', 'Luisteren', 'Schrijven', 'Spreken'].map((naam) => ({ naam, stap: { Lezen: 2, Schrijven: 3 }[naam] || 0, datum: { Lezen: '2026-11-04', Schrijven: '2026-10-30' }[naam] || null })),
        ...['2D en 3D', 'Grootheden en eenheden', 'Kwantitatieve informatie', 'Procenten', 'Verhoudingen', 'Conversing', 'Listening', 'Reading', 'Speaking', 'Writing',
          'Individu en groep', 'Maatschappijvisies en maatschappelijke vraagstukken', 'Macht en besluitvorming', 'Vrijheid en gelijkheid'].map((naam) => ({ naam, stap: 0 })),
      ],
    },
  ],
};
