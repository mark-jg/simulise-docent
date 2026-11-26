/* Een Excel-bestand (.xlsx) of CSV lezen, zonder bibliotheek en zonder iets te bewaren.
 *
 *   SDXlsx.lees(bytes)   Uint8Array of ArrayBuffer -> Promise<rijen>: het eerste werkblad als lijst van rijen,
 *                        elke rij een lijst van cellen (tekst of getal). Een bestand dat niet met "PK" begint,
 *                        wordt als CSV gelezen (komma, puntkomma of tab).
 *
 * Een .xlsx is een zip met XML. Gelezen worden: xl/workbook.xml (het eerste blad), xl/sharedStrings.xml (teksten)
 * en dat ene werkblad. Uitpakken gaat met DecompressionStream van de browser. Opmaak, formules (alleen de
 * uitkomst), datums als getal en andere bladen blijven buiten beschouwing.
 */
(() => {
  const tekst = (bytes) => new TextDecoder('utf-8').decode(bytes);

  /* De bestanden in een zip: naam -> functie die de inhoud geeft. */
  function zip(bytes) {
    const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eind = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) if (d.getUint32(i, true) === 0x06054b50) { eind = i; break; }
    if (eind < 0) throw new Error('dit is geen geldig Excel-bestand (.xlsx)');
    const aantal = d.getUint16(eind + 10, true);
    let p = d.getUint32(eind + 16, true);
    const uit = new Map();
    for (let n = 0; n < aantal && p + 46 <= bytes.length; n++) {
      if (d.getUint32(p, true) !== 0x02014b50) break;
      const methode = d.getUint16(p + 10, true), gepakt = d.getUint32(p + 20, true);
      const naamLen = d.getUint16(p + 28, true), extraLen = d.getUint16(p + 30, true), opmLen = d.getUint16(p + 32, true), lokaal = d.getUint32(p + 42, true);
      const naam = tekst(bytes.subarray(p + 46, p + 46 + naamLen));
      uit.set(naam, async () => {
        const start = lokaal + 30 + d.getUint16(lokaal + 26, true) + d.getUint16(lokaal + 28, true);
        const deel = bytes.subarray(start, start + gepakt);
        if (methode === 0) return deel;
        if (methode !== 8) throw new Error('onbekende compressie in het Excel-bestand');
        const stroom = new Blob([deel]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stroom).arrayBuffer());
      });
      p += 46 + naamLen + extraLen + opmLen;
    }
    return uit;
  }

  const xml = (bytes) => new DOMParser().parseFromString(tekst(bytes), 'application/xml');
  const kolomNr = (ref) => { let n = 0; for (const c of String(ref).replace(/\d+/g, '')) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };

  async function xlsx(bytes) {
    const z = zip(bytes);
    const haal = async (naam) => (z.has(naam) ? xml(await z.get(naam)()) : null);
    const teksten = [];
    const gedeeld = await haal('xl/sharedStrings.xml');
    if (gedeeld) for (const si of gedeeld.getElementsByTagName('si')) teksten.push([...si.getElementsByTagName('t')].map((t) => t.textContent).join(''));
    // Het eerste blad: via workbook.xml en de relaties, anders sheet1.xml.
    let pad = 'xl/worksheets/sheet1.xml';
    const boek = await haal('xl/workbook.xml'), rel = await haal('xl/_rels/workbook.xml.rels');
    const rid = boek?.getElementsByTagName('sheet')[0]?.getAttribute('r:id');
    const doel = rid && rel ? [...rel.getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rid)?.getAttribute('Target') : null;
    if (doel) pad = doel.startsWith('/') ? doel.slice(1) : `xl/${doel}`;
    if (!z.has(pad)) pad = [...z.keys()].find((k) => /^xl\/worksheets\/[^/]+\.xml$/.test(k));
    if (!pad) throw new Error('geen werkblad gevonden in het Excel-bestand');
    const blad = xml(await z.get(pad)());
    const rijen = [];
    for (const row of blad.getElementsByTagName('row')) {
      const rij = [];
      for (const c of row.getElementsByTagName('c')) {
        const i = kolomNr(c.getAttribute('r') || ''), soort = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        let w;
        if (soort === 's') w = teksten[Number(v)] ?? '';
        else if (soort === 'inlineStr') w = [...c.getElementsByTagName('t')].map((t) => t.textContent).join('');
        else if (soort === 'str' || soort === 'b' || soort === 'e') w = v;
        else w = v === '' ? '' : (Number.isFinite(Number(v)) ? Number(v) : v);
        rij[i < 0 ? rij.length : i] = w;
      }
      const nr = Number(row.getAttribute('r')) || rijen.length + 1;
      rijen[nr - 1] = Array.from(rij, (x) => x ?? '');
    }
    return Array.from(rijen, (r) => r || []);
  }

  function csv(inhoud) {
    const t = inhoud.replace(/^﻿/, '');
    const eerste = t.split(/\r?\n/, 1)[0] || '';
    const scheiding = [';', '\t', ','].map((s) => [s, eerste.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rijen = [];
    let rij = [], cel = '', inQuote = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (inQuote) { if (c === '"' && t[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') inQuote = false; else cel += c; }
      else if (c === '"') inQuote = true;
      else if (c === scheiding) { rij.push(cel); cel = ''; }
      else if (c === '\n') { rij.push(cel.replace(/\r$/, '')); rijen.push(rij); rij = []; cel = ''; }
      else cel += c;
    }
    if (cel || rij.length) { rij.push(cel); rijen.push(rij); }
    return rijen;
  }

  async function lees(invoer) {
    const bytes = invoer instanceof Uint8Array ? invoer : new Uint8Array(invoer);
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return xlsx(bytes);
    return csv(tekst(bytes));
  }

  globalThis.SDXlsx = { lees };
})();
