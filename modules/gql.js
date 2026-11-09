/* GraphQL-brug (draait in de pagina zelf, world MAIN, bij document_start).
 *
 * Content scripts van de extensie kunnen niet zelf met de sessie van Simulise praten. Dit script
 * onthoudt de verbinding (url, headers, credentials) van het eerste GraphQL-verzoek van de app en
 * voert daarmee vragen uit die het via postMessage krijgt:
 *   { type: 'sd-gql', id, operationName, query, variables }  ->  { type: 'sd-gql-antwoord', id, http, data, errors }
 * Gebruikt door modules/rapporten.js (voortgangsrapporten). Er wordt niets bewaard of elders heen gestuurd:
 * het verzoek gaat naar dezelfde server als de app, met je eigen sessie.
 */
(() => {
  if (window.__sdGql) return;
  window.__sdGql = true;
  let bron = null;
  const wachtrij = [];

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
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!bron && /\/\/api\.simulise\.com\/graphql/.test(url) && init && typeof init.body === 'string' && !/sdDocent|sdRapport/.test(init.body)) {
        bron = { url, init: { headers: init.headers, credentials: init.credentials, mode: init.mode } };
        wachtrij.splice(0).forEach(voer);
      }
    } catch { /* nooit de pagina breken */ }
    return origFetch.apply(this, arguments);
  };

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.type !== 'sd-gql') return;
    if (bron) voer(e.data); else wachtrij.push(e.data);
  });
})();
