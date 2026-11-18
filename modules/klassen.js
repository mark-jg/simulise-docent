/* Klassen: je huidige groepen in Simulise, elk met een vaste kleur. Gedeeld door de schil
 * (zijbalk, klas bij een rij in Beoordelen) en het scherm Vandaag (thuispagina per klas).
 *
 * Gegevens via SD.gql (modules/gql.js), met je eigen sessie:
 *   sdDocentKlassen       viewer.groupsByType(only: SCHOOL_GROUP) { id name isArchived }   (gearchiveerde vallen weg)
 *   sdDocentKlasTellers   assignedAssignments(filters: open).aggregations.groups { key count }   (wat op jou wacht per klas)
 * Onthouden in chrome.storage.local sdKlassen = { tijd, lijst: [{ id, naam, wacht }] }: alleen klasnamen en aantallen.
 * De kleur volgt uit de plek in de lijst op naam, zodat een klas overal dezelfde kleur heeft.
 */
SD.klassen = {
  KLEUREN: ['#4f5bd5', '#0e9f8a', '#d9722a', '#c2447a', '#7a55c7', '#2f8fd0', '#7d8a1f', '#b8483a'],
  MAX_LEEFTIJD: 5 * 60 * 1000,
  OPEN: 'status:BEING_PROCESSED,FEEDBACK_ASKED,HANDED_IN',
  Q_KLASSEN: `query sdDocentKlassen($page: Int, $perPage: Int!, $filters: [String!]!, $only: GroupType!) {
    viewer { id groupsByType(page: $page, first: $perPage, filters: $filters, only: $only) {
      data { __typename ... on SchoolGroup { id name isArchived } } paginatorInfo { hasMorePages } } } }`,
  Q_TELLERS: `query sdDocentKlasTellers($page: Int!, $perPage: Int!, $filters: [String!]!) {
    assignedAssignments(page: $page, first: $perPage, filters: $filters) { data { id } aggregations { groups { key count } __typename } } }`,

  lijst: [],
  _luisteraars: new Set(),
  _bezig: null,

  /* fn wordt aangeroepen als de lijst verandert. Geeft een functie terug om te stoppen. */
  volg(fn) { this._luisteraars.add(fn); return () => this._luisteraars.delete(fn); },
  _zet(lijst) {
    const oud = JSON.stringify(this.lijst);
    this.lijst = lijst;
    if (JSON.stringify(lijst) !== oud) this._luisteraars.forEach((fn) => { try { fn(lijst); } catch { /* luisteraar */ } });
  },

  vind(id) { return this.lijst.find((k) => k.id === id) || null; },
  naam(id) { return this.vind(id)?.naam || null; },
  kleur(id) {
    const i = this.lijst.findIndex((k) => k.id === id);
    return i < 0 ? null : this.KLEUREN[i % this.KLEUREN.length];
  },

  /* Laadt de klassen: eerst wat onthouden is (direct), daarna zo nodig vers uit Simulise. */
  async laad(vers = false) {
    if (!this.lijst.length) {
      const { sdKlassen } = await chrome.storage.local.get({ sdKlassen: null });
      if (Array.isArray(sdKlassen?.lijst)) { this._tijd = sdKlassen.tijd || 0; this._zet(sdKlassen.lijst); }
    }
    if (!vers && this._tijd && Date.now() - this._tijd < this.MAX_LEEFTIJD) return this.lijst;
    this._bezig = this._bezig || this._haal().finally(() => { this._bezig = null; });
    return this._bezig;
  },

  async _haal() {
    const groepen = [];
    for (let page = 1; page <= 5; page++) {
      const r = await SD.gql('sdDocentKlassen', this.Q_KLASSEN, { page, perPage: 50, filters: [], only: 'SCHOOL_GROUP' });
      const g = r.data?.viewer?.groupsByType;
      if (!g) return this.lijst; // geen antwoord: houden wat er was
      groepen.push(...(g.data || []).filter((x) => x?.id && x.name && !x.isArchived));
      if (!g.paginatorInfo?.hasMorePages) break;
    }
    const t = await SD.gql('sdDocentKlasTellers', this.Q_TELLERS, { page: 1, perPage: 1, filters: [this.OPEN] });
    const wacht = {};
    for (const g of t.data?.assignedAssignments?.aggregations?.groups || []) wacht[String(g.key)] = g.count || 0;
    const lijst = groepen.map((g) => ({ id: String(g.id), naam: String(g.name).slice(0, 60), wacht: wacht[String(g.id)] || 0 }))
      .sort((a, b) => a.naam.localeCompare(b.naam) || a.id.localeCompare(b.id));
    this._tijd = Date.now();
    await chrome.storage.local.set({ sdKlassen: { tijd: this._tijd, lijst } });
    this._zet(lijst);
    return lijst;
  },
};
