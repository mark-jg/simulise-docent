/* Zelf bijwerken (overgenomen uit Docent Tools voor Magister).
 * Een uitgepakte extensie kan zijn eigen map niet zomaar beschrijven. Via de File System
 * Access API kan het wel, als de gebruiker de extensiemap één keer zelf aanwijst. De map-
 * handle bewaren we in IndexedDB; bij elke update vraagt Chrome opnieuw om toestemming
 * (één klik). Daarna: zip ophalen van GitHub, uitpakken met de ingebouwde
 * DecompressionStream, bestanden schrijven, extensie herladen. Er wordt niets verwijderd.
 */

/* ---------- Zip lezen (alleen store en deflate, geen zip64) ---------- */
async function sdUnzip(buffer) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  // End of central directory: achteraan zoeken naar 50 4b 05 06.
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('geen geldig zip-bestand');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const files = [];
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('zip: centrale map beschadigd');
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const size = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue; // map
    if (dv.getUint32(local, true) !== 0x04034b50) throw new Error('zip: bestandskop beschadigd');
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = u8.slice(start, start + compSize);
    let data;
    if (method === 0) data = raw;
    else if (method === 8) data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else throw new Error(`zip: compressie ${method} niet ondersteund`);
    if (data.length !== size) throw new Error(`zip: ${name} heeft een onverwachte grootte`);
    files.push({ name, data });
  }
  return files;
}
globalThis.sdUnzip = sdUnzip;

