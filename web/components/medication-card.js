(() => {
  const ns = globalThis.GuildBookUI ||= {};
  ns.escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  ns.medicationCard = (item, favorite, { expanded = false, content = '' } = {}) => `<article class="med-card ${expanded ? 'is-expanded' : ''}">
    <div class="med-card-header"><button type="button" class="med-card-main" data-open="${ns.escape(item.id)}" aria-label="${expanded ? 'Recolher' : 'Abrir'} ${ns.escape(item.name)}" aria-expanded="${expanded}" ${expanded ? `aria-controls="expanded-${ns.escape(item.id)}"` : ''}>
      <span class="med-card-icon">${ns.escape(item.initials || item.name.slice(0, 2))}</span>
      <span class="med-card-copy"><strong>${ns.escape(item.name)}</strong>${item.summary ? `<small>${ns.escape(item.summary)}</small>` : ''}</span>
      <span class="chevron" aria-hidden="true">${expanded ? '−' : '+'}</span>
    </button><button type="button" class="favorite" data-favorite="${ns.escape(item.id)}" aria-label="${favorite ? 'Remover dos' : 'Adicionar aos'} favoritos" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button></div>${expanded ? content : ''}
  </article>`;
})();
