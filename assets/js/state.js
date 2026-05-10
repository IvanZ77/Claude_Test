// Minimal pub-sub state management
const store = {};
const listeners = new Set();

export function getState() {
  return store;
}

export function setState(patch) {
  Object.assign(store, patch);
  listeners.forEach(fn => fn(store, patch));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
