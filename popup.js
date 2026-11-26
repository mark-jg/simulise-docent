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

const themaNaam = (id) => { document.getElementById('themaNu').textContent = THEMES.find((t) => t.id === id)?.name || ''; };
chrome.storage.sync.get(DEFAULTS, (s) => {
  document.getElementById('developer').checked = s.developer === true;
  document.getElementById('inspect').hidden = s.developer !== true;
  document.querySelectorAll('#modules input').forEach((el) => { el.checked = s[el.dataset.key] !== false; });
  document.getElementById('compact').checked = s.compact;
  const el = document.querySelector(`input[name="theme"][value="${s.theme}"]`);
  if (el) el.checked = true;
  telModules(); themaNaam(s.theme);
});

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

/* ---------- Tabbladen ---------- */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[role=tab]');
  if (!tab) return;
  const lijst = tab.closest('[role=tablist]');
  for (const t of lijst.querySelectorAll('[role=tab]')) t.setAttribute('aria-selected', String(t === tab));
  const namen = [...lijst.querySelectorAll('[role=tab]')].map((t) => t.dataset.tab);
  for (const naam of namen) { const paneel = document.querySelector(`[data-paneel="${naam}"]`); if (paneel) paneel.hidden = naam !== tab.dataset.tab; }
  if (lijst.dataset.tabs === 'hoofd') chrome.storage.local.set({ paneelTab: tab.dataset.tab });
  else if (typeof pTeken === 'function' && P.profielen.length) pTeken(); // namen en koppelingen in het andere tabblad bijwerken
});
chrome.storage.local.get({ paneelTab: 'onderdelen' }).then(({ paneelTab }) => document.querySelector(`[data-tabs="hoofd"] [data-tab="${paneelTab}"]`)?.click());

/* ---------- Toetsplan: fasen, modules, beslismomenten en normen ----------
 * Vier losse lijsten die je aan elkaar koppelt: een module hoort bij een fase, een beslismoment bij een module en bij een norm.
 * Ze staan in het gekozen rapportprofiel (chrome.storage.local rpProfielen / rpGekozen) als fasen[], normen[] en momenten[].
 * Bij het opslaan worden ze ook uitgeschreven in perioden[] (per module: fase, het laatste beslismoment en de norm daarvan),
 * want daar lezen het rapport, de vergaderlijst en modules/perioden.js. Een profiel zonder die lijsten wordt eenmalig omgezet. */
const P = { profielen: [], gekozen: null, fasen: [], modules: [], momenten: [], normen: [], open: new Set() };
const pEsc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pProfiel = () => P.profielen.find((p) => p.id === P.gekozen) || P.profielen[0];
const pMeld = (t, fout = false) => { const el = document.getElementById('pMelding'); el.textContent = t; el.className = fout ? 'fout' : ''; };
const vandaagIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const kloon = (x) => JSON.parse(JSON.stringify(x));
const kortDatum = (d) => (d || '').slice(5).split('-').reverse().join('-');
const pRollen = () => (pProfiel().opleidingen || []).map((o) => ({ rol: o.rol, titel: o.titel || o.rol, cats: Array.isArray(o.categorieen) && o.categorieen.length > 0, aantal: Math.max(5, ...Object.keys(o.stappen || {}).map(Number)) }));

/* Van een profiel met alleen perioden naar de vier lijsten. */
function pUitPerioden(profiel) {
  const per = profiel.perioden || [];
  return {
    fasen: [...new Set([...(profiel.fasen || []).map((f) => f.naam), ...per.map((p) => String(p.fase || '').trim())].filter(Boolean))].map((naam) => ({ naam })),
    modules: per.map((p) => ({ code: p.code, naam: p.naam || '', fase: String(p.fase || '').trim(), van: p.van, tot: p.tot })),
    normen: per.filter((p) => (p.regels || []).length || p.norm || p.normNaam || Object.keys(p.doel || {}).length).map((p) => ({ id: `norm-${p.code}`, naam: p.normNaam || `Norm ${p.code}`, tekst: p.norm || '', doel: { ...(p.doel || {}) }, regels: kloon(p.regels || []) })),
    momenten: per.map((p) => ({ naam: p.moment || `Meetmoment ${p.code}`, datum: p.meetdatum || p.tot, module: p.code, norm: (p.regels || []).length || p.norm || p.normNaam || Object.keys(p.doel || {}).length ? `norm-${p.code}` : '', beslis: !!p.beslis })),
  };
}

