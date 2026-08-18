import "server-only";

import { Client, TablesDB, Permission, Role, ID, Query, AppwriteException } from "node-appwrite";

import { appwriteConfig } from "@/lib/appwrite/config";
import type {
  CatalogueEntry,
  CatalogueMeta,
  CatalogueSnapshot,
  CatalogueSummary,
} from "./types";

// Catalogue rows are read and written with the API key, never with the user's
// session: the snapshot is a single large JSON blob, so no client ever needs
// direct table access. Every query is scoped by `userId` and every single-row
// operation re-checks ownership before touching the row.
function tablesDB() {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.apiKey);
  return new TablesDB(client);
}

const DB = () => appwriteConfig.databaseId;
const TABLE = () => appwriteConfig.resumesTableId;

/** Hard cap so a runaway snapshot can't blow past the column size. */
const MAX_SNAPSHOT_CHARS = 900_000;

interface ResumeRow {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  resumeTitle: string;
  company: string | null;
  jobTitle: string | null;
  jobDescription: string | null;
  note: string | null;
  appliedAt: string | null;
  snapshot: string;
}

function toSummary(row: ResumeRow): CatalogueSummary {
  return {
    id: row.$id,
    createdAt: row.$createdAt,
    updatedAt: row.$updatedAt,
    resumeTitle: row.resumeTitle,
    company: row.company ?? "",
    jobTitle: row.jobTitle ?? "",
    jobDescription: row.jobDescription ?? "",
    note: row.note ?? "",
    appliedAt: row.appliedAt ?? row.$createdAt,
  };
}

function toEntry(row: ResumeRow): CatalogueEntry {
  return { ...toSummary(row), snapshot: JSON.parse(row.snapshot) as CatalogueSnapshot };
}

/** Thrown when the table hasn't been provisioned yet — surfaced as a setup hint. */
export class CatalogueNotProvisionedError extends Error {
  constructor(detail: string) {
    super(`Resume catalogue storage is not ready: ${detail} Run \`npm run setup:catalogue\`.`);
    this.name = "CatalogueNotProvisionedError";
  }
}

// Appwrite messages name internal service accounts and IDs, so none of them are
// passed through to the client — a setup gap becomes an actionable hint, and
// anything else becomes a generic failure after being logged.
function rethrow(err: unknown): never {
  if (err instanceof AppwriteException) {
    if (err.code === 404 && String(err.type).endsWith("_not_found")) {
      throw new CatalogueNotProvisionedError("the database or table does not exist.");
    }
    if (err.type === "general_unauthorized_scope") {
      throw new CatalogueNotProvisionedError("the Appwrite API key is missing the database scopes.");
    }
    console.error(`Appwrite catalogue error [${err.type}]:`, err.message);
    throw new Error("The resume catalogue is temporarily unavailable. Please try again.");
  }
  throw err;
}

function rowData(userId: string, meta: CatalogueMeta, snapshot: CatalogueSnapshot) {
  const json = JSON.stringify(snapshot);
  if (json.length > MAX_SNAPSHOT_CHARS) {
    throw new Error("This resume is too large to save. Trim the job description or the saved AI steps and try again.");
  }
  return {
    userId,
    resumeTitle: meta.resumeTitle,
    company: meta.company,
    jobTitle: meta.jobTitle,
    jobDescription: meta.jobDescription,
    note: meta.note,
    appliedAt: meta.appliedAt,
    snapshot: json,
  };
}

export async function listEntries(userId: string): Promise<CatalogueSummary[]> {
  try {
    const res = await tablesDB().listRows({
      databaseId: DB(),
      tableId: TABLE(),
      queries: [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(200),
        // The list view never renders the snapshot; leaving it out keeps the
        // response small even with a few hundred saved resumes.
        Query.select(["$id", "$createdAt", "$updatedAt", "resumeTitle", "company", "jobTitle", "jobDescription", "note", "appliedAt"]),
      ],
    });
    return (res.rows as unknown as ResumeRow[]).map(toSummary);
  } catch (err) {
    rethrow(err);
  }
}

export async function getEntry(userId: string, id: string): Promise<CatalogueEntry | null> {
  try {
    const row = (await tablesDB().getRow({
      databaseId: DB(),
      tableId: TABLE(),
      rowId: id,
    })) as unknown as ResumeRow;
    if (row.userId !== userId) return null;
    return toEntry(row);
  } catch (err) {
    if (err instanceof AppwriteException && (err.type === "document_not_found" || err.type === "row_not_found")) {
      return null;
    }
    rethrow(err);
  }
}

export async function createEntry(
  userId: string,
  meta: CatalogueMeta,
  snapshot: CatalogueSnapshot
): Promise<CatalogueEntry> {
  try {
    const row = (await tablesDB().createRow({
      databaseId: DB(),
      tableId: TABLE(),
      rowId: ID.unique(),
      data: rowData(userId, meta, snapshot),
      permissions: [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ],
    })) as unknown as ResumeRow;
    return toEntry(row);
  } catch (err) {
    rethrow(err);
  }
}

/** Updates metadata, and the snapshot too when one is supplied. */
export async function updateEntry(
  userId: string,
  id: string,
  meta: CatalogueMeta,
  snapshot?: CatalogueSnapshot
): Promise<CatalogueEntry | null> {
  const existing = await getEntry(userId, id);
  if (!existing) return null;

  try {
    const data = rowData(userId, meta, snapshot ?? existing.snapshot);
    const row = (await tablesDB().updateRow({
      databaseId: DB(),
      tableId: TABLE(),
      rowId: id,
      data,
    })) as unknown as ResumeRow;
    return toEntry(row);
  } catch (err) {
    rethrow(err);
  }
}

export async function deleteEntry(userId: string, id: string): Promise<boolean> {
  const existing = await getEntry(userId, id);
  if (!existing) return false;
  try {
    await tablesDB().deleteRow({ databaseId: DB(), tableId: TABLE(), rowId: id });
    return true;
  } catch (err) {
    rethrow(err);
  }
}
