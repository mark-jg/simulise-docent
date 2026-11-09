// Rooktest: laadt de extensie in headless Chromium, zonder netwerk.
// simulise.com wordt lokaal nagebootst, dus er komt geen echte (student)data aan te pas.
// Gebruik: node tools/rooktest.js   (vereist Playwright met Chromium)
const { chromium } = require('playwright');
const crypto = require('crypto');
const path = require('path');

(async () => {
  const ext = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  // Id van een uitgepakte extensie = sha256 van het absolute pad, eerste 32 tekens als a-p.
  const id = [...crypto.createHash('sha256').update(ext).digest('hex').slice(0, 32)]
    .map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');

  // Extensies laden alleen in de nieuwe headless-modus (channel 'chromium').
  const ctx = await chromium.launchPersistentContext('', {
    headless: true, channel: 'chromium',
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  await ctx.route('https://ma.simulise.com/**', r => r.fulfill({
    contentType: 'text/html',
    body: '<html><head></head><body><div id="nav"></div><div id="content">test</div></body></html>',
  }));

  const fouten = [];
  const page = await ctx.newPage();
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto('https://ma.simulise.com/');
  await page.waitForTimeout(500);
  const thema = await page.evaluate(() => document.documentElement.getAttribute('data-sim-theme'));
  console.log('data-sim-theme:', thema);
  if (!thema) fouten.push('content.js heeft geen data-sim-theme gezet');

  const popup = await ctx.newPage();
  popup.on('pageerror', e => fouten.push(e.message));
  await popup.goto(`chrome-extension://${id}/popup.html`);
  console.log('popup-bedieningselementen:', await popup.locator('select option, input').count());

  await ctx.close();
  console.log(fouten.length ? `MISLUKT: ${fouten.join('; ')}` : 'OK');
  process.exit(fouten.length ? 1 : 0);
})();