async function pLaad() {
  const s = await chrome.storage.local.get({ rpProfielen: null, rpGekozen: null });
  P.profielen = Array.isArray(s.rpProfielen) && s.rpProfielen.length ? s.rpProfielen : [kloon(globalThis.SD_RAPPORT_STANDAARD)];
  P.gekozen = P.profielen.some((p) => p.id === s.rpGekozen) ? s.rpGekozen : P.profielen[0].id;
  const profiel = pProfiel();
  const bron = Array.isArray(profiel.normen) && Array.isArray(profiel.momenten) ? { fasen: profiel.fasen || [], modules: (profiel.perioden || []).map((p) => ({ code: p.code, naam: p.naam || '', fase: String(p.fase || '').trim(), van: p.van, tot: p.tot })), normen: profiel.normen, momenten: profiel.momenten } : pUitPerioden(profiel);
  Object.assign(P, kloon(bron));
  pTeken();
}

const pKeuze = (lijst, nu, leeg) => `<option value="">${pEsc(leeg)}</option>${lijst.map(([v, t]) => `<option value="${pEsc(v)}"${v === nu ? ' selected' : ''}>${pEsc(t)}</option>`).join('')}`;
const pNormZin = (n) => { const z = SDRapport.regelTekst(pProfiel(), n); return `<b>Op koers als</b>${z.length ? `<ul>${z.map((t) => `<li>${pEsc(t)}</li>`).join('')}</ul>` : 'Nog geen eisen: niemand krijgt met deze norm een oordeel.'}`; };
const pItem = (soort, i, kop, kort, velden) => `<details class="item" data-soort="${soort}" data-nr="${i}"${P.open.has(`${soort}:${i}`) ? ' open' : ''}><summary>${kop}${kort ? `<span class="kort">${kort}</span>` : ''}</summary><div class="velden">${velden}<div class="rijknop"><button type="button" class="klein" data-weg="${soort}:${i}">Verwijderen</button></div></div></details>`;

