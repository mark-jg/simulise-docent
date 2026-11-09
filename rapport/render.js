/* Voortgangsrapport: berekenen en opmaken.
 * SDRapport.bereken(gegevens, profiel) -> model met status, doelstap, normen en advies per opleiding.
 * SDRapport.html(gegevens[], profiel) -> een volledig HTML-document (A4, afdrukbaar), één of meer studenten.
 *
 * Gegevens per student (zie SD_RAPPORT_VOORBEELD in standaard.js):
 *   { student: { naam, groep }, peildatum, opleidingen: [{ naam, maxStap, leerlijnen: [{ naam, kleur?, stap,
 *     bovenVerwachting?, beoordeeldNiet?, omschrijving?, datum?, historie?: [{ datum, stap }] }] }] }
 * Alles wat uit Simulise komt, gaat door esc() voordat het in de HTML komt.
 */
(() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dag = (d) => (d ? `${String(d).slice(8, 10)}-${String(d).slice(5, 7)}` : '');
  const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const langeDatum = (d) => { const [j, m, t] = String(d).slice(0, 10).split('-').map(Number); return `${t} ${MAANDEN[m - 1]} ${j}`; };
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const GRIJS = '#9aa1ab';

  /* ---------- Perioden ---------- */
  function periodeIndex(profiel, datum) {
    const p = profiel.perioden || [];
    let idx = -1;
    p.forEach((x, i) => { if (x.van <= datum) idx = i; });
    return idx < 0 ? 0 : idx;
  }
  /* De norm waar de student nu naartoe werkt: de huidige of eerstvolgende periode met een besluit. */
  function toetsIndex(profiel, datum) {
    const p = profiel.perioden || [];
    const i = p.findIndex((x) => x.beslis && x.tot >= datum);
    return i >= 0 ? i : periodeIndex(profiel, datum);
  }

  function rolVan(opleidingNaam, profiel) {
    for (const o of profiel.opleidingen || []) {
      try { if (new RegExp(o.herken, 'i').test(opleidingNaam)) return o; } catch { if (norm(opleidingNaam).includes(norm(o.herken))) return o; }
    }
    return null;
  }

  /* Stap op een datum, uit de historie (datum waarop een stap behaald werd). */
  function stapOp(ll, datum) {
    if (!Array.isArray(ll.historie)) return null;
    return ll.historie.filter((h) => h.datum && h.datum <= datum).reduce((m, h) => Math.max(m, h.stap), 0);
  }

  /* ---------- Berekenen ---------- */
  function bereken(g, profiel) {
    const datum = g.peildatum;
    const pi = periodeIndex(profiel, datum), periode = profiel.perioden?.[pi] || null;
    const vorige = pi > 0 ? profiel.perioden[pi - 1] : null;
    const ti = toetsIndex(profiel, datum), toets = profiel.perioden?.[ti] || null;
    const opleidingen = (g.opleidingen || []).map((o) => {
      const conf = rolVan(o.naam, profiel) || { rol: norm(o.naam), titel: o.naam, kop: String(o.naam).toUpperCase() };
      const doel = periode?.doel?.[conf.rol] ?? 1;
      const cats = conf.categorieen || null;
      let lijnen = o.leerlijnen.map((ll, i) => {
        const cat = cats ? cats.find((c) => (c.leerlijnen || []).some((n) => norm(n) === norm(ll.naam) || norm(ll.naam).startsWith(norm(n)))) : null;
        const kleur = ll.kleur || cat?.kleur || GRIJS;
        const vorigeStap = vorige && profiel.weergave?.vergelijk !== false ? stapOp(ll, vorige.tot) : null;
        const beoordeeld = ll.stap > 0 || ll.beoordeeldNiet || !!ll.datum;
        let status, soort;
        if (cats) { status = ll.stap > 0 ? 'Behaald' : beoordeeld ? 'Nog niet behaald' : 'Geen beoordeling'; soort = ll.stap > 0 ? 'ok' : beoordeeld ? 'niet' : 'leeg'; }
        else if (ll.stap >= doel) { status = ll.bovenVerwachting ? 'Boven verwachting' : 'Op koers'; soort = ll.bovenVerwachting ? 'boven' : 'ok'; }
        else { status = beoordeeld ? 'Nog niet behaald' : 'Geen beoordeling'; soort = beoordeeld ? 'niet' : 'leeg'; }
        return { ...ll, nr: i + 1, kleur, cat: cat?.naam || null, vorigeStap, status, soort };
      });
      if (cats) { // in de volgorde van de categorieën
        const volg = (ll) => { const ci = cats.findIndex((c) => c.naam === ll.cat); const li = ci >= 0 ? cats[ci].leerlijnen.findIndex((n) => norm(ll.naam).startsWith(norm(n))) : 999; return (ci < 0 ? 99 : ci) * 1000 + li; };
        lijnen = lijnen.slice().sort((a, b) => volg(a) - volg(b));
      }
      const catStand = cats ? cats.map((c) => {
        const ls = lijnen.filter((l) => l.cat === c.naam);
        const actief = !c.beoordeeldVanaf || (profiel.perioden || []).findIndex((p) => p.code === c.beoordeeldVanaf) <= pi;
        return { ...c, aantal: ls.length, behaald: ls.filter((l) => l.stap > 0).length, actief };
      }) : null;
      return { naam: o.naam, conf, rol: conf.rol, maxStap: o.maxStap || Math.max(1, ...lijnen.map((l) => l.stap)), doel, lijnen, cats: catStand };
    });

    const per = (rol) => opleidingen.find((o) => o.rol === rol);
    const regelUitslag = (r) => {
      const o = per(r.rol);
      if (!o) return { ok: false, tekst: `geen diagram voor ${r.rol}`, rol: r.rol };
      if (r.soort === 'categorieen') {
        const pc = r.perCategorie || { minLeerlijnen: 1, stap: 1 };
        const goed = (o.cats || []).filter((c) => o.lijnen.filter((l) => l.cat === c.naam && l.stap >= (pc.stap || 1)).length >= (pc.minLeerlijnen || 1));
        return { ok: goed.length >= r.minAantal, rol: r.rol, tekst: `${goed.length} van de ${(o.cats || []).length} basisvaardigheden voldoende` };
      }
      const op = o.lijnen.filter((l) => l.stap >= r.stap);
      const mist = (r.verplicht || []).filter((n) => !op.some((l) => l.nr === n));
      return {
        ok: op.length >= r.minAantal && !mist.length, rol: r.rol,
        tekst: `${op.length} van de ${o.lijnen.length} ${o.conf.titel?.toLowerCase() || 'leerlijnen'} op stap ${r.stap}`
          + ((r.verplicht || []).length ? (mist.length ? `, maar leerlijn ${lijst(mist)} nog niet` : `, waaronder leerlijn ${lijst(r.verplicht)}`) : ''),
      };
    };
    const uitslagen = (toets?.regels || []).filter((x) => x.telt !== false).map(regelUitslag);
    const opKoers = uitslagen.length ? uitslagen.every((u) => u.ok) : null;

    // Om over te praten met je SLB'er
    const zinnen = [];
    for (const o of opleidingen) {
      if (o.cats) {
        const zonder = o.cats.filter((c) => c.actief && (o.conf.kernvakken || []).includes(c.naam) && c.behaald === 0).map(woord);
        if (zonder.length) zinnen.push(`In BAVA heb je nog geen stap behaald bij ${lijst(zonder)}.`);
        continue;
      }
      const boven = o.lijnen.filter((l) => l.soort === 'boven').map((l) => kaal(l.naam));
      const niet = o.lijnen.filter((l) => l.soort === 'niet').map((l) => kaal(l.naam));
      const leeg = o.lijnen.filter((l) => l.soort === 'leeg').map((l) => kaal(l.naam));
      if (boven.length) zinnen.push(`Je zit boven verwachting bij ${lijst(boven)}.`);
      if (niet.length) zinnen.push(`Stap ${o.doel} is nog niet behaald bij ${lijst(niet)}. Bespreek wat je nodig hebt om die stap te zetten.`);
      if (leeg.length) zinnen.push(`Bij ${lijst(leeg)} is nog geen beoordeling gedaan.`);
    }
    return { g, profiel, datum, periode, vorige, toets, opleidingen, uitslagen, opKoers, advies: zinnen.join(' ') };
  }
  const lijst = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} en ${a[a.length - 1]}`);
  const woord = (c) => c.woord || c.naam.replace(/^./, (x) => x.toLowerCase());
  const kaal = (naam) => String(naam).replace(/^\d+\.\s*/, '').replace(/^./, (c) => c.toLowerCase());

  /* ---------- Diagram ---------- */
  function diagram(o, weergave, idBasis) {
    const N = o.lijnen.length, max = o.maxStap, cats = o.cats;
    const S = cats ? 620 : 620, c = S / 2, R = cats ? 175 : 180;
    const nadruk = weergave.nadrukDoelstap !== false;
    const factor = Number(weergave.nadrukFactor) || 1.9;
    const accent = weergave.accent || '#e6007e';
    const gewicht = (k) => (nadruk && k === o.doel ? factor : 1);
    const totaal = Array.from({ length: max }, (_, k) => gewicht(k + 1)).reduce((a, b) => a + b, 0);
    const r = (k) => { let s = 0; for (let j = 1; j <= k; j++) s += gewicht(j); return (R * s) / totaal; };
    const hoek = (i) => (-90 + (i * 360) / N) * (Math.PI / 180);
    const pt = (rad, a) => `${(c + rad * Math.cos(a)).toFixed(2)},${(c + rad * Math.sin(a)).toFixed(2)}`;
    const sector = (r0, r1, a0, a1) => {
      const groot = a1 - a0 > Math.PI ? 1 : 0;
      if (r0 <= 0) return `M${c},${c} L${pt(r1, a0)} A${r1},${r1} 0 ${groot} 1 ${pt(r1, a1)} Z`;
      return `M${pt(r1, a0)} A${r1},${r1} 0 ${groot} 1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0},${r0} 0 ${groot} 0 ${pt(r0, a0)} Z`;
    };
    const boog = (rad, a0, a1, omgekeerd) => {
      const groot = a1 - a0 > Math.PI ? 1 : 0;
      return omgekeerd ? `M${pt(rad, a1)} A${rad},${rad} 0 ${groot} 0 ${pt(rad, a0)}` : `M${pt(rad, a0)} A${rad},${rad} 0 ${groot} 1 ${pt(rad, a1)}`;
    };
    const out = [];
    const defs = [];
    // Doelring: lichte band in accentkleur
    if (o.doel >= 1 && o.doel <= max) {
      out.push(`<path d="${sector(r(o.doel - 1), r(o.doel), -Math.PI / 2, (3 * Math.PI) / 2 - 0.0001)}" fill="${accent}" fill-opacity="0.07"/>`);
    }
    // Vlakken per leerlijn
    o.lijnen.forEach((l, i) => {
      const a0 = hoek(i), a1 = hoek(i + 1);
      if (l.stap > 0) out.push(`<path d="${sector(0, r(Math.min(l.stap, max)), a0, a1)}" fill="${esc(l.kleur)}" fill-opacity="0.92"/>`);
      if (l.beoordeeldNiet && l.stap < max) {
        const id = `${idBasis}-h${i}`;
        defs.push(`<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${esc(l.kleur)}" fill-opacity="0.12"/><line x1="0" y1="0" x2="0" y2="6" stroke="${esc(l.kleur)}" stroke-width="2.2" stroke-opacity="0.55"/></pattern>`);
        out.push(`<path d="${sector(r(l.stap), r(l.stap + 1), a0, a1)}" fill="url(#${id})" stroke="${esc(l.kleur)}" stroke-width="1" stroke-dasharray="3 2"/>`);
      }
    });
    const vorigLijnen = o.lijnen.map((l, i) => (l.vorigeStap != null && l.vorigeStap !== l.stap
      ? `<path d="${l.vorigeStap > 0 ? boog(r(l.vorigeStap), hoek(i) + 0.03, hoek(i + 1) - 0.03) : ''}" fill="none" stroke="#1e2328" stroke-width="2.4" stroke-dasharray="5 3"/>` : '')).join('');
    // Raster: ringen en spaken
    for (let k = 1; k <= max; k++) {
      const doelRing = k === o.doel;
      out.push(`<circle cx="${c}" cy="${c}" r="${r(k).toFixed(2)}" fill="none" stroke="${doelRing ? accent : '#cfd4da'}" stroke-width="${doelRing ? 2 : 0.8}"/>`);
      out.push(`<text x="${c + 3}" y="${(c - r(k) + 11).toFixed(1)}" class="ringnr">${k}</text>`);
    }
    if (o.doel >= 1 && o.doel <= max) out.push(`<text x="${c}" y="${(c - r(o.doel) - 5).toFixed(1)}" class="doellabel" fill="${accent}" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">doel: stap ${o.doel}</text>`);
    for (let i = 0; i < N; i++) out.push(`<line x1="${c}" y1="${c}" x2="${pt(R, hoek(i)).replace(',', '" y2="')}" stroke="#cfd4da" stroke-width="0.8"/>`);
    out.push(vorigLijnen);
    // Categorieën als band rondom
    if (cats) {
      let i = 0;
      cats.forEach((cat, ci) => {
        const n = o.lijnen.filter((l) => l.cat === cat.naam).length;
        if (!n) return;
        const a0 = hoek(i) + 0.004, a1 = hoek(i + n) - 0.004, mid = (a0 + a1) / 2;
        const onder = Math.sin(mid) > 0.15;
        out.push(`<path d="${sector(R + 6, R + 24, a0, a1)}" fill="${esc(cat.kleur)}"/>`);
        const id = `${idBasis}-c${ci}`;
        defs.push(`<path id="${id}" d="${boog(R + (onder ? 19 : 11), a0, a1, onder)}"/>`);
        out.push(`<text class="catlabel"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(cat.naam)}</textPath></text>`);
        i += n;
      });
    }
    // Labels
    o.lijnen.forEach((l, i) => {
      const mid = (hoek(i) + hoek(i + 1)) / 2, rl = R + (cats ? 36 : 18);
      const x = c + rl * Math.cos(mid), y = c + rl * Math.sin(mid);
      const anker = Math.cos(mid) > 0.25 ? 'start' : Math.cos(mid) < -0.25 ? 'end' : 'middle';
      const regels = afbreken(l.naam, cats ? 20 : 17);
      const dy0 = Math.sin(mid) < -0.25 ? -(regels.length - 1) * 13 : Math.sin(mid) > 0.25 ? 4 : -((regels.length - 1) * 13) / 2 + 4;
      out.push(`<text x="${x.toFixed(1)}" y="${(y + dy0).toFixed(1)}" text-anchor="${anker}" class="lllabel">${regels.map((t, j) => `<tspan x="${x.toFixed(1)}" dy="${j ? 13 : 0}">${esc(t)}</tspan>`).join('')}</text>`);
    });
    // Boven en onder staan alleen enkele labels: de hoogte bijsnijden scheelt ruimte op de A4.
    const marge = R + (cats ? 36 : 18) + 40, y0 = Math.max(0, c - marge), h = Math.min(S, 2 * marge);
    return `<svg viewBox="0 ${y0.toFixed(0)} ${S} ${h.toFixed(0)}" class="diagram" role="img" aria-label="Diagram ${esc(o.naam)}"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
  }
  function afbreken(tekst, breed) {
    const woorden = String(tekst).split(/\s+/), regels = [];
    let r = '';
    for (const w of woorden) { if ((r + ' ' + w).trim().length > breed && r) { regels.push(r); r = w; } else r = (r + ' ' + w).trim(); }
    if (r) regels.push(r);
    return regels.slice(0, 4);
  }

  const bolletjes = (l, max) => Array.from({ length: max }, (_, k) => {
    const s = k + 1;
    if (s <= l.stap) return `<span class="bol vol" style="background:${esc(l.kleur)}"></span>`;
    if (s === l.stap + 1 && l.beoordeeldNiet) return `<span class="bol stip" style="border-color:${esc(l.kleur)}"></span>`;
    return '<span class="bol"></span>';
  }).join('');

  /* ---------- Pagina's ---------- */
  function paginaBeroeps(m, o, nr, totaalPag) {
    const w = m.profiel.weergave || {};
    const bava = m.opleidingen.find((x) => x.cats);
    const opDoel = o.lijnen.filter((l) => l.stap >= o.doel).length;
    const boven = o.lijnen.filter((l) => l.soort === 'boven').length;
    const kpis = [[`${opDoel}`, `/${o.lijnen.length}`, `${esc(o.conf.titel?.toLowerCase() || 'leerlijnen')} op stap ${o.doel}`], [`${boven}`, '', 'keer boven verwachting']];
    if (bava) {
      const met = bava.lijnen.filter((l) => l.stap > 0).length;
      const kern = (bava.cats || []).filter((c) => (bava.conf.kernvakken || []).includes(c.naam));
      kpis.push([`${met}`, `/${bava.lijnen.length}`, 'BAVA-leerlijnen met een behaalde stap']);
      if (kern.length) kpis.push([`${kern.filter((c) => c.behaald > 0).length}`, `/${kern.length}`, `${esc(lijst(kern.map(woord)).replace(/^./, (x) => x.toUpperCase()))}: vakken met een behaalde stap`]);
    }
    const jaar = m.profiel.jaardoel?.[o.rol];
    const vorige = m.vorige && w.vergelijk !== false && o.lijnen.some((l) => l.vorigeStap != null);
    const rijen = o.lijnen.map((l) => `<tr>
      <td class="kleur"><span style="background:${esc(l.kleur)}"></span></td>
      <td class="naam"><b>${esc(l.naam)}</b>${l.omschrijving ? `<small>${esc(l.omschrijving)}</small>` : ''}</td>
      <td class="bollen">${bolletjes(l, o.maxStap)}</td>
      <td class="stap">Stap ${l.stap} van ${o.maxStap}${vorige && l.vorigeStap != null && l.vorigeStap !== l.stap ? `<small>was ${l.vorigeStap} bij ${esc(m.vorige.code)}</small>` : ''}</td>
      <td class="status ${l.soort}">${esc(l.status)}</td>
      <td class="datum">${dag(l.datum)}</td></tr>`).join('');
    const toets = m.toets;
    const oordeel = m.opKoers == null ? '' : `<div class="oordeel ${m.opKoers ? 'ja' : 'nee'}">${m.opKoers ? 'Je zit op koers voor de' : 'Je zit nog niet op koers voor de'} ${esc(toets.normNaam || `norm van ${toets.code}`)}</div>
      <p>${esc(m.uitslagen.map((u) => u.tekst).join('; ').replace(/^./, (x) => x.toUpperCase()))}.</p>`;
    return `<section class="pagina">
      ${kop(m, o.conf.kop || 'VOORTGANG')}
      <div class="naamblok"><h1>${esc(m.g.student.naam)}</h1><div class="zo">Zo sta jij ervoor.</div></div>
      <div class="kpis">${kpis.map(([a, b, t]) => `<div><span class="groot">${a}</span><span class="deel">${b}</span><span class="uitleg">${t}</span></div>`).join('')}</div>
      <h2>${esc(o.naam)}</h2>
      <p class="sub">${o.lijnen.length} ${esc(o.conf.titel?.toLowerCase() || 'leerlijnen')} · ${o.maxStap} stappen${jaar ? ` · jaar 1 werkt toe naar stap ${jaar}` : ''}${m.periode ? ` · doel ${esc(m.periode.code)}: stap ${o.doel}` : ''}</p>
      ${diagram(o, w, `d${nr}`)}
      ${vorige ? `<p class="legenda-vorig"><span></span> stand aan het eind van ${esc(m.vorige.naam || m.vorige.code)}</p>` : ''}
      <table class="lijnen">${rijen}</table>
      <div class="onder">
        <div class="normen"><h3>NORM</h3>${(m.profiel.perioden || []).map((p) => `<p class="${p === m.periode ? 'nu' : ''}"><b>${esc(p.naam)} (${esc(p.code)}), ${esc(p.moment || '')}:</b> ${esc(p.norm || '')}</p>`).join('')}</div>
        <div class="uitslag">${oordeel}</div>
      </div>
      ${m.advies ? `<div class="advies"><h3>OM OVER TE PRATEN MET JE SLB'ER</h3><p>${esc(m.advies)}</p></div>` : ''}
      ${voet(m, nr, totaalPag)}
    </section>`;
  }

  function paginaCategorieen(m, o, nr, totaalPag) {
    const w = m.profiel.weergave || {};
    const blokken = (o.cats || []).map((c) => {
      const ls = o.lijnen.filter((l) => l.cat === c.naam);
      return `<table class="cat"><tr class="catkop"><th colspan="3">${esc(c.naam.toUpperCase())}</th><th colspan="2">${c.actief ? `${c.behaald}/${c.aantal} leerlijnen met een behaalde stap` : 'deze periode nog geen beoordeling'}</th></tr>
        ${ls.map((l) => `<tr><td class="kleur"><span style="background:${esc(c.kleur)}"></span></td><td class="naam">${esc(l.naam)}</td><td class="bollen">${bolletjes(l, o.maxStap)}</td><td class="stap">${l.stap}/${o.maxStap}</td><td class="status ${l.soort}">${esc(l.status)}${l.datum && l.stap > 0 ? ` <small>${dag(l.datum)}</small>` : ''}</td></tr>`).join('')}</table>`;
    });
    const helft = Math.ceil(blokken.length / 2);
    return `<section class="pagina">
      ${kop(m, o.conf.kop || 'VOORTGANG')}
      <h2>${esc(o.naam)}</h2>
      <p class="sub">${esc(lijst((o.cats || []).map(woord)).replace(/^./, (x) => x.toUpperCase()))} · ${o.maxStap} stappen${m.periode ? ` · doel ${esc(m.periode.code)}: stap ${o.doel}` : ''}</p>
      ${diagram(o, w, `d${nr}`)}
      <div class="twee"><div>${blokken.slice(0, helft).join('')}</div><div>${blokken.slice(helft).join('')}</div></div>
      <div class="legenda"><span class="bol vol" style="background:#1e2328"></span> stap behaald <span class="bol stip"></span> beoordeeld, stap nog niet behaald <span class="bol"></span> nog niet aan toe</div>
      <p class="uitleg-klein">Elke ring in het diagram is een stap; de ring van de doelstap is groter en gekleurd. Hoe verder een vlak naar buiten loopt, hoe verder je bent in die leerlijn. Gestreept: wel beoordeeld, deze stap is nog niet behaald.</p>
      ${voet(m, nr, totaalPag)}
    </section>`;
  }

  const kop = (m, titel) => `<header class="rkop"><div class="merk"><b>MA</b><span>Mediacollege<br>Amsterdam</span></div>
    <div class="rechts"><b>VOORTGANGSRAPPORT · ${esc(titel)}</b><span>${esc(m.g.student.naam)}${m.g.student.groep ? ` · ${esc(m.g.student.groep)}` : ''} · peildatum ${langeDatum(m.datum)}</span></div></header>`;
  const voet = (m, nr, totaal) => `<footer class="rvoet"><span>Bron: Simulise, leerlijndiagrammen. Normen: ${esc(m.profiel.bron || m.profiel.naam)}.</span><span>${nr}/${totaal}</span></footer>`;

  function studentPaginas(g, profiel) {
    const m = bereken(g, profiel);
    const delen = [];
    const totaal = m.opleidingen.length;
    m.opleidingen.forEach((o, i) => delen.push(o.cats ? paginaCategorieen(m, o, i + 1, totaal) : paginaBeroeps(m, o, i + 1, totaal)));
    return delen.join('');
  }

  function html(studenten, profiel, titel = 'Voortgangsrapport') {
    const accent = profiel.weergave?.accent || '#e6007e';
    return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>:root { --accent-waarde: ${esc(accent)}; }${CSS}</style></head>
      <body><div class="balk geen-print"><b>${esc(titel)}</b><span>${studenten.length} ${studenten.length === 1 ? 'student' : 'studenten'}</span><button class="afdruk">Afdrukken of opslaan als PDF</button></div>
      ${studenten.map((g) => studentPaginas(g, profiel)).join('')}</body></html>`;
  }

  const CSS = `
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 11px/1.4 Inter, "Helvetica Neue", Arial, sans-serif; color: #1e2328; background: #e9ecef; }
    .balk { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; padding: 10px 16px; background: #1e2328; color: #fff; font-size: 13px; }
    .balk button { margin-left: auto; font: inherit; font-weight: 600; padding: 6px 12px; border: 0; border-radius: 6px; background: var(--accent-waarde); color: #fff; cursor: pointer; }
    .pagina { width: 210mm; min-height: 297mm; margin: 12px auto; padding: 12mm 14mm; background: #fff; display: flex; flex-direction: column; break-after: page; page-break-after: always; }
    .pagina:last-child { break-after: auto; page-break-after: auto; }
    .rkop { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #1e2328; padding-bottom: 8px; margin-bottom: 14px; }
    .merk { display: flex; align-items: center; gap: 8px; } .merk b { font-size: 26px; letter-spacing: -1px; } .merk span { color: var(--accent-waarde); font-size: 9px; line-height: 1.1; }
    .rkop .rechts { text-align: right; } .rkop .rechts b { display: block; letter-spacing: .06em; font-size: 10px; } .rkop .rechts span { color: #5b6470; }
    .naamblok h1 { display: inline-block; margin: 0 0 6px; padding: 4px 12px; background: #1e2328; color: #fff; font-size: 22px; font-weight: 500; border-radius: 3px; }
    .naamblok .zo { display: table; padding: 4px 12px; background: var(--accent-waarde); color: #fff; font-size: 22px; border-radius: 3px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid #d4d9df; border-bottom: 1px solid #d4d9df; margin: 10px 0; }
    .kpis > div { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-left: 1px solid #d4d9df; } .kpis > div:first-child { border-left: 0; }
    .kpis .groot { font-size: 30px; font-family: Georgia, serif; } .kpis .deel { color: #5b6470; align-self: flex-end; margin-bottom: 6px; } .kpis .uitleg { font-size: 9.5px; color: #3b434d; }
    h2 { font-size: 14px; margin: 4px 0 0; font-weight: 600; } .sub { color: #5b6470; margin: 2px 0 0; }
    .diagram { display: block; width: 100%; max-width: 122mm; margin: 2mm auto 0; flex-shrink: 0; }
    .ringnr { font-size: 9px; fill: #8a93a0; } .doellabel { font-size: 11px; font-weight: 700; } .lllabel { font-size: 12.5px; fill: #1e2328; } .catlabel { font-size: 12px; fill: #fff; font-weight: 600; letter-spacing: .03em; }
    .legenda-vorig { font-size: 9.5px; color: #5b6470; text-align: center; margin: -4px 0 6px; } .legenda-vorig span { display: inline-block; width: 18px; border-top: 2px dashed #1e2328; vertical-align: middle; margin-right: 4px; }
    table { width: 100%; border-collapse: collapse; } .lijnen { border-top: 1px solid #1e2328; }
    .lijnen td, .cat td { border-bottom: 1px solid #e3e6ea; padding: 5px 4px; vertical-align: middle; }
    td.kleur { width: 14px; } td.kleur span { display: inline-block; width: 9px; height: 9px; }
    td.naam b { display: block; font-weight: 600; font-size: 11.5px; } td.naam small, td.stap small { display: block; color: #5b6470; font-size: 9.5px; }
    td.bollen { white-space: nowrap; width: 80px; } td.stap { white-space: nowrap; width: 72px; } td.datum { width: 40px; color: #5b6470; text-align: right; white-space: nowrap; }
    td.status { white-space: nowrap; width: 110px; } td.status.boven { color: var(--accent-waarde); } td.status.niet { text-decoration: underline dashed; } td.status.leeg { color: #8a93a0; font-size: 10px; } td.status small { color: #8a93a0; margin-left: 6px; }
    .bol { display: inline-block; width: 11px; height: 11px; border-radius: 50%; border: 1px solid #c4cad1; margin-right: 2px; vertical-align: middle; }
    .bol.vol { border-color: transparent; } .bol.stip { border: 1.5px dashed #8e44e8; }
    .onder { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; margin-top: 10px; }
    h3 { font-size: 10px; letter-spacing: .08em; margin: 0 0 6px; } .normen p { margin: 0 0 4px; } .normen p.nu { background: #f6f7f9; }
    .oordeel { display: inline-block; padding: 5px 12px; background: #1e2328; color: #fff; font-size: 13px; border-radius: 3px; margin-bottom: 6px; } .oordeel.nee { background: var(--accent-waarde); }
    .advies { margin-top: 10px; border-left: 3px solid var(--accent-waarde); padding: 6px 12px; }
    .rvoet { margin-top: auto; display: flex; justify-content: space-between; color: #8a93a0; font-size: 9px; border-top: 1px solid #e3e6ea; padding-top: 6px; }
    .twee { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 6px; } .cat { margin-bottom: 10px; }
    .catkop th { text-align: left; font-size: 10px; letter-spacing: .06em; border-bottom: 1px solid #1e2328; padding: 4px; } .catkop th + th { text-align: right; font-weight: 400; color: #5b6470; letter-spacing: 0; }
    .legenda { font-size: 9.5px; color: #3b434d; margin-top: 4px; } .legenda .bol { margin-left: 8px; } .uitleg-klein { font-size: 9px; color: #5b6470; }
    @media print { body { background: #fff; } .geen-print { display: none; } .pagina { margin: 0; width: auto; min-height: auto; height: 273mm; padding: 0; overflow: hidden; } }
  `;

  globalThis.SDRapport = { bereken, html, diagram, periodeIndex, toetsIndex, rolVan, esc };
})();
