(() => {
  const core = globalThis.GuildBookCore;
  const ui = globalThis.GuildBookUI;
  const root = document.querySelector('#app');
  const fmt = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  const builderKey = 'guildbook-v7-prescription-builder';
  const patientContextKey = 'guildbook-v7-patient-context';
  const savedItems = core.storage.get(builderKey, []);
  const savedContext = core.storage.get(patientContextKey, {});
  const state = { view: 'home', medicineId: null, presentationId: null, population: savedContext?.population === 'pediatric' ? 'pediatric' : 'adult', query: '', ageMonths: String(savedContext?.ageMonths ?? ''), weightKg: String(savedContext?.weightKg ?? ''), chosenUnits: '', days: '', mode: 'none', packSize: '', manualQuantity: '', showDispenseOptions: false, items: Array.isArray(savedItems) ? savedItems.filter(item => item && typeof item.key === 'string' && typeof item.instruction === 'string') : [], patientName: '', printDetails: {}, editIndex: null };
  let catalog = [];
  const cache = new Map();
  const drafts = new Map();
  const rememberedSelections = new Map();
  let openRequest = 0;
  const inline = globalThis.__GB_DATA__;
  const data = async path => inline ? inline[path] : (await fetch(path)).json();

  function resetChoice() {
    Object.assign(state, { chosenUnits: '', days: '', mode: 'none', packSize: '', manualQuantity: '', showDispenseOptions: false });
  }
  const choiceFields = ['chosenUnits', 'days', 'mode', 'packSize', 'manualQuantity', 'showDispenseOptions'];
  function draftKey() { return state.presentationId ? `${state.medicineId}/${state.presentationId}/${state.population}` : null; }
  function saveChoice() {
    const key = draftKey();
    if (key) {
      drafts.set(key, Object.fromEntries(choiceFields.map(field => [field, state[field]])));
      rememberedSelections.set(`${state.medicineId}/${state.population}`, state.presentationId);
    }
  }
  function restoreChoice() { resetChoice(); Object.assign(state, drafts.get(draftKey()) || {}); }
  function focusedControl() {
    const element = document.activeElement;
    if (!root.contains(element)) return null;
    if (element.id) return `#${CSS.escape(element.id)}`;
    for (const attribute of ['data-open', 'data-presentation', 'data-library-population']) {
      if (element.hasAttribute(attribute)) return `[${attribute}="${CSS.escape(element.getAttribute(attribute))}"]`;
    }
    return null;
  }
  function restoreFocus(selector) { if (selector) root.querySelector(selector)?.focus({ preventScroll: true }); }
  function refreshCards() {
    const focus = focusedControl();
    const grid = document.querySelector('#med-grid');
    if (grid) { grid.innerHTML = cards(); renderDynamic(); }
    restoreFocus(focus);
  }
  function revalidateSelection() {
    const m = medicine();
    if (m && state.presentationId && !core.medication.presentationsForPopulation(m, state.population, patientValues()).some(p => p.id === state.presentationId)) {
      saveChoice(); state.presentationId = null; resetChoice();
    }
  }
  function savePatientContext() { core.storage.set(patientContextKey, { population: state.population, ageMonths: state.ageMonths, weightKg: state.weightKg }); }
  function patientValues() { return { ageMonths: state.ageMonths === '' ? undefined : Number(state.ageMonths), weightKg: state.weightKg === '' ? undefined : Number(state.weightKg) }; }
  function patientContextIndicator() {
    if (state.population !== 'pediatric') return '<span class="patient-context-indicator">Adulto</span>';
    const age = state.ageMonths !== '' && Number.isInteger(Number(state.ageMonths)) && Number(state.ageMonths) >= 0 ? Number(state.ageMonths) : null;
    const ageText = age === null ? '' : age >= 12 && age % 12 === 0 ? `${age / 12} ${age === 12 ? 'ano' : 'anos'}` : `${age} ${age === 1 ? 'mês' : 'meses'}`;
    const weightText = state.weightKg !== '' && Number(state.weightKg) > 0 ? `${fmt(Number(state.weightKg))} kg` : '';
    return `<span class="patient-context-indicator">Pediatria${ageText ? ` · ${ageText}` : ''}${weightText ? ` · ${weightText}` : ''}</span>`;
  }
  function contextLabel(context) { return ({ ambulatory: 'Receituário ambulatorial', urgent: 'Uso assistencial', hospital: 'Uso hospitalar' })[context]; }
  function navButton(view, label, icon) { return `<button type="button" data-view="${view}" class="${state.view === view ? 'active' : ''}"><span>${icon}</span>${label}${view === 'builder' ? `<span class="builder-count" ${state.items.length ? '' : 'hidden'}>${state.items.length}</span>` : ''}</button>`; }
  function shell(content) {
    root.innerHTML = `<header class="site-header"><div class="header-inner"><button type="button" class="brand" data-view="home"><span class="brand-mark">✚</span><span>GuildBook</span><span class="brand-core">CORE V7</span></button><nav class="desktop-nav" aria-label="Navegação principal">${navButton('home', 'Início', '')}${navButton('medications', 'Medicamentos', '')}${navButton('builder', 'Montador de Prescrição', '')}${navButton('favorites', 'Favoritos', '')}</nav><div class="header-right">REFERÊNCIA CLÍNICA</div></div></header><main class="page" id="content">${content}</main><footer class="footer">GuildBook Core v7 · Confirme sempre o contexto clínico e a bula da apresentação selecionada.</footer><nav class="mobile-nav" aria-label="Navegação móvel">${navButton('home', 'Início', '⌂')}${navButton('medications', 'Medicamentos', '▤')}${navButton('builder', 'Montador', '☷')}${navButton('favorites', 'Favoritos', '☆')}</nav><div id="toast" role="status" aria-live="polite"></div>`;
  }
  function saveItems() { core.storage.set(builderKey, state.items); document.querySelectorAll('.builder-count').forEach(badge => { badge.textContent = String(state.items.length); badge.hidden = state.items.length === 0; }); }
  async function restoreSavedItems() {
    state.items = await Promise.all(state.items.map(async item => {
      const m = await loadMedicine(item.medicineId);
      const p = m && core.medication.presentation(m, item.presentationId);
      const r = p && core.medication.regimen(p, item.population, item.regimenId);
      if (!r || !item.dose || !(item.quantity > 0)) return item;
      const plan = core.quantity.plan({ presentation: p, regimen: r, dose: item.dose, days: item.durationDays });
      const kind = item.quantityMethod === 'automatic' ? 'suggested' : item.quantityMethod === 'confirmed-package' ? 'package' : 'manual';
      const known = core.quantity.select(plan, { kind, size: item.quantity, amount: item.quantity });
      const dispensing = known?.quantity === item.quantity ? known : { quantity: item.quantity, unit: item.quantityUnit, text: core.quantity.measure(item.quantity, item.quantityUnit), method: item.quantityMethod };
      return core.prescription.createItem({ medicine: m, presentation: p, regimen: r, dose: item.dose, days: item.durationDays, dispensing }) || item;
    }));
    if (state.items.length) saveItems();
  }
  function toast(message) { const box = document.querySelector('#toast'); if (!box) return; box.textContent = message; box.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => box.classList.remove('visible'), 2800); }
  function listingItems() {
    let items = catalog;
    if (state.view === 'favorites') items = items.filter(item => core.favorites.has(item.id));
    return core.medication.search(items, state.query);
  }
  function cards() {
    const items = listingItems();
    return items.length ? items.map(item => ui.medicationCard(item, core.favorites.has(item.id), {
      expanded: state.medicineId === item.id,
      content: state.medicineId === item.id ? expandedMedicine() : ''
    })).join('') : `<div class="empty">${state.view === 'favorites' && !state.query ? 'Nenhum favorito ainda. Toque na estrela de um medicamento para salvá-lo.' : 'Nenhum medicamento encontrado.'}</div>`;
  }
  function renderListing() {
    const focus = focusedControl();
    const favorite = state.view === 'favorites';
    const patientContext = `<div class="segment library-population" role="group" aria-label="Contexto da biblioteca"><button type="button" data-library-population="adult" class="${state.population === 'adult' ? 'active' : ''}" aria-pressed="${state.population === 'adult'}">Adulto</button><button type="button" data-library-population="pediatric" class="${state.population === 'pediatric' ? 'active' : ''}" aria-pressed="${state.population === 'pediatric'}">Pediatria</button></div>`;
    const patientFields = state.population === 'pediatric' ? `<div class="patient-context-panel" id="patient-context"><div class="patient-context-fields"><label for="patient-age-months"><span>Idade (meses)</span><input id="patient-age-months" type="number" min="0" step="1" inputmode="numeric" value="${ui.escape(state.ageMonths)}"></label><label for="patient-weight-kg"><span>Peso (kg)</span><input id="patient-weight-kg" type="number" min="0.1" step="0.1" inputmode="decimal" value="${ui.escape(state.weightKg)}"></label></div></div>` : '';
    shell(`<section class="compact-library"><div class="library-heading"><div><div class="section-kicker">BIBLIOTECA</div><h1 class="page-title">${favorite ? 'Favoritos' : 'Medicamentos'}</h1></div>${patientContext}</div><div class="search-wrap"><input id="search" class="search-input" type="search" placeholder="Buscar medicamento ou nome comercial" autocomplete="off" value="${ui.escape(state.query)}" aria-label="Buscar medicamento"></div>${patientFields}<div class="library-caption"><span>${catalog.length} medicamentos</span><span>Selecione para ver as apresentações</span></div><div class="med-grid" id="med-grid">${cards()}</div></section>`);
    renderDynamic();
    restoreFocus(focus);
  }
  async function loadMedicine(id) {
    if (!cache.has(id)) {
      const info = catalog.find(item => item.id === id);
      if (!info) return null;
      cache.set(id, await data(`data/medicines/${info.file}`));
    }
    return cache.get(id);
  }
  function medicine() { return cache.get(state.medicineId); }
  function selected() { return core.medication.presentation(medicine(), state.presentationId); }
  function regimen() { return core.medication.regimen(selected(), state.population); }
  function dose() {
    const r = regimen();
    if (!r) return null;
    if (r.population === 'pediatric') return core.pediatric.resolve(r, { ...patientValues(), chosenUnits: state.chosenUnits === '' ? undefined : Number(state.chosenUnits) }, selected());
    if (r.dose.kind === 'fixed') return r.dose;
    if (r.dose.kind === 'topical') return { units: 0, unit: 'g', mg: null };
    return null;
  }
  function missingDoseText() {
    const row = regimen().dose;
    const pediatric = selected().pediatric || {};
    if (state.ageMonths === '' && (row.minAgeMonths != null || row.maxAgeMonths != null || pediatric.minAgeMonths != null || pediatric.maxAgeMonths != null || row.kind === 'ageWeightDrops')) return 'Informe a idade no contexto do paciente.';
    if (state.weightKg === '' && (row.kind === 'weightBands' || row.kind === 'perKg' || pediatric.minWeightKg != null || pediatric.maxWeightKg != null || (row.kind === 'ageWeightDrops' && Number(state.ageMonths) < row.fixedFromMonths))) return 'Informe o peso no contexto do paciente.';
    return 'Confira idade e peso no contexto do paciente para esta apresentação.';
  }
  function quantityPlan() { return core.quantity.plan({ presentation: selected(), regimen: regimen(), dose: dose(), days: state.days }); }
  function dispensing() {
    const plan = quantityPlan();
    const kind = state.mode === 'none' && plan.required != null ? 'suggested' : state.mode;
    return core.quantity.select(plan, { kind, size: Number(state.packSize), amount: state.manualQuantity === '' ? NaN : Number(state.manualQuantity) });
  }
  function doseControls() {
    const r = regimen();
    if (r.population !== 'pediatric') return '';
    const d = dose() || core.pediatric.resolve(r, patientValues(), selected());
    const row = r.dose;
    const choice = row.kind === 'weightBands' && d?.range ? `<label class="field" for="dose-units"><span class="field-label">Dose por tomada · ${ui.escape(row.unit)}</span><input id="dose-units" type="number" min="${d.range[0]}" max="${d.range[1]}" step="${row.unit === 'gotas' ? '1' : '0.05'}" value="${ui.escape(state.chosenUnits || d.units)}"><small>Faixa da bula: ${fmt(d.range[0])} a ${fmt(d.range[1])} ${ui.escape(row.unit)}.</small></label>` : '';
    return choice ? `<div class="controls-grid">${choice}</div>` : '';
  }
  function controls() {
    const p = selected(), r = regimen();
    const duration = p.context === 'ambulatory' ? `<label class="field" for="duration"><span class="field-label">${r.durationPurpose === 'quantity' ? 'Período para cálculo (dias)' : 'Duração (dias)'}</span><input id="duration" type="number" min="1" max="${r.durationKind === 'max7' ? 7 : 365}" step="1" inputmode="numeric" placeholder="Não definida" value="${ui.escape(state.days)}"></label>` : '';
    return `<div class="compact-controls">${doseControls()}<div class="compact-fields">${duration}<div id="quantity-output"></div></div>${p.context === 'ambulatory' ? '<div class="inline-preview-heading">PRÉVIA</div><pre id="inline-preview" aria-live="polite"></pre><button type="button" id="add-builder" class="primary-button">Adicionar ao montador</button>' : ''}</div>`;
  }
  function selectedSources() {
    const p = selected();
    const sourceIds = state.population === 'pediatric' && p.pediatric?.sourceIds?.length ? p.pediatric.sourceIds : p.sourceIds;
    return medicine().sources.filter(source => sourceIds.includes(source.id)).map(source => `<li><a href="${ui.escape(source.url)}" target="_blank" rel="noopener noreferrer">${ui.escape(source.label)} ↗</a></li>`).join('');
  }
  function expandedMedicine() {
    const m = medicine();
    if (!m) return '';
    const p = state.presentationId ? selected() : null;
    const sources = p ? selectedSources() : m.sources.map(source => `<li><a href="${ui.escape(source.url)}" target="_blank" rel="noopener noreferrer">${ui.escape(source.label)}</a></li>`).join('');
    return `<div class="med-expanded" id="expanded-${ui.escape(m.id)}">${ui.medicationSelector(m, p, state.population, patientValues())}${p ? `<div class="compact-editor"><div id="clinical-output"></div>${controls()}</div>` : ''}<details class="accordion"><summary>Segurança e fontes</summary><div class="accordion-content">${p ? `<p>${ui.escape(p.form)} · Concentração: ${ui.escape(p.concentration)} · Liberação ${ui.escape(p.releaseType)} · ${ui.escape(contextLabel(p.context))}</p>` : ''}<ul>${m.safety.map(item => `<li>${ui.escape(item)}</li>`).join('')}</ul><ul>${sources}</ul></div></details></div>`;
  }
  function renderInlinePreview() {
    const out = document.querySelector('#inline-preview');
    if (!out) return;
    const p = selected(), r = regimen(), d = dose();
    const validDays = state.days === '' || Number.isInteger(Number(state.days)) && Number(state.days) > 0 && Number(state.days) <= (r.durationKind === 'max7' ? 7 : 365);
    const amount = dispensing();
    document.querySelector('#add-builder').disabled = !d || !validDays || !amount;
    if (!validDays) { out.textContent = `Informe um período inteiro entre 1 e ${r.durationKind === 'max7' ? 7 : 365} dias.`; return; }
    if (!d) { out.textContent = missingDoseText(); return; }
    const item = core.prescription.createItem({ medicine: medicine(), presentation: p, regimen: r, dose: d, days: state.days, dispensing: amount });
    if (item) out.textContent = core.prescription.formatSections([item]).body.trim();
    else {
      const instruction = core.prescription.instruction({ ...r, route: p.route, dose: d, durationDays: state.days ? Number(state.days) : null });
      out.textContent = `${core.prescription.routeName(p.route)}\n\n1. ${core.prescription.prescriptionName(p).toUpperCase()} -------- QUANTIDADE PENDENTE\n   ${instruction}`;
    }
  }
  function renderDynamic() {
    const focus = focusedControl();
    const clinical = document.querySelector('#clinical-output');
    if (!clinical || !state.presentationId) return;
    const p = selected(), r = regimen(), d = dose();
    const doseText = d ? d.mg == null ? 'Aplicar na área afetada' : `${core.quantity.measure(d.units, d.unit)} · ${fmt(d.mg)} mg` : missingDoseText();
    const interval = r.asNeededReason ? r.intervalText.replace('se necessário', `se ${r.asNeededReason}`) : r.intervalText;
    clinical.innerHTML = `<p class="compact-scheme"><strong>${ui.escape(doseText)}</strong><span> · ${ui.escape(interval)} · ${ui.escape(r.routeText)}</span></p><p class="helper">${ui.escape(r.maxDoseText)}</p>${d?.volumeMl && d.unit === 'gotas' ? `<p class="helper">${fmt(d.volumeMl)} mL por dose · ${ui.escape(p.concentration)}</p>` : ''}${d && r.dose.kind === 'ageWeightDrops' && Number(state.ageMonths) < r.dose.fixedFromMonths ? `<p class="helper">${fmt(r.dose.unitsPerKg * r.dose.mgPerUnit)} mg/kg/dose</p>` : ''}${p.context !== 'ambulatory' ? `<p class="helper">${ui.escape(contextLabel(p.context))}</p>` : ''}${d?.range ? `<p class="helper">Faixa por peso: ${fmt(d.range[0])}–${fmt(d.range[1])} ${ui.escape(d.unit)} por dose.</p>` : ''}${p.preparation ? `<p class="helper">${ui.escape(p.preparation)}</p>` : ''}${p.context !== 'ambulatory' ? '<p class="helper">Administração em serviço de saúde; duração e quantidade dependem da avaliação assistencial.</p>' : ''}`;
    const out = document.querySelector('#quantity-output');
    if (out) out.innerHTML = quantityHtml();
    renderInlinePreview();
    restoreFocus(focus);
  }
  function quantityHtml() {
    if (selected().context !== 'ambulatory') return '';
    if (!dose()) return `<p class="helper">${missingDoseText()}</p>`;
    return ui.dispensingView({ plan: quantityPlan(), selected: dispensing(), mode: state.mode, expanded: state.showDispenseOptions, manualQuantity: state.manualQuantity, packSize: state.packSize });
  }
  function issuerInput(id, key, label, type = 'text') {
    return `<label class="field" for="${id}"><span class="field-label">${label}</span><input id="${id}" data-issuer="${key}" type="${type}" autocomplete="off" value="${ui.escape(state.printDetails[key] || '')}"></label>`;
  }
  function previewHtml() {
    const sections = core.prescription.formatSections(state.items, state.patientName, state.printDetails);
    return Object.entries(sections).map(([name, value]) => `<span class="rx-${name}">${ui.escape(value)}</span>`).join('');
  }
  function renderPreview() { const preview = document.querySelector('#builder-preview'); if (preview) preview.innerHTML = previewHtml(); }
  function renderBuilder() {
    const items = state.items;
    const list = items.length ? items.map((item, index) => ui.builderItem(item, index, state.editIndex === index)).join('') : '<div class="empty">O montador está vazio. Escolha um medicamento para começar.</div>';
    const issuer = `<details class="accordion issuer-options" id="issuer-options"><summary>Dados opcionais do prescritor e atendimento</summary><div class="accordion-content issuer-grid">${issuerInput('issued-at', 'issuedAt', 'Data de emissão', 'date')}${issuerInput('doctor-name', 'doctorName', 'Nome do(a) médico(a)')}${issuerInput('doctor-crm', 'crm', 'CRM')}${issuerInput('doctor-uf', 'doctorUf', 'UF do CRM')}${issuerInput('service-name', 'serviceName', 'Local de atendimento')}${issuerInput('service-cnes', 'cnes', 'CNES')}${issuerInput('service-address', 'address', 'Endereço')}${issuerInput('service-neighborhood', 'neighborhood', 'Bairro')}${issuerInput('service-city', 'city', 'Cidade')}${issuerInput('service-uf', 'serviceUf', 'UF do atendimento')}${issuerInput('service-phone', 'phone', 'Telefone')}</div></details>`;
    const sheet = items.length ? `<section class="card builder-sheet" id="print-sheet"><div class="builder-sheet-heading">Pré-visualização do receituário</div><label class="field patient-field" for="patient-name"><span class="field-label">Paciente (opcional; não é salvo)</span><input id="patient-name" type="text" autocomplete="off" value="${ui.escape(state.patientName)}"></label>${issuer}<pre id="builder-preview" tabindex="0">${previewHtml()}</pre><small class="preview-scroll-hint">Deslize a prévia para ver a quantidade à direita.</small></section><div class="builder-actions"><button type="button" id="copy-builder" class="primary-button">Copiar prescrição</button><button type="button" id="print-builder" class="secondary-button">Imprimir</button><button type="button" id="clear-builder" class="text-button">Limpar prescrição</button><span id="builder-status" role="status"></span></div>` : '<button type="button" data-view="medications" class="primary-button">Buscar medicamentos</button>';
    shell(`<div class="breadcrumbs"><button data-view="home">Início</button><span>›</span><span>Montador de Prescrição</span></div><div class="builder-heading"><div><div class="section-kicker">RECEITUÁRIO</div><h1>Montador de Prescrição</h1><p>Revise as apresentações, a duração e a quantidade antes de copiar ou imprimir.</p></div><span class="builder-total">${items.length} ${items.length === 1 ? 'item' : 'itens'}</span></div><div class="builder-layout"><div class="builder-list">${list}</div>${sheet}</div>`);
  }
  function setView(view) {
    saveChoice();
    openRequest++;
    state.presentationId = null;
    state.view = view;
    state.query = '';
    state.medicineId = null;
    location.hash = view === 'home' ? '#home' : `#${view}`;
    if (view === 'builder') renderBuilder(); else renderListing();
    window.scrollTo(0, 0);
  }
  async function openMedicine(id, presentationId, population, toggle = false) {
    saveChoice();
    const request = ++openRequest;
    if (toggle && state.medicineId === id) { state.medicineId = null; state.presentationId = null; resetChoice(); refreshCards(); return; }
    const m = await loadMedicine(id);
    if (!m || request !== openRequest) return;
    if (population === 'adult' || population === 'pediatric') { state.population = population; savePatientContext(); }
    if (state.view === 'builder') state.view = 'medications';
    state.medicineId = id;
    const available = core.medication.presentationsForPopulation(m, state.population, patientValues());
    const wanted = presentationId || rememberedSelections.get(`${id}/${state.population}`);
    state.presentationId = available.some(p => p.id === wanted) ? wanted : null;
    restoreChoice();
    renderListing();
  }
  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] === 'medicine' && catalog.some(item => item.id === parts[1])) { state.view = 'medications'; return openMedicine(parts[1], parts[2], parts[3]); }
    openRequest++;
    saveChoice();
    state.presentationId = null;
    state.view = ['medications', 'favorites', 'builder'].includes(parts[0]) ? parts[0] : 'home';
    state.medicineId = null;
    if (state.view === 'builder') renderBuilder(); else renderListing();
  }
  root.addEventListener('click', async event => {
    const view = event.target.closest('[data-view]');
    if (view) return setView(view.dataset.view);
    const open = event.target.closest('[data-open]');
    if (open) return openMedicine(open.dataset.open, null, null, true);
    const presentation = event.target.closest('[data-presentation]');
    if (presentation) return openMedicine(state.medicineId, presentation.dataset.presentation);
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) { core.favorites.toggle(favorite.dataset.favorite); return renderListing(); }
    const pop = event.target.closest('[data-library-population]');
    if (pop) { saveChoice(); state.population = pop.dataset.libraryPopulation; savePatientContext(); const m = medicine(); if (m) { state.presentationId = rememberedSelections.get(`${m.id}/${state.population}`) || null; restoreChoice(); revalidateSelection(); } return renderListing(); }
    if (event.target.id === 'alter-quantity') { state.showDispenseOptions = true; return renderDynamic(); }
    if (event.target.id === 'add-builder') {
      const item = core.prescription.createItem({ medicine: medicine(), presentation: selected(), regimen: regimen(), dose: dose(), days: state.days || null, dispensing: dispensing() });
      if (!item) return toast('Confirme a quantidade a dispensar');
      const duplicate = state.items.some(existing => existing.key === item.key);
      state.items = core.prescription.upsert(state.items, item);
      saveItems();
      return toast(duplicate ? 'Atualizado no montador' : 'Adicionado ao montador');
    }
    const edit = event.target.closest('[data-edit-index]');
    if (edit) { state.editIndex = Number(edit.dataset.editIndex); return renderBuilder(); }
    const remove = event.target.closest('[data-remove-index]');
    if (remove) { state.items.splice(Number(remove.dataset.removeIndex), 1); state.editIndex = null; saveItems(); return renderBuilder(); }
    const save = event.target.closest('[data-save-index]');
    if (save) {
      const row = save.closest('.builder-item');
      const days = row.querySelector('input[name="days"]'), amount = row.querySelector('input[name="quantity"]');
      if ((days.value && !days.checkValidity()) || (amount.value && !amount.checkValidity())) return toast('Revise duração e quantidade');
      const index = Number(save.dataset.saveIndex);
      const updated = core.prescription.updateItem(state.items[index], { days: days.value, quantity: amount.value });
      if (!updated) return toast('Defina a quantidade a dispensar');
      state.items[index] = updated;
      state.editIndex = null; saveItems(); renderBuilder(); return toast('Item atualizado');
    }
    if (event.target.id === 'clear-builder') {
      if (!window.confirm('Limpar todos os itens da prescrição?')) return;
      state.items = []; state.editIndex = null; saveItems(); return renderBuilder();
    }
    if (event.target.id === 'copy-builder') {
      try { await navigator.clipboard.writeText(document.querySelector('#builder-preview').textContent); document.querySelector('#builder-status').textContent = 'Copiado'; }
      catch { document.querySelector('#builder-status').textContent = 'Selecione o texto para copiar'; }
    }
    if (event.target.id === 'print-builder') window.print();
  });
  root.addEventListener('input', event => {
    if (event.target.id === 'search') { saveChoice(); state.query = event.target.value; refreshCards(); }
    if (event.target.id === 'duration') { state.days = event.target.value; if (state.mode !== 'manual') { state.mode = 'none'; state.packSize = ''; state.showDispenseOptions = false; } renderDynamic(); }
    if (event.target.id === 'patient-age-months') { state.ageMonths = event.target.value; savePatientContext(); revalidateSelection(); refreshCards(); }
    if (event.target.id === 'patient-weight-kg') { state.weightKg = event.target.value; savePatientContext(); revalidateSelection(); refreshCards(); }
    if (event.target.id === 'dose-units') { state.chosenUnits = event.target.value; renderDynamic(); }
    if (event.target.id === 'manual-quantity') { state.manualQuantity = event.target.value; state.mode = 'manual'; renderInlinePreview(); }
    if (event.target.id === 'patient-name') { state.patientName = event.target.value; renderPreview(); }
    if (event.target.dataset.issuer) { state.printDetails[event.target.dataset.issuer] = event.target.value; renderPreview(); }
  });
  root.addEventListener('change', event => {
    if (event.target.id === 'dispense-choice') { const [mode, size] = event.target.value.split(':'); state.mode = mode; state.packSize = size || ''; return renderDynamic(); }
    if (event.target.name === 'dispense') { state.mode = event.target.value; state.packSize = event.target.dataset.packageSize || ''; return renderDynamic(); }
    if (event.target.id === 'manual-quantity') return renderDynamic();
  });
  window.addEventListener('hashchange', () => {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] === 'medicine' && parts[1] === state.medicineId && parts[2] === state.presentationId && parts[3] === state.population) return;
    if (parts[0] !== state.view || (parts[0] === 'medicine' && (parts[2] !== state.presentationId || parts[3] !== state.population))) route();
  });
  (async () => { catalog = await data('data/medicines/index.json'); await restoreSavedItems(); route(); })().catch(error => { console.error(error); root.innerHTML = '<main class="page"><h1>Não foi possível carregar o catálogo</h1><p>Abra o arquivo standalone ou use a prévia local.</p></main>'; });
})();



