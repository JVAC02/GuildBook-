(() => {
  const ns = globalThis.GuildBookCore ||= {};
  const number = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  const abbreviation = unit => ({ comprimido: 'CP', cápsula: 'CAP', ampola: 'AMP', 'frasco-ampola': 'FR', mL: 'mL', g: 'G', gotas: 'GOTAS' })[unit] || unit.toUpperCase();
  const routeName = route => ({ oral: 'USO ORAL', tópica: 'USO TÓPICO', intramuscular: 'USO INTRAMUSCULAR', intravenosa: 'USO INTRAVENOSO', inalatória: 'USO INALATÓRIO', nasal: 'USO NASAL', oftálmica: 'USO OFTÁLMICO', otológica: 'USO OTOLÓGICO', vaginal: 'USO VAGINAL' })[route] || `USO ${route.toUpperCase()}`;
  const doseAmount = value => Number.isInteger(value) && value < 10 ? String(value).padStart(2, '0') : number(value);
  function instruction(item) {
    const asNeeded = item.intervalText.endsWith(', se necessário');
    let interval = asNeeded ? item.intervalText.slice(0, -', se necessário'.length) : item.intervalText;
    interval = interval.replace(/^a cada (\d+) horas?/, (_, hours) => `de ${hours}/${hours}h`).replace(/^uma vez ao dia/, '1 vez ao dia');
    const use = item.route === 'tópica'
      ? `Aplicar na área afetada ${interval}`
      : `${item.verb} ${doseAmount(item.dose.units)} ${abbreviation(item.dose.unit)} ${interval}`;
    return `${use}${item.durationDays ? ` por ${item.durationDays} ${item.durationDays === 1 ? 'dia' : 'dias'}` : ''}${asNeeded ? ' se necessário' : ''}.`.toUpperCase();
  }
  function automaticQuantity(item, days) {
    if (!days || item.quantityKind === 'variable' || item.quantityKind === 'facility' || !item.intervalHours) return null;
    const unitsPerMl = item.dose.unit === 'gotas' ? item.dose.units / item.dose.volumeMl : undefined;
    return ns.quantity.calculate({ units: item.dose.units, unit: item.dose.unit, unitsPerMl, intervalHours: item.intervalHours, days, packSize: item.packSize });
  }
  function createItem({ medicine, presentation, regimen, dose, days, quantity, mode = 'exact', manualQuantity, packSize }) {
    if (!medicine || !presentation || !regimen || !dose || presentation.context !== 'ambulatory') return null;
    const durationDays = Number.isInteger(Number(days)) && Number(days) > 0 && Number(days) <= (regimen.durationKind === 'max7' ? 7 : 365) ? Number(days) : null;
    const manual = Number(manualQuantity);
    const selectedQuantity = mode === 'manual' && manual > 0 ? manual : mode === 'pack' ? quantity?.closedPack ?? null : quantity?.required ?? null;
    const item = {
      key: `${medicine.id}/${presentation.id}/${regimen.id}`, medicineId: medicine.id, medicineName: medicine.name,
      presentationId: presentation.id, regimenId: regimen.id, population: regimen.population,
      label: presentation.label, concentration: presentation.concentration, form: presentation.form,
      route: presentation.route, dose: { units: dose.units, unit: dose.unit, mg: dose.mg, volumeMl: dose.volumeMl ?? null },
      intervalText: regimen.intervalText, intervalHours: regimen.intervalHours ?? null,
      durationKind: regimen.durationKind, quantityKind: regimen.quantityKind, verb: regimen.verb || 'Tomar',
      durationDays, quantity: selectedQuantity, quantityUnit: quantity?.unit || presentation.packageUnit || (dose.unit === 'gotas' ? 'mL' : dose.unit),
      packSize: Number(packSize || presentation.packageSizes[0]) || null,
      quantityMethod: mode === 'manual' && manual > 0 ? 'manual' : mode === 'pack' ? 'pack' : 'automatic'
    };
    item.instruction = instruction(item);
    return item;
  }
  function updateItem(item, { days, quantity }) {
    const durationDays = Number.isInteger(Number(days)) && Number(days) > 0 && Number(days) <= (item.durationKind === 'max7' ? 7 : 365) ? Number(days) : null;
    const manual = quantity === '' ? null : Number(quantity);
    const calculated = automaticQuantity(item, durationDays);
    const method = manual > 0 ? 'manual' : item.quantityMethod === 'pack' ? 'pack' : 'automatic';
    const updated = { ...item, durationDays, quantity: manual > 0 ? manual : method === 'pack' ? calculated?.closedPack ?? null : calculated?.required ?? null,
      quantityUnit: calculated?.unit || item.quantityUnit, quantityMethod: method };
    updated.instruction = instruction(updated);
    return updated;
  }
  function upsert(items, item) {
    const index = items.findIndex(existing => existing.key === item.key);
    if (index < 0) return [...items, item];
    return items.map((existing, position) => position === index ? item : existing);
  }
  function remove(items, key) { return items.filter(item => item.key !== key); }
  function prescriptionName(item) {
    const separator = item.label.lastIndexOf(' — ');
    if (separator < 0) return item.label;
    const suffix = item.label.slice(separator + 3);
    const dosageForm = /^(?:comprimidos?|cápsulas?|gotas?|solução|suspensão|gel|creme|pomada|xarope|spray|aerossol|colírio|ampolas?|frascos?|envelopes?|sachês?)(?:\s|$)/i;
    return dosageForm.test(suffix) ? item.label.slice(0, separator) : item.label;
  }
  function formatSections(items, patient = '', details = {}) {
    const title = 'RECEITUÁRIO SIMPLES\n\n';
    const intro = `PACIENTE: ${patient.trim() || '________________________________'}\n\nPRESCRIÇÃO:\n\n`;
    const parts = [];
    const routes = [...new Set(items.map(item => item.route))];
    for (const route of routes) {
      parts.push(routeName(route), '');
      items.filter(item => item.route === route).forEach((item, index) => {
        const amount = item.quantity == null ? 'QTDE A DEFINIR' : `${number(item.quantity)} ${abbreviation(item.quantityUnit)}`;
        const name = `${index + 1}. ${prescriptionName(item).toUpperCase()}`;
        const dashes = '-'.repeat(Math.max(4, 40 - name.length - 2));
        parts.push(`${name} ${dashes} ${amount}`, `   ${item.instruction}`, '');
      });
    }
    const body = `${parts.join('\n')}\n`;
    const provided = value => String(value || '').trim();
    const line = fields => fields.filter(([, value]) => provided(value)).map(([label, value]) => `${label}: ${provided(value)}`).join('    ');
    const optional = [
      line([['NOME DO(A) MÉDICO(A)', details.doctorName]]),
      line([['CRM', details.crm], ['UF', details.doctorUf]]),
      line([['LOCAL DE ATENDIMENTO', details.serviceName], ['CNES', details.cnes]]),
      line([['ENDEREÇO', details.address], ['BAIRRO', details.neighborhood]]),
      line([['CIDADE', details.city], ['UF', details.serviceUf], ['TELEFONE', details.phone]])
    ].filter(Boolean);
    const iso = provided(details.issuedAt);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '__/__/____';
    const needsIdentification = !provided(details.doctorName) || !provided(details.crm) || !provided(details.doctorUf);
    const footer = `DATA DE EMISSÃO: ${date}\n\n${optional.length ? `${optional.join('\n')}\n\n` : ''}________________________________________\nASSINATURA DO(A) MÉDICO(A)${needsIdentification ? '\nNOME E CRM/UF: __________________________' : ''}`;
    return { title, intro, body, footer };
  }
  function format(items, patient = '', details = {}) { return Object.values(formatSections(items, patient, details)).join(''); }
  ns.prescription = { createItem, updateItem, upsert, remove, format, formatSections, instruction, abbreviation, routeName };
})();