function pTeken() {
  const profiel = pProfiel(), nu = vandaagIso(), rollen = pRollen();
  const huidig = P.modules.find((m) => m.van <= nu && nu <= m.tot);
  document.getElementById('pNu').textContent = huidig ? `nu: ${huidig.code}` : '';
  document.getElementById('pUitleg').textContent = `Profiel: ${profiel.naam}${profiel.gedeeld ? ' (van het team: wijzigingen hier worden bij het verversen overschreven; pas het bestand op OneDrive aan)' : ''}. Geldt voor het voortgangsrapport, de vergaderlijst en de filters bij opdrachten en deadlines.`;
  document.getElementById('pGrens').value = profiel.aanwezigheid?.grens === null ? '' : (profiel.aanwezigheid?.grens ?? 80);
  const faseKeuzes = P.fasen.map((f) => [f.naam, f.naam]), moduleKeuzes = P.modules.map((m) => [m.code, `${m.code}${m.naam ? ` · ${m.naam}` : ''}`]), normKeuzes = P.normen.map((n) => [n.id, n.naam]);
  const leeg = (t) => `<p class="uitleg" style="margin:8px 0 0">${t}</p>`;
  document.getElementById('pFasenLijst').innerHTML = P.fasen.map((f, i) => { const ms = P.modules.filter((m) => m.fase === f.naam).map((m) => m.code);
    return pItem('fasen', i, `<b>${pEsc(f.naam || 'Nieuwe fase')}</b><small>${ms.length ? pEsc(ms.join(', ')) : 'nog geen modules'}</small>`, '', `<label class="breed">Naam<input type="text" data-veld="naam" value="${pEsc(f.naam)}" placeholder="Basisfase"></label>`); }).join('') || leeg('Nog geen fasen. Je kunt ook zonder fasen werken.');
  document.getElementById('pModules').innerHTML = P.modules.map((m, i) => { const moms = P.momenten.filter((x) => x.module === m.code);
    return pItem('modules', i, `<b>${pEsc(m.code || 'Nieuw')}</b><span>${pEsc([m.fase, m.naam].filter(Boolean).join(' · '))}</span>${m === huidig ? '<span class="nu">nu</span>' : ''}<small>${pEsc(kortDatum(m.van))} t/m ${pEsc(kortDatum(m.tot))}</small>`,
      pEsc(moms.length ? `Beslismoment: ${moms.map((x) => `${x.naam} (${kortDatum(x.datum)})`).join(', ')}` : 'geen beslismoment gekoppeld'),
      `<label>Code<input type="text" data-veld="code" value="${pEsc(m.code)}" placeholder="M1"></label><label>Naam<input type="text" data-veld="naam" value="${pEsc(m.naam)}" placeholder="Module 1"></label>
       <label>Van<input type="date" data-veld="van" value="${pEsc(m.van)}"></label><label>Tot en met<input type="date" data-veld="tot" value="${pEsc(m.tot)}"></label>
       <label class="breed">Fase<select data-veld="fase">${pKeuze(faseKeuzes, m.fase, 'geen fase')}</select></label>`); }).join('') || leeg('Nog geen modules.');
  document.getElementById('pMomenten').innerHTML = P.momenten.map((x, i) => pItem('momenten', i, `<b>${pEsc(x.naam || 'Nieuw moment')}</b>${x.beslis ? '<span class="nu">besluit</span>' : ''}<small>${pEsc(kortDatum(x.datum))}</small>`,
    pEsc(`${x.module ? `module ${x.module}` : 'geen module'} · ${P.normen.find((n) => n.id === x.norm)?.naam || 'geen norm'}`),
    `<label class="breed">Naam<input type="text" data-veld="naam" value="${pEsc(x.naam)}" placeholder="Voorlopig studieadvies"></label>
     <label>Datum (gemeten op)<input type="date" data-veld="datum" value="${pEsc(x.datum)}"></label><label>Module<select data-veld="module">${pKeuze(moduleKeuzes, x.module, 'kies een module')}</select></label>
     <label class="breed">Norm<select data-veld="norm">${pKeuze(normKeuzes, x.norm, 'geen norm')}</select></label>
     <label class="breed vink"><input type="checkbox" data-veld="beslis"${x.beslis ? ' checked' : ''}> Er valt een besluit (bijvoorbeeld een studieadvies)</label>`)).join('') || leeg('Nog geen beslismomenten.');
  document.getElementById('pNormen').innerHTML = P.normen.map((n, i) => { const bij = P.momenten.filter((x) => x.norm === n.id).map((x) => x.naam);
    const velden = rollen.map((r) => { const regel = (n.regels || []).find((x) => x.rol === r.rol && (r.cats ? x.soort === 'categorieen' : !x.soort)); const per = (n.regels || []).find((x) => x.soort === 'perLeerlijn' && x.rol === r.rol);
      const aantal = Math.max(r.aantal, ...Object.keys(per?.eisen || {}).map(Number), 1);
      return r.cats ? `<h4>${pEsc(r.titel)}</h4><div class="zin">minimaal <input type="number" min="0" max="20" data-regel="minAantal" data-rol="${pEsc(r.rol)}" data-vakken="1" value="${pEsc(regel?.minAantal ?? '')}"> vakken op stap <input type="number" min="1" max="9" data-regel="vakStap" data-rol="${pEsc(r.rol)}" data-vakken="1" value="${pEsc(regel?.perCategorie?.stap ?? 1)}"></div>
          <div class="zin">per vak <select data-regel="vakLeerlijnen" data-rol="${pEsc(r.rol)}" data-vakken="1">${[['1', 'minstens 1 leerlijn'], ['2', 'minstens 2 leerlijnen'], ['3', 'minstens 3 leerlijnen'], ['alle', 'alle leerlijnen']].map(([v, t]) => `<option value="${v}"${String(!regel?.perCategorie?.minLeerlijnen ? (regel ? 'alle' : '1') : regel.perCategorie.minLeerlijnen) === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
            <label class="vink" style="flex-direction:row"><input type="checkbox" data-regel="telt" data-rol="${pEsc(r.rol)}" data-vakken="1"${regel && regel.telt !== false ? ' checked' : ''}> telt mee voor op koers</label></div>`
        : `<h4>${pEsc(r.titel)}</h4><div class="zin">minimaal <input type="number" min="0" max="20" data-regel="minAantal" data-rol="${pEsc(r.rol)}" value="${pEsc(regel?.minAantal ?? '')}"> leerlijnen op stap <input type="number" min="1" max="9" data-regel="stap" data-rol="${pEsc(r.rol)}" value="${pEsc(regel?.stap ?? '')}">
            verplicht <input type="text" data-regel="verplicht" data-rol="${pEsc(r.rol)}" value="${pEsc((regel?.verplicht || []).join(', '))}" placeholder="1, 2, 3" title="Nummers van leerlijnen die er in elk geval bij moeten zijn"></div>
          <div class="zin">of per leerlijn een eigen stap (leeg = telt niet mee):</div><div class="eisrij">${Array.from({ length: aantal }, (_, k) => `<label>${k + 1}<input type="number" min="0" max="9" data-regel="eis" data-rol="${pEsc(r.rol)}" data-ll="${k + 1}" value="${pEsc(per?.eisen?.[k + 1] ?? '')}"></label>`).join('')}
            <label style="flex:0 0 76px;margin-left:auto">minimaal<input type="number" min="1" max="${aantal}" data-regel="eisMin" data-rol="${pEsc(r.rol)}" value="${pEsc(per?.minAantal ?? '')}" placeholder="alle"></label></div>`; }).join('');
    return pItem('normen', i, `<b>${pEsc(n.naam || 'Nieuwe norm')}</b><small>${pEsc(bij.length ? `bij ${bij.join(', ')}` : 'nergens gekoppeld')}</small>`, pEsc(SDRapport.regelTekst(profiel, n).join(' · ') || 'geen eisen'),
      `<label class="breed">Naam<input type="text" data-veld="naam" value="${pEsc(n.naam)}" placeholder="VSA-norm"></label><div class="normzin" data-normzin>${pNormZin(n)}</div>${velden}
       ${rollen.map((r) => `<label>Doelstap ${pEsc(r.titel)}<input type="number" min="0" max="9" data-doel="${pEsc(r.rol)}" value="${pEsc(n.doel?.[r.rol] ?? '')}"></label>`).join('')}
       <label class="breed">Norm in woorden (voor op het rapport)<textarea data-veld="tekst">${pEsc(n.tekst || '')}</textarea></label>`); }).join('') || leeg('Nog geen normen.');
}

/* Onthoud welke regels open staan, zodat opnieuw tekenen ze niet dichtklapt. */
document.querySelector('[data-paneel="toetsplan"]').addEventListener('toggle', (e) => {
  const d = e.target.closest?.('.item'); if (!d) return;
  const sleutel = `${d.dataset.soort}:${d.dataset.nr}`; if (d.open) P.open.add(sleutel); else P.open.delete(sleutel);
}, true);

document.querySelector('[data-paneel="toetsplan"]').addEventListener('input', (e) => {
  const kaart = e.target.closest('.item'); if (!kaart) return;
  const soort = kaart.dataset.soort, x = P[soort][Number(kaart.dataset.nr)], el = e.target; if (!x) return;
  const getal = (v) => (v === '' ? '' : Number(v));
  if (el.dataset.veld) {
    const veld = el.dataset.veld, oud = x[veld], nieuw = el.type === 'checkbox' ? el.checked : el.value;
    x[veld] = nieuw;
    // Koppelingen volgen een nieuwe naam of code.
    if (soort === 'fasen' && veld === 'naam') P.modules.forEach((m) => { if (m.fase === oud) m.fase = nieuw; });
    if (soort === 'modules' && veld === 'code') P.momenten.forEach((m) => { if (m.module === oud) m.module = nieuw; });
  } else if (el.dataset.doel) { x.doel = { ...(x.doel || {}) }; if (el.value === '') delete x.doel[el.dataset.doel]; else x.doel[el.dataset.doel] = Number(el.value); }
  else if (el.dataset.regel) {
    const wat = el.dataset.regel, rol = el.dataset.rol, vakken = el.dataset.vakken === '1';
    x.regels = [...(x.regels || [])];
    if (wat === 'eis' || wat === 'eisMin') { // per leerlijn een eigen stap
      let i = x.regels.findIndex((r) => r.soort === 'perLeerlijn' && r.rol === rol);
      const regel = i >= 0 ? { ...x.regels[i], eisen: { ...(x.regels[i].eisen || {}) } } : { rol, soort: 'perLeerlijn', eisen: {} };
      if (wat === 'eis') { if (el.value === '' || Number(el.value) <= 0) delete regel.eisen[el.dataset.ll]; else regel.eisen[el.dataset.ll] = Number(el.value); }
      else if (el.value === '') delete regel.minAantal; else regel.minAantal = Number(el.value);
      if (i < 0) i = x.regels.length;
      if (Object.keys(regel.eisen).length) x.regels[i] = regel; else if (i < x.regels.length) x.regels.splice(i, 1);
    } else {
      let i = x.regels.findIndex((r) => r.rol === rol && (vakken ? r.soort === 'categorieen' : !r.soort));
      const regel = i >= 0 ? kloon(x.regels[i]) : vakken ? { rol, soort: 'categorieen', minAantal: 0, perCategorie: { minLeerlijnen: 1, stap: 1 } } : { rol, stap: 1, minAantal: 0 };
      if (wat === 'telt') regel.telt = el.checked;
      else if (wat === 'verplicht') regel.verplicht = el.value.split(/[^0-9]+/).filter(Boolean).map(Number);
      else if (wat === 'vakStap') regel.perCategorie = { ...(regel.perCategorie || { minLeerlijnen: 1 }), stap: Number(el.value) || 1 };
      else if (wat === 'vakLeerlijnen') regel.perCategorie = { ...(regel.perCategorie || { stap: 1 }), minLeerlijnen: el.value === 'alle' ? 'alle' : Number(el.value) };
      else regel[wat] = getal(el.value) || 0;
      if (!vakken && !regel.stap) regel.stap = 1;
      if (regel.verplicht && !regel.verplicht.length) delete regel.verplicht;
      if (i < 0) i = x.regels.length;
      if (regel.minAantal > 0) x.regels[i] = regel; else if (i < x.regels.length) x.regels.splice(i, 1);
    }
    const zin = kaart.querySelector('[data-normzin]'); if (zin) zin.innerHTML = pNormZin(x);
    const kort = kaart.querySelector('summary .kort'); if (kort) kort.textContent = SDRapport.regelTekst(pProfiel(), x).join(' · ') || 'geen eisen';
  }
  pMeld('Niet opgeslagen.');
  // Opnieuw tekenen bij een keuze of vinkje; tekst en datums pas bij het wisselen van tabblad (anders verlies je de plek waar je typt of klikt).
  if (el.tagName === 'SELECT' || el.type === 'checkbox') pTeken();
});

document.querySelector('[data-paneel="toetsplan"]').addEventListener('click', (e) => {
  const weg = e.target.closest('[data-weg]'), erbij = e.target.closest('[data-erbij]');
  if (weg) {
    const [soort, nr] = weg.dataset.weg.split(':'), x = P[soort][Number(nr)];
    P[soort].splice(Number(nr), 1); P.open.clear();
    if (soort === 'fasen') P.modules.forEach((m) => { if (m.fase === x.naam) m.fase = ''; });
    if (soort === 'modules') P.momenten.forEach((m) => { if (m.module === x.code) m.module = ''; });
    if (soort === 'normen') P.momenten.forEach((m) => { if (m.norm === x.id) m.norm = ''; });
    pTeken(); pMeld('Niet opgeslagen.');
  } else if (erbij) {
    const soort = erbij.dataset.erbij;
    if (soort === 'fasen') P.fasen.push({ naam: `Fase ${P.fasen.length + 1}` });
    else if (soort === 'modules') {
      const laatste = P.modules.at(-1); let van = vandaagIso();
      if (laatste?.tot) { const d = new Date(`${laatste.tot}T12:00:00`); d.setDate(d.getDate() + 1); van = d.toISOString().slice(0, 10); }
      const tot = new Date(`${van}T12:00:00`); tot.setDate(tot.getDate() + 69);
      let n = P.modules.length + 1; while (P.modules.some((m) => m.code === `M${n}`)) n++;
      P.modules.push({ code: `M${n}`, naam: `Module ${n}`, fase: laatste?.fase || '', van, tot: tot.toISOString().slice(0, 10) });
    } else if (soort === 'momenten') { const m = P.modules.at(-1); P.momenten.push({ naam: 'Nieuw beslismoment', datum: m?.tot || vandaagIso(), module: m?.code || '', norm: '', beslis: false }); }
    else if (soort === 'normen') { let n = P.normen.length + 1; while (P.normen.some((x) => x.id === `norm-${n}`)) n++; P.normen.push({ id: `norm-${n}`, naam: `Norm ${n}`, tekst: '', doel: {}, regels: [] }); }
    P.open.add(`${soort}:${P[soort].length - 1}`);
    pTeken(); pMeld('Niet opgeslagen.');
  }
});
document.getElementById('pGrens').addEventListener('input', () => pMeld('Niet opgeslagen.'));

document.getElementById('pOpslaan').addEventListener('click', async () => {
  const fout = (t) => { pMeld(t, true); return null; };
  const modules = P.modules.map((m) => ({ ...m, code: String(m.code || '').trim(), fase: String(m.fase || '').trim() }));
  const codes = new Set();
  for (const m of modules) {
    if (!m.code) return fout('Elke module heeft een code nodig.');
    if (codes.has(m.code)) return fout(`De code ${m.code} komt twee keer voor.`);
    codes.add(m.code);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.van || '') || !/^\d{4}-\d{2}-\d{2}$/.test(m.tot || '')) return fout(`Module ${m.code}: vul Van en Tot en met in.`);
    if (m.tot < m.van) return fout(`Module ${m.code}: de einddatum ligt voor de begindatum.`);
  }
  const fasen = P.fasen.map((f) => ({ naam: String(f.naam || '').trim() })).filter((f) => f.naam);
  if (new Set(fasen.map((f) => f.naam)).size !== fasen.length) return fout('Twee fasen hebben dezelfde naam.');
  for (const x of P.momenten) if (!/^\d{4}-\d{2}-\d{2}$/.test(x.datum || '')) return fout(`Beslismoment ${x.naam || ''}: vul een datum in.`);
  modules.sort((a, b) => a.van.localeCompare(b.van));
  // Uitschrijven per module: het laatste beslismoment van die module bepaalt de norm, de doelstap en de meetdatum.
  const perioden = modules.map((m) => {
    const mom = P.momenten.filter((x) => x.module === m.code).sort((a, b) => a.datum.localeCompare(b.datum)).at(-1), norm = mom && P.normen.find((n) => n.id === mom.norm);
    const p = { code: m.code, naam: m.naam, van: m.van, tot: m.tot, moment: mom?.naam || '', beslis: !!mom?.beslis, norm: norm?.tekst || '', doel: { ...(norm?.doel || {}) }, regels: kloon(norm?.regels || []) };
    if (m.fase) p.fase = m.fase;
    if (norm?.naam) p.normNaam = norm.naam;
    if (mom?.datum && mom.datum !== m.tot) p.meetdatum = mom.datum;
    return p;
  });
  const grens = document.getElementById('pGrens').value;
  const profiel = { ...pProfiel(), perioden, fasen, normen: kloon(P.normen), momenten: kloon(P.momenten), aanwezigheid: { ...(pProfiel().aanwezigheid || {}), grens: grens === '' ? null : Math.max(0, Math.min(100, Number(grens))) } };
  P.profielen = P.profielen.map((p) => (p.id === profiel.id ? profiel : p));
  await chrome.storage.local.set({ rpProfielen: P.profielen, rpGekozen: P.gekozen });
  P.modules = modules.map((m) => ({ ...m })); P.fasen = fasen;
  pTeken();
  const dubbel = modules.filter((m) => P.momenten.filter((x) => x.module === m.code).length > 1).map((m) => m.code);
  pMeld(`${profiel.gedeeld ? 'Opgeslagen, tot het toetsplan van het team opnieuw wordt opgehaald.' : 'Opgeslagen.'}${dubbel.length ? ` Let op: ${dubbel.join(', ')} heeft meer dan één beslismoment; het laatste telt.` : ''}`);
});
chrome.storage.onChanged.addListener((w, gebied) => { if (gebied === 'local' && w.rpGekozen) pLaad(); });
pLaad();
