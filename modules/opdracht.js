/* Snelle opdracht: een opdracht aanmaken op één scherm in plaats van de vier pagina's van Simulise.
 *
 *   Waar      Knop "Snelle opdracht" naast "Nieuwe opdracht" op /school/assignments, het adres #snel en Cmd+K.
 *   Indeling  Zoals Opdrachten in Microsoft Teams: bovenin de knoppen (Annuleren, Aanmaken) en in één zin wat er wordt
 *             aangemaakt; links de inhoud (titel, instructies, links, rubrics, inleverstukken); rechts een smalle kolom met
 *             alle kleine keuzes (toewijzen aan, start en deadline, beoordelaars, reflectie, status, labels, overig).
 *             Rubrics kies je in een popup met een zoekveld.
 *   Opslaan   Dezelfde vijf stappen als Simulise, na elkaar, met je eigen sessie (SD.gql):
 *               1 assignmentCreate            titel, tekstblok, links, labels, auteurs, feedbackvragen, doorlooptijd
 *               2 assignmentBadgesUpdate      rubrics (met optioneel) en de reflectie-instellingen
 *               3 assignmentDeliverablesUpdate  inleverstukken met hun instellingen (alleen als je er een toevoegde)
 *               4 assignmentConnectionCreate  klassen, start, deadline, beoordelaars en de schakelaars van die stap
 *               5 assignmentWizardFinish      afronden en (als je dat koos) actief maken
 *             De opbouw is gelezen in de scripts van Simulise (november 2026, zie CLAUDE.md). Gaat een stap mis, dan stopt
 *             het formulier, toont het wat Simulise meldde en biedt het aan om het opnieuw te proberen vanaf die stap of
 *             verder te gaan in Simulise zelf. De opdracht die er dan al is, staat nog niet actief.
 *   Bewaard   chrome.storage.sync qaStandaard: je vaste keuzes (deadline, schakelaars, reflectie, inleverstukken, labels),
 *             geen titels, klassen of namen.
 *
 * Niet in dit formulier: afbeelding, bestanden en video's als bijlage, een paginasjabloon als inleverstuk, virtuele
 * groepen, losse studenten en meer dan één groep beoordelaars. Daarvoor blijft het scherm van Simulise.
 * De opmaak staat in theme.css (.sd-opdracht).
 */
