import { NextRequest, NextResponse } from "next/server";

import { getLoggedInUser } from "@/lib/appwrite/server";
import { createEntry, listEntries } from "@/lib/resume/catalogue.server";
import { failure, parseSaveBody, unauthorized } from "./shared";

export async function GET() {
  const user = await getLoggedInUser();
  if (!user) return unauthorized();

  try {
    return NextResponse.json({ entries: await listEntries(user.$id) });
  } catch (err) {
    return failure(err);
  }
}

export async function POST(req: NextRequest) {
  const user = await getLoggedInUser();
  if (!user) return unauthorized();

  const parsed = parseSaveBody(await req.json().catch(() => null), { requireSnapshot: true });
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const entry = await createEntry(user.$id, parsed.meta, parsed.snapshot!);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return failure(err);
  }
}
