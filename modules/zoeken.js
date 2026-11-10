/* Zoeken (roadmap 2.5): Cmd+K (Ctrl+K) opent een zoekvenster om snel te springen naar
 * menu-items, groepen en opdrachten van de extensie (zoals de zijbalk inklappen).
 *
 * Privacy: alleen links uit het hoofdmenu (aside#nav) en groepslinks (/groups/school/<uuid>) worden
 * opgenomen. Groepsnamen (klasnamen) worden lokaal onthouden in chrome.storage.local, zodat je
 * ook groepen vindt die niet op de huidige pagina staan. Studentpagina's en -namen nooit.
 */
SD.register({
  id: 'zoeken',
  MAX_GROUPS: 200,
  CSS: `
    :host { all: initial; }
    .bg { position: fixed; inset: 0; z-index: 2147483000; background: rgba(15, 20, 25, .35); display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh; font: 14px/1.4 Inter, system-ui, sans-serif; }
    .box { width: min(560px, calc(100vw - 32px)); background: var(--sim-surface, #fff); color: var(--sim-text, #1e2328); border: 1px solid var(--sim-border, #e3e6ea); border-radius: 12px; box-shadow: 0 20px 50px rgba(0, 0, 0, .25); overflow: hidden; }
    input { all: unset; box-sizing: border-box; width: 100%; padding: 14px 16px; font-size: 16px; border-bottom: 1px solid var(--sim-border, #e3e6ea); color: inherit; }
    input::placeholder { color: var(--sim-text-3, #8a93a0); }
    ul { list-style: none; margin: 0; padding: 6px; max-height: 50vh; overflow-y: auto; }
    li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
    li[aria-selected="true"] { background: var(--sim-accent-soft, #e6f4f1); color: var(--sim-accent-text, #0b6f5e); }
    .soort { color: var(--sim-text-3, #8a93a0); font-size: 12px; white-space: nowrap; }
    .leeg { padding: 12px 10px; color: var(--sim-text-3, #8a93a0); cursor: default; }
    .hint { padding: 6px 16px 10px; color: var(--sim-text-3, #8a93a0); font-size: 12px; }
  `,

  init(SD) {
    this.SD = SD;
    this.groups = {};
    // Eerst de onthouden groepen inlezen; harvest wacht hierop, anders overschrijft hij ze.
    this._geladen = chrome.storage.local.get({ sdGroups: {} }).then(({ sdGroups }) => { this.groups = { ...(sdGroups || {}), ...this.groups }; });
    this._key = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault(); e.stopPropagation();
        this.isOpen() ? this.close() : this.open();
      }
    };
    window.addEventListener('keydown', this._key, true);
    SD.ready(() => {
      if (!this.SD) return; // intussen uitgezet
      this.harvest();
      this._stop = SD.observe(() => this.harvest(), 1500);
    });
  },

  destroy() {
    window.removeEventListener('keydown', this._key, true);
    this._stop?.();
    this.close();
    this.SD = null;
  },

  /* Groepen onthouden: { sleutel: naam }. De sleutel is het pad na /groups/, in Simulise meestal
   * school/<uuid> (oudere links: een nummer). Alleen links met een leesbare naam, plus de kop van een
   * groepspagina ("Groepen / MEP1A"). */
  GROEP: /^\/groups\/((?:school\/)?(?:[0-9a-f]{8}-[0-9a-f-]{27}|\d+))(\/|$)/i,

  // Tabbladen en menu-items van een groep zijn geen groepsnamen.
  GEEN_NAAM: /^(community|studenten|docenten|opdrachten|sjablonen|instellingen|bestanden|voortgangsrapporten|te beoordelen)$/i,

  async harvest() {
    await this._geladen;
    if (!this.SD) return;
    let changed = false;
    // Opruimen: eerder per ongeluk onthouden menu-namen
    for (const [k, v] of Object.entries(this.groups)) if (this.GEEN_NAAM.test(v)) { delete this.groups[k]; changed = true; }
    const zet = (sleutel, naam) => {
      naam = (naam || '').replace(/\s+/g, ' ').trim();
      if (!/[a-z]/i.test(naam) || naam.length > 60 || this.GEEN_NAAM.test(naam) || this.groups[sleutel] === naam) return;
      this.groups[sleutel] = naam; changed = true;
    };
    for (const a of document.querySelectorAll('#content a[href*="/groups/"], aside#nav a[href*="/groups/"]')) {
      if (a.closest('.nav-tabs, .dropdown-menu, .btn-group')) continue; // tabbladen en menu's zijn geen groepsnamen
      const m = new URL(a.href, location.href).pathname.match(this.GROEP);
      if (m) zet(m[1], a.textContent);
    }
    const hier = location.pathname.match(this.GROEP);
    const kop = document.querySelector('#content .header-text');
    if (hier && kop) {
      const delen = [...kop.querySelectorAll(':scope > span')].map((s) => s.textContent.trim()).filter((t) => t && t !== '/');
      if (delen.length >= 2 && /^groepen$/i.test(delen[0])) zet(hier[1], delen[delen.length - 1]);
    }
    const ids = Object.keys(this.groups);
    if (ids.length > this.MAX_GROUPS) { for (const id of ids.slice(0, ids.length - this.MAX_GROUPS)) delete this.groups[id]; changed = true; }
    if (changed) chrome.storage.local.set({ sdGroups: this.groups });
  },

  items() {
    const out = [];
    const seen = new Set();
    for (const a of document.querySelectorAll('aside#nav a[href]')) {
      const href = a.getAttribute('href');
      const naam = (a.textContent || a.title || '').replace(/\s+/g, ' ').trim();
      if (!naam || !href || href === '#' || href.startsWith('javascript:') || seen.has(href)) continue;
      seen.add(href);
      out.push({ naam, soort: 'Menu', url: new URL(href, location.href).href });
    }
    for (const [id, naam] of Object.entries(this.groups).sort((a, b) => a[1].localeCompare(b[1], 'nl'))) {
      out.push({ naam, soort: 'Groep', url: `${location.origin}/groups/${id}/assignments` });
      out.push({ naam: `${naam}: te beoordelen`, soort: 'Groep', url: `${location.origin}/groups/${id}/assignments?filters=status:actionable` });
    }
    for (const [, c] of this.SD.commands) out.push({ naam: c.naam, soort: 'Opdracht', run: c.run });
    return out;
  },

  zoek(q) {
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const woorden = norm(q).split(/\s+/).filter(Boolean);
    const alle = this.items();
    if (!woorden.length) return alle.slice(0, 12);
    return alle
      .map((it) => ({ it, n: norm(it.naam) }))
      .filter(({ n }) => woorden.every((w) => n.includes(w)))
      .sort((a, b) => (b.n.startsWith(woorden[0]) - a.n.startsWith(woorden[0])) || a.n.length - b.n.length)
      .slice(0, 12)
      .map(({ it }) => it);
  },

  isOpen() { return Boolean(this.ui); },

  open() {
    if (!document.body) return;
    this.harvest();
    const { host, shadow } = this.SD.shadowHost('sim-docent-zoeken', this.CSS);
    const bg = document.createElement('div'); bg.className = 'bg';
    const box = document.createElement('div'); box.className = 'box';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Zoeken in Simulise');
    const input = document.createElement('input');
    input.placeholder = 'Zoek een menu-item, groep of opdracht…';
    input.setAttribute('aria-label', 'Zoeken');
    const ul = document.createElement('ul'); ul.setAttribute('role', 'listbox');
    const hint = document.createElement('div'); hint.className = 'hint';
    hint.textContent = '↑ ↓ kiezen · Enter openen · Esc sluiten';
    box.append(input, ul, hint); bg.append(box); shadow.append(bg);
    this.ui = { host, input, ul, sel: 0, list: [] };

    const render = () => {
      const { ui } = this;
      ui.list = this.zoek(input.value);
      ui.sel = Math.min(ui.sel, Math.max(0, ui.list.length - 1));
      ul.replaceChildren();
      if (!ui.list.length) {
        const li = document.createElement('li'); li.className = 'leeg'; li.textContent = 'Niets gevonden.';
        ul.append(li); return;
      }
      ui.list.forEach((it, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === ui.sel));
        const naam = document.createElement('span'); naam.textContent = it.naam;
        const soort = document.createElement('span'); soort.className = 'soort'; soort.textContent = it.soort;
        li.append(naam, soort);
        li.onmousemove = () => { if (ui.sel !== i) { ui.sel = i; render(); } };
        li.onclick = () => this.kies(it);
        ul.append(li);
      });
      ul.children[ui.sel]?.scrollIntoView({ block: 'nearest' });
    };
    input.oninput = () => { this.ui.sel = 0; render(); };
    input.onkeydown = (e) => {
      e.stopPropagation(); // sneltoetsen van Simulise niet laten afgaan tijdens het typen
      const { ui } = this;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); ui.sel = (ui.sel + 1) % Math.max(1, ui.list.length); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ui.sel = (ui.sel - 1 + ui.list.length) % Math.max(1, ui.list.length); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (ui.list[ui.sel]) this.kies(ui.list[ui.sel]); }
    };
    bg.onclick = (e) => { if (e.target === bg) this.close(); };
    render();
    input.focus();
  },

  kies(it) {
    this.close();
    if (it.run) it.run();
    else location.href = it.url;
  },

  close() {
    this.ui?.host.remove();
    this.ui = null;
  },
});
