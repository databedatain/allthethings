// Shim: the bullet-journal component expects a custom async `window.storage`
// API (originally provided by the Claude artifact runtime). Back it with
// localStorage so the component works unchanged in a plain browser.
window.storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value == null ? null : { value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};
