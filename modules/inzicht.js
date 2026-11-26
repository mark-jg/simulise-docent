/* Inzicht (Analytics van Simulise): vriendelijker en overzichtelijker.
 *
 *   /analytics           Simulise toont zeven grote tegels met vaknamen ("Status opdracht over groepen"). Deze module zet
 *                        daar een eigen overzicht voor in de plaats: de rapportages als vragen ("Wie heeft deze opdracht
 *                        af?"), geordend naar waar ze over gaan (een klas, studenten, één opdracht of sjabloon). Elke regel
 *                        gaat rechtstreeks naar de keuzes van die rapportage (/analytics/<soort>), zonder de tussenpagina.
 *                        Bovenaan staan je klassen: één klik opent het voortgangsrapport van die klas (module rapporten).
 *                        De tegels van Simulise blijven bereikbaar met de knop onderaan.
 *   /analytics/<soort>   De keuzes voor een rapportage. De titel wordt de vraag en de stappen en meldingen staan in gewone
 *                        taal ("Welke opdracht?", "Toon rapportage"). Verder blijft het formulier van Simulise zoals het is.
 *   /analytics/<soort>/reports   De bewaarde rapportages. De grote tegel maakt plaats voor een kop met de vraag en een knop
 *                        "Nieuwe rapportage"; de lijst van Simulise krijgt de volle breedte.
 *   /analytics/<soort>/result    Het resultaat. Knoppen krijgen woorden (Keuzes wijzigen, Bewaren, Downloaden), de keuzes
 *                        staan als rustige labels boven de tabel en de tabel houdt kop en namen in beeld. Bij "Opleiding
 *                        per groep" staat erboven de stand van de klas: per leerlijn en stap hoeveel studenten die hebben
 *                        behaald, geteld uit de tabel die Simulise toont (wit = nog niet beoordeeld, grijs = beoordeeld
 *                        maar nog niet aangetoond, kleur = behaald). De diagramweergave blijft zoals Simulise
 *                        die tekent (naast elkaar zetten maakt de diagrammen te klein; geprobeerd in november 2026).
 *
 * De soorten en hun adressen komen uit Simulise zelf (GraphQL analyticsQueryTypes, gezien in november 2026); de module
 * herkent een tegel aan zijn titel. Een tegel die ze niet kent komt onder "Overig" en werkt via de tegel zelf.
 * Er wordt niets opgevraagd of bewaard. De opmaak staat in theme.css (.sd-inzicht en html[data-sim-inzicht]).
 */
