/* GraphQL-brug (draait in de pagina zelf, world MAIN, bij document_start).
 *
 * Content scripts van de extensie kunnen niet zelf met de sessie van Simulise praten. Dit script
 * onthoudt de verbinding (url, headers, credentials) van het eerste GraphQL-verzoek van de app en
 * voert daarmee vragen uit die het via postMessage krijgt:
 *   { type: 'sd-gql', id, operationName, query, variables }  ->  { type: 'sd-gql-antwoord', id, http, data, errors }
 * Daarnaast kijkt het mee met een paar vragen van de app zelf (leerlijndiagram op een profiel): de tekst
 * van de vraag, de variabelen en de lijst opleidingen. Op verzoek ({ type: 'sd-gql-app' }) geeft het die
 * terug, zodat het rapport precies dezelfde vraag kan stellen als Simulise.
 * Gebruikt door modules/rapporten.js (voortgangsrapporten). Er wordt niets bewaard of elders heen gestuurd:
 * het verzoek gaat naar dezelfde server als de app, met je eigen sessie.
 */
(() => {
  if (window.__sdGql) return;
  window.__sdGql = true;
  let bron = null;
  const wachtrij = [];
  const MEEKIJKEN = new Set(['dashboardTileEducationDiagram', 'getUserEducationDiagram', 'dashboardDiscoverUser', 'dashboardTileProfile']);
  const app = { vragen: {}, variabelen: {}, opleidingen: null, gebruikerId: null };

  const voer = async (v) => {
    const antwoord = (x) => window.postMessage({ type: 'sd-gql-antwoord', id: v.id, ...x }, location.origin);
    try {
      const opties = { method: 'POST', headers: bron.init.headers, body: JSON.stringify({ operationName: v.operationName, query: v.query, variables: v.variables || {} }) };
      if (bron.init.credentials) opties.credentials = bron.init.credentials;
      if (bron.init.mode) opties.mode = bron.init.mode;
      const res = await origFetch(bron.url, opties);
      const j = await res.json();
      antwoord({ http: res.status, data: j.data ?? null, errors: (j.errors || []).map((e) => String(e.message || e).slice(0, 300)) });
    } catch (e) {
      antwoord({ http: 0, data: null, errors: [String(e?.message || e)] });
    }
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    let meekijk = null;
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (/\/\/api\.simulise\.com\/graphql/.test(url) && init && typeof init.body === 'string') {
        const j = JSON.parse(init.body);
        if (MEEKIJKEN.has(j?.operationName)) {
          app.vragen[j.operationName] = j.query;
          app.variabelen[j.operationName] = j.variables || {};
          meekijk = j.operationName;
        }
      }
      if (!bron && /\/\/api\.simulise\.com\/graphql/.test(url) && init && typeof init.body === 'string' && !/sdDocent|sdRapport/.test(init.body)) {
        bron = { url, init: { headers: init.headers, credentials: init.credentials, mode: init.mode } };
        wachtrij.splice(0).forEach(voer);
      }
    } catch { /* nooit de pagina breken */ }
    const p = origFetch.apply(this, arguments);
    if (meekijk === 'dashboardTileEducationDiagram') {
      p.then((res) => res.clone().json()).then((j) => {
        const d = j?.data?.dashboard;
        if (d?.educations) { app.opleidingen = d.educations.map((e) => ({ id: e.id, name: e.name, groups: e.groups || [] })); app.gebruikerId = d.id || null; }
      }).catch(() => {});
    }
    return p;
  };

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === 'sd-gql-app') { window.postMessage({ type: 'sd-gql-app-antwoord', id: e.data.id, app: JSON.parse(JSON.stringify(app)) }, location.origin); return; }
    if (e.data?.type !== 'sd-gql') return;
    if (bron) voer(e.data); else wachtrij.push(e.data);
  });
})();
