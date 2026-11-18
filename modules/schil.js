/* Schil (proef, alleen bij het thema Helder): Simulise vriendelijker en rond taken.
 *
 *   1. Zijbalk rond taken: Vandaag, Nakijken, Mijn klassen (elk met een kleur en wat op jou wacht),
 *      Maken (opdrachten, lesplannen, sjablonen, rubrics, leerlijnen, opleidingen), Inzicht, en de rest
 *      onder Meer (uitklapbaar). De items van Simulise blijven bestaan; ze krijgen alleen een andere
 *      volgorde (CSS order) en soms een andere naam. De opmaak staat in theme.css onder html[data-sim-schil].
 *   2. Gewone taal: vaste woorden van Simulise worden vervangen ("Te beoordelen" wordt "Wacht op jou",
 *      "badges" wordt "rubrics"). Alleen tekst die precies overeenkomt; titels en namen blijven zoals ze zijn.
 *   3. Kleur per klas: in de zijbalk en als label bij elke rij in de Beoordelen-lijst (de groep staat in
 *      de link van de rij). Kleuren en klassen komen uit modules/klassen.js.
 *
 * Alles is terug te draaien: bij een ander thema of als de module uit staat, zet destroy alles terug.
 */
SD.register({
  id: 'schil',

  /* Menu-items van Simulise op pad: [deel, volgorde, nieuwe naam]. Onbekende items komen onder Meer. */
  MENU: {
    '/assignments/assigned': ['taak', 2, 'Nakijken'],
    '/school/assignments': ['maken', 31],
    '/school/assignment/plans': ['maken', 32],
    '/school/portfolio/page/templates': ['maken', 33],
    '/school/badges': ['maken', 34],
    '/school/assignment/skills': ['maken', 35],
    '/school/educations': ['maken', 36],
    '/analytics': ['inzicht', 51, 'Inzicht'],
    '/groups': ['meer', 64, 'Alle groepen'],
  },
  KOPPEN: [['klassen', 10, 'Mijn klassen'], ['maken', 30, 'Maken'], ['inzicht', 50, 'Inzicht'], ['meer', 60, 'Meer']],

  /* Vaste woorden van Simulise in gewone taal. Links precies de tekst (zonder aantal tussen haakjes). */
  TAAL: {
    'Te beoordelen': 'Wacht op jou',
    'Wordt beoordeeld': 'Jij bent bezig',
    'Te beantwoorden': 'Vraagt feedback',
    'Mee bezig': 'Student is bezig',
    'Opnieuw inleveren': 'Moet opnieuw',
    'Afgerond': 'Klaar',
    'Niet begonnen': 'Nog niet gestart',
    'Deadline verlopen': 'Te laat',
    'Actie nodig': 'Wacht op jou',
    'Beoordelen': 'Nakijken',
    'Learning Analytics': 'Inzicht',
    'Analytics': 'Inzicht',
    'Toegewezen badges bekijken': 'Toegekende rubrics bekijken',
    'Geen opgeslagen rapportages': 'Nog geen bewaarde rapportages',
  },
  TAAL_BEGIN: [['Badge toewijzingen voor opdracht', 'Toegekende rubrics voor opdracht']],

  actief(SD) { return SD.settings.theme === 'helder' && SD.settings.enabled !== false; },

  init(SD) {
    this.SD = SD;
    this.aan = false;
    this._klik = (e) => {
      if (!this.aan || !e.target.closest?.('.sd-schil-knop')) return;
      e.preventDefault();
      chrome.storage.sync.set({ shellMeer: !(this.SD.settings.shellMeer === true) });
    };
    document.addEventListener('click', this._klik, true);
    this._ontvolg = SD.klassen.volg(() => { if (this.aan) this.pas(); });
    SD.ready(() => {
      if (!this.SD) return;
      this.update(SD);
      this._stop = SD.observe(() => { if (this.aan) this.pas(); }, 400);
    });
  },

  update(SD) {
    if (!document.body) return;
    const moet = this.actief(SD);
    if (moet && !this.aan) { this.aan = true; SD.root.setAttribute('data-sim-schil', ''); SD.klassen.laad(); }
    else if (!moet && this.aan) { this.terug(); return; }
    if (this.aan) { SD.root.toggleAttribute('data-sim-meer', SD.settings.shellMeer === true); this.pas(); }
  },

  destroy(SD) {
    document.removeEventListener('click', this._klik, true);
    this._ontvolg?.();
    this._stop?.();
    this.terug();
    this.SD = null;
  },

  pas() {
    this.zijbalk();
    this.taal();
    this.chips();
  },

  /* ---------- Zijbalk ---------- */
  zijbalk() {
    const nav = document.querySelector('aside#nav .nav-main');
    if (!nav) return;
    for (const li of nav.querySelectorAll(':scope > li')) {
      if (li.classList.contains('sd-schil-kop') || li.classList.contains('sd-schil-klas')) continue;
      const a = li.querySelector(':scope > a');
      if (!a) continue;
      let deel = 'meer', volgorde = 70, naam = null;
      if (li.classList.contains('sim-docent-vandaag-li')) { deel = 'taak'; volgorde = 1; }
      else {
        let pad = '';
        try { const u = new URL(a.href, location.href); pad = u.origin === location.origin ? u.pathname.replace(/\/$/, '') : ''; } catch { /* geen adres */ }
        const m = this.MENU[pad];
        if (m) [deel, volgorde, naam] = m;
        else if (li.dataset.page === 'dashboard') volgorde = 61;
      }
      if (li.dataset.sdDeel !== deel) li.dataset.sdDeel = deel;
      if (li.style.order !== String(volgorde)) li.style.order = String(volgorde);
      if (naam) {
        const span = a.querySelector('span');
        if (span && span.textContent !== naam) { span.dataset.sdTekst ??= span.textContent; span.textContent = naam; }
        if (a.getAttribute('data-original-title') && a.getAttribute('data-original-title') !== naam) { a.dataset.sdTitel ??= a.getAttribute('data-original-title'); a.setAttribute('data-original-title', naam); }
      }
    }
    for (const [deel, volgorde, tekst] of this.KOPPEN) {
      if (nav.querySelector(`:scope > li.sd-schil-kop[data-kop="${deel}"]`)) continue;
      const li = document.createElement('li');
      li.className = `sd-schil-kop${deel === 'meer' ? ' sd-schil-knop' : ''}`;
      li.dataset.kop = deel;
      li.style.order = String(volgorde);
      li.textContent = tekst;
      if (deel === 'meer') { li.setAttribute('role', 'button'); li.tabIndex = 0; li.title = 'Start, portfolio, community en alle groepen'; }
      nav.append(li);
    }
    // Klassen: opnieuw opbouwen als de lijst is veranderd.
    const lijst = this.SD.klassen.lijst;
    const teken = JSON.stringify(lijst);
    const kop = nav.querySelector(':scope > li.sd-schil-kop[data-kop="klassen"]');
    if (kop) kop.style.display = lijst.length ? '' : 'none';
    if (nav.dataset.sdKlassen !== teken || nav.querySelectorAll(':scope > li.sd-schil-klas').length !== lijst.length) {
      nav.querySelectorAll(':scope > li.sd-schil-klas').forEach((el) => el.remove());
      lijst.forEach((k, i) => {
        const li = document.createElement('li');
        li.className = 'sd-schil-klas';
        li.style.order = String(11 + i);
        li.style.setProperty('--sd-klas', this.SD.klassen.kleur(k.id));
        const a = document.createElement('a');
        a.className = 'sim-docent-klas';
        a.href = `/groups/school/${encodeURIComponent(k.id)}/assignments?filters=status:actionable`;
        a.dataset.klas = k.id;
        a.title = k.wacht ? `${k.naam}: ${k.wacht} ${k.wacht === 1 ? 'wacht' : 'wachten'} op jou` : k.naam;
        if (k.wacht) a.dataset.wacht = String(k.wacht);
        a.append(Object.assign(document.createElement('i'), { className: 'sd-stip' }), ' ', Object.assign(document.createElement('span'), { textContent: k.naam }));
        li.append(a);
        nav.append(li);
      });
      nav.dataset.sdKlassen = teken;
    }
    // Welke klas is actief: de klaspagina van Simulise zelf (de thuispagina markeert zichzelf).
    const hier = location.pathname.match(/^\/groups\/school\/([0-9a-f-]{36})/i)?.[1];
    if (hier && !document.querySelector('#sim-docent-vandaag')) {
      for (const li of nav.querySelectorAll(':scope > li.sd-schil-klas')) li.classList.toggle('active', li.firstElementChild.dataset.klas === hier);
    }
  },

  /* ---------- Gewone taal ---------- */
  vertaal(tekst) {
    const m = tekst.match(/^(\s*)(.*?)(\s*\(\d+\))?(\s*)$/s);
    if (!m) return null;
    const kern = m[2];
    let nieuw = Object.hasOwn(this.TAAL, kern) ? this.TAAL[kern] : null;
    if (nieuw == null) for (const [begin, wordt] of this.TAAL_BEGIN) if (kern.startsWith(begin)) { nieuw = wordt + kern.slice(begin.length); break; }
    return nieuw == null ? null : `${m[1]}${nieuw}${m[3] || ''}${m[4]}`;
  },

  taal() {
    for (const wortel of document.querySelectorAll('#content, header.header, header.navbar')) {
      const loop = document.createTreeWalker(wortel, NodeFilter.SHOW_TEXT);
      const raak = [];
      while (loop.nextNode()) {
        const n = loop.currentNode, t = n.nodeValue;
        if (t.length < 4 || t.length > 80 || n.__sdNa === t) continue;
        const ouder = n.parentElement;
        if (!ouder || ouder.closest('script, style, textarea, input, select, option, [contenteditable="true"], .selectize-input, #sim-docent-vandaag, .sdw')) continue;
        const nieuw = this.vertaal(t);
        if (nieuw != null && nieuw !== t) raak.push([n, t, nieuw]);
      }
      for (const [n, oud, nieuw] of raak) { n.__sdVoor = oud; n.__sdNa = nieuw; n.nodeValue = nieuw; (this._vertaald ??= new Set()).add(n); }
    }
  },

  /* ---------- Klas bij een rij in Beoordelen ---------- */
  chips() {
    if (!location.pathname.startsWith('/assignments/assigned')) return;
    for (const a of document.querySelectorAll('#content tbody a[href*="/review"], #content tbody a[href*="/view"]')) {
      let groep = null;
      try { groep = new URL(a.href, location.href).searchParams.get('group'); } catch { /* geen adres */ }
      const naam = groep && this.SD.klassen.naam(groep);
      const oud = a.parentElement.querySelector(':scope > .sd-klaschip');
      if (!naam) { oud?.remove(); continue; }
      if (oud?.dataset.klas === groep && oud.textContent === naam) continue;
      oud?.remove();
      const chip = Object.assign(document.createElement('span'), { className: 'sd-klaschip', textContent: naam });
      chip.dataset.klas = groep;
      chip.style.setProperty('--sd-klas', this.SD.klassen.kleur(groep));
      a.after(chip);
    }
  },

  /* ---------- Alles terugzetten ---------- */
  terug() {
    if (!this.aan) return;
    this.aan = false;
    const root = document.documentElement;
    root.removeAttribute('data-sim-schil');
    root.removeAttribute('data-sim-meer');
    const nav = document.querySelector('aside#nav .nav-main');
    if (nav) {
      nav.querySelectorAll(':scope > li.sd-schil-kop, :scope > li.sd-schil-klas').forEach((el) => el.remove());
      delete nav.dataset.sdKlassen;
      for (const li of nav.querySelectorAll(':scope > li')) {
        li.style.order = '';
        delete li.dataset.sdDeel;
        const span = li.querySelector('span[data-sd-tekst]');
        if (span) { span.textContent = span.dataset.sdTekst; delete span.dataset.sdTekst; }
        const a = li.querySelector('a[data-sd-titel]');
        if (a) { a.setAttribute('data-original-title', a.dataset.sdTitel); delete a.dataset.sdTitel; }
      }
    }
    for (const n of this._vertaald || []) { if (n.nodeValue === n.__sdNa) n.nodeValue = n.__sdVoor; delete n.__sdVoor; delete n.__sdNa; }
    this._vertaald = null;
    document.querySelectorAll('.sd-klaschip').forEach((el) => el.remove());
  },
});
