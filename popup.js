const THEMES = [
  { id: 'auto',    name: 'Automatisch', hint: 'volgt je systeem', a: '#ffffff', b: '#1c2025' },
  { id: 'light',   name: 'Neutraal licht', a: '#f4f5f7', b: '#0e8a74' },
  { id: 'dark',    name: 'Neutraal donker', a: '#1c2025', b: '#3fc1a7' },
  { id: 'discord', name: 'Discord', a: '#313338', b: '#5865f2' },
  { id: 'tiimo',   name: 'Tiimo', hint: 'zacht lila, ronde vormen', a: '#f3effb', b: '#7c5cff' },
  { id: 'nord',    name: 'Nord', hint: 'koel blauwgrijs', a: '#2e3440', b: '#88c0d0' },
  { id: 'paper',   name: 'Papier', hint: 'warm, serif', a: '#f3efe7', b: '#8a5a2b' },
  { id: 'mocha',   name: 'Mokka', hint: 'warm donker', a: '#1e1e2e', b: '#cba6f7' },
];
const DEFAULTS = globalThis.SD_DEFAULTS;

// Aan/uit per module, uit modules/registry.js.
const modList = document.getElementById('modules');
for (const m of globalThis.SD_MODULES) {
  const label = document.createElement('label');
  label.innerHTML = `<input type="checkbox" data-key="${m.key}"> <span>${m.naam}<small>${m.uitleg}</small></span>`;
  modList.appendChild(label);
}

const list = document.getElementById('themes');
for (const t of THEMES) {
  const label = document.createElement('label');
  label.innerHTML = `<input type="radio" name="theme" value="${t.id}">
    <span class="swatch" style="--a:${t.a};--b:${t.b}"></span>
    <span>${t.name}${t.hint ? ` <small>${t.hint}</small>` : ''}</span>`;
  list.appendChild(label);
}

chrome.storage.sync.get(DEFAULTS, (s) => {
  document.querySelectorAll('#modules input').forEach((el) => { el.checked = s[el.dataset.key] !== false; });
  document.getElementById('compact').checked = s.compact;
  const el = document.querySelector(`input[name="theme"][value="${s.theme}"]`);
  if (el) el.checked = true;
});
document.querySelectorAll('#modules input').forEach((el) =>
  el.addEventListener('change', (e) => chrome.storage.sync.set({ [e.target.dataset.key]: e.target.checked })));
document.getElementById('compact').addEventListener('change', (e) => chrome.storage.sync.set({ compact: e.target.checked }));
document.querySelectorAll('input[name="theme"]').forEach((el) =>
  el.addEventListener('change', (e) => chrome.storage.sync.set({ theme: e.target.value })));

/* ---------- Updates: tonen; het bijwerken zelf gebeurt op de updatepagina ---------- */
const current = chrome.runtime.getManifest().version;
const note = (t) => { document.getElementById('note').textContent = t; };
const openUpdatePage = () => chrome.tabs.create({ url: chrome.runtime.getURL('update/update.html') });
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
document.getElementById('doUpdate').addEventListener('click', openUpdatePage);
document.getElementById('updCheck').addEventListener('click', async (e) => {
  e.preventDefault();
  note('Controleren…');
  const info = await chrome.runtime.sendMessage({ type: 'checkUpdate' }).catch(() => null);
  if (!info) { note('Controleren mislukt.'); return; }
  renderUpdate(info);
  note(info.error ? `Kon GitHub niet bereiken: ${info.error}.` : info.available ? '' : info.latest ? `Je hebt de nieuwste versie (${current}).` : 'Er is nog geen release gepubliceerd.');
});
