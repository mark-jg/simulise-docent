/* Gedeelde bronnen voor de rapporten: het toetsplan van het team en de aanwezigheid, elk achter een gedeelde
 * OneDrive- of SharePoint-link. Zo werkt het hele team met dezelfde normen en dezelfde cijfers.
 *
 *   Toetsplan      een profielbestand (.json), geëxporteerd op de pagina Rapportprofielen en op OneDrive gezet.
 *                  Wordt bewaard als gewoon profiel (rpProfielen, met gedeeld: true) en hooguit eens per 12 uur ververst.
 *   Aanwezigheid   een Excel-bestand (.xlsx) of CSV: een rij per student. Wordt bij elk rapport opnieuw gelezen en
 *                  blijft alleen in het geheugen; er wordt niets van bewaard.
 *
 * Instellingen in chrome.storage.local rpBron = { profielUrl, aanwezigUrl, profielTijd, profielFout }: alleen links en
 * tijden, geen gegevens van studenten. Het ophalen doet background.js (bericht sdBron), alleen bij Microsoft
 * (sharepoint.com, 1drv.ms, onedrive.live.com) en alleen nadat je daar op de pagina Rapportprofielen toestemming voor
 * gaf. Er wordt alleen gelezen: er gaat niets van Simulise naar Microsoft.
 *
 * Kolommen in het aanwezigheidsbestand worden herkend aan hun kop (hoofdletters en volgorde maken niet uit):
 *   naam          "Naam", "Student", "Leerling", "Volledige naam"; of "Voornaam" + "Achternaam" (+ "Tussenvoegsel")
 *   klas          "Klas", "Groep"
 *   aanwezig      "Aanwezig", "Aanwezigheid", "Presentie" (percentage: 86, 86% of 0,86)
 *   afwezig       "Afwezig" (percentage; aanwezig wordt dan 100 min dit)
 *   ongeoorloofd  "Ongeoorloofd" (aantal)      geoorloofd  "Geoorloofd" (aantal)      te laat  "Te laat", "Laat" (aantal)
 *   opmerking     "Opmerking", "Toelichting", "Notitie"
 * Een profiel kan eigen koppen opgeven: aanwezigheid.kolommen = { aanwezig: "Presentie %", ... }.
 */
