// Rooktest: laadt de extensie in headless Chromium, zonder netwerk.
// simulise.com en GitHub worden lokaal nagebootst, dus er komt geen echte (student)data aan te pas.
// Gebruik: node tools/rooktest.js   (vereist Playwright met Chromium en het commando zip)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1'; // ook verzoeken van background.js onderscheppen
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Meldingen zoals in het menu van Simulise (titel van de opdracht in <b>); nepnamen.
const MENU = ['<b>Piet Jansen</b> heeft opdracht <b>Meetmoment SD Engels M4</b> ingeleverd.',
  '<b>Meetmoment GA Engels M1 (Cohort 2026)</b> van <b>Sanne de Vries</b> staat klaar om beoordeeld te worden',
  '<b>Kees Bakker</b> heeft opdracht <b>Meetmoment MEP/MIP Engels M1 (Cohort 2026)</b> ingeleverd.',
  'Nieuwe feedback op <b>PS_1.8: Wie ben ik?</b>',
  '<b>Meetmoment SD Nederlands M2</b> van <b>Ali Bouzid</b> staat klaar om beoordeeld te worden',
  '<b>Meetmoment MR Nederlands M1</b> van <b>Kees Bakker</b> staat klaar om beoordeeld te worden',
  '<b>Opdracht A</b> ingeleverd.', '<b>Opdracht B</b> ingeleverd.', '<b>Opdracht C</b> ingeleverd.'];
// Meldingenpagina: tijdlijn, door de server gemaakt, 3 pagina's.
const MELDPAGINAS = { 1: ['SD Engels M4', 'MEP/MIP Engels M1', 'GA Engels M1', null, 'SD Nederlands M2', 'MR Nederlands M1'],
  2: ['GA Engels M2', 'MEP/MIP Rekenen M1', null, 'SD Engels M1'], 3: [null, 'GA Nederlands M1'] };
const MELDINGENPAGINA = (n) => `<html><head></head><body><aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><section class="vbox">
<section id="content-wrapper" class="scrollable wrapper"><div class="wrapper"><div class="timeline">
<article class="timeline-item active"><div class="timeline-caption"><div class="panel"><div class="panel-body h4 font-thin">Meldingen van <b>Docent</b></div></div></div></article>
${MELDPAGINAS[n].map((m, i) => `<article class="timeline-item${i % 2 ? ' alt' : ''}"><div class="timeline-caption"><div class="panel"><div class="panel-body">
<a class="h5 font-thin" href="/notification/${n}${i}/process">${m ? `<b>Meetmoment ${m}</b> van <b>Student Q</b> staat klaar om beoordeeld te worden` : '<b>Student Q</b> heeft opdracht <b>Portfolio</b> ingeleverd.'}</a></div></div></div></article>`).join('')}
</div><div class="row"><div class="col-lg-12 text-center"><ul class="pagination"><li class="active"><span>1</span></li><li><a href="/notifications?page=2">2</a></li><li><a href="/notifications?page=3">3</a></li></ul></div></div>
</div></section></section></div></body></html>`;

