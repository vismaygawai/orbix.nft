import "@testing-library/jest-dom/vitest";

// Node 25/26 exposes a global localStorage getter that resolves to undefined unless
// --localstorage-file is passed, shadowing jsdom's storage in some configurations.
const needsStoragePolyfill = (() => {
  try {
    return (
      typeof window.localStorage === "undefined" ||
      typeof window.localStorage.setItem !== "function"
    );
  } catch {
    return true;
  }
})();

if (needsStoragePolyfill) {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: memoryStorage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: memoryStorage,
  });
}

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
