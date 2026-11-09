/* Gedeelde filterregels voor Beoordelen en Meldingen, op basis van de instellingen
 * bdOpleidingen (opleidingscodes, met komma's) en bdUitsluiten (uitsluitwoorden, met komma's).
 */
SD.regels = {
  lijst(tekst) { return String(tekst || '').split(/[,;\n]/).map((w) => w.trim()).filter(Boolean); },

  /* Bevat de tekst een van de uitsluitwoorden? */
  uitsluit(tekst, s) {
    const t = String(tekst || '').toLowerCase();
    return this.lijst(s.bdUitsluiten).some((w) => t.includes(w.toLowerCase()));
  },

  /* Is dit de titel van een meetmoment van een andere opleiding? Een meetmoment begint met
   * "Meetmoment"; het is van jou als een van je opleidingscodes erin staat ("Meetmoment MEP/MIP ..."). */
  andereOpleiding(titel, s) {
    if (!/^\s*meetmoment\b/i.test(titel || '')) return false;
    const mijn = this.lijst(s.bdOpleidingen).map((w) => w.toLowerCase());
    if (!mijn.length) return false;
    const t = titel.toLowerCase();
    const woorden = t.split(/[\s/()_,.:-]+/).filter(Boolean);
    return !mijn.some((m) => woorden.includes(m) || t.includes(` ${m} `));
  },
};
