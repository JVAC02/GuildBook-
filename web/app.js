(() => {
  const core = globalThis.GuildBookCore;
  const ui = globalThis.GuildBookUI;
  const root = document.querySelector('#app');
  const fmt = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  const unitLabel = (unit, amount) => amount === 1 ? unit : ({ 'cápsula': 'cápsulas', 'comprimido': 'comprimidos', 'gota': 'gotas', 'gotas': 'gotas' }[unit] || unit);
  const builderKey = 'guildbook-v7-prescription-builder';
  const savedItems = core.storage.get(builderKey, []);
  const state = { view: 'home', medicineId: null, presentationId: null, population: 'adult', query: '', ageMonths: '', weightKg: '', chosenUnits: '', days: '', mode: 'exact', packSize: '', manualQuantity: '', items: Array.isArray(savedItems) ? savedItems.filter(item => item && typeof item.key === 'string' && typeof item.instruction === 'string') : [], patientName: '', printDetails: {}, editIndex: null };
  let catalog = [];
  const cache = new Map();
  const inline = globalThis.__GB_DATA__;
  const data = async path => inline ? inline[path] : (await fetch(path)).json();

  function resetChoice() {
    Object.assign(state, { ageMonths: '', weightKg: '', chosenUnits: '', days: '', mode: 'exact', packSize: '', manualQuantity: '' });
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
    return items.length ? items.map(item => ui.medicationCard(item, core.favorites.has(item.id))).join('') : `<div class="empty">${state.view === 'favorites' && !state.query ? 'Nenhum favorito ainda. Toque na estrela de um medicamento para salvá-lo.' : 'Nenhum medicamento encontrado.'}</div>`;
  }
  function renderListing() {
    const home = state.view === 'home';
    const hero = home ? `<section class="hero"><div class="hero-content"><div class="eyebrow">CONSULTA RÁPIDA · APRESENTAÇÃO POR APRESENTAÇÃO</div><h1>Informação clínica<br>na medida certa.</h1><p>Encontre o medicamento, escolha a apresentação e veja apenas o esquema correspondente.</p><div class="search-wrap"><input id="search" class="search-input" type="search" placeholder="Buscar medicamento ou nome comercial..." autocomplete="off" value="${ui.escape(state.query)}" aria-label="Buscar medicamento"></div><div class="home-actions"><button data-view="medications">Medicamentos</button><button data-view="favorites">Favoritos</button></div></div></section>` : `<div class="breadcrumbs"><button data-view="home">Início</button><span>›</span><span>${state.view === 'favorites' ? 'Favoritos' : 'Medicamentos'}</span></div><h1 class="page-title">${state.view === 'favorites' ? 'Favoritos' : 'Medicamentos'}</h1><div class="search-wrap" style="margin-top:18px"><input id="search" class="search-input" type="search" placeholder="Buscar medicamento..." value="${ui.escape(state.query)}" aria-label="Buscar medicamento"></div>`;
    shell(`${hero}<div class="section-top"><div><div class="section-kicker">${state.view === 'favorites' ? 'SUA LISTA' : 'BIBLIOTECA CLÍNICA'}</div><h2>${home ? 'Medicamentos disponíveis' : state.view === 'favorites' ? 'Seus favoritos' : 'Escolha um medicamento'}</h2></div><p>2 medicamentos-modelo</p></div><div class="med-grid" id="med-grid">${cards()}</div>`);
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
    if (r.dose.kind === 'fixed') return r.dose;
    if (r.dose.kind === 'topical') return { units: 0, unit: 'g', mg: null };
    return core.pediatric.resolve(r, { weightKg: Number(state.weightKg), ageMonths: Number(state.ageMonths), chosenUnits: state.chosenUnits === '' ? undefined : Number(state.chosenUnits) });
  }
  function quantity() {
    const p = selected(), r = regimen(), d = dose();
    const days = Number(state.days);
    if (!d || !Number.isInteger(days) || days <= 0 || days > (r.durationKind === 'max7' ? 7 : 365) || p.context !== 'ambulatory' || r.quantityKind === 'variable') return null;
    const unitsPerMl = d.unit === 'gotas' ? d.units / d.volumeMl : undefined;
    const units = d.unit === 'gotas' ? d.units : d.units;
    return core.quantity.calculate({ units, unit: d.unit, unitsPerMl, intervalHours: r.intervalHours, days, packSize: Number(state.packSize || p.packageSizes[0]) });
  }
  function doseControls() {
    const r = regimen();
    if (r.population !== 'pediatric') return '';
    const d = dose();
    const row = r.dose;
    const age = `<label class="field" for="age"><span class="field-label">Idade em meses</span><input id="age" type="number" min="0" max="179" step="1" inputmode="numeric" value="${ui.escape(state.ageMonths)}"><small>A idade define se esta apresentação é aplicável.</small></label>`;
    const needsWeight = row.kind !== 'ageWeightDrops' || Number(state.ageMonths) < row.fixedFromMonths;
    const weight = needsWeight ? `<label class="field" for="weight"><span class="field-label">Peso em kg</span><input id="weight" type="number" min="0" step="0.1" inputmode="decimal" value="${ui.escape(state.weightKg)}"><small>Usado somente quando altera a dose desta apresentação.</small></label>` : '';
    const choice = row.kind === 'weightBands' && d?.range ? `<label class="field" for="dose-units"><span class="field-label">Dose por tomada · ${ui.escape(row.unit)}</span><input id="dose-units" type="number" min="${d.range[0]}" max="${d.range[1]}" step="${row.unit === 'gotas' ? '1' : '0.05'}" value="${ui.escape(state.chosenUnits || d.units)}"><small>Faixa da bula: ${fmt(d.range[0])} a ${fmt(d.range[1])} ${ui.escape(row.unit)}.</small></label>` : '';
    return `<div class="controls-grid">${age}${weight}${choice}</div>`;
  }
  function controls() {
    const p = selected(), r = regimen();
    if (p.context !== 'ambulatory' && r.population !== 'pediatric') return '';
    const duration = p.context === 'ambulatory' ? `<label class="field" for="duration"><span class="field-label">Duração em dias</span><input id="duration" type="number" min="1" max="${r.durationKind === 'max7' ? 7 : 365}" step="1" inputmode="numeric" value="${ui.escape(state.days)}"><small>${r.durationKind === 'max7' ? 'A bula limita o uso a 7 dias.' : 'Defina conforme o caso; nenhuma duração foi presumida.'}</small></label>` : '';
    return `<section class="card controls-card"><h2>${p.context === 'ambulatory' ? 'Ajustar prescrição' : 'Dados para o cálculo'}</h2><p>${p.context === 'ambulatory' ? 'Informe apenas o que altera o esquema ou a quantidade.' : 'Preencha somente o necessário para calcular a dose desta apresentação.'}</p>${doseControls()}${duration}<div id="quantity-output"></div>${p.context === 'ambulatory' ? '<button type="button" id="add-builder" class="primary-button">+ Adicionar ao montador</button>' : ''}</section>`;
  }
  function selectedSources() {
    const p = selected();
    return medicine().sources.filter(source => p.sourceIds.includes(source.id)).map(source => `<li><a href="${ui.escape(source.url)}" target="_blank" rel="noopener noreferrer">${ui.escape(source.label)} ↗</a></li>`).join('');
  }
  function renderMedicine() {
    const m = medicine(), p = selected();
    if (!m || !p) return;
    const fav = core.favorites.has(m.id);
    shell(`<div class="breadcrumbs"><button data-view="home">Início</button><span>›</span><button data-view="medications">Medicamentos</button><span>›</span><span>${ui.escape(m.name)}</span></div><div class="medicine-heading"><div><div class="section-kicker">${ui.escape(m.category.toUpperCase())}</div><h1>${ui.escape(m.name)}</h1><p>${ui.escape(m.class)} · Escolha a forma e a concentração antes de prescrever</p></div><button class="heading-fav" data-favorite="${m.id}" aria-pressed="${fav}"><span>${fav ? '★' : '☆'}</span> Favorito</button></div><div class="medicine-layout"><div class="left-stack"><div class="card">${ui.medicationSelector(m, p, state.population)}</div><aside class="card meta-card"><h3>Apresentação selecionada</h3><div class="meta-line"><span>Forma</span><strong>${ui.escape(p.form)}</strong></div><div class="meta-line"><span>Concentração</span><strong>${ui.escape(p.concentration)}</strong></div><div class="meta-line"><span>Liberação</span><strong>${ui.escape(p.releaseType)}</strong></div><div class="meta-line"><span>Contexto</span><strong>${ui.escape(contextLabel(p.context))}</strong></div></aside></div><div class="right-stack"><section class="card clinical-card" id="clinical-output"></section>${controls()}<details class="accordion"><summary>Contraindicações, ajustes e cuidados</summary><div class="accordion-content"><ul>${m.safety.map(item => `<li>${ui.escape(item)}</li>`).join('')}</ul></div></details><details class="accordion"><summary>Fontes e revisão clínica</summary><div class="accordion-content"><p>Fonte vinculada à apresentação selecionada. Verifique a bula vigente antes do uso.</p><ul>${selectedSources()}</ul></div></details></div></div>`);
    renderDynamic();
  }
  function renderDynamic() {
    if (state.view !== 'medicine') return;
    const p = selected(), r = regimen(), d = dose();
    const clinical = document.querySelector('#clinical-output');
    const doseText = d ? `${fmt(d.mg)} mg${d.unit === 'gotas' ? ` · ${fmt(d.units)} gotas` : d.unit === 'mL' ? ` · ${fmt(d.units)} mL` : ''}` : 'Confira idade e peso da faixa da bula';
    const intervalText = r.intervalHours ? (r.quantityKind === 'maximum' ? `Até ${24 / r.intervalHours} vezes/dia` : r.intervalHours === 24 ? '1 vez ao dia' : `A cada ${r.intervalHours} h`) : r.intervalText;
    clinical.innerHTML = `<div class="section-kicker">${ui.escape(contextLabel(p.context).toUpperCase())}</div><h2>Esquema da apresentação</h2><div class="clinical-grid"><div class="clinical-cell"><span>Via</span><strong>${ui.escape(p.route)}</strong></div><div class="clinical-cell"><span>Dose</span><strong>${ui.escape(doseText)}</strong></div><div class="clinical-cell"><span>Intervalo</span><strong>${ui.escape(intervalText)}</strong></div><div class="clinical-cell"><span>População</span><strong>${state.population === 'adult' ? 'Adulto' : 'Pediatria'}</strong></div></div><div class="clinical-detail"><b>Dose máxima</b><span>${ui.escape(r.maxDoseText)}</span></div>${d && r.dose.kind === 'ageWeightDrops' && Number(state.ageMonths) < r.dose.fixedFromMonths ? `<div class="clinical-detail"><b>Dose de referência</b><span>${fmt(r.dose.unitsPerKg)} gota/kg/dose · ${fmt(r.dose.unitsPerKg * r.dose.mgPerUnit)} mg/kg/dose</span></div>` : ''}${d?.volumeMl && d.unit === 'gotas' ? `<div class="clinical-detail"><b>Volume / concentração</b><span>${fmt(d.volumeMl)} mL por dose · ${ui.escape(p.concentration)}</span></div>` : ''}${d?.range ? `<div class="clinical-detail"><b>Faixa por peso</b><span>${fmt(d.range[0])}–${fmt(d.range[1])} ${ui.escape(d.unit)} por dose</span></div>` : ''}${p.preparation ? `<div class="note"><b>Preparo / administração</b><br>${ui.escape(p.preparation)}</div>` : ''}${p.context !== 'ambulatory' ? '<div class="note">Administração em serviço de saúde; a duração e a quantidade dependem da avaliação assistencial.</div>' : ''}`;
    const out = document.querySelector('#quantity-output');
    if (out) out.innerHTML = quantityHtml();
    if (p.context === 'ambulatory') {
      const days = Number(state.days);
      const validDays = state.days === '' || (Number.isInteger(days) && days > 0 && days <= (r.durationKind === 'max7' ? 7 : 365));
      const manual = Number(state.manualQuantity);
      document.querySelector('#add-builder').disabled = !d || !validDays || (state.manualQuantity !== '' && (!Number.isFinite(manual) || manual <= 0));
    }
  }
  function quantityHtml() {
    const p = selected(), r = regimen(), d = dose();
    if (p.context !== 'ambulatory') return '';
    const pendingInput = `<label class="field manual-control" for="manual-quantity"><span class="field-label">Quantidade a dispensar (opcional) · ${ui.escape(p.packageUnit || (d?.unit === 'gotas' ? 'mL' : d?.unit || ''))}</span><input id="manual-quantity" type="number" min="0.01" step="0.01" value="${ui.escape(state.manualQuantity)}"><small>Informe apenas se definida; não presumimos embalagem.</small></label>`;
    if (r.quantityKind === 'variable') return `<div class="quantity-box"><div class="quantity-top"><span>Quantidade</span><strong>Conforme área tratada</strong></div><small>Não há consumo fixo em gramas por aplicação na bula. Bisnaga confirmada: 30 g.</small></div>${pendingInput}`;
    const q = quantity();
    if (!d) return '<p class="helper">Informe idade e peso para calcular a dose.</p>';
    if (!q) return `<p class="helper">Sem duração, a quantidade automática fica pendente.</p>${pendingInput}`;
    const label = r.quantityKind === 'maximum' ? 'Máximo estimado para o período' : 'Quantidade necessária';
    const chosen = state.mode === 'pack' ? q.closedPack : state.mode === 'manual' ? Number(state.manualQuantity) : q.required;
    const packChoices = p.packageSizes.length > 1 ? `<label class="field" for="pack-size" style="margin-top:13px"><span class="field-label">Tamanho da embalagem</span><select id="pack-size">${p.packageSizes.map(size => `<option value="${size}" ${Number(state.packSize || p.packageSizes[0]) === size ? 'selected' : ''}>${size} ${ui.escape(p.packageUnit || q.unit)}</option>`).join('')}</select></label>` : '';
    return `<div class="quantity-box"><div class="quantity-top"><span>${label}</span><strong>${fmt(q.required)} ${ui.escape(unitLabel(q.unit, q.required))}</strong></div><small>${fmt(d.units)} ${ui.escape(unitLabel(d.unit, d.units))} × ${24 / r.intervalHours} tomadas/dia × ${state.days} dias${d.unit === 'gotas' ? ` = ${fmt(q.required)} mL` : ''}</small></div>${packChoices}<div class="dispense-options" role="group" aria-label="Modo de dispensação"><label><input type="radio" name="dispense" value="exact" ${state.mode === 'exact' ? 'checked' : ''}> Quantidade necessária — ${fmt(q.required)} ${ui.escape(unitLabel(q.unit, q.required))}</label>${q.closedPack !== null ? `<label><input type="radio" name="dispense" value="pack" ${state.mode === 'pack' ? 'checked' : ''}> Embalagem fechada — ${fmt(q.closedPack)} ${ui.escape(unitLabel(q.unit, q.closedPack))} (${q.packs} ${q.packs === 1 ? 'embalagem' : 'embalagens'})</label>` : ''}<label><input type="radio" name="dispense" value="manual" ${state.mode === 'manual' ? 'checked' : ''}> Editar quantidade</label></div>${state.mode === 'manual' ? `<label class="field manual-control" for="manual-quantity"><span class="field-label">Quantidade ajustada manualmente</span><input id="manual-quantity" type="number" min="0.01" step="0.01" value="${ui.escape(state.manualQuantity)}"></label><button class="inline-link" id="restore-auto">Usar cálculo automático</button>` : ''}${state.mode !== 'exact' && chosen > 0 ? `<p class="subtle">Quantidade selecionada: ${fmt(chosen)} ${ui.escape(unitLabel(q.unit, chosen))}</p>` : ''}`;
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
    state.view = 'medicine';
    state.medicineId = id;
    state.presentationId = presentationId && core.medication.presentation(m, presentationId) ? presentationId : m.presentations[0].id;
    const p = core.medication.presentation(m, state.presentationId);
    state.population = core.medication.populations(p).includes(population) ? population : core.medication.populations(p)[0];
    resetChoice();
    location.hash = `#medicine/${id}/${state.presentationId}/${state.population}`;
    renderMedicine();
    window.scrollTo(0, 0);
  }
  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] === 'medicine' && catalog.some(item => item.id === parts[1])) return openMedicine(parts[1], parts[2], parts[3]);
    state.view = ['medications', 'favorites', 'builder'].includes(parts[0]) ? parts[0] : 'home';
    state.medicineId = null;
    if (state.view === 'builder') renderBuilder(); else renderListing();
  }
  root.addEventListener('click', async event => {
    const view = event.target.closest('[data-view]');
    if (view) return setView(view.dataset.view);
    const open = event.target.closest('[data-open]');
    if (open) return openMedicine(open.dataset.open);
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) { core.favorites.toggle(favorite.dataset.favorite); return state.view === 'medicine' ? renderMedicine() : renderListing(); }
    const pop = event.target.closest('[data-population]');
    if (pop) { state.population = pop.dataset.population; resetChoice(); location.hash = `#medicine/${state.medicineId}/${state.presentationId}/${state.population}`; return renderMedicine(); }
    if (event.target.id === 'restore-auto') { state.mode = 'exact'; state.manualQuantity = ''; return renderDynamic(); }
    if (event.target.id === 'add-builder') {
      const item = core.prescription.createItem({ medicine: medicine(), presentation: selected(), regimen: regimen(), dose: dose(), days: state.days || null, quantity: quantity(), mode: state.mode, manualQuantity: state.manualQuantity, packSize: state.packSize });
      if (!item) return toast('Revise os dados da apresentação');
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
      state.items[index] = core.prescription.updateItem(state.items[index], { days: days.value, quantity: amount.value });
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
    if (event.target.id === 'search') { state.query = event.target.value; document.querySelector('#med-grid').innerHTML = cards(); }
    if (event.target.id === 'duration') { state.days = event.target.value; renderDynamic(); }
    if (event.target.id === 'age') state.ageMonths = event.target.value;
    if (event.target.id === 'weight') state.weightKg = event.target.value;
    if (event.target.id === 'dose-units') { state.chosenUnits = event.target.value; renderDynamic(); }
    if (event.target.id === 'manual-quantity') { state.manualQuantity = event.target.value; state.mode = 'manual'; }
    if (event.target.id === 'patient-name') { state.patientName = event.target.value; renderPreview(); }
    if (event.target.dataset.issuer) { state.printDetails[event.target.dataset.issuer] = event.target.value; renderPreview(); }
  });
  root.addEventListener('change', event => {
    if (event.target.id === 'presentation') return openMedicine(state.medicineId, event.target.value);
    if (event.target.id === 'age' || event.target.id === 'weight') { state.chosenUnits = ''; return renderMedicine(); }
    if (event.target.id === 'pack-size') { state.packSize = event.target.value; return renderDynamic(); }
    if (event.target.name === 'dispense') { state.mode = event.target.value; return renderDynamic(); }
    if (event.target.id === 'manual-quantity') return renderDynamic();
  });
  window.addEventListener('hashchange', () => {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] === 'medicine' && state.view === 'medicine' && parts[1] === state.medicineId && parts[2] === state.presentationId && parts[3] === state.population) return;
    if (parts[0] !== state.view || (parts[0] === 'medicine' && (parts[2] !== state.presentationId || parts[3] !== state.population))) route();
  });
  (async () => { catalog = await data('data/medicines/index.json'); route(); })().catch(error => { console.error(error); root.innerHTML = '<main class="page"><h1>Não foi possível carregar o catálogo</h1><p>Abra o arquivo standalone ou use a prévia local.</p></main>'; });
})();
