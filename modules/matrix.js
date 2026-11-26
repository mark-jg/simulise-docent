/* Opdrachten van een klas (/groups/school/<uuid>/assignments): een rustig overzicht per vak, en de matrix als stippenkaart.
 *
 * Simulise toont per student en opdracht een groot gekleurd vak. Deze module biedt twee weergaven (instelling
 * matrixWeergave), te kiezen in een balk boven de pagina:
 *
 *   Overzicht (standaard)  Eerst een blok "Wacht op jou" met de opdrachten waar jij iets moet nakijken; daaronder de
 *                          opdrachten per vak (de code uit de titel, zoals BUR of CREA), inklapbaar, met per opdracht
 *                          één balk: klaar, ingeleverd, te laat, niet gestart. Geen studenten in beeld.
 *   Per student            De matrix van Simulise als stippenkaart: smalle kolommen met de naam verticaal, per rij de
 *                          titel met de deadline eronder, per inlevering één stip. Opmaak in theme.css onder
 *                          html[data-sim-matrix-student].
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
      else if (wat === 'weergave') { e.preventDefault(); chrome.storage.sync.set({ matrixWeergave: el.dataset.w }); }
      else if (wat === 'vak') { e.preventDefault(); const v = el.dataset.vak; if (this.open.has(v)) this.open.delete(v); else this.open.add(v); this._teken = null; this.pas(); }
      else if (wat === 'rij') { e.preventDefault(); this._naarRij = Number(el.dataset.rij); chrome.storage.sync.set({ matrixWeergave: 'student' }); }
    };
    document.addEventListener('click', this._klik, true);
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
    this._ontvolg?.();
    this._stop?.();
    this.ruimOp();
    this.SD = null;
  },

  ruimOp() {
    const root = document.documentElement;
    if (!root.hasAttribute('data-sim-matrix') && !document.querySelector('.sd-matrix-balk')) return;
    for (const a of ['data-sim-matrix', 'data-sim-matrix-student', 'data-sim-matrix-overzicht', 'data-sim-matrix-mij']) root.removeAttribute(a);
    document.querySelectorAll('[data-sd-mij]').forEach((el) => el.removeAttribute('data-sd-mij'));
    document.querySelectorAll('.sd-matrix-balk, .sd-matrix-overzicht').forEach((el) => el.remove());
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
      for (const td of cellen) {
        const a = td.querySelector('a');
        const soort = this.soort(td.dataset.status, a?.dataset.title || a?.getAttribute('data-original-title') || a?.title, ik);
        tel[soort]++;
        if ((soort === 'mij') !== td.hasAttribute('data-sd-mij')) td.toggleAttribute('data-sd-mij', soort === 'mij');
        if (soort === 'mij' && !link) link = a?.getAttribute('href') || '';
      }
      const titel = (tr.querySelector('a.divider-plan')?.textContent || '').replace(/\s+/g, ' ').trim();
      rijen.push({ nr, titel, vak: this.vak(titel), deadline: this.deadline(tr.querySelector('small.reviewers > a > small')?.textContent), tel, totaal: cellen.length, link });
    });
    return rijen;
  },

  pas() {
    if (!this.SD) return;
    const klasId = location.pathname.match(this.PAD)?.[1];
    const tabel = klasId && document.querySelector('table.table-group-assignments-overview, table.rotated-header');
    if (!tabel || !tabel.querySelector('td[data-status]')) { this.ruimOp(); return; }
    const root = document.documentElement, s = this.SD.settings;
    const student = s.matrixWeergave === 'student', alleenMij = student && s.matrixMij === true;
    if (!root.hasAttribute('data-sim-matrix')) root.setAttribute('data-sim-matrix', '');
    root.toggleAttribute('data-sim-matrix-student', student);
    root.toggleAttribute('data-sim-matrix-overzicht', !student);
    root.toggleAttribute('data-sim-matrix-mij', alleenMij);
    const rijen = this.lees(tabel);
    const tel = { mij: 0, collega: 0, bezig: 0, laat: 0, niet: 0, klaar: 0, overig: 0 };
    for (const r of rijen) for (const k of Object.keys(tel)) tel[k] += r.tel[k];
    const K = this.SD.klassen;
    const kop = [...document.querySelectorAll('#content header .header-text span')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t && t !== '/');
    const naam = K.naam(klasId) || kop.at(-1) || 'Klas';
    const kleur = K.kleur(klasId) || '';
    const thuis = this.SD.isOn('vandaag');
    const filter = [...document.querySelectorAll('#content-wrapper .selectize-input .item')].map((el) => el.textContent.replace(/[×\s]+$/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const teken = JSON.stringify([klasId, naam, kleur, rijen.map((r) => [r.titel, r.deadline, r.tel]), student, alleenMij, thuis, filter, [...this.open]]);
    const anker = tabel.closest('.row') || tabel.closest('.panel') || tabel;
    if (!anker.hasAttribute('data-sd-matrix-tabel')) anker.setAttribute('data-sd-matrix-tabel', ''); // in het overzicht verbergt de opmaak dit deel
    let balk = document.querySelector('.sd-matrix-balk'), overzicht = document.querySelector('.sd-matrix-overzicht');
    if (balk && overzicht && teken === this._teken) return;
    this._teken = teken;
    if (!balk) { balk = Object.assign(document.createElement('div'), { className: 'sd-matrix-balk' }); anker.before(balk); }
    if (!overzicht) { overzicht = Object.assign(document.createElement('div'), { className: 'sd-matrix-overzicht' }); anker.before(overzicht); }
    const esc = this.esc;
    for (const el of [balk, overzicht]) { if (kleur) el.style.setProperty('--sd-klas', kleur); else el.style.removeProperty('--sd-klas'); }
    const kort = [[tel.mij, tel.mij === 1 ? 'wacht op jou' : 'wachten op jou'], [tel.laat, 'te laat']].filter(([n]) => n).map(([n, t]) => `${n} ${t}`).join(' · ') || 'Niets wacht op jou';
    balk.innerHTML = `<span class="sd-m-klas"><i></i>${esc(naam)}</span>
      ${student ? this.SOORTEN.map(([soort, een, meer]) => `<span class="sd-m-tel${soort === 'mij' && tel.mij ? ' sd-m-nu' : ''}" data-soort="${soort}"><i class="sd-m-stip ${soort}"></i><b>${tel[soort]}</b> ${tel[soort] === 1 ? een : meer}</span>`).join('')
    : `<span class="sd-m-kort">${esc(kort)}</span>`}
      <span class="sd-m-ruimte"></span>
      ${student ? `<button type="button" class="sd-m-knop${alleenMij ? ' aan' : ''}" data-sd-matrix="mij" aria-pressed="${alleenMij}" title="Alles behalve wat op jou wacht wordt lichter">Alleen van mij</button>` : ''}
      <span class="sd-m-seg" role="group" aria-label="Weergave"><button type="button" data-sd-matrix="weergave" data-w="overzicht" class="${student ? '' : 'aan'}" aria-pressed="${!student}">Overzicht</button><button type="button" data-sd-matrix="weergave" data-w="student" class="${student ? 'aan' : ''}" aria-pressed="${student}">Per student</button></span>
      ${thuis ? `<a class="sd-m-knop sim-docent-klas" data-klas="${esc(klasId)}" href="#klas=${esc(klasId)}">Thuispagina van de klas</a>` : ''}`;
    overzicht.innerHTML = student ? '' : this.overzicht(rijen, filter);
    if (student && this._naarRij != null) {
      const tr = tabel.querySelectorAll('tbody > tr')[this._naarRij];
      this._naarRij = null;
      if (tr) { tr.scrollIntoView({ block: 'center' }); tr.classList.add('sd-m-hier'); setTimeout(() => tr.classList.remove('sd-m-hier'), 2500); }
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
