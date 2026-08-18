import { NextResponse } from "next/server";

import { CatalogueNotProvisionedError } from "@/lib/resume/catalogue.server";
import type { CatalogueMeta, CatalogueSnapshot } from "@/lib/resume/types";

export function unauthorized() {
  return NextResponse.json(
    { error: "Sign in to use the resume catalogue." },
    { status: 401 }
  );
}

/** Setup gaps and size limits are the user's to fix — everything else is ours. */
export function failure(err: unknown) {
  if (err instanceof CatalogueNotProvisionedError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  console.error("Resume catalogue request failed:", err);
  const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
  return NextResponse.json({ error: message }, { status: 500 });
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

type ParseResult =
  | { meta: CatalogueMeta; snapshot?: CatalogueSnapshot }
  | { error: string };

/**
 * Validates the shared save payload. The snapshot is stored verbatim — it is
 * the client's own resume state — but its shell is checked so a malformed body
 * can never be written back as an unopenable entry.
 */
export function parseSaveBody(
  body: unknown,
  { requireSnapshot }: { requireSnapshot: boolean }
): ParseResult {
  if (!body || typeof body !== "object") return { error: "Invalid request body." };
  const b = body as Record<string, unknown>;

  const resumeTitle = str(b.resumeTitle);
  if (!resumeTitle) return { error: "Resume title is required." };

  const company = str(b.company);
  const jobTitle = str(b.jobTitle);
  if (resumeTitle.length > 200 || company.length > 200 || jobTitle.length > 200)
    return { error: "Resume title, company and job title must be 200 characters or fewer." };

  const note = str(b.note);
  if (note.length > 4000) return { error: "Note must be 4000 characters or fewer." };

  const jobDescription = typeof b.jobDescription === "string" ? b.jobDescription : "";
  if (jobDescription.length > 60000)
    return { error: "Job description is too long to save (60,000 characters max)." };

  const appliedAtRaw = str(b.appliedAt);
  const appliedAt = appliedAtRaw ? new Date(appliedAtRaw) : new Date();
  if (Number.isNaN(appliedAt.getTime())) return { error: "Invalid date." };

  const meta: CatalogueMeta = {
    resumeTitle,
    company,
    jobTitle,
    jobDescription,
    note,
    appliedAt: appliedAt.toISOString(),
  };

  const raw = b.snapshot;
  if (raw === undefined || raw === null) {
    if (requireSnapshot) return { error: "Missing resume snapshot." };
    return { meta };
  }

  const snap = raw as Partial<CatalogueSnapshot>;
  if (typeof snap !== "object" || !snap.draft || !snap.wizard || !snap.basics) {
    return { error: "Invalid resume snapshot." };
  }

  return { meta, snapshot: { ...(snap as CatalogueSnapshot), version: 1 } };
}
