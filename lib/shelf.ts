// The bookshelf. Finished (and in-progress) books live in IndexedDB so they
// survive a reload — the difference between "a demo tab" and "an app".

import type { ThemeId } from "@/lib/dream-style";

export type ShelfPage = { beats: string[]; image: Blob };

export type ShelfBook = {
  id: string;
  profileId: string;
  title: string;
  theme: ThemeId | null;
  createdAt: number;
  updatedAt: number;
  pages: ShelfPage[];
};

const DB_NAME = "storybooks";
const DB_VERSION = 1;
const STORE = "books";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("no indexedDB"));
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("profileId", "profileId");
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function newBookId() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function putBook(book: ShelfBook): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(book) as IDBRequest<any>);
  } catch {
    /* a full or blocked store should never break story time */
  }
}

export async function listBooks(profileId?: string): Promise<ShelfBook[]> {
  try {
    const all = (await tx<ShelfBook[]>("readonly", (s) => s.getAll() as IDBRequest<ShelfBook[]>)) ?? [];
    return all
      .filter((b) => b?.pages?.length && (!profileId || b.profileId === profileId))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(id) as IDBRequest<any>);
  } catch {}
}

export async function deleteBooksFor(profileId: string): Promise<void> {
  const books = await listBooks(profileId);
  await Promise.all(books.map((b) => deleteBook(b.id)));
}

export async function clearShelf(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear() as IDBRequest<any>);
  } catch {}
}
