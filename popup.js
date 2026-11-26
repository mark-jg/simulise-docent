const THEMES = [
  { id: 'auto',    name: 'Automatisch', hint: 'volgt je systeem', a: '#ffffff', b: '#1c2025' },
  { id: 'light',   name: 'Neutraal licht', a: '#f4f5f7', b: '#0e8a74' },
  { id: 'dark',    name: 'Neutraal donker', a: '#1c2025', b: '#3fc1a7' },
  { id: 'discord', name: 'Discord', a: '#313338', b: '#5865f2' },
  { id: 'helder',  name: 'Helder', hint: 'nieuwe schil: taken, gewone taal, kleur per klas (proef)', a: '#f6f4ef', b: '#4f5bd5' },
  { id: 'tiimo',   name: 'Tiimo', hint: 'zacht lila, ronde vormen', a: '#f3effb', b: '#7c5cff' },
  { id: 'nord',    name: 'Nord', hint: 'koel blauwgrijs', a: '#2e3440', b: '#88c0d0' },
  { id: 'paper',   name: 'Papier', hint: 'warm, serif', a: '#f3efe7', b: '#8a5a2b' },
  { id: 'mocha',   name: 'Mokka', hint: 'warm donker', a: '#1e1e2e', b: '#cba6f7' },
];
const DEFAULTS = globalThis.SD_DEFAULTS;

// Aan/uit per module, uit modules/registry.js, per soort werk.
const modList = document.getElementById('modules');
const GROEPEN = [['nakijken', 'Nakijken'], ['klassen', 'Klassen en opdrachten'], ['rapporten', 'Rapporten en inzicht'], ['uiterlijk', 'Uiterlijk en schil'], ['overig', 'Overig']];
for (const [groep, titel] of GROEPEN) {
  const mods = globalThis.SD_MODULES.filter((m) => !m.dev && (m.groep || 'overig') === groep);
  if (!mods.length) continue;
  modList.appendChild(Object.assign(document.createElement('h3'), { textContent: titel }));
  for (const m of mods) {
    const label = Object.assign(document.createElement('label'), { className: 'keuze' });
    label.innerHTML = `<input type="checkbox" data-key="${m.key}"> <span>${m.naam}<small>${m.uitleg}</small></span>`;
    modList.appendChild(label);
  }
}
const telModules = () => { const alle = [...document.querySelectorAll('#modules input')]; document.getElementById('modTel').textContent = `${alle.filter((el) => el.checked).length} van ${alle.length} aan`; };

const list = document.getElementById('themes');
for (const t of THEMES) {
  const label = Object.assign(document.createElement('label'), { className: 'keuze' });
  label.innerHTML = `<input type="radio" name="theme" value="${t.id}">
    <span class="swatch" style="--a:${t.a};--b:${t.b}"></span>
    <span>${t.name}${t.hint ? ` <small>${t.hint}</small>` : ''}</span>`;
  list.appendChild(label);
}

chrome.storage.sync.get(DEFAULTS, (s) => {
  document.getElementById('developer').checked = s.developer === true;
  document.getElementById('inspect').hidden = s.developer !== true;
  document.querySelectorAll('#modules input').forEach((el) => { el.checked = s[el.dataset.key] !== false; });
  document.getElementById('compact').checked = s.compact;
  const el = document.querySelector(`input[name="theme"][value="${s.theme}"]`);
  if (el) el.checked = true;
  telModules(); themaNaam(s.theme);
});
const themaNaam = (id) => { document.getElementById('themaNu').textContent = THEMES.find((t) => t.id === id)?.name || ''; };
document.querySelectorAll('#modules input').forEach((el) =>
  el.addEventListener('change', (e) => { chrome.storage.sync.set({ [e.target.dataset.key]: e.target.checked }); telModules(); }));
document.getElementById('compact').addEventListener('change', (e) => chrome.storage.sync.set({ compact: e.target.checked }));
document.querySelectorAll('input[name="theme"]').forEach((el) =>
  el.addEventListener('change', (e) => { chrome.storage.sync.set({ theme: e.target.value }); themaNaam(e.target.value); }));

/* ---------- Updates: tonen; het bijwerken zelf doet update/updater.js, ook hier in de popup ---------- */
const current = chrome.runtime.getManifest().version;
const note = (t) => { document.getElementById('note').textContent = t; };
document.getElementById('ver').textContent = `v${current}`;

