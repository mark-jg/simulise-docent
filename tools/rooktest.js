// Rooktest: laadt de extensie in headless Chromium, zonder netwerk.
// simulise.com en GitHub worden lokaal nagebootst, dus er komt geen echte (student)data aan te pas.
// Gebruik: node tools/rooktest.js   (vereist Playwright met Chromium en het commando zip)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1'; // ook verzoeken van background.js onderscheppen
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Nagebootste Simulise-pagina met Bootstrap 3-onderdelen die standaard hardcoded wit zijn.
const WIT = ['.modal-content', '.popover', '.selectize-dropdown', '.well', '.list-group-item', '.nav-tabs > li.active > a', '.bg-white', '.form-control'];
const NEPPAGINA = `<html><head><style>
  ${WIT.join(',')} { background: #fff; color: #333; }
  .support-button { position: fixed; right: 0; bottom: 0; display: block; }
</style></head><body><div id="nav"></div><div id="content">
  <a class="support-button" href="#">Hulp nodig?</a>
  <div class="modal-content">modal</div><div class="popover">popover</div>
  <div class="selectize-dropdown">selectize</div><div class="well">well</div>
  <ul class="list-group"><li class="list-group-item">item</li></ul>
  <ul class="nav-tabs"><li class="active"><a href="#">tab</a></li></ul>
  <div class="bg-white">wit</div><input class="form-control">
</div></body></html>`;

const ext = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const fouten = [];
const check = (ok, tekst) => { console.log(`${ok ? 'ok  ' : 'FOUT'} ${tekst}`); if (!ok) fouten.push(tekst); };

// Zip bouwen zoals .github/workflows/release.yml dat doet (map simulise-docent/ bovenin).
function bouwZip() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-zip-'));
  const doel = path.join(tmp, 'simulise-docent');
  const skip = new Set(['.git', '.github', 'scripts', 'tools', 'dist', '.gitignore', '.DS_Store', 'CLAUDE.md', 'ROADMAP.md']);
  fs.cpSync(ext, doel, { recursive: true, filter: (src) => !skip.has(path.basename(src)) || src === ext });
  // Versie zoals in de nagebootste release, anders weigert de updater de zip terecht.
  const mf = path.join(doel, 'manifest.json');
  fs.writeFileSync(mf, fs.readFileSync(mf, 'utf8').replace(/"version": "[0-9.]+"/, '"version": "9.9.9"'));
  execFileSync('zip', ['-qr', 'release.zip', 'simulise-docent'], { cwd: tmp });
  return fs.readFileSync(path.join(tmp, 'release.zip'));
}