// Nagebootste Simulise-pagina met Bootstrap 3-onderdelen die standaard hardcoded wit zijn.
const WIT = ['.modal-content', '.popover', '.selectize-dropdown', '.well', '.list-group-item', '.nav-tabs > li.active > a', '.bg-white', '.form-control'];
const NEPPAGINA = `<html><head><style>
  ${WIT.join(',')} { background: #fff; color: #333; }
  .support-button { position: fixed; right: 0; bottom: 0; display: block; }
  aside#nav { width: 220px; display: block; }
</style></head><body>
<header class="header navbar"><ul class="nav navbar-nav navbar-right nav-user"><li id="notifications-dropdown" class="open"><a class="dropdown-toggle" href="#"><i class="fa fa-inbox"></i><span class="badge badge-sm up bg-danger count">117</span></a>
  <section class="dropdown-menu aside-xl"><section class="panel bg-white"><div class="panel-heading b-light bg-light"><strong>Je hebt 117 ongelezen meldingen.</strong></div>
  <div class="list-group">${MENU.map((h, i) => `<a class="media list-group-item font-thin" href="/notification/${100 + i}/process"><span class="media-body m-b-none"><span>${h}</span><br><small class="text-xs text-muted">· 2 uur geleden</small></span></a>`).join('')}</div>
  </section></section></li>
  <li class="dropdown"><a class="dropdown-toggle" href="#">Docent</a><ul class="dropdown-menu"><li><a href="/notifications">Meldingen <span class="badge bg-danger pull-right">117</span></a></li></ul></li></ul></header>
<script>fetch('https://api.simulise.com/graphql', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ operationName: 'getLatestUnreadNotification',
  query: 'query getLatestUnreadNotification { viewer { id notifications(first: 5, unread: true) { data { id text } paginatorInfo { total } } } }', variables: {} }) });</script>
<aside id="nav"><ul class="nav-main">
  <li><a href="/dashboard"><i class="fa fa-home"></i><span>Dashboard</span></a></li>
  <li><a href="/assignments/assigned"><i class="fa fa-check"></i><span>Beoordelen</span></a></li>
  <li><a href="/groups"><i class="fa fa-users"></i><span>Groepen</span></a></li>
</ul></aside>
<div id="content">
  <a href="/groups/101">MEP1A</a> <a href="/groups/102/assignments?filters=status:actionable">MIP1B</a>
  <a href="/groups/103/assignments?filters=status:actionable">12</a>
  <a href="/users/555">Student Jansen</a> <a href="/portfolio/students/556">Student Pietersen</a>
  <a href="/@pjansen/assignment/0f1e2d3c-1111-2222-3333-444455556666/review?group=x">Opdracht bekijken</a> <span class="description">@kdevries</span>
  <table class="table table-index"><thead><tr><th>Student</th><th>Opdracht</th><th>Groep</th><th>Status</th></tr></thead><tbody>
    <tr class="row-actionable"><td><a href="/users/557">Sanne de Vries</a></td><td>Reflectie stage</td><td>MEP1A</td><td>HANDED_IN</td></tr>
    <tr><td><span class="student-name">Mohammed El Amrani</span> <small>m.elamrani@student.example.nl</small></td><td>Meetmoment periode 2</td><td>MR1A</td><td>nr 1234567</td></tr>
    <tr><td>Lotte van der Berg</td><td>Portfolio bijwerken</td><td>MIP1A</td><td>FEEDBACK_ASKED</td></tr>
  </tbody></table>
  <a class="support-button" href="#">Hulp nodig?</a>
  <div class="modal-content">modal</div><div class="popover">popover</div>
  <div class="selectize-dropdown">selectize</div><div class="well">well</div>
  <ul class="list-group"><li class="list-group-item">item</li></ul>
  <ul class="nav-tabs"><li class="active"><a href="#">tab</a></li></ul>
  <div class="bg-white">wit</div><input class="form-control">
</div></body></html>`;

// Nagebootste Beoordelen-lijst, zelfde opbouw als in Simulise (kolommen in andere volgorde dan standaard).
const RIJ_ID = (i) => `00000000-0000-4000-8000-00000000000${i}`;
const rij = (titel, i) => `<tr><td class="hidden-xs"><input type="checkbox"></td><td>Student X</td><td><a href="/@studentx/assignment/${RIJ_ID(i)}/review?group=x"><strong>${titel}</strong></a></td><td><p class="badge bg-warning">Te beoordelen</p></td></tr>`;
const RIJEN = ['Meetmoment SD Engels M4', 'Meetmoment GA Engels M1 (Cohort 2026)', 'Meetmoment MEP/MIP Engels M1 (Cohort 2026)',
  'PS_1.8: Wie ben ik?', 'MEP 1 - CREA - Brochure/Reisgids', 'Meetmoment MR Nederlands M1', 'Meetmoment SD Nederlands M2'];
