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
  const fmt = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  const singular = unit => ({ comprimidos: 'comprimido', cápsulas: 'cápsula', gotas: 'gota' })[unit] || unit;
  const plural = (unit, count) => count === 1 ? unit : ({ comprimido: 'comprimidos', cápsula: 'cápsulas', gota: 'gotas', frasco: 'frascos', caixa: 'caixas', bisnaga: 'bisnagas' })[unit] || unit;
  const measure = (amount, unit) => `${fmt(amount)} ${plural(unit, amount)}`;
  function packageText(packages, container, sizeUnit) {
    return packages.map(({ size, count }) => container ? `${count} ${plural(container, count)} de ${measure(size, sizeUnit)}` : measure(rounded(size * count), sizeUnit)).join(' + ');
  }
  function suggestPack(required, sizes) {
    if (!Number.isFinite(required) || required <= 0 || !sizes.length) return null;
    const decimals = value => (String(value).split('.')[1] || '').length;
    const scale = 10 ** Math.min(2, Math.max(decimals(required), ...sizes.map(decimals)));
    const target = Math.ceil(required * scale - 1e-8);
    const steps = sizes.map(size => Math.round(size * scale));
    const limit = Math.ceil(target / steps[0]) * steps[0];
    const best = new Array(limit + 1);
    best[0] = new Array(sizes.length).fill(0);
    for (let sum = 0; sum <= limit; sum++) {
      if (!best[sum]) continue;
      for (let index = 0; index < steps.length; index++) {
        const next = sum + steps[index];
        if (next > limit) continue;
        const candidate = best[sum].slice();
        candidate[index]++;
        if (!best[next] || candidate.reduce((a, b) => a + b, 0) < best[next].reduce((a, b) => a + b, 0)) best[next] = candidate;
      }
    }
    const total = best.findIndex((combination, sum) => sum >= target && combination);
    return total < 0 ? null : best[total].flatMap((count, index) => count ? [{ size: sizes[index], count }] : []);
  }
  function plan({ presentation, regimen, dose, days }) {
    const policy = presentation.quantityPolicy || (regimen.quantityKind === 'facility' ? 'none' : regimen.quantityKind === 'variable' ? 'manual' : 'calculate');
    const sizeUnit = presentation.packageSizeUnit || (['mL', 'g'].includes(presentation.packageUnit) ? presentation.packageUnit : dose?.unit === 'gotas' ? 'mL' : dose?.unit);
    const container = presentation.packageSizeUnit ? presentation.packageUnit || null : null;
    const sizes = [...new Set((presentation.packageSizes || []).filter(size => Number.isFinite(size) && size > 0))].sort((a, b) => a - b);
    const validDays = Number.isInteger(Number(days)) && Number(days) > 0 && Number(days) <= (regimen.durationKind === 'max7' ? 7 : 365);
    const unitsPerMl = dose?.unit === 'gotas' && Number.isFinite(dose?.volumeMl) && dose.volumeMl > 0 ? dose.units / dose.volumeMl : undefined;
    const calculated = policy === 'calculate' && dose && validDays ? calculate({ units: dose.units, unit: dose.unit, unitsPerMl, intervalHours: regimen.intervalHours, days: Number(days) }) : null;
    const required = calculated?.required ?? null;
    const suggestion = suggestPack(required, sizes);
    return { policy, required, isMaximum: regimen.quantityKind === 'maximum', unit: singular(calculated?.unit || sizeUnit) || null, container, sizes, options: sizes.map(size => ({ size, label: packageText([{ size, count: 1 }], container, sizeUnit) })), suggestion, canFractionate: presentation.canFractionate === true };
  }
  function select(plan, { kind, size, amount } = {}) {
    if (plan.policy === 'none' || !plan.unit) return null;
    if (kind === 'suggested' && plan.required != null) {
      if (!plan.suggestion) return { quantity: plan.required, unit: plan.unit, text: measure(plan.required, plan.unit), method: 'automatic', packages: [] };
      const quantity = rounded(plan.suggestion.reduce((sum, item) => sum + item.size * item.count, 0));
      return { quantity, unit: plan.unit, text: packageText(plan.suggestion, plan.container, plan.unit), method: 'automatic', packages: plan.suggestion };
    }
    if (kind === 'package' && plan.sizes.includes(size) && (plan.required == null || size >= plan.required)) return { quantity: size, unit: plan.unit, text: packageText([{ size, count: 1 }], plan.container, plan.unit), method: 'confirmed-package', packages: [{ size, count: 1 }] };
    if (kind === 'manual' && Number.isFinite(amount) && amount > 0 && (plan.canFractionate || !['comprimido', 'cápsula'].includes(plan.unit) || Number.isInteger(amount))) return { quantity: amount, unit: plan.unit, text: measure(amount, plan.unit), method: 'manual', packages: [] };
    return null;
  }
  ns.quantity = { calculate, suggestPack, plan, select, measure, packageText };
})();
