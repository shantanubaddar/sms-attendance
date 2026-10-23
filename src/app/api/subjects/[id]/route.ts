import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/subjects/[id] — update a subject. Auth: admin only. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  const existing = await db.subject.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : existing.name;
  const code = "code" in body ? (body.code ? String(body.code).trim().toUpperCase() : null) : existing.code;

  try {
    const subject = await db.subject.update({ where: { id }, data: { name, code } });
    return NextResponse.json({ subject });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: `Subject "${name}" already exists` }, { status: 409 });
    }
    console.error("update subject error", e);
    return NextResponse.json({ error: "Could not update subject" }, { status: 500 });
  }
}

/** DELETE /api/subjects/[id] — delete a subject. Auth: admin only. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  const existing = await db.subject.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  await db.subject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
