/* Focusmodus bij het beoordelen (roadmap 7.6): alleen het werk, de rubric en je feedback.
 *
 * Op het beoordeelscherm (/@gebruiker/assignment/<uuid>/review) verbergt de focusmodus de bovenbalk, de
 * zijbalk en de kruimelkop en maakt de omslag kleiner. De lijst met studenten van Simulise blijft staan en wordt
 * één keer per pagina uitgeklapt (de eigen knop van Simulise): dan toont hij namen zonder plaatjes. De opmaak maakt
 * hem smal en compact, zodat de namen en de status van de hele klas in beeld zijn. Klap je hem zelf weer in, dan
 * blijft hij ingeklapt. De omschrijving van de opdracht
 * (bij elke student dezelfde lange tekst) klapt dicht, zodat het werk van de student bovenaan staat.
 * Zijkolom (aan bij een venster vanaf 1100px, instelling focusKolom): rubric, feedback en de onderbalk van
 * Simulise staan vast rechts naast het werk, zodat je tijdens het nakijken kunt typen zonder te scrollen. De
 * blokken blijven op hun plek in de pagina van Simulise; alleen de plaatsing verandert (position: fixed), en
 * dit script meet de hoogtes voor de CSS-variabelen --sdf-balk en --sdf-onder.
 * De opmaak staat in theme.css onder html[data-sim-focus] en html[data-sim-focus-kolom].
 *
 * Klas: de groep staat in het adres (?group=<uuid>). Met modules/klassen.js zet dit script de kleur en de naam van
 * de klas en de tellers als CSS-variabelen op <html> (--sdf-klas, --sdf-klasnaam, --sdf-kop, --sdf-tel); het thema
 * Helder maakt daarmee van de kop een band in de kleur van de klas, zoals op de klaspagina. Alleen klasnaam en
 * aantallen, geen namen van studenten.
 *
 * Toelichting bij de rubric: in het thema Helder toont de zijkolom per niveau alleen de naam. Wijs je een niveau aan
 * (muis of toetsenbord), dan staat de omschrijving in een eigen toelichting links van de kolom. De tekst komt uit
 * het vakje van Simulise zelf en wordt alleen getoond als de omschrijving daar verborgen is.
 *
 * Bovenaan komt een eigen balk (shadow root): een vaste strook die aansluit tussen de lijst links en de kolom rechts
 * (dit script meet waar die ophouden en beginnen), met een ring voor hoeveel van de klas klaar is:
 *   vorige / volgende student, "17 van 31", "Volgende die wacht", Opdracht tonen, Zijkolom aan/uit, Focus uit;
 *   zonder zijkolom ook springen naar Werk, Rubric en Feedback.
 * Sneltoetsen: Alt+F focus aan/uit, Alt+pijl links/rechts vorige/volgende student, Alt+W volgende die wacht,
 * Alt+O opdracht tonen, Esc focus uit. De pijlen en letters werken niet terwijl je in een tekstvak typt.
 *
 * Gegevens: alleen wat al op de pagina staat (de lijst .review-group-panel .groups-table > .item). Naar een
 * andere student gaan is een klik op het item van Simulise zelf. Er wordt niets opgevraagd, bewaard of
 * weggeschreven; de onderbalk van Simulise (teruggeven, beoordeling toekennen, afronden) blijft zoals hij is.
 * Onthouden wordt alleen of de focusmodus en de zijkolom aan staan (focusAan, focusKolom in chrome.storage.sync).
 */
