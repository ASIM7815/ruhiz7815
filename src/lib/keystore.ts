// IndexedDB wrapper for storing CryptoKey objects (non-extractable private keys)

const DB_NAME = "ruhiz-keystore";
const STORE_NAME = "keys";
const KEY_ID = "e2ee-keypair";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeKeyPair(
  publicKey: CryptoKey,
  privateKey: CryptoKey
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ publicKey, privateKey }, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getKeyPair(): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
} | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY_ID);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function hasKeys(): Promise<boolean> {
  const pair = await getKeyPair();
  return pair !== null;
}
