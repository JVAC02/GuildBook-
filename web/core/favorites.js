(() => {
  const ns = globalThis.GuildBookCore ||= {};
  const key = 'guildbook-v7-favorites';
  function all() { return ns.storage.get(key, []).filter(id => id === 'dipirona' || id === 'cetoprofeno'); }
  function has(id) { return all().includes(id); }
  function toggle(id) {
    const next = has(id) ? all().filter(value => value !== id) : [...all(), id];
    ns.storage.set(key, next);
    return next;
  }
  ns.favorites = { all, has, toggle };
})();