SD.register({
  id: 'opdracht',
  LIJST: /^\/school\/assignments\/?$/,
  STATUS: 'fragment mutationFields on MutationPayload { status { success errors { name messages } } }',
  Q_CONTEXT: `query getContextForAssignmentEditor { viewer { ...assignmentEditorContextViewerFieldsFragment __typename } topics: schoolTopicsForFeature(feature: ASSIGNMENTS, method: FORMS) { ...assignmentEditorContexttopicsFieldsFragment __typename } }
    fragment assignmentEditorContextViewerFieldsFragment on User { id schoolSections { id ...autocompleteWithValueFieldsFragment __typename } canManageCatalogueTenants ...autocompleteWithValueFieldsFragment __typename }
    fragment assignmentEditorContexttopicsFieldsFragment on SchoolTopic { id name type topics { id name __typename } required defaultValueForForms { id ...autocompleteWithValueFieldsFragment __typename } canCreateLabelsInline __typename }
    fragment autocompleteWithValueFieldsFragment on Autocompletable { autocompletion { id text icon value avatar prefix caption __typename } __typename }`,
  Q_SOORTEN: 'query assignmentSelectableDeliverableTypes { deliverableTypes: assignmentSelectableDeliverableTypes { id type name defaults { minimum maximum multiple plagiarism isOptional unfreezePageAfterReview } fileTypes { key type icon name } optionName isTemplate eligibleForPlagiarism } }',
  Q_RUBRICS: 'query sdOpdrachtRubrics($page: Int!, $perPage: Int!, $filters: [String!]!, $orderBy: BadgesOrder) { badges(page: $page, first: $perPage, filters: $filters, orderBy: $orderBy) { data { id name } paginatorInfo { hasMorePages } } }',
  Q_LABELS: 'query sdOpdrachtLabels($page: Int, $query: String, $topic: ID!, $feature: SchoolTopicEnabledField) { items: schoolTopicFilteredLabels(page: $page, query: $query, topic: $topic, feature: $feature) { data { autocompletion { id text value } } } }',

  init(SD) {
    this.SD = SD;
    this._klik = (e) => {
      const el = e.target.closest?.('[data-sd-opdracht]');
      if (!el) return;
      e.preventDefault();
      this.actie(el.dataset.sdOpdracht, el);
    };
    // Alleen 'input': elk veld meldt daarmee elke wijziging. 'change' komt bij tekst- en getalvelden pas bij het verlaten van het veld,
    // dus midden in een klik op een knop; opnieuw tekenen op dat moment laat de klik verloren gaan.
    this._invoer = (e) => { if (e.target.closest?.('.sd-opdracht')) this.lees(e.target); };
    document.addEventListener('click', this._klik, true);
    document.addEventListener('input', this._invoer, true);
    SD.addCommand('opdracht', 'Snelle opdracht: nieuwe opdracht op één scherm', () => this.open());
    SD.ready(() => {
      if (!this.SD) return;
      this.knop();
      this._stop = SD.observe(() => this.knop(), 500);
      if (location.hash === '#snel' && this.LIJST.test(location.pathname)) this.open();
    });
  },

  destroy(SD) {
    this.SD = null;
    document.removeEventListener('click', this._klik, true);
    document.removeEventListener('input', this._invoer, true);
    SD.removeCommand('opdracht');
    this._stop?.();
    this.sluit();
    document.querySelectorAll('.sd-opdracht-knop').forEach((el) => el.remove());
    this.SD = null;
  },

  esc: (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),

  /* Knop naast "Nieuwe opdracht" in de kop van de opdrachtenlijst. */
  knop() {
    if (!this.SD || !this.LIJST.test(location.pathname)) return;
    const nieuw = document.querySelector('#content header a[href$="/school/assignment/create"]');
    if (!nieuw || nieuw.parentElement.querySelector('.sd-opdracht-knop')) return;
    const a = Object.assign(document.createElement('a'), { href: '/school/assignments#snel', className: 'btn btn-sm btn-success sd-opdracht-knop', textContent: ' Snelle opdracht' });
    a.dataset.sdOpdracht = 'open';
    a.title = 'Een opdracht aanmaken op één scherm (Simulise Docent)';
    a.prepend(Object.assign(document.createElement('i'), { className: 'fa fa-fw fa-bolt' }));
    nieuw.after(' ', a);
  },

  /* ---------- Openen en sluiten ---------- */
  async open() {
    if (!this.LIJST.test(location.pathname)) { location.href = '/school/assignments#snel'; return; }
    if (document.querySelector('.sd-opdracht')) return;
    const plek = document.querySelector('#scrollable-page-wrapper') || document.querySelector('#content');
    if (!plek) return;
    this._verborgen = [...plek.children].filter((c) => c.style.display !== 'none');
    for (const c of this._verborgen) { c.dataset.sdoDisplay = c.style.display; c.style.display = 'none'; }
    const root = Object.assign(document.createElement('div'), { className: 'sd-opdracht' });
    root.innerHTML = '<p class="sd-o-laden">Gegevens ophalen uit Simulise…</p>';
    plek.prepend(root);
    plek.scrollTop = 0;
    this.root = root;
    const { qaStandaard } = await chrome.storage.sync.get({ qaStandaard: {} });
    const std = qaStandaard || {};
    this.s = { titel: '', tekst: '', links: [], klassen: [], start: '', deadline: std.deadline || 'geen', deadlineDatum: '', zacht: !!std.zacht, werkgroep: !!std.werkgroep,
      beoordelaars: [], minBeoordelingen: 1, volgorde: false, zichtbaar: !!std.zichtbaar,
      rubrics: [], reflectieOptioneel: !!std.reflectieOptioneel, reflectieAnder: ['NONE', 'OPTIONAL', 'REQUIRED'].includes(std.reflectieAnder) ? std.reflectieAnder : 'NONE', reflectieMin: 1, reflectieMax: '', optMin: 0, optMax: 0,
      stukken: Array.isArray(std.stukken) ? std.stukken.map((x) => ({ ...x })) : [], labels: {}, actief: std.actief !== false, feedback: Number(std.feedback) || 0, duur: Number(std.duur) || 0, auteurs: [], labelOpen: null };
    this.voortgang = null; this.opdrachtId = null; this.klaarStap = 0; this.zoek = {}; this.pop = null;
    try { await this.laad(std); } catch (e) { root.innerHTML = `<p class="sd-o-fout">Het formulier kon niet worden gevuld: ${this.esc(e.message || e)}</p><p><a href="#" data-sd-opdracht="sluit">Terug naar de lijst</a> of <a href="/school/assignment/create">maak de opdracht in Simulise</a>.</p>`; return; }
    this.teken();
  },

  sluit() {
    document.querySelectorAll('.sd-opdracht').forEach((el) => el.remove());
    for (const c of this._verborgen || []) { c.style.display = c.dataset.sdoDisplay || ''; delete c.dataset.sdoDisplay; }
    this._verborgen = null; this.root = null;
    if (location.hash === '#snel') history.replaceState(null, '', location.pathname + location.search);
  },

  /* Wat het formulier nodig heeft: jij als auteur en beoordelaar, de labels van de school, de soorten inleverstukken,
   * je klassen en de rubrics. Alleen lezen. */
  async laad(std) {
    const SD = this.SD;
    const [ctx, soorten, groepen] = await Promise.all([
      SD.gql('getContextForAssignmentEditor', this.Q_CONTEXT, {}),
      SD.gql('assignmentSelectableDeliverableTypes', this.Q_SOORTEN, {}),
      this.groepen(''),
      SD.klassen.laad().catch(() => []),
    ]);
    const viewer = ctx.data?.viewer?.autocompletion;
    if (!viewer?.value || !Array.isArray(ctx.data?.topics)) throw new Error(ctx.errors?.[0] || 'Simulise gaf geen gegevens voor het formulier');
    this.ik = { id: String(viewer.value), naam: viewer.text || 'Jij' };
    this.s.beoordelaars = [{ ...this.ik }]; this.s.auteurs = [{ ...this.ik }];
    this.topics = ctx.data.topics.map((t) => ({ id: t.id, naam: t.name, soort: t.type, verplicht: !!t.required,
      opties: (t.defaultValueForForms || []).map((l) => ({ id: l.id, naam: l.autocompletion?.text || '' })) }));
    for (const t of this.topics) this.s.labels[t.id] = t.opties.length ? t.opties.map((o) => o.id) : (std.labels?.[t.naam] || []).map((o) => o.id);
    for (const t of this.topics) for (const o of std.labels?.[t.naam] || []) if (!t.opties.some((x) => x.id === o.id)) t.opties.push({ id: o.id, naam: o.naam });
    this.soorten = (soorten.data?.deliverableTypes || []).filter((t) => !t.isTemplate);
    this.s.stukken = this.s.stukken.filter((x) => this.soorten.some((t) => t.type === x.type)).map((x) => ({ ...this.nieuwStuk(x.type), ...x, open: false }));
    const mijn = new Set(SD.klassen.lijst.map((k) => k.naam.toLowerCase()));
    this.alleGroepen = groepen;
    this.mijnGroepen = groepen.filter((g) => mijn.has(g.naam.toLowerCase()));
    this.rubrics = null; // pas ophalen als de popup opent
  },

  /* Een nieuw inleverstuk met de standaardinstellingen van Simulise voor die soort. */
  nieuwStuk(type) {
    const t = this.soorten.find((y) => y.type === type) || this.soorten[0] || { defaults: {}, fileTypes: [] }, d = t.defaults || {};
    return { type: t.type || '', titel: '', optioneel: !!d.isOptional, meerdere: !!d.multiple, min: d.minimum ?? 1, max: d.maximum ?? 1, plagiaat: !!d.plagiarism, ontgrendel: !!d.unfreezePageAfterReview,
      minWoorden: '', maxWoorden: '', soorten: (t.fileTypes || []).map((f) => f.type), open: false };
  },

  /* Groepen waar een opdracht aan gekoppeld kan worden (het zoekveld van Simulise in de stap Studenten). */
  async groepen(zoek) {
    const lijst = await this.rest(`/api/autocomplete/assignment/plan/connects?query=${encodeURIComponent(zoek)}&page=1`);
    return lijst.filter((g) => /^group:/.test(String(g.value))).map((g) => ({ id: String(g.value), naam: String(g.search || g.text || '').replace(/^Groep:\s*/, '').trim(), pad: String(g.caption || '') }));
  },
  async rest(adres) {
    const r = await fetch(adres, { credentials: 'same-origin', headers: { accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' } });
    const lijst = r.ok ? await r.json() : [];
    return Array.isArray(lijst) ? lijst : [];
  },
  /* Docenten zoeken (beoordelaars en auteurs), zoals de zoekvelden van Simulise. */
  async personen(soort, zoek) {
    const lijst = await this.rest(`/api/autocomplete/${soort === 'auteurs' ? 'assignmentauthors' : 'teachers'}?query=${encodeURIComponent(zoek)}&page=1`);
    return lijst.filter((u) => u.value != null).map((u) => ({ id: String(u.value), naam: String(u.text || u.search || '').trim() }));
  },

  async laadRubrics() {
    if (this.rubrics || this._rubricsBezig) return;
    this._rubricsBezig = true;
    const alle = [];
    for (let page = 1; page <= 6; page++) {
      const r = await this.SD.gql('sdOpdrachtRubrics', this.Q_RUBRICS, { page, perPage: 100, filters: ['status:activated'], orderBy: { field: 'NAME', direction: 'ASC' } });
      const b = r.data?.badges;
      if (!b) break;
      alle.push(...(b.data || []).map((x) => ({ id: x.id, naam: x.name })));
      if (!b.paginatorInfo?.hasMorePages) break;
    }
    this.rubrics = alle; this._rubricsBezig = false;
    this.tekenPopup();
  },

  async laadLabels(topic) {
    if (topic.geladen) return;
    topic.geladen = true;
    const r = await this.SD.gql('sdOpdrachtLabels', this.Q_LABELS, { page: 1, query: '', topic: topic.id, feature: 'ASSIGNMENTS' });
    for (const l of r.data?.items?.data || []) { const a = l.autocompletion; if (a?.value && !topic.opties.some((o) => o.id === a.value)) topic.opties.push({ id: String(a.value), naam: a.text || '' }); }
    this.teken();
  },

  /* ---------- Datums ---------- */
  /* Zoals Simulise ze stuurt: 2026-11-19T00:00:00+0100. */
  stempel(d) {
    const p = (n) => String(n).padStart(2, '0');
    const o = -d.getTimezoneOffset(), teken = o >= 0 ? '+' : '-';
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${teken}${p(Math.floor(Math.abs(o) / 60))}${p(Math.abs(o) % 60)}`;
  },
  startDatum() { const d = this.s.start ? new Date(`${this.s.start}T00:00:00`) : new Date(); d.setHours(0, 0, 0, 0); return d; },
  deadlineDatum() {
    const s = this.s, basis = this.startDatum();
    const eind = (d) => { d.setHours(23, 59, 0, 0); return d; };
    if (s.deadline === 'week') { const d = new Date(basis); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return eind(d); } // vrijdag van die week
    if (s.deadline === 'plus1' || s.deadline === 'plus2') { const d = new Date(basis); d.setDate(d.getDate() + (s.deadline === 'plus1' ? 7 : 14)); return eind(d); }
    if (s.deadline === 'datum' && s.deadlineDatum) return eind(new Date(`${s.deadlineDatum}T00:00:00`));
    return null;
  },
  leesbaar(d) { return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); },

  /* ---------- Tekenen ---------- */
  teken() {
    if (!this.root) return;
    const s = this.s, esc = this.esc;
    const actief = document.activeElement?.closest?.('.sd-opdracht') && !document.activeElement.closest('dialog') ? document.activeElement : null;
    const focus = actief ? { veld: actief.dataset.veld, nr: actief.dataset.nr, zoek: actief.dataset.zoek, plek: actief.selectionStart } : null;
    const chip = (actie, id, naam, aan, extra = '') => `<button type="button" class="sd-o-chip${aan ? ' aan' : ''}" data-sd-opdracht="${actie}" data-id="${esc(id)}" aria-pressed="${aan}"${extra}>${esc(naam)}</button>`;
    const vink = (veld, tekst, aan, nr = null) => `<label class="sd-o-vink"><input type="checkbox" data-veld="${veld}"${nr != null ? ` data-nr="${nr}"` : ''}${aan ? ' checked' : ''}> ${esc(tekst)}</label>`;
    const getal = (veld, waarde, label, nr = null, min = 0) => `<label class="sd-o-getal">${esc(label)} <input type="number" min="${min}" data-veld="${veld}"${nr != null ? ` data-nr="${nr}"` : ''} value="${esc(waarde)}"></label>`;
    const klassen = [...this.mijnGroepen, ...this.alleGroepen.filter((g) => s.klassen.includes(g.id) && !this.mijnGroepen.some((m) => m.id === g.id))];
    const dl = [['geen', 'Geen'], ['week', 'Eind van de week'], ['plus1', '+1 week'], ['plus2', '+2 weken'], ['datum', 'Datum']];
    const optioneleRubrics = s.rubrics.filter((r) => r.optioneel).length;
    const personen = (soort) => `<div class="sd-o-chips">${s[soort].map((u) => chip('persoonWeg', `${soort}|${u.id}`, `${u.naam} ×`, true)).join('')}</div>
      <input type="search" data-zoek="${soort}" value="${esc(this.zoek[soort] || '')}" placeholder="Docent zoeken…" aria-label="Docent zoeken"><div class="sd-o-chips" data-lijst="${soort}"></div>`;
    const topicBlok = (t) => {
      const gekozen = t.opties.filter((o) => (s.labels[t.id] || []).includes(o.id)), open = s.labelOpen === t.id;
      return `<div class="sd-o-veld"><label>${esc(t.naam)}${t.verplicht ? ' <b>*</b>' : ''}</label><div class="sd-o-chips">${(open ? t.opties : gekozen).map((o) => chip('label', `${t.id}|${o.id}`, o.naam, (s.labels[t.id] || []).includes(o.id))).join('')}
        <button type="button" class="sd-o-link" data-sd-opdracht="labels" data-id="${esc(t.id)}" aria-expanded="${open}">${open ? 'Klaar' : gekozen.length ? 'Wijzig' : 'Kies'}</button></div>${open && t.geladen && !t.opties.length ? '<small>Geen keuzes voor dit label.</small>' : ''}</div>`;
    };
    const stuk = (x, i) => {
      const t = this.soorten.find((y) => y.type === x.type) || {}, item = x.type === 'simulise.portfolio_item';
      return `<div class="sd-o-kaart"><div class="sd-o-rij"><select data-veld="stuk.type" data-nr="${i}" aria-label="Soort inleverstuk">${this.soorten.map((y) => `<option value="${esc(y.type)}"${y.type === x.type ? ' selected' : ''}>${esc(y.name)}</option>`).join('')}</select>
          <input type="text" data-veld="stuk.titel" data-nr="${i}" value="${esc(x.titel)}" placeholder="Naam, bijvoorbeeld Verslag" aria-label="Naam van het inleverstuk">
          <button type="button" class="sd-o-link" data-sd-opdracht="stukOpen" data-id="${i}" aria-expanded="${!!x.open}">Instellingen</button><button type="button" class="sd-o-weg" data-sd-opdracht="stukWeg" data-id="${i}" aria-label="Inleverstuk verwijderen">×</button></div>
        ${x.open ? `<div class="sd-o-inst">${vink('stuk.optioneel', 'Optioneel', x.optioneel, i)}
          ${item ? `${vink('stuk.meerdere', 'Meerdere items toestaan', x.meerdere, i)}${x.meerdere ? `${getal('stuk.min', x.min, 'Minimaal', i, 1)}${getal('stuk.max', x.max, 'Maximaal', i, 1)}` : ''}
            ${t.eligibleForPlagiarism === false ? '' : vink('stuk.plagiaat', 'Plagiaatcontrole', x.plagiaat, i)}${getal('stuk.minWoorden', x.minWoorden, 'Minimaal aantal woorden', i)}${getal('stuk.maxWoorden', x.maxWoorden, 'Maximaal aantal woorden', i)}
            ${(t.fileTypes || []).length ? `<div class="sd-o-veld"><label>Toegestane soorten</label><div class="sd-o-chips">${t.fileTypes.map((f) => chip('stukSoort', `${i}|${f.type}`, f.name || f.key || f.type, x.soorten.includes(f.type))).join('')}</div></div>` : ''}`
    : vink('stuk.ontgrendel', 'Pagina weer bewerkbaar na de beoordeling', x.ontgrendel, i)}</div>` : ''}</div>`;
    };
    this.root.innerHTML = `<header class="sd-o-balk"><div class="sd-o-titel"><a href="#" class="sd-o-terug" data-sd-opdracht="sluit">Opdrachten</a><h1>Nieuwe opdracht</h1></div><div class="sd-o-acties" data-acties></div></header>
      <div data-controle></div>
      <div class="sd-o-raster"><div class="sd-o-form">
        <section class="sd-o-blok">
          <div class="sd-o-veld"><label for="sdo-titel">Titel <b>*</b></label><input id="sdo-titel" type="text" data-veld="titel" value="${esc(s.titel)}" placeholder="Voer een titel in" autocomplete="off"></div>
          <div class="sd-o-veld"><label for="sdo-tekst">Instructies</label><textarea id="sdo-tekst" data-veld="tekst" rows="7" placeholder="Wat moet de student doen? Een lege regel begint een nieuwe alinea.">${esc(s.tekst)}</textarea></div>
          <div class="sd-o-veld"><label>Links</label>${s.links.map((l, i) => `<div class="sd-o-rij"><input type="text" data-veld="link.titel" data-nr="${i}" value="${esc(l.titel)}" placeholder="Naam" aria-label="Naam van de link"><input type="url" data-veld="link.url" data-nr="${i}" value="${esc(l.url)}" placeholder="https://…" aria-label="Adres van de link"><button type="button" class="sd-o-weg" data-sd-opdracht="linkWeg" data-id="${i}" aria-label="Link verwijderen">×</button></div>`).join('')}
            <button type="button" class="sd-o-link" data-sd-opdracht="linkErbij">+ Link toevoegen</button></div></section>
        <section class="sd-o-blok"><h2>Rubrics</h2>
          ${s.rubrics.map((r, i) => `<div class="sd-o-rij sd-o-rubric"><span class="sd-o-naam">${esc(r.naam)}</span>${vink('rubric.optioneel', 'Optioneel', r.optioneel, i)}<button type="button" class="sd-o-weg" data-sd-opdracht="rubricWeg" data-id="${esc(r.id)}" aria-label="Rubric verwijderen">×</button></div>`).join('')}
          ${optioneleRubrics ? `<div class="sd-o-inst"><span class="sd-o-stil">Van de optionele rubrics kiest de student er</span>${getal('optMin', s.optMin, 'minimaal')}${getal('optMax', s.optMax, 'maximaal')}</div>` : ''}
          <button type="button" class="sd-o-knop sd-o-rubricknop" data-sd-opdracht="popup">${s.rubrics.length ? 'Rubrics wijzigen' : 'Rubric toevoegen'}</button></section>
        <section class="sd-o-blok"><h2>Inleverstukken</h2>${s.stukken.map(stuk).join('')}
          <button type="button" class="sd-o-link" data-sd-opdracht="stukErbij">+ Inleverstuk toevoegen</button></section>
      </div><aside class="sd-o-zij">
        <section class="sd-o-blok"><h2>Toewijzen aan <b>*</b></h2><div class="sd-o-chips">${klassen.map((g) => chip('klas', g.id, g.naam, s.klassen.includes(g.id), ` title="${esc(g.pad)}"`)).join('') || '<span class="sd-o-stil">Geen eigen klassen gevonden.</span>'}</div>
          <input type="search" data-zoek="groepen" value="${esc(this.zoek.groepen || '')}" placeholder="Andere groep zoeken…" aria-label="Andere groep zoeken"><div class="sd-o-chips" data-lijst="groepen"></div>
          ${vink('werkgroep', 'Inleveren als werkgroep', s.werkgroep)}</section>
        <section class="sd-o-blok"><h2>Planning</h2>
          <div class="sd-o-veld"><label for="sdo-start">Start <b>*</b></label><input id="sdo-start" type="date" data-veld="start" value="${esc(s.start)}">${s.start ? '' : '<small>Leeg = vandaag</small>'}</div>
          <div class="sd-o-veld"><label>Deadline</label><div class="sd-o-chips">${dl.map(([k, n]) => chip('deadline', k, n, s.deadline === k)).join('')}</div>${s.deadline === 'datum' ? `<input type="date" data-veld="deadlineDatum" value="${esc(s.deadlineDatum)}" aria-label="Datum van de deadline">` : ''}
            ${s.deadline === 'geen' ? '' : vink('zacht', 'Inleveren na deadline toegestaan', s.zacht)}</div></section>
        <section class="sd-o-blok"><h2>Beoordelaars</h2>${personen('beoordelaars')}
          ${s.beoordelaars.length > 1 ? getal('minBeoordelingen', s.minBeoordelingen, 'Minimaal aantal beoordelingen', null, 1) : ''}
          ${vink('zichtbaar', 'Beoordelingen zichtbaar voor overige beoordelaars', s.zichtbaar)}</section>
        <section class="sd-o-blok"><h2>Reflectie</h2>
          <div class="sd-o-veld"><label for="sdo-refl">Reflectie door student</label><select id="sdo-refl" data-veld="reflectieOptioneel"><option value="nee"${s.reflectieOptioneel ? '' : ' selected'}>Direct bij inleveren</option><option value="ja"${s.reflectieOptioneel ? ' selected' : ''}>Optioneel na het inleveren</option></select></div>
          <div class="sd-o-veld"><label for="sdo-refl2">Reflectie-uitnodiging</label><select id="sdo-refl2" data-veld="reflectieAnder">${[['NONE', 'Geen'], ['OPTIONAL', 'Optioneel'], ['REQUIRED', 'Verplicht']].map(([k, n]) => `<option value="${k}"${s.reflectieAnder === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
            ${s.reflectieAnder === 'REQUIRED' ? `<div class="sd-o-inst">${getal('reflectieMin', s.reflectieMin, 'Minimaal', null, 1)}${getal('reflectieMax', s.reflectieMax, 'Maximaal', null, 1)}</div>` : ''}</div></section>
        <section class="sd-o-blok"><h2>Labels</h2>${this.topics.map(topicBlok).join('')}</section>
        <section class="sd-o-blok"><h2>Overig</h2>${vink('actief', 'Direct actief maken', s.actief)}
          <div class="sd-o-inst">${getal('feedback', s.feedback, 'Feedbackvragen')}${getal('duur', s.duur, 'Doorlooptijd')}</div>
          <div class="sd-o-veld"><label>Auteurs</label>${personen('auteurs')}</div></section>
      </aside></div><dialog class="sd-o-popup" data-popup></dialog>`;
    this.tekenLijsten();
    this.tekenControle();
    const dialoog = this.root.querySelector('[data-popup]');
    dialoog.addEventListener('close', () => { if (this.pop && dialoog.isConnected) { this.pop = null; } }); // Esc sluit zonder te kiezen
    if (this.pop) { dialoog.showModal?.(); this.tekenPopup(true); }
    if (focus && (focus.veld || focus.zoek)) { const el = this.root.querySelector(focus.zoek ? `[data-zoek="${focus.zoek}"]` : `[data-veld="${focus.veld}"]${focus.nr != null ? `[data-nr="${focus.nr}"]` : ''}`); if (el) { el.focus(); try { el.setSelectionRange(focus.plek, focus.plek); } catch { /* geen tekstveld */ } } }
  },

  /* Zoekresultaten (andere groepen, docenten): los van de rest, zodat typen niet hapert. */
  tekenLijsten() {
    if (!this.root) return;
    const s = this.s, esc = this.esc, r = this.resultaten || {};
    const gr = this.root.querySelector('[data-lijst="groepen"]');
    if (gr) gr.innerHTML = (r.groepen || []).filter((g) => !s.klassen.includes(g.id) && !this.mijnGroepen.some((m) => m.id === g.id)).slice(0, 10).map((g) => `<button type="button" class="sd-o-chip" data-sd-opdracht="klas" data-id="${esc(g.id)}" title="${esc(g.pad)}">${esc(g.naam)}</button>`).join('');
    for (const soort of ['beoordelaars', 'auteurs']) {
      const el = this.root.querySelector(`[data-lijst="${soort}"]`);
      if (el) el.innerHTML = (r[soort] || []).filter((u) => !s[soort].some((x) => x.id === u.id)).slice(0, 8).map((u) => `<button type="button" class="sd-o-chip" data-sd-opdracht="persoon" data-id="${esc(`${soort}|${u.id}`)}">${esc(u.naam)}</button>`).join('');
    }
  },

  /* De popup om rubrics te kiezen: zoekveld en een lijst met vinkjes. */
  tekenPopup(heel = false) {
    const d = this.root?.querySelector('[data-popup]'), pop = this.pop;
    if (!d || !pop) return;
    const esc = this.esc, z = pop.zoek.trim().toLowerCase();
    const lijst = !this.rubrics ? '<p class="sd-o-stil">Rubrics ophalen…</p>'
      : (this.rubrics.filter((r) => !z || r.naam.toLowerCase().includes(z)).slice(0, 200).map((r) => `<label class="sd-o-vink"><input type="checkbox" data-pop="${esc(r.id)}"${pop.gekozen.has(r.id) ? ' checked' : ''}> ${esc(r.naam)}</label>`).join('') || '<p class="sd-o-stil">Geen rubric met die naam.</p>');
    if (heel || !d.querySelector('[data-poplijst]')) {
      d.innerHTML = `<h2>Rubrics kiezen</h2><input type="search" data-pop-zoek value="${esc(pop.zoek)}" placeholder="Zoeken op naam…" aria-label="Rubric zoeken"><div class="sd-o-poplijst" data-poplijst>${lijst}</div>
        <div class="sd-o-knoppen"><span class="sd-o-stil" data-poptel></span><button type="button" class="sd-o-knop" data-sd-opdracht="popupDicht">Annuleren</button><button type="button" class="sd-o-hoofd" data-sd-opdracht="popupKlaar">Toevoegen</button></div>`;
      d.querySelector('[data-pop-zoek]').focus();
    } else d.querySelector('[data-poplijst]').innerHTML = lijst;
    d.querySelector('[data-poptel]').textContent = `${pop.gekozen.size} gekozen`;
  },

  /* Wat ontbreekt er nog om te kunnen opslaan. */
  ontbreekt() {
    const s = this.s, mist = [];
    if (!s.titel.trim()) mist.push('een titel');
    if (!s.klassen.length) mist.push('minstens één klas');
    for (const t of this.topics) if (t.verplicht && !(s.labels[t.id] || []).length) mist.push(t.naam.toLowerCase());
    if (s.links.some((l) => l.url.trim() && !/^https?:\/\/\S+$/i.test(l.url.trim()))) mist.push('een geldig adres bij elke link (https://…)');
    if (s.deadline === 'datum' && !s.deadlineDatum) mist.push('de datum van de deadline');
    const dl = this.deadlineDatum();
    if (dl && dl < this.startDatum()) mist.push('een deadline na de start');
    if (!s.beoordelaars.length) mist.push('minstens één beoordelaar');
    if (!s.auteurs.length) mist.push('minstens één auteur');
    if (s.stukken.some((x) => x.titel.trim() && x.meerdere && Number(x.min) > Number(x.max))) mist.push('bij een inleverstuk een maximum dat niet onder het minimum ligt');
    return mist;
  },

  /* Bovenin: de knoppen, in één zin wat er wordt aangemaakt, en tijdens het opslaan de stappen. */
  tekenControle() {
    const el = this.root?.querySelector('[data-controle]'), acties = this.root?.querySelector('[data-acties]');
    if (!el || !acties) return;
    const s = this.s, esc = this.esc, mist = this.ontbreekt(), dl = this.deadlineDatum(), v = this.voortgang;
    const naam = (id) => this.alleGroepen.concat(this.resultaten?.groepen || []).find((g) => g.id === id)?.naam || 'groep';
    const links = s.links.filter((l) => l.url.trim()).length, stukken = s.stukken.filter((x) => x.titel.trim());
    const delen = [`voor ${s.klassen.length ? s.klassen.map(naam).join(', ') : 'nog geen klas'}`, `start ${this.leesbaar(this.startDatum())}`, dl ? `deadline ${this.leesbaar(dl)} om 23:59` : 'geen deadline',
      s.rubrics.length ? `${s.rubrics.length} ${s.rubrics.length === 1 ? 'rubric' : 'rubrics'}` : 'geen rubric', stukken.length ? `inleveren: ${stukken.map((x) => x.titel.trim()).join(', ')}` : 'geen inleverstuk',
      ...(links ? [`${links} ${links === 1 ? 'link' : 'links'}`] : []), s.actief ? 'meteen actief' : 'nog niet actief'];
    const STAPPEN = ['Opdracht aanmaken', 'Rubrics en reflectie', 'Inleverstukken', 'Klassen koppelen', s.actief ? 'Afronden en actief maken' : 'Afronden'];
    acties.innerHTML = v?.klaar ? `<button type="button" class="sd-o-knop" data-sd-opdracht="nogeen">Nog een opdracht</button><a class="sd-o-hoofd" href="/school/assignment/${esc(this.opdrachtId)}/view">Bekijk de opdracht</a>`
      : v?.fout ? `<button type="button" class="sd-o-knop" data-sd-opdracht="aanpassen">Formulier aanpassen</button>${this.opdrachtId ? `<a class="sd-o-knop" data-vervolg href="${esc(this.vervolg(v.stap))}">Verder in Simulise</a>` : ''}<button type="button" class="sd-o-hoofd" data-sd-opdracht="opslaan">Opnieuw vanaf stap ${v.stap}</button>`
        : v ? '<span class="sd-o-stil" role="status">Bezig met opslaan…</span>'
          : `${mist.length ? `<span class="sd-o-stil sd-o-nodig">Nog nodig: ${esc(mist.join('; '))}</span>` : ''}<button type="button" class="sd-o-knop" data-sd-opdracht="sluit">Annuleren</button><button type="button" class="sd-o-hoofd" data-sd-opdracht="opslaan"${mist.length ? ' disabled' : ''}>Aanmaken</button>`;
    el.innerHTML = `<p class="sd-o-zin"><b>${esc(s.titel.trim() || 'Nog geen titel')}</b> ${esc(delen.join(' · '))}</p>
      ${v ? `<ol class="sd-o-stappen">${STAPPEN.map((t, i) => { const st = v.overgeslagen.includes(i + 1) ? 'over' : i + 1 < v.stap || v.klaar ? 'klaar' : i + 1 === v.stap ? (v.fout ? 'fout' : 'bezig') : 'wacht'; return `<li class="${st}">${esc(t)}${st === 'over' ? ' (niet nodig)' : ''}</li>`; }).join('')}</ol>` : ''}
      ${v?.fout ? `<p class="sd-o-fout" role="alert">Stap ${v.stap} lukte niet: ${esc(v.fout)}</p><p class="sd-o-uitleg">${this.opdrachtId ? 'De opdracht bestaat al in Simulise, maar is nog niet af en niet actief.' : 'Er is nog niets aangemaakt.'}${this.klaarStap >= 1 ? ' Wat al is opgeslagen, verandert niet meer als je het formulier aanpast; dat geldt alleen voor de stappen die nog moeten.' : ''}</p>` : ''}
      ${v?.klaar ? `<p class="sd-o-goed" role="status">De opdracht is aangemaakt${s.actief ? ' en staat actief' : ''}.</p>` : ''}`;
  },

  /* De pagina van Simulise waar je verder kunt als een stap mislukt. */
  vervolg(stap) { return `/school/assignment/${this.opdrachtId}/${{ 1: 'edit', 2: 'badges', 3: 'deliverables', 4: 'connections/create/group', 5: 'connections' }[stap] || 'edit'}`; },

  /* ---------- Invoer ---------- */
  lees(el) {
    const s = this.s;
    if (!s) return;
    // De popup en de zoekvelden hebben hun eigen toestand.
    if (el.dataset.popZoek != null) { if (this.pop) { this.pop.zoek = el.value; this.tekenPopup(); } return; }
    if (el.dataset.pop) { if (this.pop) { if (el.checked) this.pop.gekozen.add(el.dataset.pop); else this.pop.gekozen.delete(el.dataset.pop); this.tekenPopup(); } return; }
    if (el.dataset.zoek) {
      const soort = el.dataset.zoek, tekst = el.value;
      this.zoek[soort] = tekst;
      clearTimeout(this._zoekT);
      this._zoekT = setTimeout(async () => {
        const lijst = !tekst.trim() ? [] : await (soort === 'groepen' ? this.groepen(tekst.trim()) : this.personen(soort, tekst.trim())).catch(() => []);
        (this.resultaten ||= {})[soort] = lijst; this.tekenLijsten();
      }, 300);
      return;
    }
    const veld = el.dataset.veld;
    if (!veld || this.voortgang) return;
    const nr = Number(el.dataset.nr);
    const waarde = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    const [groep, sleutel] = veld.includes('.') ? veld.split('.') : [null, veld];
    if (groep === 'link') s.links[nr][sleutel] = waarde;
    else if (groep === 'rubric') s.rubrics[nr][sleutel] = waarde;
    else if (groep === 'stuk') { if (sleutel === 'type') s.stukken[nr] = { ...this.nieuwStuk(waarde), titel: s.stukken[nr].titel, open: s.stukken[nr].open }; else s.stukken[nr][sleutel] = waarde; }
    else if (sleutel === 'reflectieOptioneel') s.reflectieOptioneel = waarde === 'ja';
    else s[sleutel] = waarde;
    // Alleen opnieuw opbouwen als de keuze andere velden toont of verbergt; bij typen alleen de zin bovenin.
    if (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date') this.teken(); else this.tekenControle();
  },

  actie(wat, el) {
    const s = this.s, id = el.dataset.id;
    if (wat === 'open') { this.open(); return; }
    if (wat === 'sluit') { this.sluit(); return; }
    if (!s) return;
    if (wat === 'nogeen') { this.sluit(); this.open(); return; }
    if (wat === 'opslaan') { this.opslaan(); return; }
    if (wat === 'aanpassen') { this.voortgang = null; this.teken(); return; }
    if (this.voortgang) return; // tijdens en na het opslaan verandert het formulier niet meer
    const wissel = (lijst, x) => { const i = lijst.indexOf(x); if (i >= 0) lijst.splice(i, 1); else lijst.push(x); };
    if (wat === 'klas') { wissel(s.klassen, id); const g = (this.resultaten?.groepen || []).find((x) => x.id === id); if (g && !this.alleGroepen.some((x) => x.id === id)) this.alleGroepen.push(g); if (g) { this.zoek.groepen = ''; this.resultaten.groepen = []; } }
    else if (wat === 'deadline') s.deadline = id;
    else if (wat === 'popup') { this.pop = { zoek: '', gekozen: new Set(s.rubrics.map((r) => r.id)) }; this.laadRubrics(); }
    else if (wat === 'popupDicht') this.pop = null;
    else if (wat === 'popupKlaar') {
      const oud = new Map(s.rubrics.map((r) => [r.id, r]));
      s.rubrics = [...this.pop.gekozen].map((rid) => oud.get(rid) || { ...(this.rubrics || []).find((r) => r.id === rid), optioneel: false }).filter((r) => r.id);
      this.pop = null;
    }
    else if (wat === 'rubricWeg') s.rubrics = s.rubrics.filter((r) => r.id !== id);
    else if (wat === 'persoon' || wat === 'persoonWeg') {
      const [soort, uid] = id.split('|');
      if (wat === 'persoonWeg') s[soort] = s[soort].filter((u) => u.id !== uid);
      else { const u = (this.resultaten?.[soort] || []).find((x) => x.id === uid); if (u) s[soort].push(u); this.zoek[soort] = ''; if (this.resultaten) this.resultaten[soort] = []; }
      s.minBeoordelingen = Math.max(1, Math.min(Number(s.minBeoordelingen) || 1, s.beoordelaars.length || 1));
    }
    else if (wat === 'linkErbij') s.links.push({ titel: '', url: '' });
    else if (wat === 'linkWeg') s.links.splice(Number(id), 1);
    else if (wat === 'stukErbij') s.stukken.push(this.nieuwStuk(this.soorten[0]?.type));
    else if (wat === 'stukWeg') s.stukken.splice(Number(id), 1);
    else if (wat === 'stukOpen') s.stukken[Number(id)].open = !s.stukken[Number(id)].open;
    else if (wat === 'stukSoort') { const [nr, type] = id.split('|'); wissel(s.stukken[Number(nr)].soorten, type); }
    else if (wat === 'label') { const [topic, label] = id.split('|'); wissel(s.labels[topic] ||= [], label); }
    else if (wat === 'labels') { s.labelOpen = s.labelOpen === id ? null : id; const t = this.topics.find((x) => x.id === id); if (t && s.labelOpen && !t.geladen) { this.teken(); this.laadLabels(t); return; } }
    this.teken();
  },

  /* ---------- Opslaan ---------- */
  uuid: () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
  tekstBlok(html) { return { id: this.uuid(), type: 'SIMULISE__TEXT', data: JSON.stringify({ text: html }), title: null, caption: null }; },
  alineas(tekst) { return tekst.trim().split(/\n\s*\n/).map((a) => `<p>${this.esc(a.trim()).replace(/\n/g, '<br>')}</p>`).join(''); },

  /* Wat er per stap naar Simulise gaat. Zelfde opbouw als het eigen scherm van Simulise (zie de kop van dit bestand). */
  invoer(stap) {
    const s = this.s, n = (x) => (x === '' || x == null || !(Number(x) >= 1) ? null : Number(x));
    if (stap === 1) return { title: s.titel.trim(), cover: null, blocks: s.tekst.trim() ? [this.tekstBlok(this.alineas(s.tekst))] : [], labels: Object.values(s.labels).flat().filter(Boolean),
      authors: s.auteurs.map((u) => u.id), aspects: [], isActive: false, duration: Number(s.duur) || 0, forEducations: false, feedbackCount: Number(s.feedback) || 0, catalogueTenants: [],
      resources: s.links.filter((l) => l.url.trim()).map((l) => ({ title: l.titel.trim() || l.url.trim(), url: l.url.trim(), type: 'SIMULISE__LINK', id: null })) };
    if (stap === 2) return { id: this.opdrachtId, badges: s.rubrics.map((r) => ({ id: r.id, isOptional: !!r.optioneel })), optionalBadges: { min: Number(s.optMin) || 0, max: Number(s.optMax) || 0 },
      reflectionOther: { type: s.reflectieAnder, min: Number(s.reflectieMin) || 1, max: n(s.reflectieMax) }, reflectionIsOptional: !!s.reflectieOptioneel };
    if (stap === 3) return { id: this.opdrachtId, deliverables: s.stukken.filter((x) => x.titel.trim()).map((x) => {
      const item = x.type === 'simulise.portfolio_item';
      return { title: x.titel.trim(), isOptional: !!x.optioneel, ...(item ? { plagiarism: !!x.plagiaat } : { unfreezePageAfterReview: !!x.ontgrendel }), id: null, type: x.type, multi: item ? !!x.meerdere : undefined,
        block: this.tekstBlok(''), minimum: item && x.meerdere ? n(x.min) : null, maximum: item && x.meerdere ? n(x.max) : null, templates: item ? [...x.soorten] : [], postMinWords: item ? n(x.minWoorden) : null, postMaxWords: item ? n(x.maxWoorden) : null, usePageTemplate: false };
    }) };
    if (stap === 4) { const dl = this.deadlineDatum(); return { id: this.opdrachtId, deadline: dl ? this.stempel(dl) : null, startDate: this.stempel(this.startDatum()),
      reviewers: [{ minimumReviews: Math.max(1, Math.min(Number(s.minBeoordelingen) || 1, s.beoordelaars.length)), reviewers: s.beoordelaars.map((u) => u.id), order: 0 }],
      deadlineIsSoft: !!dl && !!s.zacht, deliverAsWorkgroup: !!s.werkgroep, reviewGroupsAreSequenced: false, reviewsHiddenUntilReviewed: !!s.zichtbaar, connectables: [...s.klassen], connectableType: 'GROUP' }; }
    return null;
  },

  async stuur(stap) {
    const F = this.STATUS, s = this.s;
    const M = {
      1: ['assignmentCreate', `mutation assignmentCreate($input: AssignmentCreateInput!) { response: assignmentCreate(input: $input) { assignment { id } ...mutationFields } } ${F}`],
      2: ['assignmentBadgesUpdate', `mutation assignmentBadgesUpdate($input: assignmentBadgesUpdateInput!) { response: assignmentBadgesUpdate(input: $input) { ...mutationFields } } ${F}`],
      3: ['assignmentDeliverablesUpdate', `mutation assignmentDeliverablesUpdate($input: AssignmentDeliverablesUpdateInput!) { response: assignmentDeliverablesUpdate(input: $input) { assignment { id isActive } ...mutationFields } } ${F}`],
      4: ['assignmentConnectionCreate', `mutation assignmentConnectionCreate($input: AssignmentConnectionCreateInput!) { response: assignmentConnectionCreate(input: $input) { assignmentConnections { id } createdConnectionsCount skippedConnectionsCount ...mutationFields } } ${F}`],
      5: ['assignmentWizardFinish', `mutation assignmentWizardFinish($id: ID!, $activate: Boolean!) { response: assignmentWizardFinish(input: {id: $id, activate: $activate}) { assignment { id } ...mutationFields } } ${F}`],
    }[stap];
    const r = await this.SD.gql(M[0], M[1], stap === 5 ? { id: this.opdrachtId, activate: !!s.actief } : { input: this.invoer(stap) });
    const antw = r.data?.response;
    if (!antw) throw new Error((r.errors || []).map((e) => (typeof e === 'string' ? e : e?.message)).filter(Boolean).join('; ') || 'Simulise gaf geen antwoord');
    if (!antw.status?.success) throw new Error((antw.status?.errors || []).map((e) => `${e.name ? `${e.name}: ` : ''}${(e.messages || []).join(' ')}`).join('; ') || 'Simulise weigerde deze stap zonder uitleg');
    if (stap === 1) { this.opdrachtId = antw.assignment?.id; if (!this.opdrachtId) throw new Error('Simulise gaf geen nummer van de nieuwe opdracht terug'); }
  },

  async opslaan() {
    if (this._bezig || this.voortgang?.klaar) return;
    if (!this.voortgang && this.ontbreekt().length) return;
    this._bezig = true;
    const s = this.s;
    // Stap 2 is alleen nodig als er rubrics zijn of de reflectie afwijkt van wat Simulise zelf invult.
    const reflectieAnders = s.reflectieOptioneel || s.reflectieAnder !== 'NONE';
    const overgeslagen = [...(s.rubrics.length || reflectieAnders ? [] : [2]), ...(s.stukken.some((x) => x.titel.trim()) ? [] : [3])];
    this.voortgang = { stap: Math.max(1, this.klaarStap + 1), fout: null, klaar: false, overgeslagen };
    this.root?.querySelectorAll('.sd-o-raster input, .sd-o-raster textarea, .sd-o-raster select, .sd-o-raster button').forEach((el) => { el.disabled = true; });
    try {
      for (let stap = this.klaarStap + 1; stap <= 5; stap++) {
        this.voortgang.stap = stap; this.tekenControle();
        if (!overgeslagen.includes(stap)) await this.stuur(stap);
        this.klaarStap = stap;
      }
      this.voortgang.klaar = true;
      // Vaste keuzes voor de volgende keer (geen titels of klassen).
      const labels = {};
      for (const t of this.topics) if (t.soort !== 'SECTIONS') labels[t.naam] = t.opties.filter((o) => (s.labels[t.id] || []).includes(o.id)).map((o) => ({ id: o.id, naam: o.naam })).slice(0, 5);
      chrome.storage.sync.set({ qaStandaard: { deadline: s.deadline === 'datum' ? 'geen' : s.deadline, actief: s.actief, zacht: s.zacht, werkgroep: s.werkgroep, zichtbaar: s.zichtbaar, reflectieOptioneel: s.reflectieOptioneel, reflectieAnder: s.reflectieAnder,
        feedback: Number(s.feedback) || 0, duur: Number(s.duur) || 0, labels, stukken: s.stukken.filter((x) => x.titel.trim()).slice(0, 5).map(({ open, ...x }) => ({ ...x, titel: x.titel.trim().slice(0, 60) })) } });
    } catch (e) { this.voortgang.fout = String(e.message || e); }
    this._bezig = false;
    this.tekenControle();
  },
});
