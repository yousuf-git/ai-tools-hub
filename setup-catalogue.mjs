/**
 * Provisions the Appwrite storage behind the Resume Catalogue.
 *
 * Idempotent: creates the database, the `resumes` table, its columns and the
 * user index only if they are missing, so it is safe to re-run after a schema
 * addition. Requires APPWRITE_API_KEY with the `databases`, `tables`, `columns`
 * and `indexes` read+write scopes (the app itself only needs `rows.read` and
 * `rows.write`).
 *
 *   npm run setup:catalogue
 */
import { config as loadEnv } from "dotenv";
import { Client, TablesDB, TablesDBIndexType, AppwriteException } from "node-appwrite";

// .env.local wins, matching how Next.js resolves env files locally.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? "ai-forge";
const tableId = process.env.APPWRITE_RESUMES_TABLE_ID ?? "resumes";

if (!endpoint || !projectId || !apiKey) {
  console.error(
    "Missing Appwrite env values. NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set. See AUTH_SETUP.md."
  );
  process.exit(1);
}

const tablesDB = new TablesDB(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
);

// `snapshot` holds the whole resume (draft + wizard run) as JSON, so it needs a
// column large enough for a long job description plus every cached AI response.
const COLUMNS = [
  { key: "userId", kind: "string", size: 64, required: true },
  { key: "resumeTitle", kind: "string", size: 200, required: true },
  { key: "company", kind: "string", size: 200, required: false },
  { key: "jobTitle", kind: "string", size: 200, required: false },
  { key: "jobDescription", kind: "string", size: 60000, required: false },
  { key: "note", kind: "string", size: 4000, required: false },
  { key: "appliedAt", kind: "datetime", required: false },
  { key: "snapshot", kind: "string", size: 1000000, required: true },
];

const isMissing = (err) =>
  err instanceof AppwriteException && (err.code === 404 || String(err.type).endsWith("_not_found"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDatabase() {
  try {
    await tablesDB.get({ databaseId });
    console.log(`database "${databaseId}" — exists`);
  } catch (err) {
    if (!isMissing(err)) throw err;
    await tablesDB.create({ databaseId, name: "AI Forge" });
    console.log(`database "${databaseId}" — created`);
  }
}

async function ensureTable() {
  try {
    await tablesDB.getTable({ databaseId, tableId });
    console.log(`table "${tableId}" — exists`);
  } catch (err) {
    if (!isMissing(err)) throw err;
    // No table-level permissions: every row carries per-user permissions and all
    // access goes through the API-key server routes.
    await tablesDB.createTable({ databaseId, tableId, name: "Resumes", rowSecurity: true });
    console.log(`table "${tableId}" — created`);
  }
}

async function ensureColumns() {
  const existing = new Set(
    (await tablesDB.listColumns({ databaseId, tableId })).columns.map((c) => c.key)
  );

  for (const col of COLUMNS) {
    if (existing.has(col.key)) {
      console.log(`  column ${col.key} — exists`);
      continue;
    }
    if (col.kind === "datetime") {
      await tablesDB.createDatetimeColumn({ databaseId, tableId, key: col.key, required: col.required });
    } else {
      await tablesDB.createStringColumn({
        databaseId,
        tableId,
        key: col.key,
        size: col.size,
        required: col.required,
      });
    }
    console.log(`  column ${col.key} — created`);
  }
}

/** Columns are created asynchronously; an index can only be built once they are available. */
async function waitForColumns() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const { columns } = await tablesDB.listColumns({ databaseId, tableId });
    const pending = columns.filter((c) => c.status !== "available");
    if (pending.length === 0) return;
    if (pending.some((c) => c.status === "failed")) {
      throw new Error(`Column(s) failed to create: ${pending.map((c) => c.key).join(", ")}`);
    }
    await sleep(1000);
  }
  throw new Error("Timed out waiting for columns to become available.");
}

async function ensureIndex() {
  const { indexes } = await tablesDB.listIndexes({ databaseId, tableId });
  if (indexes.some((i) => i.key === "idx_user")) {
    console.log("  index idx_user — exists");
    return;
  }
  await tablesDB.createIndex({
    databaseId,
    tableId,
    key: "idx_user",
    type: TablesDBIndexType.Key,
    columns: ["userId"],
  });
  console.log("  index idx_user — created");
}

try {
  await ensureDatabase();
  await ensureTable();
  await ensureColumns();
  await waitForColumns();
  await ensureIndex();
  console.log("\nResume catalogue storage is ready.");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\nSetup failed:", message);
  if (message.includes("missing scopes")) {
    console.error(
      [
        "",
        "The API key needs the schema scopes. In the Appwrite Console:",
        "  Overview → Integrations → API Keys → pick your key → Scopes",
        "Tick read + write for: databases, tables, columns, indexes, rows.",
        "Press Update (the secret does not change), then re-run this script.",
      ].join("\n")
    );
  }
  process.exit(1);
}
