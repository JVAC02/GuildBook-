(() => {
  const ns = globalThis.GuildBookCore ||= {};
  const rounded = value => Math.round((value + Number.EPSILON) * 100) / 100;
  function eligible(presentation, regimen, { weightKg, ageMonths } = {}) {
    if (regimen.population !== 'pediatric') return null;
    const pediatric = presentation?.pediatric || {};
    const dose = regimen.dose;
    if (pediatric.pediatricAllowed === false || (pediatric.doseKind && pediatric.doseKind !== dose.kind)) return false;
    for (const bounds of [pediatric, dose]) {
      if (Number.isFinite(ageMonths) && (bounds.minAgeMonths != null && ageMonths < bounds.minAgeMonths || bounds.maxAgeMonths != null && ageMonths >= bounds.maxAgeMonths)) return false;
      if (Number.isFinite(weightKg) && (bounds.minWeightKg != null && weightKg < bounds.minWeightKg || bounds.maxWeightKg != null && weightKg > bounds.maxWeightKg)) return false;
    }
    if (dose.kind === 'weightBands' && Number.isFinite(weightKg) && !dose.bands.some(row => weightKg >= row.minKg && weightKg <= row.maxKg)) return false;
    return true;
  }
  function resolve(regimen, { weightKg, ageMonths, chosenUnits } = {}, presentation) {
    if (!eligible(presentation, regimen, { weightKg, ageMonths })) return null;
    const dose = regimen.dose;
    const pediatric = presentation?.pediatric || {};
    if ([pediatric, dose].some(bounds => (bounds.minAgeMonths != null || bounds.maxAgeMonths != null) && !Number.isFinite(ageMonths))) return null;
    if ([pediatric, dose].some(bounds => (bounds.minWeightKg != null || bounds.maxWeightKg != null) && !Number.isFinite(weightKg))) return null;
    const unitsForMg = (mg, strengthMg) => {
      if (!Number.isFinite(mg) || mg <= 0 || !Number.isFinite(strengthMg) || strengthMg <= 0) return null;
      const rawUnits = mg / strengthMg;
      const units = rounded(rawUnits);
      if (Math.abs(rawUnits - units) > 1e-6 || units <= 0) return null;
      const fraction = rounded(units % 1);
      if (dose.unit === 'comprimido' || dose.unit === 'cápsula') {
        if (fraction && (pediatric.mustSwallowWhole || pediatric.canSplit !== true || !pediatric.allowedFractions?.includes(fraction))) return null;
      } else if (dose.unit === 'gotas' && fraction) return null;
      return { units, mg: rounded(mg), unit: dose.unit };
    };
    if (dose.kind === 'fixed') {
      if (Number.isFinite(dose.units) && Number.isFinite(dose.mg)) {
        const fraction = rounded(dose.units % 1);
        if (fraction && (dose.unit === 'comprimido' || dose.unit === 'cápsula') && (pediatric.mustSwallowWhole || pediatric.canSplit !== true || !pediatric.allowedFractions?.includes(fraction))) return null;
        return dose;
      }
      return unitsForMg(dose.fixedDose ?? pediatric.fixedDose, dose.strengthMg ?? pediatric.strengthMg);
    }
    if (dose.kind === 'perKg') {
      const perKg = dose.dosePerKg ?? pediatric.dosePerKg;
      if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(perKg) || perKg <= 0) return null;
      const mg = Math.min(weightKg * perKg, dose.maxDose ?? pediatric.maxDose ?? Infinity);
      return unitsForMg(mg, dose.strengthMg ?? pediatric.strengthMg);
    }
    if (!Number.isFinite(ageMonths) && (dose.kind === 'ageWeightDrops' || dose.minAgeMonths != null || dose.maxAgeMonths != null)) return null;
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
  ns.pediatric = { eligible, resolve };
})();
