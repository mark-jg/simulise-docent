/* Alles op één pagina in Beoordelen (draait in de pagina zelf, world MAIN, bij document_start).
 *
 * Simulise haalt de Beoordelen-lijst op met het GraphQL-verzoek assignmentsAssigned
 * (api.simulise.com/graphql, variabelen page en perPage, standaard 25). Staat in localStorage
 * simDocentPerPage (gezet door modules/beoordelen.js als "Alles op één pagina" aan staat), dan
 * vraagt dit script in plaats daarvan pagina 1 met zoveel rijen op. Zo kan de filter over de hele
 * lijst werken. Geeft de server een fout (bijvoorbeeld een maximum), dan probeert het een kleiner
 * aantal en anders het oorspronkelijke verzoek: de pagina werkt dan gewoon zoals altijd.
 * Alleen op /assignments/assigned; er worden geen gegevens bewaard of verstuurd.
 *
 * Mijn groepen: staat simDocentGroepen = 1 in localStorage (module beoordelen aan), dan leest dit
 * script uit hetzelfde antwoord welke groepen er zijn (aggregations.groups: naam en aantal) en bij
 * welke groep elke rij hoort (door de id's in de rij te vergelijken met die van de groepen). Dat
 * komt als JSON op <html data-sim-groepen>, voor modules/beoordelen.js. Gegevens van studenten
 * (het veld user) worden overgeslagen.
 *
 * Meldingenmenu: staat simDocentMeldingen = N (module meldingen aan), dan vraagt het verzoek
 * getLatestUnreadNotification (overal in de bovenbalk) N meldingen op in plaats van 5, zodat er na
 * het filteren nog genoeg overblijven. Bij een fout: het oorspronkelijke verzoek.
 */
(() => {
  if (window.__sdPerPagina) return;
  window.__sdPerPagina = true;
  const OPERATIE = 'assignmentsAssigned';

  const gewenst = () => {
    if (!location.pathname.startsWith('/assignments/assigned')) return 0;
    try { return parseInt(localStorage.getItem('simDocentPerPage'), 10) || 0; } catch { return 0; }
  };

  // Geeft een aangepaste body terug (string), of null als dit verzoek niet aangepast hoeft.
  const pasAan = (body, aantal) => {
    if (typeof body !== 'string' || !body.includes(OPERATIE)) return null;
    let j; try { j = JSON.parse(body); } catch { return null; }
    let geraakt = false;
    const een = (v) => {
      if (v && v.operationName === OPERATIE && v.variables && typeof v.variables.perPage === 'number' && v.variables.perPage < aantal) {
        v.variables.perPage = aantal; v.variables.page = 1; geraakt = true;
      }
    };
    Array.isArray(j) ? j.forEach(een) : een(j);
    return geraakt ? JSON.stringify(j) : null;
  };

  // Is het antwoord bruikbaar? (geen GraphQL-fout, wel gegevens)
  const goed = async (res) => {
    if (!res.ok) return false;
    try {
      const j = await res.clone().json();
      const lijst = Array.isArray(j) ? j : [j];
      return lijst.every((x) => !x.errors?.length && x.data);
    } catch { return false; }
  };

  const leesGroepen = () => {
    if (!location.pathname.startsWith('/assignments/assigned')) return false;
    try { return localStorage.getItem('simDocentGroepen') === '1'; } catch { return false; }
  };

  // Alle tekst-id's in een rij, behalve in de gegevens van personen.
  const OVERSLAAN = new Set(['user', 'users', 'currentReviewer', 'reviewers', 'author']);
  const ids = (v, uit = new Set(), d = 0) => {
    if (d > 6 || v == null) return uit;
    if (typeof v === 'string' || typeof v === 'number') { if (String(v).length >= 6) uit.add(String(v)); return uit; } // korte waarden (aantallen) niet
    if (Array.isArray(v)) { v.forEach((x) => ids(x, uit, d + 1)); return uit; }
    if (typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!OVERSLAAN.has(k)) ids(x, uit, d + 1);
    return uit;
  };

  const publiceer = (j) => {
    for (const x of Array.isArray(j) ? j : [j]) {
      const aa = x?.data?.assignedAssignments;
      if (!aa) continue;
      const groepen = (aa.aggregations?.groups || []).map((g) => {
        const ac = g.item?.autocompletion || {};
        const sleutels = [g.key, ac.id, ac.value].filter((s) => s != null && s !== '').map(String);
        sleutels.push(...sleutels.map((s) => s.replace(/^[a-z_]+:/i, '')));
        return { key: String(g.key), naam: String(ac.text ?? g.key).slice(0, 80), aantal: g.count ?? null, sleutels: [...new Set(sleutels)] };
      });
      const rijen = {};
      for (const d of aa.data || []) {
        if (!d?.id) continue;
        const inRij = ids(d);
        rijen[d.id] = groepen.filter((g) => g.sleutels.some((s) => inRij.has(s))).map((g) => g.key);
      }
      document.documentElement.setAttribute('data-sim-groepen', JSON.stringify({
        groepen: groepen.map(({ key, naam, aantal }) => ({ key, naam, aantal })), rijen,
      }));
      window.postMessage({ type: 'sd-groepen' }, location.origin);
    }
  };

  const MELD = 'getLatestUnreadNotification';
  const meldAantal = () => { try { return parseInt(localStorage.getItem('simDocentMeldingen'), 10) || 0; } catch { return 0; } };
  const meerMeldingen = (body, n) => {
    if (typeof body !== 'string' || !body.includes(MELD)) return null;
    let j; try { j = JSON.parse(body); } catch { return null; }
    let geraakt = false;
    const een = (v) => {
      if (v?.operationName !== MELD || typeof v.query !== 'string') return;
      v.query = v.query.replace(/notifications\(\s*first:\s*(\d+)/, (m, k) => (Number(k) < n ? ((geraakt = true), `notifications(first: ${n}`) : m));
    };
    Array.isArray(j) ? j.forEach(een) : een(j);
    return geraakt ? JSON.stringify(j) : null;
  };

  const origFetch = window.fetch;
  const metGroepen = (res, init) => {
    if (leesGroepen() && init.body.includes(OPERATIE)) res.clone().json().then(publiceer, () => {});
    return res;
  };

  window.fetch = async function (input, init) {
    const aantal = gewenst();
    const url = typeof input === 'string' ? input : input?.url || '';
    const mn = meldAantal();
    if (mn && init && typeof init.body === 'string' && init.body.includes(MELD) && /\/graphql(\?|$)/.test(url)) {
      const body = meerMeldingen(init.body, mn);
      if (body) {
        try { const res = await origFetch.call(this, input, { ...init, body }); if (await goed(res)) return res; } catch { /* origineel */ }
      }
      return origFetch.apply(this, arguments);
    }
    if ((!aantal && !leesGroepen()) || !/\/graphql(\?|$)/.test(url) || !init || typeof init.body !== 'string') return origFetch.apply(this, arguments);
    if (aantal) {
      for (const n of [aantal, 100].filter((n, i, a) => n > 25 && a.indexOf(n) === i)) {
        const body = pasAan(init.body, n);
        if (!body) break;
        try {
          const res = await origFetch.call(this, input, { ...init, body });
          if (await goed(res)) return metGroepen(res, init);
        } catch { /* volgende poging */ }
      }
    }
    return metGroepen(await origFetch.apply(this, arguments), init);
  };
})();