(async () => {
  const ctx = await chromium.launchPersistentContext('', {
    headless: true, channel: 'chromium', // extensies laden alleen in de nieuwe headless-modus
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const zip = bouwZip();
  const ZIP_URL = 'https://github.com/mark-jg/simulise-docent/releases/download/v9.9.9/simulise-docent-v9.9.9.zip';
  await ctx.route('https://ma.simulise.com/**', (r) => r.fulfill({ contentType: 'text/html', body: NEPPAGINA }));
  await ctx.route('https://api.github.com/repos/mark-jg/simulise-docent/releases/latest', (r) => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ tag_name: 'v9.9.9', html_url: 'https://github.com/mark-jg/simulise-docent/releases/tag/v9.9.9',
      body: 'Testrelease', published_at: '2026-01-01T00:00:00Z', assets: [{ name: 'simulise-docent-v9.9.9.zip', browser_download_url: ZIP_URL }] }),
  }));
  await ctx.route(ZIP_URL, (r) => r.fulfill({ contentType: 'application/zip', body: zip }));
  await ctx.route((url) => !/^(chrome-extension:|https:\/\/ma\.simulise\.com|https:\/\/api\.github\.com|https:\/\/github\.com)/.test(url.href),
    (r) => r.abort()); // al het andere: geen netwerk

  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 });
  const id = new URL(sw.url()).host;
  check(Boolean(id), `background.js draait (extensie-id ${id})`);

  const nieuw = async (url) => { const p = await ctx.newPage(); p.on('pageerror', (e) => fouten.push(`${url}: ${e.message}`)); await p.goto(url); return p; };

  // 1. Content script op Simulise
  const sim = await nieuw('https://ma.simulise.com/');
  await sim.waitForTimeout(300);
  check(Boolean(await sim.evaluate(() => document.documentElement.getAttribute('data-sim-theme'))), 'content.js zet data-sim-theme');

  check(!(await sim.isVisible('.support-button')), 'module hulpknop verbergt "Hulp nodig?"');

  // 2. Popup, modules en updatecontrole
  const popup = await nieuw(`chrome-extension://${id}/popup.html`);
  check(await popup.locator('#modules input').count() === 2, 'popup toont aan/uit per module');
  const zet = (s) => popup.evaluate((s) => chrome.storage.sync.set(s), s).then(() => sim.waitForTimeout(300));
  const attr = () => sim.evaluate(() => document.documentElement.getAttribute('data-sim-theme'));

  await zet({ theme: 'dark' });
  const achtergronden = await sim.evaluate((sels) => sels.map((s) => [s, getComputedStyle(document.querySelector(s)).backgroundColor]), WIT);
  const nogWit = achtergronden.filter(([, bg]) => bg === 'rgb(255, 255, 255)').map(([s]) => s);
  check(nogWit.length === 0, `donker thema: geen witte Bootstrap-onderdelen${nogWit.length ? ` (nog wit: ${nogWit.join(', ')})` : ''}`);
  await zet({ hideSupport: false });
  check(await sim.isVisible('.support-button'), 'hulpknop uitzetten maakt "Hulp nodig?" weer zichtbaar');
  await zet({ enabled: false });
  check((await attr()) === 'off', 'thema uitzetten zet data-sim-theme op off');
  await zet({ enabled: true, theme: 'auto', hideSupport: true });
  check((await attr()) !== 'off', 'thema weer aan');

  const versie = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8')).version;
  check((await popup.textContent('#ver')) === `v${versie}`, `popup toont versie v${versie}`);
  check(await popup.locator('input[name="theme"]').count() > 0, 'popup toont thema\'s');
  await popup.click('#updCheck');
  await popup.waitForSelector('#update:not([hidden])', { timeout: 5000 }).catch(() => {});
  check(await popup.isVisible('#update'), 'popup toont "Versie 9.9.9 beschikbaar" na controle');
  check((await sw.evaluate(() => chrome.action.getBadgeText({}))) === '1', 'badge op het icoon');

  check(await popup.isVisible('#pickFolder') && await popup.isDisabled('#doUpdate'), 'popup: zonder map eerst "Extensiemap kiezen"');

  // 3. Updatepagina: download en uitpakken
  const upd = await nieuw(`chrome-extension://${id}/update/update.html`);
  await upd.waitForFunction(() => document.getElementById('updateStatus').textContent.includes('9.9.9'));
  check(true, 'updatepagina toont de nieuwe versie');
  const inhoud = await upd.evaluate(async (url) => {
    const files = await sdUnzip(await (await fetch(url)).arrayBuffer());
    const mf = files.find((f) => f.name === 'simulise-docent/manifest.json');
    return { namen: files.map((f) => f.name), manifest: mf && JSON.parse(new TextDecoder().decode(mf.data)) };
  }, ZIP_URL);
  check(inhoud.manifest?.name === 'Simulise Docent', `zip uitgepakt (${inhoud.namen.length} bestanden, manifest gevonden)`);
  check(!inhoud.namen.some((n) => /tools\/|scripts\/|\.github\/|CLAUDE\.md|ROADMAP\.md/.test(n)), 'zip bevat geen ontwikkelbestanden');

  // 4. Bijwerken vanuit de popup. Het mapvenster kan headless niet; een map in het Origin Private
  // File System is hetzelfde soort maphandle, dus die zetten we klaar als "gekozen extensiemap".
  const popup2 = await nieuw(`chrome-extension://${id}/popup.html`);
  await popup2.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('extensiemap', { create: true });
    const w = await (await dir.getFileHandle('manifest.json', { create: true })).createWritable();
    await w.write(JSON.stringify({ name: 'Simulise Docent', version: '0.0.1' })); await w.close();
    const db = await new Promise((res) => { const r = indexedDB.open('sd-updater', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); });
    await new Promise((res) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(dir, 'dir'); tx.oncomplete = res; });
  });
  await popup2.reload();
  await popup2.waitForSelector('#doUpdate:not([disabled])', { timeout: 5000 }).catch(() => {});
  check(!(await popup2.isDisabled('#doUpdate')) && !(await popup2.isVisible('#pickFolder')), 'popup: met map is "Nu bijwerken" klikbaar');
  // chrome.runtime.reload() na afloop zou de extensie herstarten; in de test onderscheppen.
  await popup2.evaluate(() => { chrome.runtime.reload = () => { window.__herladen = true; }; });
  await popup2.click('#doUpdate');
  await popup2.waitForFunction(() => /Klaar|mislukt/.test(document.getElementById('updateProgress').textContent), null, { timeout: 15000 }).catch(() => {});
  check((await popup2.textContent('#updateProgress')).startsWith('Klaar'), `popup: bijwerken ("${await popup2.textContent('#updateProgress')}")`);
  const geschreven = await popup2.evaluate(async () => {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('extensiemap');
    const mf = JSON.parse(await (await (await dir.getFileHandle('manifest.json')).getFile()).text());
    const mods = []; for await (const [naam] of (await dir.getDirectoryHandle('modules')).entries()) mods.push(naam);
    await new Promise((r) => setTimeout(r, 1000));
    return { versie: mf.version, mods: mods.length, herladen: window.__herladen === true };
  });
  check(geschreven.versie === '9.9.9' && geschreven.mods === 4, `bestanden in de map geschreven (manifest ${geschreven.versie}, ${geschreven.mods} modules)`);
  check(geschreven.herladen, 'extensie herlaadt zich na het bijwerken');

  await ctx.close();
  console.log(fouten.length ? `\nMISLUKT:\n- ${fouten.join('\n- ')}` : '\nOK');
  process.exit(fouten.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
