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
const MELDINGENPAGINA = (n) => `<html><head></head><body>
<header class="header navbar"><ul class="nav navbar-nav navbar-right nav-user"><li id="notifications-dropdown" class="hidden-xs"><a class="dropdown-toggle" href="#"><span class="badge badge-sm up bg-danger count">117</span></a>
<section class="dropdown-menu aside-xl"><section class="panel bg-white"><div class="panel-heading"><strong>Je hebt 117 ongelezen meldingen.</strong></div><div class="list-group"></div>
<div class="panel-footer text-sm b-t"><a class="pull-right" href="/profile/settings?panel=notifications"><i class="fa fa-fw fa-cog"></i></a>
<a class="pull-right m-r-sm" href="#" data-original-title="Markeer alles als gelezen" onclick="event.preventDefault(); document.documentElement.dataset.testAllesGelezen = 'ja';"><i class="fa fa-fw fa-check"></i></a>
<a href="/notifications">Bekijk alle meldingen...</a></div></section></section></li></ul></header>
<aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><section class="vbox">
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
  fetch('/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operationName: 'getUserEducationDiagram',
    query: 'query getUserEducationDiagram($educationId: ID!, $userId: String!) { user(id: $userId) { id diagram: diagramForEducation(id: $educationId) { id phaseCount aspects { id aspect { id name skill { id color __typename } __typename } phases { id phase weights { level title __typename } reviews { id color createdAt author { id name } } currentScore reviewProgress reviewsAchieved reviewsRequired } } } username } }',
    variables: { userId: 'pjansen', educationId: 'e1' } }) });
}, 700);</script></body></html>`;
const UUID = '0a1b2c3d-1111-4222-8333-444455556666';
const APP_GQL = `<script>fetch('https://api.simulise.com/graphql', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-test': 'app' }, body: JSON.stringify({ operationName: 'appStart', query: 'query appStart { viewer { id } }', variables: {} }) });</script>`;
const APP_PROFIEL = `<script>
const q = (operationName, query, variables) => fetch('https://api.simulise.com/graphql', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-test': 'app' }, body: JSON.stringify({ operationName, query, variables }) });
setTimeout(() => {
  // Zoals (waarschijnlijk) bij Simulise: eerst de gebruiker opzoeken met de gebruikersnaam, daarna alles met de interne id.
  q('dashboardDiscoverUser', 'query dashboardDiscoverUser($id: String!) { user(id: $id) { id username } }', { id: location.pathname.slice(2) });
  q('dashboardTileEducationDiagram', 'query dashboardTileEducationDiagram($id: String!) { dashboard: user(id: $id) { id username educations: dashboardEducations { id name groups { ... on SchoolGroup { id name } } isDefault } } }', { id: 'u-' + location.pathname.slice(2) });
  q('getUserEducationDiagram', 'query getUserEducationDiagram($educationId: ID!, $userId: String!) { user(id: $userId) { id diagram: diagramForEducation(id: $educationId) { id phaseCount aspects { id aspect { id name skill { id color } } phases { id phase weights { level title } reviews { id color score title maxScore scoreName } currentScore reviewProgress reviewsAchieved reviewsRequired } } } username } }', { educationId: 'e-bava', userId: 'u-' + location.pathname.slice(2) });
}, 200);</script>`;
// Nagebootst beoordeelscherm: lijst met studenten (alleen plaatjes), omslag, vier delen en de onderbalk van Simulise.
const REVIEW = (nu) => `<html><head></head><body><section id="app" class="vbox"><header class="header navbar">bovenbalk</header><section><section class="hbox stretch">
<aside id="nav"><ul class="nav-main"><li><a href="/dashboard"><i class="fa"></i><span>Dashboard</span></a></li></ul></aside>
<section id="content"><div class="vbox"><div class="vbox"><header class="header header-md"><p class="header-text"><span>Beoordelen</span></p></header>
<section id="scrollable-page-wrapper"><div class="flex-wrapper flex-row"><div class="review-group-panel"><a href="/assignments/assigned">terug</a><div class="groups-table">
${['success', 'warning', 'danger', 'warning', 'blank'].map((st, i) => (i + 1 === nu
    ? `<div class="selected item"><div class="usercard"><img class="avatar" alt="Piet Jansen"></div><div class="bg-backport-${st} user-status"></div></div>`
    : `<a class="item" href="/@student${i + 1}/assignment/00000000-0000-4000-8000-00000000000${i + 1}/review?nr=${i + 1}&group=vg-mr1a"><div class="usercard"><img class="avatar" alt="Sanne de Vries"></div><div class="bg-backport-${st} user-status"></div></a>`)).join('')}
</div><div class="circle-button" onclick="this.parentElement.classList.toggle('expanded')">uitklappen</div></div><div class="flex-wrapper flex-column flex-grow"><div class="full-width-wrapper"><div class="width-filling-header"><div class="assignment-details"><h1>PS_1.8: Wie ben ik?</h1><div class="footer-details">ingeleverd</div></div></div></div>
<div class="fluid-container-max-width"><div class="spacing-bottom-30"><h2>Omschrijving</h2><p id="oms">Lange tekst van de opdracht</p></div><div class="spacing-bottom-30"><h2>Ingevulde pagina</h2><p>werk</p></div>
<div><h2>Reflecties</h2><div class="wrapper-reflection">rubric<div class="badges-title-wrapper"><div class="item"><img alt=""><div class="badge-small-screen">Voldaan</div></div></div>
<div class="reflection-wrapper"><h4>Algemeen</h4><div class="reflection-items"><div class="item"><div><div class="content"><strong class="d-md-none" style="display:none">Voldaan</strong><div>${'Een lange omschrijving van het niveau. '.repeat(12)}</div></div><div class="authors d-none d-md-flex"><a class="avatar"><img alt=""></a></div></div></div></div></div></div></div><div class="spacing-bottom-30"><h2>Feedback</h2><textarea></textarea></div></div>
<div class="fixed-bottom-bar assignment-status-bar"><button class="ladda-button">Afronden &amp; volgende</button></div></div></div></section></div></div></section></section></section></section>
<script>fetch('https://api.simulise.com/graphql', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-test': 'app' }, body: JSON.stringify({ operationName: 'appStart', query: 'query appStart { viewer { id } }', variables: {} }) });</script></body></html>`;
const PROFIEL = `<html><head></head><body><aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><section id="scrollable-page-wrapper"><div class="p-0">
<div class="s-card"><div class="panel panel-default"><table class="table"><tr><td><h3 class="font-thin">Sam Voorbeeld</h3></td></tr></table></div></div>
<div class="s-card col-span-2"><div class="panel panel-default"><div class="panel-heading p-sm"><div class="row"><p class="h3 font-thin"><div>Opleidingen</div></p></div></div><div class="row"><canvas></canvas></div></div></div>
</div></section></div>${APP_GQL}${APP_PROFIEL}</body></html>`;
const GROEPEN = `<html><head></head><body><aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><table class="table table-v-a-m table-index"><tbody>
<tr><td><a href="/groups/school/${'0a1b2c3d-1111-4222-8333-444455556666'}/community"><strong>MEP1A</strong></a></td><td><div class="btn-group m-t-none"><button class="btn btn-sm btn-info dropdown-toggle">v</button>
<ul class="dropdown-menu"><li><a href="/groups/school/${'0a1b2c3d-1111-4222-8333-444455556666'}/students">Studenten</a></li></ul></div></td></tr></tbody></table></div>${APP_GQL}</body></html>`;
// Studentenpagina zonder profiel-links (zoals bij Simulise bleek); de studenten staan als kolommen op de opdrachtenpagina.
const ANALYTICS = `<html><head></head><body><aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><section id="scrollable-page-wrapper"><div><div class="row">
<div class="col-lg-4 col-sm-12 col-xs-12 m-b-xs col-md-6"><section class="panel panel-link hbox"><div class="panel-link-icon bg-primary"><a class="h3 font-thin" href="#">Leerlijnen</a></div>
<button class="btn btn-success btn-sm">Nieuwe rapportage</button><div class="panel-footer"><em>Geen opgeslagen rapportages</em></div></section></div></div></div></section></div>${APP_GQL}</body></html>`;
const STUDENTEN = `<html><head></head><body><div id="content"><div class="student-lijst" data-vue="1"></div></div></body></html>`;
// Leerlijndiagram zoals Simulise het geeft (verzonnen student).
const FASE = (phase, behaald, score, datum) => ({ id: `f${phase}`, phase, weights: [{ level: -1, title: 'Niet beoordeeld' }, { level: 0, title: 'Nog niet aangetoond' }, { level: 1, title: 'Op koers' }, { level: 2, title: 'Boven verwachting' }],
  reviews: datum ? [{ id: 'r', color: '#000', score, title: `Beoordeling ${datum}: x`, maxScore: 3, scoreName: 'x' }] : [], currentScore: datum ? score : null, reviewProgress: null, reviewsAchieved: behaald ? 1 : 0, reviewsRequired: 1 });
const ASPECT = (name, color, fasen) => ({ id: name, aspect: { id: name, name, skill: { id: 's', color } }, phases: [4, 3, 2, 1].map((p) => fasen[p] || FASE(p, false, null, null)) });
const DIAGRAM = { 'e-beroeps': { id: 'd', phaseCount: 4, aspects: [
  ASPECT('1. Adviseren over mediaproducten', '#2563eb', { 1: FASE(1, true, 2, '02-11-2026') }),
  ASPECT('2. Voorbereiden van de mediaproductie', '#f97316', { 1: FASE(1, true, 1, '29-10-2026') }),
  ASPECT('3. Coördineert de mediaproductie', '#16a34a', { 1: FASE(1, true, 1, '04-11-2026') }),
  ASPECT('4. Professioneel handelen', '#9333ea', { 1: FASE(1, false, 0, '03-11-2026') }),
  ASPECT('5. Vakvaardigheden', '#0e7490', { 1: FASE(1, true, 1, '20-10-2026'), 2: FASE(2, true, 1, '05-11-2026') })] },
  'e-bava': { id: 'd2', phaseCount: 5, aspects: [ASPECT('Lezen', '#e8650a', { 1: FASE(1, true, 1, '04-11-2026'), 2: FASE(2, true, 1, '04-11-2026') }), ASPECT('Reading', '#24388f', {})] } };
