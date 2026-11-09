/* Netwerklog voor de Inspector (draait in de pagina zelf, world MAIN, bij document_start).
 * Legt alleen vast als de ontwikkelaarsmodus aan staat (attribuut data-sim-netlog op <html>, gezet
 * door modules/inspector.js). Bewaard wordt per verzoek alleen de OPBOUW: methode, adres, de namen
 * van parameters en velden, en het type van elk veld. Waarden worden niet bewaard, behalve getallen
 * bij paginering (page, per_page, limit, ...) en korte vaste codes (zoals HANDED_IN). Alles blijft in
 * het geheugen van dit tabblad; de Inspector vraagt het op met toets N en maskeert de adressen.
 */
(() => {
  if (window.__sdNetlog) return;
  window.__sdNetlog = true;
  const log = [];
  const MAX = 200;
  const aan = () => document.documentElement.hasAttribute('data-sim-netlog');
  const PAGINA = /^(limit|offset|page|per_?page|perPage|page_?size|pageSize|size|first|last|skip|take|count|total|total_?count|totalCount|current_?page|currentPage|last_?page|lastPage|from|to)$/i;
  const CODE = /^[A-Z][A-Z_]{1,30}(,[A-Z][A-Z_]{1,30})*$/; // bijv. HANDED_IN of BEING_PROCESSED,HANDED_IN

  // Opbouw van een waarde: objecten en arrays worden doorlopen, waarden worden hun type.
  const vorm = (v, sleutel = '', d = 0) => {
    if (d > 7) return '…';
    if (Array.isArray(v)) return v.length ? [vorm(v[0], sleutel, d + 1), `× ${v.length}`] : [];
    if (v && typeof v === 'object') {
      const o = {};
      for (const k of Object.keys(v).slice(0, 80)) {
        // Sleutels die zelf gegevens zijn (id's, uuid's, @gebruikers) niet overnemen
        const s = /^\d+$/.test(k) ? '{id}' : /^[0-9a-f-]{20,}$/i.test(k) ? '{uuid}' : /@|\s/.test(k) ? '{sleutel}' : k;
        if (!(s in o)) o[s] = vorm(v[k], k, d + 1);
      }
      return o;
    }
    if (typeof v === 'number' && PAGINA.test(sleutel)) return v;
    if (typeof v === 'string' && CODE.test(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v) && PAGINA.test(sleutel)) return Number(v);
    return v === null ? 'null' : typeof v;
  };

  const parseBody = (body) => {
    if (!body || typeof body !== 'string') return body instanceof FormData ? { formulier: [...body.keys()] } : null;
    try {
      const j = JSON.parse(body);
      // GraphQL: naam en eerste regel van de query (schema, geen gegevens) + vorm van de variabelen
      if (j && typeof j === 'object' && 'query' in j) {
        return { graphql: j.operationName || null, query: String(j.query).replace(/"(?:[^"\\]|\\.)*"/g, '"…"').replace(/\s+/g, ' ').slice(0, 300), variabelen: vorm(j.variables || {}) };
      }
      return vorm(j);
    } catch {
      try { const p = new URLSearchParams(body); return { formulier: Object.fromEntries([...p].map(([k, v]) => [k, vorm(v, k)])) }; } catch { return null; }
    }
  };

  const noteer = (methode, url, body, status, tekst, type) => {
    if (!aan() || log.length >= MAX) return;
    let antwoord = null;
    if (tekst && /json/i.test(type || '') || /^\s*[{[]/.test(tekst || '')) {
      try { antwoord = vorm(JSON.parse(tekst)); } catch { antwoord = null; }
    }
    log.push({ methode, url: String(url), body: parseBody(body), status, type: (type || '').split(';')[0], antwoord, tijd: Date.now() });
  };

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const res = await origFetch.apply(this, arguments);
    if (aan()) {
      try {
        const url = typeof input === 'string' ? input : input?.url;
        const methode = (init?.method || input?.method || 'GET').toUpperCase();
        const body = init?.body;
        const type = res.headers.get('content-type');
        if (/json/i.test(type || '')) res.clone().text().then((t) => noteer(methode, url, body, res.status, t, type), () => {});
        else noteer(methode, url, body, res.status, null, type);
      } catch { /* nooit de pagina breken */ }
    }
    return res;
  };

  const XHR = XMLHttpRequest.prototype;
  const origOpen = XHR.open, origSend = XHR.send;
  XHR.open = function (methode, url) { this.__sd = { methode: String(methode).toUpperCase(), url }; return origOpen.apply(this, arguments); };
  XHR.send = function (body) {
    if (aan() && this.__sd) {
      this.addEventListener('load', () => {
        try {
          const type = this.getResponseHeader('content-type');
          const tekst = (this.responseType === '' || this.responseType === 'text') ? this.responseText : null;
          noteer(this.__sd.methode, new URL(this.__sd.url, location.href).href, body, this.status, tekst, type);
        } catch { /* nooit de pagina breken */ }
      });
    }
    return origSend.apply(this, arguments);
  };

  window.addEventListener('message', (e) => {
    if (e.source === window && e.data?.type === 'sd-netlog-vraag') window.postMessage({ type: 'sd-netlog-antwoord', log }, location.origin);
  });
})();
