/* Alles op één pagina in Beoordelen (draait in de pagina zelf, world MAIN, bij document_start).
 *
 * Simulise haalt de Beoordelen-lijst op met het GraphQL-verzoek assignmentsAssigned
 * (api.simulise.com/graphql, variabelen page en perPage, standaard 25). Staat in localStorage
 * simDocentPerPage (gezet door modules/beoordelen.js als "Alles op één pagina" aan staat), dan
 * vraagt dit script in plaats daarvan pagina 1 met zoveel rijen op. Zo kan de filter over de hele
 * lijst werken. Geeft de server een fout (bijvoorbeeld een maximum), dan probeert het een kleiner
 * aantal en anders het oorspronkelijke verzoek: de pagina werkt dan gewoon zoals altijd.
 * Alleen op /assignments/assigned; er worden geen gegevens bewaard of verstuurd.
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

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const aantal = gewenst();
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!aantal || !/\/graphql(\?|$)/.test(url) || !init || typeof init.body !== 'string') return origFetch.apply(this, arguments);
    for (const n of [aantal, 100].filter((n, i, a) => n > 25 && a.indexOf(n) === i)) {
      const body = pasAan(init.body, n);
      if (!body) break;
      try {
        const res = await origFetch.call(this, input, { ...init, body });
        if (await goed(res)) return res;
      } catch { /* volgende poging */ }
    }
    return origFetch.apply(this, arguments);
  };
})();
