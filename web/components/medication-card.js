(() => {
  const ns = globalThis.GuildBookUI ||= {};
  ns.escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  ns.medicationCard = (item, favorite) => `<article class="med-card">
    <button class="med-card-main" data-open="${ns.escape(item.id)}" aria-label="Abrir ${ns.escape(item.name)}">
      <span class="med-card-icon">${ns.escape(item.initials || item.name.slice(0, 2))}</span>
      <span class="med-card-copy"><strong>${ns.escape(item.name)}</strong>${item.summary ? `<small>${ns.escape(item.summary)}</small>` : ''}</span>
      <span class="chevron" aria-hidden="true">›</span>
    </button>
    <button class="favorite" data-favorite="${ns.escape(item.id)}" aria-label="${favorite ? 'Remover dos' : 'Adicionar aos'} favoritos" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button>
  </article>`;
})();
