(() => {
  const ns = globalThis.GuildBookUI ||= {};
  ns.escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  ns.medicationCard = (item, favorite) => `<article class="med-card">
    <button class="med-card-main" data-open="${ns.escape(item.id)}" aria-label="Abrir ${ns.escape(item.name)}">
      <span class="med-card-icon">${item.id === 'dipirona' ? 'Di' : 'Ce'}</span>
      <span class="med-card-copy"><strong>${ns.escape(item.name)}</strong><small>${item.id === 'dipirona' ? 'Analgésico · antitérmico' : 'AINE · analgésico'}</small></span>
      <span class="chevron" aria-hidden="true">›</span>
    </button>
    <button class="favorite" data-favorite="${ns.escape(item.id)}" aria-label="${favorite ? 'Remover dos' : 'Adicionar aos'} favoritos" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button>
  </article>`;
})();
