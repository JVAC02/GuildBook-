(() => {
  const ns = globalThis.GuildBookUI ||= {};
  const core = globalThis.GuildBookCore;
  ns.dispensingView = ({ plan, selected, mode, manualQuantity, packSize }) => {
    if (plan.policy === 'none') return '';
    const chosen = mode === 'none' && plan.required != null ? 'suggested' : mode === 'package' ? `package:${packSize}` : mode;
    const options = [
      { value: 'none', label: 'Selecionar' },
      ...(plan.required != null ? [{ value: 'suggested', label: core.quantity.select(plan, { kind: 'suggested' }).text }] : []),
      ...plan.options.filter(option => plan.required == null || option.size >= plan.required).map(option => ({ value: `package:${option.size}`, label: option.label })),
      { value: 'manual', label: 'Informar quantidade' }
    ];
    const whole = ['comprimido', 'cápsula'].includes(plan.unit) && !plan.canFractionate;
    const manual = mode === 'manual' ? `<label class="field manual-control" for="manual-quantity"><span class="field-label">Quantidade · ${ns.escape(core.quantity.abbreviation(plan.unit || ''))}</span><input id="manual-quantity" type="number" min="${whole ? '1' : '0.01'}" step="${whole ? '1' : '0.01'}" inputmode="decimal" value="${ns.escape(manualQuantity)}"></label>` : '';
    const required = plan.required == null ? '' : `<small>${plan.isMaximum ? 'Estimativa máxima para o período' : 'Necessário'}: ${ns.escape(core.quantity.measure(plan.required, plan.unit))}.</small>`;
    return `<label class="field" for="dispense-choice"><span class="field-label">Quantidade</span><select id="dispense-choice">${options.map(option => `<option value="${option.value}" ${chosen === option.value ? 'selected' : ''}>${ns.escape(option.label)}</option>`).join('')}</select>${required}</label>${manual}`;
  };
})();
