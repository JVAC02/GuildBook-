(() => {
  const ui = globalThis.GuildBookUI ||= {};
  const aliases = condition => (condition.aliases || []).filter(alias => ui.escape(alias) !== ui.escape(condition.name)).join(' · ');

  ui.clinicalConditionCard = condition => `<button type="button" class="card condition-result" data-condition="${ui.escape(condition.id)}"><span><strong>${ui.escape(condition.name)}</strong>${aliases(condition) ? `<small>${ui.escape(aliases(condition))}</small>` : ''}</span><span class="chevron" aria-hidden="true">›</span></button>`;

  ui.calculatorCard = item => `<a class="card tool-card" href="${ui.escape(item.url)}">${ui.escape(item.name)} <span aria-hidden="true">›</span></a>`;

  ui.clinicalCondition = (condition, resources, isFavorite) => {
    const meds = resources.medications.length ? `<section class="related-section"><h2>Medicamentos relacionados</h2><div class="med-grid">${resources.medications.map(item => ui.medicationCard(item, isFavorite(item.id))).join('')}</div></section>` : '';
    const tools = resources.calculators.length ? `<section class="related-section"><h2>Ferramentas relacionadas</h2><div class="tool-grid">${resources.calculators.map(ui.calculatorCard).join('')}</div></section>` : '';
    return `<div class="condition-heading"><div class="section-kicker">ÍNDICE CLÍNICO</div><h1>${ui.escape(condition.name)}</h1>${aliases(condition) ? `<p>${ui.escape(aliases(condition))}</p>` : ''}</div>${meds}${tools}`;
  };
})();
