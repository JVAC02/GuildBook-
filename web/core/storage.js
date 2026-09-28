(() => {
  const ns = globalThis.GuildBookCore ||= {};
  function get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
  }
  ns.storage = { get, set };
})();
