(() => {
  const ns = globalThis.GuildBookUI ||= {};
  ns.medicationSelector = (medicine, selected, population, patientContext) => {
    const presentations = globalThis.GuildBookCore.medication.presentationsForPopulation(medicine, population, patientContext);
    const options = presentations.map(p => `<option value="${ns.escape(p.id)}" ${p.id === selected.id ? 'selected' : ''}>${ns.escape(p.label)}</option>`).join('');
    return `<div class="selector-panel"><label class="field" for="presentation"><span class="field-label">Apresentação / esquema</span><select id="presentation">${options}</select></label></div>`;
  };
})();
