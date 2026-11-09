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
  const AANTALLEN = [200, 100, 50]; // de server kan een maximum hebben: dan een kleiner aantal proberen
  const QUERY = (n) => `query sdDocentTeller { viewer { id notifications(first: ${n}, unread: true) { data { id text } paginatorInfo { total } } } }`;
  // Wat de teller deed, voor het netwerkrapport van de Inspector (geen inhoud van meldingen).
  const status = window.__sdTellerStatus = { bronGevonden: false, pogingen: [] };
  const aan = () => { try { return localStorage.getItem('simDocentTeller') === '1'; } catch { return false; } };

  let bron = null;      // { url, init } van een GraphQL-verzoek van de app, om headers en verbinding te hergebruiken
  let bezig = false, wachtend = false;

  const vraagOp = async () => {
    status.aan = aan();
    if (!bron || !status.aan) return;
    if (bezig) { wachtend = true; return; }
    bezig = true;
    try {
      const { url, init } = bron;
      status.pogingen = [];
      for (const max of AANTALLEN) {
        const poging = { first: max, tijd: new Date().toISOString().slice(11, 19) };
        status.pogingen.push(poging);
        try {
          // Precies dezelfde verbinding als de app (headers, credentials, mode): niets zelf toevoegen.
          const opties = { method: 'POST', headers: init.headers, body: JSON.stringify({ operationName: 'sdDocentTeller', query: QUERY(max), variables: {} }) };
          if (init.credentials) opties.credentials = init.credentials;
          if (init.mode) opties.mode = init.mode;
          const res = await origFetch(url, opties);
          poging.http = res.status;
          const j = await res.json();
          poging.fouten = (j?.errors || []).map((e) => String(e.message || e).slice(0, 200));
          const n = j?.data?.viewer?.notifications;
          if (n) {
            poging.meldingen = (n.data || []).length;
            poging.totaal = n.paginatorInfo?.total ?? null;
            poging.tekstMetHtml = (n.data || []).some((x) => /<[a-z]/i.test(String(x.text || '')));
            window.postMessage({ type: 'sd-teller', totaal: poging.totaal, items: (n.data || []).map((x) => ({ id: x.id, text: String(x.text || '') })), max }, location.origin);
            break;
          }
        } catch (e) { poging.fout = String(e?.message || e).slice(0, 200); }
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
        status.bronGevonden = true;
        status.headers = init.headers ? Object.keys(init.headers instanceof Headers ? Object.fromEntries(init.headers) : init.headers) : [];
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
