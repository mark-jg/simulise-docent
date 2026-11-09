/* ---------- Updates via GitHub Releases ----------
 * Een uitgepakte extensie kan zichzelf niet vervangen. Wat wel kan: periodiek de nieuwste
 * release op GitHub opvragen (alleen het versienummer en de downloadlink, er gaat niets
 * over de gebruiker of Simulise mee), een badge op het icoon zetten en via de updatepagina
 * de nieuwe bestanden in de extensiemap schrijven. Uit te zetten op de updatepagina.
 */
const REPO = 'mark-jg/simulise-docent';
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;
const ALARM = 'sd-update-check';
const CHECK_INTERVAL_MIN = 6 * 60;

function cmpVersion(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

async function updatesEnabled() {
  const { updateCheck } = await chrome.storage.sync.get({ updateCheck: true });
  return updateCheck !== false;
}

function scheduleUpdateCheck() {
  chrome.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: CHECK_INTERVAL_MIN });
}

async function setBadge(on) {
  await chrome.action.setBadgeText({ text: on ? '1' : '' });
  if (on) await chrome.action.setBadgeBackgroundColor({ color: '#E8B84A' });
}

async function checkForUpdate(force = false) {
  const current = chrome.runtime.getManifest().version;
  if (!force && !(await updatesEnabled())) {
    await setBadge(false);
    return { current, disabled: true };
  }
  const prev = (await chrome.storage.local.get('update')).update || {};
  let info;
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      cache: 'no-store',
    });
    if (res.status === 403 || res.status === 429) throw new Error('GitHub-limiet bereikt, probeer het later opnieuw');
    if (res.status === 404) {
      // Nog geen release gepubliceerd.
      info = { current, latest: null, available: false, page: RELEASES_PAGE, zip: null, checkedAt: Date.now(), error: null };
    } else if (!res.ok) {
      throw new Error(`GitHub antwoordde met ${res.status}`);
    } else {
      const rel = await res.json();
      const latest = String(rel.tag_name || '').replace(/^v/i, '');
      const asset = (rel.assets || []).find((a) => /\.zip$/i.test(a.name));
      info = {
        current,
        latest,
        available: Boolean(latest) && cmpVersion(latest, current) > 0,
        page: rel.html_url || RELEASES_PAGE,
        zip: asset?.browser_download_url || null,
        notes: String(rel.body || '').slice(0, 1500),
        publishedAt: rel.published_at || null,
        checkedAt: Date.now(),
        error: null,
      };
    }
  } catch (e) {
    info = { ...prev, current, available: Boolean(prev.latest) && cmpVersion(prev.latest, current) > 0, checkedAt: Date.now(), error: String(e?.message || e) };
  }
  await chrome.storage.local.set({ update: info });
  await setBadge(Boolean(info.available));
  return info;
}

chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) checkForUpdate(); });
chrome.runtime.onStartup.addListener(() => { scheduleUpdateCheck(); checkForUpdate(); });

chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  scheduleUpdateCheck();
  checkForUpdate();
  // Na een update: één keer "Bijgewerkt van X naar Y" in de popup tonen.
  const current = chrome.runtime.getManifest().version;
  if (reason === 'update' && previousVersion && previousVersion !== current) {
    await chrome.storage.local.set({ justUpdated: { from: previousVersion, to: current } });
  }
});

/* ---------- Berichten van popup en updatepagina ---------- */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg?.type) {
    case 'checkUpdate':
      checkForUpdate(true).then(sendResponse);
      return true; // asynchroon antwoord
    case 'reloadExtension':
      // Laadt de (inmiddels vervangen) bestanden op schijf opnieuw.
      setTimeout(() => chrome.runtime.reload(), 150);
      return false;
  }
  return false;
});
