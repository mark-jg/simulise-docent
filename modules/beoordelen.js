/* Beoordelen (roadmap 2.1): filterbalk boven de lijst op /assignments/assigned.
 *
 *   Alles                  alle rijen zichtbaar
 *   Mijn opleidingen       meetmomenten van andere opleidingen verbergen. Een rij is een meetmoment
 *                          als de titel met "Meetmoment" begint; hij is van jou als er een van je
 *                          opleidingscodes in staat (bijv. "Meetmoment MEP/MIP Engels M1").
 *                          Gewone opdrachten blijven altijd zichtbaar.
 *   Uitsluitwoorden        rijen waarvan de titel een van deze woorden bevat, verbergen (in beide
 *                          filterstanden behalve Alles).
 *
 * Gefilterd wordt op de titel van de opdracht, niet op id's. De kolom "Opdracht titel" wordt op
 * zijn koptekst gevonden, want kolommen zijn in Simulise te verslepen en uit te zetten.
 * Simulise toont 25 rijen per pagina; het aantal verborgen geldt voor de pagina die je ziet.
 * Alles op één pagina (bdEenPagina, standaard aan): via localStorage simDocentPerPage vraagt
 * modules/perpagina.js (in de pagina) Simulise om de hele lijst in één keer, zodat de filter niet
 * per 25 rijen werkt. Lukt dat niet, dan blijft Simulise gewoon per 25 rijen werken.
 *   Mijn groepen           rijen verbergen die bij een andere groep horen dan de groepen die je kiest.
 *                          Welke groepen er zijn en bij welke groep een rij hoort, leest
 *                          modules/perpagina.js uit het antwoord van Simulise (<html data-sim-groepen>).
 *                          Rijen zonder bekende groep blijven zichtbaar en worden apart geteld.
 * Instellingen in chrome.storage.sync: bdModus, bdOpleidingen, bdUitsluiten, bdEenPagina, bdGroepen.
 */
