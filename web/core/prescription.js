(() => {
  const ns = globalThis.GuildBookCore ||= {};
  const number = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  const abbreviation = unit => ns.quantity.abbreviation(unit).toUpperCase();
  const routeName = route => ({ oral: 'USO ORAL', tópica: 'USO TÓPICO', intramuscular: 'USO INTRAMUSCULAR', intravenosa: 'USO INTRAVENOSO', inalatória: 'USO INALATÓRIO', nasal: 'USO NASAL', oftálmica: 'USO OFTÁLMICO', otológica: 'USO OTOLÓGICO', vaginal: 'USO VAGINAL' })[route] || `USO ${route.toUpperCase()}`;
  const doseAmount = value => number(value);
  function instruction(item) {
    const asNeeded = item.intervalText.endsWith(', se necessário');
    let interval = asNeeded ? item.intervalText.slice(0, -', se necessário'.length) : item.intervalText;
    interval = interval.replace(/^a cada (\d+) horas?/, (_, hours) => `de ${hours}/${hours}h`).replace(/^uma vez ao dia/, '1 vez ao dia');
    const use = item.route === 'tópica'
      ? `Aplicar na área afetada ${interval}`
      : `${item.verb} ${doseAmount(item.dose.units)} ${abbreviation(item.dose.unit)} ${interval}`;
    return `${use}${item.durationDays && item.durationPurpose !== 'quantity' ? ` por ${item.durationDays} ${item.durationDays === 1 ? 'dia' : 'dias'}` : ''}${asNeeded ? ` se ${item.asNeededReason || 'necessário'}` : ''}.`.toUpperCase();
  }
  function createItem({ medicine, presentation, regimen, dose, days, dispensing }) {
    if (!medicine || !presentation || !regimen || !dose || presentation.context !== 'ambulatory' || !dispensing || !(dispensing.quantity > 0)) return null;
    const durationDays = Number.isInteger(Number(days)) && Number(days) > 0 && Number(days) <= (regimen.durationKind === 'max7' ? 7 : 365) ? Number(days) : null;
    const item = {
      key: `${medicine.id}/${presentation.id}/${regimen.id}`, medicineId: medicine.id, medicineName: medicine.name,
      presentationId: presentation.id, regimenId: regimen.id, population: regimen.population,
      label: presentation.label, concentration: presentation.concentration, form: presentation.form,
      route: presentation.route, dose: { units: dose.units, unit: dose.unit, mg: dose.mg, volumeMl: dose.volumeMl ?? null },
      intervalText: regimen.intervalText, intervalHours: regimen.intervalHours ?? null,
      durationKind: regimen.durationKind, quantityKind: regimen.quantityKind, verb: regimen.verb || 'Tomar',
      asNeededReason: regimen.asNeededReason || null, durationPurpose: regimen.durationPurpose || 'treatment',
      durationDays, quantity: dispensing.quantity, quantityUnit: dispensing.unit, quantityText: dispensing.text,
      quantityMethod: dispensing.method, packageSizes: presentation.packageSizes || [], packageUnit: presentation.packageUnit || null,
      packageSizeUnit: presentation.packageSizeUnit || null, quantityPolicy: presentation.quantityPolicy || null,
      canFractionate: presentation.canFractionate === true
    };
    item.instruction = instruction(item);
    return item;
  }
  function updateItem(item, { days, quantity }) {
    const durationDays = Number.isInteger(Number(days)) && Number(days) > 0 && Number(days) <= (item.durationKind === 'max7' ? 7 : 365) ? Number(days) : null;
    const presentation = { packageSizes: item.packageSizes || [], packageUnit: item.packageUnit, packageSizeUnit: item.packageSizeUnit, quantityPolicy: item.quantityPolicy, canFractionate: item.canFractionate };
    const regimen = { quantityKind: item.quantityKind, intervalHours: item.intervalHours, durationKind: item.durationKind };
    const plan = ns.quantity.plan({ presentation, regimen, dose: item.dose, days: durationDays });
    const dispensing = quantity !== '' ? ns.quantity.select(plan, { kind: 'manual', amount: Number(quantity) }) : durationDays ? ns.quantity.select(plan, { kind: 'suggested' }) : item.quantityMethod === 'confirmed-package' ? { quantity: item.quantity, unit: item.quantityUnit, text: item.quantityText, method: item.quantityMethod } : null;
    if (!dispensing) return null;
    const updated = { ...item, durationDays, quantity: dispensing.quantity, quantityUnit: dispensing.unit, quantityText: dispensing.text, quantityMethod: dispensing.method };
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
    return item.label.split(' — ')[0];
  }
  function formatSections(items, patient = '', details = {}) {
    const title = 'RECEITUÁRIO SIMPLES\n\n';
    const intro = `PACIENTE: ${patient.trim() || '________________________________'}\n\nPRESCRIÇÃO:\n\n`;
    const parts = [];
    const routes = [...new Set(items.map(item => item.route))];
    for (const route of routes) {
      parts.push(routeName(route), '');
      items.filter(item => item.route === route).forEach((item, index) => {
        const amount = item.quantityText || (item.quantity == null ? 'QUANTIDADE PENDENTE' : ns.quantity.measure(item.quantity, item.quantityUnit));
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
  ns.prescription = { createItem, updateItem, upsert, remove, format, formatSections, instruction, abbreviation, routeName, prescriptionName };
})();
