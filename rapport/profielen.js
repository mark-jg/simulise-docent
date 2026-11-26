/* Rapportprofielen beheren (chrome.storage.local: rpProfielen = [profiel...], rpGekozen = id) met een
 * live voorbeeld. Profielen bevatten geen studentgegevens; de voorbeeldstudent is verzonnen. */
const $ = (id) => document.getElementById(id);
let profielen = [], gekozen = null;

const kloon = (x) => JSON.parse(JSON.stringify(x));
const huidig = () => profielen.find((p) => p.id === gekozen) || profielen[0];

async function laad() {
  const s = await chrome.storage.local.get({ rpProfielen: null, rpGekozen: null });
  profielen = Array.isArray(s.rpProfielen) && s.rpProfielen.length ? s.rpProfielen : [kloon(SD_RAPPORT_STANDAARD)];
  gekozen = s.rpGekozen || profielen[0].id;
  if (!profielen.some((p) => p.id === gekozen)) gekozen = profielen[0].id;
  toon();
}

async function bewaar() { await chrome.storage.local.set({ rpProfielen: profielen, rpGekozen: gekozen }); }

function melding(tekst, fout = false) { $('melding').textContent = tekst; $('melding').className = fout ? 'fout' : ''; }

function toon() {
  $('kies').replaceChildren(...profielen.map((p) => Object.assign(document.createElement('option'), { value: p.id, textContent: p.gedeeld ? `${p.naam} (gedeeld)` : p.naam, selected: p.id === gekozen })));
  const p = huidig();
  $('json').value = JSON.stringify(p, null, 2);
  const w = p.weergave || {};
  $('nadruk').checked = w.nadrukDoelstap !== false;
  $('factor').value = w.nadrukFactor || 1.9; $('factorWaarde').textContent = `${$('factor').value}×`;
  $('accent').value = w.accent || '#e6007e';
  $('vergelijk').checked = w.vergelijk !== false;
  $('grens').value = p.aanwezigheid?.grens === null ? '' : (p.aanwezigheid?.grens ?? 80);
  $('netAan').checked = p.vergadering?.netAan !== false;
  $('onbeoordeeld').checked = p.vergadering?.onbeoordeeld !== false;
  $('weg').disabled = profielen.length < 2;
  voorbeeld();
}

/* Controle van een profiel; geeft een foutmelding of null. */
function controleer(p) {
  if (!p || typeof p !== 'object') return 'Het profiel is geen object.';
  if (!p.id || !p.naam) return 'Het profiel heeft een "id" en een "naam" nodig.';
  if (!Array.isArray(p.opleidingen) || !p.opleidingen.length) return '"opleidingen" moet een lijst met minstens één opleiding zijn.';
  for (const o of p.opleidingen) {
    if (!o.rol || !o.herken) return `Elke opleiding heeft een "rol" en "herken" nodig (${o.titel || '?'}).`;
    try { new RegExp(o.herken, 'i'); } catch { return `"herken" van ${o.rol} is geen geldige zoektekst.`; }
  }
  if (!Array.isArray(p.perioden)) return '"perioden" moet een lijst zijn.';
  for (const x of p.perioden) {
    if (!x.code || !/^\d{4}-\d{2}-\d{2}$/.test(x.van || '') || !/^\d{4}-\d{2}-\d{2}$/.test(x.tot || '')) return `Periode ${x.code || '?'}: "code", "van" en "tot" (JJJJ-MM-DD) zijn nodig.`;
  }
  return null;
}

/* Voorbeeld op de gekozen peildatum: stappen volgen uit de historie van de voorbeeldstudent. */
function voorbeeld(p = huidig()) {
  const vb = kloon(SD_RAPPORT_VOORBEELD);
  const datum = $('peildatum').value || vb.peildatum;
  vb.peildatum = datum;
  // Op een andere peildatum volgen de stappen uit de historie (de voorbeeldstudent heeft er een).
  if (datum !== SD_RAPPORT_VOORBEELD.peildatum) {
    for (const o of vb.opleidingen) for (const l of o.leerlijnen) {
      if (!Array.isArray(l.historie)) continue;
      l.stap = l.historie.filter((h) => h.datum <= datum).reduce((m, h) => Math.max(m, h.stap), 0);
      if (l.stap > 0) l.beoordeeldNiet = false;
    }
  }
  const soort = $('soort').value;
  let studenten = [vb];
  if (soort === 'groep' || soort === 'vergader') {
    // Een paar verzonnen studenten met een andere stand, voor het groepsoverzicht.
    studenten = ['A', 'B', 'C'].map((letter, n) => {
      const s = kloon(vb);
      s.student.naam = `Voorbeeldstudent ${letter}`;
      s.opleidingen.forEach((o) => o.leerlijnen.forEach((l, i) => { l.stap = Math.max(0, Math.min(o.maxStap, l.stap + ((i + n) % 3) - 1)); l.bovenVerwachting = l.bovenVerwachting && n === 0; }));
      if (soort === 'vergader') s.aanwezig = { pct: [91, 74.5, 88][n], ongeoorloofd: [0, 6, 1][n], geoorloofd: null, teLaat: [1, 4, 0][n], opmerking: '' };
      return s;
    });
  }
  const html = SDRapport.html(studenten, p, 'Voorbeeld voortgangsrapport', { soort, peildatum: datum });
  const iframe = $('vb');
  iframe.srcdoc = html;
  iframe.onload = () => { const b = iframe.contentDocument?.querySelector('.afdruk'); if (b) b.onclick = () => iframe.contentWindow.print(); };
}

