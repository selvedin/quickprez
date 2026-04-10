const STORES = {
  PRESENTATIONS: 'presentations',
  SLIDES: 'slides',
  ASSETS: 'assets',
  SETTINGS: 'settings',
};

window.DB = (function () {
  let db = null;

  function open() {
    return new Promise(function (resolve, reject) {
      const request = indexedDB.open('PresentationForge_v1', 2);

      request.onupgradeneeded = function (e) {
        const database = e.target.result;

        if (!database.objectStoreNames.contains(STORES.PRESENTATIONS)) {
          database.createObjectStore(STORES.PRESENTATIONS, { keyPath: 'id', autoIncrement: true });
        }

        if (!database.objectStoreNames.contains(STORES.SLIDES)) {
          const slidesStore = database.createObjectStore(STORES.SLIDES, { keyPath: 'id', autoIncrement: true });
          slidesStore.createIndex('by_presentation', 'presentationId', { unique: false });
        }

        if (!database.objectStoreNames.contains(STORES.ASSETS)) {
          database.createObjectStore(STORES.ASSETS, { keyPath: 'id', autoIncrement: true });
        }

        if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
          database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = function (e) {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = function (e) {
        reject(e.target.error);
      };
    });
  }

  function getAll(store) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).getAll();
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function get(store, id) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).get(id);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function put(store, record) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(store, 'readwrite');
      const request = tx.objectStore(store).put(record);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function remove(store, id) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(store, 'readwrite');
      const request = tx.objectStore(store).delete(id);
      request.onsuccess = function () { resolve(); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function getByIndex(store, indexName, value) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(store, 'readonly');
      const index = tx.objectStore(store).index(indexName);
      const request = index.getAll(value);
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  return {
    open: open,
    getAll: getAll,
    get: get,
    put: put,
    delete: remove,
    getByIndex: getByIndex,
    STORES: STORES,
  };
})();
