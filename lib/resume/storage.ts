// Resume Builder persistence — IndexedDB, isolated from every other tool.
// DB "resume-builder": a "kv" store (profile / draft / wizard) and a "projects" store
// (the saved-projects manager, keyed by id). Browser-only; all calls are no-ops on the server.
import type { CatalogueSummary, Profile, ResumeDraft, ResumeProject, WizardState } from "./types";

const DB_NAME = "resume-builder";
const DB_VERSION = 1;
const KV_STORE = "kv";
const PROJECTS_STORE = "projects";

type KvKey = "profile" | "draft" | "wizard" | "openEntry" | "seeded";

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!isBrowser()) return Promise.reject(new Error("IndexedDB unavailable (server)"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = run(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

// ---- kv (single-record) helpers ----
async function kvGet<T>(key: KvKey): Promise<T | null> {
  if (!isBrowser()) return null;
  const v = await tx<T>(KV_STORE, "readonly", (s) => s.get(key) as IDBRequest<T>);
  return (v as T) ?? null;
}

async function kvSet<T>(key: KvKey, value: T): Promise<void> {
  if (!isBrowser()) return;
  await tx(KV_STORE, "readwrite", (s) => s.put(value, key));
}

export const getProfile = () => kvGet<Profile>("profile");
export const setProfile = (p: Profile) => kvSet("profile", p);

export const getDraft = () => kvGet<ResumeDraft>("draft");
export const setDraft = (d: ResumeDraft) => kvSet("draft", d);

export const getWizard = () => kvGet<WizardState>("wizard");
export const setWizard = (w: WizardState) => kvSet("wizard", w);

// Which catalogue entry the draft on screen came from, so a refresh still knows
// what "Update open entry" would overwrite.
export const getOpenEntry = () => kvGet<CatalogueSummary>("openEntry");
export const setOpenEntry = (e: CatalogueSummary | null) => kvSet("openEntry", e);

// Set once the example data has been offered. Without it, emptying the projects
// store would look like a first run and the examples would come back.
export const getSeeded = () => kvGet<boolean>("seeded");
export const setSeeded = () => kvSet("seeded", true);

// ---- projects store ----
export async function listProjects(): Promise<ResumeProject[]> {
  if (!isBrowser()) return [];
  const all = await tx<ResumeProject[]>(PROJECTS_STORE, "readonly", (s) =>
    s.getAll() as IDBRequest<ResumeProject[]>
  );
  const list = all ?? [];
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function putProject(p: ResumeProject): Promise<void> {
  if (!isBrowser()) return;
  await tx(PROJECTS_STORE, "readwrite", (s) => s.put(p));
}

export async function deleteProject(id: string): Promise<void> {
  if (!isBrowser()) return;
  await tx(PROJECTS_STORE, "readwrite", (s) => s.delete(id));
}

export async function clearProjects(): Promise<void> {
  if (!isBrowser()) return;
  await tx(PROJECTS_STORE, "readwrite", (s) => s.clear());
}

export async function bulkPutProjects(projects: ResumeProject[]): Promise<void> {
  if (!isBrowser()) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(PROJECTS_STORE, "readwrite");
    const store = t.objectStore(PROJECTS_STORE);
    projects.forEach((p) => store.put(p));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
