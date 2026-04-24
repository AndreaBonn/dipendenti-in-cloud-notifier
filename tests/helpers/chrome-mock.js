/**
 * Reusable Chrome API mock factory for Vitest tests.
 * Simulates callback-based chrome.* APIs with in-memory storage.
 */

/**
 * Create a fresh Chrome API mock object.
 * Returns { mock, setStorageData, setLastError }.
 */
export function createChromeMock() {
  let storageData = {};
  let lastError = null;

  // Helper: read lastError and auto-clear it after access
  function getAndClearLastError() {
    const err = lastError;
    lastError = null;
    return err;
  }

  const mock = {
    storage: {
      local: {
        get(keysOrDefaults, callback) {
          const err = getAndClearLastError();
          if (err) {
            mock.runtime.lastError = err;
            callback({});
            mock.runtime.lastError = null;
            return;
          }

          let result = {};

          if (Array.isArray(keysOrDefaults)) {
            for (const key of keysOrDefaults) {
              if (key in storageData) {
                result[key] = storageData[key];
              }
            }
          } else if (typeof keysOrDefaults === 'object' && keysOrDefaults !== null) {
            // Object: keys are property names, values are defaults
            for (const [key, defaultValue] of Object.entries(keysOrDefaults)) {
              result[key] = key in storageData ? storageData[key] : defaultValue;
            }
          } else if (typeof keysOrDefaults === 'string') {
            if (keysOrDefaults in storageData) {
              result[keysOrDefaults] = storageData[keysOrDefaults];
            }
          }

          callback(result);
        },

        set(data, callback) {
          const err = getAndClearLastError();
          if (err) {
            mock.runtime.lastError = err;
          }
          Object.assign(storageData, data);
          if (err) {
            // lastError was set — callback still fires
            if (callback) callback();
            mock.runtime.lastError = null;
            return;
          }
          if (callback) callback();
        },

        remove(keys, callback) {
          const err = getAndClearLastError();
          if (err) {
            mock.runtime.lastError = err;
          }
          const toRemove = Array.isArray(keys) ? keys : [keys];
          for (const key of toRemove) {
            delete storageData[key];
          }
          if (err) {
            if (callback) callback();
            mock.runtime.lastError = null;
            return;
          }
          if (callback) callback();
        },
      },
    },

    runtime: {
      lastError: null,
      id: 'mock-extension-id',
      sendMessage(msg, callback) {
        if (callback) callback();
      },
    },

    action: {
      setIcon(details, callback) {
        if (callback) {
          if (mock.runtime.lastError) {
            // pass through
          }
          callback();
        }
      },
      setBadgeText(details, callback) {
        if (callback) {
          callback();
        }
      },
      setBadgeBackgroundColor(details, callback) {
        if (callback) {
          callback();
        }
      },
    },

    notifications: {
      create(id, options, callback) {
        if (callback) callback(id);
      },
      clear(id, callback) {
        if (callback) callback(true);
      },
    },

    offscreen: {
      hasDocument() {
        return Promise.resolve(false);
      },
      createDocument(options) {
        return Promise.resolve();
      },
    },

    tabs: {
      create(options, callback) {
        if (callback) callback({ id: 1, ...options });
      },
      query(query, callback) {
        if (callback) callback([]);
      },
      sendMessage(tabId, msg, callback) {
        if (callback) callback();
      },
    },
  };

  /**
   * Pre-populate the in-memory storage store.
   * @param {Object} data
   */
  function setStorageData(data) {
    storageData = { ...data };
  }

  /**
   * Simulate a chrome.runtime.lastError on the NEXT API call.
   * Auto-clears after the callback fires.
   * @param {string} message
   */
  function setLastError(message) {
    lastError = { message };
  }

  return { mock, setStorageData, setLastError };
}

/**
 * Set up a fresh Chrome mock on globalThis.chrome.
 * Call in beforeEach to get a clean mock per test.
 * @returns {{ setStorageData: Function, setLastError: Function }}
 */
export function setupChromeMock() {
  const { mock, setStorageData, setLastError } = createChromeMock();
  globalThis.chrome = mock;
  return { setStorageData, setLastError };
}
