(() => {
  const ns = globalThis.GuildBookCore ||= {};
  function presentation(medicine, id) { return medicine.presentations.find(item => item.id === id) || null; }
  function populations(item) { return [...new Set(item.regimens.map(row => row.population))]; }
  function regimen(item, population, id) { return item.regimens.find(row => row.population === population && (!id || row.id === id)) || null; }
  function normalize(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function search(items, query) {
    const term = normalize(query);
    if (!term) return items;
    return items.map(item => {
      const name = normalize(item.name);
      const aliases = (item.aliases || []).map(normalize);
      const rank = name === term ? 0 : name.startsWith(term) ? 1 : aliases.some(a => a === term) ? 2 : aliases.some(a => a.includes(term)) ? 3 : name.includes(term) ? 4 : 99;
      return { item, rank };
    }).filter(row => row.rank < 99).sort((a, b) => a.rank - b.rank).map(row => row.item);
  }
  ns.medication = { presentation, populations, regimen, search };
})();