SD.register({
  id: 'inzicht',
  WIZARD: /^\/analytics\/([a-z]+)\/?$/,
  BEWAARD: /^\/analytics\/([a-z]+)\/reports\/?$/,
  RESULTAAT: /^\/analytics\/([a-z]+)\/result\/?$/,

  /* Titel van de tegel in Simulise -> soort (adres), de vraag in gewone taal en het deel waar hij onder valt. */
  SOORTEN: {
    'Opleiding per groep': ['educationbygroups', 'Hoe staat een klas ervoor in de opleiding?', 'klas'],
    'Leerlijnen per groep': ['skillsbygroup', 'Hoe scoort een klas gemiddeld per leerlijn?', 'klas'],
    'Leerlijnen': ['skills', 'Hoe ver zijn studenten met de leerlijnen?', 'student'],
    'Opdrachten per student': ['assignmentsbyuser', 'Welke opdrachten heeft een student gedaan?', 'student'],
    'Portfolio Activiteit': ['portfolioactivity', 'Hoe actief zijn studenten in hun portfolio?', 'student'],
    'Status opdracht over groepen': ['assignmentbygroups', 'Wie heeft deze opdracht af?', 'opdracht'],
    'Status sjablonen over groepen': ['templatebygroups', 'Wie heeft dit sjabloon ingevuld?', 'opdracht'],
  },
  DELEN: [['klas', 'Over een klas'], ['student', 'Over studenten'], ['opdracht', 'Over één opdracht of sjabloon'], ['overig', 'Overig']],

  /* Teksten in de keuzes van een rapportage. STAP geldt alleen voor de kop van een stap. */
  STAP: {
    'Selecteer opdracht': 'Welke opdracht?', 'Selecteer sjabloon': 'Welk sjabloon?', 'Selecteer studenten': 'Welke studenten?', 'Selecteer tijdsbereik': 'Welke periode?',
    'Opleiding': 'Welke opleiding?', 'Leerlijnen': 'Welke leerlijnen?', 'Extra opties': 'Meer keuzes', 'Weergave beoordeling': 'Hoe wil je het zien?',
  },
  TEKST: {
    'Learning Analytics': 'Inzicht', 'Uitvoeren': 'Toon rapportage', 'Deze keuze is verplicht!': 'Kies eerst iets; dit is verplicht.',
    'Nog niet alle vereisten velden hebben een waarde!': 'Maak eerst de verplichte keuze hierboven.', 'Geen keuze gemaakt': 'Niets gekozen', 'Geen filters aangezet': 'Geen extra keuzes',
    'Tabel weergave': 'Tabel', 'Diagram weergave': 'Diagram', 'Filters': 'Keuzes wijzigen', 'Laad meer...': 'Toon meer',
  },

  init(SD) {
    this.SD = SD;
    this.tegels = false; // de tegels van Simulise tonen (alleen in het geheugen)
    this._klik = (e) => {
      const el = e.target.closest?.('[data-sd-inzicht]');
      if (!el) return;
      e.preventDefault();
      if (el.dataset.sdInzicht === 'tegels') { this.tegels = !this.tegels; this._teken = null; this.pas(); }
      else if (el.dataset.sdInzicht === 'alles') { this.alles = location.href; this._keer = 0; this.pas(); }
      else if (el.dataset.sdInzicht === 'tegel') {
        // Een soort die de module niet kent: de tegel van Simulise zelf laten werken.
        const tegel = this.leesTegels()[Number(el.dataset.nr)]?.el;
        (tegel?.querySelector('button.btn') || tegel?.querySelector('.panel-link-icon'))?.click();
      }
    };
    document.addEventListener('click', this._klik, true);
    this._ontvolg = SD.klassen.volg(() => { this._teken = null; this.pas(); });
    SD.ready(() => {
      if (!this.SD) return;
      SD.klassen.laad().catch(() => {});
      this.pas();
      this._stop = SD.observe(() => this.pas(), 400);
    });
  },

  update() { if (document.body) { this._teken = null; this.pas(); } },

  destroy() {
    document.removeEventListener('click', this._klik, true);
    this._ontvolg?.();
    this._stop?.();
    this.ruimOp();
    this.SD = null;
  },

  ruimOp() {
    const root = document.documentElement;
    root.removeAttribute('data-sim-inzicht');
    root.removeAttribute('data-sim-inzicht-tegels');
    document.querySelectorAll('.sd-inzicht').forEach((el) => el.remove());
    for (const naam of ['data-sd-inzicht-rij', 'data-sd-inzicht-tegel', 'data-sd-inzicht-lijst', 'data-sd-iz-tabel']) document.querySelectorAll(`[${naam}]`).forEach((el) => el.removeAttribute(naam));
    for (const n of this._vertaald || []) { if (n.nodeValue === n.__sdizNa) n.nodeValue = n.__sdizVoor; delete n.__sdizVoor; delete n.__sdizNa; }
    this._vertaald = null;
    this._teken = null;
  },

  pas() {
    if (!this.SD) return;
    const pad = location.pathname.replace(/\/$/, '');
    if (pad === '/analytics') { this.landing(); return; }
    const bewaard = location.pathname.match(this.BEWAARD), resultaat = location.pathname.match(this.RESULTAAT);
    if (bewaard) { this.bewaard(bewaard[1]); return; }
    if (resultaat) { this.resultaat(resultaat[1]); return; }
    if (this.WIZARD.test(location.pathname) && document.querySelector('#analyticsForm')) { this.wizard(); return; }
    if (document.documentElement.hasAttribute('data-sim-inzicht') || document.querySelector('.sd-inzicht')) this.ruimOp();
  },

  /* De tegels van Simulise op /analytics: titel, uitleg, aantal bewaarde rapportages. Niet de kaart van de extensie zelf. */
  leesTegels() {
    return [...document.querySelectorAll('#scrollable-page-wrapper section.panel-link')].filter((el) => !el.closest('.sim-docent-kaart')).map((el) => {
      const titel = (el.querySelector('a.h3, .h3')?.textContent || '').replace(/\s+/g, ' ').trim();
      const voet = (el.querySelector('.panel-footer')?.textContent || '').replace(/\s+/g, ' ').trim();
      return { el, titel, uitleg: (el.querySelector('.panel-link-body')?.textContent || '').replace(/\s+/g, ' ').trim(), bewaard: Number(voet.match(/\d+/)?.[0]) || 0 };
    }).filter((t) => t.titel);
  },

  landing() {
    const tegels = this.leesTegels();
    if (!tegels.length) return; // Simulise is nog bezig
    const root = document.documentElement;
    this.staat('start');
    root.toggleAttribute('data-sim-inzicht-tegels', this.tegels);
    const rij = tegels[0].el.closest('.row') || tegels[0].el.parentElement;
    if (!rij.hasAttribute('data-sd-inzicht-rij')) rij.setAttribute('data-sd-inzicht-rij', '');
    const K = this.SD.klassen, rapporten = this.SD.isOn('rapporten');
    const klassen = rapporten ? K.lijst.map((k) => ({ ...k, kleur: K.kleur(k.id) })) : [];
    const teken = JSON.stringify([tegels.map((t) => [t.titel, t.bewaard]), klassen, this.tegels]);
    let el = document.querySelector('.sd-inzicht');
    if (el && teken === this._teken) return;
    this._teken = teken;
    if (!el) { el = Object.assign(document.createElement('div'), { className: 'sd-inzicht' }); rij.before(el); }
    const esc = this.esc;
    const perDeel = Object.fromEntries(this.DELEN.map(([d]) => [d, []]));
    tegels.forEach((t, nr) => {
      const [soort, vraag, deel] = this.SOORTEN[t.titel] || [null, t.titel, 'overig'];
      perDeel[deel].push({ ...t, nr, soort, vraag });
    });
    const regel = (t) => `<div class="sd-iz-rij"><span class="sd-iz-wat"><b>${esc(t.vraag)}</b><small>${t.soort ? `In Simulise: ${esc(t.titel)}` : esc(t.uitleg)}</small></span>
      ${t.bewaard && t.soort ? `<a class="sd-iz-bewaard" href="/analytics/${t.soort}/reports">${t.bewaard} bewaard</a>` : ''}
      ${t.soort ? `<a class="sd-iz-knop" href="/analytics/${t.soort}">Nieuwe rapportage</a>` : `<a class="sd-iz-knop" href="#" data-sd-inzicht="tegel" data-nr="${t.nr}">Openen</a>`}</div>`;
    el.innerHTML = `<header class="sd-iz-kop"><h1>Inzicht</h1><p>Wat wil je weten?</p></header>
      ${klassen.length ? `<section class="sd-iz-blok sd-iz-klassen"><h2>Voortgang van een klas</h2><p>Eén klik: alle studenten van de klas met hun leerlijnen naast elkaar.</p>
        <div class="sd-iz-chips">${klassen.map((k) => `<a href="#" class="sim-docent-rapport sd-iz-klas" data-groep="${esc(k.id)}" data-naam="${esc(k.naam)}" style="--sd-klas:${esc(k.kleur || '')}"><i></i>${esc(k.naam)}</a>`).join('')}</div></section>` : ''}
      ${this.DELEN.filter(([d]) => perDeel[d].length).map(([d, naam]) => `<section class="sd-iz-blok" data-deel="${d}"><h2>${naam}</h2>${perDeel[d].map(regel).join('')}</section>`).join('')}
      <p class="sd-iz-voet"><button type="button" data-sd-inzicht="tegels" aria-pressed="${this.tegels}">${this.tegels ? 'Verberg de tegels van Simulise' : 'Toon de tegels van Simulise'}</button></p>`;
  },

  esc: (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),

  /* Zet waar we zijn op <html>. Bij een wissel (Simulise is één pagina) eerst opruimen wat van de vorige plek was. */
  staat(naam) {
    const root = document.documentElement, nu = root.getAttribute('data-sim-inzicht');
    if (nu === naam) return;
    if (nu) this.ruimOp();
    root.setAttribute('data-sim-inzicht', naam);
  },

  /* [vraag, titel in Simulise] bij een soort uit het adres. */
  vraagVan(soort) {
    const raak = Object.entries(this.SOORTEN).find(([, [s]]) => s === soort);
    return raak ? [raak[1][1], raak[0]] : [null, null];
  },

  /* Vaste teksten van Simulise in gewone taal, binnen de gegeven delen van de pagina. */
  vertaal(selector) {
    const vragen = Object.fromEntries(Object.entries(this.SOORTEN).map(([titel, [, vraag]]) => [titel, vraag]));
    for (const wortel of document.querySelectorAll(selector)) {
      const loop = document.createTreeWalker(wortel, NodeFilter.SHOW_TEXT);
      const raak = [];
      while (loop.nextNode()) {
        const n = loop.currentNode, t = n.nodeValue, kern = t.replace(/\s+/g, ' ').trim();
        if (kern.length < 4 || kern.length > 70 || n.__sdizNa === t) continue;
        const ouder = n.parentElement;
        if (!ouder || ouder.closest('script, style, textarea, input, select, option, .selectize-control, [contenteditable="true"], .sd-inzicht')) continue;
        const inStap = !!ouder.closest('.list-group-item h4');
        // In de kruimelkop blijft de korte naam van Simulise staan: de vraag is daar te lang en breekt over twee regels.
        const nieuw = inStap ? this.STAP[kern] : (this.TEKST[kern] ?? (ouder.closest('header.header') ? undefined : vragen[kern]));
        if (nieuw && nieuw !== kern && t.includes(kern)) raak.push([n, t, t.replace(kern, nieuw)]);
      }
      for (const [n, oud, nieuw] of raak) { n.__sdizVoor = oud; n.__sdizNa = nieuw; n.nodeValue = nieuw; (this._vertaald ??= new Set()).add(n); }
    }
  },

  /* De keuzes voor een rapportage: de vraag als titel en gewone taal in de stappen. */
  wizard() {
    this.staat('keuzes');
    this.vertaal('#analyticsForm, #content header.header');
  },

  /* De bewaarde rapportages van één soort: een kop met de vraag in plaats van de grote tegel. */
  bewaard(soort) {
    const tegel = document.querySelector('#scrollable-page-wrapper section.panel-link');
    const kolom = tegel?.closest('[class*="col-"]');
    if (!kolom) return; // Simulise is nog bezig
    this.staat('bewaard');
    if (!kolom.hasAttribute('data-sd-inzicht-tegel')) kolom.setAttribute('data-sd-inzicht-tegel', '');
    const rij = kolom.parentElement;
    const lijst = [...rij.children].find((el) => el !== kolom);
    if (lijst && !lijst.hasAttribute('data-sd-inzicht-lijst')) lijst.setAttribute('data-sd-inzicht-lijst', '');
    this.vertaal('#content header.header');
    const [vraag, titel] = this.vraagVan(soort);
    const naam = titel || (tegel.querySelector('a.h3, .h3')?.textContent || '').replace(/\s+/g, ' ').trim();
    const teken = `bewaard ${soort} ${naam}`;
    let el = document.querySelector('.sd-inzicht');
    if (el && this._teken === teken) return;
    this._teken = teken;
    if (!el) { el = Object.assign(document.createElement('div'), { className: 'sd-inzicht' }); rij.before(el); }
    const esc = this.esc;
    el.innerHTML = `<header class="sd-iz-kop sd-iz-kop-actie"><div><a class="sd-iz-terug" href="/analytics">Inzicht</a><h1>${esc(vraag || naam)}</h1>
      <p>${vraag ? `In Simulise: ${esc(naam)}. ` : ''}Hieronder staan de rapportages die je hebt bewaard. Bewaren doe je met de knop Bewaren boven een resultaat.</p></div>
      <a class="sd-iz-knop sd-iz-hoofd" href="/analytics/${encodeURIComponent(soort)}">Nieuwe rapportage</a></header>`;
  },

  /* Het resultaat van een rapportage. */
  resultaat(soort) {
    this.staat('resultaat');
    this.vertaal('#content header.header, #scrollable-page-wrapper ul.list-inline, #scrollable-page-wrapper .modal, #scrollable-page-wrapper > div > .text-center');
    const wrapper = document.querySelector('#scrollable-page-wrapper');
    const tabel = wrapper?.querySelector('table.table-index');
    const om = tabel?.parentElement;
    if (om && !om.hasAttribute('data-sd-iz-tabel')) om.setAttribute('data-sd-iz-tabel', '');
    // "Toon alle": de knop van Simulise indrukken tot alles er staat (alleen lezen), hooguit tien keer.
    const meer = [...(wrapper?.querySelectorAll('.text-center > button.btn-default') || [])].find((b) => /^(Laad meer|Toon meer)/.test(b.textContent.trim()));
    if (this.alles && this.alles !== location.href) { this.alles = null; this._keer = 0; }
    if (this.alles && meer && !meer.disabled && (this._keer || 0) < 10 && Date.now() - (this._laatst || 0) > 700) { this._keer = (this._keer || 0) + 1; this._laatst = Date.now(); meer.click(); }
    if (soort === 'educationbygroups' && tabel && om) this.stand(tabel, om.parentElement?.parentElement === wrapper ? om.parentElement : om, !!meer);
    else document.querySelectorAll('.sd-inzicht').forEach((el) => el.remove());
  },

  /* De stand van de klas boven de tabel van "Opleiding per groep": per leerlijn en stap hoeveel studenten die hebben behaald.
   * Geteld uit de stippen die Simulise toont: wit = nog niet beoordeeld, grijs = beoordeeld maar nog niet aangetoond, kleur = behaald. */
  stand(tabel, voor, meer) {
    const koppen = [...tabel.querySelectorAll('thead tr:first-child th[colspan]')].map((th) => ({ naam: th.textContent.replace(/\s+/g, ' ').trim(), n: Number(th.getAttribute('colspan')) || 1 }));
    const rijen = [...tabel.querySelectorAll('tbody tr')].filter((tr) => tr.querySelector('.score-dot'));
    if (!koppen.length || !rijen.length) { document.querySelectorAll('.sd-inzicht').forEach((el) => el.remove()); return; }
    const lijnen = koppen.map((k) => ({ naam: k.naam, kleur: '', stappen: Array.from({ length: k.n }, () => ({ behaald: 0, bezig: 0 })) }));
    for (const tr of rijen) {
      const cellen = [...tr.children].slice(1);
      let c = 0;
      for (const lijn of lijnen) for (const stap of lijn.stappen) {
        const m = (cellen[c++]?.querySelector('.score-dot')?.style.backgroundColor || '').match(/\d+/g);
        if (!m) continue;
        const [r, g, b] = m.map(Number);
        if (r === g && g === b) { if (r < 250) stap.bezig++; continue; }
        stap.behaald++;
        if (!lijn.kleur) lijn.kleur = `rgb(${r}, ${g}, ${b})`;
      }
    }
    const tekst = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const groep = tekst(document.querySelector('#scrollable-page-wrapper ul.list-inline .fa-user-friends')?.parentElement);
    const totaal = Number(tekst(document.querySelector('#scrollable-page-wrapper .table-footer')).match(/van de (\d+)/)?.[1]) || rijen.length;
    const teken = JSON.stringify(['stand', lijnen, groep, rijen.length, totaal, meer, !!this.alles]);
    let el = document.querySelector('.sd-inzicht');
    if (el && this._teken === teken && el.nextElementSibling === voor) return;
    this._teken = teken;
    if (!el) el = Object.assign(document.createElement('div'), { className: 'sd-inzicht sd-iz-stand' });
    if (el.nextElementSibling !== voor) voor.before(el);
    const esc = this.esc, n = rijen.length;
    const pct = (x) => Math.round((x / n) * 100);
    const stap = (s, i) => `<span class="sd-iz-stap${s.behaald || s.bezig ? '' : ' leeg'}" title="Stap ${i + 1}: ${s.behaald} van ${n} behaald${s.bezig ? `, ${s.bezig} beoordeeld maar nog niet aangetoond` : ''}"><i><u style="height:${pct(s.behaald)}%"></u><u class="bezig" style="height:${pct(s.bezig)}%;bottom:${pct(s.behaald)}%"></u></i><b>${s.behaald}</b><small>stap ${i + 1}</small></span>`;
    const deels = meer && totaal > n;
    el.innerHTML = `<section class="sd-iz-blok"><h2>${esc(groep && groep.length < 40 ? groep : 'De groep')} in één oogopslag</h2>
      <p class="sd-iz-uitleg">Hoeveel van de ${n} studenten elke stap van een leerlijn hebben behaald.${deels ? ` Simulise toont er nu ${n} van de ${totaal}. ${this.alles ? 'De rest wordt geladen…' : '<button type="button" data-sd-inzicht="alles">Toon alle ' + totaal + '</button>'}` : ''}</p>
      <div class="sd-iz-lijnen">${lijnen.map((l) => `<div class="sd-iz-lijn" style="--sd-lijn:${esc(l.kleur || '')}"><strong>${esc(l.naam)}</strong><div class="sd-iz-stappen">${l.stappen.map(stap).join('')}</div></div>`).join('')}</div>
      <p class="sd-iz-legenda"><span><i class="vol"></i>behaald</span><span><i class="grijs"></i>beoordeeld, nog niet aangetoond</span><span><i></i>nog niet beoordeeld</span><span>Wijs een stip aan voor de beoordeling, klik om die te openen.</span></p></section>`;
  },
});