function renderUpdate(info) {
  const avail = !!info?.available;
  document.getElementById('update').hidden = !avail;
  if (!avail) return;
  document.getElementById('updTitle').textContent = `Versie ${info.latest} beschikbaar`;
  document.getElementById('updText').textContent = `Je gebruikt nu ${current}.`;
}
chrome.storage.local.get(['update', 'justUpdated']).then(({ update, justUpdated }) => {
  renderUpdate(update);
  if (justUpdated?.to === current) note(`Bijgewerkt van ${justUpdated.from} naar ${justUpdated.to}. Herlaad je Simulise-tabbladen.`);
  if (justUpdated) chrome.storage.local.remove('justUpdated');
});
document.getElementById('updCheck').addEventListener('click', async (e) => {
  e.preventDefault();
  note('Controleren…');
  const info = await chrome.runtime.sendMessage({ type: 'checkUpdate' }).catch(() => null);
  if (!info) { note('Controleren mislukt.'); return; }
  renderUpdate(info);
  note(info.error ? `Kon GitHub niet bereiken: ${info.error}.` : info.available ? '' : info.latest ? `Je hebt de nieuwste versie (${current}).` : 'Er is nog geen release gepubliceerd.');
});

/* ---------- Ontwikkelaarsmodus ---------- */
document.getElementById('developer').addEventListener('change', (e) => {
  chrome.storage.sync.set({ developer: e.target.checked });
  document.getElementById('inspect').hidden = !e.target.checked;
});
document.getElementById('inspect').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const ok = tab && await chrome.tabs.sendMessage(tab.id, { type: 'sd-inspector' }).then(() => true, () => false);
  if (!ok) note('Open eerst een Simulise-tabblad (en herlaad het als de extensie net is bijgewerkt).');
});

document.getElementById('profielen').addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL('rapport/profielen.html') }); });
document.getElementById('updPagina').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

/* ---------- Periodes en normen ----------
 * De periodes staan in het gekozen rapportprofiel (chrome.storage.local rpProfielen / rpGekozen), zodat rapporten, de
 * opdrachten van een klas en de deadlines op de klaspagina dezelfde periodes gebruiken (modules/perioden.js). */
const P = { profielen: [], gekozen: null, lijst: [] };
const pEsc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pProfiel = () => P.profielen.find((p) => p.id === P.gekozen) || P.profielen[0];
const pMeld = (t, fout = false) => { const el = document.getElementById('pMelding'); el.textContent = t; el.className = fout ? 'fout' : ''; };
const vandaagIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function pLaad() {
  const s = await chrome.storage.local.get({ rpProfielen: null, rpGekozen: null });
  P.profielen = Array.isArray(s.rpProfielen) && s.rpProfielen.length ? s.rpProfielen : [JSON.parse(JSON.stringify(globalThis.SD_RAPPORT_STANDAARD))];
  P.gekozen = P.profielen.some((p) => p.id === s.rpGekozen) ? s.rpGekozen : P.profielen[0].id;
  P.lijst = JSON.parse(JSON.stringify(pProfiel().perioden || []));
  pTeken();
}

function pTeken() {
  const profiel = pProfiel(), nu = vandaagIso(), rollen = (profiel.opleidingen || []).map((o) => ({ rol: o.rol, titel: o.titel || o.rol }));
  const huidig = P.lijst.find((p) => p.van <= nu && nu <= p.tot);
  document.getElementById('pNu').textContent = huidig ? `nu: ${huidig.code}` : `${P.lijst.length} ${P.lijst.length === 1 ? 'periode' : 'periodes'}`;
  document.getElementById('pUitleg').textContent = `Profiel: ${profiel.naam}${profiel.gedeeld ? ' (van het team: wijzigingen hier worden bij het verversen overschreven; pas het bestand op OneDrive aan).' : '.'} De periodes gelden voor het voortgangsrapport en de vergaderlijst, het filter op deadline bij de opdrachten van een klas en de deadlines op de klaspagina.`;
  document.getElementById('pGrens').value = profiel.aanwezigheid?.grens === null ? '' : (profiel.aanwezigheid?.grens ?? 80);
  document.getElementById('perioden').innerHTML = P.lijst.map((p, i) => `<details class="periode" data-nr="${i}"${p._nieuw ? ' open' : ''}><summary><b>${pEsc(p.code || 'Nieuw')}</b><span>${pEsc(p.naam || '')}</span>${p === huidig ? '<span class="nu">nu</span>' : ''}<small style="margin-left:auto">${pEsc((p.van || '').slice(5).split('-').reverse().join('-'))} t/m ${pEsc((p.tot || '').slice(5).split('-').reverse().join('-'))}</small></summary>
    <div class="velden"><label>Code<input type="text" data-p="code" value="${pEsc(p.code || '')}" placeholder="M1"></label><label>Naam<input type="text" data-p="naam" value="${pEsc(p.naam || '')}" placeholder="Periode 1"></label>
      <label>Van<input type="date" data-p="van" value="${pEsc(p.van || '')}"></label><label>Tot en met<input type="date" data-p="tot" value="${pEsc(p.tot || '')}"></label>
      <label class="breed">Moment<input type="text" data-p="moment" value="${pEsc(p.moment || '')}" placeholder="meetmoment, voorlopig studieadvies…"></label>
      <label class="breed vink"><input type="checkbox" data-p="beslis"${p.beslis ? ' checked' : ''}> Er valt een besluit in deze periode</label>
      <label>Naam van de norm<input type="text" data-p="normNaam" value="${pEsc(p.normNaam || '')}" placeholder="VSA-norm"></label>
      ${rollen.map((r) => `<label>Doelstap ${pEsc(r.titel)}<input type="number" min="0" max="9" data-p="doel" data-rol="${pEsc(r.rol)}" value="${pEsc(p.doel?.[r.rol] ?? '')}"></label>`).join('')}
      <label class="breed">Norm in woorden<textarea data-p="norm">${pEsc(p.norm || '')}</textarea></label>
      <label class="breed" style="flex-direction:row;justify-content:space-between;align-items:center"><span>${(p.regels || []).length} ${(p.regels || []).length === 1 ? 'regel' : 'regels'} voor "op koers"</span><button type="button" class="klein" data-p-weg="${i}">Periode verwijderen</button></label></div></details>`).join('')
    || '<p class="note" style="padding:0">Nog geen periodes.</p>';
}

