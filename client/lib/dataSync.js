const DATA_SYNC_EVENT = 'smartgroup:data-sync';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function emitDataSync(detail = {}) {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent(DATA_SYNC_EVENT, {
      detail: {
        ...detail,
        ts: Date.now(),
      },
    })
  );
}

export function subscribeDataSync(listener) {
  if (!isBrowser()) return () => {};

  const handler = (event) => {
    listener(event?.detail || {});
  };

  window.addEventListener(DATA_SYNC_EVENT, handler);
  return () => {
    window.removeEventListener(DATA_SYNC_EVENT, handler);
  };
}

export { DATA_SYNC_EVENT };
