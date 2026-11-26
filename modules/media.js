/* Media bij het nakijken: video, audio en bestanden van een ingeleverde portfoliopagina afspelen op het beoordeelscherm.
 *
 * Simulise toont een ingeleverde portfoliopagina op /@gebruiker/assignment/<uuid>/review als pdf. In een pdf is een video
 * een stilstaand beeld en audio niets. Deze module vraagt de blokken van de pagina op en zet de bestanden eronder:
 *   video en audio   een gewone speler in de pagina
 *   afbeeldingen     de afbeelding zelf
 *   andere bestanden een knop die de voorvertoning van Simulise opent (in een kader), plus Downloaden
 *   links            de link, in een nieuw tabblad
 *
 * Gegevens via SD.gql, met je eigen sessie (alleen lezen):
 *   sdNakijkMedia   assignmentAssignedForUser(user: "@gebruiker", id) { delivered { item { ... on PortfolioPage { blocks } } } }
 * De vraag heeft dezelfde opbouw als die van het beoordeelscherm zelf (getUserAssignmentForReview) met daarbij de blokken van
 * de pagina (bestand, link, en de keuzeblokken van een sjabloon met het gekozen blok erin). Een kalere vraag weigert de server
 * met "Internal server error", en de gebruikersnaam moet met @ beginnen (gezien in november 2026).
 * Voor video, audio en afbeeldingen staat het afspeelbare bestand in de voorvertoning van Simulise (renderedPreviewUrl, een
 * kleine pagina op api.simulise.com); de module leest daar het adres uit, via de brug in de pagina (modules/gql.js), want
 * vanuit de extensie zelf wordt dat verzoek geweigerd. Lukt dat niet, dan opent de knop die voorvertoning.
 * Er wordt niets bewaard: de adressen zijn tijdelijk en verlopen vanzelf. De opmaak staat in theme.css (.sd-media).
 */
