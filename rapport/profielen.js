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
  $('kies').replaceChildren(...profielen.map((p) => Object.assign(document.createElement('option'), { value: p.id, textContent: p.naam, selected: p.id === gekozen })));
  const p = huidig();
  $('json').value = JSON.stringify(p, null, 2);
  const w = p.weergave || {};
  $('nadruk').checked = w.nadrukDoelstap !== false;
  $('factor').value = w.nadrukFactor || 1.9; $('factorWaarde').textContent = `${$('factor').value}×`;
  $('accent').value = w.accent || '#e6007e';
  $('vergelijk').checked = w.vergelijk !== false;
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
  const html = SDRapport.html([vb], p, 'Voorbeeld voortgangsrapport');
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
$('nadruk').onchange = () => zetWeergave({ nadrukDoelstap: $('nadruk').checked });
$('factor').oninput = () => { $('factorWaarde').textContent = `${$('factor').value}×`; zetWeergave({ nadrukFactor: Number($('factor').value) }); };
$('accent').oninput = () => zetWeergave({ accent: $('accent').value });
$('vergelijk').onchange = () => zetWeergave({ vergelijk: $('vergelijk').checked });
$('peildatum').onchange = () => { try { voorbeeld(JSON.parse($('json').value)); } catch { voorbeeld(); } };

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
  await bewaar(); toon(); melding('Opgeslagen.');
};

$('kies').onchange = async () => { gekozen = $('kies').value; await bewaar(); toon(); melding(''); };
$('kopie').onclick = async () => {
  const p = kloon(huidig());
  let n = 2; while (profielen.some((x) => x.id === `${p.id}-${n}`)) n++;
  p.id = `${p.id}-${n}`; p.naam = `${p.naam} (kopie)`;
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
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })), download: `rapportprofiel-${p.id}.json` });
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