const BEOORDELEN = `<html><head></head><body><aside id="nav"><ul class="nav-main"><li><a href="/dashboard"><i class="fa"></i><span>Dashboard</span></a></li></ul></aside>
<div id="content"><div class="vbox"><div class="vbox"><header class="header header-md"><div class="header-title"><p class="header-text"><span class="header-text-first-item"><span>Beoordelen</span></span></p></div></header>
<section id="scrollable-page-wrapper"><div class="row"><div class="col-12 col-lg-data"><div class="relative"><div class="table-responsive">
<table class="table table-v-a-m table-index"><thead><tr><th class="hidden-xs"><input type="checkbox"></th><th class="drag-handle"><div class="text-nowrap"><a href="#">Toegewezen aan</a></div></th>
<th class="drag-handle"><div class="text-nowrap"><a href="#">Opdracht titel</a></div></th><th class="drag-handle"><div class="text-nowrap"><a href="#">Status</a></div></th></tr></thead>
<tbody>${RIJEN.map(rij).join('')}</tbody></table></div></div></div></div></section></div></div></div>
<div class="hidden" data-options='{"rows":[{"title":"Meetmoment SD Engels M4","student":"Piet Jansen","username":"pjansen"}],"total":34,"per_page":25,"page":1,"filler":"${'x'.repeat(200)}"}'></div>
<script>window.__perPage = null;
fetch('https://api.simulise.com/graphql', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ operationName: 'assignmentsAssigned',
  query: 'query assignmentsAssigned($page: Int!, $perPage: Int!) { assignedAssignments(page: $page, first: $perPage) { paginatorInfo { total } } }', variables: { page: 2, perPage: 25, filters: ['status:HANDED_IN'] } }) })
  .then((r) => r.json()).then((j) => { document.documentElement.dataset.testPerPage = j.data ? j.data.assignedAssignments.paginatorInfo.perPage : 'fout'; });
{ const v = new XMLHttpRequest(); v.open('GET', '/api/vroeg?per_page=25'); v.send(); }
setTimeout(() => {
  fetch('/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operationName: 'AssignedAssignments',
    query: 'query AssignedAssignments($first: Int, $page: Int) { assigned(first: $first, page: $page, search: "Piet") { total items { title student { name username } } } }',
    variables: { first: 25, page: 2, status: 'HANDED_IN', search: 'Piet Jansen' } }) });
  const x = new XMLHttpRequest(); x.open('GET', '/assignments/assigned/data?page=2&per_page=25&q=pjansen'); x.send();
}, 700);</script></body></html>`;
const UUID = '0a1b2c3d-1111-4222-8333-444455556666';
const GROEPSPAGINA = `<html><head></head><body><aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><section class="vbox"><header class="header header-md">
<div class="header-title"><p class="header-text"><span class="header-text-first-item"><a href="/groups"><span>Groepen</span></a></span><span class="text-muted">/</span><span>MR1A</span></p></div>
<ul class="nav nav-tabs"><li><a href="/groups/school/${UUID}/community"><span>Community</span></a></li></ul></header></section></div></body></html>`;

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
  await ctx.route('https://ma.simulise.com/**', (r) => {
    const u = new URL(r.request().url()), p = u.pathname;
    if (p === '/notifications') return r.fulfill({ contentType: 'text/html', body: MELDINGENPAGINA(parseInt(u.searchParams.get('page'), 10) || 1) });
    if (p === '/api/vroeg') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [{ name: 'Piet Jansen' }], per_page: 25, total: 34 }) });
    if (p === '/api/graphql') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { assigned: { total: 34, items: [{ title: 'Meetmoment SD Engels M4', student: { name: 'Piet Jansen', username: 'pjansen' } }] } } }) });
    if (p === '/assignments/assigned/data') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [{ id: 5, title: 'Opdracht X', user: { name: 'Piet Jansen' } }], current_page: 2, per_page: 25, total: 34 }) });
    const body = p.startsWith('/assignments/assigned') ? BEOORDELEN : p.startsWith('/groups/school/') ? GROEPSPAGINA : NEPPAGINA;
    return r.fulfill({ contentType: 'text/html', body });
  });
  await ctx.route('https://api.github.com/repos/mark-jg/simulise-docent/releases/latest', (r) => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ tag_name: 'v9.9.9', html_url: 'https://github.com/mark-jg/simulise-docent/releases/tag/v9.9.9',
      body: 'Testrelease', published_at: '2026-01-01T00:00:00Z', assets: [{ name: 'simulise-docent-v9.9.9.zip', browser_download_url: ZIP_URL }] }),
  }));
  await ctx.route(ZIP_URL, (r) => r.fulfill({ contentType: 'application/zip', body: zip }));
  // Nagebootste GraphQL-server: weigert meer dan 100 rijen, zoals een server met een maximum.
  const graphqlVerzoeken = [];
  const meldVerzoeken = [];
  let tellerVerzoeken = 0;
  await ctx.route('https://api.simulise.com/graphql', (r) => {
    const verzoek = JSON.parse(r.request().postData() || '{}');
    if (verzoek.operationName === 'sdDocentTeller') {
      tellerVerzoeken++;
      const items = [...MENU, 'Kees Bakker heeft opdracht Portfolio M1 ingeleverd.', 'Piet Jansen heeft opdracht Meetmoment SD Engels M2 ingeleverd.'];
      return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: { viewer: { notifications: { data: items.map((text, i) => ({ id: `m${i}`, text })), paginatorInfo: { total: items.length } } } } }) });
    }
    if (verzoek.operationName === 'getLatestUnreadNotification') {
      meldVerzoeken.push(verzoek.query.match(/notifications\(first: (\d+)/)?.[1]);
      return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: { viewer: { notifications: { data: [], paginatorInfo: { total: 118 } } } } }) });
    }
    const v = verzoek.variables || {};
    graphqlVerzoeken.push(`${v.page}/${v.perPage}`);
    // Groepen zoals Simulise ze meestuurt; rij 1 heeft een groeps-id in de gegevens van de student (moet genegeerd worden).
    const G = { MEP1A: 'grp-111111', MR1A: 'grp-222222', SD2B: 'grp-333333', GA1A: 'grp-444444' };
    const perRij = ['SD2B', 'GA1A', 'MEP1A', 'SD2B', null, 'MR1A', 'SD2B'];
    const body = v.perPage > 100 ? { errors: [{ message: 'Maximum number of 100 requested items exceeded' }] }
      : { data: { assignedAssignments: {
        data: perRij.map((g, i) => ({ id: RIJ_ID(i), status: 'HANDED_IN', user: { id: G.MEP1A, name: 'Piet Jansen' },
          assignment: { id: `opdr-00000${i}`, title: 'x' }, assignmentConnection: g ? { id: `conn-00000${i}`, connectable: { id: G[g] } } : null })),
        aggregations: { groups: Object.entries(G).map(([naam, id]) => ({ key: `key-${id}`, item: { autocompletion: { id, text: naam, value: `group:${id}` } }, count: perRij.filter((x) => x === naam).length })) },
        paginatorInfo: { total: 33, perPage: v.perPage, currentPage: v.page } } } };
    return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  await ctx.route((url) => !/^(chrome-extension:|https:\/\/ma\.simulise\.com|https:\/\/api\.simulise\.com\/graphql|https:\/\/api\.github\.com|https:\/\/github\.com)/.test(url.href),
    (r) => r.abort()); // al het andere: geen netwerk

  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 });
  const id = new URL(sw.url()).host;
  check(Boolean(id), `background.js draait (extensie-id ${id})`);

  const nieuw = async (url) => { const p = await ctx.newPage(); p.on('pageerror', (e) => fouten.push(`${url}: ${e.message}`)); await p.goto(url); return p; };

  const leesDownload = async (toets) => {
    const [dl] = await Promise.all([sim.waitForEvent('download'), sim.keyboard.press(toets)]);
    return { naam: dl.suggestedFilename(), tekst: fs.readFileSync(await dl.path(), 'utf8') };
  };

  // 1. Content script op Simulise
  const sim = await nieuw('https://ma.simulise.com/');
  await sim.waitForTimeout(300);
  check(Boolean(await sim.evaluate(() => document.documentElement.getAttribute('data-sim-theme'))), 'content.js zet data-sim-theme');

  check(!(await sim.isVisible('.support-button')), 'module hulpknop verbergt "Hulp nodig?"');

  // 2. Popup, modules en updatecontrole
  const popup = await nieuw(`chrome-extension://${id}/popup.html`);
  check(await popup.locator('#modules input').count() === 6, 'popup toont aan/uit per module');
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

  // Meldingen in het menu
  const menuZichtbaar = () => sim.$$eval('#notifications-dropdown a.list-group-item', (as) => as.filter((a) => a.offsetParent !== null).map((a) => a.querySelectorAll('b')[a.querySelectorAll('b').length > 1 && !a.textContent.startsWith('Meetmoment') ? 1 : 0].textContent));
  let mz = await menuZichtbaar();
  check(mz.join(' | ') === 'Meetmoment MEP/MIP Engels M1 (Cohort 2026) | PS_1.8: Wie ben ik? | Meetmoment MR Nederlands M1 | Opdracht A | Opdracht B',
    `menu: meetmomenten SD en GA verborgen, 5 relevante zichtbaar (${mz.join(' | ')})`);
  check((await sim.textContent('#notifications-dropdown .sim-docent-menunoot')) === '3 van de 9 nieuwste meldingen verborgen (andere opleidingen).', 'menu: melding hoeveel er verborgen zijn');

  // Teller: alleen relevante ongelezen meldingen
  await sim.reload(); await sim.waitForTimeout(1300);
  const belletje = '#notifications-dropdown > a.dropdown-toggle .badge';
  check((await sim.textContent(belletje)) === '7' && (await sim.textContent('.nav-user a[href="/notifications"] .badge')) === '7',
    `teller toont 7 relevante in plaats van 117 (belletje "${await sim.textContent(belletje)}", ${tellerVerzoeken} verzoek(en))`);
  check((await sim.getAttribute(belletje, 'title')).includes('11 in totaal'), `tooltip met het echte totaal ("${await sim.getAttribute(belletje, 'title')}")`);
  check((await sim.textContent('#notifications-dropdown .panel-heading strong')) === 'Je hebt 7 ongelezen meldingen voor jouw opleidingen (van de 11).', 'kop van het menu aangepast');
  const voor = tellerVerzoeken;
  await sim.evaluate((sel) => { document.querySelector(sel).textContent = '12'; }, belletje); // Simulise werkt de teller bij
  await sim.waitForTimeout(1800);
  check((await sim.textContent(belletje)) === '7' && tellerVerzoeken === voor + 1, `nieuwe waarde van Simulise: opnieuw geteld (${tellerVerzoeken - voor} verzoek, belletje "${await sim.textContent(belletje)}")`);
  await zet({ notifFilter: false });
  check((await sim.textContent(belletje)) === '12', 'module meldingen uit: teller van Simulise terug');
  await zet({ notifFilter: true });

  // Zoeken (Cmd+K / Ctrl+K)
  const zoekveld = '#sim-docent-zoeken input';
  const resultaten = () => sim.locator('#sim-docent-zoeken li').allTextContents();
  await sim.keyboard.press('Control+K');
  check(await sim.isVisible(zoekveld), 'Ctrl+K opent het zoekvenster');
  await sim.fill(zoekveld, 'mep');
  check((await resultaten()).some((r) => r.startsWith('MEP1A: te beoordelen')), 'zoeken vindt groep MEP1A');
  await sim.fill(zoekveld, 'beoor');
  check((await resultaten())[0]?.startsWith('Beoordelen'), 'zoeken vindt menu-item Beoordelen');
  await sim.fill(zoekveld, 'jansen');
  check((await resultaten()).join() === 'Niets gevonden.', 'zoeken neemt geen studentlinks op');
  const opgeslagen = await popup.evaluate(() => chrome.storage.local.get('sdGroups').then((s) => s.sdGroups));
  check(JSON.stringify(opgeslagen) === JSON.stringify({ 101: 'MEP1A', 102: 'MIP1B' }), `alleen groepsnamen onthouden (${JSON.stringify(opgeslagen)})`);
  await sim.keyboard.press('Escape');
  check(!(await sim.isVisible(zoekveld)), 'Esc sluit het zoekvenster');
  await sim.keyboard.press('Control+K');
  await sim.fill(zoekveld, 'mip1b');
  await Promise.all([sim.waitForURL('**/groups/102/assignments'), sim.keyboard.press('Enter')]);
  check(sim.url().endsWith('/groups/102/assignments'), 'Enter opent de opdrachten van de gekozen groep');
  await sim.waitForTimeout(300);

  // Zijbalk inklappen
  const navBreedte = () => sim.evaluate(() => document.querySelector('aside#nav').getBoundingClientRect().width);
  check(await sim.isVisible('#sim-docent-zijbalk button'), 'knop om de zijbalk in te klappen');
  await sim.click('#sim-docent-zijbalk button'); await sim.waitForTimeout(300);
  { const b = await navBreedte(); const a = await sim.evaluate(() => document.documentElement.hasAttribute('data-sim-nav-mini')); check(b === 64, `zijbalk ingeklapt tot 64 px (breedte ${b}, attribuut ${a})`); }
  check((await sim.getAttribute('aside#nav a[href="/groups"]', 'title')) === '☺Groepen'.slice(1) || (await sim.getAttribute('aside#nav a[href="/groups"]', 'title'))?.includes('Groepen'), 'menu-items krijgen een tooltip');
  await sim.keyboard.press('Control+K');
  await sim.fill(zoekveld, 'zijbalk');
  await sim.keyboard.press('Enter'); await sim.waitForTimeout(300);
  check((await navBreedte()) > 200, 'Cmd+K-opdracht klapt de zijbalk weer uit');
  await zet({ navToggle: false, search: false });
  await sim.keyboard.press('Control+K');
  check(!(await sim.isVisible('#sim-docent-zijbalk button')) && !(await sim.isVisible(zoekveld)), 'modules zoeken en zijbalk uitzetten werkt');
  await zet({ navToggle: true, search: true });

  // Inspector (alleen in ontwikkelaarsmodus)
  const balk = '#sim-docent-inspector .bar';
  await sim.keyboard.press('Alt+KeyI');
  check(!(await sim.isVisible(balk)), 'Inspector werkt niet zonder ontwikkelaarsmodus');
  await popup.reload();
  check(await popup.isHidden('#inspect'), 'popup: knop Inspector verborgen zonder ontwikkelaarsmodus');
  await popup.check('#developer'); await sim.waitForTimeout(300);
  check(await popup.isVisible('#inspect'), 'popup: ontwikkelaarsmodus toont de knop Inspector starten');
  await sim.keyboard.press('Alt+KeyI');
  check(await sim.isVisible(balk), 'Alt+I start de Inspector');
  await sim.hover('td:has-text("MEP1A")');
  check((await sim.textContent('#sim-docent-inspector .sel')).includes('table.table.table-index'), `selector onder de muis (${await sim.textContent('#sim-docent-inspector .sel')})`);
  const rap = await leesDownload('r');
  const lek = ['Sanne', 'Vries', 'Mohammed', 'Amrani', 'Lotte', 'Berg', 'Jansen', 'Pietersen', 'pjansen', 'kdevries', 'student.example', '1234567', '/users/557', '/users/555', '0f1e2d3c'].filter((w) => rap.tekst.includes(w));
  check(lek.length === 0, `rapport bevat geen namen, e-mail of nummers${lek.length ? ` (gelekt: ${lek.join(', ')})` : ''}`);
  const nodig = ['MEP1A', 'MIP1A', 'Reflectie stage', 'HANDED_IN', 'table-index', 'row-actionable', 'Student 1', '/users/{id}', '/groups/{id}/assignments?filters=status:actionable'].filter((w) => !rap.tekst.includes(w));
  check(nodig.length === 0, `rapport bevat structuur, groepen en statussen${nodig.length ? ` (mist: ${nodig.join(', ')})` : ''}`);
  check(rap.naam === 'simulise-rapport-groups-id-assignments.md', `bestandsnaam zonder id's (${rap.naam})`);
  check(rap.tekst.includes('/@{gebruiker}/assignment/{uuid}/review') && rap.tekst.includes('@[gebruiker]'), 'gebruikersnamen (@...) vervangen in links en tekst');
  fs.writeFileSync(path.join(os.tmpdir(), 'sd-voorbeeldrapport.md'), rap.tekst);
  await sim.hover('#notifications-dropdown a.list-group-item >> nth=2');
  const menu = await leesDownload('r');
  check(menu.tekst.includes('Structuur rond het element onder de muis: `#notifications-dropdown`') && menu.tekst.includes('Meetmoment SD Engels M4') && menu.tekst.includes('a.media.list-group-item.font-thin[href=/notification/{id}/process] × 9'),
    'rapport beschrijft ook het menu onder de muis (buiten #content)');
  const menuLek = ['Piet', 'Jansen', 'pjansen', 'Sanne', 'Kees', 'Bakker', 'Bouzid'].filter((w) => menu.tekst.includes(w));
  check(!menuLek.length, `menu-rapport zonder namen${menuLek.length ? ` (gelekt: ${menuLek.join(', ')})` : ''}`);
  const str = await leesDownload('s');
  check(!/MEP1A|Reflectie|Student 1/.test(str.tekst) && str.tekst.includes('table.table.table-index'), 'S: structuurrapport zonder tekst');
  await sim.keyboard.press('Escape');
  check(!(await sim.isVisible(balk)), 'Esc stopt de Inspector');
  await popup.uncheck('#developer'); await sim.waitForTimeout(300);

  check(meldVerzoeken.includes('40'), `menu vraagt meer meldingen op (verzoeken met first: ${meldVerzoeken.join(', ')})`);

  // Meldingenpagina
  await sim.goto('https://ma.simulise.com/notifications'); await sim.waitForTimeout(500);
  const artZichtbaar = () => sim.$$eval('#content .timeline > article.timeline-item:not(.active)', (as) => as.filter((a) => a.offsetParent !== null).length);
  const meldInfo = () => sim.textContent('#sim-docent-meldingen .info');
  check((await artZichtbaar()) === 3 && (await meldInfo()) === '3 van 6 meldingen verborgen (andere opleidingen)', `meldingenpagina: 3 van 6 verborgen (${await artZichtbaar()} zichtbaar, "${await meldInfo()}")`);
  await sim.click('#sim-docent-meldingen .meer'); await sim.waitForTimeout(800);
  check((await artZichtbaar()) === 6 && (await meldInfo()) === "6 van 12 meldingen verborgen (andere opleidingen) · 6 toegevoegd van volgende pagina's",
    `volgende pagina's doorzocht en relevante toegevoegd (${await artZichtbaar()} zichtbaar, "${await meldInfo()}")`);
  check(!(await sim.isVisible('#sim-docent-meldingen .meer')), 'knop verdwijnt na de laatste pagina');
  await sim.click('#sim-docent-meldingen .toon'); await sim.waitForTimeout(200);
  check((await artZichtbaar()) === 12, '"Toon even alles" op de meldingenpagina');
  await zet({ notifFilter: false });
  check((await artZichtbaar()) === 6 && !(await sim.isVisible('#sim-docent-meldingen')), 'module meldingen uitzetten: balk en toegevoegde meldingen weg, pagina zoals Simulise hem gaf');
  await zet({ notifFilter: true });

  // Groep met uuid-adres onthouden via de kop van de groepspagina
  await sim.goto(`https://ma.simulise.com/groups/school/${UUID}/assignments`); await sim.waitForTimeout(400);
  const groepen = await popup.evaluate(() => chrome.storage.local.get('sdGroups').then((s) => s.sdGroups));
  check(groepen[`school/${UUID}`] === 'MR1A' && groepen[101] === 'MEP1A' && !Object.values(groepen).includes('Community'), `groep met uuid onthouden uit de kop (${JSON.stringify(groepen)})`);

  // Filter in Beoordelen
  await sim.goto('https://ma.simulise.com/assignments/assigned?filters=status:HANDED_IN'); await sim.waitForTimeout(500);
  // De vlag voor perpagina.js wordt bij het eerste bezoek gezet; vanaf de volgende keer laden geldt hij.
  graphqlVerzoeken.length = 0;
  await sim.reload(); await sim.waitForTimeout(700);
  const perPage = () => sim.evaluate(() => document.documentElement.dataset.testPerPage);
  check((await perPage()) === '100' && graphqlVerzoeken.join() === '1/200,1/100',
    `Alles op één pagina: lijst in één keer opgevraagd, met terugval bij een maximum (verzoeken ${graphqlVerzoeken.join(', ')}, kreeg ${await perPage()})`);
  const zichtbaar = () => sim.$$eval('table.table-index tbody tr', (rs) => rs.filter((r) => r.offsetParent !== null).map((r) => r.querySelector('strong').textContent));
  const info = () => sim.textContent('#sim-docent-beoordelen .info');
  check(await sim.isVisible('#sim-docent-beoordelen .bar'), 'filterbalk boven de Beoordelen-lijst');
  let z = await zichtbaar();
  check(z.length === 4 && !z.some((t) => /SD|GA/.test(t)) && z.includes('Meetmoment MEP/MIP Engels M1 (Cohort 2026)') && z.includes('Meetmoment MR Nederlands M1'),
    `Mijn opleidingen: meetmomenten SD en GA verborgen, eigen en gewone opdrachten zichtbaar (${z.join(' | ')})`);
  check((await info()) === '3 van 7 verborgen op deze pagina', `aantal verborgen zichtbaar ("${await info()}")`);

  // Mijn groepen
  await sim.click('#sim-docent-beoordelen button[data-modus="groepen"]'); await sim.waitForTimeout(300);
  check((await info()) === 'Kies je groepen bij Instellingen.', `Mijn groepen zonder keuze vraagt om groepen ("${await info()}")`);
  await sim.click('#sim-docent-beoordelen button:has-text("Instellingen")');
  const vinkjes = sim.locator('#sim-docent-beoordelen .groepen input');
  check(await vinkjes.count() === 4 && (await sim.textContent('#sim-docent-beoordelen .groepen')).includes('MEP1A(1)'), `groepen uit Simulise met aantallen (${await sim.textContent('#sim-docent-beoordelen .groepen')})`);
  await sim.click('#sim-docent-beoordelen button:has-text("Kies de groepen van mijn opleidingen")'); await sim.waitForTimeout(400);
  const gekozen = await popup.evaluate(() => chrome.storage.sync.get('bdGroepen').then((s) => s.bdGroepen));
  check(JSON.stringify(gekozen) === JSON.stringify(['key-grp-111111', 'key-grp-222222']), `opleidingscodes kiezen MEP1A en MR1A (${JSON.stringify(gekozen)})`);
  z = await zichtbaar();
  check(z.join(' | ') === 'Meetmoment MEP/MIP Engels M1 (Cohort 2026) | MEP 1 - CREA - Brochure/Reisgids | Meetmoment MR Nederlands M1',
    `Mijn groepen: alleen rijen van MEP1A en MR1A, plus de rij zonder groep (${z.join(' | ')})`);
  check((await info()) === '4 van 7 verborgen op deze pagina · 1 zonder groep (zichtbaar)', `telling bij Mijn groepen ("${await info()}")`);
  await sim.locator('#sim-docent-beoordelen .groepen label:has-text("SD2B") input').check(); await sim.waitForTimeout(400);
  check((await zichtbaar()).length === 6, 'groep SD2B aanvinken toont ook die rijen');
  await sim.click('#sim-docent-beoordelen button:has-text("Instellingen")'); // weer dicht
  await sim.click('#sim-docent-beoordelen button[data-modus="mijn"]'); await sim.waitForTimeout(300);
  await sim.click('#sim-docent-beoordelen button[data-modus="alles"]'); await sim.waitForTimeout(300);
  check((await zichtbaar()).length === 7, 'Alles: alle rijen zichtbaar');
  await sim.click('#sim-docent-beoordelen button[data-modus="mijn"]'); await sim.waitForTimeout(300);
  await sim.click('#sim-docent-beoordelen .toon'); await sim.waitForTimeout(100);
  check((await zichtbaar()).length === 7, '"Toon even alles" laat tijdelijk alles zien');
  await sim.click('#sim-docent-beoordelen .toon'); await sim.waitForTimeout(100);
  check((await zichtbaar()).length === 4, '"Filter weer aan" verbergt weer');
  await sim.click('#sim-docent-beoordelen button:has-text("Instellingen")');
  await sim.fill('#sim-docent-beoordelen #sd-bdUitsluiten', 'brochure'); await sim.press('#sim-docent-beoordelen #sd-bdUitsluiten', 'Tab'); await sim.waitForTimeout(400);
  z = await zichtbaar();
  check(z.length === 3 && !z.some((t) => t.includes('Brochure')), `uitsluitwoord "brochure" verbergt die opdracht (${z.join(' | ')})`);
  // Simulise bouwt de tabel opnieuw op (bijv. andere pagina): filter moet opnieuw werken
  await sim.evaluate((titels) => { document.querySelector('table.table-index tbody').innerHTML = titels.map((t) => `<tr><td></td><td>Student Y</td><td><a href="#"><strong>${t}</strong></a></td><td></td></tr>`).join(''); },
    ['Meetmoment SD Engels M2', 'Meetmoment MEP/MIP Rekenen M1', 'Opdracht X']);
  await sim.waitForTimeout(800);
  check((await zichtbaar()).length === 2 && (await info()) === '1 van 3 verborgen op deze pagina', 'filter werkt ook na het opnieuw opbouwen van de tabel');
  await zet({ grading: false });
  check((await zichtbaar()).length === 3 && !(await sim.isVisible('#sim-docent-beoordelen')), 'module uitzetten: filterbalk weg en alles zichtbaar');
  await zet({ grading: true, bdUitsluiten: '' });
  graphqlVerzoeken.length = 0;
  await Promise.all([sim.waitForEvent('load'), sim.click('#sim-docent-beoordelen button.een')]); await sim.waitForTimeout(700);
  check((await perPage()) === '25' && graphqlVerzoeken.join() === '2/25', `"Alles op één pagina" uit: Simulise werkt weer per 25 (verzoeken ${graphqlVerzoeken.join(', ')})`);
  check((await sim.getAttribute('#sim-docent-beoordelen button.een', 'aria-pressed')) === 'false', 'knop "Alles op één pagina" staat uit');
  await zet({ bdEenPagina: true });

  // Netwerkrapport (N): opbouw van de verzoeken, zonder namen
  await zet({ developer: true });
  await sim.goto('https://ma.simulise.com/assignments/assigned?filters=status:HANDED_IN'); await sim.waitForTimeout(1300);
  await sim.keyboard.press('Alt+KeyI');
  const net = await leesDownload('n');
  const netLek = ['Piet', 'Jansen', 'pjansen', 'Meetmoment SD', 'Opdracht X'].filter((w) => net.tekst.includes(w));
  check(netLek.length === 0, `netwerkrapport bevat geen namen of titels${netLek.length ? ` (gelekt: ${netLek.join(', ')})` : ''}`);
  const netNodig = ['vanaf het laden van de pagina', 'GET /api/vroeg?per_page=25', 'xmlhttprequest · `/api/vroeg?per_page=25`', 'fetch · `/api/graphql`',
    'div[data-options]', '"student": "string"', 'AssignedAssignments', '"first": 25', '"page": 2', 'HANDED_IN', '"total": 34', 'per_page=25', '"username"', 'GET /assignments/assigned/data?page=2&per_page=25&q=…'].filter((w) => !net.tekst.includes(w));
  check(netNodig.length === 0, `netwerkrapport toont adressen, paginering en veldnamen${netNodig.length ? ` (mist: ${netNodig.join(', ')})` : ''}`);
  await sim.keyboard.press('Escape');
  await zet({ developer: false });

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
  check(geschreven.versie === '9.9.9' && geschreven.mods === 13, `bestanden in de map geschreven (manifest ${geschreven.versie}, ${geschreven.mods} modules)`);
  check(geschreven.herladen, 'extensie herlaadt zich na het bijwerken');

  await ctx.close();
  console.log(fouten.length ? `\nMISLUKT:\n- ${fouten.join('\n- ')}` : '\nOK');
  process.exit(fouten.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
