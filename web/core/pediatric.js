(() => {
  const ns = globalThis.GuildBookCore ||= {};
  const rounded = value => Math.round((value + Number.EPSILON) * 100) / 100;
  function resolve(regimen, { weightKg, ageMonths, chosenUnits } = {}) {
    if (regimen.population !== 'pediatric') return null;
    const dose = regimen.dose;
    if ((dose.minAgeMonths != null || dose.maxAgeMonths != null || dose.kind === 'ageWeightDrops') && !Number.isFinite(ageMonths)) return null;
    if (ageMonths < (dose.minAgeMonths || 0) || (dose.maxAgeMonths && ageMonths >= dose.maxAgeMonths)) return null;
    if (dose.kind === 'fixed') return dose;
    if (dose.kind === 'weightBands') {
      if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
      const band = dose.bands.find(row => weightKg >= row.minKg && weightKg <= row.maxKg);
      if (!band) return null;
      const units = chosenUnits === undefined ? band.minUnits : Number(chosenUnits);
      if (units < band.minUnits || units > band.maxUnits || !Number.isFinite(units)) return null;
      return { units, mg: rounded(units * dose.mgPerUnit), unit: dose.unit, range: [band.minUnits, band.maxUnits], volumeMl: dose.unitsPerMl ? rounded(units / dose.unitsPerMl) : units };
    }
    if (dose.kind === 'ageWeightDrops') {
      if (ageMonths < dose.fixedFromMonths && (!Number.isFinite(weightKg) || weightKg <= 0)) return null;
      const units = ageMonths >= dose.fixedFromMonths ? dose.fixedUnits : weightKg * dose.unitsPerKg;
      if (!Number.isInteger(units) || units <= 0) return null;
      return { units, mg: rounded(units * dose.mgPerUnit), unit: dose.unit, volumeMl: rounded(units / dose.unitsPerMl) };
    }
    return null;
  }
  ns.pediatric = { resolve };
})();
