(() => {
  const ns = globalThis.GuildBookUI ||= {};
  ns.medicationSelector = (medicine, selected, population, patientContext) => {
    const presentations = globalThis.GuildBookCore.medication.presentationsForPopulation(medicine, population, patientContext);
    return `<div class="presentation-options" role="group" aria-label="Apresentações de ${ns.escape(medicine.name)}">${presentations.map(p => {
      const [compound, suffix] = p.label.split(' — ');
      const strength = compound.startsWith(medicine.name + ' ') ? compound.slice(medicine.name.length + 1) : p.concentration;
      const form = /^liberação/i.test(suffix || '') ? 'comprimido' : suffix || p.form;
      return `<button type="button" data-presentation="${ns.escape(p.id)}" aria-pressed="${p.id === selected?.id}">${ns.escape(strength)} · ${ns.escape(form)}</button>`;
    }).join('') || '<p class="helper">Nenhuma apresentação cadastrada para este contexto.</p>'}</div>`;
  };
})();
