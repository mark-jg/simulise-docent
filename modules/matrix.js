/* Opdrachten van een klas (/groups/school/<uuid>/assignments): een rustig overzicht per vak, en de matrix als stippenkaart.
 *
 * Simulise toont per student en opdracht een groot gekleurd vak. Deze module biedt twee weergaven (instelling
 * matrixWeergave), te kiezen in een balk boven de pagina:
 *
 *   Overzicht (standaard)  Eerst een blok "Wacht op jou" met de opdrachten waar jij iets moet nakijken; daaronder de
 *                          opdrachten per vak (de code uit de titel, zoals BUR of CREA), inklapbaar, met per opdracht
 *                          één balk: klaar, ingeleverd, te laat, niet gestart. Geen studenten in beeld.
 *   Per student, gedraaid  (standaard, instelling matrixDraai) Een eigen tabel met de studenten onder elkaar en de opdrachten
 *                          als kolommen: bovenaan een korte code uit de titel (PS_1.8, ENG_2.3) met de hele titel en de
 *                          deadline als toelichting, per inlevering één stip met dezelfde link als bij Simulise. De knop
 *                          "Draaien" wisselt terug naar de tabel van Simulise. Opmaak in theme.css (.sd-matrix-draai).
 *   Per student            De matrix van Simulise als stippenkaart: smalle kolommen met de naam verticaal, per rij de
 *                          titel met de deadline eronder, per inlevering één stip. Opmaak in theme.css onder
 *                          html[data-sim-matrix-student].
 *
 * Vanaf de klaspagina (modules/vandaag.js) opent het adres #sd-opdracht=<titel> de weergave per student met die opdracht gemarkeerd.
 *
 * Alles komt uit de tabel die Simulise al op de pagina zet (door de server gemaakt, geen Vue): er wordt niets
 * opgevraagd of bewaard. Het overzicht toont dus wat het filter van Simulise op dat moment doorlaat.
 *
 * Wat van jou is: Simulise zet in de toelichting van een cel "Te beoordelen" als jij aan de beurt bent, en
 * "Nog niet beoordeeld" als een collega dat is. Bij "Wordt beoordeeld door <naam>" telt de cel als de jouwe als daar
 * je eigen naam staat (uit de bovenbalk). Die cellen krijgen data-sd-mij.
 */
