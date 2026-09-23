import type { LocalDraft } from "../model";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("proofwrite-v1", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("drafts");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function writeLocal(id: string, value: LocalDraft) {
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put(value, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    database.close();
  }
}
export async function readLocal(id: string): Promise<LocalDraft | undefined> {
  const database = await db();
  try {
    return await new Promise((resolve, reject) => {
      const req = database.transaction("drafts").objectStore("drafts").get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    database.close();
  }
}
export async function removeLocal(id: string) {
  await pendingWrite.catch(() => {});
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("drafts", "readwrite");
      tx.objectStore("drafts").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    database.close();
  }
}

let pendingWrite: Promise<void> = Promise.resolve();
export function saveLocal(id: string, value: LocalDraft) {
  const copy = structuredClone(value);
  const next = pendingWrite.catch(() => {}).then(() => writeLocal(id, copy));
  pendingWrite = next;
  return next;
}
