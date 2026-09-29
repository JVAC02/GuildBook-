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
  let conditions = [];
  let clinicalIndex = { medicationsByCondition: {}, calculatorsByCondition: {} };
  let calculators = [];
  const cache = new Map();
  const inline = globalThis.__GB_DATA__;
  const data = async path => inline ? inline[path] : (await fetch(path)).json();

  function resetChoice() {
    Object.assign(state, { chosenUnits: '', days: '', mode: 'none', packSize: '', manualQuantity: '', showDispenseOptions: false });
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
  function toast(message) { const box = document.querySelector('#toast'); if (!box) return; box.textContent = message; box.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => box.classList.remove('visible'), 2800); }
  function listingItems() {
    let items = catalog;
    if (state.view === 'favorites') items = items.filter(item => core.favorites.has(item.id));
    return core.medication.search(items, state.query);
  }
  function cards() {
    const items = listingItems();
    return items.length ? items.map(item => ui.medicationCard(item, core.favorites.has(item.id))).join('') : state.query && hasClinicalMatches() ? '' : `<div class="empty">${state.view === 'favorites' && !state.query ? 'Nenhum favorito ainda. Toque na estrela de um medicamento para salvá-lo.' : 'Nenhum medicamento encontrado.'}</div>`;
  }
  function conditionMatches() { return state.view === 'favorites' ? [] : core.clinicalAssociation.searchConditions(conditions, state.query); }
  function calculatorMatches() { return state.view === 'favorites' ? [] : core.clinicalAssociation.searchCalculators(calculators, state.query); }
  function hasClinicalMatches() { return conditionMatches().length > 0 || calculatorMatches().length > 0; }
  function clinicalResults() {
    const conditionResults = conditionMatches();
    const calculatorResults = calculatorMatches();
    const conditionsHtml = conditionResults.length ? `<section class="condition-results" aria-label="Condições encontradas"><div class="section-kicker">CONDIÇÕES E ÍNDICES</div><div class="condition-result-grid">${conditionResults.map(ui.clinicalConditionCard).join('')}</div></section>` : '';
    const calculatorsHtml = calculatorResults.length ? `<section class="condition-results" aria-label="Ferramentas encontradas"><div class="section-kicker">FERRAMENTAS</div><div class="tool-grid">${calculatorResults.map(ui.calculatorCard).join('')}</div></section>` : '';
    return conditionsHtml + calculatorsHtml;
  }
  function renderListing() {
    const home = state.view === 'home';
    const hero = home ? `<section class="hero"><div class="hero-content"><div class="eyebrow">CONSULTA RÁPIDA · APRESENTAÇÃO POR APRESENTAÇÃO</div><h1>Informação clínica<br>na medida certa.</h1><p>Encontre o medicamento, escolha a apresentação e veja apenas o esquema correspondente.</p><div class="search-wrap"><input id="search" class="search-input" type="search" placeholder="Buscar medicamento, condição ou sigla..." autocomplete="off" value="${ui.escape(state.query)}" aria-label="Buscar medicamento ou condição"></div><div class="home-actions"><button data-view="medications">Medicamentos</button><button data-view="favorites">Favoritos</button></div></div></section>` : `<div class="breadcrumbs"><button data-view="home">Início</button><span>›</span><span>${state.view === 'favorites' ? 'Favoritos' : 'Medicamentos'}</span></div><h1 class="page-title">${state.view === 'favorites' ? 'Favoritos' : 'Medicamentos'}</h1><div class="search-wrap" style="margin-top:18px"><input id="search" class="search-input" type="search" placeholder="Buscar medicamento${state.view === 'favorites' ? '' : ', condição ou sigla'}..." value="${ui.escape(state.query)}" aria-label="Buscar medicamento${state.view === 'favorites' ? '' : ' ou condição'}"></div>`;
    const patientContext = `<div class="library-context"><div class="segment library-population" role="group" aria-label="Contexto da biblioteca"><button type="button" data-library-population="adult" class="${state.population === 'adult' ? 'active' : ''}" aria-pressed="${state.population === 'adult'}">Adulto</button><button type="button" data-library-population="pediatric" class="${state.population === 'pediatric' ? 'active' : ''}" aria-pressed="${state.population === 'pediatric'}">Pediatria</button></div>${state.population === 'pediatric' ? `<div class="patient-context-panel" id="patient-context"><strong>Contexto do paciente (pediatria)</strong><div class="patient-context-fields"><label for="patient-age-months"><span>Idade (meses)</span><input id="patient-age-months" type="number" min="0" step="1" inputmode="numeric" value="${ui.escape(state.ageMonths)}" placeholder="Ex.: 48"></label><label for="patient-weight-kg"><span>Peso (kg)</span><input id="patient-weight-kg" type="number" min="0.1" step="0.1" inputmode="decimal" value="${ui.escape(state.weightKg)}" placeholder="Ex.: 18"></label></div></div>` : ''}</div>`;
    const hideMedications = state.query && hasClinicalMatches() && !listingItems().length;
    shell(`${hero}<div id="clinical-results">${clinicalResults()}</div><div id="medication-results" ${hideMedications ? 'hidden' : ''}><div class="section-top"><div><div class="section-kicker">${state.view === 'favorites' ? 'SUA LISTA' : 'BIBLIOTECA CLÍNICA'}</div><h2>${home ? 'Medicamentos disponíveis' : state.view === 'favorites' ? 'Seus favoritos' : 'Escolha um medicamento'}</h2></div>${patientContext}<p>${catalog.length} ${catalog.length === 1 ? 'medicamento' : 'medicamentos'}</p></div><div class="med-grid" id="med-grid">${cards()}</div></div>`);
  }
  function renderCondition() {
    const condition = conditions.find(row => row.id === state.conditionId);
    if (!condition) return setView('home');
    const resources = core.clinicalAssociation.resourcesFor(condition.id, clinicalIndex, catalog, calculators);
    shell(`<div class="breadcrumbs"><button data-view="home">Início</button><span>›</span><span>${ui.escape(condition.name)}</span></div>${ui.clinicalCondition(condition, resources, id => core.favorites.has(id))}`);
  }
  function openCondition(id) {
    if (!conditions.some(row => row.id === id)) return;
    state.view = 'condition';
    state.conditionId = id;
    location.hash = `#condition/${id}`;
    renderCondition();
    window.scrollTo(0, 0);
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
    const d = dose();
    const row = r.dose;
    const choice = row.kind === 'weightBands' && d?.range ? `<label class="field" for="dose-units"><span class="field-label">Dose por tomada · ${ui.escape(row.unit)}</span><input id="dose-units" type="number" min="${d.range[0]}" max="${d.range[1]}" step="${row.unit === 'gotas' ? '1' : '0.05'}" value="${ui.escape(state.chosenUnits || d.units)}"><small>Faixa da bula: ${fmt(d.range[0])} a ${fmt(d.range[1])} ${ui.escape(row.unit)}.</small></label>` : '';
    return choice ? `<div class="controls-grid">${choice}</div>` : '';
  }
  function controls() {
    const p = selected(), r = regimen();
    if (p.context !== 'ambulatory' && r.population !== 'pediatric') return '';
    const duration = p.context === 'ambulatory' ? `<label class="field" for="duration"><span class="field-label">Duração em dias</span><input id="duration" type="number" min="1" max="${r.durationKind === 'max7' ? 7 : 365}" step="1" inputmode="numeric" value="${ui.escape(state.days)}"><small>${r.durationKind === 'max7' ? 'A bula limita o uso a 7 dias.' : 'Defina conforme o caso; nenhuma duração foi presumida.'}</small></label>` : '';
    return `<section class="card controls-card"><h2>${p.context === 'ambulatory' ? 'Ajustar prescrição' : 'Dados para o cálculo'}</h2><p>${p.context === 'ambulatory' ? 'Informe apenas o que altera o esquema ou a quantidade.' : 'Preencha somente o necessário para calcular a dose desta apresentação.'}</p>${doseControls()}${duration}<div id="quantity-output"></div>${p.context === 'ambulatory' ? '<button type="button" id="add-builder" class="primary-button">+ Adicionar ao montador</button>' : ''}</section>`;
  }
  function selectedSources() {
    const p = selected();
    const sourceIds = state.population === 'pediatric' && p.pediatric?.sourceIds?.length ? p.pediatric.sourceIds : p.sourceIds;
    return medicine().sources.filter(source => sourceIds.includes(source.id)).map(source => `<li><a href="${ui.escape(source.url)}" target="_blank" rel="noopener noreferrer">${ui.escape(source.label)} ↗</a></li>`).join('');
  }
  function renderMedicine() {
    const m = medicine(), p = selected();
    if (!m || !p) return;
    const fav = core.favorites.has(m.id);
    shell(`<div class="breadcrumbs"><button data-view="home">Início</button><span>›</span><button data-view="medications">Medicamentos</button><span>›</span><span>${ui.escape(m.name)}</span></div><div class="medicine-heading"><div><div class="section-kicker">${ui.escape(m.category.toUpperCase())}</div><h1>${ui.escape(m.name)}</h1><p>${ui.escape(m.class)} · Escolha a forma e a concentração antes de prescrever</p>${patientContextIndicator()}</div><button class="heading-fav" data-favorite="${m.id}" aria-pressed="${fav}"><span>${fav ? '★' : '☆'}</span> Favorito</button></div><div class="medicine-layout"><div class="left-stack"><div class="card">${ui.medicationSelector(m, p, state.population, patientValues())}</div><aside class="card meta-card"><h3>Apresentação selecionada</h3><div class="meta-line"><span>Forma</span><strong>${ui.escape(p.form)}</strong></div><div class="meta-line"><span>Concentração</span><strong>${ui.escape(p.concentration)}</strong></div><div class="meta-line"><span>Liberação</span><strong>${ui.escape(p.releaseType)}</strong></div><div class="meta-line"><span>Contexto</span><strong>${ui.escape(contextLabel(p.context))}</strong></div></aside></div><div class="right-stack"><section class="card clinical-card" id="clinical-output"></section>${controls()}<details class="accordion"><summary>Contraindicações, ajustes e cuidados</summary><div class="accordion-content"><ul>${m.safety.map(item => `<li>${ui.escape(item)}</li>`).join('')}</ul></div></details><details class="accordion"><summary>Fontes e revisão clínica</summary><div class="accordion-content"><p>Fonte vinculada à apresentação selecionada. Verifique a bula vigente antes do uso.</p><ul>${selectedSources()}</ul></div></details></div></div>`);
    renderDynamic();
  }
  function renderDynamic() {
    if (state.view !== 'medicine') return;
    const p = selected(), r = regimen(), d = dose();
    const clinical = document.querySelector('#clinical-output');
    const doseText = d ? d.mg == null ? 'Conforme área tratada' : `${fmt(d.mg)} mg${['gotas', 'mL'].includes(d.unit) || r.dose.kind === 'perKg' ? ` · ${core.quantity.measure(d.units, d.unit)}` : ''}` : missingDoseText();
    const intervalText = r.intervalHours ? (r.quantityKind === 'maximum' ? `Até ${24 / r.intervalHours} vezes/dia` : r.intervalHours === 24 ? '1 vez ao dia' : `A cada ${r.intervalHours} h`) : r.intervalText;
    clinical.innerHTML = `<div class="section-kicker">${ui.escape(contextLabel(p.context).toUpperCase())}</div><h2>Esquema da apresentação</h2><div class="clinical-grid"><div class="clinical-cell"><span>Via</span><strong>${ui.escape(p.route)}</strong></div><div class="clinical-cell"><span>Dose</span><strong>${ui.escape(doseText)}</strong></div><div class="clinical-cell"><span>Intervalo</span><strong>${ui.escape(intervalText)}</strong></div><div class="clinical-cell"><span>População</span><strong>${state.population === 'adult' ? 'Adulto' : 'Pediatria'}</strong></div></div><div class="clinical-detail"><b>Dose máxima</b><span>${ui.escape(r.maxDoseText)}</span></div>${d && r.dose.kind === 'ageWeightDrops' && Number(state.ageMonths) < r.dose.fixedFromMonths ? `<div class="clinical-detail"><b>Dose de referência</b><span>${fmt(r.dose.unitsPerKg)} gota/kg/dose · ${fmt(r.dose.unitsPerKg * r.dose.mgPerUnit)} mg/kg/dose</span></div>` : ''}${d?.volumeMl && d.unit === 'gotas' ? `<div class="clinical-detail"><b>Volume / concentração</b><span>${fmt(d.volumeMl)} mL por dose · ${ui.escape(p.concentration)}</span></div>` : ''}${d?.range ? `<div class="clinical-detail"><b>Faixa por peso</b><span>${fmt(d.range[0])}–${fmt(d.range[1])} ${ui.escape(d.unit)} por dose</span></div>` : ''}${p.preparation ? `<div class="note"><b>Preparo / administração</b><br>${ui.escape(p.preparation)}</div>` : ''}${p.context !== 'ambulatory' ? '<div class="note">Administração em serviço de saúde; a duração e a quantidade dependem da avaliação assistencial.</div>' : ''}`;
    const out = document.querySelector('#quantity-output');
    if (out) out.innerHTML = quantityHtml();
    if (p.context === 'ambulatory') {
      const days = Number(state.days);
      const validDays = state.days === '' || (Number.isInteger(days) && days > 0 && days <= (r.durationKind === 'max7' ? 7 : 365));
      document.querySelector('#add-builder').disabled = !d || !validDays || !dispensing();
    }
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
    state.view = view;
    state.query = '';
    state.medicineId = null;
    location.hash = view === 'home' ? '#home' : `#${view}`;
    if (view === 'builder') renderBuilder(); else renderListing();
    window.scrollTo(0, 0);
  }
  async function openMedicine(id, presentationId, population) {
    const m = await loadMedicine(id);
    if (!m) return;
    if (population === 'adult' || population === 'pediatric') { state.population = population; savePatientContext(); }
    const available = core.medication.presentationsForPopulation(m, state.population, patientValues());
    if (!available.length) { state.view = 'medications'; location.hash = '#medications'; renderListing(); toast('Nenhuma apresentação confirmada para este contexto'); return; }
    state.view = 'medicine';
    state.medicineId = id;
    state.presentationId = available.some(item => item.id === presentationId) ? presentationId : available[0].id;
    resetChoice();
    location.hash = `#medicine/${id}/${state.presentationId}/${state.population}`;
    renderMedicine();
    window.scrollTo(0, 0);
  }
  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] === 'medicine' && catalog.some(item => item.id === parts[1])) return openMedicine(parts[1], parts[2], parts[3]);
    if (parts[0] === 'condition' && conditions.some(item => item.id === parts[1])) return openCondition(parts[1]);
    state.view = ['medications', 'favorites', 'builder'].includes(parts[0]) ? parts[0] : 'home';
    state.medicineId = null;
    if (state.view === 'builder') renderBuilder(); else renderListing();
  }
  root.addEventListener('click', async event => {
    const view = event.target.closest('[data-view]');
    if (view) return setView(view.dataset.view);
    const open = event.target.closest('[data-open]');
    if (open) return openMedicine(open.dataset.open);
    const condition = event.target.closest('[data-condition]');
    if (condition) return openCondition(condition.dataset.condition);
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) { core.favorites.toggle(favorite.dataset.favorite); return state.view === 'medicine' ? renderMedicine() : state.view === 'condition' ? renderCondition() : renderListing(); }
    const pop = event.target.closest('[data-library-population]');
    if (pop) { state.population = pop.dataset.libraryPopulation; savePatientContext(); return renderListing(); }
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
    if (event.target.id === 'search') { state.query = event.target.value; document.querySelector('#clinical-results').innerHTML = clinicalResults(); document.querySelector('#med-grid').innerHTML = cards(); document.querySelector('#medication-results').hidden = !!state.query && hasClinicalMatches() && listingItems().length === 0; }
    if (event.target.id === 'duration') { state.days = event.target.value; if (state.mode !== 'manual') { state.mode = 'none'; state.packSize = ''; state.showDispenseOptions = false; } renderDynamic(); }
    if (event.target.id === 'patient-age-months') { state.ageMonths = event.target.value; savePatientContext(); }
    if (event.target.id === 'patient-weight-kg') { state.weightKg = event.target.value; savePatientContext(); }
    if (event.target.id === 'dose-units') { state.chosenUnits = event.target.value; renderDynamic(); }
    if (event.target.id === 'manual-quantity') { state.manualQuantity = event.target.value; state.mode = 'manual'; document.querySelector('#add-builder').disabled = !dispensing(); }
    if (event.target.id === 'patient-name') { state.patientName = event.target.value; renderPreview(); }
    if (event.target.dataset.issuer) { state.printDetails[event.target.dataset.issuer] = event.target.value; renderPreview(); }
  });
  root.addEventListener('change', event => {
    if (event.target.id === 'presentation') return openMedicine(state.medicineId, event.target.value);
    if (event.target.name === 'dispense') { state.mode = event.target.value; state.packSize = event.target.dataset.packageSize || ''; return renderDynamic(); }
    if (event.target.id === 'manual-quantity') return renderDynamic();
  });
  window.addEventListener('hashchange', () => {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] === 'medicine' && state.view === 'medicine' && parts[1] === state.medicineId && parts[2] === state.presentationId && parts[3] === state.population) return;
    if (parts[0] !== state.view || (parts[0] === 'medicine' && (parts[2] !== state.presentationId || parts[3] !== state.population)) || (parts[0] === 'condition' && parts[1] !== state.conditionId)) route();
  });
  (async () => {
    [catalog, conditions, clinicalIndex, calculators] = await Promise.all([
      data('data/medicines/index.json'),
      data('data/clinical/conditions.json'),
      data('data/clinical/index.json'),
      data('data/calculators/index.json'),
    ]);
    route();
  })().catch(error => { console.error(error); root.innerHTML = '<main class="page"><h1>Não foi possível carregar o catálogo</h1><p>Abra o arquivo standalone ou use a prévia local.</p></main>'; });
})();



