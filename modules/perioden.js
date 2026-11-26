/* Perioden: de periodes van het schooljaar, gedeeld door de modules (matrix, klaspagina) en het zijpaneel.
 *
 * De periodes staan in het gekozen rapportprofiel (chrome.storage.local rpProfielen / rpGekozen, zie rapport/standaard.js):
 * code, naam, van, tot (JJJJ-MM-DD), moment, beslis, norm, doel, regels. Je stelt ze in via het zijpaneel van de extensie
 * (Periodes en normen) of op de pagina Rapportprofielen; een toetsplan van het team (rapport/bron.js) brengt ze mee.
 * Zo gebruiken het voortgangsrapport, de vergaderlijst, de opdrachten van een klas en de deadlines dezelfde periodes.
 *
 *   SD.perioden.laad()        leest het gekozen profiel; geeft de lijst
 *   SD.perioden.lijst         [{ code, naam, van, tot, ... }] op volgorde van begindatum
 *   SD.perioden.huidige(d)    de periode waar datum d (JJJJ-MM-DD, standaard vandaag) in valt, anders de laatst begonnen, anders null
 *   SD.perioden.vind(code)    één periode
 *   SD.perioden.volg(fn)      fn wordt aangeroepen als de periodes veranderen; geeft een functie terug om te stoppen
 */
SD.perioden = {
  lijst: [],
  profielNaam: '',
  _luisteraars: new Set(),
  _gestart: false,

  volg(fn) { this._luisteraars.add(fn); return () => this._luisteraars.delete(fn); },
  vind(code) { return this.lijst.find((p) => p.code === code) || null; },
  vandaag() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  huidige(datum = this.vandaag()) {
    return this.lijst.find((p) => p.van <= datum && datum <= p.tot) || [...this.lijst].reverse().find((p) => p.van <= datum) || null;
  },
  /* Valt een datum (JJJJ-MM-DD) in de periode met deze code? Zonder code: altijd. */
  bevat(code, datum) { const p = code && this.vind(code); return !p || (!!datum && p.van <= datum && datum <= p.tot); },

  async laad() {
    if (!this._gestart) {
      this._gestart = true;
      chrome.storage.onChanged.addListener((w, gebied) => { if (gebied === 'local' && (w.rpProfielen || w.rpGekozen)) this.laad(); });
    }
    const s = await chrome.storage.local.get({ rpProfielen: null, rpGekozen: null });
    const profielen = Array.isArray(s.rpProfielen) && s.rpProfielen.length ? s.rpProfielen : [globalThis.SD_RAPPORT_STANDAARD].filter(Boolean);
    const profiel = profielen.find((p) => p.id === s.rpGekozen) || profielen[0] || null;
    const lijst = (profiel?.perioden || []).filter((p) => p?.code && /^\d{4}-\d{2}-\d{2}$/.test(p.van || '') && /^\d{4}-\d{2}-\d{2}$/.test(p.tot || '')).slice().sort((a, b) => a.van.localeCompare(b.van));
    const anders = JSON.stringify(lijst) !== JSON.stringify(this.lijst);
    this.lijst = lijst; this.profielNaam = profiel?.naam || '';
    if (anders) this._luisteraars.forEach((fn) => { try { fn(lijst); } catch { /* luisteraar */ } });
    return lijst;
  },
};
