// Minimal pub-sub state management
const store = {};

// Each entry: { keys: string[] | null, fn: Function }
// keys === null means listen to all changes (legacy subscribe)
const listeners = new Set();

export function getState() {
  return store;
}

export function setState(patch) {
  Object.assign(store, patch);
  const dirtyKeys = Object.keys(patch);
  listeners.forEach(({ keys, fn }) => {
    if (!keys) {
      fn(store, patch);
    } else if (dirtyKeys.some(k => keys.includes(k))) {
      fn(store, patch);
    }
  });
}

// Legacy: listen to all state changes
export function subscribe(fn) {
  const entry = { keys: null, fn };
  listeners.add(entry);
  return () => listeners.delete(entry);
}

// Selective: only fires when one of the given keys is in the patch
export function subscribeKeys(keys, fn) {
  const entry = { keys, fn };
  listeners.add(entry);
  return () => listeners.delete(entry);
}