/* Snelle instellingen passen het profiel (en de tekst) direct aan. */
function zetWeergave(patch) {
  let p;
  try { p = JSON.parse($('json').value); } catch { melding('Herstel eerst de fout in de tekst.', true); return; }
  p.weergave = { ...(p.weergave || {}), ...patch };
  $('json').value = JSON.stringify(p, null, 2);
  voorbeeld(p);
  melding('Niet opgeslagen. Klik op Opslaan om te bewaren.');
}
/* Vergaderlijst: grens voor de aanwezigheid en wie een bespreekgeval is. */
function zetDeel(deel, patch) {
  let p;
  try { p = JSON.parse($('json').value); } catch { melding('Herstel eerst de fout in de tekst.', true); return; }
  p[deel] = { ...(p[deel] || {}), ...patch };
  $('json').value = JSON.stringify(p, null, 2);
  voorbeeld(p);
  melding('Niet opgeslagen. Klik op Opslaan om te bewaren.');
}
$('grens').onchange = () => zetDeel('aanwezigheid', { grens: $('grens').value === '' ? null : Math.max(0, Math.min(100, Number($('grens').value))) });
$('netAan').onchange = () => zetDeel('vergadering', { netAan: $('netAan').checked });
$('onbeoordeeld').onchange = () => zetDeel('vergadering', { onbeoordeeld: $('onbeoordeeld').checked });

/* ---------- Gedeeld met het team (rapport/bron.js) ---------- */
function bronMelding(tekst, fout = false) { $('bronMelding').textContent = tekst; $('bronMelding').style.color = fout ? 'var(--fout)' : ''; }
async function bronStatus() {
  const mag = await chrome.permissions.contains({ origins: SDBron.ORIGINS }).catch(() => false);
  $('bronToestemming').hidden = mag;
  return mag;
}
async function bronLaad() {
  const s = await SDBron.instellingen();
  $('bronProfiel').value = s.profielUrl || ''; $('bronAanwezig').value = s.aanwezigUrl || '';
  const mag = await bronStatus();
  if ((s.profielUrl || s.aanwezigUrl) && !mag) bronMelding('De extensie mag nog niet bij OneDrive lezen. Klik op Toestemming geven.', true);
  else if (s.profielFout) bronMelding(`Toetsplan niet ververst: ${s.profielFout}`, true);
  else if (s.profielUrl && s.profielTijd) bronMelding(`Toetsplan laatst opgehaald op ${new Date(s.profielTijd).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}.`);
}
/* Toestemming vragen moet direct op de klik gebeuren (vóór elk wachten). */
const vraagToestemming = () => chrome.permissions.request({ origins: SDBron.ORIGINS }).catch(() => false);
$('bronToestemming').onclick = async () => { const ok = await vraagToestemming(); await bronStatus(); bronMelding(ok ? 'Toestemming gegeven.' : 'Zonder toestemming kan de extensie de bestanden niet ophalen.', !ok); };
$('bronProfielHaal').onclick = async () => {
  const toestemming = vraagToestemming();
  const url = $('bronProfiel').value.trim();
  await SDBron.bewaar({ profielUrl: url, profielTijd: 0, profielFout: null });
  if (!url) { // link weggehaald: het gedeelde profiel wordt een gewoon profiel
    profielen.forEach((p) => { delete p.gedeeld; }); await bewaar(); toon(); bronMelding('Link verwijderd. Het profiel blijft staan als eigen profiel.'); return;
  }
  if (!(await toestemming)) { await bronStatus(); bronMelding('Zonder toestemming kan de extensie het toetsplan niet ophalen.', true); return; }
  await bronStatus(); bronMelding('Toetsplan ophalen…');
  try { const p = await SDBron.profiel(true); await laad(); bronMelding(`Toetsplan "${p.naam}" opgehaald en gekozen.`); }
  catch (e) { bronMelding(`Het toetsplan kon niet worden opgehaald: ${e.message || e}`, true); }
};
$('bronAanwezigTest').onclick = async () => {
  const toestemming = vraagToestemming();
  const url = $('bronAanwezig').value.trim();
  await SDBron.bewaar({ aanwezigUrl: url });
  if (!url) { bronMelding('Link verwijderd. Rapporten tonen geen aanwezigheid meer.'); return; }
  if (!(await toestemming)) { await bronStatus(); bronMelding('Zonder toestemming kan de extensie de aanwezigheid niet ophalen.', true); return; }
  await bronStatus(); bronMelding('Aanwezigheid ophalen…');
  try {
    const a = await SDBron.aanwezigheid(huidig());
    const metPct = a.lijst.filter((x) => x.pct != null).length;
    bronMelding(`${a.lijst.length} studenten gelezen, ${metPct} met een percentage. Herkende kolommen: ${a.kolommen.join(', ')}.`, !a.lijst.length);
  } catch (e) { bronMelding(`De aanwezigheid kon niet worden gelezen: ${e.message || e}`, true); }
};

