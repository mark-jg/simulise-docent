/* Vandaag (roadmap 2.2): een eigen startscherm met je beoordeelwachtrij over alle groepen.
 *
 * Openen: menu-item "Vandaag" bovenaan de zijbalk, Cmd+K > "Vandaag", of een adres dat eindigt op
 * #vandaag (handig als bladwijzer). Het scherm staat in de pagina van Simulise zelf: de bovenbalk en de
 * zijbalk blijven staan, alleen de inhoud (#content) wordt tijdelijk verborgen, net als bij de rapporten.
 * Sluiten met Esc, de knop Terug, of door ergens anders heen te gaan.
 *
 * Gegevens: dezelfde lijst als Beoordelen, via modules/gql.js (in de pagina) met je eigen sessie:
 *   sdDocentVandaag   assignedAssignments(page, first, filters, orderBy) { data { id status deliveredAt
 *                     connectableKey user { username } assignment { id title forEducations }
 *                     assignmentConnection { id connectable { id } } } aggregations { groups statuses }
 *                     paginatorInfo }
 * Eerst de openstaande inleveringen (Te beoordelen, Wordt beoordeeld, Te beantwoorden), daarna de
 * afgeronde, alleen om per opdracht "N van M nagekeken" te kunnen tonen.
 *
 * Thuispagina per klas: hetzelfde scherm voor één klas (klik op een klas in de zijbalk van de schil, Cmd+K
 * > "Klas <naam>", of een adres dat eindigt op #klas=<uuid>). De vraag krijgt dan het filter group:<uuid>;
 * de tellers Te laat, Nog niet gestart en Klaar komen uit aggregations.statuses (die volgen het groepsfilter,
 * niet het statusfilter). Onderaan snelkoppelingen naar de pagina's van die klas in Simulise.
 *
 * Privacy: het scherm toont opdrachten en groepen, geen studenten. De gebruikersnaam wordt alleen
 * gebruikt om de link naar het beoordeelscherm op te bouwen (dezelfde link als in de Beoordelen-lijst)
 * en blijft in het geheugen. Bewaard wordt alleen (chrome.storage.local vdDag): de datum, het aantal
 * afgeronde beoordelingen aan het begin van de dag en de dagen waarop je iets hebt nagekeken.
 * Meetmomenten van andere opleidingen en uitsluitwoorden volgen de regels van Beoordelen (SD.regels).
 * Let op: zonder __typename binnen aggregations geeft Simulise "Internal server error" (gezien in november 2026).
 * Schrijven doet dit scherm niet: beoordelen gebeurt in Simulise zelf.
 */