if (typeof document !== 'undefined' && typeof chrome !== 'undefined' && chrome.storage) (() => {
  // Werkt zowel in de popup als op de updatepagina; een element dat op een pagina ontbreekt
  // wordt een los, onzichtbaar element, zodat de code overal hetzelfde kan blijven.
  const $ = (id) => document.getElementById(id) || document.createElement('span');
  const inPopup = location.pathname.endsWith('/popup.html');
  const openUpdatePage = () => chrome.tabs.create({ url: chrome.runtime.getURL('update/update.html') });
  const manifest = chrome.runtime.getManifest();
  const progress = (t) => { $('updateProgress').textContent = t; };

  /* ---------- Map-handle bewaren in IndexedDB ---------- */
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open('sd-updater', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const kvGet = async (k) => { const db = await idb(); return new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };
  const kvSet = async (k, v) => { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); };
  const kvDel = async (k) => { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); };

  /* Controleert dat de gekozen map echt deze extensie bevat. */
  async function verifyFolder(dir) {
    let text;
    try { text = await (await (await dir.getFileHandle('manifest.json')).getFile()).text(); }
    catch { throw new Error('deze map bevat geen manifest.json; kies de map waarin de extensie staat'); }
    const m = JSON.parse(text);
    if (m.name !== manifest.name) throw new Error(`deze map bevat een andere extensie (${m.name})`);
    return m;
  }

  async function ensurePermission(dir) {
    if ((await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    return (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
  }

  async function writeFile(dir, path, data) {
    const parts = path.split('/').filter(Boolean);
    const file = parts.pop();
    let d = dir;
    for (const seg of parts) d = await d.getDirectoryHandle(seg, { create: true });
    const fh = await d.getFileHandle(file, { create: true });
    const w = await fh.createWritable();
    await w.write(data); await w.close();
  }

  /* ---------- UI-status ---------- */
  let update = null, dir = null, klaar = false; // klaar: melding na bijwerken laten staan

  function renderStatus() {
    const out = $('updateStatus');
    if (!update) out.textContent = 'Nog niet gecontroleerd.';
    else if (update.error) out.textContent = `Kon GitHub niet bereiken: ${update.error}.`;
    else if (update.available) out.textContent = `Versie ${update.latest} is beschikbaar (je hebt ${manifest.version}).`;
    else if (!update.latest) out.textContent = 'Er is nog geen release gepubliceerd.';
    else out.textContent = `Je hebt de nieuwste versie (${manifest.version}).`;
    if (update?.checkedAt) out.textContent += ` Laatst gecontroleerd: ${new Date(update.checkedAt).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}.`;
    $('notes').hidden = !(update?.available && update.notes);
    $('notes').textContent = update?.notes || '';
  }

  async function refreshUi() {
    update = (await chrome.storage.local.get('update')).update || null;
    dir = (await kvGet('dir').catch(() => null)) || null;
    const supported = typeof window.showDirectoryPicker === 'function';
    $('folderName').textContent = dir ? `Extensiemap: ${dir.name}` : 'Nog geen extensiemap gekozen.';
    $('pickFolder').textContent = dir ? 'Andere map kiezen' : 'Extensiemap kiezen';
    $('forgetFolder').hidden = !dir;
    if (inPopup) { $('pickFolder').hidden = !!dir; $('folderName').hidden = true; }
    const can = supported && dir && update?.available && update.zip;
    $('doUpdate').disabled = !can;
    $('doUpdate').textContent = update?.available ? `Nu bijwerken naar ${update.latest}` : 'Nu bijwerken';
    renderStatus();
    if (klaar) return;
    if (!supported) progress('Deze browser ondersteunt het kiezen van een map niet; werk handmatig bij (zip downloaden).');
    else if (!dir) progress(update?.available ? 'Kies eerst één keer de map waarin de extensie staat (de map met manifest.json).' : '');
    else if (update?.available) progress(inPopup ? 'Chrome vraagt om toestemming voor de map (één klik).' : `Versie ${update.latest} staat klaar. Chrome vraagt bij het bijwerken om toestemming voor de map.`);
    else progress('');
  }

  $('pickFolder').onclick = async () => {
    try {
      const picked = await window.showDirectoryPicker({ mode: 'readwrite', id: 'sd-extension-folder' });
      const m = await verifyFolder(picked);
      await kvSet('dir', picked);
      await refreshUi();
      progress(`Map gekozen (${picked.name}, versie ${m.version}).`);
    } catch (e) {
      if (e?.name === 'AbortError') { /* geannuleerd */ }
      else if (inPopup && !/manifest|andere extensie/.test(e?.message || '')) {
        // Kiezen lukt niet in elke Chrome-versie vanuit de popup: dan via de updatepagina.
        progress('Map kiezen lukt hier niet; de updatepagina opent…');
        openUpdatePage();
      } else progress(`Map niet gebruikt: ${e.message || e}.`);
    }
  };
  $('forgetFolder').onclick = async () => { await kvDel('dir').catch(() => {}); refreshUi(); };

  $('checkUpdate').onclick = async () => {
    $('updateStatus').textContent = 'Controleren…';
    await chrome.runtime.sendMessage({ type: 'checkUpdate' }).catch(() => null);
    refreshUi();
  };

  /* Automatisch controleren aan/uit (standaard aan). */
  chrome.storage.sync.get({ updateCheck: true }).then(({ updateCheck }) => { $('autoCheck').checked = updateCheck !== false; });
  $('autoCheck').onchange = async () => {
    await chrome.storage.sync.set({ updateCheck: $('autoCheck').checked });
    if (!$('autoCheck').checked) chrome.action.setBadgeText({ text: '' });
  };

  /* ---------- Bijwerken ---------- */
  async function fetchZip() {
    const res = await fetch(update.zip, { cache: 'no-store' });
    if (!res.ok) throw new Error(`download mislukt (${res.status})`);
    return res.arrayBuffer();
  }

  $('doUpdate').onclick = async () => {
    const btn = $('doUpdate');
    btn.disabled = true;
    try {
      // Toestemming eerst, zolang de klik nog "vers" is.
      if (!(await ensurePermission(dir))) throw new Error('geen toestemming voor de map');
      await verifyFolder(dir);
      progress('Downloaden…');
      const buf = await fetchZip();
      progress('Uitpakken…');
      const files = await sdUnzip(buf);
      // Bovenste map in de zip (simulise-docent/) weglaten.
      const strip = (n) => n.includes('/') ? n.slice(n.indexOf('/') + 1) : n;
      const entries = files.map((f) => ({ path: strip(f.name), data: f.data }))
        .filter((f) => f.path && !f.path.startsWith('.') && !f.path.includes('/.'));
      const mf = entries.find((f) => f.path === 'manifest.json');
      if (!mf) throw new Error('zip bevat geen manifest.json');
      const nm = JSON.parse(new TextDecoder().decode(mf.data));
      if (nm.name !== manifest.name) throw new Error(`zip bevat een andere extensie (${nm.name})`);
      if (nm.version !== update.latest) throw new Error(`zip is versie ${nm.version}, verwacht ${update.latest}`);
      // Manifest als laatste, zodat een afgebroken update geen nieuw manifest met oude bestanden achterlaat.
      const ordered = [...entries.filter((f) => f.path !== 'manifest.json'), mf];
      for (let i = 0; i < ordered.length; i++) {
        progress(`Bestanden schrijven (${i + 1}/${ordered.length}): ${ordered[i].path}`);
        await writeFile(dir, ordered[i].path, ordered[i].data);
      }
      klaar = true;
      progress(`Klaar: ${ordered.length} bestanden geschreven. De extensie wordt herladen; herlaad daarna je Simulise-tabbladen.`);
      await chrome.storage.local.set({ update: { ...update, available: false, current: nm.version } });
      setTimeout(() => chrome.runtime.reload(), 800);
    } catch (e) {
      progress(`Bijwerken mislukt: ${e.message || e}. Je kunt ook handmatig bijwerken (zip downloaden).`);
      btn.disabled = false;
    }
  };

  $('manualZip').onclick = (e) => {
    e.preventDefault();
    const url = update?.zip || update?.page || 'https://github.com/mark-jg/simulise-docent/releases';
    chrome.tabs.create({ url });
  };

  $('version').textContent = `Geïnstalleerd: versie ${manifest.version}`;
  chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.update) refreshUi(); });
  refreshUi();
})();