SD.register({
  id: 'media',
  REVIEW: /^\/@([^/]+)\/assignment\/([0-9a-f-]{36})\/review\/?$/i,
  Q: (() => {
    const F = '... on ContentBlockSimuliseFileData { id file { id type icon size title thumbnail extension downloadUrl renderedPreviewUrl } } ... on ContentBlockSimuliseLinkData { url title }';
    return `query sdNakijkMedia($user: String!, $assignmentAssigned: ID!) { assignmentAssigned: assignmentAssignedForUser(user: $user, id: $assignmentAssigned) { id delivered { id canView preview deliverable { id }
      item { ... on MedialibraryFile { id type icon title thumbnail createdAt }
        ... on PortfolioPage { id title icon author { id name } canView template { id title } permalink createdAt contentType { key name icon } featuredImage { id thumbnail } thumbnailUrl
          blocks { id type title data { __typename ${F} ... on ContentBlockSimulisePickerData { choice nestedData { __typename ${F} } } } } }
        ... on PortfolioItem { id } } } } }`;
  })(),

  init(SD) {
    this.SD = SD;
    this.cache = new Map(); // adres van het beoordeelscherm -> { media: [...] } of een belofte
    this._klik = (e) => {
      const el = e.target.closest?.('[data-sd-media]');
      if (!el) return;
      e.preventDefault();
      const kaart = el.closest('.sd-media-kaart');
      if (el.dataset.sdMedia === 'toon' && kaart && !kaart.querySelector('iframe')) {
        const kader = Object.assign(document.createElement('iframe'), { src: el.dataset.adres, title: 'Voorvertoning van het bestand', loading: 'lazy' });
        kader.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
        kaart.append(kader); el.remove();
      }
    };
    document.addEventListener('click', this._klik, true);
    SD.ready(() => {
      if (!this.SD) return;
      this.pas();
      this._stop = SD.observe(() => this.pas(), 600);
    });
  },

  destroy() {
    this.SD = null;
    document.removeEventListener('click', this._klik, true);
    this._stop?.();
    document.querySelectorAll('.sd-media').forEach((el) => el.remove());
    this.cache.clear();
  },

  esc: (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  veilig: (adres) => { try { const u = new URL(adres, location.href); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } },

  /* Het vak met het ingeleverde werk: de kop die niet Omschrijving, Reflecties of Feedback is. */
  werkVak() {
    for (const h of document.querySelectorAll('#scrollable-page-wrapper .fluid-container-max-width h2')) {
      const t = h.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
      if (t && !['omschrijving', 'reflecties', 'feedback'].includes(t)) return h.parentElement;
    }
    return null;
  },

  pas() {
    if (!this.SD) return;
    const m = location.pathname.match(this.REVIEW);
    const sleutel = m ? `${m[1]}/${m[2]}` : null;
    const oud = document.querySelector('.sd-media');
    if (!sleutel) { oud?.remove(); return; }
    if (oud && oud.dataset.sleutel !== sleutel) oud.remove();
    const vak = this.werkVak();
    if (!vak) return;
    const bekend = this.cache.get(sleutel);
    if (!bekend) {
      this.cache.set(sleutel, 'bezig');
      this.haal(decodeURIComponent(m[1]), m[2]).then((media) => { this.cache.set(sleutel, { media }); if (this.SD) this.pas(); }, () => this.cache.set(sleutel, { media: [] }));
      return;
    }
    if (bekend === 'bezig' || !bekend.media.length) return;
    if (vak.querySelector(':scope > .sd-media')) return;
    document.querySelectorAll('.sd-media').forEach((el) => el.remove());
    vak.append(this.bouw(bekend.media, sleutel));
  },

  /* De bestanden en links van de ingeleverde pagina's, in de volgorde van de pagina. */
  async haal(gebruiker, id) {
    const r = await this.SD.gql('sdNakijkMedia', this.Q, { user: `@${gebruiker.replace(/^@/, '')}`, assignmentAssigned: id });
    const uit = [];
    for (const d of r.data?.assignmentAssigned?.delivered || []) {
      for (const b of d.item?.blocks || []) {
        const data = b.data?.__typename === 'ContentBlockSimulisePickerData' ? b.data.nestedData : b.data;
        if (data?.file?.id) uit.push({ soort: 'bestand', kop: b.title || '', ...data.file });
        else if (data?.url) uit.push({ soort: 'link', kop: b.title || '', url: data.url, titel: data.title || '' });
      }
    }
    // Video, audio en afbeeldingen: het afspeelbare adres staat in de voorvertoning van Simulise.
    await Promise.all(uit.filter((x) => x.soort === 'bestand' && /^(VIDEO|AUDIO|IMAGE)$/i.test(x.type || '') && x.renderedPreviewUrl).map(async (x) => {
      const tekst = await this.voorvertoning(x.renderedPreviewUrl);
      if (!tekst) return; // dan opent de knop de voorvertoning in een kader
      const doc = new DOMParser().parseFromString(tekst, 'text/html');
      const el = doc.querySelector(/^VIDEO$/i.test(x.type) ? 'video' : /^AUDIO$/i.test(x.type) ? 'audio' : '.post-content img, img');
      x.bron = this.veilig(el?.querySelector?.('source')?.getAttribute('src') || el?.getAttribute('src') || '');
      x.poster = this.veilig(el?.getAttribute?.('poster') || '');
    }));
    return uit;
  },

  /* De tekst van een voorvertoning, opgehaald door de brug in de pagina (modules/gql.js); null als het niet lukt. */
  voorvertoning(url) {
    return new Promise((klaar) => {
      const id = `sd-vv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const op = (e) => { if (e.source !== window || e.data?.type !== 'sd-voorvertoning-antwoord' || e.data.id !== id) return; window.removeEventListener('message', op); clearTimeout(t); klaar(e.data.tekst || null); };
      const t = setTimeout(() => { window.removeEventListener('message', op); klaar(null); }, 10000);
      window.addEventListener('message', op);
      window.postMessage({ type: 'sd-voorvertoning', id, url }, location.origin);
    });
  },

  bouw(media, sleutel) {
    const esc = this.esc, veilig = this.veilig;
    const NAAM = { VIDEO: 'Video', AUDIO: 'Audio', IMAGE: 'Afbeelding' };
    const kaart = (x) => {
      if (x.soort === 'link') { const u = veilig(x.url); return u ? `<div class="sd-media-kaart"><div class="sd-media-kop"><span class="sd-media-soort">Link</span><b>${esc(x.kop || x.titel || new URL(u).hostname)}</b><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Openen</a></div></div>` : ''; }
      const type = String(x.type || '').toUpperCase(), bron = x.bron, voor = veilig(x.renderedPreviewUrl), dl = veilig(x.downloadUrl);
      const speler = bron && type === 'VIDEO' ? `<video controls preload="metadata" src="${esc(bron)}"${x.poster ? ` poster="${esc(x.poster)}"` : ''}></video>`
        : bron && type === 'AUDIO' ? `<audio controls preload="metadata" src="${esc(bron)}"></audio>`
          : bron && type === 'IMAGE' ? `<img src="${esc(bron)}" alt="${esc(x.title || 'Afbeelding van de student')}" loading="lazy">` : '';
      return `<div class="sd-media-kaart"><div class="sd-media-kop"><span class="sd-media-soort">${esc(NAAM[type] || (x.extension ? String(x.extension).toUpperCase() : 'Bestand'))}</span><b>${esc(x.kop || x.title || 'Bestand')}</b>${x.kop && x.title && x.kop !== x.title ? `<small>${esc(x.title)}</small>` : ''}${x.size ? `<small>${esc(x.size)}</small>` : ''}
        ${!speler && voor ? `<button type="button" data-sd-media="toon" data-adres="${esc(voor)}">Toon hier</button>` : ''}${dl ? `<a href="${esc(dl)}" target="_blank" rel="noopener noreferrer">Downloaden</a>` : ''}</div>${speler}</div>`;
    };
    const el = Object.assign(document.createElement('div'), { className: 'sd-media' });
    el.dataset.sleutel = sleutel;
    const n = media.filter((x) => x.soort === 'bestand').length, links = media.length - n;
    el.innerHTML = `<h3>Media op deze pagina</h3><p>Simulise toont de pagina hierboven als pdf. ${n ? `${n === 1 ? 'Het bestand' : `De ${n} bestanden`} van de student ${n === 1 ? 'staat' : 'staan'} hier, zodat je video en audio kunt afspelen` : 'De links van de student staan hier'}${n && links ? ', met de links erbij' : ''}.</p>${media.map(kaart).join('')}`;
    return el;
  },
});