SD.register({
  id: 'beoordelen',
  CSS: `
    :host { all: initial; display: block; margin: 0 0 12px; }
    [hidden] { display: none !important; }
    .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font: 13px/1.4 Inter, system-ui, sans-serif;
      color: var(--sim-text, #1e2328); background: var(--sim-surface, #fff); border: 1px solid var(--sim-border, #e3e6ea);
      border-radius: var(--sim-radius, 10px); padding: 8px 10px; }
    .lbl { color: var(--sim-text-2, #5b6470); font-weight: 600; margin-right: 2px; }
    button { all: unset; cursor: pointer; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--sim-border-2, #d4d9df);
      color: var(--sim-text-2, #5b6470); font-size: 12px; font-weight: 600; }
    button[aria-pressed="true"] { background: var(--sim-accent, #0e8a74); border-color: var(--sim-accent, #0e8a74); color: #fff; }
    button:focus-visible { outline: 2px solid var(--sim-accent, #0e8a74); outline-offset: 2px; }
    .info { color: var(--sim-text-3, #8a93a0); font-size: 12px; }
    .link { all: unset; cursor: pointer; color: var(--sim-accent-text, #0b6f5e); font-size: 12px; text-decoration: underline; }
    .spacer { flex: 1; }
    .inst { flex-basis: 100%; display: grid; grid-template-columns: max-content 1fr; gap: 6px 10px; align-items: center; padding-top: 6px;
      border-top: 1px solid var(--sim-border, #e3e6ea); margin-top: 2px; }
    .inst[hidden] { display: none; }
    .inst label { color: var(--sim-text-2, #5b6470); font-size: 12px; }
    .inst input { font: inherit; font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--sim-border-2, #d4d9df);
      background: var(--sim-surface, #fff); color: var(--sim-text, #1e2328); min-width: 0; }
    .inst small { grid-column: 2; color: var(--sim-text-3, #8a93a0); font-size: 11px; }
    .groepen { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; }
    .groepen label { display: inline-flex; align-items: center; gap: 4px; color: var(--sim-text, #1e2328); }
    .groepen input { margin: 0; }
    .groepen .aantal { color: var(--sim-text-3, #8a93a0); }
  `,

  PER_PAGINA: 200,

  /* Vlag voor modules/perpagina.js; moet er al staan voordat Simulise de lijst ophaalt. */
  zetVlag() {
    try {
      if (this.SD && this.SD.settings.bdEenPagina !== false) localStorage.setItem('simDocentPerPage', String(this.PER_PAGINA));
      else localStorage.removeItem('simDocentPerPage');
      if (this.SD) localStorage.setItem('simDocentGroepen', '1'); // groepen uitlezen voor Mijn groepen
    } catch { /* geen opslag */ }
  },

  init(SD) {
    this.SD = SD;
    this.zetVlag();
    this.tijdelijk = false; // "toon alles even", tot je de pagina verlaat
    this._bericht = (e) => { if (e.source === window && e.data?.type === 'sd-groepen') this.run(); };
    window.addEventListener('message', this._bericht);
    SD.ready(() => {
      if (!this.SD) return;
      this.run();
      this._stop = SD.observe(() => this.run(), 300);
    });
  },

  update() { this.zetVlag(); this.run(); },

  destroy() {
    try { localStorage.removeItem('simDocentPerPage'); localStorage.removeItem('simDocentGroepen'); } catch { /* geen opslag */ }
    window.removeEventListener('message', this._bericht);
    this._stop?.();
    this.toonAlles();
    this.host?.remove();
    this.host = null;
    this.SD = null;
  },

  opBeoordelen() { return location.pathname.startsWith('/assignments/assigned'); },

  /* De tabel met een kolom "Opdracht titel" en het nummer van die kolom. */
  zoekTabel() {
    for (const t of document.querySelectorAll('#content table.table-index')) {
      const koppen = [...t.querySelectorAll('thead th')];
      const idx = koppen.findIndex((th) => /opdracht\s*titel/i.test(th.textContent));
      if (idx >= 0) return { tabel: t, idx };
    }
    return null;
  },

  lijst(tekst) { return SD.regels.lijst(tekst); },

  /* Groepen en de koppeling rij -> groep, van modules/perpagina.js. */
  groepData() {
    const ruw = document.documentElement.getAttribute('data-sim-groepen');
    if (ruw !== this._ruw) {
      this._ruw = ruw;
      try { this._data = ruw ? JSON.parse(ruw) : null; } catch { this._data = null; }
    }
    return this._data;
  },

  /* Groepen van een rij: via het id in de link naar de inlevering, anders via ?group= in die link. */
  rijGroepen(tr, data) {
    if (!data) return [];
    const a = tr.querySelector('a[href*="/assignment/"]');
    if (!a) return [];
    const u = new URL(a.href, location.href);
    const id = u.pathname.match(/\/assignment\/([0-9a-f-]{20,})/i)?.[1];
    if (id && data.rijen?.[id]) return data.rijen[id];
    const g = u.searchParams.get('group');
    return g && data.groepen?.some((x) => x.key === g) ? [g] : [];
  },

  /* Is deze rij verborgen volgens de instellingen? Geeft de reden terug, of null. */
  reden(titel, groepen) {
    const s = this.SD.settings;
    if (s.bdModus === 'alles') return null;
    if (SD.regels.uitsluit(titel, s)) return 'uitsluitwoord';
    if (s.bdModus === 'groepen') {
      const mijn = new Set(s.bdGroepen || []);
      return mijn.size && groepen.length && !groepen.some((g) => mijn.has(g)) ? 'andere groep' : null;
    }
    if (SD.regels.andereOpleiding(titel, s)) return 'andere opleiding';
    return null;
  },

  toonAlles() {
    for (const tr of document.querySelectorAll('tr[data-sim-verborgen]')) {
      tr.style.removeProperty('display');
      tr.removeAttribute('data-sim-verborgen');
    }
  },

  run() {
    if (!this.SD) return;
    const gevonden = this.opBeoordelen() && this.zoekTabel();
    if (!gevonden) { this.host?.remove(); this.host = null; this.tijdelijk = false; return; }
    const { tabel, idx } = gevonden;

    let verborgen = 0, totaal = 0, zonderGroep = 0;
    const data = this.groepData();
    for (const tr of tabel.querySelectorAll(':scope > tbody > tr')) {
      const td = tr.children[idx];
      if (!td) continue;
      totaal++;
      const titel = (td.querySelector('strong')?.textContent || td.textContent).replace(/\s+/g, ' ').trim();
      const groepen = this.rijGroepen(tr, data);
      if (!groepen.length) zonderGroep++;
      const r = this.tijdelijk ? null : this.reden(titel, groepen);
      if (r) {
        verborgen++;
        if (tr.getAttribute('data-sim-verborgen') !== r) { tr.style.setProperty('display', 'none', 'important'); tr.setAttribute('data-sim-verborgen', r); }
      } else if (tr.hasAttribute('data-sim-verborgen')) {
        tr.style.removeProperty('display'); tr.removeAttribute('data-sim-verborgen');
      }
    }
    this.balk(tabel, verborgen, totaal, zonderGroep, data);
  },

  /* Filterbalk direct boven de tabel (boven div.relative, de container van Simulise). */
  balk(tabel, verborgen, totaal, zonderGroep = 0, data = null) {
    const anker = tabel.closest('div.relative') || tabel.closest('.table-responsive') || tabel;
    if (!this.host || !this.host.isConnected || this.host.nextElementSibling !== anker) {
      this.host?.remove();
      this.host = document.createElement('div');
      this.host.id = 'sim-docent-beoordelen';
      const shadow = this.host.attachShadow({ mode: 'open' });
      const style = document.createElement('style'); style.textContent = this.CSS;
      shadow.append(style, this.bouwBalk());
      anker.before(this.host);
    }
    const s = this.SD.settings, root = this.host.shadowRoot;
    root.querySelectorAll('[data-modus]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modus === s.bdModus)));
    root.querySelector('.een').setAttribute('aria-pressed', String(s.bdEenPagina !== false));
    const info = root.querySelector('.info');
    const toon = root.querySelector('.toon');
    if (this.tijdelijk) { info.textContent = `Filter even uit: ${totaal} rijen zichtbaar.`; toon.textContent = 'Filter weer aan'; toon.hidden = false; }
    else if (s.bdModus === 'alles') { info.textContent = ''; toon.hidden = true; }
    else if (s.bdModus === 'mijn' && !this.lijst(s.bdOpleidingen).length && !this.lijst(s.bdUitsluiten).length) { info.textContent = 'Stel eerst je opleidingen in.'; toon.hidden = true; }
    else if (s.bdModus === 'groepen' && !data) { info.textContent = 'Groepen nog niet geladen; herlaad de pagina.'; toon.hidden = true; }
    else if (s.bdModus === 'groepen' && !(s.bdGroepen || []).length) { info.textContent = 'Kies je groepen bij Instellingen.'; toon.hidden = true; }
    else {
      info.textContent = (verborgen ? `${verborgen} van ${totaal} verborgen op deze pagina` : 'Niets verborgen op deze pagina')
        + (s.bdModus === 'groepen' && zonderGroep ? ` · ${zonderGroep} zonder groep (zichtbaar)` : '');
      toon.textContent = 'Toon even alles'; toon.hidden = !verborgen;
    }
    this.toonGroepen(root, data);
    const opl = root.getElementById('sd-bdOpleidingen'), uit = root.getElementById('sd-bdUitsluiten');
    if (root.activeElement !== opl) opl.value = s.bdOpleidingen || '';
    if (root.activeElement !== uit) uit.value = s.bdUitsluiten || '';
  },

  bouwBalk() {
    const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);
    const bar = el('div', { className: 'bar' });
    bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Filter Beoordelen (Simulise Docent)');
    bar.append(el('span', { className: 'lbl', textContent: 'Toon' }));
    for (const [modus, tekst] of [['alles', 'Alles'], ['mijn', 'Mijn opleidingen'], ['groepen', 'Mijn groepen']]) {
      const b = el('button', { textContent: tekst });
      b.dataset.modus = modus;
      b.onclick = () => { this.tijdelijk = false; chrome.storage.sync.set({ bdModus: modus }); };
      bar.append(b);
    }
    const info = el('span', { className: 'info' });
    const toon = el('button', { className: 'link toon' });
    toon.onclick = () => { this.tijdelijk = !this.tijdelijk; this.run(); };
    const instKnop = el('button', { className: 'link', textContent: 'Instellingen' });
    const een = el('button', { className: 'een', textContent: 'Alles op één pagina', title: 'Laat Simulise de hele lijst in één keer laden; de pagina herlaadt' });
    een.onclick = async () => {
      await chrome.storage.sync.set({ bdEenPagina: this.SD.settings.bdEenPagina === false });
      this.SD.settings.bdEenPagina = this.SD.settings.bdEenPagina === false; // direct, niet wachten op onChanged
      this.zetVlag();
      location.reload(); // Simulise haalt de lijst opnieuw op
    };
    bar.append(info, toon, el('span', { className: 'spacer' }), een, instKnop);

    const inst = el('div', { className: 'inst', hidden: true });
    const veld = (label, key, hint) => {
      const id = `sd-${key}`;
      const input = el('input', { id, type: 'text', spellcheck: false });
      input.onchange = () => chrome.storage.sync.set({ [key]: input.value });
      input.onkeydown = (e) => e.stopPropagation(); // sneltoetsen van Simulise niet laten afgaan
      inst.append(el('label', { htmlFor: id, textContent: label }), input, el('small', { textContent: hint }));
    };
    veld('Mijn opleidingen', 'bdOpleidingen', 'Codes in de titel van meetmomenten, met komma\'s: bijv. MEP, MIP, MR');
    veld('Uitsluitwoorden', 'bdUitsluiten', 'Rijen met een van deze woorden in de titel verbergen, met komma\'s');
    const groepen = el('div', { className: 'groepen' });
    const kies = el('button', { className: 'link', textContent: 'Kies de groepen van mijn opleidingen' });
    kies.onclick = () => {
      const codes = this.lijst(this.SD.settings.bdOpleidingen).map((c) => c.toLowerCase());
      const keuze = (this.groepData()?.groepen || []).filter((g) => codes.some((c) => g.naam.toLowerCase().startsWith(c))).map((g) => g.key);
      chrome.storage.sync.set({ bdGroepen: keuze });
    };
    inst.append(el('label', { textContent: 'Mijn groepen' }), groepen,
      Object.assign(el('small'), { className: 'groephint' }));
    inst.lastChild.append(kies);
    instKnop.onclick = () => { inst.hidden = !inst.hidden; };
    bar.append(inst);
    return bar;
  },

  /* Vinkjes per groep (uit het antwoord van Simulise), alleen opnieuw opbouwen als er iets verandert. */
  toonGroepen(root, data) {
    const doos = root.querySelector('.groepen');
    const gekozen = new Set(this.SD.settings.bdGroepen || []);
    const lijst = (data?.groepen || []).slice().sort((a, b) => a.naam.localeCompare(b.naam, 'nl', { numeric: true }));
    const sig = JSON.stringify([lijst.map((g) => [g.key, g.naam, g.aantal]), [...gekozen]]);
    if (doos.dataset.sig === sig) return;
    doos.dataset.sig = sig;
    doos.replaceChildren();
    if (!lijst.length) { doos.textContent = 'Nog geen groepen bekend; herlaad de Beoordelen-pagina.'; return; }
    for (const g of lijst) {
      const cb = Object.assign(document.createElement('input'), { type: 'checkbox', checked: gekozen.has(g.key) });
      cb.onchange = () => {
        const nu = new Set(this.SD.settings.bdGroepen || []);
        cb.checked ? nu.add(g.key) : nu.delete(g.key);
        chrome.storage.sync.set({ bdGroepen: [...nu] });
      };
      const label = document.createElement('label');
      const naam = document.createElement('span'); naam.textContent = g.naam;
      const aantal = document.createElement('span'); aantal.className = 'aantal'; aantal.textContent = g.aantal != null ? `(${g.aantal})` : '';
      label.append(cb, naam, aantal);
      doos.append(label);
    }
  },
});
