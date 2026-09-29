(() => {
  const ns = globalThis.GuildBookCore ||= {};
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const terms = condition => [condition.name, ...(condition.aliases || [])].map(normalize);

  function searchConditions(conditions, query) {
    const key = normalize(query);
    if (!key) return [];
    return conditions.map(condition => {
      const values = terms(condition);
      const rank = values.includes(key) ? 0 : values.some(value => value.startsWith(key)) ? 1 : 99;
      return { condition, rank };
    }).filter(row => row.rank < 99).sort((a, b) => a.rank - b.rank || a.condition.name.localeCompare(b.condition.name, 'pt-BR')).map(row => row.condition);
  }

  function resolveCondition(conditions, query) {
    const key = normalize(query);
    if (!key) return null;
    const exact = conditions.filter(condition => terms(condition).includes(key));
    return exact.length === 1 ? exact[0] : null;
  }

  function searchCalculators(calculators, query) {
    const key = normalize(query);
    if (!key) return [];
    return calculators.filter(item => [item.name, ...(item.aliases || [])].some(value => normalize(value).startsWith(key)));
  }

  function resourcesFor(conditionId, index, catalog, calculators) {
    const medicationIds = new Set(index.medicationsByCondition[conditionId] || []);
    const calculatorIds = new Set(index.calculatorsByCondition[conditionId] || []);
    return {
      medications: catalog.filter(row => medicationIds.has(row.id)),
      calculators: calculators.filter(row => calculatorIds.has(row.id)),
    };
  }

  ns.clinicalAssociation = { normalize, searchConditions, searchCalculators, resolveCondition, resourcesFor };
})();