document.getElementById('perioden').addEventListener('input', (e) => {
  const veld = e.target.dataset.p, p = P.lijst[Number(e.target.closest('.periode')?.dataset.nr)];
  if (!veld || !p) return;
  if (veld === 'beslis') p.beslis = e.target.checked;
  else if (veld === 'doel') { p.doel = { ...(p.doel || {}) }; if (e.target.value === '') delete p.doel[e.target.dataset.rol]; else p.doel[e.target.dataset.rol] = Number(e.target.value); }
  else p[veld] = e.target.value;
  pMeld('Niet opgeslagen.');
});
document.getElementById('perioden').addEventListener('click', (e) => {
  const weg = e.target.closest('[data-p-weg]');
  if (!weg) return;
  P.lijst.splice(Number(weg.dataset.pWeg), 1); pTeken(); pMeld('Niet opgeslagen.');
});
document.getElementById('pErbij').addEventListener('click', () => {
  const laatste = P.lijst.at(-1);
  let van = vandaagIso();
  if (laatste?.tot) { const d = new Date(`${laatste.tot}T12:00:00`); d.setDate(d.getDate() + 1); van = d.toISOString().slice(0, 10); }
  const tot = new Date(`${van}T12:00:00`); tot.setDate(tot.getDate() + 69);
  P.lijst.push({ code: `M${P.lijst.length + 1}`, naam: `Periode ${P.lijst.length + 1}`, van, tot: tot.toISOString().slice(0, 10), moment: '', beslis: false, norm: '', doel: { ...(laatste?.doel || {}) }, regels: [], _nieuw: true });
  pTeken(); pMeld('Niet opgeslagen.');
});
document.getElementById('pGrens').addEventListener('input', () => pMeld('Niet opgeslagen.'));
document.getElementById('pOpslaan').addEventListener('click', async () => {
  const lijst = P.lijst.map(({ _nieuw, ...p }) => ({ ...p, code: String(p.code || '').trim() }));
  const codes = new Set();
  for (const p of lijst) {
    if (!p.code) { pMeld('Elke periode heeft een code nodig.', true); return; }
    if (codes.has(p.code)) { pMeld(`De code ${p.code} komt twee keer voor.`, true); return; }
    codes.add(p.code);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.van || '') || !/^\d{4}-\d{2}-\d{2}$/.test(p.tot || '')) { pMeld(`Periode ${p.code}: vul Van en Tot en met in.`, true); return; }
    if (p.tot < p.van) { pMeld(`Periode ${p.code}: de einddatum ligt voor de begindatum.`, true); return; }
  }
  lijst.sort((a, b) => a.van.localeCompare(b.van));
  const grens = document.getElementById('pGrens').value;
  const profiel = { ...pProfiel(), perioden: lijst, aanwezigheid: { ...(pProfiel().aanwezigheid || {}), grens: grens === '' ? null : Math.max(0, Math.min(100, Number(grens))) } };
  P.profielen = P.profielen.map((p) => (p.id === profiel.id ? profiel : p));
  await chrome.storage.local.set({ rpProfielen: P.profielen, rpGekozen: P.gekozen });
  P.lijst = JSON.parse(JSON.stringify(lijst));
  pTeken(); pMeld(profiel.gedeeld ? 'Opgeslagen, tot het toetsplan van het team opnieuw wordt opgehaald.' : 'Opgeslagen.');
});
chrome.storage.onChanged.addListener((w, gebied) => { if (gebied === 'local' && w.rpGekozen) pLaad(); });
pLaad();
