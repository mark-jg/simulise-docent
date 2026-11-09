// Rooktest: laadt de extensie in headless Chromium, zonder netwerk.
// simulise.com en GitHub worden lokaal nagebootst, dus er komt geen echte (student)data aan te pas.
// Gebruik: node tools/rooktest.js   (vereist Playwright met Chromium en het commando zip)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1'; // ook verzoeken van background.js onderscheppen
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ext = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const fouten = [];
const check = (ok, tekst) => { console.log(`${ok ? 'ok  ' : 'FOUT'} ${tekst}`); if (!ok) fouten.push(tekst); };

// Zip bouwen zoals .github/workflows/release.yml dat doet (map simulise-docent/ bovenin).
function bouwZip() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-zip-'));
  const doel = path.join(tmp, 'simulise-docent');
  const skip = new Set(['.git', '.github', 'scripts', 'tools', 'dist', '.gitignore', '.DS_Store', 'CLAUDE.md']);
  fs.cpSync(ext, doel, { recursive: true, filter: (src) => !skip.has(path.basename(src)) || src === ext });
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
  await ctx.route('https://ma.simulise.com/**', (r) => r.fulfill({
    contentType: 'text/html',
    body: '<html><head></head><body><div id="nav"></div><div id="content">test</div></body></html>',
  }));
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

  // 2. Popup en updatecontrole
  const popup = await nieuw(`chrome-extension://${id}/popup.html`);
  const versie = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8')).version;
  check((await popup.textContent('#ver')) === `v${versie}`, `popup toont versie v${versie}`);
  check(await popup.locator('input[name="theme"]').count() > 0, 'popup toont thema\'s');
  await popup.click('#updCheck');
  await popup.waitForSelector('#update:not([hidden])', { timeout: 5000 }).catch(() => {});
  check(await popup.isVisible('#update'), 'popup toont "Versie 9.9.9 beschikbaar" na controle');
  check((await sw.evaluate(() => chrome.action.getBadgeText({}))) === '1', 'badge op het icoon');

  // 3. Updatepagina: download en uitpakken (de map kiezen kan headless niet)
  const upd = await nieuw(`chrome-extension://${id}/update/update.html`);
  await upd.waitForFunction(() => document.getElementById('updateStatus').textContent.includes('9.9.9'));
  check(true, 'updatepagina toont de nieuwe versie');
  const inhoud = await upd.evaluate(async (url) => {
    const files = await sdUnzip(await (await fetch(url)).arrayBuffer());
    const mf = files.find((f) => f.name === 'simulise-docent/manifest.json');
    return { namen: files.map((f) => f.name), manifest: mf && JSON.parse(new TextDecoder().decode(mf.data)) };
  }, ZIP_URL);
  check(inhoud.manifest?.name === 'Simulise Docent', `zip uitgepakt (${inhoud.namen.length} bestanden, manifest gevonden)`);
  check(!inhoud.namen.some((n) => /tools\/|scripts\/|\.github\/|CLAUDE\.md/.test(n)), 'zip bevat geen ontwikkelbestanden');

  await ctx.close();
  console.log(fouten.length ? `\nMISLUKT:\n- ${fouten.join('\n- ')}` : '\nOK');
  process.exit(fouten.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
