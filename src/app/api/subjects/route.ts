import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/api-helpers";

/** GET /api/subjects — list subjects. Auth: any. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("res" in auth) return auth.res;

  const subjects = await db.subject.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ subjects });
}

/** POST /api/subjects — create a subject. Auth: admin only. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const code = typeof body?.code === "string" && body.code.trim() ? body.code.trim().toUpperCase() : null;

  if (!name) return NextResponse.json({ error: "Subject name is required" }, { status: 400 });

  try {
    const subject = await db.subject.create({ data: { name, code } });
    return NextResponse.json({ subject }, { status: 201 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: `Subject "${name}" already exists` }, { status: 409 });
    }
    console.error("create subject error", e);
    return NextResponse.json({ error: "Could not create subject" }, { status: 500 });
  }
}