$('nadruk').onchange = () => zetWeergave({ nadrukDoelstap: $('nadruk').checked });
$('factor').oninput = () => { $('factorWaarde').textContent = `${$('factor').value}×`; zetWeergave({ nadrukFactor: Number($('factor').value) }); };
$('accent').oninput = () => zetWeergave({ accent: $('accent').value });
$('vergelijk').onchange = () => zetWeergave({ vergelijk: $('vergelijk').checked });
$('peildatum').onchange = () => { try { voorbeeld(JSON.parse($('json').value)); } catch { voorbeeld(); } };
$('soort').onchange = $('peildatum').onchange;

let tik;
$('json').oninput = () => {
  clearTimeout(tik);
  tik = setTimeout(() => {
    let p;
    try { p = JSON.parse($('json').value); } catch (e) { melding(`Geen geldige JSON: ${e.message}`, true); return; }
    const fout = controleer(p);
    if (fout) { melding(fout, true); return; }
    melding('Niet opgeslagen. Klik op Opslaan om te bewaren.');
    voorbeeld(p);
  }, 400);
};

$('opslaan').onclick = async () => {
  let p;
  try { p = JSON.parse($('json').value); } catch (e) { melding(`Geen geldige JSON: ${e.message}`, true); return; }
  const fout = controleer(p);
  if (fout) { melding(fout, true); return; }
  const i = profielen.findIndex((x) => x.id === gekozen);
  if (p.id !== gekozen && profielen.some((x) => x.id === p.id)) { melding(`Er is al een profiel met id "${p.id}".`, true); return; }
  profielen[i] = p; gekozen = p.id;
  await bewaar(); toon(); melding(p.gedeeld ? 'Opgeslagen. Let op: dit profiel komt van de gedeelde link en wordt bij het verversen overschreven. Maak een kopie voor eigen wijzigingen, of zet het aangepaste bestand terug op OneDrive.' : 'Opgeslagen.');
};

$('kies').onchange = async () => { gekozen = $('kies').value; await bewaar(); toon(); melding(''); };
$('kopie').onclick = async () => {
  const p = kloon(huidig());
  let n = 2; while (profielen.some((x) => x.id === `${p.id}-${n}`)) n++;
  p.id = `${p.id}-${n}`; p.naam = `${p.naam} (kopie)`; delete p.gedeeld;
  profielen.push(p); gekozen = p.id; await bewaar(); toon(); melding('Kopie gemaakt.');
};
$('weg').onclick = async () => {
  if (profielen.length < 2 || !confirm(`Profiel "${huidig().naam}" verwijderen?`)) return;
  profielen = profielen.filter((x) => x.id !== gekozen); gekozen = profielen[0].id; await bewaar(); toon(); melding('Verwijderd.');
};
$('herstel').onclick = async () => {
  if (!confirm('Het standaardprofiel MEP/MIP 2026-2027 terugzetten? Je eigen wijzigingen aan dat profiel gaan verloren.')) return;
  const std = kloon(SD_RAPPORT_STANDAARD);
  const i = profielen.findIndex((x) => x.id === std.id);
  if (i >= 0) profielen[i] = std; else profielen.unshift(std);
  gekozen = std.id; await bewaar(); toon(); melding('Standaard teruggezet.');
};
$('export').onclick = () => {
  const p = huidig();
  const { gedeeld, ...zonder } = p; // het merk "gedeeld" hoort niet in het bestand
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(zonder, null, 2)], { type: 'application/json' })), download: `rapportprofiel-${p.id}.json` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$('importKnop').onclick = () => $('import').click();
$('import').onchange = async () => {
  const f = $('import').files[0]; if (!f) return;
  let p;
  try { p = JSON.parse(await f.text()); } catch { melding('Dit bestand is geen geldige JSON.', true); return; }
  const fout = controleer(p);
  if (fout) { melding(fout, true); return; }
  const i = profielen.findIndex((x) => x.id === p.id);
  if (i >= 0 && !confirm(`Er is al een profiel "${profielen[i].naam}". Vervangen?`)) return;
  if (i >= 0) profielen[i] = p; else profielen.push(p);
  gekozen = p.id; await bewaar(); toon(); melding(`Profiel "${p.naam}" geïmporteerd.`);
  $('import').value = '';
};

$('peildatum').value = SD_RAPPORT_VOORBEELD.peildatum;
laad();
bronLaad();
