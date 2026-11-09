/* Meldingenteller (draait in de pagina zelf, world MAIN, bij document_start).
 *
 * Staat simDocentTeller = 1 in localStorage (module meldingen aan), dan vraagt dit script na het
 * laden de ongelezen meldingen op bij api.simulise.com/graphql (tot 200), met dezelfde verbinding en
 * dezelfde headers als Simulise zelf gebruikt (afgekeken van het eerste GraphQL-verzoek van de app).
 * Het resultaat (id en tekst per melding, en het totaal) gaat via postMessage naar
 * modules/meldingen.js, dat telt welke meldingen relevant zijn en de teller aanpast.
 * Er wordt niets bewaard; alles gebeurt met je eigen sessie bij Simulise.
 */
(() => {
  if (window.__sdTeller) return;
  window.__sdTeller = true;
  const MAX = 200;
  const QUERY = `query sdDocentTeller { viewer { id notifications(first: ${MAX}, unread: true) { data { id text } paginatorInfo { total } } } }`;
  const aan = () => { try { return localStorage.getItem('simDocentTeller') === '1'; } catch { return false; } };

  let bron = null;      // { url, init } van een GraphQL-verzoek van de app, om headers en verbinding te hergebruiken
  let bezig = false, wachtend = false;

  const vraagOp = async () => {
    if (!bron || !aan()) return;
    if (bezig) { wachtend = true; return; }
    bezig = true;
    try {
      const { url, init } = bron;
      // Precies dezelfde verbinding als de app (headers, credentials, mode): niets zelf toevoegen.
      const opties = { method: 'POST', headers: init.headers, body: JSON.stringify({ operationName: 'sdDocentTeller', query: QUERY, variables: {} }) };
      if (init.credentials) opties.credentials = init.credentials;
      if (init.mode) opties.mode = init.mode;
      const res = await origFetch(url, opties);
      const j = await res.json();
      const n = j?.data?.viewer?.notifications;
      if (n) {
        window.postMessage({ type: 'sd-teller', totaal: n.paginatorInfo?.total ?? null, items: (n.data || []).map((x) => ({ id: x.id, text: String(x.text || '') })), max: MAX }, location.origin);
      }
    } catch { /* teller blijft zoals Simulise hem toont */ }
    bezig = false;
    if (wachtend) { wachtend = false; vraagOp(); }
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!bron && /\/\/api\.simulise\.com\/graphql/.test(url) && init && typeof init.body === 'string' && !init.body.includes('sdDocentTeller')) {
        bron = { url, init: { headers: init.headers, credentials: init.credentials, mode: init.mode } };
        setTimeout(vraagOp, 300);
      }
    } catch { /* nooit de pagina breken */ }
    return origFetch.apply(this, arguments);
  };

  // modules/meldingen.js vraagt opnieuw op als Simulise de teller zelf bijwerkt.
  window.addEventListener('message', (e) => {
    if (e.source === window && e.data?.type === 'sd-teller-vraag') vraagOp();
  });
})();
