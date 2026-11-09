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
const DEFAULTS = { enabled: true, theme: 'auto', compact: false };

const list = document.getElementById('themes');
for (const t of THEMES) {
  const label = document.createElement('label');
  label.innerHTML = `<input type="radio" name="theme" value="${t.id}">
    <span class="swatch" style="--a:${t.a};--b:${t.b}"></span>
    <span>${t.name}${t.hint ? ` <small>${t.hint}</small>` : ''}</span>`;
  list.appendChild(label);
}

chrome.storage.sync.get(DEFAULTS, (s) => {
  document.getElementById('enabled').checked = s.enabled;
  document.getElementById('compact').checked = s.compact;
  const el = document.querySelector(`input[name="theme"][value="${s.theme}"]`);
  if (el) el.checked = true;
});
document.getElementById('enabled').addEventListener('change', (e) => chrome.storage.sync.set({ enabled: e.target.checked }));
document.getElementById('compact').addEventListener('change', (e) => chrome.storage.sync.set({ compact: e.target.checked }));
document.querySelectorAll('input[name="theme"]').forEach((el) =>
  el.addEventListener('change', (e) => chrome.storage.sync.set({ theme: e.target.value })));
