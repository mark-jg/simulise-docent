/* Meldingen: meldingen over meetmomenten van andere opleidingen (en met uitsluitwoorden) verbergen,
 * met dezelfde regels als de filter in Beoordelen (modules/regels.js, instellingen bdOpleidingen en
 * bdUitsluiten).
 *
 * Menu in de bovenbalk (#notifications-dropdown .list-group > a.list-group-item): Simulise haalt de
 * 5 nieuwste ongelezen meldingen op; via localStorage simDocentMeldingen vraagt modules/perpagina.js
 * er meer op, zodat er na het filteren nog 5 relevante te zien zijn.
 * Pagina /notifications (article.timeline-item, 15 per pagina, door de server gemaakt): verbergen
 * op de pagina zelf, met een balk erboven; "Volgende pagina's doorzoeken" haalt volgende pagina's op
 * (met je eigen sessie) en voegt de relevante meldingen toe.
 * De titel van de opdracht staat in een <b> in de melding. Er wordt niets bewaard.
 *
 * Teller: modules/teller.js (in de pagina) vraagt de ongelezen meldingen op (tot 200) en stuurt ze
 * hierheen (postMessage sd-teller). Hier wordt geteld welke relevant zijn; dat getal komt op het
 * belletje, in het gebruikersmenu, het tabblad Meldingen en de kop van het menu. Het echte totaal
 * staat in de tooltip. Werkt Simulise de teller zelf bij, dan wordt opnieuw opgevraagd.
 */
