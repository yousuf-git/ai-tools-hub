import { NextRequest, NextResponse } from "next/server";

import { getLoggedInUser } from "@/lib/appwrite/server";
import { deleteEntry, getEntry, updateEntry } from "@/lib/resume/catalogue.server";
import { failure, parseSaveBody, unauthorized } from "../shared";

const notFound = () =>
  NextResponse.json({ error: "That resume is no longer in your catalogue." }, { status: 404 });

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getLoggedInUser();
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    const entry = await getEntry(user.$id, id);
    return entry ? NextResponse.json({ entry }) : notFound();
  } catch (err) {
    return failure(err);
  }
}

// Metadata-only edits omit `snapshot`; re-saving an open resume includes it.
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getLoggedInUser();
  if (!user) return unauthorized();

  const parsed = parseSaveBody(await req.json().catch(() => null), { requireSnapshot: false });
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id } = await params;
  try {
    const entry = await updateEntry(user.$id, id, parsed.meta, parsed.snapshot);
    return entry ? NextResponse.json({ entry }) : notFound();
  } catch (err) {
    return failure(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getLoggedInUser();
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    return (await deleteEntry(user.$id, id)) ? NextResponse.json({ ok: true }) : notFound();
  } catch (err) {
    return failure(err);
  }
}
