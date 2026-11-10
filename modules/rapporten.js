/* Voortgangsrapporten (roadmap 2.11).
 *
 *   Profiel van een student (/@gebruiker): knop "Voortgangsrapport" bij het diagram (kaart Opleidingen).
 *   Groepen (/groups): in het menu van elke groep "Voortgangsrapporten" voor alle studenten van die groep.
 *
 * Gegevens: via modules/gql.js (in de pagina) met je eigen sessie bij Simulise:
 *   sdRapportStudent   user(id) { id name username dashboardEducations { id name groups } }
 *   sdRapportDiagram   user(id).diagramForEducation(id) { phaseCount aspects { aspect { name skill } phases {
 *                      phase weights reviews { score title scoreName } currentScore reviewsAchieved reviewsRequired } } }
 * De studenten van een groep komen uit de HTML van /groups/school/<uuid>/students (links naar /@gebruiker).
 * Het rapport (rapport/render.js, profiel uit chrome.storage.local rpProfielen) opent in een nieuw tabblad,
 * alleen in het geheugen: er wordt niets bewaard. Afdrukken of opslaan als PDF kan vanuit dat tabblad.
 */
SD.register({
  id: 'rapporten',
  MAX_TEGELIJK: 3,

  Q_STUDENT: 'query sdRapportStudent($id: String!) { user(id: $id) { id name username dashboardEducations { id name groups { ... on SchoolGroup { id name } } } } }',
  Q_DIAGRAM: (metSkillNaam) => `query sdRapportDiagram($educationId: ID!, $userId: String!) { user(id: $userId) { id diagram: diagramForEducation(id: $educationId) { id phaseCount aspects { id aspect { id name skill { id ${metSkillNaam ? 'name ' : ''}color } } phases { id phase weights { level title } reviews { id color score title maxScore scoreName } currentScore reviewProgress reviewsAchieved reviewsRequired } } } } }`,

  init(SD) {
    this.SD = SD;
    this.wacht = new Map();
    this.teller = 0;
    this._bericht = (e) => {
      if (e.source !== window || e.data?.type !== 'sd-gql-antwoord') return;
      const klaar = this.wacht.get(e.data.id);
      if (klaar) { this.wacht.delete(e.data.id); klaar(e.data); }
    };
    window.addEventListener('message', this._bericht);
    // Eén klikhandler voor alle knoppen (ook als Simulise het menu opnieuw opbouwt).
    this._klik = (e) => {
      const groep = e.target.closest?.('.sim-docent-rapport');
      const profiel = e.target.closest?.('.sim-docent-rapportknop');
      if (!groep && !profiel) return;
      e.preventDefault(); e.stopPropagation();
      if (groep) this.groepsrapport(groep.dataset.groep, groep.dataset.naam);
      else this.studentrapport(decodeURIComponent(location.pathname.match(/^\/@([^/]+)/)[1]));
    };
    document.addEventListener('click', this._klik, true);
    SD.ready(() => {
      if (!this.SD) return;
      this.run();
      this._stop = SD.observe(() => this.run(), 500);
    });
  },

  destroy() {
    window.removeEventListener('message', this._bericht);
    document.removeEventListener('click', this._klik, true);
    this._stop?.();
    document.querySelectorAll('.sim-docent-rapport-li, .sim-docent-rapportknop').forEach((el) => el.remove());
    this.SD = null;
  },

  run() {
    if (!this.SD) return;
    this.groepsMenus();
    this.profielKnop();
  },

  /* ---------- Knoppen ---------- */
  groepsMenus() {
    if (location.pathname !== '/groups') return;
    for (const tr of document.querySelectorAll('#content table.table-index tbody tr')) {
      const menu = tr.querySelector('.btn-group .dropdown-menu');
      const link = tr.querySelector('a[href*="/groups/school/"]');
      const uuid = link && new URL(link.href, location.href).pathname.match(/^\/groups\/school\/([^/]+)/)?.[1];
      if (!menu || !uuid || menu.querySelector('.sim-docent-rapport')) continue;
      const naam = (tr.querySelector('td strong')?.textContent || link.textContent || '').trim();
      const scheiding = Object.assign(document.createElement('li'), { className: 'divider sim-docent-rapport-li' });
      scheiding.setAttribute('role', 'separator');
      const li = Object.assign(document.createElement('li'), { className: 'sim-docent-rapport-li' });
      const a = Object.assign(document.createElement('a'), { href: '#', className: 'sim-docent-rapport', textContent: 'Voortgangsrapporten' });
      a.dataset.groep = uuid; a.dataset.naam = naam;
      const i = Object.assign(document.createElement('i'), { className: 'fa fa-fw fa-file-alt' });
      a.prepend(i, ' ');
      li.append(a);
      menu.append(scheiding, li);
    }
  },

  profielKnop() {
    if (!/^\/@[^/]+\/?$/.test(location.pathname)) return;
    const kop = [...document.querySelectorAll('#content .s-card .panel-heading')].find((h) => /Opleidingen/.test(h.textContent));
    if (!kop || kop.querySelector('.sim-docent-rapportknop')) return;
    const knop = Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn-sm btn-default sim-docent-rapportknop', textContent: 'Voortgangsrapport' });
    knop.style.cssText = 'float:right;margin-top:4px';
    knop.prepend(Object.assign(document.createElement('i'), { className: 'fa fa-fw fa-file-alt' }), ' ');
    kop.prepend(knop);
  },

  /* ---------- GraphQL via de brug ---------- */
  gql(operationName, query, variables) {
    return new Promise((klaar) => {
      const id = `sd-${Date.now()}-${++this.teller}`;
      const t = setTimeout(() => { this.wacht.delete(id); klaar({ data: null, errors: ['Simulise gaf geen antwoord. Herlaad de pagina en probeer opnieuw.'] }); }, 20000);
      this.wacht.set(id, (a) => { clearTimeout(t); klaar(a); });
      window.postMessage({ type: 'sd-gql', id, operationName, query, variables }, location.origin);
    });
  },

  /* Wat de app zelf op deze pagina vroeg (via modules/gql.js): vraagteksten, variabelen, opleidingen. */
  appInfo() {
    return new Promise((klaar) => {
      const id = `sd-app-${++this.teller}`;
      const op = (e) => {
        if (e.source !== window || e.data?.type !== 'sd-gql-app-antwoord' || e.data.id !== id) return;
        window.removeEventListener('message', op); clearTimeout(t); klaar(e.data.app || {});
      };
      const t = setTimeout(() => { window.removeEventListener('message', op); klaar({}); }, 2000);
      window.addEventListener('message', op);
      window.postMessage({ type: 'sd-gql-app', id }, location.origin);
    });
  },

  /* Hoe de app een student aanduidt, afgekeken op een profiel en onthouden in chrome.storage.local
   * (rpAppKennis): alleen de tekst van de vragen en het soort id, geen gegevens van studenten. */
  async leerVanProfiel(gebruiker) {
    let app = await this.appInfo();
    for (let i = 0; i < 12 && !(app.opleidingen && app.vragen?.getUserEducationDiagram); i++) {
      await new Promise((r) => setTimeout(r, 500));
      app = await this.appInfo();
    }
    const soort = (v) => (v == null ? null : v === gebruiker ? 'gebruikersnaam' : app.gebruikerId && v === app.gebruikerId ? 'dashboardId' : 'anders');
    const kennis = {
      qOpleidingen: app.vragen?.dashboardTileEducationDiagram || null,
      qDiagram: app.vragen?.getUserEducationDiagram || null,
      idSoort: soort(app.variabelen?.dashboardTileEducationDiagram?.id),
      userIdSoort: soort(app.variabelen?.getUserEducationDiagram?.userId),
      qDiscover: app.vragen?.dashboardDiscoverUser || null,
      discoverIdSoort: soort(app.variabelen?.dashboardDiscoverUser?.id),
    };
    if (kennis.qOpleidingen || kennis.qDiagram) {
      const oud = (await chrome.storage.local.get({ rpAppKennis: {} })).rpAppKennis || {};
      await chrome.storage.local.set({ rpAppKennis: { ...oud, ...Object.fromEntries(Object.entries(kennis).filter(([, v]) => v)) } });
    }
    return { app, kennis };
  },

  /* Eén student: gegevens ophalen en omzetten naar het model van rapport/render.js.
   * Op het eigen profiel: precies wat de app vroeg. Elders: de geleerde vragen, anders eigen vragen. */
  async student(gebruiker, groepNaam, naamUitLijst) {
    const stappen = [];
    let opleidingen = null, gebruikerId = null, naam = naamUitLijst || null, groep = groepNaam || '';
    const kennis = (await chrome.storage.local.get({ rpAppKennis: {} })).rpAppKennis || {};
    let app = null;
    const opProfiel = decodeURIComponent((location.pathname.match(/^\/@([^/]+)\/?$/) || [])[1] || '') === gebruiker;
    if (opProfiel) {
      ({ app } = await this.leerVanProfiel(gebruiker));
      if (app.opleidingen) { opleidingen = app.opleidingen; gebruikerId = app.gebruikerId; }
      naam = naam || document.querySelector('#content .s-card table h3')?.textContent.trim() || null;
    }
    const k = { ...kennis, ...(await chrome.storage.local.get({ rpAppKennis: {} })).rpAppKennis };
    // Gebruikt de app een interne id in plaats van de gebruikersnaam? Dan die eerst opzoeken
    // (dashboardDiscoverUser met de gebruikersnaam geeft user.id), zoals de app op een profiel doet.
    const nodigId = (s) => s && s !== 'gebruikersnaam';
    if (!gebruikerId && (nodigId(k.idSoort) || nodigId(k.userIdSoort)) && k.qDiscover) {
      const r = await this.gql('dashboardDiscoverUser', k.qDiscover, { id: gebruiker });
      gebruikerId = r.data?.user?.id || null;
      if (!gebruikerId) stappen.push(`id opzoeken: ${r.errors?.[0] || 'leeg antwoord'}`);
    }
    const idVoor = (soort) => (nodigId(soort) ? gebruikerId || gebruiker : gebruiker);

    if (!opleidingen && k.qOpleidingen) {
      const r = await this.gql('dashboardTileEducationDiagram', k.qOpleidingen, { id: idVoor(k.idSoort) });
      const d = r.data?.dashboard;
      if (d?.educations) { opleidingen = d.educations; gebruikerId = d.id; } else stappen.push(`opleidingen (vraag van Simulise): ${r.errors?.[0] || 'leeg antwoord'}`);
    }
    if (!opleidingen || !naam) {
      const s = await this.gql('sdRapportStudent', this.Q_STUDENT, { id: gebruiker });
      const user = s.data?.user;
      if (user) { opleidingen = opleidingen || user.dashboardEducations; gebruikerId = gebruikerId || user.id; naam = naam || user.name; }
      else if (!opleidingen) stappen.push(`opleidingen (eigen vraag): ${s.errors?.[0] || 'leeg antwoord'}`);
    }
    if (!opleidingen) throw new Error(stappen.join('; ') || 'geen opleidingen gevonden');

    const uit = [];
    for (const ed of opleidingen) {
      const pogingen = [];
      const userIdApp = opProfiel ? app?.variabelen?.getUserEducationDiagram?.userId : null;
      if (k.qDiagram) {
        if (userIdApp) pogingen.push(['getUserEducationDiagram', k.qDiagram, userIdApp]);
        pogingen.push(['getUserEducationDiagram', k.qDiagram, idVoor(k.userIdSoort)]);
      }
      pogingen.push(['sdRapportDiagram', this.Q_DIAGRAM(true), gebruikerId], ['sdRapportDiagram', this.Q_DIAGRAM(false), gebruikerId], ['sdRapportDiagram', this.Q_DIAGRAM(false), gebruiker]);
      let diagram = null, fout = null;
      const gedaan = new Set();
      for (const [op, q, userId] of pogingen) {
        if (!userId || gedaan.has(`${q}|${userId}`)) continue;
        gedaan.add(`${q}|${userId}`);
        const d = await this.gql(op, q, { educationId: ed.id, userId });
        if (d.data?.user?.diagram) { diagram = d.data.user.diagram; break; }
        fout = d.errors?.[0] || fout;
      }
      if (!diagram) { stappen.push(`diagram ${ed.name}: ${fout || 'leeg antwoord'}`); continue; }
      uit.push(this.naarOpleiding(ed.name, diagram));
    }
    if (!uit.length) throw new Error(stappen.join('; ') || 'geen leerlijndiagram gevonden');
    groep = groep || opleidingen.flatMap((e) => e.groups || []).map((g) => g?.name).filter(Boolean)[0] || '';
    return { student: { naam: naam || gebruiker, groep }, peildatum: new Date().toISOString().slice(0, 10), opleidingen: uit };
  },

  datumUit(tekst) {
    const m = String(tekst || '').match(/(\d{2})-(\d{2})-(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  },

  naarOpleiding(naam, diagram) {
    const leerlijnen = (diagram.aspects || []).map((a) => {
      const fasen = (a.phases || []).slice().sort((x, y) => x.phase - y.phase);
      const behaald = (f) => f && f.reviewsRequired > 0 && f.reviewsAchieved >= f.reviewsRequired;
      let stap = 0;
      for (const f of fasen) { if (behaald(f)) stap = f.phase; else break; }
      const datums = (f) => (f?.reviews || []).map((r) => this.datumUit(r.title)).filter(Boolean).sort();
      const historie = fasen.filter((f) => f.phase <= stap).map((f) => ({ stap: f.phase, datum: datums(f).pop() || null })).filter((h) => h.datum);
      const huidig = fasen.find((f) => f.phase === stap), volgende = fasen.find((f) => f.phase === stap + 1);
      const niveauBoven = (huidig?.weights || []).find((w) => /boven verwachting/i.test(w.title))?.level ?? 2;
      const laatste = [...datums(huidig), ...datums(volgende)].sort().pop() || null;
      return {
        naam: a.aspect?.name || '?',
        kleur: a.aspect?.skill?.color || undefined,
        categorie: a.aspect?.skill?.name || undefined,
        stap,
        bovenVerwachting: !!huidig && huidig.currentScore != null && huidig.currentScore >= niveauBoven,
        beoordeeldNiet: !!volgende && (volgende.reviews || []).length > 0 && !behaald(volgende),
        datum: laatste,
        historie,
      };
    });
    return { naam, maxStap: diagram.phaseCount || Math.max(1, ...((diagram.aspects || []).flatMap((a) => (a.phases || []).map((f) => f.phase)))), leerlijnen };
  },

  async profiel() {
    const s = await chrome.storage.local.get({ rpProfielen: null, rpGekozen: null });
    const lijst = Array.isArray(s.rpProfielen) && s.rpProfielen.length ? s.rpProfielen : [globalThis.SD_RAPPORT_STANDAARD];
    return lijst.find((p) => p.id === s.rpGekozen) || lijst[0];
  },

  /* Opleidingen in de volgorde van het profiel (beroeps eerst, dan BAVA, dan de rest). */
  sorteer(g, profiel) {
    const plek = (o) => { const c = SDRapport.rolVan(o.naam, profiel); const i = c ? profiel.opleidingen.indexOf(c) : -1; return i < 0 ? 99 : i; };
    g.opleidingen.sort((a, b) => plek(a) - plek(b));
    return g;
  },

  /* ---------- Venster ---------- */
  venster(titel) {
    const w = window.open('', '_blank');
    if (!w) { alert('Het rapport kon niet openen. Sta pop-ups toe voor Simulise en probeer opnieuw.'); return null; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>${SDRapport.esc(titel)}</title><body style="font:15px/1.5 system-ui,sans-serif;padding:32px;color:#1e2328"><h1 style="font-size:20px">${SDRapport.esc(titel)}</h1><p id="voortgang">Gegevens ophalen uit Simulise…</p></body>`);
    w.document.close();
    return w;
  },
  voortgang(w, tekst) { const p = w?.document?.getElementById('voortgang'); if (p) p.textContent = tekst; },
  /* ---------- Rapport met werkbalk ----------
   * De gegevens blijven in het geheugen van dit script; de werkbalk tekent het rapport opnieuw bij elke
   * keuze, zonder opnieuw op te halen. Keuzes (geen studentgegevens) staan in chrome.storage.local rpOpties.
   * Zelf aangepaste teksten (gespreksadvies, gespreksvakken) blijven bewaard tijdens het wisselen. */
  async toonRapport(w, studenten, profiel, titel, fouten = []) {
    if (!w || w.closed) return;
    const groep = studenten.length > 1;
    const bewaard = (await chrome.storage.local.get({ rpOpties: {} })).rpOpties || {};
    const vandaag = new Date().toISOString().slice(0, 10);
    const opties = {
      soort: groep ? (bewaard.soortGroep || 'student') : (bewaard.soortStudent === 'groep' ? 'student' : bewaard.soortStudent || 'student'),
      peildatum: vandaag, vergelijkMet: bewaard.vergelijkMet || 'vorige',
      onderdelen: { kpis: true, diagram: true, tabel: true, normen: true, advies: true, ...(bewaard.onderdelen || {}) },
      opleidingen: null, nadruk: bewaard.nadruk ?? null, sorteer: bewaard.sorteer || 'naam', filter: 'alle',
    };
    const bewaar = () => chrome.storage.local.set({ rpOpties: { ...bewaard, [groep ? 'soortGroep' : 'soortStudent']: opties.soort, vergelijkMet: opties.vergelijkMet, onderdelen: opties.onderdelen, nadruk: opties.nadruk, sorteer: opties.sorteer } });

    w.document.open(); w.document.write(SDRapport.shell(titel, profiel)); w.document.close();
    const d = w.document, balk = d.getElementById('sd-balk'), inhoud = d.getElementById('sd-inhoud');
    const el = (tag, props = {}, kinderen = []) => { const x = Object.assign(d.createElement(tag), props); x.append(...kinderen); return x; };
    const keuze = (id, waarden, huidig, bij) => {
      const s = el('select', { id });
      for (const [v, t] of waarden) s.append(el('option', { value: v, textContent: t, selected: v === huidig }));
      s.onchange = () => { bij(s.value); bewaar(); teken(); };
      return s;
    };
    const vink = (tekst, aanUit, bij) => {
      const c = el('input', { type: 'checkbox', checked: aanUit });
      c.onchange = () => { bij(c.checked); bewaar(); teken(); };
      return el('label', {}, [c, tekst]);
    };

    // Rollen die in de gegevens voorkomen, in de volgorde van het profiel
    const rollen = [];
    for (const g of studenten) for (const o of g.opleidingen) { const c = SDRapport.rolVan(o.naam, profiel); const rol = c?.rol || o.naam.toLowerCase(); if (!rollen.some((x) => x.rol === rol)) rollen.push({ rol, titel: c?.titel || o.naam }); }
    const gekozenRollen = new Set(rollen.map((x) => x.rol));
    const nadrukNu = opties.nadruk ?? (profiel.weergave?.nadrukDoelstap !== false);

    const onderdeelVakjes = el('span', { className: 'groepje', id: 'sd-onderdelen' },
      [['kpis', 'Kerncijfers'], ['diagram', 'Diagram'], ['tabel', 'Tabel'], ['normen', 'Normen'], ['advies', 'Gespreksadvies']]
        .map(([k, t]) => vink(t, opties.onderdelen[k] !== false, (v) => { opties.onderdelen[k] = v; })));
    const groepVakjes = el('span', { className: 'groepje', id: 'sd-groepkeuzes' }, [
      'Sorteer', keuze('sd-sorteer', [['naam', 'op naam'], ['aandacht', 'aandacht eerst']], opties.sorteer, (v) => { opties.sorteer = v; }),
      vink('alleen niet op koers', false, (v) => { opties.filter = v ? 'nietOpKoers' : 'alle'; }),
    ]);
    const datum = el('input', { type: 'date', id: 'sd-peildatum', value: opties.peildatum, max: vandaag });
    datum.onchange = () => { opties.peildatum = datum.value || vandaag; teken(); };
    const afdruk = el('button', { className: 'afdruk', textContent: 'Afdrukken of opslaan als PDF' });
    afdruk.onclick = () => w.print();
    const csvKnop = el('button', { className: 'tweede', id: 'sd-csv', textContent: 'CSV voor Excel' });
    csvKnop.onclick = () => {
      const blob = new Blob(['\ufeff' + SDRapport.csv(studenten, profiel, opties)], { type: 'text/csv;charset=utf-8' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `${titel.replace(/[^\w-]+/g, '-').replace(/-+$/, '')}-${opties.peildatum}.csv` });
      d.body.append(a); a.click(); a.remove();
    };
    const info = el('span', { className: 'info', id: 'sd-info' });
    if (fouten.length) {
      const redenen = [...fouten.reduce((m, f) => m.set(f, (m.get(f) || 0) + 1), new Map())].map(([f, n]) => `${n}× ${f}`).join('\n');
      info.title = redenen;
    }
    balk.append(
      el('b', { textContent: titel }),
      el('span', { className: 'groepje' }, ['Soort', keuze('sd-soort', [['student', 'Voortgangsrapport'], ['gesprek', 'Gespreksformulier'], ['groep', 'Groepsoverzicht']], opties.soort, (v) => { opties.soort = v; })]),
      el('span', { className: 'groepje' }, ['Peildatum', datum]),
      el('span', { className: 'groepje' }, ['Vergelijk met', keuze('sd-vergelijk', [['vorige', 'vorige periode'], ['geen', 'niets'], ...(profiel.perioden || []).map((p) => [p.code, `${p.code} (${p.naam || ''})`])], opties.vergelijkMet, (v) => { opties.vergelijkMet = v; })]),
      el('span', { className: 'groepje', id: 'sd-rollen' }, rollen.map((x) => vink(x.titel, true, (v) => { v ? gekozenRollen.add(x.rol) : gekozenRollen.delete(x.rol); opties.opleidingen = [...gekozenRollen]; }))),
      onderdeelVakjes,
      el('span', { className: 'groepje' }, [vink('Doelstap groot', nadrukNu, (v) => { opties.nadruk = v; })]),
      groepVakjes, info, el('span', { className: 'ruimte' }), csvKnop, afdruk,
    );

    const bewerkt = {};
    const teken = () => {
      d.querySelectorAll('[data-bewerk]').forEach((x) => { if (x.dataset.aangepast) bewerkt[x.dataset.bewerk] = x.innerText; });
      inhoud.innerHTML = SDRapport.paginas(studenten, profiel, opties);
      d.querySelectorAll('[data-bewerk]').forEach((x) => {
        if (bewerkt[x.dataset.bewerk] != null) { x.innerText = bewerkt[x.dataset.bewerk]; x.dataset.aangepast = '1'; }
        x.addEventListener('input', () => { x.dataset.aangepast = '1'; });
      });
      const overzicht = opties.soort === 'groep';
      onderdeelVakjes.hidden = overzicht;
      groepVakjes.hidden = !groep && !overzicht;
      csvKnop.hidden = !groep && !overzicht;
      const n = d.querySelectorAll(overzicht ? 'table.overzicht tbody tr' : '.pagina .naamblok h1').length;
      info.textContent = `${groep ? `${n} van ${studenten.length} studenten` : ''}${fouten.length ? `${groep ? ' · ' : ''}${fouten.length} zonder diagram (zie tooltip)` : ''}`;
    };
    teken();
  },

  toon(w, html) {
    if (!w || w.closed) return;
    w.document.open(); w.document.write(html); w.document.close();
    const b = w.document.querySelector('.afdruk');
    if (b) b.onclick = () => w.print();
  },
  fout(w, tekst) { if (w && !w.closed) this.voortgang(w, `Het rapport kon niet worden gemaakt: ${tekst}`); },

  async studentrapport(gebruiker) {
    const w = this.venster('Voortgangsrapport');
    if (!w) return;
    try {
      const profiel = await this.profiel();
      const g = this.sorteer(await this.student(gebruiker), profiel);
      if (!g.opleidingen.length) throw new Error('geen leerlijndiagram gevonden voor deze student');
      await this.toonRapport(w, [g], profiel, `Voortgangsrapport ${g.student.naam}`);
    } catch (e) { this.fout(w, e.message || e); }
  },

  /* Studenten van een groep: eerst de studentenpagina, anders de opdrachtenpagina van de groep, waar elke
   * student een kolom is (th.rotated a[href=/@gebruiker/assignments], naam in .rotated-header-content). */
  async groepsleden(uuid) {
    const leden = await this.ledenVan(`/groups/school/${uuid}/students`, /^\/@([^/]+)\/?$/);
    if (leden.length) return leden;
    return this.ledenVan(`/groups/school/${uuid}/assignments`, /^\/@([^/]+)\/assignments\/?$/, 'th');
  },

  async ledenVan(start, patroon, binnen = null) {
    const leden = new Map();
    let url = start, n = 0;
    const gezien = new Set();
    while (url && n < 10 && !gezien.has(url)) {
      gezien.add(url); n++;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) break;
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const inhoud = doc.querySelector('#content') || doc.body;
      for (const a of inhoud.querySelectorAll(`${binnen ? `${binnen} ` : ''}a[href*="/@"]`)) {
        const m = new URL(a.getAttribute('href'), location.href).pathname.match(patroon);
        if (!m) continue;
        const naam = (a.querySelector('.rotated-header-content')?.textContent || a.textContent || a.getAttribute('data-original-title') || a.title || '').replace(/\s+/g, ' ').trim();
        if (!leden.has(m[1]) || (!leden.get(m[1]) && naam)) leden.set(m[1], naam);
      }
      const volgende = [...inhoud.querySelectorAll('ul.pagination a[rel="next"], ul.pagination li.active + li a')][0];
      url = volgende ? new URL(volgende.getAttribute('href'), location.href).pathname + new URL(volgende.getAttribute('href'), location.href).search : null;
    }
    return [...leden.entries()].map(([gebruiker, naam]) => ({ gebruiker: decodeURIComponent(gebruiker), naam }));
  },

  async groepsrapport(uuid, groepNaam) {
    const titel = `Voortgangsrapporten ${groepNaam || ''}`.trim();
    const w = this.venster(titel);
    if (!w) return;
    try {
      const profiel = await this.profiel();
      const leden = await this.groepsleden(uuid);
      if (!leden.length) throw new Error('geen studenten gevonden op de studenten- en opdrachtenpagina van deze groep');
      const klaar = [], fouten = [];
      let volgende = 0, gedaan = 0;
      const werker = async () => {
        while (volgende < leden.length) {
          const lid = leden[volgende++];
          try {
            const g = this.sorteer(await this.student(lid.gebruiker, groepNaam, lid.naam), profiel);
            if (g.opleidingen.length) klaar.push(g); else fouten.push('geen diagram');
          } catch (e) { fouten.push(String(e.message || e)); }
          this.voortgang(w, `Gegevens ophalen uit Simulise… ${++gedaan} van ${leden.length} studenten`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(this.MAX_TEGELIJK, leden.length) }, werker));
      if (!klaar.length) {
        const kennis = (await chrome.storage.local.get({ rpAppKennis: {} })).rpAppKennis || {};
        throw new Error(`voor geen enkele student een leerlijndiagram gevonden (${fouten[0] || 'onbekend'}).`
          + (kennis.qDiagram ? '' : ' Tip: open eerst één keer het profiel van een student met het diagram en maak daar een rapport; daarna weet de extensie hoe Simulise de gegevens ophaalt.'));
      }
      klaar.sort((a, b) => a.student.naam.localeCompare(b.student.naam, 'nl'));
      await this.toonRapport(w, klaar, profiel, titel, fouten);
    } catch (e) { this.fout(w, e.message || e); }
  },
});
