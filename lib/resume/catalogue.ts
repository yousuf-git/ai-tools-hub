// Client-side access to the resume catalogue (/api/resume/catalogue).
// Every call requires a session; a 401 surfaces as `CatalogueError.unauthorized`
// so the UI can show a sign-in prompt instead of an error.
import type {
  CatalogueEntry,
  CatalogueMeta,
  CatalogueSnapshot,
  CatalogueSummary,
  ResumeDraft,
  WizardState,
  Profile,
} from "./types";

const BASE = "/api/resume/catalogue";

export class CatalogueError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CatalogueError";
    this.status = status;
  }
  get unauthorized() {
    return this.status === 401;
  }
  /** Storage exists in code but not yet in Appwrite — the setup script hasn't run. */
  get notProvisioned() {
    return this.status === 503;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON body (gateway error page) — fall through to the status message.
    }
  }
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? `Request failed (${res.status}).`;
    throw new CatalogueError(message, res.status);
  }
  return data as T;
}

export function buildSnapshot(profile: Profile, draft: ResumeDraft, wizard: WizardState): CatalogueSnapshot {
  return {
    version: 1,
    basics: { ...profile.basics },
    draft: structuredClone(draft),
    wizard: structuredClone(wizard),
  };
}

export async function listCatalogue(): Promise<CatalogueSummary[]> {
  const { entries } = await request<{ entries: CatalogueSummary[] }>(BASE);
  return entries;
}

export async function getCatalogueEntry(id: string): Promise<CatalogueEntry> {
  const { entry } = await request<{ entry: CatalogueEntry }>(`${BASE}/${id}`);
  return entry;
}

export async function createCatalogueEntry(
  meta: CatalogueMeta,
  snapshot: CatalogueSnapshot
): Promise<CatalogueEntry> {
  const { entry } = await request<{ entry: CatalogueEntry }>(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...meta, snapshot }),
  });
  return entry;
}

/** Omit `snapshot` to edit only the metadata of an entry. */
export async function updateCatalogueEntry(
  id: string,
  meta: CatalogueMeta,
  snapshot?: CatalogueSnapshot
): Promise<CatalogueEntry> {
  const { entry } = await request<{ entry: CatalogueEntry }>(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...meta, ...(snapshot ? { snapshot } : {}) }),
  });
  return entry;
}

export async function deleteCatalogueEntry(id: string): Promise<void> {
  await request<{ ok: true }>(`${BASE}/${id}`, { method: "DELETE" });
}

// ---- JSON export / import ----

const FILE_KIND = "ai-forge-resume-catalogue-entry";

interface ExportFile extends CatalogueMeta {
  kind: typeof FILE_KIND;
  version: 1;
  exportedAt: string;
  snapshot: CatalogueSnapshot;
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function downloadEntryJson(entry: CatalogueEntry): void {
  const file: ExportFile = {
    kind: FILE_KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    resumeTitle: entry.resumeTitle,
    company: entry.company,
    jobTitle: entry.jobTitle,
    jobDescription: entry.jobDescription,
    note: entry.note,
    appliedAt: entry.appliedAt,
    snapshot: entry.snapshot,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `resume-${slug(entry.resumeTitle) || "entry"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parses a previously exported file. Throws with a readable message on anything else. */
export function parseEntryJson(text: string): { meta: CatalogueMeta; snapshot: CatalogueSnapshot } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const f = parsed as Partial<ExportFile>;
  if (!f || f.kind !== FILE_KIND || !f.snapshot?.draft || !f.snapshot?.wizard) {
    throw new Error("That file isn't a resume exported from the catalogue.");
  }
  return {
    meta: {
      resumeTitle: f.resumeTitle ?? "",
      company: f.company ?? "",
      jobTitle: f.jobTitle ?? "",
      jobDescription: f.jobDescription ?? "",
      note: f.note ?? "",
      appliedAt: f.appliedAt ?? new Date().toISOString(),
    },
    snapshot: { ...f.snapshot, version: 1 },
  };
}