SD.register({
  id: 'vandaag',
  OPEN: 'status:BEING_PROCESSED,FEEDBACK_ASKED,HANDED_IN',
  KLAAR: 'status:FINISHED',
  REST: 'status:NOT_STARTED,IN_PROGRESS,DEADLINE_PAST',
  PER_PAGINA: 100,
  MAX_PAGINAS: 10,

  Q: `query sdDocentVandaag($page: Int!, $perPage: Int!, $filters: [String!]!, $orderBy: AssignedAssignmentsOrder) {
    assignedAssignments(page: $page, first: $perPage, filters: $filters, orderBy: $orderBy) {
      data { id status deliveredAt endDate connectableKey user { username } assignment { id title forEducations }
        assignmentConnection { id connectable { ... on WorkGroup { id } ... on SchoolGroup { id } } } }
      aggregations { groups { key item { autocompletion { id text value } } count } statuses { key count } __typename }
      paginatorInfo { total currentPage hasMorePages }
    }
  }`,

  CSS: `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .scherm { height: 100%; overflow-y: auto; background: var(--sim-bg, #f4f5f7); color: var(--sim-text, #1e2328);
      font: 15px/1.5 var(--sim-font, Inter, system-ui, sans-serif); }
    .binnen { max-width: 1100px; padding: 24px 45px 48px; }
    @media (max-width: 767px) { .binnen { padding: 16px 15px 32px; } }
    .top { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
    .ring { flex: none; }
    .ring circle { fill: none; stroke-width: 9; }
    .ring .baan { stroke: var(--sim-border, #e3e6ea); }
    .ring .boog { stroke: var(--sim-accent, #0e8a74); stroke-linecap: round; transition: stroke-dashoffset .5s ease; }
    .ring text { font-size: 20px; font-weight: 600; fill: currentColor; }
    .kop { flex: 1; min-width: 220px; }
    h1 { margin: 0; font-size: 26px; font-weight: 600; }
    .sub { margin: 2px 0 0; color: var(--sim-text-2, #5b6470); }
    button, a.knop { font: inherit; cursor: pointer; border-radius: 999px; padding: 9px 18px; border: 1px solid var(--sim-border, #e3e6ea);
      background: var(--sim-surface, #fff); color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
    button:hover, a.knop:hover { border-color: var(--sim-accent, #0e8a74); }
    button:focus-visible, a:focus-visible { outline: 2px solid var(--sim-accent, #0e8a74); outline-offset: 2px; }
    a.start { background: var(--sim-accent, #0e8a74); border-color: var(--sim-accent, #0e8a74); color: #fff; font-weight: 600; }
    a.start[aria-disabled="true"] { opacity: .45; pointer-events: none; }
    .stil { border: 0; background: none; padding: 6px 10px; color: var(--sim-text-2, #5b6470); }
    .tegels { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .tegel { background: var(--sim-surface, #fff); border: 1px solid var(--sim-border, #e3e6ea); border-radius: var(--sim-radius, 12px); padding: 14px 16px; }
    .tegel small { display: block; color: var(--sim-text-2, #5b6470); font-size: 13px; }
    .tegel b { font-size: 26px; font-weight: 600; }
    .tegel b.laat { color: var(--sim-danger, #c0392b); }
    .chips { margin-bottom: 14px; }
    .chip[aria-pressed="true"] { background: var(--sim-accent-soft, #e6f4f1); border-color: var(--sim-accent, #0e8a74); color: var(--sim-accent-text, #0b6f5e); }
    .lijst { background: var(--sim-surface, #fff); border: 1px solid var(--sim-border, #e3e6ea); border-radius: var(--sim-radius, 12px); padding: 4px 18px 8px; }
    .rij { display: grid; grid-template-columns: minmax(0, 1fr) 84px 96px 120px; gap: 14px; align-items: center; padding: 11px 0;
      border-top: 1px solid var(--sim-border, #e3e6ea); color: inherit; text-decoration: none; }
    .rij:first-child { border-top: 0; }
    a.rij:hover .titel { color: var(--sim-accent, #0e8a74); }
    .rij.kopregel { font-size: 12px; color: var(--sim-text-3, #8a93a0); padding: 8px 0; }
    .wat { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .titel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pil { flex: none; font-size: 12px; padding: 2px 9px; border-radius: 999px; background: var(--sim-accent-soft, #e6f4f1); color: var(--sim-accent-text, #0b6f5e); white-space: nowrap; }
    .pil.grijs { background: var(--sim-surface-2, #eef0f3); color: var(--sim-text-2, #5b6470); }
    .pil.geel { background: var(--sim-warn-soft, #fdf3d7); color: var(--sim-warn, #8a6100); }
    .pil.rood { background: var(--sim-danger-soft, #fbe6e3); color: var(--sim-danger, #c0392b); }
    .groep { color: var(--sim-text-2, #5b6470); }
    .voortgang small { font-size: 12px; color: var(--sim-text-2, #5b6470); }
    .voortgang { display: grid; gap: 4px; }
    .balk { display: block; height: 6px; border-radius: 3px; background: var(--sim-surface-2, #eef0f3); overflow: hidden; }
    .balk i { display: block; height: 100%; background: var(--sim-accent, #0e8a74); }
    .held { position: relative; overflow: hidden; border-radius: calc(var(--sim-radius, 12px) + 8px); padding: 38px 28px 28px; margin-bottom: 20px; color: var(--hk, #2a2440);
      background: linear-gradient(120deg, var(--h1, #dfeaff), var(--h2, #ece6ff)); }
    .held.ochtend { --h1: #ffe9c4; --h2: #ffd2dc; --hk: #47301c; }
    .held.middag { --h1: #d6ebff; --h2: #e6e0ff; --hk: #22284a; }
    .held.avond { --h1: #2c2b5a; --h2: #5a4283; --hk: #f4f0ff; }
    .held.klas { --h1: color-mix(in srgb, var(--k, #4f5bd5) 30%, #fff); --h2: color-mix(in srgb, var(--k, #4f5bd5) 10%, #fff); --hk: #24222a; }
    .held .sub, .held .groet { color: inherit; opacity: .8; }
    .held .ring .baan { stroke: color-mix(in srgb, currentColor 16%, transparent); }
    .held .ring .boog { stroke: currentColor; }
    .held.klas .ring .boog { stroke: var(--k, currentColor); }
    .held .stil { color: inherit; opacity: .75; position: absolute; top: 6px; right: 10px; font-size: 13px; padding: 3px 9px; }
    .groet { margin: 0 0 2px; font-size: 15px; }
    .held h1 { font-size: 34px; line-height: 1.15; letter-spacing: -.01em; }
    .week { display: flex; gap: 10px; margin-top: 14px; }
    .week span { display: grid; justify-items: center; gap: 4px; font-size: 11px; opacity: .8; }
    .week i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid currentColor; opacity: .45; }
    .week .ja i { background: currentColor; opacity: 1; }
    .week .nu { opacity: 1; font-weight: 600; }
    .week .nu i { opacity: 1; }
    .volgende { flex: 0 1 290px; min-width: 220px; background: color-mix(in srgb, var(--sim-surface, #fff) 86%, transparent); color: var(--sim-text, #1e2328);
      border-radius: var(--sim-radius, 12px); padding: 14px 16px; display: grid; gap: 4px; }
    .volgende small { font-size: 12px; color: var(--sim-text-3, #8a93a0); }
    .volgende b { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .volgende .bij { font-size: 13px; color: var(--sim-text-2, #5b6470); display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
    .volgende .start { margin-top: 8px; justify-content: center; }
    .confetti { position: absolute; inset: 0; pointer-events: none; }
    .confetti i { position: absolute; top: -12px; width: 8px; height: 14px; border-radius: 2px; background: var(--c); left: var(--x); animation: val 1.8s var(--d) ease-in forwards; }
    @keyframes val { to { transform: translateY(260px) rotate(540deg); opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .confetti { display: none; } .ring .boog { transition: none; } }
    h2 { margin: 26px 0 10px; font-size: var(--sim-title-2, 17px); font-weight: 600; }
    .strook { display: grid; grid-template-columns: minmax(0, 240px) minmax(0, 1fr); gap: 6px 18px; align-items: center; padding: 12px 0; border-top: 1px solid var(--sim-border, #e3e6ea); }
    .strook:first-child { border-top: 0; }
    .strook .titel { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; }
    .strook .titel > a:first-child { max-width: 100%; color: var(--sim-text, #1e2328); font-weight: 500; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .strook .titel > a:first-child:hover { color: var(--sim-accent-text, #0b6f5e); text-decoration: underline; }
    .strook a.nakijk { padding: 3px 11px; border-radius: 999px; background: var(--k, var(--sim-accent, #0e8a74)); color: #fff; font-size: 12px; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .strook a.nakijk:hover { filter: brightness(.93); }
    .strook .som { grid-column: 2; font-size: 12px; color: var(--sim-text-2, #5b6470); }
    .stippen { display: flex; flex-wrap: wrap; gap: 5px; }
    .stippen i { width: 13px; height: 13px; border-radius: 50%; box-sizing: border-box; }
    .stippen .klaar, .legenda .klaar { background: var(--k, var(--sim-accent, #0e8a74)); }
    .stippen .wacht, .legenda .wacht { background: var(--sim-surface, #fff); border: 3px solid var(--k, var(--sim-accent, #0e8a74)); }
    .stippen .bezig, .legenda .bezig { background: color-mix(in srgb, var(--k, var(--sim-accent, #0e8a74)) 35%, var(--sim-surface, #fff)); }
    .stippen .laat, .legenda .laat { background: var(--sim-danger, #c0392b); }
    .stippen .niet, .legenda .niet { background: var(--sim-surface-2, #eef0f3); border: 1px solid var(--sim-border-2, #cfd4da); }
    .strook .titel small.dl { font-size: 12px; color: var(--sim-text-3, #8a93a0); }
    .strook .titel small.dl.voorbij { color: var(--sim-text-2, #5b6470); }
    .deadlines { padding: 14px 18px 16px; }
    .dl-kop { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; font-size: 13px; color: var(--sim-text-2, #5b6470); }
    .dl-kop label { display: inline-flex; align-items: center; gap: 8px; }
    .dl-kop select { font: inherit; font-size: 13px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--sim-border-2, #cfd4da); background: var(--sim-surface, #fff); color: var(--sim-text, #1e2328); }
    .dl-twee { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 8px 28px; margin-top: 12px; }
    .dl-twee h3 { margin: 0 0 4px; font-size: 13px; font-weight: 600; color: var(--sim-text-2, #5b6470); }
    .dl-twee h3 span { margin-left: 4px; padding: 1px 8px; border-radius: 999px; background: var(--sim-surface-2, #eef0f3); font-size: 12px; }
    .dl-rij { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 2px 12px; padding: 9px 0; border-top: 1px solid var(--sim-border, #e3e6ea); align-items: baseline; }
    .dl-dag b { display: block; font-size: 13px; font-weight: 600; }
    .dl-dag small { font-size: 12px; color: var(--sim-text-3, #8a93a0); }
    .dl-rij > a { color: var(--sim-text, #1e2328); font-weight: 500; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dl-rij > a:hover { color: var(--sim-accent-text, #0b6f5e); text-decoration: underline; }
    .dl-rij .som { grid-column: 2; font-size: 12px; color: var(--sim-text-2, #5b6470); }
    .dl-leeg { margin: 8px 0 0; font-size: 13px; color: var(--sim-text-3, #8a93a0); }
    .legenda { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 10px 0 0; font-size: 12px; color: var(--sim-text-2, #5b6470); }
    .legenda span { display: inline-flex; align-items: center; gap: 6px; }
    .legenda i { width: 11px; height: 11px; border-radius: 50%; box-sizing: border-box; }
    .chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .chip { border-radius: var(--sim-radius, 12px); padding: 10px 12px; justify-content: flex-start; text-align: left; gap: 10px; }
    .chip svg { flex: none; }
    .chip svg circle { fill: none; stroke-width: 5; }
    .chip svg .baan { stroke: var(--sim-border, #e3e6ea); }
    .chip svg .boog { stroke: var(--k, var(--sim-accent, #0e8a74)); stroke-linecap: round; }
    .chip span { display: grid; line-height: 1.25; }
    .chip b { font-weight: 600; }
    .chip small { font-size: 12px; color: var(--sim-text-2, #5b6470); }
    .chip[aria-pressed="true"] { box-shadow: inset 0 0 0 1.5px var(--k, var(--sim-accent, #0e8a74)); border-color: var(--k, var(--sim-accent, #0e8a74)); }
    .stip { flex: none; display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--k, var(--sim-accent, #0e8a74)); margin-right: 8px; }
    h1 .stip { width: 20px; height: 20px; margin-right: 12px; }
    .snel { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .snel a { font-size: 14px; padding: 7px 14px; }
    .uitleg { margin: 10px 0 0; font-size: 13px; color: var(--sim-text-3, #8a93a0); }
    .melding { padding: 22px 0; color: var(--sim-text-2, #5b6470); }
    .melding.fout { color: var(--sim-danger, #c0392b); }
    .voet { display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; margin-top: 12px; font-size: 13px; color: var(--sim-text-3, #8a93a0); }
    .voet label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
    .voet a { color: var(--sim-accent, #0e8a74); }
    @media (max-width: 640px) { .rij { grid-template-columns: minmax(0, 1fr) 70px 84px; } .rij > :nth-child(4) { display: none; } }
  `,

  init(SD) {
    this.SD = SD;
    this.groep = '';
    this.klas = null; // { id } als het scherm de thuispagina van één klas is
    this.toonVerborgen = false;
    this._hash = () => {
      const klas = location.hash.match(/^#klas=([\w-]{1,64})$/)?.[1];
      if (klas) this.open({ id: klas });
      else if (location.hash === '#vandaag') this.open();
    };
    window.addEventListener('hashchange', this._hash);
    this._toets = (e) => { if (e.key === 'Escape' && this.host) { e.stopPropagation(); this.sluit(); } };
    window.addEventListener('keydown', this._toets, true);
    this._klik = (e) => {
      const klas = e.target.closest?.('.sim-docent-klas');
      // Een ander menu-item: eerst de pagina van Simulise terugzetten, dan gaat de klik gewoon door.
      if (this.host && !klas && e.target.closest?.('aside#nav a') && !e.target.closest('.sim-docent-vandaag')) { this.sluit(); return; }
      if (!klas && !e.target.closest?.('.sim-docent-vandaag')) return;
      e.preventDefault(); e.stopPropagation();
      this.open(klas ? { id: klas.dataset.klas } : null);
    };
    document.addEventListener('click', this._klik, true);
    SD.addCommand('vandaag', 'Vandaag: wat moet ik nakijken', () => this.open());
    // Cmd+K: elke klas als opdracht (namen uit modules/klassen.js).
    this._klasOpdrachten = [];
    const klasOpdrachten = (lijst) => {
      this._klasOpdrachten.forEach((id) => SD.removeCommand(id));
      this._klasOpdrachten = lijst.map((k) => { const id = `klas-${k.id}`; SD.addCommand(id, `Klas ${k.naam}: thuispagina`, () => this.open({ id: k.id })); return id; });
    };
    this._ontvolg = SD.klassen.volg(klasOpdrachten);
    SD.klassen.laad().then(klasOpdrachten, () => {});
    SD.ready(() => {
      if (!this.SD) return; // intussen uitgezet
      this.menu();
      this._stop = SD.observe(() => { this.menu(); this.bewaak(); }, 1000);
      this._pop = () => this.bewaak();
      window.addEventListener('popstate', this._pop);
      this._hash();
    });
  },

  update() { if (this.host && this.model) this.teken(); },

  destroy(SD) {
    window.removeEventListener('hashchange', this._hash);
    this._ontvolg?.();
    (this._klasOpdrachten || []).forEach((id) => SD.removeCommand(id));
    window.removeEventListener('keydown', this._toets, true);
    window.removeEventListener('popstate', this._pop);
    document.removeEventListener('click', this._klik, true);
    SD.removeCommand('vandaag');
    this._stop?.();
    document.querySelectorAll('.sim-docent-vandaag-li').forEach((el) => el.remove());
    this.sluit();
    this.SD = null;
  },

  /* Menu-item bovenaan de zijbalk: een kopie van het eerste item, zodat het er hetzelfde uitziet. */
  menu() {
    const nav = document.querySelector('aside#nav .nav-main');
    if (!nav || nav.querySelector('.sim-docent-vandaag-li')) return;
    const eerste = nav.querySelector(':scope > li');
    if (!eerste?.querySelector('a')) return;
    const li = eerste.cloneNode(true);
    li.classList.remove('active');
    li.classList.add('sim-docent-vandaag-li');
    const a = li.querySelector('a');
    a.classList.add('sim-docent-vandaag');
    a.setAttribute('href', '#vandaag');
    a.title = 'Vandaag';
    a.removeAttribute('data-original-title');
    const icoon = a.querySelector('i');
    if (icoon) icoon.className = icoon.className.replace(/\bfa-(?!fw\b)[a-z0-9-]+/g, '').trim() + ' fa-sun';
    // De tekst van het item: de laatste tekst in de link.
    const teksten = [];
    const loop = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    while (loop.nextNode()) if (loop.currentNode.nodeValue.trim()) teksten.push(loop.currentNode);
    if (teksten.length) { teksten.at(-1).nodeValue = 'Vandaag'; teksten.slice(0, -1).forEach((t) => { t.nodeValue = ''; }); }
    else a.append('Vandaag');
    li.querySelectorAll('.badge, ul').forEach((el) => el.remove());
    nav.prepend(li);
  },

  /* Het menu-item Vandaag als actief tonen zolang het scherm open is; daarna het oude item weer. */
  markeer(aan) {
    const li = this.klas ? document.querySelector(`aside#nav .sim-docent-klas[data-klas="${CSS.escape(this.klas.id)}"]`)?.parentElement : document.querySelector('.sim-docent-vandaag-li');
    if (aan) {
      this._actief = [...document.querySelectorAll('aside#nav .nav-main > li.active')];
      this._actief.forEach((el) => el.classList.remove('active'));
      li?.classList.add('active');
    } else {
      li?.classList.remove('active');
      (this._actief || []).forEach((el) => el.classList.add('active'));
      this._actief = null;
    }
  },

  /* Gaat Simulise naar een andere pagina (zonder herladen), dan moet de inhoud weer zichtbaar zijn. */
  bewaak() {
    if (this.host && this._adres !== location.pathname + location.search) this.sluit();
  },

  /* ---------- GraphQL via de brug (modules/gql.js) ---------- */
  gql(variables) { return this.SD.gql('sdDocentVandaag', this.Q, variables); },

  /* Alle pagina's van één filter. Geeft { rijen, groepen, statussen } of { fout }. */
  async haal(filter) {
    const rijen = [];
    let agg = null;
    for (let page = 1; page <= this.MAX_PAGINAS; page++) {
      const r = await this.gql({ page, perPage: this.PER_PAGINA, filters: this.klas ? [filter, `group:${this.klas.id}`] : [filter], orderBy: { field: 'UPDATED', direction: 'ASC' } });
      const aa = r.data?.assignedAssignments;
      if (!aa) return { fout: r.errors?.[0] || 'Simulise gaf geen gegevens.' };
      rijen.push(...(aa.data || []));
      agg = agg || aa.aggregations || {};
      if (!aa.paginatorInfo?.hasMorePages) break;
    }
    return { rijen, groepen: agg?.groups || [], statussen: agg?.statuses || [] };
  },

  /* Vakcode uit de titel ("ENG_1.5: ...", "BO - ...", "M1BUR - ..."); null als er geen in staat. */
  vak(titel) {
    const t = String(titel || '').trim();
    if (/^meetmoment\b/i.test(t)) return 'Meetmoment';
    const m = t.match(/^M\d{1,2}([A-Z]{2,5})\b/) || t.match(/^([A-Z]{2,5})(?=[ _.:|-]|\d)/);
    return m ? m[1] : null;
  },

  dagen(iso, nu) {
    const t = Date.parse(iso || '');
    return Number.isFinite(t) ? Math.max(0, Math.floor((nu - t) / 864e5)) : null;
  },

  /* Link naar het beoordeelscherm van Simulise, opgebouwd zoals de Beoordelen-lijst dat doet. */
  link(r) {
    const groep = r.assignmentConnection?.connectable?.id;
    const wie = r.user?.username;
    if (!wie || !r.id) return this.lijstLink(groep);
    const q = new URLSearchParams({ _continue: '/assignments/assigned' });
    if (groep) {
      q.set('group', groep);
      q.set('filter_source', 'GROUP_ASSIGNMENTS');
      q.set('filters', ['reviewer:*', `group:${groep}`, r.connectableKey].filter(Boolean).join('|'));
    }
    return `/@${encodeURIComponent(wie)}/assignment/${encodeURIComponent(r.id)}/review?${q}`;
  },

  lijstLink(groep) { return `/assignments/assigned?filters=${groep ? `group:${groep}|` : ''}${this.OPEN}`; },

  /* Van rijen naar wat het scherm toont: per opdracht en groep één regel. Geen studentgegevens. */
  bouw(open, klaar, nu) {
    const s = this.SD.settings;
    const naam = {};
    for (const g of open.groepen) naam[String(g.key)] = String(g.item?.autocompletion?.text ?? g.key).slice(0, 60);
    for (const g of klaar?.groepen || []) naam[String(g.key)] ??= String(g.item?.autocompletion?.text ?? g.key).slice(0, 60);
    const sleutel = (r) => `${r.assignment?.id || r.id}|${r.assignmentConnection?.connectable?.id || ''}`;
    const nagekeken = {};
    for (const r of klaar?.rijen || []) nagekeken[sleutel(r)] = (nagekeken[sleutel(r)] || 0) + 1;
    const regels = new Map();
    let verborgen = 0;
    for (const r of open.rijen) {
      const titel = r.assignment?.title || '';
      const weg = SD.regels.andereOpleiding(titel, s) || SD.regels.uitsluit(titel, s);
      if (weg) verborgen++;
      if (weg && !this.toonVerborgen) continue;
      const k = sleutel(r);
      const groep = r.assignmentConnection?.connectable?.id || '';
      let x = regels.get(k);
      if (!x) regels.set(k, x = { titel, vak: this.vak(titel), groep, groepNaam: naam[groep] || (groep ? 'Groep' : 'Geen groep'), open: 0, bezig: 0, wacht: null, link: null, nagekeken: nagekeken[k] || 0, verborgen: weg });
      x.open++;
      if (r.status === 'BEING_PROCESSED') x.bezig++;
      const w = this.dagen(r.deliveredAt, nu);
      if (x.link == null || (w != null && (x.wacht == null || w > x.wacht))) x.link = this.link(r);
      if (w != null && (x.wacht == null || w > x.wacht)) x.wacht = w;
    }
    const lijst = [...regels.values()].sort((a, b) => (b.wacht ?? -1) - (a.wacht ?? -1) || a.titel.localeCompare(b.titel));
    const afgerond = Number((klaar?.statussen?.length ? klaar.statussen : open.statussen).find((x) => x.key === 'FINISHED')?.count);
    return { lijst, verborgen, afgerond: Number.isFinite(afgerond) ? afgerond : null };
  },

  /* Hoeveel vandaag nagekeken, en hoeveel werkdagen op rij. Alleen tellers en datums. */
  async dag(afgerond, nu) {
    const datum = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const vandaag = datum(new Date(nu));
    let { vdDag } = await chrome.storage.local.get({ vdDag: null });
    if (!vdDag || typeof vdDag !== 'object') vdDag = { datum: vandaag, start: afgerond, dagen: [] };
    if (vdDag.datum !== vandaag || !Number.isFinite(vdDag.start)) { vdDag.datum = vandaag; vdDag.start = afgerond; }
    if (afgerond != null && afgerond < vdDag.start) vdDag.start = afgerond; // teruggezette beoordeling
    const klaar = afgerond == null || vdDag.start == null ? 0 : afgerond - vdDag.start;
    const dagen = new Set(Array.isArray(vdDag.dagen) ? vdDag.dagen : []);
    if (klaar > 0) dagen.add(vandaag);
    vdDag.dagen = [...dagen].sort().slice(-60);
    await chrome.storage.local.set({ vdDag });
    // Reeks: werkdagen terugtellen vanaf vandaag (of gisteren als er vandaag nog niets is); weekend telt niet mee.
    let reeks = 0;
    const d = new Date(nu);
    for (let i = 0; i < 90; i++) {
      const werkdag = d.getDay() !== 0 && d.getDay() !== 6;
      if (dagen.has(datum(d))) reeks++;
      else if (werkdag && i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return { klaar, reeks, dagen: [...dagen] };
  },

  async laad() {
    this.model = null;
    this.status(this.klas ? 'De klas wordt opgehaald…' : 'Je wachtrij wordt opgehaald…');
    const nu = Date.now();
    const open = await this.haal(this.OPEN);
    if (!this.host) return;
    if (open.fout) { this.status(`Ophalen lukte niet: ${open.fout}`, true); return; }
    const klaar = await this.haal(this.KLAAR);
    if (!this.host) return;
    // Thuispagina van een klas: ook wat nog niet is ingeleverd, voor de stippenkaart.
    const rest = this.klas ? await this.haal(this.REST) : null;
    if (!this.host) return;
    this.bron = { open, klaar: klaar.fout ? null : klaar, rest: rest && !rest.fout ? rest : null, nu };
    const eerste = this.bouw(open, this.bron.klaar, nu);
    this.voortgang = this.klas ? null : await this.dag(eerste.afgerond, nu);
    if (!this.host) return;
    this.model = eerste;
    this.teken();
  },

  /* ---------- Scherm ---------- */
  open(klas = null) {
    if (this.host) {
      if ((this.klas?.id || null) === (klas?.id || null)) return;
      this.sluit(); // van Vandaag naar een klas of andersom
    }
    this.klas = klas?.id ? { id: String(klas.id) } : null;
    this.periode = null; // deadlines: begint bij de periode van vandaag (modules/perioden.js)
    this.SD.perioden.laad().then(() => { if (this.host && this.klas) this.teken(); }, () => {});
    this.groep = ''; // elke keer beginnen met alle groepen
    const { host, shadow } = this.SD.shadowHost('sim-docent-vandaag', this.CSS);
    this.host = host;
    this.scherm = Object.assign(document.createElement('div'), { className: 'scherm' });
    this.scherm.setAttribute('role', 'region');
    this.scherm.setAttribute('aria-label', this.klas ? 'Thuispagina van de klas' : 'Vandaag');
    shadow.append(this.scherm);
    // In de pagina zelf: de inhoud van Simulise verbergen en het scherm op die plek zetten.
    const plek = document.querySelector('#content') || document.body;
    this._verborgen = plek === document.body ? [] : [...plek.children].filter((c) => c.style.display !== 'none');
    for (const c of this._verborgen) { c.dataset.sdvDisplay = c.style.display; c.style.display = 'none'; }
    plek.prepend(host);
    // #content is een tabelcel; een vaste hoogte tot de onderkant van het venster laat het scherm zelf scrollen.
    this._maat = () => { if (this.host) this.host.style.cssText = `display:block;height:calc(100vh - ${Math.max(0, Math.round(plek.getBoundingClientRect().top))}px)`; };
    this._maat();
    window.addEventListener('resize', this._maat);
    this._adres = location.pathname + location.search;
    this.markeer(true);
    this.scherm.addEventListener('click', (e) => {
      // Een link naar de opdrachten van deze klas terwijl die pagina al open staat: alleen het adres verandert, dus zelf sluiten.
      const naarMatrix = e.target.closest('a[href*="#sd-opdracht="]');
      if (naarMatrix && new URL(naarMatrix.href, location.href).pathname === location.pathname) setTimeout(() => this.sluit(), 0);
      const el = e.target.closest('[data-actie]');
      if (!el) return;
      const actie = el.dataset.actie;
      if (actie === 'sluit') this.sluit();
      else if (actie === 'ververs') this.laad();
      else if (actie === 'groep') { this.groep = el.dataset.groep || ''; this.teken(); }
    });
    this.scherm.addEventListener('change', (e) => {
      if (e.target.matches('[data-verborgen]')) { this.toonVerborgen = e.target.checked; this.teken(); }
      if (e.target.matches('[data-periode]')) { this.periode = e.target.value; this.teken(); }
    });
    this.laad();
  },

  sluit() {
    if (!this.host) return;
    this.host.remove();
    this.host = this.scherm = this.model = this.bron = null;
    for (const c of this._verborgen || []) { c.style.display = c.dataset.sdvDisplay || ''; delete c.dataset.sdvDisplay; }
    this._verborgen = null;
    window.removeEventListener('resize', this._maat);
    this.markeer(false);
    this.klas = null;
    if (location.hash === '#vandaag' || /^#klas=/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
  },

  status(tekst, fout) {
    if (!this.scherm) return;
    const esc = this.esc;
    this.scherm.innerHTML = `<div class="binnen"><div class="top"><div class="kop"><h1>${esc(this.klas ? this.SD.klassen.naam(this.klas.id) || 'Klas' : 'Vandaag')}</h1></div>
      <button type="button" class="stil" data-actie="sluit">Terug</button></div>
      <p class="melding${fout ? ' fout' : ''}" role="status">${esc(tekst)}</p>
      ${fout ? `<p><button type="button" data-actie="ververs">Opnieuw proberen</button> <a class="knop" href="${esc(this.lijstLink(''))}">Naar Beoordelen in Simulise</a></p>` : ''}</div>`;
  },

  /* Voornaam uit de bovenbalk van Simulise, voor de begroeting. Alleen in beeld, niet bewaard. */
  voornaam() {
    const namen = [...document.querySelectorAll('.nav-user .dropdown-toggle')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /^\p{L}[\p{L}' -]{1,40}$/u.test(t));
    return namen.sort((a, b) => b.length - a.length)[0]?.split(' ')[0] || '';
  },

  dagdeel(nu) {
    const u = new Date(nu).getHours();
    return u >= 5 && u < 12 ? ['ochtend', 'Goedemorgen'] : u >= 12 && u < 18 ? ['middag', 'Goedemiddag'] : ['avond', 'Goedenavond'];
  },

  /* Maandag tot en met vrijdag van deze week: op welke dagen is er nagekeken. */
  week(nu, dagen = []) {
    const d = new Date(nu), set = new Set(dagen);
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const vandaag = iso(d);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return ['ma', 'di', 'wo', 'do', 'vr'].map((naam) => { const dag = iso(d); d.setDate(d.getDate() + 1); return `<span class="${set.has(dag) ? 'ja' : ''}${dag === vandaag ? ' nu' : ''}"><i></i>${naam}</span>`; }).join('');
  },

  /* Een datum van Simulise als JJJJ-MM-DD (de server geeft een tijdstempel of dd-mm-jjjj); leeg als er geen is. */
  datum(x) {
    const t = String(x || '');
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = Date.parse(t);
    return Number.isFinite(d) ? new Date(d).toISOString().slice(0, 10) : '';
  },
  dagTekst(iso, metJaar = false) { const [j, m, d] = iso.split('-').map(Number); return new Date(j, m - 1, d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', ...(metJaar ? { year: 'numeric' } : {}) }); },

  /* De deadlines van een klas in één periode: wat nog komt (eerst de dichtstbijzijnde) en wat voorbij is (laatste eerst). */
  deadlines(stroken, k) {
    const esc = this.esc, P = this.SD.perioden, nu = P.vandaag();
    if (this.periode == null) this.periode = P.huidige()?.code || '';
    const code = P.vind(this.periode) ? this.periode : '';
    const met = stroken.filter((x) => x.deadline && P.bevat(code, x.deadline));
    const komt = met.filter((x) => x.deadline >= nu).sort((a, b) => a.deadline.localeCompare(b.deadline));
    const voorbij = met.filter((x) => x.deadline < nu).sort((a, b) => b.deadline.localeCompare(a.deadline));
    const dagen = (iso) => Math.round((Date.parse(iso) - Date.parse(nu)) / 864e5);
    const wanneer = (iso) => { const n = dagen(iso); return n === 0 ? 'vandaag' : n === 1 ? 'morgen' : n > 0 ? `over ${n} dagen` : n === -1 ? 'gisteren' : `${-n} dagen geleden`; };
    const regel = (x) => `<div class="dl-rij"><span class="dl-dag"><b>${esc(this.dagTekst(x.deadline))}</b><small>${esc(wanneer(x.deadline))}</small></span>
      <a href="/groups/school/${esc(encodeURIComponent(k.id))}/assignments#sd-opdracht=${esc(encodeURIComponent(x.titel))}" title="Open het overzicht per student">${esc(x.titel)}</a>
      <span class="som">${[[x.klaar, 'klaar'], [x.wacht, x.wacht === 1 ? 'wacht op jou' : 'wachten op jou'], [x.bezig, 'bezig'], [x.laat, 'te laat'], [x.niet, 'niet gestart']].filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(' · ')}</span></div>`;
    const zonder = stroken.filter((x) => !x.deadline).length;
    const p = P.vind(code);
    return `<h2>Deadlines</h2>
      <div class="lijst kaart deadlines"><div class="dl-kop">${P.lijst.length ? `<label>Periode <select data-periode>${[['', 'Alle periodes'], ...P.lijst.map((x) => [x.code, `${x.code}${x.naam ? ` · ${x.naam}` : ''}`])].map(([v, t]) => `<option value="${esc(v)}"${v === code ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
          ${p ? `<small>${esc(this.dagTekst(p.van, true))} tot en met ${esc(this.dagTekst(p.tot, true))}</small>` : ''}` : '<small>Stel periodes in via het zijpaneel van de extensie (Periodes en normen) om per periode te kijken.</small>'}</div>
        <div class="dl-twee"><div><h3>Aankomend <span>${komt.length}</span></h3>${komt.map(regel).join('') || '<p class="dl-leeg">Geen deadlines meer in deze periode.</p>'}</div>
          <div><h3>Afgelopen <span>${voorbij.length}</span></h3>${voorbij.map(regel).join('') || '<p class="dl-leeg">Nog geen deadline voorbij in deze periode.</p>'}</div></div>
        ${zonder ? `<p class="dl-leeg">${zonder} ${zonder === 1 ? 'opdracht heeft' : 'opdrachten hebben'} geen deadline.</p>` : ''}</div>`;
  },

  /* Stippenkaart van een klas: per opdracht één stip per inlevering, zonder namen. */
  SOORT: { FINISHED: 'klaar', HANDED_IN: 'wacht', FEEDBACK_ASKED: 'wacht', BEING_PROCESSED: 'wacht', IN_PROGRESS: 'bezig', DEADLINE_PAST: 'laat' },
  stroken() {
    const per = new Map();
    for (const bron of [this.bron.klaar, this.bron.open, this.bron.rest]) {
      for (const r of bron?.rijen || []) {
        const id = r.assignment?.id || r.id;
        let x = per.get(id);
        if (!x) per.set(id, x = { titel: r.assignment?.title || '', klaar: 0, wacht: 0, bezig: 0, laat: 0, niet: 0, link: '', deadline: '' });
        if (!x.deadline) x.deadline = this.datum(r.endDate);
        x[this.SOORT[r.status] || 'niet']++;
        // De eerste inlevering die op jou wacht: daar gaat de knop Nakijken heen.
        if (bron === this.bron.open && !x.link) x.link = this.link(r);
      }
    }
    return [...per.values()].sort((a, b) => b.wacht - a.wacht || a.titel.localeCompare(b.titel));
  },

  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),

  teken() {
    if (!this.scherm || !this.bron) return;
    const esc = this.esc;
    const m = this.model = this.bouw(this.bron.open, this.bron.klaar, this.bron.nu);
    const groepen = new Map();
    for (const x of m.lijst) { const g = groepen.get(x.groep); groepen.set(x.groep, { naam: x.groepNaam, n: (g?.n || 0) + x.open, na: (g?.na || 0) + x.nagekeken }); }
    if (this.groep && !groepen.has(this.groep)) this.groep = '';
    const lijst = m.lijst.filter((x) => !this.groep || x.groep === this.groep);
    const open = lijst.reduce((s, x) => s + x.open, 0);
    const totaalOpen = m.lijst.reduce((s, x) => s + x.open, 0);
    const bezig = lijst.reduce((s, x) => s + x.bezig, 0);
    const langst = lijst.reduce((w, x) => (x.wacht != null && (w == null || x.wacht > w) ? x.wacht : w), null);
    const K = this.SD.klassen, k = this.klas;
    const aantal = Object.fromEntries((this.bron.open.statussen || []).map((x) => [x.key, Number(x.count) || 0]));
    const { reeks = 0 } = this.voortgang || {};
    const stroken = k && this.bron.rest ? this.stroken() : null;
    const som = (soort) => stroken.reduce((n, x) => n + x[soort], 0);
    const klasTel = stroken ? { laat: som('laat'), niet: som('niet'), klaar: som('klaar') } : { laat: aantal.DEADLINE_PAST || 0, niet: aantal.NOT_STARTED || 0, klaar: aantal.FINISHED || 0 };
    const klaar = k ? klasTel.klaar : this.voortgang?.klaar || 0;
    const [dagdeel, groet] = this.dagdeel(Date.now());
    const naam = k ? '' : this.voornaam();
    const totaal = klaar + totaalOpen;
    const omtrek = 2 * Math.PI * 42;
    const deel = totaal ? klaar / totaal : 1;
    const dagen = (n) => (n == null ? 'onbekend' : `${n} ${n === 1 ? 'dag' : 'dagen'}`);
    const klasNaam = k ? K.naam(k.id) || m.lijst[0]?.groepNaam || 'Klas' : '';
    const stip = (id, groot) => (K.kleur(id) ? `<span class="stip" style="--k:${esc(K.kleur(id))}"></span>` : groot ? '<span class="stip"></span>' : '');
    const sub = k ? (totaalOpen ? `${totaalOpen} ${totaalOpen === 1 ? 'inlevering wacht' : 'inleveringen wachten'} op jou in deze klas.` : 'Niets te beoordelen in deze klas. Mooi bijgewerkt.')
      : !totaalOpen ? 'Niets te beoordelen. Mooi bijgewerkt.'
      : `${klaar ? `${klaar} nagekeken, nog ${totaalOpen} te gaan.` : `${totaalOpen} ${totaalOpen === 1 ? 'inlevering wacht' : 'inleveringen wachten'} op jou.`}${reeks > 1 ? ` ${reeks} werkdagen op rij bijgewerkt.` : ''}`;
    const eerste = lijst.find((x) => x.link);
    const wachtPil = (w) => `<span class="pil ${w == null ? 'grijs' : w >= 10 ? 'rood' : w >= 5 ? 'geel' : 'grijs'}">${esc(dagen(w))}</span>`;
    const rij = (x) => {
      const som = x.nagekeken + x.open;
      return `<a class="rij" href="${esc(x.link || this.lijstLink(x.groep))}">
        <span class="wat">${x.vak ? `<span class="pil${x.vak === 'Meetmoment' ? ' grijs' : ''}">${esc(x.vak)}</span>` : ''}<span class="titel" title="${esc(x.titel)}">${esc(x.titel)}</span></span>
        <span class="groep">${stip(x.groep)}${esc(x.groepNaam)}</span>
        <span>${wachtPil(x.wacht)}</span>
        <span class="voortgang"><small>${x.nagekeken} van ${som} nagekeken</small><span class="balk"><i style="width:${Math.round((x.nagekeken / som) * 100)}%"></i></span></span></a>`;
    };
    this.scherm.innerHTML = `<div class="binnen">
      <div class="top held ${k ? 'klas' : dagdeel}"${k && K.kleur(k.id) ? ` style="--k:${esc(K.kleur(k.id))}"` : ''}>
        ${!totaalOpen && klaar ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--x:${4 + i * 7}%;--d:${(i % 5) * 0.12}s;--c:${K.KLEUREN[i % K.KLEUREN.length]}"></i>`).join('')}</div>` : ''}
        <div class="kop">
          <p class="groet">${k ? 'Thuispagina van de klas' : `${groet}${naam ? `, ${esc(naam)}` : ''}`}</p>
          <h1>${k ? `${stip(k.id, true)}${esc(klasNaam)}` : 'Vandaag'}</h1><p class="sub">${esc(sub)}</p>
          ${k ? '' : `<div class="week" role="img" aria-label="Dagen van deze week waarop je hebt nagekeken">${this.week(this.bron.nu, this.voortgang?.dagen)}</div>`}
        </div>
        <svg class="ring" width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="${klaar} van ${totaal} nagekeken${k ? ' in deze klas' : ' vandaag'}">
          <circle class="baan" cx="52" cy="52" r="42"/><circle class="boog" cx="52" cy="52" r="42" stroke-dasharray="${omtrek.toFixed(1)}" stroke-dashoffset="${(omtrek * (1 - deel)).toFixed(1)}" transform="rotate(-90 52 52)"/>
          <text x="52" y="59" text-anchor="middle">${klaar}/${totaal}</text></svg>
        <div class="volgende">${eerste
    ? `<small>Volgende</small><b title="${esc(eerste.titel)}">${esc(eerste.titel)}</b><span class="bij">${stip(eerste.groep)}${esc(eerste.groepNaam)} ${wachtPil(eerste.wacht)}</span>`
    : `<small>${totaalOpen ? 'Volgende' : 'Klaar'}</small><b>${totaalOpen ? 'Kies een regel hieronder' : 'Niets meer te doen'}</b><span class="bij">${totaalOpen ? '' : 'Tijd voor iets anders.'}</span>`}
          <a class="knop start" data-start href="${esc(eerste?.link || '#')}" aria-disabled="${eerste ? 'false' : 'true'}">Begin hier</a></div>
        <button type="button" class="stil" data-actie="sluit" title="Terug naar de pagina van Simulise (Esc)">Terug</button>
      </div>
      <div class="tegels">
        <div class="tegel"><small>Wacht op jou</small><b data-teller="open">${open}</b></div>
        <div class="tegel"><small>Langst wachtend</small><b class="${langst != null && langst >= 10 ? 'laat' : ''}">${open ? esc(dagen(langst)) : 'geen'}</b></div>
        ${k ? `<div class="tegel"><small>Te laat</small><b data-teller="laat" class="${klasTel.laat ? 'laat' : ''}">${klasTel.laat}</b></div>
        <div class="tegel"><small>Nog niet gestart</small><b data-teller="niet">${klasTel.niet}</b></div>
        <div class="tegel"><small>Klaar</small><b data-teller="klaar">${klasTel.klaar}</b></div>`
    : `<div class="tegel"><small>Al aan begonnen</small><b>${bezig}</b></div>
        <div class="tegel"><small>${this.toonVerborgen ? 'Meegeteld uit het filter' : 'Verborgen door het filter'}</small><b data-teller="verborgen">${m.verborgen}</b></div>`}
      </div>
      ${k ? '' : `<div class="chips" role="group" aria-label="Groep">
        <button type="button" class="chip" data-actie="groep" data-groep="" aria-pressed="${!this.groep}"><span><b>Alle groepen</b><small>${totaalOpen} ${totaalOpen === 1 ? 'wacht' : 'wachten'}</small></span></button>
        ${[...groepen].sort((a, b) => a[1].naam.localeCompare(b[1].naam)).map(([id, g]) => `<button type="button" class="chip" data-actie="groep" data-groep="${esc(id)}" aria-pressed="${this.groep === id}"${K.kleur(id) ? ` style="--k:${esc(K.kleur(id))}"` : ''}>
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle class="baan" cx="17" cy="17" r="13"/><circle class="boog" cx="17" cy="17" r="13" stroke-dasharray="81.7" stroke-dashoffset="${(81.7 * (1 - (g.na + g.n ? g.na / (g.na + g.n) : 1))).toFixed(1)}" transform="rotate(-90 17 17)"/></svg>
          <span><b>${esc(g.naam)}</b><small>${g.n} ${g.n === 1 ? 'wacht' : 'wachten'}</small></span></button>`).join('')}
      </div>`}
      <div class="lijst">${lijst.length
    ? `<div class="rij kopregel"><span>Opdracht</span><span>Groep</span><span>Wacht</span><span>Voortgang</span></div>${lijst.map(rij).join('')}`
    : '<p class="melding">Niets te beoordelen. Mooi bijgewerkt.</p>'}</div>
      <div class="voet">
        <label><input type="checkbox" data-verborgen${this.toonVerborgen ? ' checked' : ''}> Toon ook wat het filter verbergt</label>
        <button type="button" class="stil" data-actie="ververs">Verversen</button>
        <a href="${esc(this.lijstLink(k ? k.id : this.groep))}">Open als lijst in Simulise</a>
        <span>Klik op een regel om de langst wachtende inlevering te beoordelen.</span>
      </div>
      ${stroken?.length ? `<h2>Alle opdrachten in deze klas</h2>
      <div class="lijst kaart"${K.kleur(k.id) ? ` style="--k:${esc(K.kleur(k.id))}"` : ''}>${stroken.map((x) => `<div class="strook"><span class="titel"><a href="/groups/school/${esc(encodeURIComponent(k.id))}/assignments#sd-opdracht=${esc(encodeURIComponent(x.titel))}" title="${esc(x.titel)}: open het overzicht per student">${esc(x.titel)}</a>
          ${x.deadline ? `<small class="dl${x.deadline < this.SD.perioden.vandaag() ? ' voorbij' : ''}">Deadline ${esc(this.dagTekst(x.deadline))}</small>` : ''}
          ${x.wacht && x.link ? `<a class="nakijk" href="${esc(x.link)}" title="Open de eerste inlevering die op jou wacht">Nakijken (${x.wacht})</a>` : ''}</span>
        <span class="stippen" role="img" aria-label="${x.klaar} klaar, ${x.wacht} wachten op jou, ${x.bezig} bezig, ${x.laat} te laat, ${x.niet} niet gestart">${['klaar', 'wacht', 'bezig', 'laat', 'niet'].map((soort) => `<i class="${soort}"></i>`.repeat(Math.min(x[soort], 60))).join('')}</span>
        <span class="som">${[[x.klaar, 'klaar'], [x.wacht, x.wacht === 1 ? 'wacht op jou' : 'wachten op jou'], [x.bezig, 'bezig'], [x.laat, 'te laat'], [x.niet, 'niet gestart']].filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(' · ')}</span></div>`).join('')}</div>
      <p class="legenda"${K.kleur(k.id) ? ` style="--k:${esc(K.kleur(k.id))}"` : ''}><span><i class="klaar"></i>Klaar</span><span><i class="wacht"></i>Wacht op jou</span><span><i class="bezig"></i>Student is bezig</span><span><i class="laat"></i>Te laat</span><span><i class="niet"></i>Nog niet gestart</span><span>Eén stip is één inlevering. Klik op een titel voor het overzicht per student.</span></p>` : ''}
      ${stroken?.length ? this.deadlines(stroken, k) : ''}
      ${k ? `<p class="uitleg">Te laat, Nog niet gestart en Klaar tellen de inleveringen in deze klas waarvan jij beoordelaar bent.</p>
      <div class="snel" aria-label="Deze klas in Simulise">${[['assignments', 'Alle opdrachten'], ['students', 'Studenten'], ['teachers', 'Docenten'], ['templates', 'Sjablonen'], ['community', 'Community'], ['files', 'Bestanden'], ['settings', 'Instellingen']]
    .map(([pad, naam]) => `<a class="knop" href="/groups/school/${esc(encodeURIComponent(k.id))}/${pad}">${naam}</a>`).join('')}</div>` : ''}</div>`;
  },
});
