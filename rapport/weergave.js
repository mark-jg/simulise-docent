/* Rapportweergave in de pagina van Simulise zelf (in plaats van een apart afdrukvenster).
 *
 * SDWeergave.open({ titel, onAfdruk }) neemt de inhoud van de pagina over (#scrollable-page-wrapper,
 * anders #content): de eigen inhoud van Simulise wordt verborgen en komt terug met de knop Terug.
 * Opmaak met de klassen van Simulise (panel, table-index, label, btn, form-control), zodat het rapport
 * eruitziet als een gewone Simulise-pagina en meekleurt met het thema van de extensie.
 * Weergaven: vergader (vergaderlijst met signalen), perioden (meetmomenten naast elkaar), groep (groepsoverzicht),
 * student (per student, met de aanwezigheid uit het bestand van het team als die er is).
 * Excel alleen als export (CSV). Afdrukken via onAfdruk: de A4-versie van rapport/render.js.
 * De gegevens blijven in het geheugen; er wordt niets bewaard behalve de keuzes (rpOpties, zonder namen).
 */
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const langeDatum = (d) => { const [j, m, t] = String(d).slice(0, 10).split('-').map(Number); return `${t} ${MAANDEN[m - 1]} ${j}`; };
  const dag = (d) => (d ? `${String(d).slice(8, 10)}-${String(d).slice(5, 7)}` : '');
  const kort = (naam) => { const t = String(naam).replace(/\s*\([^)]*\)\s*/g, ' ').trim(); return t.length > 26 ? `${t.slice(0, 25)}…` : t; };
  const getoond = (m) => m.opleidingen.filter((o) => !m.opties?.opleidingen || m.opties.opleidingen.includes(o.rol));

  const CSS = `
    .sdw { padding-bottom: 24px; }
    .sdw .sdw-kop { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .sdw .sdw-kop .h4 { margin: 0; font-size: 18px; font-weight: 600; } .sdw .sdw-kop .sdw-ruimte { flex: 1; }
    .sdw .sdw-balk { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
    .sdw .sdw-balk label { font-weight: 400; margin: 0; display: inline-flex; gap: 6px; align-items: center; }
    .sdw .sdw-balk .form-control { display: inline-block; width: auto; height: 30px; padding: 4px 8px; }
    .sdw .sdw-groepje { display: inline-flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .sdw .sdw-sub { color: var(--sim-text-3, #8a93a0); margin: 0; font-size: 12px; }
    .sdw .sdw-melding { padding: 24px; text-align: center; }
    .sdw .table-responsive { border: 0; margin: 0; }
    .sdw table.sdw-matrix { margin: 0; width: auto; min-width: 100%; }
    .sdw table.sdw-matrix th, .sdw table.sdw-matrix td { text-align: center; vertical-align: middle; padding: 4px 6px; white-space: nowrap; }
    .sdw table.sdw-matrix th.sdw-ll { font-weight: 500; font-size: 12px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; border-bottom: 3px solid var(--k, #ccc); }
    .sdw table.sdw-matrix .sdw-per th { font-size: 11px; font-weight: 500; color: var(--sim-text-3, #8a93a0); }
    .sdw table.sdw-matrix .sdw-cat th { color: #fff; font-size: 11px; letter-spacing: .03em; }
    .sdw table.sdw-matrix .sdw-naam { text-align: left; position: sticky; left: 0; z-index: 1; background: var(--sim-surface, #fff); font-weight: 600; }
    .sdw table.sdw-matrix .sdw-rand { border-left: 2px solid var(--sim-border, #e3e6ea); }
    .sdw td.sdw-cel { font-weight: 600; min-width: 30px; }
    .sdw td.sdw-cel small { color: var(--sim-text-3, #8a93a0); font-weight: 400; margin-right: 2px; }
    .sdw td.sdw-cel.op { background: color-mix(in srgb, var(--k) 24%, var(--sim-surface, #fff)); }
    .sdw td.sdw-cel.niet { background: color-mix(in srgb, var(--sim-danger, #c93c3c) 10%, var(--sim-surface, #fff)); }
    .sdw td.sdw-cel.leeg { color: var(--sim-text-3, #b0b6bd); font-weight: 400; }
    .sdw .sdw-legenda { font-size: 12px; color: var(--sim-text-3, #8a93a0); margin: 0; }
    .sdw .sdw-student { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .sdw .sdw-student h3 { margin: 0 8px 0 0; }
    .sdw .sdw-diagram svg { width: 100%; max-width: 460px; display: block; margin: 0 auto; }
    .sdw .sdw-diagram .ringnr { font-size: 9px; fill: var(--sim-text-3, #8a93a0); } .sdw .sdw-diagram .doellabel { font-size: 11px; font-weight: 700; }
    .sdw .sdw-diagram .lllabel { font-size: 12.5px; fill: currentColor; } .sdw .sdw-diagram .catlabel { font-size: 12px; fill: #fff; font-weight: 600; }
    .sdw .sdw-bol { display: inline-block; width: 11px; height: 11px; border-radius: 50%; border: 1px solid var(--sim-border, #c4cad1); margin-right: 2px; vertical-align: middle; }
    .sdw .sdw-bol.vol { border-color: transparent; } .sdw .sdw-bol.stip { border: 1.5px dashed #8e44e8; }
    .sdw .sdw-kleur { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: middle; }
    .sdw table.sdw-lijnen td { vertical-align: middle; } .sdw table.sdw-lijnen small { display: block; color: var(--sim-text-3, #8a93a0); }
    .sdw .sdw-normen li { margin-bottom: 4px; } .sdw .sdw-normen .fa { width: 16px; }
    .sdw .sdw-ok { color: var(--sim-success, #1f9d55); } .sdw .sdw-nee { color: var(--sim-danger, #c93c3c); }
    .sdw a.sdw-link { cursor: pointer; }
    .sdw .sdw-regels { margin: 6px 0 0; padding-left: 18px; font-size: 13px; color: var(--sim-text-2, #5b6470); }
    .sdw .sdw-tellers { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .sdw .sdw-teller { display: inline-flex; align-items: baseline; gap: 6px; padding: 5px 12px; border-radius: 999px; background: var(--sim-surface-2, #eef0f3); font-size: 13px; }
    .sdw .sdw-teller b { font-size: 15px; font-variant-numeric: tabular-nums; }
    .sdw .sdw-teller.onder { background: color-mix(in srgb, var(--sim-danger, #c93c3c) 14%, var(--sim-surface, #fff)); }
    .sdw .sdw-teller.bespreek { background: color-mix(in srgb, var(--sim-warn, #b06a00) 16%, var(--sim-surface, #fff)); }
    .sdw .sdw-teller.ok { background: color-mix(in srgb, var(--sim-success, #2f9e6e) 14%, var(--sim-surface, #fff)); }
    .sdw table.sdw-vergader { margin: 0; }
    .sdw table.sdw-vergader th, .sdw table.sdw-vergader td { vertical-align: middle; padding: 7px 10px; }
    .sdw table.sdw-vergader th { font-size: 12px; font-weight: 600; color: var(--sim-text-2, #5b6470); white-space: nowrap; }
    .sdw table.sdw-vergader td.sdw-getal, .sdw table.sdw-vergader th.sdw-getal { text-align: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .sdw table.sdw-vergader td.sdw-naam { font-weight: 600; white-space: nowrap; box-shadow: inset 4px 0 0 transparent; }
    .sdw table.sdw-vergader tr.sig-onder td.sdw-naam { box-shadow: inset 4px 0 0 var(--sim-danger, #c93c3c); }
    .sdw table.sdw-vergader tr.sig-bespreek td.sdw-naam { box-shadow: inset 4px 0 0 var(--sim-warn, #e0a100); }
    .sdw table.sdw-vergader tr.sdw-groepkop th { background: var(--sim-surface-2, #eef0f3); color: var(--sim-text, #1e2328); font-size: 13px; padding: 6px 10px; }
    .sdw table.sdw-vergader td.sdw-waarom { color: var(--sim-text-2, #5b6470); font-size: 13px; min-width: 220px; }
    .sdw table.sdw-vergader td.sdw-laag { color: var(--sim-danger, #c93c3c); font-weight: 600; }
    .sdw .sdw-aanwezig { display: flex; flex-wrap: wrap; gap: 6px 22px; align-items: baseline; }
    .sdw .sdw-aanwezig b { font-size: 20px; font-variant-numeric: tabular-nums; } .sdw .sdw-aanwezig b.sdw-laag { color: var(--sim-danger, #c93c3c); }
  `;

  function stijl() {
    if (document.getElementById('sdw-css')) return;
    const s = document.createElement('style'); s.id = 'sdw-css'; s.textContent = CSS;
    (document.head || document.documentElement).append(s);
  }

  const koersLabel = (m) => (m.opKoers == null ? '<span class="label label-default">geen norm</span>'
    : m.opKoers ? `<span class="label label-success">Op koers${m.toets ? ` ${esc(m.toets.code)}` : ''}</span>` : `<span class="label label-danger">Niet op koers${m.toets ? ` ${esc(m.toets.code)}` : ''}</span>`);
  const statusLabel = (l) => {
    const k = { boven: 'label-info', ok: 'label-success', niet: 'label-warning', leeg: 'label-default' }[l.soort] || 'label-default';
    return `<span class="label ${k}">${l.soort === 'boven' ? '★ ' : ''}${esc(l.status)}</span>`;
  };
  const bolletjes = (l, max) => Array.from({ length: max }, (_, k) => {
    const s = k + 1;
    if (s <= l.stap) return `<span class="sdw-bol vol" style="background:${esc(l.kleur)}"></span>`;
    if (s === l.stap + 1 && l.beoordeeldNiet) return `<span class="sdw-bol stip" style="border-color:${esc(l.kleur)}"></span>`;
    return '<span class="sdw-bol"></span>';
  }).join('');

  function rollenVan(ms, profiel) {
    const rollen = [];
    for (const m of ms) for (const o of getoond(m)) if (!rollen.some((r) => r.rol === o.rol)) rollen.push({ rol: o.rol, conf: o.conf, naam: o.naam });
    const volg = (r) => { const i = (profiel.opleidingen || []).findIndex((x) => x.rol === r.rol); return i < 0 ? 99 : i; };
    return rollen.sort((a, b) => volg(a) - volg(b));
  }
  const catKop = (voorbeeld, breedte, extra) => (voorbeeld.cats
    ? `<tr class="sdw-cat"><th class="sdw-naam"></th>${voorbeeld.cats.filter((c) => c.aantal).map((c) => `<th colspan="${c.aantal * breedte}" style="background:${esc(c.kleur)}">${esc(c.naam)}</th>`).join('')}<th colspan="${extra}"></th></tr>` : '');
  const naamCel = (m) => `<td class="sdw-naam"><a class="sdw-link" data-student="${m.g.__idx}">${esc(m.g.student.naam)}</a></td>`;

  /* Meetmomenten naast elkaar: per leerlijn een kolom per periode. */
  function perioden(ms, profiel) {
    const datum = ms[0].datum;
    let ps = (profiel.perioden || []).filter((p) => p.van <= datum);
    if (!ps.length) ps = (profiel.perioden || []).slice(0, 1);
    const stapIn = (l, p) => (p.tot >= datum || !Array.isArray(l.historie) ? l.stap : SDRapport.stapOp(l, p.tot));
    return rollenVan(ms, profiel).map((r) => {
      const voorbeeld = ms.map((m) => m.opleidingen.find((o) => o.rol === r.rol)).find(Boolean);
      const doelVan = (p) => (voorbeeld.cats ? null : p.doel?.[r.rol] ?? null);
      const kol = voorbeeld.lijnen;
      const rijen = ms.map((m) => {
        const o = m.opleidingen.find((x) => x.rol === r.rol);
        const cellen = kol.map((k, ki) => {
          const l = o?.lijnen.find((x) => norm(x.naam) === norm(k.naam));
          return ps.map((p, pi) => {
            const rand = pi === 0 && ki > 0 ? ' sdw-rand' : '';
            if (!l) return `<td class="sdw-cel leeg${rand}">–</td>`;
            const s = stapIn(l, p), doel = doelVan(p);
            const klas = doel != null ? (s >= doel ? 'op' : s > 0 || l.beoordeeldNiet ? 'niet' : 'leeg') : (s > 0 ? 'op' : 'leeg');
            const ster = p.tot >= datum && l.soort === 'boven' ? '<sup>★</sup>' : '';
            return `<td class="sdw-cel ${klas}${rand}" style="--k:${esc(l.kleur)}" title="${esc(`${l.naam}, ${p.code}: stap ${s}${doel != null ? ` (doel ${doel})` : ''}`)}">${s}${ster}</td>`;
          }).join('');
        }).join('');
        return `<tr>${naamCel(m)}${cellen}<td>${koersLabel(m)}</td></tr>`;
      }).join('');
      const doelen = ps.map((p) => (doelVan(p) != null ? `${esc(p.code)}: stap ${doelVan(p)}` : null)).filter(Boolean).join(', ');
      return `<section class="panel panel-default"><header class="panel-heading"><strong>${esc(r.conf.titel || r.naam)}</strong> <span class="text-muted">· ${esc(r.naam)}</span>
          <p class="sdw-sub">Behaalde stap aan het eind van ${ps.map((p) => esc(p.code)).join(', ')}${doelen ? ` · doelen ${doelen}` : ''}</p></header>
        <div class="table-responsive"><table class="table table-index table-bordered sdw-matrix">
          <thead>${catKop(voorbeeld, ps.length, 1)}
            <tr><th class="sdw-naam" rowspan="2">Student</th>${kol.map((k, ki) => `<th class="sdw-ll${ki ? ' sdw-rand' : ''}" colspan="${ps.length}" style="--k:${esc(k.kleur)}" title="${esc(k.naam)}">${esc(kort(k.naam))}</th>`).join('')}<th rowspan="2">Norm</th></tr>
            <tr class="sdw-per">${kol.map((k, ki) => ps.map((p, pi) => `<th class="${pi === 0 && ki > 0 ? 'sdw-rand' : ''}">${esc(p.code)}</th>`).join('')).join('')}</tr></thead>
          <tbody>${rijen}</tbody></table></div></section>`;
    }).join('') + `<p class="sdw-legenda">Cijfer: behaalde stap aan het eind van de periode (lopende periode: op de peildatum). Gekleurd: doelstap van die periode gehaald, roze: beoordeeld maar doel nog niet gehaald. ★ boven verwachting. Klik op een naam voor de student.</p>`;
  }

  /* Groepsoverzicht: de stand op de peildatum, met de stand bij de vergelijkingsperiode. */
  function groep(ms, profiel) {
    return rollenVan(ms, profiel).map((r) => {
      const voorbeeld = ms.map((m) => m.opleidingen.find((o) => o.rol === r.rol)).find(Boolean);
      const kol = voorbeeld.lijnen;
      const rijen = ms.map((m) => {
        const o = m.opleidingen.find((x) => x.rol === r.rol);
        const cellen = kol.map((k) => {
          const l = o?.lijnen.find((x) => norm(x.naam) === norm(k.naam));
          if (!l) return '<td class="sdw-cel leeg">–</td>';
          const vorig = l.vorigeStap != null && l.vorigeStap !== l.stap ? `<small>${l.vorigeStap}→</small>` : '';
          const teken = l.soort === 'boven' ? '<sup>★</sup>' : l.beoordeeldNiet ? '<sup>◌</sup>' : '';
          return `<td class="sdw-cel ${l.stap >= (o.doel || 1) ? 'op' : l.soort}" style="--k:${esc(l.kleur)}" title="${esc(`${l.naam}: ${l.status}`)}">${vorig}${l.stap}${teken}</td>`;
        }).join('');
        return `<tr>${naamCel(m)}${cellen}<td>${koersLabel(m)}</td></tr>`;
      }).join('');
      const e = ms[0];
      return `<section class="panel panel-default"><header class="panel-heading"><strong>${esc(r.conf.titel || r.naam)}</strong> <span class="text-muted">· ${esc(r.naam)}</span>
          <p class="sdw-sub">Stand op ${langeDatum(e.datum)}${e.periode ? ` · doel ${esc(e.periode.code)}: stap ${voorbeeld.doel}` : ''}${e.vorige ? ` · klein cijfer: stand bij ${esc(e.vorige.code)}` : ''}</p></header>
        <div class="table-responsive"><table class="table table-index table-bordered sdw-matrix">
          <thead>${catKop(voorbeeld, 1, 1)}<tr><th class="sdw-naam">Student</th>${kol.map((k) => `<th class="sdw-ll" style="--k:${esc(k.kleur)}" title="${esc(k.naam)}">${esc(kort(k.naam))}</th>`).join('')}<th>Norm</th></tr></thead>
          <tbody>${rijen}</tbody></table></div></section>`;
    }).join('') + '<p class="sdw-legenda">Cijfer: behaalde stap. Gekleurd: doelstap gehaald. ★ boven verwachting · ◌ beoordeeld, volgende stap nog niet behaald. Klik op een naam voor de student.</p>';
  }

  /* Vergaderlijst: één rij per student, gegroepeerd op signaal (onder de norm, bespreken, op koers), met de stand
   * per opleiding, de aanwezigheid (als die er is) en waarom iemand op de lijst staat. */
  const signaalLabel = (m) => `<span class="label ${{ onder: 'label-danger', bespreek: 'label-warning', ok: 'label-success' }[m.signaal.niveau] || 'label-default'}">${esc(m.signaal.tekst)}</span>`;
  function vergader(ms, profiel, alle) {
    const rollen = rollenVan(ms.length ? ms : alle, profiel);
    const metAanw = alle.some((m) => m.aanwezig);
    const grens = profiel.aanwezigheid?.grens === null ? null : Number(profiel.aanwezigheid?.grens ?? 80);
    const e = alle[0];
    const tel = (n) => alle.filter((m) => m.signaal.niveau === n).length;
    const kolommen = 2 + rollen.length + (metAanw ? 3 : 0) + 1;
    const rij = (m) => `<tr class="sig-${m.signaal.niveau}">${naamCel(m)}<td>${signaalLabel(m)}</td>
      ${rollen.map((r) => { const o = m.opleidingen.find((x) => x.rol === r.rol); if (!o) return '<td class="sdw-getal">–</td>'; const st = SDRapport.stand(o); return `<td class="sdw-getal" title="${st.n} van de ${st.van} ${esc(st.wat)}">${st.n}/${st.van}</td>`; }).join('')}
      ${metAanw ? `<td class="sdw-getal${m.aanwezig?.pct != null && grens != null && m.aanwezig.pct < grens ? ' sdw-laag' : ''}">${m.aanwezig?.pct != null ? SDRapport.procent(m.aanwezig.pct) : '–'}</td><td class="sdw-getal">${m.aanwezig?.ongeoorloofd ?? '–'}</td><td class="sdw-getal">${m.aanwezig?.teLaat ?? '–'}</td>` : ''}
      <td class="sdw-waarom">${esc(m.signaal.redenen.join('; '))}${m.aanwezig?.opmerking ? `${m.signaal.redenen.length ? '; ' : ''}<em>${esc(m.aanwezig.opmerking)}</em>` : ''}</td></tr>`;
    const groepen = ['onder', 'bespreek', 'ok', 'geen'].map((n) => [n, ms.filter((m) => m.signaal.niveau === n)]).filter(([, l]) => l.length);
    const norm = e.toets ? `<p class="m-b-none"><strong>${esc(e.toets.normNaam || `Norm ${e.toets.code}`)}</strong> · ${esc(e.toets.code)} ${esc(e.toets.moment || '')}: ${esc(e.toets.norm || '')}</p>
        ${SDRapport.regelTekst(profiel, e.toets).length ? `<ul class="sdw-regels">${SDRapport.regelTekst(profiel, e.toets).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="sdw-sub">Bij deze module staan geen eisen; niemand krijgt dan een oordeel. Stel ze in via het zijpaneel van de extensie (Fases, modules en normen).</p>'}` : '<p class="m-b-none text-muted">Voor deze module staat geen norm in het toetsplan.</p>';
    return `<section class="panel panel-default"><div class="panel-body">${norm}
        <p class="sdw-sub">Stand op ${langeDatum(e.datum)}${metAanw && grens != null ? ` · aanwezigheid onder ${grens}% is een bespreekpunt` : ''}${metAanw ? ` · aanwezigheid bekend van ${alle.filter((m) => m.aanwezig).length} van de ${alle.length} studenten` : ''}</p>
        <div class="sdw-tellers"><span class="sdw-teller onder"><b>${tel('onder')}</b> onder de norm</span><span class="sdw-teller bespreek"><b>${tel('bespreek')}</b> bespreken</span><span class="sdw-teller ok"><b>${tel('ok')}</b> op koers</span>${tel('geen') ? `<span class="sdw-teller"><b>${tel('geen')}</b> zonder norm</span>` : ''}</div></div>
      <div class="table-responsive"><table class="table table-index sdw-vergader"><thead><tr><th>Student</th><th>Signaal</th>${rollen.map((r) => `<th class="sdw-getal" title="${esc(r.naam)}">${esc(r.conf.titel || r.naam)}</th>`).join('')}
        ${metAanw ? '<th class="sdw-getal">Aanwezig</th><th class="sdw-getal">Ongeoorloofd</th><th class="sdw-getal">Te laat</th>' : ''}<th>Waarom</th></tr></thead>
        <tbody>${groepen.map(([n, l]) => `<tr class="sdw-groepkop"><th colspan="${kolommen}">${esc(SDRapport.NIVEAUS[n])} (${l.length})</th></tr>${l.map(rij).join('')}`).join('')}</tbody></table></div></section>
      <p class="sdw-legenda">Bespreken: precies op de norm, een leerlijn die meetelt is nog niet beoordeeld, of de aanwezigheid ligt onder de grens. In te stellen in het toetsplan (Rapportprofielen). Klik op een naam voor de student.</p>`;
  }

  /* Per student: diagram en leerlijnen per opleiding, normen en gespreksadvies. */
  function student(m, profiel, opties, lijst) {
    const w = { ...(profiel.weergave || {}), ...(opties.nadruk != null ? { nadrukDoelstap: !!opties.nadruk } : {}) };
    const i = lijst.indexOf(m);
    const nav = lijst.length > 1 ? `<span class="btn-group">
        <button type="button" class="btn btn-default btn-sm" data-stap="-1"${i <= 0 ? ' disabled' : ''} title="Vorige student"><i class="fa fa-fw fa-chevron-left"></i></button>
        <button type="button" class="btn btn-default btn-sm" data-stap="1"${i >= lijst.length - 1 ? ' disabled' : ''} title="Volgende student"><i class="fa fa-fw fa-chevron-right"></i></button></span>
        <select class="form-control input-sm" data-kies-student style="width:auto;display:inline-block">${lijst.map((x) => `<option value="${x.g.__idx}"${x === m ? ' selected' : ''}>${esc(x.g.student.naam)}</option>`).join('')}</select>
        <span class="text-muted">${i + 1} van ${lijst.length}</span>` : '';
    const kop = `<section class="panel panel-default"><div class="panel-body sdw-student">
        <h3 class="font-thin">${esc(m.g.student.naam)}</h3>${m.g.student.groep ? `<span class="label label-default">${esc(m.g.student.groep)}</span>` : ''}
        ${koersLabel(m)}<span class="text-muted">${m.periode ? `${esc(m.periode.code)} ${esc(m.periode.naam || '')} · ` : ''}stand op ${langeDatum(m.datum)}</span>
        <span class="sdw-ruimte" style="flex:1"></span>${nav}</div></section>`;
    const opl = getoond(m).map((o, oi) => {
      const max = o.maxStap;
      const rij = (l) => `<tr><td><span class="sdw-kleur" style="background:${esc(l.kleur)}"></span></td>
        <td>${esc(l.naam)}${l.omschrijving ? `<small>${esc(l.omschrijving)}</small>` : ''}</td>
        <td style="white-space:nowrap">${bolletjes(l, max)}</td><td style="white-space:nowrap">stap ${l.stap}/${max}${l.vorigeStap != null && l.vorigeStap !== l.stap ? `<small>was ${l.vorigeStap} bij ${esc(m.vorige?.code || '')}</small>` : ''}</td>
        <td>${statusLabel(l)}</td><td class="text-muted" style="white-space:nowrap">${dag(l.datum)}</td></tr>`;
      let body;
      if (o.cats) {
        body = o.cats.filter((c) => c.aantal).map((c) => `<tr class="active"><th colspan="4"><span class="sdw-kleur" style="background:${esc(c.kleur)}"></span> ${esc(c.naam)}</th><th colspan="2" class="text-muted" style="font-weight:400">${c.behaald} van ${c.aantal} behaald${c.actief ? '' : ' · nog niet beoordeeld'}</th></tr>${o.lijnen.filter((l) => l.cat === c.naam).map(rij).join('')}`).join('')
          + o.lijnen.filter((l) => !l.cat).map(rij).join('');
      } else body = o.lijnen.map(rij).join('');
      const opDoel = o.lijnen.filter((l) => l.stap >= o.doel).length;
      return `<section class="panel panel-default"><header class="panel-heading"><strong>${esc(o.conf.titel || o.naam)}</strong> <span class="text-muted">· ${esc(o.naam)}</span>
          ${o.cats ? '' : `<span class="pull-right text-muted">${opDoel} van ${o.lijnen.length} op doelstap ${o.doel}</span>`}</header>
        <div class="panel-body"><div class="row">
          <div class="col-md-5 sdw-diagram">${SDRapport.diagram(o, w, `sdw-${m.g.__idx}-${oi}`)}</div>
          <div class="col-md-7"><table class="table table-condensed sdw-lijnen m-b-none"><tbody>${body}</tbody></table></div>
        </div></div></section>`;
    }).join('');
    const normen = m.toets ? `<section class="panel panel-default"><header class="panel-heading"><strong>${esc(m.toets.normNaam || `Norm ${m.toets.code}`)}</strong> <span class="text-muted">· ${esc(m.toets.code)} ${esc(m.toets.moment || '')}</span></header>
        <div class="panel-body"><p>${esc(m.toets.norm || '')}</p><ul class="list-unstyled sdw-normen m-b-none">${m.uitslagen.map((u) => `<li><i class="fa ${u.ok ? 'fa-check sdw-ok' : 'fa-times sdw-nee'}"></i> ${esc(u.tekst)}</li>`).join('')}</ul></div></section>` : '';
    const advies = m.advies ? `<section class="panel panel-default"><header class="panel-heading"><strong>Om te bespreken</strong></header><div class="panel-body">${esc(m.advies)}</div></section>` : '';
    const a = m.aanwezig, grens = profiel.aanwezigheid?.grens === null ? null : Number(profiel.aanwezigheid?.grens ?? 80);
    const aanw = a ? `<section class="panel panel-default sdw-aanwezigheid"><header class="panel-heading"><strong>Aanwezigheid</strong> <span class="text-muted">· uit het bestand van het team</span></header>
        <div class="panel-body sdw-aanwezig">${a.pct != null ? `<span><b class="${grens != null && a.pct < grens ? 'sdw-laag' : ''}">${SDRapport.procent(a.pct)}</b> aanwezig${grens != null ? ` <span class="text-muted">(grens ${grens}%)</span>` : ''}</span>` : ''}
          ${a.ongeoorloofd != null ? `<span><b>${esc(a.ongeoorloofd)}</b> ongeoorloofd</span>` : ''}${a.geoorloofd != null ? `<span><b>${esc(a.geoorloofd)}</b> geoorloofd</span>` : ''}${a.teLaat != null ? `<span><b>${esc(a.teLaat)}</b> te laat</span>` : ''}
          ${a.opmerking ? `<span class="text-muted">${esc(a.opmerking)}</span>` : ''}</div></section>` : '';
    const signaal = m.signaal.redenen.length && m.signaal.niveau === 'bespreek' ? `<section class="panel panel-default"><header class="panel-heading"><strong>Bespreken in de vergadering</strong></header><div class="panel-body">${esc(m.signaal.redenen.join('; '))}</div></section>` : '';
    return kop + opl + `<div class="row"><div class="col-md-6">${normen}${aanw}</div><div class="col-md-6">${signaal}${advies}</div></div>`;
  }

  function open({ titel, onAfdruk }) {
    stijl();
    document.querySelector('.sdw')?.__sluit?.();
    const plek = document.querySelector('#scrollable-page-wrapper') || document.querySelector('#content') || document.body;
    const verborgen = [...plek.children].filter((c) => c.style.display !== 'none');
    for (const c of verborgen) { c.dataset.sdwDisplay = c.style.display; c.style.display = 'none'; }
    const root = document.createElement('div');
    root.className = 'sdw';
    root.innerHTML = `<section class="panel panel-default"><header class="panel-heading sdw-kop">
        <button type="button" class="btn btn-default btn-sm" data-terug><i class="fa fa-fw fa-arrow-left"></i> Terug</button>
        <span class="h4">${esc(titel)}</span><span class="text-muted" data-info></span><span class="sdw-ruimte"></span><span data-acties class="sdw-groepje"></span></header>
      <div class="panel-body sdw-balk" data-balk hidden></div></section><div data-inhoud><section class="panel panel-default"><div class="panel-body sdw-melding"><i class="fa fa-spinner fa-spin"></i> <span data-voortgang>Gegevens ophalen uit Simulise…</span></div></section></div>`;
    plek.prepend(root);
    plek.scrollTop = 0; window.scrollTo?.(0, 0);
    const $ = (s) => root.querySelector(s);
    const V = {
      inPagina: true, closed: false, root,
      voortgang(t) { const p = $('[data-voortgang]'); if (p) p.textContent = t; },
      fout(t) { $('[data-inhoud]').innerHTML = `<section class="panel panel-default"><div class="panel-body sdw-melding"><i class="fa fa-exclamation-triangle text-warning"></i> Het rapport kon niet worden gemaakt: ${esc(t)}</div></section>`; },
      sluit() {
        if (V.closed) return;
        V.closed = true; root.remove();
        for (const c of verborgen) { c.style.display = c.dataset.sdwDisplay || ''; delete c.dataset.sdwDisplay; }
      },
      toon: (...a) => toon(V, ...a),
    };
    root.__sluit = V.sluit;
    $('[data-terug]').onclick = V.sluit;
    V.onAfdruk = onAfdruk;
    return V;
  }

  async function toon(V, studenten, profiel, fouten = [], startSoort = null) {
    if (V.closed) return;
    const $ = (s) => V.root.querySelector(s);
    const isGroep = studenten.length > 1;
    studenten.forEach((g, i) => { g.__idx = i; });
    const bewaard = (await chrome.storage.local.get({ rpOpties: {} })).rpOpties || {};
    const vandaag = new Date().toISOString().slice(0, 10);
    const sleutel = isGroep ? 'webSoortGroep' : 'webSoortStudent';
    const opties = {
      soort: startSoort || bewaard[sleutel] || (isGroep ? 'perioden' : 'student'),
      peildatum: vandaag, vergelijkMet: bewaard.vergelijkMet || 'vorige', opleidingen: null,
      nadruk: bewaard.nadruk ?? null, sorteer: bewaard.sorteer || 'naam', filter: 'alle',
    };
    let huidig = 0; // index (g.__idx) van de student in de weergave Per student
    const bewaar = () => chrome.storage.local.set({ rpOpties: { ...bewaard, [sleutel]: opties.soort, vergelijkMet: opties.vergelijkMet, nadruk: opties.nadruk, sorteer: opties.sorteer } });

    const balk = $('[data-balk]'), inhoud = $('[data-inhoud]'), acties = $('[data-acties]');
    balk.hidden = false;
    const el = (tag, props = {}, kinderen = []) => { const x = Object.assign(document.createElement(tag), props); x.append(...kinderen); return x; };
    const keuze = (waarden, nu, bij) => {
      const s = el('select', { className: 'form-control input-sm' });
      for (const [v, t] of waarden) s.append(el('option', { value: v, textContent: t, selected: v === nu }));
      s.onchange = () => { bij(s.value); bewaar(); teken(); };
      return s;
    };
    const vink = (tekst, aan, bij) => { const c = el('input', { type: 'checkbox', checked: aan }); c.onchange = () => { bij(c.checked); bewaar(); teken(); }; return el('label', {}, [c, tekst]); };

    const rollen = [];
    for (const g of studenten) for (const o of g.opleidingen) { const c = SDRapport.rolVan(o.naam, profiel); const rol = c?.rol || o.naam.toLowerCase(); if (!rollen.some((x) => x.rol === rol)) rollen.push({ rol, titel: c?.titel || o.naam }); }
    const gekozen = new Set(rollen.map((x) => x.rol));
    const soorten = [...(isGroep ? [['vergader', 'Vergaderlijst']] : []), ['perioden', 'Meetmomenten naast elkaar'], ...(isGroep ? [['groep', 'Groepsoverzicht']] : []), ['student', isGroep ? 'Per student' : 'Voortgang']];
    if (!soorten.some(([v]) => v === opties.soort)) opties.soort = isGroep ? 'perioden' : 'student';
    const soortKeuze = keuze(soorten, opties.soort, (v) => { opties.soort = v; });
    const datum = el('input', { type: 'date', className: 'form-control input-sm', value: opties.peildatum, max: vandaag });
    datum.onchange = () => { opties.peildatum = datum.value || vandaag; teken(); };
    const groepKeuzes = el('span', { className: 'sdw-groepje' }, [
      el('span', { textContent: 'Sorteer' }), keuze([['naam', 'op naam'], ['aandacht', 'aandacht eerst']], opties.sorteer, (v) => { opties.sorteer = v; }),
      vink('alleen niet op koers', false, (v) => { opties.filter = v ? 'nietOpKoers' : 'alle'; }),
    ]);
    let alleenSignaal = false;
    const signaalVink = vink('alleen bespreekgevallen', false, (v) => { alleenSignaal = v; });
    signaalVink.classList.add('sdw-alleen-signaal');
    // Norm en datum staan los van elkaar: "Norm" kiest aan welke module wordt getoetst, "Stand op" op welke dag je kijkt.
    // De knop zet de datum op het meetmoment van de gekozen norm (veld meetdatum van de module, anders haar laatste dag).
    const meetmoment = (code) => { const p = (profiel.perioden || []).find((x) => x.code === code); const d = p ? (p.meetdatum || p.tot) : vandaag; return d < vandaag ? d : vandaag; };
    const normKeuze = keuze([['', 'eerstvolgende besluit (automatisch)'], ...(profiel.perioden || []).map((p) => [p.code, `${p.code}${p.normNaam ? ` · ${p.normNaam}` : p.naam ? ` · ${p.naam}` : ''}`])], '', (v) => { opties.toets = v || null; });
    const naarMeet = el('button', { type: 'button', className: 'btn btn-default btn-sm sdw-meetmoment', textContent: 'Zet op meetmoment', title: 'Zet de datum op het meetmoment van de gekozen norm' });
    naarMeet.onclick = () => { const code = opties.toets || zichtbaar()[0]?.toets?.code; if (!code) return; opties.peildatum = meetmoment(code); datum.value = opties.peildatum; teken(); };
    const normGroep = el('span', { className: 'sdw-groepje sdw-norm' }, [el('span', { textContent: 'Norm' }), normKeuze]);
    const nadrukVink = vink('doelstap groot', opties.nadruk ?? (profiel.weergave?.nadrukDoelstap !== false), (v) => { opties.nadruk = v; });
    balk.append(
      el('span', { className: 'sdw-groepje' }, [el('span', { textContent: 'Weergave' }), soortKeuze]),
      normGroep,
      el('span', { className: 'sdw-groepje' }, [el('span', { textContent: 'Stand op' }), datum, naarMeet]),
      el('span', { className: 'sdw-groepje' }, [el('span', { textContent: 'Vergelijk met' }), keuze([['vorige', 'vorige periode'], ['geen', 'niets'], ...(profiel.perioden || []).map((p) => [p.code, p.code])], opties.vergelijkMet, (v) => { opties.vergelijkMet = v; })]),
      el('span', { className: 'sdw-groepje' }, rollen.length > 1 ? rollen.map((x) => vink(x.titel, true, (v) => { v ? gekozen.add(x.rol) : gekozen.delete(x.rol); opties.opleidingen = [...gekozen]; })) : []),
      nadrukVink, groepKeuzes, signaalVink,
    );

    // Acties rechtsboven: Excel (alleen export) en afdrukken (A4-versie).
    const knop = (tekst, icoon, bij, titel) => { const b = el('button', { type: 'button', className: 'btn btn-default btn-sm', title: titel || '' }, [el('i', { className: `fa fa-fw ${icoon}` }), ` ${tekst}`]); b.onclick = bij; return b; };
    const excel = knop('Excel', 'fa-file-excel', () => {
      const soort = opties.soort === 'perioden' || opties.soort === 'vergader' ? opties.soort : 'groep';
      const blob = new Blob(['﻿' + SDRapport.csv(studenten, profiel, { ...opties, soort })], { type: 'text/csv;charset=utf-8' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `${($('.sdw-kop .h4').textContent || 'rapport').replace(/[^\w-]+/g, '-').replace(/-+$/, '')}-${opties.peildatum}.csv` });
      document.body.append(a); a.click(); a.remove();
    }, 'Exporteren als CSV voor Excel');
    excel.className += ' sdw-excel';
    const afdruk = (soort, alleen) => () => {
      const lijst = alleen ? studenten.filter((g) => g.__idx === huidig) : studenten;
      V.onAfdruk?.(lijst, soort);
    };
    const afdrukKnoppen = el('span', { className: 'btn-group' });
    const afdrukLijst = el('ul', { className: 'dropdown-menu dropdown-menu-right' });
    const item = (tekst, bij) => { const a = el('a', { href: '#', textContent: tekst }); a.onclick = (e) => { e.preventDefault(); afdrukLijst.parentElement.classList.remove('open'); bij(); }; return el('li', {}, [a]); };
    const afdrukKnop = knop('Afdrukken', 'fa-print', (e) => { e.stopPropagation(); afdrukKnoppen.classList.toggle('open'); }, 'Afdrukversie (A4) of opslaan als PDF');
    afdrukKnop.className += ' dropdown-toggle sdw-afdruk';
    afdrukKnoppen.append(afdrukKnop, afdrukLijst);
    document.addEventListener('click', () => afdrukKnoppen.classList.remove('open'));
    const vulAfdruk = () => {
      afdrukLijst.replaceChildren();
      if (opties.soort === 'student') {
        afdrukLijst.append(item('Voortgangsrapport van deze student', afdruk('student', true)), item('Gespreksformulier van deze student', afdruk('gesprek', true)));
        if (isGroep) afdrukLijst.append(el('li', { className: 'divider' }), item('Voortgangsrapporten van alle studenten', afdruk('student')), item('Gespreksformulieren van alle studenten', afdruk('gesprek')));
      } else {
        afdrukLijst.append(item({ perioden: 'Meetmomenten naast elkaar', vergader: 'Vergaderlijst' }[opties.soort] || 'Groepsoverzicht', afdruk(opties.soort)),
          el('li', { className: 'divider' }), item('Voortgangsrapporten van alle studenten', afdruk('student')), item('Gespreksformulieren van alle studenten', afdruk('gesprek')));
      }
    };
    acties.append(excel, afdrukKnoppen);

    inhoud.onclick = (e) => {
      const a = e.target.closest('[data-student]');
      if (a) { e.preventDefault(); huidig = Number(a.dataset.student); opties.soort = 'student'; soortKeuze.value = 'student'; teken(); V.root.scrollIntoView?.({ block: 'start' }); return; }
      const s = e.target.closest('[data-stap]');
      if (s) { const lijst = zichtbaar(); const i = lijst.findIndex((m) => m.g.__idx === huidig); const n = lijst[i + Number(s.dataset.stap)]; if (n) { huidig = n.g.__idx; teken(); } }
    };
    inhoud.onchange = (e) => { if (e.target.matches('[data-kies-student]')) { huidig = Number(e.target.value); teken(); } };

    let zichtbaarCache = [];
    const zichtbaar = () => zichtbaarCache;
    const teken = () => {
      const vergaderNu = opties.soort === 'vergader';
      const ms = SDRapport.modellen(studenten, profiel, vergaderNu ? { ...opties, filter: alleenSignaal ? 'signaal' : 'alle' } : opties);
      zichtbaarCache = ms;
      groepKeuzes.hidden = !isGroep || vergaderNu;
      normGroep.hidden = !(profiel.perioden || []).length; naarMeet.hidden = normGroep.hidden;
      signaalVink.hidden = !vergaderNu;
      nadrukVink.hidden = opties.soort !== 'student';
      excel.hidden = !isGroep && opties.soort === 'student';
      vulAfdruk();
      const info = $('[data-info]');
      info.textContent = `${isGroep ? `· ${ms.length} van ${studenten.length} studenten` : ''}${fouten.length ? ` · ${fouten.length} zonder diagram` : ''}${(V.noten || []).map((n) => ` · ${n}`).join('')}`;
      info.title = fouten.length ? [...fouten.reduce((m, f) => m.set(f, (m.get(f) || 0) + 1), new Map())].map(([f, n]) => `${n}× ${f}`).join('\n') : '';
      if (!ms.length) { inhoud.innerHTML = '<section class="panel panel-default"><div class="panel-body sdw-melding">Geen studenten die aan het filter voldoen.</div></section>'; return; }
      if (opties.soort === 'student') {
        const m = ms.find((x) => x.g.__idx === huidig) || ms[0];
        huidig = m.g.__idx;
        inhoud.innerHTML = student(m, profiel, opties, ms);
      } else if (vergaderNu) inhoud.innerHTML = vergader(ms, profiel, SDRapport.modellen(studenten, profiel, { ...opties, filter: 'alle' }));
      else inhoud.innerHTML = opties.soort === 'groep' ? groep(ms, profiel) : perioden(ms, profiel);
    };
    teken();
  }

  globalThis.SDWeergave = { open };
})();