const GROEPSPAGINA = `<html><head></head><body><aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><section class="vbox"><header class="header header-md">
<div class="header-title"><p class="header-text"><span class="header-text-first-item"><a href="/groups"><span>Groepen</span></a></span><span class="text-muted">/</span><span>MR1A</span></p></div>
<ul class="nav nav-tabs"><li><a href="/groups/school/${UUID}/community"><span>Community</span></a></li></ul></header>
<table class="table table-bordered rotated-header"><thead><tr><th></th><th class="text-center rotated"><div class="rotated-header-container"><a href="/@studenta/assignments"><div class="rotated-header-content">Anna Test</div></a></div></th>
<th class="text-center rotated"><div class="rotated-header-container"><a href="/@studentb/assignments"><div class="rotated-header-content">Bram Test</div></a></div></th></tr></thead></table></section></div></body></html>`;


// Analytics, Opleiding per groep (resultaat): de app vraagt getResults voor één opleiding, 25 rijen per keer.
const RESULTAAT = `<html><head></head><body><aside id="nav"><ul class="nav-main"></ul></aside><div id="content"><div class="vbox"><div class="vbox">
<header class="header header-md"><div class="header-title"><p class="header-text"><span class="header-text-first-item"><a href="/analytics">Analytics</a></span><span>/</span><span><a href="/analytics/educationbygroups/reports">Opleiding per groep</a></span></p>
<span class="header-title-divider">·</span><div class="btn-group"><a class="btn btn-info" href="#"><i class="fas fa-filter"></i><span>Filters</span></a></div><a class="btn btn-info" href="#" data-original-title="Download"><i class="fa fa-fw fa-download"></i></a></div></header>
<section id="scrollable-page-wrapper"><div class="row"><div class="col-lg-12"><ul class="list-inline m-l-none"><li class="list-group-item"><div><i class="fa fa-fw fa-school"></i><span><span>BAVA 4</span></span></div></li><li class="list-group-item"><div><i class="fa fa-users"></i><span>MEP1A</span></div></li></ul></div></div></section></div></div></div>
<script>fetch('https://api.simulise.com/graphql', { method: 'POST', headers: { 'content-type': 'text/plain', 'x-test': 'app' }, body: JSON.stringify({ operationName: 'getResults',
  query: 'query getResults($reportId: ID, $query: AnalyticsQueryInput) { analyticsQuery(input: {reportId: $reportId, query: $query}) { table { rows { header { value { ... on User { id name } } } columns { ... on EducationByGroupsTableRowCell { aspect { id name skill { id color } } phases { phase score reviewsAchieved reviewsRequired weights { level title } reviews { id score title } } } } } total hasMore } } }',
  variables: { reportId: null, query: { type: 'educationbygroups', pickers: [{ key: 'EDUCATION', values: ['ed-bava'] }, { key: 'ASPECTS', values: ['x'] }, { key: 'USERS', values: ['group:g'] }, { key: 'TIMERANGE', values: ['2026-08-01', '2027-08-01'] }], options: [], page: 1, orderBy: { field: 'LASTNAME', direction: 'ASC' } } } }) });</script></body></html>`;
// 30 verzonnen studenten, zodat er een tweede pagina nodig is.
const RES_STUDENTEN = Array.from({ length: 30 }, (_, i) => ({ id: `u-res${i}`, name: `Test Student ${String(i + 1).padStart(2, '0')}` }));