SD.register({
  id: 'meldingen',
  IN_MENU: 5,          // zoveel relevante meldingen tonen in het menu
  OPHALEN: 40,         // zoveel meldingen voor het menu opvragen
  MAX_PAGINAS: 5,      // per klik op "Volgende pagina's doorzoeken"
  CSS: `
    :host { all: initial; display: block; margin: 0 0 12px; }
    [hidden] { display: none !important; }
    .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font: 13px/1.4 Inter, system-ui, sans-serif;
      color: var(--sim-text, #1e2328); background: var(--sim-surface, #fff); border: 1px solid var(--sim-border, #e3e6ea);
      border-radius: var(--sim-radius, 10px); padding: 8px 10px; }
    .info { color: var(--sim-text-2, #5b6470); font-size: 12px; }
    button { all: unset; cursor: pointer; color: var(--sim-accent-text, #0b6f5e); font-size: 12px; text-decoration: underline; }
    button[disabled] { color: var(--sim-text-3, #8a93a0); cursor: default; text-decoration: none; }
    button:focus-visible { outline: 2px solid var(--sim-accent, #0e8a74); outline-offset: 2px; }
  `,

  zetVlag(aan) {
    try {
      if (aan) { localStorage.setItem('simDocentMeldingen', String(this.OPHALEN)); localStorage.setItem('simDocentTeller', '1'); }
      else { localStorage.removeItem('simDocentMeldingen'); localStorage.removeItem('simDocentTeller'); }
    } catch { /* geen opslag */ }
  },

  TELLERS: ['#notifications-dropdown > a.dropdown-toggle .badge', '.nav-user a[href="/notifications"] .badge', '#content .nav-tabs a[href="/notifications"] .badge'],
  KOP: '#notifications-dropdown .panel-heading strong',

  init(SD) {
    this.SD = SD;
    this.zetVlag(true);
    this.tijdelijk = false;
    this.volgende = null; // volgende paginanummer om te doorzoeken
    this.teller = null;   // { totaal, relevant, volledig }
    this._bericht = (e) => {
      if (e.source !== window || e.data?.type !== 'sd-teller' || !this.SD) return;
      const { totaal, items = [], max } = e.data;
      const relevant = items.filter((x) => !this.tekstReden(x.text)).length;
      this.teller = { totaal, relevant, volledig: totaal == null || totaal <= items.length || max === Infinity || items.length < max };
      this.pasTellerAan();
    };
    window.addEventListener('message', this._bericht);
    SD.ready(() => {
      if (!this.SD) return;
      this.run();
      this._stop = SD.observe(() => this.run(), 300);
    });
  },

  update() { this.run(); },

  destroy() {
    this.zetVlag(false);
    window.removeEventListener('message', this._bericht);
    for (const el of document.querySelectorAll('[data-sim-origineel]')) {
      el.textContent = el.dataset.simOrigineel;
      el.style.removeProperty('display');
      if (el.dataset.simTitel != null) el.title = el.dataset.simTitel;
      delete el.dataset.simOrigineel; delete el.dataset.simTeller; delete el.dataset.simTitel;
    }
    this._stop?.();
    for (const el of document.querySelectorAll('[data-sim-melding]')) { el.style.removeProperty('display'); el.removeAttribute('data-sim-melding'); }
    document.querySelectorAll('.sim-docent-menunoot, [data-sim-geladen]').forEach((el) => el.remove());
    this.host?.remove();
    this.host = null;
    this.SD = null;
  },

  /* Reden om een melding te verbergen, of null. */
  reden(el) {
    return this.redenVan(el.textContent, [...el.querySelectorAll('b')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
  },

  redenVan(tekst, titels) {
    const s = this.SD.settings;
    if (SD.regels.uitsluit(tekst, s)) return 'uitsluitwoord';
    return titels.some((t) => SD.regels.andereOpleiding(t, s)) ? 'andere opleiding' : null;
  },

  /* Zelfde, voor de tekst uit GraphQL (met of zonder HTML). Zonder <b> wordt de titel van het
   * meetmoment uit de zin gehaald: "... opdracht Meetmoment GA Engels M1 (Cohort 2026) ingeleverd." */
  tekstReden(tekst) {
    if (/<[a-z]/i.test(tekst)) {
      const d = new DOMParser().parseFromString(tekst, 'text/html');
      return this.redenVan(d.body.textContent, [...d.querySelectorAll('b, strong')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
    }
    const m = tekst.match(/meetmoment\b.*?(?=\s+(?:van|ingeleverd|staat|is)\b|\.?\s*$)/i);
    return this.redenVan(tekst, m ? [m[0].trim()] : []);
  },

  /* ---------- Teller ---------- */
  pasTellerAan() {
    if (!this.teller) return;
    const { totaal, relevant, volledig } = this.teller;
    const waarde = `${relevant}${volledig ? '' : '+'}`;
    const uitleg = `${relevant}${volledig ? '' : '+'} ongelezen voor jouw opleidingen; ${totaal ?? '?'} in totaal (Simulise Docent)`;
    const zet = (el, tekst) => {
      const nu = el.textContent.trim();
      if (nu !== el.dataset.simTeller) {
        // Simulise heeft de waarde (opnieuw) gezet: onthouden, en opnieuw tellen als het totaal veranderde.
        el.dataset.simOrigineel = el.textContent;
        if (el.dataset.simTitel == null) el.dataset.simTitel = el.title || '';
        const getal = parseInt(nu.replace(/\D+/g, ' ').trim().split(' ')[0], 10);
        if (Number.isFinite(getal) && totaal != null && getal !== totaal) this.vraagTeller();
        el.textContent = tekst;
        el.dataset.simTeller = tekst;
      }
      el.title = uitleg;
    };
    for (const sel of this.TELLERS) {
      for (const el of document.querySelectorAll(sel)) {
        zet(el, waarde);
        if (relevant === 0 && volledig) el.style.setProperty('display', 'none', 'important'); else el.style.removeProperty('display');
      }
    }
    const kop = document.querySelector(this.KOP);
    if (kop) zet(kop, `Je hebt ${waarde} ongelezen meldingen voor jouw opleidingen (van de ${totaal ?? '?'}).`);
  },

  vraagTeller() {
    clearTimeout(this._vraagT);
    this._vraagT = setTimeout(() => window.postMessage({ type: 'sd-teller-vraag' }, location.origin), 1000);
  },

  zet(el, reden) {
    if (reden) {
      if (el.getAttribute('data-sim-melding') !== reden) { el.style.setProperty('display', 'none', 'important'); el.setAttribute('data-sim-melding', reden); }
    } else if (el.hasAttribute('data-sim-melding')) {
      el.style.removeProperty('display'); el.removeAttribute('data-sim-melding');
    }
  },

  run() {
    if (!this.SD) return;
    this.menu();
    this.pagina();
    this.pasTellerAan();
  },

  /* ---------- Menu in de bovenbalk ---------- */
  menu() {
    const lijst = document.querySelector('#notifications-dropdown .list-group');
    if (!lijst) return;
    let zichtbaar = 0, weg = 0;
    const items = [...lijst.querySelectorAll(':scope > a.list-group-item')];
    for (const a of items) {
      const r = this.reden(a);
      if (r) weg++;
      this.zet(a, r || (zichtbaar >= this.IN_MENU ? 'meer dan genoeg' : null));
      if (!r) zichtbaar++;
    }
    let noot = lijst.parentElement.querySelector(':scope > .sim-docent-menunoot');
    if (!weg) { noot?.remove(); return; }
    if (!noot) {
      noot = document.createElement('div');
      noot.className = 'sim-docent-menunoot';
      noot.style.cssText = 'padding:6px 15px;font-size:12px;color:var(--sim-text-3,#8a93a0);border-bottom:1px solid var(--sim-border,#e3e6ea)';
      lijst.before(noot);
    }
    const tekst = zichtbaar
      ? `${weg} van de ${items.length} nieuwste meldingen verborgen (andere opleidingen).`
      : `De ${items.length} nieuwste meldingen gaan over andere opleidingen.`;
    if (noot.textContent !== tekst) noot.textContent = tekst;
  },

  /* ---------- Pagina /notifications ---------- */
  opPagina() { return location.pathname === '/notifications'; },

  artikelen(root = document) { return [...root.querySelectorAll('#content .timeline > article.timeline-item:not(.active), .timeline > article.timeline-item:not(.active)')].filter((a, i, l) => l.indexOf(a) === i); },

  pagina() {
    if (!this.opPagina()) { this.host?.remove(); this.host = null; return; }
    const tijdlijn = document.querySelector('#content .timeline');
    if (!tijdlijn) return;
    let weg = 0, totaal = 0, geladen = 0;
    for (const art of this.artikelen()) {
      totaal++;
      if (art.hasAttribute('data-sim-geladen')) geladen++;
      const r = this.tijdelijk ? null : this.reden(art);
      if (r) weg++;
      this.zet(art, r);
    }
    this.balk(tijdlijn, weg, totaal, geladen);
  },

  balk(tijdlijn, weg, totaal, geladen) {
    if (!this.host || !this.host.isConnected) {
      this.host = document.createElement('div');
      this.host.id = 'sim-docent-meldingen';
      const shadow = this.host.attachShadow({ mode: 'open' });
      const style = document.createElement('style'); style.textContent = this.CSS;
      const bar = document.createElement('div'); bar.className = 'bar';
      bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Filter meldingen (Simulise Docent)');
      const info = document.createElement('span'); info.className = 'info';
      const toon = document.createElement('button'); toon.className = 'toon';
      toon.onclick = () => { this.tijdelijk = !this.tijdelijk; this.run(); };
      const meer = document.createElement('button'); meer.className = 'meer';
      meer.onclick = () => this.meerLaden(meer);
      bar.append(info, toon, meer);
      shadow.append(style, bar);
      tijdlijn.before(this.host);
    }
    const root = this.host.shadowRoot;
    const info = root.querySelector('.info'), toon = root.querySelector('.toon'), meer = root.querySelector('.meer');
    if (this.tijdelijk) { info.textContent = `Filter even uit: ${totaal} meldingen zichtbaar.`; toon.textContent = 'Filter weer aan'; toon.hidden = false; }
    else {
      info.textContent = (weg ? `${weg} van ${totaal} meldingen verborgen (andere opleidingen)` : `Geen meldingen verborgen`)
        + (geladen ? ` · ${geladen} toegevoegd van volgende pagina's` : '');
      toon.textContent = 'Toon even alles'; toon.hidden = !weg;
    }
    if (!meer.disabled) {
      const laatste = this.laatstePagina();
      const volgende = this.volgende ?? this.huidigePagina() + 1;
      meer.hidden = !laatste || volgende > laatste;
      meer.textContent = `Volgende pagina's doorzoeken (${volgende} van ${laatste})`;
    }
  },

  huidigePagina() { return parseInt(new URL(location.href).searchParams.get('page'), 10) || 1; },

  laatstePagina() {
    const nrs = [...document.querySelectorAll('#content ul.pagination a[href*="page="]')]
      .map((a) => parseInt(new URL(a.href, location.href).searchParams.get('page'), 10)).filter(Boolean);
    return nrs.length ? Math.max(...nrs) : 0;
  },

  /* Volgende pagina's ophalen (eigen sessie, zelfde site) tot er een pagina vol relevante meldingen bij is. */
  async meerLaden(knop) {
    const tijdlijn = document.querySelector('#content .timeline');
    const laatste = this.laatstePagina();
    if (!tijdlijn || !laatste) return;
    knop.disabled = true;
    let pagina = this.volgende ?? this.huidigePagina() + 1, erbij = 0, gedaan = 0;
    try {
      while (pagina <= laatste && gedaan < this.MAX_PAGINAS && erbij < 15) {
        knop.textContent = `Pagina ${pagina} doorzoeken…`;
        const url = new URL(location.href); url.searchParams.set('page', pagina);
        const res = await fetch(url.href, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`pagina ${pagina} gaf ${res.status}`);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        for (const art of this.artikelen(doc)) {
          const kopie = document.importNode(art, true);
          kopie.setAttribute('data-sim-geladen', String(pagina));
          kopie.querySelectorAll('[data-toggle="tooltip"]').forEach((el) => el.removeAttribute('data-toggle'));
          tijdlijn.append(kopie);
          if (!this.reden(kopie)) erbij++;
        }
        pagina++; gedaan++;
      }
      this.volgende = pagina;
    } catch (e) {
      console.warn('[Simulise Docent] meldingen laden', e);
    } finally {
      knop.disabled = false;
      this.run();
    }
  },
});
