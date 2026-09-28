(() => {
  const ns = globalThis.GuildBookUI ||= {};
  ns.medicationSelector = (medicine, selected, population) => {
    const options = medicine.presentations.map(p => `<option value="${ns.escape(p.id)}" ${p.id === selected.id ? 'selected' : ''}>${ns.escape(p.label)}</option>`).join('');
    const populations = globalThis.GuildBookCore.medication.populations(selected);
    const populationPicker = populations.length > 1 ? `<div class="field"><span class="field-label">População</span><div class="segment" role="group" aria-label="População">${populations.map(p => `<button type="button" data-population="${p}" class="${p === population ? 'active' : ''}" aria-pressed="${p === population}">${p === 'adult' ? 'Adulto' : 'Pediatria'}</button>`).join('')}</div></div>` : '';
    return `<div class="selector-panel"><label class="field" for="presentation"><span class="field-label">Apresentação / esquema</span><select id="presentation">${options}</select></label>${populationPicker}</div>`;
  };
})();