(() => {
  const ORIGINS = ['https://*.sharepoint.com/*', 'https://1drv.ms/*', 'https://onedrive.live.com/*', 'https://api.onedrive.com/*', 'https://*.1drv.com/*'];
  const MAX_LEEFTIJD = 12 * 60 * 60 * 1000;
  const plat = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const KOPPEN = {
    naam: ['naam', 'student', 'leerling', 'volledige naam', 'naam student', 'studentnaam', 'deelnemer'],
    voornaam: ['voornaam', 'roepnaam'], tussen: ['tussenvoegsel', 'tussenvoegsels', 'tv'], achternaam: ['achternaam'],
    klas: ['klas', 'groep', 'klasgroep', 'stamgroep'],
    aanwezig: ['aanwezig', 'aanwezigheid', 'presentie', 'aanwezig %', 'aanwezigheid %', 'presentie %', '% aanwezig'],
    afwezig: ['afwezig', 'afwezigheid', 'afwezig %', 'afwezigheid %', 'verzuim', 'verzuim %'],
    ongeoorloofd: ['ongeoorloofd', 'ongeoorloofd afwezig', 'ongeoorloofd verzuim', 'ongeoorloofde afwezigheid'],
    geoorloofd: ['geoorloofd', 'geoorloofd afwezig', 'geoorloofd verzuim'],
    teLaat: ['te laat', 'laat', 'te laat komen'],
    opmerking: ['opmerking', 'opmerkingen', 'toelichting', 'notitie'],
  };

  async function instellingen() { return (await chrome.storage.local.get({ rpBron: {} })).rpBron || {}; }
  async function bewaar(patch) { const nu = await instellingen(); const nieuw = { ...nu, ...patch }; await chrome.storage.local.set({ rpBron: nieuw }); return nieuw; }

  /* Haalt een bestand op via background.js. Geeft Uint8Array, of gooit een fout met een uitleg in gewone taal. */
  async function haal(url) {
    let a;
    try { a = await chrome.runtime.sendMessage({ type: 'sdBron', url }); } catch (e) { throw new Error('de extensie gaf geen antwoord; herlaad de pagina'); }
    if (!a || a.fout) throw new Error(a?.fout || 'geen antwoord');
    const bin = atob(a.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  /* Controle van een profiel (zelfde regels als op de pagina Rapportprofielen); geeft een foutmelding of null. */
  function controleer(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return 'het bestand is geen profiel';
    if (!p.id || !p.naam) return 'het profiel heeft een "id" en een "naam" nodig';
    if (!Array.isArray(p.opleidingen) || !p.opleidingen.length) return '"opleidingen" moet een lijst met minstens één opleiding zijn';
    for (const o of p.opleidingen) {
      if (!o.rol || !o.herken) return 'elke opleiding heeft een "rol" en "herken" nodig';
      try { new RegExp(o.herken, 'i'); } catch { return `"herken" van ${o.rol} is geen geldige zoektekst`; }
    }
    if (!Array.isArray(p.perioden)) return '"perioden" moet een lijst zijn';
    for (const x of p.perioden) if (!x.code || !/^\d{4}-\d{2}-\d{2}$/.test(x.van || '') || !/^\d{4}-\d{2}-\d{2}$/.test(x.tot || '')) return `periode ${x.code || '?'}: "code", "van" en "tot" (JJJJ-MM-DD) zijn nodig`;
    return null;
  }

  /* Het gedeelde toetsplan ophalen en als profiel bewaren. Geeft het profiel, of null als er geen link is.
   * Zonder vers = true alleen als de vorige keer langer dan 12 uur geleden is. Lukt het niet, dan blijft het oude staan. */
  async function profiel(vers = false) {
    const s = await instellingen();
    if (!s.profielUrl) return null;
    const opslag = await chrome.storage.local.get({ rpProfielen: null, rpGekozen: null });
    const lijst = Array.isArray(opslag.rpProfielen) && opslag.rpProfielen.length ? opslag.rpProfielen : [JSON.parse(JSON.stringify(globalThis.SD_RAPPORT_STANDAARD))];
    const oud = lijst.find((p) => p.gedeeld) || null;
    if (!vers && oud && s.profielTijd && Date.now() - s.profielTijd < MAX_LEEFTIJD) return oud;
    try {
      const bytes = await haal(s.profielUrl);
      let p;
      try { p = JSON.parse(new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '')); } catch { throw new Error('het bestand achter de link is geen profielbestand (.json)'); }
      const fout = controleer(p);
      if (fout) throw new Error(fout);
      p.gedeeld = true;
      const nieuw = [...lijst.filter((x) => !x.gedeeld && x.id !== p.id), p];
      await chrome.storage.local.set({ rpProfielen: nieuw, rpGekozen: p.id });
      await bewaar({ profielTijd: Date.now(), profielFout: null });
      return p;
    } catch (e) {
      await bewaar({ profielFout: String(e.message || e), ...(vers ? {} : { profielTijd: Date.now() - MAX_LEEFTIJD + 30 * 60 * 1000 }) }); // over een half uur opnieuw
      if (vers) throw e;
      return oud;
    }
  }

  const getal = (v) => {
    if (typeof v === 'number') return v;
    const t = String(v ?? '').replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
    return t === '' || !Number.isFinite(Number(t)) ? null : Number(t);
  };

  /* Naam als sleutel: woorden zonder accenten en leestekens, gesorteerd (zo maakt "Achternaam, Voornaam" niet uit). */
  const naamSleutel = (naam) => plat(String(naam).replace(/%/g, ' ')).split(' ').filter(Boolean).sort().join(' ');

  /* Rijen uit het bestand -> { lijst: [{ naam, sleutel, klas, pct, ongeoorloofd, geoorloofd, teLaat, opmerking }], kolommen: [gevonden] }. */
  function leesAanwezigheid(rijen, eigen = {}) {
    const zoek = { ...KOPPEN };
    for (const [k, v] of Object.entries(eigen || {})) if (v && zoek[k]) zoek[k] = [plat(v), ...zoek[k]];
    let kopRij = -1, kol = {};
    for (let i = 0; i < Math.min(rijen.length, 15); i++) {
      const koppen = (rijen[i] || []).map(plat);
      const k = {};
      for (const [veld, namen] of Object.entries(zoek)) { const j = koppen.findIndex((c) => c && namen.includes(c)); if (j >= 0) k[veld] = j; }
      if ((k.naam != null || k.achternaam != null) && Object.keys(k).length > Object.keys(kol).length) { kopRij = i; kol = k; }
    }
    if (kopRij < 0) throw new Error('geen kolom met de naam van de student gevonden (verwacht een kop als "Naam" of "Voornaam" en "Achternaam")');
    const cel = (r, veld) => (kol[veld] == null ? '' : r[kol[veld]] ?? '');
    const ruw = [];
    for (const r of rijen.slice(kopRij + 1)) {
      const naam = kol.naam != null ? String(cel(r, 'naam')).trim() : [cel(r, 'voornaam'), cel(r, 'tussen'), cel(r, 'achternaam')].map((x) => String(x).trim()).filter(Boolean).join(' ');
      if (!naam) continue;
      const aanw = getal(cel(r, 'aanwezig')), afw = getal(cel(r, 'afwezig'));
      ruw.push({ naam, sleutel: naamSleutel(naam), klas: String(cel(r, 'klas')).trim(), aanw, afw,
        ongeoorloofd: getal(cel(r, 'ongeoorloofd')), geoorloofd: getal(cel(r, 'geoorloofd')), teLaat: getal(cel(r, 'teLaat')), opmerking: String(cel(r, 'opmerking')).trim() });
    }
    // Excel bewaart 86% als 0,86: als alle percentages tussen 0 en 1 liggen, is het een breuk.
    const breuk = (veld) => { const w = ruw.map((x) => x[veld]).filter((x) => x != null); return w.length > 0 && w.every((x) => x >= 0 && x <= 1) && w.some((x) => x > 0 && x < 1); };
    const fa = breuk('aanw') ? 100 : 1, ff = breuk('afw') ? 100 : 1;
    const rond = (x) => Math.round(x * 10) / 10;
    const lijst = ruw.map(({ aanw, afw, ...x }) => ({ ...x, pct: aanw != null ? rond(aanw * fa) : afw != null ? rond(100 - afw * ff) : null }));
    return { lijst, kolommen: Object.keys(kol) };
  }

  /* De aanwezigheid ophalen. Geeft { lijst, kolommen } of null als er geen link is. */
  async function aanwezigheid(profielVanNu) {
    const s = await instellingen();
    if (!s.aanwezigUrl) return null;
    const rijen = await SDXlsx.lees(await haal(s.aanwezigUrl));
    return leesAanwezigheid(rijen, profielVanNu?.aanwezigheid?.kolommen);
  }

  /* Zet bij elke student g.aanwezig (of null). Koppelt op naam; bij dubbele namen ook op klas. Geeft het aantal gekoppelde studenten. */
  function koppel(studenten, lijst) {
    const per = new Map();
    for (const a of lijst || []) { const l = per.get(a.sleutel) || []; l.push(a); per.set(a.sleutel, l); }
    let n = 0;
    for (const g of studenten) {
      const kandidaten = per.get(naamSleutel(g.student?.naam || '')) || [];
      const klas = plat(g.student?.groep || '');
      const raak = kandidaten.length > 1 ? (kandidaten.find((a) => plat(a.klas) === klas) || null) : kandidaten[0] || null;
      g.aanwezig = raak ? { pct: raak.pct, ongeoorloofd: raak.ongeoorloofd, geoorloofd: raak.geoorloofd, teLaat: raak.teLaat, opmerking: raak.opmerking } : null;
      if (raak) n++;
    }
    return n;
  }

  globalThis.SDBron = { ORIGINS, instellingen, bewaar, haal, profiel, aanwezigheid, leesAanwezigheid, koppel, controleer, naamSleutel };
})();
