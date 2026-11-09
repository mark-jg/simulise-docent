/* Inspector (ontwikkelaarsmodus): Alt+I, of "Inspector starten" in de popup.
 *   beweeg   toont de CSS-selector van het element onder de muis
 *   klik     kopieert die selector
 *   R        paginarapport: structuur, koppen, tabellen, filters en URL, met namen vervangen
 *   S        alleen structuur: tags en classes, helemaal zonder tekst
 *   Esc      stoppen
 * Het rapport wordt gedownload als .md en gekopieerd, om naar Claude te sturen.
 *
 * Privacy: studentnamen, e-mailadressen en studentnummers worden vervangen vóórdat het rapport
 * wordt gemaakt ("Student 1", "[naam]", "[e-mail]", "[nummer]"). Getallen in URL's worden {id}.
 * Kijk een rapport toch altijd even na voordat je het deelt.
 */
SD.register({
  id: 'inspector',
  MAX_LINES: 1500,
  SKIP_TAGS: new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'SVG', 'PATH', 'LINK', 'META', 'IFRAME']),
  CSS: `
    :host { all: initial; }
    .box { position: fixed; pointer-events: none; z-index: 2147483100; border: 2px solid #e8590c; background: rgba(232, 89, 12, .08); border-radius: 3px; display: none; }
    .bar { position: fixed; left: 50%; transform: translateX(-50%); bottom: 12px; z-index: 2147483200; max-width: calc(100vw - 32px);
      background: #1e2328; color: #e6e8eb; font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace; padding: 8px 12px; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, .3); display: flex; flex-direction: column; gap: 3px; }
    .sel { color: #ffb37a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .keys { color: #a4acb6; font-family: system-ui, sans-serif; }
    .msg { color: #7ee2b8; font-family: system-ui, sans-serif; }
    .msg:empty { display: none; }
  `,

  init(SD) {
    this.SD = SD;
    this._key = (e) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyI') { e.preventDefault(); this.loopt ? this.stop() : this.start(); }
    };
    window.addEventListener('keydown', this._key, true);
    this._msg = (msg, _s, antwoord) => {
      if (msg?.type !== 'sd-inspector') return;
      this.loopt ? this.stop() : this.start();
      antwoord({ ok: true });
    };
    chrome.runtime.onMessage.addListener(this._msg);
    SD.addCommand('inspector', 'Inspector starten (ontwikkelaar)', () => this.start());
  },

  destroy(SD) {
    this.stop();
    window.removeEventListener('keydown', this._key, true);
    chrome.runtime.onMessage.removeListener(this._msg);
    SD.removeCommand('inspector');
    this.SD = null;
  },

  /* ---------- Bediening ---------- */
  start() {
    if (this.loopt || !document.body) return;
    this.loopt = true;
    const { host, shadow } = this.SD.shadowHost('sim-docent-inspector', this.CSS);
    const box = document.createElement('div'); box.className = 'box';
    const bar = document.createElement('div'); bar.className = 'bar';
    const sel = document.createElement('div'); sel.className = 'sel'; sel.textContent = 'Inspector: beweeg over een element';
    const keys = document.createElement('div'); keys.className = 'keys';
    keys.textContent = 'klik = selector kopiëren · R = rapport · S = alleen structuur · Esc = stoppen';
    const msg = document.createElement('div'); msg.className = 'msg';
    bar.append(sel, keys, msg); shadow.append(box, bar);
    this.ui = { host, box, sel, msg };

    const eigen = (e) => e.composedPath().includes(host);
    this._over = (e) => {
      if (eigen(e) || !(e.target instanceof Element)) return;
      this.hover = e.target;
      const r = e.target.getBoundingClientRect();
      Object.assign(box.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      sel.textContent = this.selectorFor(e.target);
    };
    this._click = (e) => {
      if (eigen(e) || e.target?.dataset?.sdDownload) return; // eigen downloadlink doorlaten
      e.preventDefault(); e.stopPropagation();
      this.copy(this.selectorFor(e.target)).then((ok) => this.melding(ok ? 'Selector gekopieerd.' : 'Kopiëren lukte niet; selector staat hierboven.'));
    };
    this._keys = (e) => {
      if (/^(input|textarea|select)$/i.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { e.preventDefault(); this.stop(); }
      else if (k === 'r' || k === 's') {
        e.preventDefault();
        try { this.rapport(k === 'r'); }
        catch (err) { this.melding(`Rapport mislukt: ${err.message}`); console.error('[Simulise Docent] rapport', err); }
      }
    };
    document.addEventListener('mouseover', this._over, true);
    document.addEventListener('click', this._click, true);
    document.addEventListener('keydown', this._keys, true);
  },

  stop() {
    if (!this.loopt) return;
    this.loopt = false;
    document.removeEventListener('mouseover', this._over, true);
    document.removeEventListener('click', this._click, true);
    document.removeEventListener('keydown', this._keys, true);
    this.ui?.host.remove();
    this.ui = this.hover = null;
  },

  melding(t) { if (this.ui) this.ui.msg.textContent = t; },

  async copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  },

  download(naam, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = naam; a.dataset.sdDownload = '1';
    document.documentElement.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  /* ---------- Selectors ---------- */
  /* Alleen stabiele classes: geen hashes, geen eigen classes van de extensie. */
  stableClasses(el) {
    return [...el.classList].filter((c) => c.length <= 30 && !/^sd-|^sim-docent/.test(c)
      && !/^(?=.*\d)(?=.*[a-z])[a-z0-9]{6,}$/i.test(c) && !/^[a-z]{1,3}-[0-9a-f]{5,}$/i.test(c));
  },

  stableId(el) { return el.id && !/\d{3,}/.test(el.id) && el.id.length <= 40 ? el.id : ''; },

  selectorFor(el) {
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && parts.length < 5; e = e.parentElement) {
      const id = this.stableId(e);
      if (id) { parts.unshift(`#${CSS.escape(id)}`); break; }
      let s = e.tagName.toLowerCase();
      const cls = this.stableClasses(e).slice(0, 3);
      if (cls.length) s += `.${cls.map((c) => CSS.escape(c)).join('.')}`;
      parts.unshift(s);
      if (e === document.body) break;
    }
    return parts.join(' > ');
  },

  /* ---------- Privacy ---------- */
  /* Woorden die op hoofdletters lijken maar geen naam zijn (Simulise-interface, NL en EN). */
  SAFE: new Set(('Dashboard Beoordelen Beoordeling Beoordelingen Groep Groepen Portfolio Portfolio\'s Opdracht Opdrachten ' +
    'Meetmoment Meetmomenten Student Studenten Docent Docenten Leerlijn Leerlijnen Competentie Competenties Rubric Rubrics ' +
    'Reflectie Feedback Status Ingeleverd Concept Afgerond Behandeling Alle Alles Mijn Filter Filters Zoeken Datum Deadline ' +
    'Type Titel Naam Hulp Instellingen Uitloggen Profiel Nieuw Nieuwe Bekijk Bekijken Open Openen Sluiten Opslaan Annuleren ' +
    'Vandaag Gisteren Morgen Week Maand Jaar Periode Maandag Dinsdag Woensdag Donderdag Vrijdag Zaterdag Zondag ' +
    'Januari Februari Maart April Mei Juni Juli Augustus September Oktober November December ' +
    'Simulise Mediacollege Amsterdam MCA Teams Microsoft Excel Overzicht Voortgang Resultaat Resultaten Cijfer Cijfers ' +
    'Meetmoment Nederlands Engels Rekenen Burgerschap Loopbaan Spreken Schrijven Lezen Luisteren Gesprekken Professional Skills ' +
    'Vakvaardigheden Cohort Nulmeting Brochure Reisgids Fashion Vloggenreeks Startvlog Vrijheid Gelijkheid Omschrijving Reflecties ' +
    'Algemeen Inhoudelijk Rubrics Toekenning Niet Voldaan Sjablonen Community Bestanden Opdrachttitel ' +
    'The All My Group Groups Assignment Assignments Assessment Assessments Handed In Being Processed Asked Show Hide Next Previous Page Of')
    .split(' ')),

  maskerVoorPagina() {
    const namen = new Map();
    const voegToe = (t) => {
      t = (t || '').replace(/\s+/g, ' ').trim();
      if (t.length < 2 || t.length > 60 || !/[a-zà-ÿ]/i.test(t) || /\d/.test(t) || this.SAFE.has(t) || namen.has(t)) return;
      namen.set(t, `Student ${namen.size + 1}`);
    };
    // Plekken waar Simulise personen toont: links naar personen, avatars, elementen met "name"/"student"/"user" in de class.
    const persoonLink = /^\/@|\/(users?|students?|persons?|profile|profiles|people)\/|\/portfolio\/.+/i;
    for (const a of document.querySelectorAll('a[href]')) if (persoonLink.test(new URL(a.href, location.href).pathname)) voegToe(a.textContent);
    for (const img of document.querySelectorAll('img[alt], img[title]')) { voegToe(img.alt); voegToe(img.title); }
    for (const el of document.querySelectorAll('[class*="name" i], [class*="student" i], [class*="user" i], [class*="avatar" i]')) {
      if (el.closest('#sim-docent-inspector, aside#nav')) continue;
      if (el.children.length === 0) voegToe(el.textContent);
    }
    const lijst = [...namen.keys()].sort((a, b) => b.length - a.length);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bekend = lijst.length ? new RegExp(lijst.map(esc).join('|'), 'g') : null;
    const tv = "(?:van|de|der|den|ter|ten|het|'t|in|op|el|al|da|du|le|la|di|von|zu)";
    const W = "[A-ZÀ-Þ][a-zà-ÿ'’-]+";
    const naamPatroon = new RegExp(`\\b${W}(?:\\s+${tv}){0,3}\\s+${W}(?:\\s+${W})?`, 'gu');
    const SAFE = this.SAFE;
    const masker = (s) => {
      if (!s) return s;
      s = s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[e-mail]');
      s = s.replace(/(^|[^\w])@[\w.-]+/g, '$1@[gebruiker]');
      if (bekend) s = s.replace(bekend, (m) => namen.get(m));
      s = s.replace(/\b\d{6,9}\b/g, '[nummer]');
      s = s.replace(naamPatroon, (m) => m.split(/\s+/).every((w) => SAFE.has(w) || !/^[A-ZÀ-Þ]/.test(w)) ? m : '[naam]');
      return s;
    };
    masker.aantal = () => namen.size;
    return masker;
  },

  /* URL zonder persoonsgegevens: getallen in het pad worden {id}, alleen "veilige" waarden in de query. */
  schoneUrl(href) {
    const u = new URL(href, location.href);
    // Simulise zet gebruikersnamen in het pad (/@gebruiker/...): die zijn persoonsgegevens.
    // Lange id's (uuid's) worden {id}, losse getallen ook.
    const pad = u.pathname
      .replace(/\/@[^/]+/g, '/@{gebruiker}')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
      .replace(/\d+/g, '{id}');
    const q = [...u.searchParams].map(([k, v]) => {
      const veilig = /^[A-Za-z_:,.\-]{0,80}$/.test(v) && (v.includes(':') || v.includes(',') || /^[A-Z_]+$/.test(v) || /^[a-z_-]+$/.test(v));
      return `${k}=${/^\d+$/.test(v) ? '{id}' : veilig ? v : '…'}`;
    });
    // Simulise gebruikt soms ?status:A,B zonder =; dat komt hierboven als sleutel zonder waarde door.
    return pad + (q.length ? `?${q.join('&')}` : '');
  },

  /* ---------- Rapport ---------- */
  rapport(metTekst) {
    const masker = metTekst ? this.maskerVoorPagina() : () => '';
    const tekst = (el, max = 80) => {
      if (!metTekst) return '';
      const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      return t ? masker(t.length > max ? `${t.slice(0, max)}…` : t) : '';
    };
    const volleTekst = (el, max = 120) => {
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      return masker(t.length > max ? `${t.slice(0, max)}…` : t);
    };
    const sig = (el) => {
      let s = el.tagName.toLowerCase();
      const id = this.stableId(el); if (id) s += `#${id}`;
      const cls = this.stableClasses(el).slice(0, 6); if (cls.length) s += `.${cls.join('.')}`;
      const role = el.getAttribute('role'); if (role) s += `[role=${role}]`;
      const href = el.tagName === 'A' ? el.getAttribute('href') : null;
      if (href) s += `[href=${href.startsWith('#') || href.startsWith('javascript:') ? href.slice(0, 20) : this.schoneUrl(el.href)}]`;
      if (el.tagName === 'INPUT') s += `[type=${el.type}]`;
      for (const at of el.attributes) {
        if (!at.name.startsWith('data-') || at.name.startsWith('data-v-') || at.name.startsWith('data-sim')) continue;
        s += /^[A-Z_]{2,30}$|^[a-z_-]{2,20}$/.test(at.value) ? `[${at.name}=${at.value}]` : `[${at.name}]`;
      }
      return s;
    };

    const regels = [];
    const herhaald = [];
    const boom = (el, diepte, maxDiepte) => {
      if (regels.length >= this.MAX_LINES) return;
      const kids = [...el.children].filter((c) => !this.SKIP_TAGS.has(c.tagName) && !c.id?.startsWith('sim-docent'));
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i], s = sig(k);
        let n = 1; while (i + n < kids.length && sig(kids[i + n]) === s) n++;
        const t = tekst(k);
        regels.push(`${'  '.repeat(diepte)}${s}${n > 1 ? ` × ${n}` : ''}${t ? `  "${t}"` : ''}`);
        if (n >= 3 && metTekst) herhaald.push({ s, items: kids.slice(i, i + Math.min(n, 6)).map((x) => volleTekst(x)) });
        if (diepte < maxDiepte) boom(k, diepte + 1, maxDiepte);
        i += n - 1;
        if (regels.length >= this.MAX_LINES) { regels.push(`${'  '.repeat(diepte)}… (afgekapt)`); return; }
      }
    };
    const hoofd = document.querySelector('#content') || document.body;
    boom(hoofd, 0, 14);

    const md = [];
    md.push(`# Simulise Docent: ${metTekst ? 'paginarapport' : 'structuurrapport (zonder tekst)'}`);
    md.push('');
    md.push(`- Pagina: \`${this.schoneUrl(location.href)}\``);
    if (location.hash) md.push(`- Hash: \`${location.hash.replace(/\d+/g, '{id}')}\``);
    if (metTekst) md.push(`- Titel: ${masker(document.title)}`);
    md.push(`- Extensie: v${chrome.runtime.getManifest().version}, gemaakt ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
    md.push(`- Viewport: ${innerWidth}×${innerHeight}`);
    if (metTekst) md.push(`- Privacy: ${masker.aantal()} namen vervangen door "Student N"; overige namen als [naam], e-mail als [e-mail], nummers als [nummer]. Kijk het rapport na voor je het deelt.`);
    md.push('');

    if (metTekst) {
      const koppen = [...document.querySelectorAll('h1, h2, h3, h4, .header-text, .panel-heading')]
        .filter((h) => !h.closest('[id^="sim-docent"]')).map((h) => `- ${h.tagName.toLowerCase()}${this.stableClasses(h).length ? '.' + this.stableClasses(h).slice(0, 3).join('.') : ''}: ${volleTekst(h, 100)}`)
        .filter((r, i, a) => a.indexOf(r) === i).slice(0, 60);
      if (koppen.length) md.push('## Koppen', '', ...koppen, '');

      const tabellen = [...hoofd.querySelectorAll('table')].slice(0, 8);
      if (tabellen.length) {
        md.push('## Tabellen', '');
        tabellen.forEach((t, i) => {
          const rijen = [...t.querySelectorAll('tbody > tr, :scope > tr')];
          md.push(`### Tabel ${i + 1}: \`${this.selectorFor(t)}\` (${rijen.length} rijen)`, '');
          const kop = [...t.querySelectorAll('thead th')].map((th) => volleTekst(th, 40));
          if (kop.length) md.push(`| ${kop.join(' | ')} |`, `|${kop.map(() => ' --- ').join('|')}|`);
          for (const tr of rijen.slice(0, 8)) {
            const cellen = [...tr.children].map((td) => volleTekst(td, 60).replace(/\|/g, '/') || ' ');
            md.push(`| ${cellen.join(' | ')} |  ← tr${this.stableClasses(tr).length ? '.' + this.stableClasses(tr).join('.') : ''}`);
          }
          md.push('');
        });
      }

      const velden = [...hoofd.querySelectorAll('input, select, textarea, button, [role=button]')].slice(0, 60).map((f) => {
        const naam = f.getAttribute('name') || f.getAttribute('placeholder') || f.getAttribute('aria-label') || volleTekst(f, 40);
        const opties = f.tagName === 'SELECT' ? ` opties: ${[...f.options].slice(0, 15).map((o) => masker(o.textContent.trim())).join(', ')}` : '';
        return `- \`${this.selectorFor(f)}\`${f.type ? ` (${f.type})` : ''}: ${masker(naam || '')}${opties}`;
      });
      if (velden.length) md.push('## Filters, velden en knoppen', '', ...velden, '');

      if (herhaald.length) {
        md.push('## Herhaalde items (eerste paar)', '');
        for (const h of herhaald.slice(0, 20)) md.push(`- \`${h.s}\``, ...h.items.map((t) => `  - ${t}`));
        md.push('');
      }

      const linkTypes = new Map();
      for (const a of hoofd.querySelectorAll('a[href]')) {
        const p = this.schoneUrl(a.href);
        if (!p.startsWith('/')) continue;
        linkTypes.set(p, (linkTypes.get(p) || 0) + 1);
      }
      if (linkTypes.size) md.push('## Linkpatronen', '', ...[...linkTypes].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([p, n]) => `- \`${p}\` × ${n}`), '');
    }

    md.push(`## Structuur van \`${hoofd === document.body ? 'body' : '#content'}\``, '', '```', ...regels, '```', '');
    const nav = document.querySelector('aside#nav');
    if (nav) { regels.length = 0; boom(nav, 0, 4); md.push('## Structuur van `aside#nav`', '', '```', ...regels.slice(0, 120), '```', ''); }

    const text = md.join('\n');
    const slug = this.schoneUrl(location.href).split('?')[0].replace(/[{}]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'pagina';
    this.download(`simulise-${metTekst ? 'rapport' : 'structuur'}-${slug}.md`, text);
    this.copy(text).then((ok) => this.melding(`${metTekst ? 'Rapport' : 'Structuurrapport'} gedownload${ok ? ' en gekopieerd' : ''}.${metTekst ? ` ${masker.aantal()} namen vervangen; kijk het na voor je het deelt.` : ''}`));
    return text;
  },
});
