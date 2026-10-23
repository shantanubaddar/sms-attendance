import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PUT /api/classes/[id] — rename a class/section. Auth: admin only.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  const existing = await db.classSection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : existing.name;
  const section =
    typeof body?.section === "string" && body.section.trim()
      ? body.section.trim().toUpperCase()
      : existing.section;

  try {
    const cls = await db.classSection.update({ where: { id }, data: { name, section } });
    return NextResponse.json({ class: cls });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: `Class ${name}-${section} already exists` }, { status: 409 });
    }
    console.error("update class error", e);
    return NextResponse.json({ error: "Could not update class" }, { status: 500 });
  }
}

/**
 * DELETE /api/classes/[id] — blocked while students are assigned. Auth: admin only.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  const existing = await db.classSection.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  if (existing._count.students > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${existing._count.students} student(s) are still assigned to this class. Move or remove them first.`,
      },
      { status: 409 }
    );
  }

  await db.classSection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