SD.register({
  id: 'focus',
  KOLOM_VANAF: 1100,
  PAD: /^\/@[^/]+\/assignment\/[^/]+\/review/,
  STATUS: { 'bg-backport-success': ['klaar', 'klaar'], 'bg-backport-warning': ['wacht', 'wacht op jou'], 'bg-backport-danger': ['laat', 'te laat'], 'bg-backport-blank': ['niet', 'nog niet gestart'] },

  CSS: `
    :host { all: initial; }
    * { box-sizing: border-box; }
    /* Vaste strook tussen de lijst links (--fb-l) en de kolom rechts (--fb-r); beide zet plaats(). */
    .balk { position: fixed; top: 0; left: var(--fb-l, 0px); right: var(--fb-r, 0px); height: 52px; z-index: 2147482400; overflow: hidden;
      display: flex; align-items: center; gap: 10px; padding: 0 16px; background: var(--sim-surface, #fff); color: var(--sim-text, #1e2328);
      border-bottom: 1px solid var(--sim-border, #e3e6ea); font: 14px/1.3 var(--sim-font, Inter, system-ui, sans-serif); }
    .ruimte { flex: 1 1 auto; }
    button { font: inherit; color: inherit; cursor: pointer; border: 1px solid transparent; background: none; border-radius: 999px; padding: 6px 12px; white-space: nowrap; }
    button:hover:not(:disabled) { background: var(--sim-surface-2, #eef0f3); }
    button:focus-visible { outline: 2px solid var(--sim-accent, #0e8a74); outline-offset: 1px; }
    button:disabled { opacity: .35; cursor: default; }
    .pijl { width: 34px; height: 34px; padding: 0; font-size: 18px; border-color: var(--sim-border, #e3e6ea); }
    .ring { flex: none; }
    .ring circle { fill: none; stroke-width: 5; }
    .ring .baan { stroke: var(--sim-border, #e3e6ea); }
    .ring .boog { stroke: var(--sdf-klas, var(--sim-accent, #0e8a74)); stroke-linecap: round; }
    .tel { font-weight: 600; white-space: nowrap; }
    .tel small { font-weight: 400; color: var(--sim-text-2, #5b6470); margin-left: 6px; }
    .wacht-knop { background: var(--sim-accent, #0e8a74); color: #fff; font-weight: 600; }
    .wacht-knop:hover:not(:disabled) { background: var(--sim-accent, #0e8a74); filter: brightness(1.08); }
    .lijn { width: 1px; align-self: stretch; background: var(--sim-border, #e3e6ea); }
    .aan { background: var(--sim-accent-soft, #e6f4f1); color: var(--sim-accent-text, #0b6f5e); }
    .tip { position: fixed; z-index: 2147482401; width: min(360px, 40vw); padding: 10px 14px; border-radius: 12px; background: var(--sim-text, #1e2328); color: var(--sim-surface, #fff);
      font: 13px/1.45 var(--sim-font, Inter, system-ui, sans-serif); box-shadow: 0 6px 24px rgba(0, 0, 0, .2); pointer-events: none; }
    .tip[hidden] { display: none; }
    .tip b { display: block; font-weight: 600; margin-bottom: 4px; }
    .los { position: fixed; top: 70px; right: 18px; z-index: 2147482400; border: 1px solid var(--sim-border, #e3e6ea); background: var(--sim-surface, #fff); color: var(--sim-text, #1e2328);
      box-shadow: 0 2px 10px rgba(0, 0, 0, .12); font: 14px/1.3 var(--sim-font, Inter, system-ui, sans-serif); padding: 8px 16px; }
    @media (max-width: 700px) { .spring { display: none; } }
  `,

  init(SD) {
    this.SD = SD;
    this.opdracht = false; // omschrijving van de opdracht zichtbaar
    this._toets = (e) => this.toets(e);
    this._wijs = (e) => this.toelichting(e.type === 'mouseout' || e.type === 'focusout' ? e.relatedTarget : e.target);
    for (const soort of ['mouseover', 'mouseout', 'focusin', 'focusout']) document.addEventListener(soort, this._wijs, true);
    this._maat = () => this.pas();
    window.addEventListener('resize', this._maat);
    window.addEventListener('keydown', this._toets, true);
    SD.addCommand('focus', 'Focusmodus bij het beoordelen aan of uit', () => this.schakel());
    SD.ready(() => {
      if (!this.SD) return;
      this.pas();
      this._stop = SD.observe(() => this.pas(), 300);
    });
  },

  update() { if (document.body) this.pas(); },

  destroy(SD) {
    window.removeEventListener('keydown', this._toets, true);
    window.removeEventListener('resize', this._maat);
    for (const soort of ['mouseover', 'mouseout', 'focusin', 'focusout']) document.removeEventListener(soort, this._wijs, true);
    SD.removeCommand('focus');
    this._stop?.();
    this.ruimOp();
    this.SD = null;
  },

  hier() { return this.PAD.test(location.pathname) && !!document.querySelector('.review-group-panel, .assignment-status-bar'); },
  aan() { return this.SD.settings.focusAan !== false; },
  schakel() { chrome.storage.sync.set({ focusAan: !this.aan() }); },
  kolomAan() { return this.SD.settings.focusKolom !== false; },

  /* De hoogte van de onderbalk en het feedbackblok, voor de plaatsing van de zijkolom. */
  meet() {
    const root = document.documentElement;
    const h = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().height || 0);
    const balk = h('.assignment-status-bar'), feedback = h('[data-sd-focus="feedback"]');
    root.style.setProperty('--sdf-balk', `${balk}px`);
    root.style.setProperty('--sdf-rubric', `${h('[data-sd-focus="rubric"]')}px`);
    root.style.setProperty('--sdf-onder', `${balk + feedback + (feedback ? 16 : 8)}px`);
    this.plaats();
  },

  /* De balk bovenaan sluit aan op de lijst links en de kolom rechts: hier wordt gemeten waar die ophouden en beginnen. */
  plaats() {
    if (!this.host) return;
    const root = document.documentElement;
    const paneel = document.querySelector('.review-group-panel')?.getBoundingClientRect();
    const links = root.hasAttribute('data-sim-focus') && paneel && paneel.width ? Math.max(0, Math.round(paneel.right)) : 0;
    const vak = root.hasAttribute('data-sim-focus-kolom') ? document.querySelector('.assignment-status-bar')?.getBoundingClientRect() : null;
    // De kolom is het vak plus aan beide kanten dezelfde marge als rechts van het vak.
    const rechts = vak && vak.width ? Math.max(0, Math.round(window.innerWidth - vak.left + (window.innerWidth - vak.right))) : 0;
    this.host.style.setProperty('--fb-l', `${links}px`);
    this.host.style.setProperty('--fb-r', `${rechts}px`);
  },

  ruimOp() {
    const root = document.documentElement;
    root.removeAttribute('data-sim-focus');
    root.removeAttribute('data-sim-focus-opdracht');
    root.removeAttribute('data-sim-focus-kolom');
    for (const v of ['--sdf-balk', '--sdf-onder', '--sdf-rubric', '--sdf-klas', '--sdf-klasnaam', '--sdf-kop', '--sdf-tel']) root.style.removeProperty(v);
    this._meter?.disconnect();
    this._meter = null;
    document.querySelectorAll('[data-sd-focus]').forEach((el) => delete el.dataset.sdFocus);
    this.host?.remove();
    this.host = this.schaduw = this.tip = this._tipItem = null;
    this._teken = null;
  },

  /* De studenten uit de lijst van Simulise: status en of dit de huidige is. Geen namen. */
  studenten() {
    return [...document.querySelectorAll('.review-group-panel .groups-table > .item')].map((el) => {
      const klasse = [...(el.querySelector('.user-status')?.classList || [])].find((c) => this.STATUS[c]);
      const [soort, tekst] = this.STATUS[klasse] || ['niet', 'onbekend'];
      return { el, soort, tekst, nu: el.classList.contains('selected') };
    });
  },

  /* De koppen van de pagina: omschrijving, werk, rubric, feedback. */
  delen() {
    const uit = {};
    for (const h of document.querySelectorAll('#scrollable-page-wrapper .fluid-container-max-width h2')) {
      const t = h.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
      const soort = t === 'omschrijving' ? 'omschrijving' : t === 'reflecties' ? 'rubric' : t === 'feedback' ? 'feedback' : 'werk';
      uit[soort] ??= h;
    }
    return uit;
  },

  pas() {
    if (!this.SD) return;
    if (!this.hier()) { if (this.host || document.documentElement.hasAttribute('data-sim-focus')) this.ruimOp(); this.opdracht = false; this._klapte = false; return; }
    const root = document.documentElement, aan = this.aan();
    root.toggleAttribute('data-sim-focus', aan);
    root.toggleAttribute('data-sim-focus-opdracht', aan && this.opdracht);
    // Lijst met namen: één keer uitklappen met de knop van Simulise zelf.
    const paneel = document.querySelector('.review-group-panel');
    if (aan && paneel && !this._klapte) {
      this._klapte = true;
      if (!paneel.classList.contains('expanded')) paneel.querySelector('.circle-button')?.click();
    }
    const delen = this.delen();
    for (const soort of ['omschrijving', 'rubric', 'feedback']) {
      if (!delen[soort]) continue;
      const blok = delen[soort].closest('.fluid-container-max-width > *') || delen[soort].parentElement;
      if (blok.dataset.sdFocus !== soort) blok.dataset.sdFocus = soort;
    }
    // Zijkolom: alleen als er iets in te zetten valt en het venster breed genoeg is.
    const kolom = aan && this.kolomAan() && window.innerWidth >= this.KOLOM_VANAF && !!(delen.rubric || delen.feedback);
    root.toggleAttribute('data-sim-focus-kolom', kolom);
    if (aan) {
      this.meet();
      if (!this._meter && window.ResizeObserver) this._meter = new ResizeObserver(() => this.meet());
      this._meter?.disconnect();
      for (const el of document.querySelectorAll('.review-group-panel, .assignment-status-bar, [data-sd-focus="feedback"], [data-sd-focus="rubric"]')) this._meter?.observe(el);
    } else if (this._meter) { this._meter.disconnect(); }
    if (!this.host) {
      const { host, shadow } = this.SD.shadowHost('sim-docent-focus', this.CSS);
      this.host = host; this.schaduw = shadow;
      this.vak = document.createElement('div');
      this.tip = Object.assign(document.createElement('div'), { className: 'tip', hidden: true });
      this.tip.setAttribute('role', 'tooltip');
      shadow.append(this.vak, this.tip);
      this.vak.addEventListener('click', (e) => {
        const el = e.target.closest('[data-actie]');
        if (el && !el.disabled) this.doe(el.dataset.actie, el.dataset.nr);
      });
    }
    this.plaats();
    const st = this.studenten();
    // Klas uit het adres: kleur, naam en tellers als variabelen voor de opmaak.
    const klasId = new URLSearchParams(location.search).get('group');
    const K = this.SD.klassen;
    if (klasId && !K.lijst.length && !this._klassenGevraagd) { this._klassenGevraagd = true; K.laad().then(() => this.pas(), () => {}); }
    const tel = { wacht: 0, klaar: 0, laat: 0, niet: 0 };
    for (const s of st) tel[s.soort]++;
    const zet = (naam, waarde) => { if (waarde) root.style.setProperty(naam, waarde); else root.style.removeProperty(naam); };
    const klasNaam = klasId ? K.naam(klasId) : null;
    zet('--sdf-klas', aan && klasId ? K.kleur(klasId) : null);
    zet('--sdf-klasnaam', aan && klasNaam ? JSON.stringify(klasNaam) : null);
    const plek = st.findIndex((s) => s.nu);
    zet('--sdf-kop', aan && st.length ? JSON.stringify(`${klasNaam ? `${klasNaam} · ` : ''}student ${plek >= 0 ? plek + 1 : '?'} van ${st.length}`) : null);
    zet('--sdf-tel', aan && st.length ? JSON.stringify([[tel.wacht, tel.wacht === 1 ? 'wacht op jou' : 'wachten op jou'], [tel.klaar, 'klaar'], [tel.laat, 'te laat'], [tel.niet, 'nog niet gestart']]
      .filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(' · ')) : null);
    const teken = JSON.stringify([klasId && K.kleur(klasId), aan, kolom, this.kolomAan(), window.innerWidth >= this.KOLOM_VANAF, this.opdracht, st.map((s) => s.soort + (s.nu ? '*' : '')), Object.keys(delen)]);
    if (teken === this._teken) return;
    this._teken = teken;
    if (!aan) {
      this.vak.innerHTML = '<button type="button" class="los" data-actie="focus" title="Alleen het werk, de rubric en je feedback (Alt+F)">Focus</button>';
      return;
    }
    const nu = st.findIndex((s) => s.nu);
    const wachten = st.filter((s) => s.soort === 'wacht' && !s.nu).length;
    this.vak.innerHTML = `<div class="balk" role="toolbar" aria-label="Focusmodus">
      <button type="button" class="pijl" data-actie="vorige" title="Vorige student (Alt+pijl links)" aria-label="Vorige student"${nu > 0 ? '' : ' disabled'}>‹</button>
      ${st.length ? `<svg class="ring" width="30" height="30" viewBox="0 0 30 30" role="img" aria-label="${tel.klaar} van ${st.length} klaar"><circle class="baan" cx="15" cy="15" r="11"/><circle class="boog" cx="15" cy="15" r="11" stroke-dasharray="69.1" stroke-dashoffset="${(69.1 * (1 - tel.klaar / st.length)).toFixed(1)}" transform="rotate(-90 15 15)"/></svg>` : ''}
      <span class="tel">${st.length ? `${nu >= 0 ? nu + 1 : '?'} van ${st.length}` : 'Beoordelen'} <small>${wachten ? `${wachten} ${wachten === 1 ? 'wacht' : 'wachten'} nog` : ''}</small></span>
      <button type="button" class="pijl" data-actie="volgende" title="Volgende student (Alt+pijl rechts)" aria-label="Volgende student"${nu >= 0 && nu < st.length - 1 ? '' : ' disabled'}>›</button>
      <button type="button" class="wacht-knop" data-actie="wacht" title="Naar de volgende inlevering die op jou wacht (Alt+W)"${wachten ? '' : ' disabled'}>Volgende die wacht</button>
      <span class="ruimte"></span>
      ${kolom ? '' : [['werk', 'Werk'], ['rubric', 'Rubric'], ['feedback', 'Feedback']].filter(([d]) => delen[d]).map(([d, naam]) => `<button type="button" class="spring" data-actie="spring" data-nr="${d}">${naam}</button>`).join('')}
      ${delen.omschrijving ? `<button type="button" class="${this.opdracht ? 'aan' : ''}" data-actie="opdracht" aria-pressed="${this.opdracht}" title="De omschrijving van de opdracht tonen of verbergen (Alt+O)">Opdracht</button>` : ''}
      ${window.innerWidth >= this.KOLOM_VANAF && (delen.rubric || delen.feedback) ? `<button type="button" class="${kolom ? 'aan' : ''}" data-actie="kolom" aria-pressed="${kolom}" title="Rubric, feedback en beoordeling toekennen vast rechts naast het werk">Zijkolom</button>` : ''}
      <span class="lijn"></span>
      <button type="button" data-actie="focus" title="Focusmodus uit (Esc of Alt+F)">Focus uit</button>
    </div>`;
  },

  /* Toelichting bij een niveau in de rubric: alleen als Simulise's eigen omschrijving verborgen is (zijkolom in Helder). */
  toelichting(doel) {
    if (!this.tip) return;
    const item = doel?.closest?.('[data-sd-focus="rubric"] .reflection-items > .item') || null;
    if (item === this._tipItem) return;
    this._tipItem = item;
    const tekstvak = item?.querySelector('.content > div:last-child');
    const tekst = tekstvak && getComputedStyle(tekstvak).display === 'none' ? tekstvak.textContent.replace(/\s+/g, ' ').trim() : '';
    if (!tekst) { this.tip.hidden = true; return; }
    const niveau = [...(item.querySelector('.content > strong')?.childNodes || [])].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join(' ').trim();
    const onderdeel = item.closest('.reflection-wrapper')?.querySelector('h4')?.textContent.replace(/\s+/g, ' ').trim() || '';
    this.tip.replaceChildren(Object.assign(document.createElement('b'), { textContent: [onderdeel, niveau].filter(Boolean).join(' · ') }), tekst);
    this.tip.hidden = false;
    const kolom = item.closest('[data-sd-focus="rubric"]').getBoundingClientRect(), r = item.getBoundingClientRect();
    this.tip.style.right = `${Math.round(window.innerWidth - kolom.left + 16)}px`;
    this.tip.style.top = `${Math.round(Math.max(8, Math.min(r.top - 6, window.innerHeight - this.tip.offsetHeight - 8)))}px`;
  },

  doe(actie, nr) {
    const st = this.studenten();
    const nu = st.findIndex((s) => s.nu);
    const ga = (i) => { if (st[i] && !st[i].nu) st[i].el.click(); };
    if (actie === 'focus') this.schakel();
    else if (actie === 'kolom') chrome.storage.sync.set({ focusKolom: !this.kolomAan() });
    else if (actie === 'vorige') ga(nu - 1);
    else if (actie === 'volgende') ga(nu + 1);
    else if (actie === 'wacht') {
      // De eerstvolgende na de huidige; anders vooraan opnieuw beginnen.
      const volgorde = [...st.keys()].filter((i) => i > nu).concat([...st.keys()].filter((i) => i < nu));
      ga(volgorde.find((i) => st[i].soort === 'wacht'));
    } else if (actie === 'opdracht') {
      this.opdracht = !this.opdracht;
      this.pas();
      if (this.opdracht) this.delen().omschrijving?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (actie === 'spring') this.delen()[nr]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  toets(e) {
    if (!this.SD || !this.PAD.test(location.pathname) || !this.host) return;
    const typt = e.target?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]') || e.composedPath?.()[0]?.isContentEditable;
    const pak = (actie) => { e.preventDefault(); e.stopPropagation(); this.doe(actie); };
    if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyF') return pak('focus');
    if (!this.aan()) return;
    if (e.key === 'Escape' && !typt && !document.querySelector('.modal.in, .modal.show, #sim-docent-zoeken, #sim-docent-vandaag')) return pak('focus');
    if (typt || !e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === 'ArrowLeft') pak('vorige');
    else if (e.key === 'ArrowRight') pak('volgende');
    else if (e.code === 'KeyW') pak('wacht');
    else if (e.code === 'KeyO') pak('opdracht');
  },
});