const ext = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const fouten = [];
// Met SD_BEELD=<map> bewaart de test schermafbeeldingen van de eigen schermen (nagebootste gegevens).
const beeld = async (pagina, naam) => {
  if (!process.env.SD_BEELD) return;
  const maat = pagina.viewportSize();
  await pagina.setViewportSize({ width: 1280, height: 2400 }); // de nagebootste pagina heeft geen opmaak: alleen het eigen scherm vastleggen
  await pagina.locator('#sim-docent-vandaag .binnen').screenshot({ path: path.join(process.env.SD_BEELD, `${naam}.png`) });
  await pagina.setViewportSize(maat);
};
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
    if (/^\/@[^/]+\/assignment\/[^/]+\/review/.test(p)) return r.fulfill({ contentType: 'text/html', body: REVIEW(Number(u.searchParams.get('nr')) || 2) });
    if (p.startsWith('/@')) return r.fulfill({ contentType: 'text/html', body: PROFIEL });
    if (p === '/analytics') return r.fulfill({ contentType: 'text/html', body: ANALYTICS });
    if (p === '/analytics/educationbygroups/result') return r.fulfill({ contentType: 'text/html', body: RESULTAAT });
    if (p === '/api/autocomplete/analytics/educations') return r.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'ed-bava', text: 'BAVA 4', value: 'ed-bava', prefix: '' }, { id: 'ed-beroeps', text: 'Mediaproducer / Music Industry Professional', value: 'ed-beroeps', prefix: '' },
      { id: 'ed-oud', text: 'Mediaproducer (Cohort 2024)', value: 'ed-oud', prefix: '' }, { id: 'ed-sd', text: 'Software Developer', value: 'ed-sd', prefix: '' }]) });
    if (p === '/groups') return r.fulfill({ contentType: 'text/html', body: GROEPEN });
    if (/^\/groups\/school\/[^/]+\/students$/.test(p)) return r.fulfill({ contentType: 'text/html', body: STUDENTEN });
    if (p === '/notifications') return r.fulfill({ contentType: 'text/html', body: MELDINGENPAGINA(parseInt(u.searchParams.get('page'), 10) || 1) });
    if (p === '/api/vroeg') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ rows: [{ name: 'Piet Jansen' }], per_page: 25, total: 34 }) });
    if (p === '/api/graphql' && (r.request().postData() || '').includes('getUserEducationDiagram')) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { user: { id: 'u-77', username: 'pjansen',
      diagram: { id: 'd1', phaseCount: 4, aspects: [{ id: 'a1', aspect: { id: 'as1', name: '1. Adviseren over mediaproducten', skill: { id: 's1', color: '#2f6fed' } },
        phases: [{ id: 'p1', phase: 1, weights: [{ level: 1, title: 'Voldaan' }, { level: 2, title: 'Boven verwachting' }], reviews: [{ id: 'r1', color: 'GREEN', createdAt: '2026-11-02 10:00:00', author: { id: 'x', name: 'Piet Jansen' } }],
          currentScore: 1, reviewProgress: 100, reviewsAchieved: 1, reviewsRequired: 1 }] }] } } } }) });
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
  const rapportVerzoeken = [];
  const resultaatVerzoeken = [];
  let tellerVerzoeken = 0;
  const vandaagVerzoeken = [];
  const klasVerzoeken = [];
  const vandaagAfgerond = { n: 40 };
  await ctx.route('https://api.simulise.com/graphql', (r) => {
    const verzoek = JSON.parse(r.request().postData() || '{}');
    const antw = (body) => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (verzoek.operationName === 'appStart') return antw({ data: { viewer: { id: 'v' } } });
    const OPLEIDINGEN = [{ id: 'e-bava', name: 'BAVA 4', groups: [{ id: 'g', name: 'MEP1A' }], isDefault: true }, { id: 'e-beroeps', name: 'Mediaproducer / Music Industry Professional', groups: [{ id: 'g', name: 'MEP1A' }], isDefault: false }];
    // Zoals bij het echte Simulise: de eigen studentvraag van de extensie wordt geweigerd.
    if (verzoek.operationName === 'sdRapportStudent') return antw({ errors: [{ message: 'This action is unauthorized.' }], data: { user: null } });
    if (verzoek.operationName === 'dashboardDiscoverUser') return antw({ data: { user: { id: `u-${verzoek.variables.id}`, username: verzoek.variables.id } } });
    if (verzoek.operationName === 'dashboardTileEducationDiagram') {
      const id = verzoek.variables.id;
      if (!String(id).startsWith('u-')) return antw({ errors: [{ message: 'This action is unauthorized.' }], data: { dashboard: null } });
      return antw({ data: { dashboard: { id, username: id.slice(2), educations: OPLEIDINGEN } } });
    }
    if (verzoek.operationName === 'getUserEducationDiagram') {
      if (verzoek.variables.educationId === 'e-beroeps') rapportVerzoeken.push(r.request().headers()['x-test'] || '');
      if (!String(verzoek.variables.userId).startsWith('u-')) return antw({ errors: [{ message: 'This action is unauthorized.' }], data: { user: null } });
      return antw({ data: { user: { id: verzoek.variables.userId, diagram: DIAGRAM[verzoek.variables.educationId], username: 'x' } } });
    }
    if (verzoek.operationName === 'sdRapportDiagram') {
      if (verzoek.query.includes('skill { id name color }')) return antw({ errors: [{ message: 'Cannot query field "name" on type "EducationSkill".' }], data: null });
      if (!String(verzoek.variables.userId).startsWith('u-')) return antw({ errors: [{ message: 'onbekende gebruiker' }], data: { user: null } });
      return antw({ data: { user: { id: verzoek.variables.userId, diagram: DIAGRAM[verzoek.variables.educationId] } } });
    }
    if (verzoek.operationName === 'getResults') {
      const q = verzoek.variables.query, ed = q.pickers.find((x) => x.key === 'EDUCATION').values[0];
      resultaatVerzoeken.push(`${ed}/${q.page}/${q.pickers.some((x) => x.key === 'ASPECTS') ? 'met' : 'zonder'}-leerlijnen`);
      const bron = DIAGRAM[ed === 'ed-bava' ? 'e-bava' : 'e-beroeps'];
      const leeg = ed === 'ed-oud'; // ander cohort: niets beoordeeld
      const stuk = RES_STUDENTEN.slice((q.page - 1) * 25, q.page * 25);
      return antw({ data: { analyticsQuery: { table: {
        header: { columns: [{ value: { __typename: 'Skill', id: 's', name: ed === 'ed-bava' ? 'Taal' : 'Beroeps' } }] },
        rows: stuk.map((u, i) => ({ header: { value: { __typename: 'User', ...u } }, columns: bron.aspects.map((a) => ({ __typename: 'EducationByGroupsTableRowCell', aspect: a.aspect,
          phases: a.phases.map((f) => (leeg ? { ...f, reviews: [], reviewsAchieved: 0, score: null } : { ...f, score: f.currentScore, currentScore: undefined, reviewsAchieved: i % 2 && f.phase === 2 ? 0 : f.reviewsAchieved })) })) })),
        total: RES_STUDENTEN.length, hasMore: q.page * 25 < RES_STUDENTEN.length } } } });
    }
    if (verzoek.operationName === 'sdDocentTeller') {
      tellerVerzoeken++;
      if (Number(verzoek.query.match(/first: (\d+)/)?.[1]) > 100) {
        return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ errors: [{ message: 'Maximum number of 100 requested items exceeded' }] }) });
      }
      // 121 ongelezen: 7 relevant, plus 110 meetmomenten van SD; de server geeft per pagina hooguit 100.
      const items = [...MENU, 'Kees Bakker heeft opdracht Portfolio M1 ingeleverd.', 'Piet Jansen heeft opdracht Meetmoment SD Engels M2 ingeleverd.',
        ...Array.from({ length: 110 }, (_, i) => `Student Q heeft opdracht Meetmoment SD Rekenen M${i} ingeleverd.`)];
      const first = Number(verzoek.query.match(/first: (\d+)/)[1]), page = Number(verzoek.query.match(/page: (\d+)/)?.[1] || 1);
      const stuk = items.slice((page - 1) * first, page * first);
      return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: { viewer: { notifications: { data: stuk.map((text, i) => ({ id: `m${page}-${i}`, text })), paginatorInfo: { total: items.length, lastPage: Math.ceil(items.length / first) } } } } }) });
    }
    if (verzoek.operationName === 'getLatestUnreadNotification') {
      meldVerzoeken.push(verzoek.query.match(/notifications\(first: (\d+)/)?.[1]);
      return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ data: { viewer: { notifications: { data: [], paginatorInfo: { total: 118 } } } } }) });
    }
    if (verzoek.operationName === 'sdDocentKlassen') {
      // Klassen van de docent: één gearchiveerde (valt weg). 'x' is de groep in de links van de nagebootste Beoordelen-lijst.
      return antw({ data: { viewer: { id: 'v', groupsByType: { data: [{ __typename: 'SchoolGroup', id: 'vg-mr1a', name: 'MR1A', isArchived: false },
        { __typename: 'SchoolGroup', id: 'vg-oud', name: 'MEP1A', isArchived: true }, { __typename: 'SchoolGroup', id: 'vg-mep1a', name: 'MEP1A', isArchived: false },
        { __typename: 'SchoolGroup', id: 'x', name: 'MIP1B', isArchived: false }], paginatorInfo: { hasMorePages: false } } } } });
    }
    if (verzoek.operationName === 'sdDocentKlasTellers') {
      if (!/__typename/.test(verzoek.query)) return antw({ errors: [{ message: 'Internal server error' }], data: null });
      return antw({ data: { assignedAssignments: { data: [], aggregations: { groups: [{ key: 'vg-mep1a', count: 4 }, { key: 'vg-mr1a', count: 1 }, { key: 'vg-sd2b', count: 2 }] } } } });
    }
    if (verzoek.operationName === 'sdDocentVandaag') {
      // Scherm Vandaag: openstaande inleveringen over twee pagina's, daarna de afgeronde. Nepnamen.
      const f = verzoek.variables.filters[0], pagina = verzoek.variables.page;
      vandaagVerzoeken.push(`${f.includes('FINISHED') ? 'klaar' : 'open'}/${pagina}/${verzoek.variables.perPage}`);
      // Zoals het echte Simulise: zonder __typename binnen aggregations een serverfout.
      if (!/statuses \{ key count \} __typename \}/.test(verzoek.query)) return antw({ errors: [{ message: 'Internal server error', path: ['assignedAssignments', 'aggregations'] }], data: null });
      const VG = { MEP1A: 'vg-mep1a', MR1A: 'vg-mr1a', SD2B: 'vg-sd2b' };
      const geleden = (d) => new Date(Date.now() - d * 864e5 - 36e5).toISOString();
      const inl = (i, titel, opdr, groep, dagen, wie, status = 'HANDED_IN') => ({ id: `vd-${i}`, status, deliveredAt: geleden(dagen), connectableKey: `connectable:vc-${opdr}-${groep}`,
        user: { username: wie, name: 'Piet Jansen' }, assignment: { id: opdr, title: titel, forEducations: /^Meetmoment/.test(titel) },
        assignmentConnection: { id: `vc-${opdr}-${groep}`, connectable: { id: VG[groep] } } });
      const open = [inl(1, 'ENG_1.5: True crime', 'o-eng', 'MEP1A', 2, 'sdevries'), inl(2, 'ENG_1.5: True crime', 'o-eng', 'MEP1A', 12, 'pjansen'), inl(3, 'Meetmoment SD Engels M4', 'o-sd', 'SD2B', 20, 'abouzid'),
        inl(4, 'PS_1.8: Wie ben ik?', 'o-ps', 'MR1A', 6, 'kbakker', 'BEING_PROCESSED'), inl(5, 'ENG_1.5: True crime', 'o-eng', 'MEP1A', 3, 'kbakker'),
        inl(6, 'Meetmoment SD Engels M4', 'o-sd', 'SD2B', 1, 'pjansen'), inl(7, 'Meetmoment MEP/MIP Engels M1 (Cohort 2026)', 'o-mm', 'MEP1A', 1, 'sdevries')];
      const klaar = [inl(8, 'ENG_1.5: True crime', 'o-eng', 'MEP1A', 30, 'x1', 'FINISHED'), inl(9, 'ENG_1.5: True crime', 'o-eng', 'MEP1A', 31, 'x2', 'FINISHED')];
      const groep = (verzoek.variables.filters[1] || '').replace(/^group:/, '');
      if (groep) klasVerzoeken.push(groep);
      const vanGroep = (lijst) => (groep ? lijst.filter((x) => x.assignmentConnection.connectable.id === groep) : lijst);
      // Nog niet ingeleverd (alleen gevraagd op de thuispagina van een klas, voor de stippenkaart).
      const rest = [inl(10, 'PS_1.8: Wie ben ik?', 'o-ps', 'MR1A', 0, 'y1', 'NOT_STARTED'), inl(11, 'PS_1.8: Wie ben ik?', 'o-ps', 'MR1A', 0, 'y2', 'NOT_STARTED'), inl(12, 'PS_1.8: Wie ben ik?', 'o-ps', 'MR1A', 0, 'y3', 'DEADLINE_PAST'),
        inl(13, 'LOB - werkveld verkennen', 'o-lob', 'MR1A', 0, 'y4', 'IN_PROGRESS')];
      const alle = vanGroep(f.includes('NOT_STARTED') ? rest : f.includes('FINISHED') ? klaar : open), stuk = /FINISHED|NOT_STARTED/.test(f) ? alle : alle.slice((pagina - 1) * 4, pagina * 4);
      return antw({ data: { assignedAssignments: { data: stuk,
        aggregations: { groups: Object.entries(VG).map(([naam, gid]) => ({ key: gid, item: { autocompletion: { id: `school_group:${gid}`, text: naam, value: gid } }, count: 1 })),
          statuses: groep ? [{ key: 'FINISHED', count: 5 }, { key: 'DEADLINE_PAST', count: 3 }, { key: 'NOT_STARTED', count: 8 }] : [{ key: 'FINISHED', count: vandaagAfgerond.n }, { key: 'HANDED_IN', count: 6 }] },
        paginatorInfo: { total: alle.length, currentPage: pagina, hasMorePages: !/FINISHED|NOT_STARTED/.test(f) && pagina * 4 < alle.length } } } });
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
  check(await popup.locator('#modules input').count() === 10, 'popup toont aan/uit per module');
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
    `teller toont exact 7 relevante (alle 121 geteld over 2 pagina's) in plaats van 117 (belletje "${await sim.textContent(belletje)}", ${tellerVerzoeken} verzoek(en))`);
  check((await sim.getAttribute(belletje, 'title')).includes('121 in totaal'), `tooltip met het echte totaal ("${await sim.getAttribute(belletje, 'title')}")`);
  check((await sim.textContent('#notifications-dropdown .panel-heading strong')) === 'Je hebt 7 ongelezen meldingen voor jouw opleidingen (van de 121).', 'kop van het menu aangepast');
  await sim.waitForTimeout(1500); // eerst de eerste telling laten uitlopen (Simulise toonde 117, de extensie telt dan nog eens)
  const voor = tellerVerzoeken;
  await sim.evaluate((sel) => { document.querySelector(sel).textContent = '12'; }, belletje); // Simulise werkt de teller bij
  await sim.waitForTimeout(1800);
  check((await sim.textContent(belletje)) === '7' && tellerVerzoeken === voor + 3, `nieuwe waarde van Simulise: opnieuw geteld, terugval naar 100 en 2 pagina's (${tellerVerzoeken - voor} verzoeken, belletje "${await sim.textContent(belletje)}")`);
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
  // Alles als gelezen: eerst bevestigen; annuleren doet niets, bevestigen gebruikt de knop van Simulise
  let dialoog = '';
  sim.once('dialog', (d) => { dialoog = d.message(); d.dismiss(); });
  await sim.click('#sim-docent-meldingen .gelezen'); await sim.waitForTimeout(200);
  check(dialoog.includes('als gelezen markeren') && dialoog.includes('"Markeer alles als gelezen"') && !(await sim.evaluate(() => document.documentElement.dataset.testAllesGelezen)),
    `"Alles als gelezen markeren" vraagt eerst om bevestiging; annuleren doet niets ("${dialoog.split('\n')[0]}")`);
  sim.once('dialog', (d) => d.accept());
  await sim.click('#sim-docent-meldingen .gelezen'); await sim.waitForTimeout(300);
  check((await sim.evaluate(() => document.documentElement.dataset.testAllesGelezen)) === 'ja', 'na bevestigen gebruikt hij de knop van Simulise');
  await sim.waitForTimeout(1600); // de pagina herlaadt
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
  const netLek = ['Piet', 'Jansen', 'pjansen', 'Meetmoment SD', 'Opdracht X', 'u-77'].filter((w) => net.tekst.includes(w));
  check(netLek.length === 0, `netwerkrapport bevat geen namen of titels${netLek.length ? ` (gelekt: ${netLek.join(', ')})` : ''}`);
  const netNodig = ['reviewsAchieved reviewsRequired } } } username } }', '"name": "1. Adviseren over mediaproducten"', '"title": "Boven verwachting"', '"createdAt": "2026-11-02 10:00:00"', '"reviewsRequired": 1', '## Meldingenteller', 'first: 200 · HTTP 200 · fouten: Maximum number of 100 requested items exceeded', "first: 100 · HTTP 200 · 121 meldingen (2 pagina's), totaal 121, tekst met HTML: ja", 'vanaf het laden van de pagina', 'GET /api/vroeg?per_page=25', 'xmlhttprequest · `/api/vroeg?per_page=25`', 'fetch · `/api/graphql`',
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
  check(geschreven.versie === '9.9.9' && geschreven.mods === 19, `bestanden in de map geschreven (manifest ${geschreven.versie}, ${geschreven.mods} modules)`);
  check(geschreven.herladen, 'extensie herlaadt zich na het bijwerken');

  // Voortgangsrapport vanaf het profiel van een student: in de pagina zelf, in de opmaak van Simulise
  await sim.goto('https://ma.simulise.com/@studentx'); await sim.waitForTimeout(600);
  check(await sim.isVisible('.sim-docent-rapportknop'), 'knop Voortgangsrapport op het profiel');
  let tabs = ctx.pages().length;
  await sim.click('.sim-docent-rapportknop');
  await sim.waitForSelector('.sdw .sdw-diagram svg', { timeout: 15000 }).catch(() => {});
  const wt = () => sim.evaluate(() => document.querySelector('.sdw')?.innerText || '');
  const rapportTekst = await wt();
  check(ctx.pages().length === tabs && !(await sim.isVisible('.s-card')) && (await sim.locator('.sdw section.panel.panel-default').count()) >= 3,
    'rapport in de pagina zelf (panelen van Simulise), geen nieuw tabblad; eigen inhoud van de pagina verborgen');
  check(['Sam Voorbeeld', 'MEP1A', 'Beroepsleerlijnen', 'Basisvaardigheden', 'Boven verwachting', 'Nog niet behaald', 'stap 2/4', 'Ontdekken wat adviseren is'].every((w) => rapportTekst.includes(w)) && (await sim.locator('.sdw .sdw-diagram svg').count()) === 2,
    `rapport uit Simulise-gegevens: stappen, statussen, beide diagrammen (${rapportTekst.slice(0, 80).replace(/\n/g, ' ')}…)`);
  check(rapportTekst.indexOf('Beroepsleerlijnen ·') < rapportTekst.indexOf('Basisvaardigheden ·'), 'beroeps eerst, dan BAVA (volgorde van het profiel)');
  check(rapportVerzoeken.length >= 1 && rapportVerzoeken.every((h) => h === 'app'), `diagram van de tweede opleiding opgevraagd met de vraag en headers van de app (${rapportVerzoeken.length}×)`);
  const kennis = await popup.evaluate(() => chrome.storage.local.get('rpAppKennis').then((s) => s.rpAppKennis));
  check(kennis?.idSoort === 'dashboardId' && kennis?.userIdSoort === 'dashboardId' && kennis?.discoverIdSoort === 'gebruikersnaam' && kennis?.qDiscover?.includes('dashboardDiscoverUser') && !JSON.stringify(kennis).includes('studentx'),
    `geleerd hoe de app een student aanduidt, zonder gebruikersnaam op te slaan (${JSON.stringify({ idSoort: kennis?.idSoort, userIdSoort: kennis?.userIdSoort, discoverIdSoort: kennis?.discoverIdSoort })})`);
  await sim.fill('.sdw input[type=date]', '2026-10-25'); await sim.dispatchEvent('.sdw input[type=date]', 'change');
  check((await wt()).includes('stand op 25 oktober 2026') && (await wt()).includes('stap 0/4'), 'werkbalk: stand op een eerdere peildatum, uit de historie');
  await sim.locator('.sdw [data-balk] label:has-text("Basisvaardigheden") input').uncheck();
  check(!(await wt()).includes('Basisvaardigheden ·'), 'werkbalk: alleen de beroepsleerlijnen');
  await sim.selectOption('.sdw [data-balk] select >> nth=0', 'perioden');
  check((await sim.locator('.sdw table.sdw-matrix').count()) === 1 && (await wt()).includes('Behaalde stap aan het eind van M1'), 'werkbalk: meetmomenten naast elkaar voor één student');
  await sim.selectOption('.sdw [data-balk] select >> nth=0', 'student');
  // Afdrukversie (A4) in een nieuw tabblad
  await sim.click('.sdw .sdw-afdruk');
  const [rapportTab] = await Promise.all([ctx.waitForEvent('page'), sim.click('.sdw .dropdown-menu a:has-text("Gespreksformulier van deze student")')]);
  await rapportTab.waitForFunction(() => document.getElementById('sd-inhoud')?.innerText.includes('AFSPRAKEN'), null, { timeout: 15000 }).catch(() => {});
  const rt = () => rapportTab.evaluate(() => document.getElementById('sd-inhoud').innerText);
  check((await rt()).includes('WAT GAAT GOED?') && (await rt()).includes('AFSPRAKEN'), 'afdrukken: gespreksformulier (A4) met invulvakken');
  await rapportTab.click('[data-bewerk$="-advies"]'); await rapportTab.keyboard.press('End'); await rapportTab.keyboard.type(' Eigen zin van de docent.');
  await rapportTab.selectOption('#sd-soort', 'student');
  check((await rt()).includes('Eigen zin van de docent.') && (await rt()).includes('Zo sta jij ervoor.'), 'afdrukversie: zelf aangepaste tekst blijft staan bij wisselen');
  check(!/<script/i.test(await rapportTab.content()), 'afdruktabblad zonder scripts');
  await rapportTab.close();
  const opties = await popup.evaluate(() => chrome.storage.local.get('rpOpties').then((s) => s.rpOpties));
  check(opties?.webSoortStudent === 'student' && !JSON.stringify(opties).includes('Sam'), 'keuzes onthouden, zonder studentgegevens');
  await sim.click('.sdw [data-terug]');
  check(!(await sim.locator('.sdw').count()) && (await sim.isVisible('.s-card')), 'Terug: de pagina van Simulise staat er weer');

  // Voortgangsrapporten voor een hele groep, vanuit het menu op /groups
  await sim.goto('https://ma.simulise.com/groups'); await sim.waitForTimeout(600);
  check(await sim.locator('.dropdown-menu .sim-docent-rapport').count() === 1, 'menu-item Voortgangsrapporten in het groepsmenu');
  await sim.click('.dropdown-menu .sim-docent-rapport');
  await sim.waitForSelector('.sdw table.sdw-matrix', { timeout: 20000 }).catch(() => {});
  check((await sim.locator('.sdw table.sdw-matrix').count()) === 2 && (await sim.locator('.sdw table.sdw-matrix').first().locator('tbody tr').count()) === 2 && (await wt()).includes('Anna Test') && (await wt()).includes('2 van 2 studenten'),
    'groep: meetmomenten naast elkaar, een tabel per opleiding met een rij per student');
  await sim.selectOption('.sdw [data-balk] select >> nth=0', 'groep');
  check((await sim.locator('.sdw table.sdw-matrix').count()) === 2 && (await wt()).includes('Stand op'), 'werkbalk: groepsoverzicht');
  const [dl] = await Promise.all([sim.waitForEvent('download'), sim.click('.sdw .sdw-excel')]);
  const csvTekst = fs.readFileSync(await dl.path(), 'utf8');
  check(/Anna Test;MEP1A;\d{4}-\d{2}-\d{2};ja/.test(csvTekst) && csvTekst.includes('1. Adviseren over mediaproducten'), 'Excel-export (CSV) met een rij per student');
  await sim.click('.sdw a[data-student]:has-text("Bram Test")');
  check((await sim.locator('.sdw .sdw-diagram svg').count()) === 2 && (await wt()).includes('2 van 2'), 'klik op een naam: de student, met bladeren tussen studenten');
  await sim.click('.sdw [data-stap="-1"]');
  check((await sim.locator('.sdw h3').first().textContent()).includes('Anna Test'), 'vorige student');
  await sim.selectOption('.sdw [data-balk] select >> nth=0', 'groep');
  await sim.locator('.sdw [data-balk] label:has-text("alleen niet op koers") input').check();
  check((await wt()).includes('Geen studenten die aan het filter voldoen.'), 'filter: alleen studenten die niet op koers zijn');
  await sim.locator('.sdw [data-balk] label:has-text("alleen niet op koers") input').uncheck();

  // Kaart Voortgangsrapporten op de analytics-pagina
  await sim.goto('https://ma.simulise.com/analytics'); await sim.waitForTimeout(700);
  const kaartOpties = await sim.locator('.sim-docent-kaart select option').allTextContents();
  // Zelfde adres als de groep op /groups (MEP1A); groepen zonder adres (101, 102) en menu-namen niet.
  check(await sim.isVisible('.sim-docent-kaart') && kaartOpties.join() === 'MEP1A', `analytics: kaart met de bekende groepen met adres, zonder menu-namen (${kaartOpties.join(', ')})`);
  await sim.click('.sim-docent-kaart button');
  await sim.waitForSelector('.sdw table.sdw-matrix', { timeout: 20000 }).catch(() => {});
  check((await sim.locator('.sdw table.sdw-matrix').count()) === 2 && (await wt()).includes('Stand op') && (await wt()).includes('Voortgangsrapporten MEP1A'), 'analytics: groepsrapport vanaf de kaart, met de onthouden weergave groepsoverzicht');

  // Analytics, Opleiding per groep: alle studenten en beide opleidingen naast elkaar
  await sim.goto('https://ma.simulise.com/analytics/educationbygroups/result?type=educationbygroups&view=table'); await sim.waitForTimeout(800);
  check(await sim.isVisible('.sim-docent-analyseknop'), 'resultaatpagina: knop Overzicht & rapporten naast de download-knop');
  await sim.click('.sim-docent-analyseknop');
  await sim.waitForFunction(() => document.querySelectorAll('.sdw table.sdw-matrix').length >= 2, null, { timeout: 20000 }).catch(() => {});
  { const rt2 = await wt();
    const rijen = await sim.locator('.sdw table.sdw-matrix').first().locator('tbody tr').count();
    check(rijen === 30 && rt2.includes('Behaalde stap aan het eind van') && rt2.includes('Beroepsleerlijnen') && rt2.includes('Basisvaardigheden') && rt2.includes('Overzicht MEP1A'),
      `resultaatpagina: alle 30 studenten (2 pagina's) met beroeps en BAVA naast elkaar (${rijen} rijen; "${rt2.slice(0, 120).replace(/\n/g, ' ')}")`);
    check(resultaatVerzoeken.includes('ed-bava/2/met-leerlijnen') && resultaatVerzoeken.includes('ed-beroeps/1/zonder-leerlijnen') && !resultaatVerzoeken.some((x) => x.startsWith('ed-sd')),
      `resultaatpagina: dezelfde vraag van de app per opleiding uit het profiel, alle pagina's (${[...new Set(resultaatVerzoeken)].join(', ')})`);
    check((await sim.locator('.sdw table.sdw-matrix').count()) === 2, 'resultaatpagina: ander cohort zonder beoordelingen weggelaten (één tabel per rol)');
    await sim.click('.sdw .sdw-afdruk');
    const [resTab] = await Promise.all([ctx.waitForEvent('page'), sim.click('.sdw .dropdown-menu a:has-text("Voortgangsrapporten van alle studenten")')]);
    await resTab.waitForFunction(() => document.querySelectorAll('.pagina').length >= 60, null, { timeout: 20000 }).catch(() => {});
    check((await resTab.locator('.pagina').count()) === 60, `afdrukken: voortgangsrapporten voor de hele groep (${await resTab.locator('.pagina').count()} pagina's)`);
    await resTab.close();
  }

  // Scherm Vandaag: eigen startscherm met de beoordeelwachtrij (module vandaag)
  await sim.goto('https://ma.simulise.com/assignments/assigned?filters=status:HANDED_IN'); await sim.waitForTimeout(700);
  check((await sim.locator('aside#nav .nav-main > li').first().innerText()).trim() === 'Vandaag' && (await sim.locator('aside#nav .nav-main > li').count()) === 2, 'menu-item Vandaag bovenaan de zijbalk, het eigen menu blijft staan');
  await sim.dispatchEvent('.sim-docent-vandaag', 'click'); // de nagebootste zijbalk heeft geen opmaak: items liggen over elkaar
  const vd = sim.locator('#sim-docent-vandaag');
  await vd.locator('a.rij').first().waitFor({ timeout: 20000 }).catch(() => {});
  const vdTekst = () => vd.locator('.scherm').innerText();
  check(await sim.evaluate(() => document.querySelector('#sim-docent-vandaag').parentElement.id === 'content' && document.querySelector('.sim-docent-vandaag-li').classList.contains('active'))
    && (await sim.isVisible('aside#nav')) && !(await sim.isVisible('#content table')), 'Vandaag staat in de pagina van Simulise: zijbalk blijft, inhoud tijdelijk verborgen, menu-item actief');
  check(vandaagVerzoeken.join() === 'open/1/100,open/2/100,klaar/1/100', `Vandaag haalt alle pagina's op, eerst open en dan afgerond (verzoeken ${vandaagVerzoeken.join(', ')})`);
  check((await vd.locator('a.rij').count()) === 3 && (await vd.locator('[data-teller="open"]').innerText()) === '5' && (await vd.locator('[data-teller="verborgen"]').innerText()) === '2',
    'Vandaag: één regel per opdracht en groep, meetmomenten van andere opleidingen verborgen en geteld');
  check(!/jansen|vries|bakker|bouzid/i.test(await vdTekst()), 'Vandaag toont geen namen of gebruikersnamen van studenten');
  const eersteRij = vd.locator('a.rij').first();
  check((await eersteRij.innerText()).includes('ENG_1.5: True crime') && (await eersteRij.locator('.pil.rood').innerText()) === '12 dagen' && (await eersteRij.innerText()).includes('2 van 5 nagekeken') && (await eersteRij.locator('.pil').first().innerText()) === 'ENG',
    'Vandaag: langst wachtende opdracht bovenaan, met vak, wachttijd en voortgang');
  const startHref = await vd.locator('[data-start]').getAttribute('href');
  check(startHref.startsWith('/@pjansen/assignment/vd-2/review?') && decodeURIComponent(startHref).includes('filters=reviewer:*|group:vg-mep1a|connectable:vc-o-eng-MEP1A') && startHref.includes('group=vg-mep1a'),
    'Vandaag: "Start met langst wachtend" opent het beoordeelscherm van Simulise voor de oudste inlevering');
  check((await vd.locator('.ring text').textContent()) === '0/5', 'Vandaag: ring begint op 0 nagekeken');
  check(/^Goede(morgen|middag|navond)$/.test((await vd.locator('.groet').innerText()).trim()) && (await vd.locator('.held.ochtend, .held.middag, .held.avond').count()) === 1
    && (await vd.locator('.week span').count()) === 5 && (await vd.locator('.week .ja').count()) === 0,
    'Vandaag: begroeting bij het moment van de dag en vijf weekdagen, nog geen dag afgevinkt');
  check((await vd.locator('.volgende b').innerText()) === 'ENG_1.5: True crime' && (await vd.locator('.volgende').innerText()).includes('12 dagen') && (await vd.locator('.chip').count()) === 3
    && (await vd.locator('.chip', { hasText: 'MEP1A' }).innerText()).includes('4 wachten'),
    'Vandaag: kaart Volgende met de langst wachtende opdracht, en een kaart per groep');
  vandaagAfgerond.n = 42;
  await vd.locator('[data-actie="ververs"]').click(); await sim.waitForTimeout(700);
  check((await vd.locator('.ring text').textContent()) === '2/7' && (await vdTekst()).includes('2 nagekeken, nog 5 te gaan'), 'Vandaag: na verversen telt wat je sindsdien hebt afgerond');
  check((await vd.locator('.week .ja').count()) === ([0, 6].includes(new Date().getDay()) ? 0 : 1), 'Vandaag: de dag van vandaag is afgevinkt in de week');
  await vd.locator('[data-verborgen]').check(); await sim.waitForTimeout(100);
  check((await vd.locator('a.rij').count()) === 4 && (await vd.locator('[data-teller="open"]').innerText()) === '7', 'Vandaag: "Toon ook wat het filter verbergt" laat de verborgen meetmomenten zien');
  await vd.locator('[data-verborgen]').uncheck();
  await vd.locator('.chip', { hasText: 'MR1A' }).click(); await sim.waitForTimeout(100);
  check((await vd.locator('a.rij').count()) === 1 && (await vd.locator('[data-teller="open"]').innerText()) === '1' && (await vd.locator('.chip[aria-pressed="true"]').innerText()).startsWith('MR1A'), 'Vandaag: filteren op groep');
  const pv = await nieuw(`chrome-extension://${id}/popup.html`);
  const vdDag = await pv.evaluate(() => chrome.storage.local.get('vdDag').then((s) => s.vdDag));
  check(vdDag?.start === 40 && vdDag.dagen.length === 1 && !/jansen|vd-\d|vg-/.test(JSON.stringify(vdDag)), 'Vandaag bewaart alleen tellers en datums, geen gegevens van studenten');
  await sim.keyboard.press('Escape'); await sim.waitForTimeout(100);
  check((await vd.count()) === 0 && (await sim.isVisible('#content table')), 'Vandaag sluit met Esc en Simulise staat er weer');
  await sim.dispatchEvent('.sim-docent-vandaag', 'click'); await sim.waitForTimeout(200);
  await sim.dispatchEvent('aside#nav a[href="/dashboard"]', 'click'); await sim.waitForTimeout(300);
  check((await vd.count()) === 0, 'Vandaag sluit als je een ander menu-item kiest');
  await sim.goto('https://ma.simulise.com/assignments/assigned?filters=status:HANDED_IN#vandaag');
  await vd.locator('a.rij').first().waitFor({ timeout: 20000 }).catch(() => {});
  check((await vd.locator('a.rij').count()) === 3, 'Vandaag opent vanzelf bij een adres dat eindigt op #vandaag');
  await pv.evaluate(() => chrome.storage.sync.set({ today: false })); await sim.waitForTimeout(400);
  check((await vd.count()) === 0 && (await sim.locator('.sim-docent-vandaag-li').count()) === 0, 'module Vandaag uit: scherm en menu-item weg');
  await pv.evaluate(() => chrome.storage.sync.set({ today: true })); await pv.close();

  // Thema Helder met de nieuwe schil: zijbalk rond taken, gewone taal, kleur per klas, thuispagina per klas
  const ps = await nieuw(`chrome-extension://${id}/popup.html`);
  check((await ps.locator('input[name="theme"][value="helder"]').count()) === 1, 'thema Helder staat in de popup');
  await ps.evaluate(() => chrome.storage.sync.set({ theme: 'helder', shellMeer: false }));
  await sim.goto('https://ma.simulise.com/'); await sim.waitForTimeout(1200);
  const zijbalk = () => sim.evaluate(() => [...document.querySelectorAll('aside#nav .nav-main > li')].filter((li) => getComputedStyle(li).display !== 'none')
    .sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order)).map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
  check((await sim.getAttribute('html', 'data-sim-theme')) === 'helder' && (await sim.getAttribute('html', 'data-sim-schil')) === '', 'thema Helder zet de schil aan');
  let m1 = await zijbalk();
  check(m1.slice(0, 6).join('|') === 'Vandaag|Nakijken|Mijn klassen|MEP1A|MIP1B|MR1A' && m1.includes('Meer') && !m1.includes('Dashboard'),
    `schil: zijbalk rond taken, klassen op naam, gearchiveerde klas weg, rest onder Meer (${m1.join(', ')})`);
  check((await sim.getAttribute('.sim-docent-klas[data-klas="vg-mep1a"]', 'data-wacht')) === '4' && (await sim.getAttribute('.sim-docent-klas[data-klas="x"]', 'data-wacht')) === null
    && (await sim.evaluate(() => new Set([...document.querySelectorAll('li.sd-schil-klas')].map((li) => li.style.getPropertyValue('--sd-klas'))).size)) === 3,
    'schil: elke klas een eigen kleur en het aantal dat op jou wacht');
  await sim.dispatchEvent('.sd-schil-knop', 'click'); await sim.waitForTimeout(400);
  m1 = await zijbalk();
  check(m1.includes('Dashboard') && (await ps.evaluate(() => chrome.storage.sync.get('shellMeer').then((x) => x.shellMeer))) === true, 'schil: Meer klapt uit en dat wordt onthouden');
  klasVerzoeken.length = 0;
  await sim.dispatchEvent('.sim-docent-klas[data-klas="vg-mr1a"]', 'click');
  await vd.locator('a.rij').first().waitFor({ timeout: 20000 }).catch(() => {});
  check((await vd.locator('h1').innerText()).trim() === 'MR1A' && (await vd.locator('a.rij').count()) === 1 && klasVerzoeken.join() === 'vg-mr1a,vg-mr1a,vg-mr1a'
    && (await vd.locator('[data-teller="open"]').innerText()) === '1' && (await vd.locator('[data-teller="laat"]').innerText()) === '1' && (await vd.locator('[data-teller="niet"]').innerText()) === '2' && (await vd.locator('[data-teller="klaar"]').innerText()) === '0',
    'thuispagina per klas: alleen die klas opgevraagd, met Wacht op jou, Te laat, Nog niet gestart en Klaar');
  check((await vd.locator('.snel a').count()) === 7 && (await vd.locator('.snel a', { hasText: 'Studenten' }).getAttribute('href')) === '/groups/school/vg-mr1a/students'
    && (await vd.locator('.chips').count()) === 0 && !/bakker|jansen/i.test(await vd.locator('.scherm').innerText()),
    'thuispagina per klas: snelkoppelingen naar de klas in Simulise, geen studenten in beeld');
  await beeld(sim, 'klas');
  check((await vd.locator('.strook').count()) === 2 && (await vd.locator('.strook').first().locator('.stippen i').count()) === 4 && (await vd.locator('.strook').first().locator('.stippen i.wacht').count()) === 1
    && (await vd.locator('.strook').first().locator('.som').innerText()) === '1 wacht op jou · 1 te laat · 2 niet gestart' && (await vd.locator('.strook').nth(1).locator('.stippen i.bezig').count()) === 1,
    'thuispagina per klas: stippenkaart met één stip per inlevering, de opdracht die op jou wacht bovenaan');
  check((await vd.locator('.held.klas').count()) === 1 && (await vd.locator('.held').getAttribute('style')).startsWith('--k:#') && (await vd.locator('.week').count()) === 0, 'thuispagina per klas: kop in de kleur van de klas');
  check(await sim.evaluate(() => document.querySelector('.sim-docent-klas[data-klas="vg-mr1a"]').parentElement.classList.contains('active') && !document.querySelector('.sim-docent-vandaag-li').classList.contains('active')), 'thuispagina per klas: de klas is gemarkeerd in de zijbalk');
  await sim.dispatchEvent('.sim-docent-vandaag', 'click');
  await vd.locator('.chips').waitFor({ timeout: 20000 }).catch(() => {});
  await beeld(sim, 'vandaag');
  check((await vd.locator('h1').innerText()).trim() === 'Vandaag' && (await vd.locator('a.rij').count()) === 3 && (await vd.locator('.groep .stip').count()) === 3, 'van een klas naar Vandaag: alle groepen weer, met de kleur van de klas');
  await sim.keyboard.press('Escape');
  await sim.goto('https://ma.simulise.com/assignments/assigned?filters=status:HANDED_IN#klas=vg-mep1a');
  await vd.locator('a.rij').first().waitFor({ timeout: 20000 }).catch(() => {});
  check((await vd.locator('h1').innerText()).trim() === 'MEP1A' && (await vd.locator('a.rij').count()) === 2, 'thuispagina opent ook via een adres dat eindigt op #klas=<id>');
  await sim.keyboard.press('Escape'); await sim.waitForTimeout(600);
  check((await sim.locator('#content tbody .sd-klaschip').count()) === 7 && (await sim.locator('#content tbody .sd-klaschip').first().innerText()) === 'MIP1B', 'schil: klas met kleur bij elke rij in de Beoordelen-lijst');
  check((await sim.locator('#content tbody .badge').first().innerText()) === 'Wacht op jou' && (await sim.locator('#content .header-text').innerText()).trim() === 'Nakijken'
    && (await sim.locator('#content tbody').innerText()).includes('PS_1.8: Wie ben ik?') && (await sim.locator('#content thead').innerText()).includes('Opdracht titel'),
    'schil: vaste woorden in gewone taal, titels en kolomkoppen blijven zoals ze zijn');
  await ps.evaluate(() => chrome.storage.sync.set({ theme: 'light' })); await sim.waitForTimeout(600);
  check((await sim.getAttribute('html', 'data-sim-schil')) === null && (await sim.locator('.sd-schil-klas, .sd-schil-kop, .sd-klaschip').count()) === 0
    && (await sim.locator('#content tbody .badge').first().innerText()) === 'Te beoordelen' && (await sim.locator('#content .header-text').innerText()).trim() === 'Beoordelen'
    && (await sim.evaluate(() => [...document.querySelectorAll('aside#nav .nav-main > li')].every((li) => !li.style.order))),
    'ander thema: de schil zet alles terug (zijbalk, woorden, labels)');
  const sdKlassen = await ps.evaluate(() => chrome.storage.local.get('sdKlassen').then((x) => x.sdKlassen));
  check(sdKlassen.lijst.length === 3 && Object.keys(sdKlassen.lijst[0]).sort().join() === 'id,naam,wacht', 'klassen onthouden met alleen id, naam en aantal');
  await ps.evaluate(() => chrome.storage.sync.set({ theme: 'auto' })); await ps.close();

  // Focusmodus op het beoordeelscherm (module focus)
  const pf = await nieuw(`chrome-extension://${id}/popup.html`);
  await sim.goto('https://ma.simulise.com/@student2/assignment/00000000-0000-4000-8000-000000000002/review?nr=2&group=vg-mr1a'); await sim.waitForTimeout(800);
  const fb = sim.locator('#sim-docent-focus');
  const toont = (sel) => sim.evaluate((x) => { let el = document.querySelector(x); while (el) { if (getComputedStyle(el).display === 'none') return false; el = el.parentElement; } return true; }, sel);
  check((await sim.getAttribute('html', 'data-sim-focus')) === '' && !(await toont('aside#nav')) && !(await toont('#app > header.navbar')) && (await toont('.review-group-panel')) && !(await toont('#content header.header-md'))
    && (await toont('.assignment-status-bar')) && (await toont('textarea')), 'focusmodus: bovenbalk, zijbalk en kruimelkop weg; de lijst met studenten, de onderbalk en de feedback van Simulise blijven');
  const plek = (sel) => sim.evaluate((x) => { const el = document.querySelector(x), r = el.getBoundingClientRect(); return { pos: getComputedStyle(el).position, links: Math.round(r.left), breed: Math.round(r.width), onder: Math.round(r.bottom), boven: Math.round(r.top) }; }, sel);
  const venster = sim.viewportSize();
  let kr = await plek('[data-sd-focus="rubric"]'), kf = await plek('[data-sd-focus="feedback"]'), kb = await plek('.assignment-status-bar');
  check((await sim.getAttribute('html', 'data-sim-focus-kolom')) === '' && kr.pos === 'fixed' && kf.pos === 'fixed' && kb.pos === 'fixed' && kr.links === kf.links && kf.links === kb.links && kr.links > venster.width / 2
    && kr.onder <= kf.boven && kf.onder <= kb.boven && kb.onder <= venster.height,
    `zijkolom: rubric, feedback en de onderbalk staan vast rechts onder elkaar, binnen het venster (rubric ${kr.boven}-${kr.onder}, feedback ${kf.boven}-${kf.onder}, balk ${kb.boven}-${kb.onder})`);
  check((await sim.evaluate(() => { const w = document.querySelector('[data-sd-focus="feedback"]').previousElementSibling.previousElementSibling; return w.querySelector('h2').textContent === 'Ingevulde pagina' && w.getBoundingClientRect().right; })) <= kr.links,
    'zijkolom: het werk van de student staat links van de kolom, de blokken zijn niet verplaatst in de pagina');
  check(await sim.evaluate(() => document.querySelector('.review-group-panel').classList.contains('expanded')), 'focusmodus klapt de lijst van Simulise uit, zodat de namen zonder plaatjes zichtbaar zijn');
  const kaart = () => sim.evaluate(() => { const el = document.querySelector('.reflection-items .content > div:last-child'); return { klem: getComputedStyle(el).webkitLineClamp, hoog: Math.round(el.getBoundingClientRect().height) }; });
  const dicht = await kaart();
  await sim.hover('.reflection-items .content'); await sim.waitForTimeout(150);
  const open = await kaart();
  await sim.mouse.move(5, 5);
  check(dicht.klem === '3' && dicht.hoog < 60 && open.hoog > dicht.hoog && !(await toont('.badges-title-wrapper img')),
    `compacte rubric: omschrijving op drie regels (${dicht.hoog}px), de hele tekst als je eroverheen gaat (${open.hoog}px), niveaus zonder plaatjes`);
  check(!(await toont('#oms')) && (await toont('.wrapper-reflection')), 'focusmodus: de omschrijving van de opdracht is dichtgeklapt, het werk staat bovenaan');
  check((await fb.locator('.tel').innerText()).replace(/\s+/g, ' ').trim() === '2 van 5 1 wacht nog' && (await fb.locator('.stippen').count()) === 0
    && (await fb.locator('.spring').count()) === 0 && !/jansen|vries/i.test(await fb.locator('.balk').innerHTML()), 'focusbalk: plek in de klas en wat nog wacht; geen stippen en geen namen (die staan in de lijst van Simulise)');
  await fb.locator('[data-actie="kolom"]').click(); await sim.waitForTimeout(400);
  kr = await plek('[data-sd-focus="rubric"]');
  check((await sim.getAttribute('html', 'data-sim-focus-kolom')) === null && kr.pos !== 'fixed' && (await plek('.assignment-status-bar')).pos !== 'fixed' && (await fb.locator('.spring').count()) === 3
    && (await pf.evaluate(() => chrome.storage.sync.get('focusKolom').then((x) => x.focusKolom))) === false, 'knop Zijkolom zet de kolom uit: alles weer onder elkaar, met springen naar werk, rubric en feedback');
  await fb.locator('[data-actie="kolom"]').click(); await sim.waitForTimeout(400);
  await sim.setViewportSize({ width: 1000, height: venster.height }); await sim.waitForTimeout(500);
  check((await sim.getAttribute('html', 'data-sim-focus-kolom')) === null && (await fb.locator('[data-actie="kolom"]').count()) === 0, 'smal venster: geen zijkolom');
  await sim.setViewportSize(venster); await sim.waitForTimeout(500);
  check((await sim.getAttribute('html', 'data-sim-focus-kolom')) === '', 'breed venster: de zijkolom komt terug');
  await fb.locator('[data-actie="opdracht"]').click(); await sim.waitForTimeout(200);
  check((await toont('#oms')) && (await fb.locator('[data-actie="opdracht"]').getAttribute('aria-pressed')) === 'true', 'focusmodus: knop Opdracht toont de omschrijving');
  await Promise.all([sim.waitForNavigation(), fb.locator('[data-actie="wacht"]').click()]); await sim.waitForTimeout(600);
  check(new URL(sim.url()).searchParams.get('nr') === '4' && (await fb.locator('.tel').innerText()).replace(/\s+/g, ' ').trim() === '4 van 5 1 wacht nog' && !(await toont('#oms')), '"Volgende die wacht" gaat naar de eerstvolgende inlevering die op jou wacht');
  await Promise.all([sim.waitForNavigation(), sim.keyboard.press('Alt+ArrowLeft')]); await sim.waitForTimeout(600);
  check(new URL(sim.url()).searchParams.get('nr') === '3', 'Alt+pijl links: vorige student');
  await sim.focus('textarea'); await sim.keyboard.press('Alt+ArrowRight'); await sim.waitForTimeout(300);
  check(new URL(sim.url()).searchParams.get('nr') === '3', 'sneltoetsen doen niets terwijl je in het feedbackvak typt');
  await sim.evaluate(() => document.activeElement.blur());
  await sim.keyboard.press('Escape'); await sim.waitForTimeout(500);
  check((await sim.getAttribute('html', 'data-sim-focus')) === null && (await sim.getAttribute('html', 'data-sim-focus-kolom')) === null && (await toont('aside#nav')) && (await plek('.assignment-status-bar')).pos !== 'fixed' && (await fb.locator('.los').count()) === 1
    && (await pf.evaluate(() => chrome.storage.sync.get('focusAan').then((x) => x.focusAan))) === false, 'Esc zet de focusmodus uit: Simulise staat er weer, met een knop Focus; de keuze wordt onthouden');
  await fb.locator('.los').click(); await sim.waitForTimeout(500);
  check((await sim.getAttribute('html', 'data-sim-focus')) === '' && (await fb.locator('.balk').count()) === 1, 'knop Focus zet de focusmodus weer aan');
  await pf.evaluate(() => chrome.storage.sync.set({ theme: 'helder' })); await sim.waitForTimeout(500);
  const kleur = (sel, eig) => sim.evaluate(([x, e]) => getComputedStyle(document.querySelector(x))[e], [sel, eig]);
  check((await kleur('.review-group-panel', 'backgroundColor')) === 'rgb(255, 253, 249)' && (await kleur('.user-status.bg-backport-warning', 'backgroundColor')) === 'rgb(253, 240, 213)'
    && (await kleur('.assignment-status-bar .ladda-button', 'backgroundColor')) === 'rgb(79, 91, 213)' && !['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)'].includes(await kleur('.review-group-panel .selected.item', 'backgroundColor')),
    'focusmodus in thema Helder: lichte lijst met de gekozen student gemarkeerd, status als label, knop in de accentkleur');
  const variabele = (naam) => sim.evaluate((n) => document.documentElement.style.getPropertyValue(n), naam);
  check((await variabele('--sdf-kop')) === '"MR1A · student 3 van 5"' && (await variabele('--sdf-tel')) === '"2 wachten op jou · 1 klaar · 1 te laat · 1 nog niet gestart"' && /^#[0-9a-f]{6}$/.test(await variabele('--sdf-klas'))
    && (await kleur('.width-filling-header', 'backgroundImage')).startsWith('linear-gradient') && (await sim.evaluate(() => getComputedStyle(document.querySelector('.assignment-details'), '::before').content)) === '"MR1A · student 3 van 5"',
    'focusmodus in Helder: kop als band in de kleur van de klas, met klas, plek en tellers; geen namen');
  const vlak = await sim.evaluate(() => { const s = getComputedStyle(document.querySelector('#content'), '::after'); return { kleur: s.backgroundColor, breed: parseFloat(s.width), pos: s.position }; });
  check((await fb.locator('.ring').count()) === 1 && vlak.kleur === 'rgb(255, 255, 255)' && vlak.pos === 'fixed' && vlak.breed <= 352 && (await kleur('[data-sd-focus="rubric"]', 'backgroundColor')) === 'rgba(0, 0, 0, 0)',
    `focusmodus in Helder: ring in de balk, en rechts één smal wit vlak (${Math.round(vlak.breed)}px) met rubric, feedback en onderbalk zonder eigen kader`);
  const knop = await sim.evaluate(() => { const c = document.querySelector('.reflection-items .content'); return { tekst: getComputedStyle(c.querySelector(':scope > div:last-child')).display, naam: getComputedStyle(c.querySelector('strong')).display, hoog: Math.round(c.getBoundingClientRect().height),
    rond: getComputedStyle(document.querySelector('.reflection-items .authors img')).borderRadius, binnen: document.querySelector('.reflection-items .authors').getBoundingClientRect().bottom <= c.getBoundingClientRect().bottom + 1 }; });
  check(knop.tekst === 'none' && knop.naam === 'flex' && knop.hoog <= 34 && knop.rond === '50%' && knop.binnen, `rubric in Helder: niveaus als knoppen met alleen de naam (${knop.hoog}px hoog), het plaatje rond en binnen de knop`);
  await sim.hover('.reflection-items .content'); await sim.waitForTimeout(150);
  const tip = fb.locator('.tip');
  check((await tip.isVisible()) && (await tip.innerText()).startsWith('Algemeen · Voldaan') && (await tip.innerText()).includes('Een lange omschrijving van het niveau.')
    && (await tip.evaluate((el) => el.getBoundingClientRect().right)) < (await plek('[data-sd-focus="rubric"]')).links, 'rubric in Helder: de omschrijving verschijnt als toelichting links van de balk als je een niveau aanwijst');
  await sim.mouse.move(5, 5); await sim.waitForTimeout(150);
  check(!(await tip.isVisible()), 'de toelichting verdwijnt als je het niveau loslaat');
  const fbv = await plek('[data-sd-focus="feedback"]'), rbv = await plek('[data-sd-focus="rubric"]'), blv = await plek('.assignment-status-bar');
  check(fbv.boven >= rbv.onder && fbv.onder <= blv.boven && fbv.onder - fbv.boven > 150 && (await plek('[data-sd-focus="feedback"] textarea')).onder >= fbv.onder - 4,
    `feedback in Helder staat tussen rubric en afronding (${fbv.onder - fbv.boven}px hoog), het tekstvak vult het deel`);
  const kopje = (sel, pseudo) => sim.evaluate(([x, ps]) => getComputedStyle(document.querySelector(x), ps).content, [sel, pseudo]);
  check((await kopje('[data-sd-focus="rubric"] > h2', '::before')) === '"Rubric"' && (await kopje('[data-sd-focus="feedback"] > h2', '::before')) === '"Feedback"' && (await kopje('.assignment-status-bar', '::before')) === '"Afronden"'
    && (await kleur('.reflection-items', 'backgroundColor')) === 'rgb(241, 238, 231)' && (await sim.evaluate(() => { const w = document.querySelector('.reflection-wrapper'); return w.querySelector('h4').getBoundingClientRect().bottom <= w.querySelector('.reflection-items').getBoundingClientRect().top; })) && parseFloat(await kleur('.assignment-status-bar .ladda-button', 'minHeight')) === 44,
    'rechterbalk in Helder: drie delen met een kopje (Rubric, Feedback, Afronden), per onderdeel de naam met de schuifknop eronder, en één grote knop');
  await sim.evaluate(() => document.querySelector('.review-group-panel .circle-button').click()); await sim.waitForTimeout(200);
  const rondje = await sim.evaluate(() => { const i = document.querySelector('.review-group-panel img.avatar'), r = i.getBoundingClientRect(); return { b: Math.round(r.width), h: Math.round(r.height), straal: getComputedStyle(i).borderRadius }; });
  const rijIn = await sim.evaluate(() => Math.round(document.querySelector('.review-group-panel .groups-table > .item').getBoundingClientRect().height));
  check(rondje.b === 24 && rondje.h === 24 && rondje.straal === '50%', `ingeklapte lijst in Helder: ronde plaatjes (${rondje.b}x${rondje.h})`);
  const knopPlek = () => sim.evaluate(() => { const k = document.querySelector('.review-group-panel > .circle-button').getBoundingClientRect(), p = document.querySelector('.review-group-panel').getBoundingClientRect(); return k.top >= 0 && k.bottom <= 48 && k.right <= p.right && k.left >= p.left; });
  const ingeklapt = await knopPlek();
  await sim.evaluate(() => document.querySelector('.review-group-panel .circle-button').click()); await sim.waitForTimeout(200);
  const rijUit = await sim.evaluate(() => Math.round(document.querySelector('.review-group-panel .groups-table > .item').getBoundingClientRect().height));
  const stip = await sim.evaluate(() => { const st = (sel) => { const el = document.querySelector(sel); const s = getComputedStyle(el, '::before'); return { b: s.width, h: s.height, r: s.borderRadius, k: s.backgroundColor }; };
    return { nu: st('.review-group-panel .selected.item .usercard'), ander: st('.review-group-panel a.item .usercard'), rand: getComputedStyle(document.querySelector('.review-group-panel .selected.item')).boxShadow }; });
  check(stip.rand === 'none' && stip.nu.b === '8px' && stip.nu.h === '8px' && stip.nu.r === '50%' && stip.nu.k !== 'rgba(0, 0, 0, 0)' && stip.ander.k === 'rgba(0, 0, 0, 0)' && stip.ander.b === '8px',
    'uitgeklapte lijst in Helder: geen streep links, een ronde stip bij de student die je bekijkt, de andere rijen houden dezelfde ruimte vrij');
  check(rijIn === 30 && rijUit === 30, `lijst in Helder: de rijen zijn ingeklapt en uitgeklapt even hoog (${rijIn}px en ${rijUit}px)`);
  check(ingeklapt && (await knopPlek()) && (await kleur('.review-group-panel', 'overflowY')) === 'hidden' && (await kleur('.review-group-panel .groups-table', 'overflowY')) === 'auto',
    'lijst in Helder: de knop om in of uit te klappen staat altijd rechtsboven in beeld; de lijst scrolt binnen het paneel');
  const kopjes = await sim.evaluate(() => { const h = document.querySelector('[data-sd-focus="rubric"] > h2'); return { tekst: getComputedStyle(h).fontSize, rij: getComputedStyle(document.querySelector('.reflection-wrapper')).backgroundColor,
    lucht: parseFloat(getComputedStyle(document.querySelector('.full-width-wrapper')).paddingTop) - Math.round(document.querySelector('#sim-docent-focus').shadowRoot.querySelector('.balk').getBoundingClientRect().bottom) }; });
  const strook = await sim.evaluate(() => { const b = document.querySelector('#sim-docent-focus').shadowRoot.querySelector('.balk').getBoundingClientRect(), p = document.querySelector('.review-group-panel').getBoundingClientRect(), r = document.querySelector('[data-sd-focus="rubric"]').getBoundingClientRect();
    const v = getComputedStyle(document.querySelector('#content'), '::after'); return { boven: Math.round(b.top), links: Math.round(b.left - p.right), rechts: Math.round((window.innerWidth - parseFloat(v.width)) - b.right), voorKolom: b.right <= r.left }; });
  check(strook.boven === 0 && Math.abs(strook.links) <= 1 && Math.abs(strook.rechts) <= 1 && strook.voorKolom, `de balk bovenaan is een vaste strook die aansluit op de lijst links en de kolom rechts (verschil ${strook.links}px en ${strook.rechts}px)`);
  check(kopjes.tekst === '0px' && kopjes.rij === 'rgba(0, 0, 0, 0)' && kopjes.lucht >= 8 && kopjes.lucht <= 20, `Helder: geen dubbel kopje bij de rubric, regels zonder grijze achtergrond, ${kopjes.lucht}px lucht tussen de balk en de kop`);
  await pf.evaluate(() => chrome.storage.sync.set({ theme: 'auto' })); await sim.waitForTimeout(400);
  await sim.goto('https://ma.simulise.com/assignments/assigned?filters=status:HANDED_IN'); await sim.waitForTimeout(600);
  check((await fb.count()) === 0 && (await sim.getAttribute('html', 'data-sim-focus')) === null && (await toont('aside#nav')), 'buiten het beoordeelscherm is er geen focusmodus');
  await pf.close();

  // Rapportprofielen en voorvertoning van het voortgangsrapport
  const prof = await nieuw(`chrome-extension://${id}/rapport/profielen.html`);
  await prof.waitForTimeout(600);
  const srcdoc = () => prof.$eval('#vb', (i) => i.srcdoc);
  let doc = await srcdoc();
  check(doc.includes('Zo sta jij ervoor.') && doc.includes('BASISVAARDIGHEDEN') && doc.includes('Je zit op koers voor de VSA-norm'), 'voorvertoning: rapport met beide pagina\'s en oordeel VSA-norm');
  const ring1 = (d) => Number(d.match(/<circle cx="[\d.]+" cy="[\d.]+" r="([\d.]+)"/)[1]);
  const metNadruk = ring1(doc);
  await prof.uncheck('#nadruk'); await prof.waitForTimeout(200);
  doc = await srcdoc();
  check(ring1(doc) < metNadruk, `doelstap uitvergroten: ring 1 is groter met nadruk (${metNadruk.toFixed(1)} tegen ${ring1(doc).toFixed(1)})`);
  await prof.check('#nadruk');
  await prof.fill('#peildatum', '2026-12-10'); await prof.dispatchEvent('#peildatum', 'change'); await prof.waitForTimeout(300);
  doc = await srcdoc();
  check(doc.includes('was 1 bij M1') && doc.includes('stand aan het eind van Periode 1') && doc.includes('doel M2: stap 1'), 'vergelijking met de vorige periode');
  await prof.fill('#json', '{ kapot'); await prof.waitForTimeout(600);
  check((await prof.textContent('#melding')).startsWith('Geen geldige JSON'), 'foute JSON wordt gemeld');
  const p = JSON.parse(await prof.evaluate(() => JSON.stringify(SD_RAPPORT_STANDAARD)));
  p.weergave.accent = '#123456';
  await prof.fill('#json', JSON.stringify(p, null, 2)); await prof.click('#opslaan'); await prof.waitForTimeout(300);
  const bewaard = await prof.evaluate(() => chrome.storage.local.get('rpProfielen').then((s) => s.rpProfielen[0].weergave.accent));
  check(bewaard === '#123456' && (await srcdoc()).includes('--accent-waarde: #123456'), 'profiel opslaan en accentkleur in het rapport');
  check(!/<script/i.test(await srcdoc()), 'rapport bevat geen scripts');

  await ctx.close();
  console.log(fouten.length ? `\nMISLUKT:\n- ${fouten.join('\n- ')}` : '\nOK');
  process.exit(fouten.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