SD.register({
  id: 'matrix',
  PAD: /^\/groups\/school\/([\w-]+)\/assignments\/?$/,
  SOORTEN: [['mij', 'wacht op jou', 'wachten op jou'], ['collega', 'bij een collega', 'bij een collega'], ['bezig', 'student bezig', 'studenten bezig'],
    ['laat', 'te laat', 'te laat'], ['niet', 'niet gestart', 'niet gestart'], ['klaar', 'klaar', 'klaar']],
  MAANDEN: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],

  init(SD) {
    this.SD = SD;
    this.open = new Set(); // vakken die zijn opengeklapt (alleen in het geheugen)
    this._klik = (e) => {
      const el = e.target.closest?.('[data-sd-matrix]');
      if (!el) return;
      const wat = el.dataset.sdMatrix;
      if (wat === 'mij') { e.preventDefault(); chrome.storage.sync.set({ matrixMij: !(this.SD.settings.matrixMij === true) }); }
      else if (wat === 'draai') { e.preventDefault(); chrome.storage.sync.set({ matrixDraai: this.SD.settings.matrixDraai === false }); }
      else if (wat === 'weergave') { e.preventDefault(); chrome.storage.sync.set({ matrixWeergave: el.dataset.w }); }
      else if (wat === 'vak') { e.preventDefault(); const v = el.dataset.vak; if (this.open.has(v)) this.open.delete(v); else this.open.add(v); this._teken = null; this.pas(); }
      else if (wat === 'rij') { e.preventDefault(); this._naarRij = Number(el.dataset.rij); chrome.storage.sync.set({ matrixWeergave: 'student' }); }
    };
    document.addEventListener('click', this._klik, true);
    this._kies = (e) => { const el = e.target.closest?.('select[data-sd-matrix-kies]'); if (el) chrome.storage.sync.set({ [el.dataset.sdMatrixKies]: el.value }); };
    document.addEventListener('change', this._kies, true);
    this._ontvolgP = SD.perioden.volg(() => { this._teken = null; this.pas(); });
    SD.perioden.laad().catch(() => {});
    this._hash = () => this.pas();
    window.addEventListener('hashchange', this._hash);
    this._ontvolg = SD.klassen.volg(() => this.pas());
    SD.ready(() => {
      if (!this.SD) return;
      SD.klassen.laad().catch(() => {});
      this.pas();
      this._stop = SD.observe(() => this.pas(), 500);
    });
  },

  update() { if (document.body) this.pas(); },

  destroy() {
    document.removeEventListener('click', this._klik, true);
    window.removeEventListener('hashchange', this._hash);
    document.removeEventListener('change', this._kies, true);
    this._ontvolgP?.();
    this._ontvolg?.();
    this._stop?.();
    this.ruimOp();
    this.SD = null;
  },

  ruimOp() {
    const root = document.documentElement;
    if (!root.hasAttribute('data-sim-matrix') && !document.querySelector('.sd-matrix-balk')) return;
    for (const a of ['data-sim-matrix', 'data-sim-matrix-student', 'data-sim-matrix-overzicht', 'data-sim-matrix-mij', 'data-sim-matrix-draai']) root.removeAttribute(a);
    document.querySelectorAll('[data-sd-mij]').forEach((el) => el.removeAttribute('data-sd-mij'));
    document.querySelectorAll('.sd-matrix-balk, .sd-matrix-overzicht, .sd-matrix-draai').forEach((el) => el.remove());
    document.querySelectorAll('[data-sd-matrix-tabel]').forEach((el) => el.removeAttribute('data-sd-matrix-tabel'));
    this._teken = null;
  },

  /* Je eigen naam zoals Simulise die in de bovenbalk toont; alleen om je eigen cellen te herkennen. */
  eigenNaam() {
    const namen = [...document.querySelectorAll('.nav-user .dropdown-toggle')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t.length > 3 && /\p{L}/u.test(t));
    return namen.sort((a, b) => b.length - a.length)[0] || '';
  },

  /* Welke soort is een cel: mij, collega, bezig, laat, niet, klaar of overig. */
  soort(status, titel, ik) {
    const t = String(titel || '').replace(/\s+/g, ' ').trim();
    if (status === 'FINISHED') return 'klaar';
    if (status === 'HANDED_IN' || status === 'FEEDBACK_ASKED') return /^te beoordelen$/i.test(t) ? 'mij' : 'collega';
    if (status === 'BEING_PROCESSED' || status === 'PARTLY_REVIEWED') return ik && t.includes(ik) ? 'mij' : 'collega';
    if (status === 'IN_PROGRESS' || status === 'DOOVER') return 'bezig';
    if (status === 'DEADLINE_PAST') return 'laat';
    if (status === 'NOT_STARTED') return 'niet';
    return 'overig';
  },

  /* Vak uit de titel: "ENG_1.5: ..." geeft ENG, "M1BUR - ..." geeft BUR, een meetmoment komt bij Meetmomenten. */
  vak(titel) {
    const t = String(titel || '').trim();
    if (/^meetmoment\b/i.test(t)) return 'Meetmomenten';
    const m = t.match(/^M\d{1,2}([A-Z]{2,5})\b/) || t.match(/^([A-Z]{2,5})(?=[ _.:|-]|\d)/);
    return m ? m[1] : '';
  },

  /* "Deadline: 25-11-2026 23:59" wordt "Deadline 25 november". */
  deadline(tekst) {
    const m = String(tekst || '').match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    return m && this.MAANDEN[Number(m[2]) - 1] ? `Deadline ${Number(m[1])} ${this.MAANDEN[Number(m[2]) - 1]}` : '';
  },

  /* De opdrachten uit de tabel, met per opdracht de tellers. Markeert ook de cellen die op jou wachten. */
  lees(tabel) {
    const ik = this.eigenNaam();
    const rijen = [];
    [...tabel.querySelectorAll('tbody > tr')].forEach((tr, nr) => {
      const cellen = tr.querySelectorAll('td[data-status]');
      if (!cellen.length) return;
      const tel = { mij: 0, collega: 0, bezig: 0, laat: 0, niet: 0, klaar: 0, overig: 0 };
      let link = '';
      // Per student (kolom) de cel: de eerste cel van de rij is de titel.
      const perStudent = [...tr.children].slice(1).map((td) => {
        if (!td.dataset?.status) return null;
        const a = td.querySelector('a');
        const tip = (a?.dataset.title || a?.getAttribute('data-original-title') || a?.title || '').replace(/\s+/g, ' ').trim();
        const soort = this.soort(td.dataset.status, tip, ik);
        tel[soort]++;
        if ((soort === 'mij') !== td.hasAttribute('data-sd-mij')) td.toggleAttribute('data-sd-mij', soort === 'mij');
        if (soort === 'mij' && !link) link = a?.getAttribute('href') || '';
        return { soort, tip, href: a?.getAttribute('href') || '' };
      });
      const kopLink = tr.querySelector('a.divider-plan');
      const titel = (kopLink?.textContent || '').replace(/\s+/g, ' ').trim();
      const dl = tr.querySelector('small.reviewers > a > small')?.textContent;
      rijen.push({ nr, titel, vak: this.vak(titel), deadline: this.deadline(dl), dag: (String(dl || '').match(/(\d{1,2})-(\d{1,2})-\d{4}/) || []).slice(1, 3).join('-'), datum: (() => { const m = String(dl || '').match(/(\d{1,2})-(\d{1,2})-(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; })(), tel, totaal: cellen.length, link, cellen: perStudent,
        href: /^(#|javascript:)?$/i.test(kopLink?.getAttribute('href') || '') ? '' : kopLink.getAttribute('href') });
    });
    return rijen;
  },

  /* Korte code voor boven een kolom: "PS_1.8: Skills Portfolio" wordt PS_1.8, "M1BUR - casus" wordt M1BUR, anders het begin van de titel. */
  code(titel) {
    const t = String(titel || '').trim();
    const m = t.match(/^([A-Za-z]{1,6}[_ ]?\d+(?:[.,]\d+)*[a-z]?|M\d{1,2}[A-Z]{2,5}|[A-Z]{2,6})(?=\s*[:|\-–]|\s|$)/);
    if (m && m[1].length <= 9) return m[1].replace(/\s+/g, '');
    const mm = t.match(/^meetmoment\s+(\S+).*?\b(M\d{1,2})\b/i);
    if (mm) return `MM ${mm[1].slice(0, 3)} ${mm[2]}`;
    return t.length > 9 ? `${t.slice(0, 8)}…` : t;
  },

  /* De studenten uit de kop van de tabel van Simulise, in de volgorde van de kolommen. */
  studenten(tabel) {
    return [...tabel.querySelectorAll('thead th')].slice(1).map((th) => {
      const a = th.querySelector('a');
      return { naam: (th.querySelector('.rotated-header-content')?.textContent || a?.textContent || '').replace(/\s+/g, ' ').trim(), href: a?.getAttribute('href') || '' };
    });
  },

  /* Achternaam om op te sorteren: het laatste deel van de naam, zonder tussenvoegsels ("Sanne van der Berg" geeft "berg sanne"). */
  achternaam(naam) {
    const delen = String(naam || '').trim().split(/\s+/);
    if (delen.length < 2) return delen.join(' ').toLowerCase();
    const TUSSEN = new Set(['van', 'de', 'der', 'den', 'het', 'ter', 'ten', 'te', 'in', 't', "'t", 'el', 'al', 'la', 'le', 'du', 'da', 'dos', 'di', 'von', 'bin', 'ben', 'op']);
    let i = 1;
    while (i < delen.length - 1 && !TUSSEN.has(delen[i].toLowerCase())) i++; // voornamen tot het eerste tussenvoegsel, anders tot het laatste woord
    let j = i;
    while (j < delen.length - 1 && TUSSEN.has(delen[j].toLowerCase())) j++;
    return `${delen.slice(j).join(' ')} ${delen.slice(0, i).join(' ')}`.toLowerCase();
  },

  /* De gedraaide tabel: studenten als rijen, opdrachten als kolommen. Sorteren en de periode kies je erboven. */
  draai(alleRijen, studenten) {
    const esc = this.esc, s = this.SD.settings, P = this.SD.perioden;
    const NAAM = { mij: 'wacht op jou', collega: 'bij een collega', bezig: 'student bezig', laat: 'te laat', niet: 'niet gestart', klaar: 'klaar', overig: '' };
    const periode = P.vind(s.matrixPeriode) ? s.matrixPeriode : '';
    let rijen = alleRijen.filter((r) => P.bevat(periode, r.datum));
    if (s.matrixKolommen === 'deadline') rijen = [...rijen].sort((a, b) => (a.datum || '9999').localeCompare(b.datum || '9999') || a.nr - b.nr);
    else if (s.matrixKolommen === 'code') rijen = [...rijen].sort((a, b) => this.code(a.titel).localeCompare(this.code(b.titel), 'nl', { numeric: true }) || a.nr - b.nr);
    const tel = (k, soort) => rijen.reduce((n, r) => n + (r.cellen[k]?.soort === soort ? 1 : 0), 0);
    const volgorde = studenten.map((st, k) => ({ st, k }));
    const opNaam = (a, b) => a.st.naam.localeCompare(b.st.naam, 'nl');
    const sorteer = { achternaam: (a, b) => this.achternaam(a.st.naam).localeCompare(this.achternaam(b.st.naam), 'nl'), wacht: (a, b) => tel(b.k, 'mij') - tel(a.k, 'mij') || opNaam(a, b),
      laat: (a, b) => tel(b.k, 'laat') - tel(a.k, 'laat') || opNaam(a, b), klaar: (a, b) => tel(b.k, 'klaar') - tel(a.k, 'klaar') || opNaam(a, b), voornaam: opNaam }[s.matrixSorteer] || opNaam;
    volgorde.sort(sorteer);
    const keuze = (sleutel, nu, opties, label) => `<label>${label} <select data-sd-matrix-kies="${sleutel}">${opties.map(([v, t]) => `<option value="${esc(v)}"${v === nu ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    const rand = (i) => (i && rijen[i].vak !== rijen[i - 1].vak ? 'sd-md-rand' : '');
    const kop = rijen.map((r, i) => `<th data-kol="${r.nr}" class="${rand(i)}" title="${esc(r.titel)}${r.deadline ? ` · ${esc(r.deadline)}` : ''}">${r.href ? `<a href="${esc(r.href)}">${esc(this.code(r.titel))}</a>` : `<span>${esc(this.code(r.titel))}</span>`}<small>${esc(r.dag || '')}</small></th>`).join('');
    const lijf = volgorde.map(({ st, k }) => `<tr><th class="sd-md-naam">${st.href ? `<a href="${esc(st.href)}">${esc(st.naam)}</a>` : esc(st.naam)}</th>${rijen.map((r, i) => {
      const c = r.cellen[k];
      return `<td data-kol="${r.nr}" class="${rand(i)}">${c ? `<a class="sd-md-stip ${c.soort}" href="${esc(c.href || '#')}" title="${esc(this.code(r.titel))}: ${esc(c.tip || NAAM[c.soort])}" aria-label="${esc(r.titel)}: ${esc(c.tip || NAAM[c.soort])}"></a>` : ''}</td>`;
    }).join('')}</tr>`).join('');
    return `<div class="sd-md-kies">${keuze('matrixSorteer', s.matrixSorteer || 'voornaam', [['voornaam', 'voornaam'], ['achternaam', 'achternaam'], ['wacht', 'wacht op jou eerst'], ['laat', 'te laat eerst'], ['klaar', 'meeste klaar eerst']], 'Studenten op')}
        ${keuze('matrixKolommen', s.matrixKolommen || 'simulise', [['simulise', 'volgorde van Simulise'], ['deadline', 'deadline'], ['code', 'code']], 'Opdrachten op')}
        ${P.lijst.length ? keuze('matrixPeriode', periode, [['', 'alle periodes'], ...P.lijst.map((p) => [p.code, `${p.code}${p.naam ? ` (${p.naam})` : ''}`])], 'Deadline in') : ''}
        <span class="sd-md-aantal">${rijen.length} van ${alleRijen.length} opdrachten</span></div>
      ${rijen.length ? `<div class="sd-md-rol"><table class="sd-md"><thead><tr><th class="sd-md-naam">Student</th>${kop}</tr></thead><tbody>${lijf}</tbody></table></div>` : '<p class="sd-md-leeg">Geen opdrachten met een deadline in deze periode.</p>'}
      <p class="sd-md-voet">Boven elke kolom staat de code van de opdracht; wijs hem aan voor de hele titel en de deadline. Klik op een stip om die inlevering te openen.</p>`;
  },

  pas() {
    if (!this.SD) return;
    const klasId = location.pathname.match(this.PAD)?.[1];
    // Vanaf de klaspagina: #sd-opdracht=<titel> opent de weergave per student met die opdracht gemarkeerd.
    const uitAdres = klasId && location.hash.match(/^#sd-opdracht=(.*)$/);
    if (uitAdres) {
      try { this._naarTitel = decodeURIComponent(uitAdres[1]); } catch { this._naarTitel = null; }
      history.replaceState(null, '', location.pathname + location.search);
      if (this.SD.settings.matrixWeergave !== 'student') { chrome.storage.sync.set({ matrixWeergave: 'student' }); return; }
    }
    const tabel = klasId && document.querySelector('table.table-group-assignments-overview, table.rotated-header');
    if (!tabel || !tabel.querySelector('td[data-status]')) { this.ruimOp(); return; }
    const root = document.documentElement, s = this.SD.settings;
    const student = s.matrixWeergave === 'student', alleenMij = student && s.matrixMij === true, draai = student && s.matrixDraai !== false;
    if (!root.hasAttribute('data-sim-matrix')) root.setAttribute('data-sim-matrix', '');
    root.toggleAttribute('data-sim-matrix-student', student);
    root.toggleAttribute('data-sim-matrix-overzicht', !student);
    root.toggleAttribute('data-sim-matrix-mij', alleenMij);
    root.toggleAttribute('data-sim-matrix-draai', draai);
    const rijen = this.lees(tabel);
    if (this._naarTitel != null) { const raak = rijen.find((r) => r.titel === this._naarTitel); if (student) { this._naarRij = raak ? raak.nr : null; this._naarTitel = null; } }
    const tel = { mij: 0, collega: 0, bezig: 0, laat: 0, niet: 0, klaar: 0, overig: 0 };
    for (const r of rijen) for (const k of Object.keys(tel)) tel[k] += r.tel[k];
    const K = this.SD.klassen;
    const kop = [...document.querySelectorAll('#content header .header-text span')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t && t !== '/');
    const naam = K.naam(klasId) || kop.at(-1) || 'Klas';
    const kleur = K.kleur(klasId) || '';
    const thuis = this.SD.isOn('vandaag');
    const filter = [...document.querySelectorAll('#content-wrapper .selectize-input .item')].map((el) => el.textContent.replace(/[×\s]+$/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const studenten = draai ? this.studenten(tabel) : [];
    const teken = JSON.stringify([klasId, naam, kleur, rijen.map((r) => [r.titel, r.deadline, r.tel, draai ? r.cellen : 0]), student, alleenMij, draai, studenten, draai ? [s.matrixSorteer, s.matrixKolommen, s.matrixPeriode, this.SD.perioden.lijst.map((p) => [p.code, p.van, p.tot])] : 0, thuis, filter, [...this.open]]);
    const anker = tabel.closest('.row') || tabel.closest('.panel') || tabel;
    if (!anker.hasAttribute('data-sd-matrix-tabel')) anker.setAttribute('data-sd-matrix-tabel', ''); // in het overzicht verbergt de opmaak dit deel
    let balk = document.querySelector('.sd-matrix-balk'), overzicht = document.querySelector('.sd-matrix-overzicht'), gedraaid = document.querySelector('.sd-matrix-draai');
    if (balk && overzicht && gedraaid && teken === this._teken && this._naarRij == null) return;
    this._teken = teken;
    if (!balk) { balk = Object.assign(document.createElement('div'), { className: 'sd-matrix-balk' }); anker.before(balk); }
    if (!overzicht) { overzicht = Object.assign(document.createElement('div'), { className: 'sd-matrix-overzicht' }); anker.before(overzicht); }
    const esc = this.esc;
    if (!gedraaid) { gedraaid = Object.assign(document.createElement('div'), { className: 'sd-matrix-draai' }); anker.before(gedraaid); }
    for (const el of [balk, overzicht, gedraaid]) { if (kleur) el.style.setProperty('--sd-klas', kleur); else el.style.removeProperty('--sd-klas'); }
    const kort = [[tel.mij, tel.mij === 1 ? 'wacht op jou' : 'wachten op jou'], [tel.laat, 'te laat']].filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(' · ') || 'Niets wacht op jou';
    balk.innerHTML = `<span class="sd-m-klas"><i></i>${esc(naam)}</span>
      ${student ? this.SOORTEN.map(([soort, een, meer]) => `<span class="sd-m-tel${soort === 'mij' && tel.mij ? ' sd-m-nu' : ''}" data-soort="${soort}"><i class="sd-m-stip ${soort}"></i><b>${tel[soort]}</b> ${tel[soort] === 1 ? een : meer}</span>`).join('')
    : `<span class="sd-m-kort">${esc(kort)}</span>`}
      <span class="sd-m-ruimte"></span>
      ${student ? `<button type="button" class="sd-m-knop${draai ? ' aan' : ''}" data-sd-matrix="draai" aria-pressed="${draai}" title="Studenten onder elkaar en de opdrachten als kolommen, of andersom zoals Simulise">Draaien</button>` : ''}
      ${student ? `<button type="button" class="sd-m-knop${alleenMij ? ' aan' : ''}" data-sd-matrix="mij" aria-pressed="${alleenMij}" title="Alles behalve wat op jou wacht wordt lichter">Alleen van mij</button>` : ''}
      <span class="sd-m-seg" role="group" aria-label="Weergave"><button type="button" data-sd-matrix="weergave" data-w="overzicht" class="${student ? '' : 'aan'}" aria-pressed="${!student}">Overzicht</button><button type="button" data-sd-matrix="weergave" data-w="student" class="${student ? 'aan' : ''}" aria-pressed="${student}">Per student</button></span>
      ${thuis ? `<a class="sd-m-knop sim-docent-klas" data-klas="${esc(klasId)}" href="#klas=${esc(klasId)}">Thuispagina van de klas</a>` : ''}`;
    overzicht.innerHTML = student ? '' : this.overzicht(rijen, filter);
    gedraaid.innerHTML = draai ? this.draai(rijen, studenten) : '';
    if (student && this._naarRij != null) {
      const nr = this._naarRij;
      this._naarRij = null;
      if (draai) { // de kolom van die opdracht
        const cellen = [...gedraaid.querySelectorAll(`[data-kol="${nr}"]`)];
        cellen[0]?.scrollIntoView({ block: 'nearest', inline: 'center' });
        cellen.forEach((el) => el.classList.add('sd-m-hier'));
        setTimeout(() => cellen.forEach((el) => el.classList.remove('sd-m-hier')), 2500);
      } else {
        const tr = tabel.querySelectorAll('tbody > tr')[nr];
        if (tr) { tr.scrollIntoView({ block: 'center' }); tr.classList.add('sd-m-hier'); setTimeout(() => tr.classList.remove('sd-m-hier'), 2500); }
      }
    }
  },

  esc: (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),

  /* De balk van één opdracht: klaar, ingeleverd (bij jou of een collega), bezig, te laat; de rest is niet gestart. */
  balkje(r) {
    const deel = (n) => `${Math.round((n / r.totaal) * 1000) / 10}%`;
    const tekst = `${r.tel.klaar} klaar, ${r.tel.mij + r.tel.collega} ingeleverd, ${r.tel.bezig} bezig, ${r.tel.laat} te laat, ${r.tel.niet + r.tel.overig} niet gestart`;
    return `<span class="sd-mo-balk" role="img" aria-label="${tekst}" title="${tekst}">${[['klaar', r.tel.klaar], ['in', r.tel.mij + r.tel.collega], ['bezig', r.tel.bezig], ['laat', r.tel.laat]]
      .filter(([, n]) => n).map(([soort, n]) => `<i class="${soort}" style="width:${deel(n)}"></i>`).join('')}</span>`;
  },

  /* Wat er in woorden bij een opdracht staat: het belangrijkste eerst. */
  stand(r) {
    if (r.tel.mij) return `<span class="sd-mo-pil mij">${r.tel.mij} ${r.tel.mij === 1 ? 'wacht' : 'wachten'} op jou</span>`;
    if (r.tel.laat) return `<span class="sd-mo-stand laat">${r.tel.laat} te laat</span>`;
    if (r.tel.collega) return `<span class="sd-mo-stand">${r.tel.collega} bij een collega</span>`;
    if (r.tel.klaar === r.totaal) return '<span class="sd-mo-stand">iedereen klaar</span>';
    return `<span class="sd-mo-stand">${r.tel.klaar} van ${r.totaal} klaar</span>`;
  },

  rij(r, naarInlevering) {
    const esc = this.esc;
    const doel = naarInlevering && r.link ? `href="${esc(r.link)}"` : `href="#" data-sd-matrix="rij" data-rij="${r.nr}" title="Toon deze opdracht per student"`;
    return `<a class="sd-mo-rij" ${doel}><span class="sd-mo-wat"><span class="sd-mo-titel" title="${esc(r.titel)}">${esc(r.titel)}</span><small>${esc(r.deadline || 'Geen deadline')}</small></span>${this.balkje(r)}${this.stand(r)}</a>`;
  },

  overzicht(rijen, filter) {
    const esc = this.esc;
    const mij = rijen.filter((r) => r.tel.mij).sort((a, b) => b.tel.mij - a.tel.mij);
    const vakken = new Map();
    for (const r of rijen) { if (!vakken.has(r.vak)) vakken.set(r.vak, []); vakken.get(r.vak).push(r); }
    // Volgorde: vakken op code, daarna Meetmomenten, als laatste de opdrachten zonder vakcode.
    const plek = (v) => (v === '' ? 2 : v === 'Meetmomenten' ? 1 : 0);
    const lijst = [...vakken].sort((a, b) => plek(a[0]) - plek(b[0]) || a[0].localeCompare(b[0]));
    const vakBlok = ([vak, rs]) => {
      const open = this.open.has(vak);
      const som = (k) => rs.reduce((n, r) => n + r.tel[k], 0);
      const wacht = som('mij'), laat = som('laat');
      const stand = wacht ? `<span class="sd-mo-pil mij">${wacht} ${wacht === 1 ? 'wacht' : 'wachten'} op jou</span>` : laat ? `<span class="sd-mo-pil laat">${laat} te laat</span>` : '<span class="sd-mo-stand">niets van jou</span>';
      const naam = vak === '' ? 'Zonder vakcode' : vak;
      return `<section class="sd-mo-blok"><button type="button" class="sd-mo-vak" data-sd-matrix="vak" data-vak="${esc(vak)}" aria-expanded="${open}"><i class="sd-mo-pijl"></i>
        ${vak && vak !== 'Meetmomenten' ? `<span class="sd-mo-code">${esc(vak)}</span>` : `<b>${esc(naam)}</b>`}<span class="sd-mo-aantal">${rs.length} ${rs.length === 1 ? 'opdracht' : 'opdrachten'}</span><span class="sd-m-ruimte"></span>${stand}</button>
        ${open ? rs.map((r) => this.rij(r, false)).join('') : ''}</section>`;
    };
    return `<section class="sd-mo-blok sd-mo-mij"><div class="sd-mo-vak"><b>Wacht op jou</b><span class="sd-mo-aantal">${mij.length ? `${mij.length} ${mij.length === 1 ? 'opdracht' : 'opdrachten'}` : ''}</span></div>
      ${mij.length ? mij.map((r) => this.rij(r, true)).join('') : '<p class="sd-mo-leeg">Niets te beoordelen in deze klas. Mooi bijgewerkt.</p>'}</section>
      ${lijst.map(vakBlok).join('')}
      <p class="sd-mo-voet"><span><i class="klaar"></i>klaar</span><span><i class="in"></i>ingeleverd</span><span><i class="bezig"></i>student bezig</span><span><i class="laat"></i>te laat</span><span><i class="niet"></i>niet gestart</span>
        <span class="sd-m-ruimte"></span><span>${filter.length ? `Simulise toont nu alleen: ${esc(filter.join(', '))}.` : 'Alle opdrachten van deze klas.'} Klik op een opdracht om hem per student te zien.</span></p>`;
  },
});
