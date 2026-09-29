(() => {
  const ns = globalThis.GuildBookUI ||= {};
  const core = globalThis.GuildBookCore;
  ns.dispensingView = ({ plan, selected, mode, expanded, manualQuantity, packSize }) => {
    if (plan.policy === 'none') return '';
    const required = plan.required == null ? '' : `${plan.isMaximum ? 'Estimativa máxima para o período' : 'Necessário para o tratamento'}: ${core.quantity.measure(plan.required, plan.unit)}.`;
    if (plan.required != null && !expanded && selected) return `<div class="quantity-box"><div class="quantity-top"><span>Quantidade a dispensar</span><strong>${ns.escape(selected.text)}</strong></div><small>${ns.escape(required)}</small><button type="button" class="inline-link quantity-change" id="alter-quantity">alterar</button></div>`;
    const options = plan.required == null ? plan.options : plan.options.filter(option => option.size >= plan.required && !(plan.suggestion?.length === 1 && plan.suggestion[0].size === option.size));
    const suggested = plan.required == null ? '' : `<label><input type="radio" name="dispense" value="suggested" ${mode === 'suggested' || mode === 'none' ? 'checked' : ''}> ${ns.escape(core.quantity.select(plan, { kind: 'suggested' }).text)}</label>`;
    const packages = options.map(option => `<label><input type="radio" name="dispense" value="package" data-package-size="${option.size}" ${mode === 'package' && Number(packSize) === option.size ? 'checked' : ''}> ${ns.escape(option.label)}</label>`).join('');
    const manual = `<label><input type="radio" name="dispense" value="manual" ${mode === 'manual' ? 'checked' : ''}> Definir manualmente</label>`;
    const whole = ['comprimido', 'cápsula'].includes(plan.unit) && !plan.canFractionate;
    const input = mode === 'manual' ? `<label class="field manual-control" for="manual-quantity"><span class="field-label">Quantidade · ${ns.escape(plan.unit || '')}</span><input id="manual-quantity" type="number" min="${whole ? '1' : '0.01'}" step="${whole ? '1' : '0.01'}" value="${ns.escape(manualQuantity)}"></label>` : '';
    return `<div class="quantity-box"><div class="quantity-top"><span>Quantidade a dispensar</span></div>${required ? `<small>${ns.escape(required)}</small>` : ''}<div class="dispense-options" role="group" aria-label="Quantidade a dispensar">${suggested}${packages}${manual}</div>${input}</div>`;
  };
})();
