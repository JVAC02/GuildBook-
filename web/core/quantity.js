(() => {
  const ns = globalThis.GuildBookCore ||= {};
  const rounded = value => Math.round((value + Number.EPSILON) * 100) / 100;
  function calculate({ units, unit, unitsPerMl, intervalHours, days, packSize }) {
    if (![units, intervalHours, days].every(value => Number.isFinite(value) && value > 0) || 24 % intervalHours !== 0) return null;
    const liquid = unit === 'gotas' && Number.isFinite(unitsPerMl) && unitsPerMl > 0;
    const required = rounded((units / (liquid ? unitsPerMl : 1)) * (24 / intervalHours) * days);
    const packs = Number.isFinite(packSize) && packSize > 0 ? Math.ceil(required / packSize) : null;
    return { required, closedPack: packs === null ? null : rounded(packs * packSize), packs, unit: liquid ? 'mL' : unit };
  }
  ns.quantity = { calculate };
})();
