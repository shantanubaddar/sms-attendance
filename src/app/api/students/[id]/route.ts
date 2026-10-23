import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PUT /api/students/[id] — update a student. Auth: admin only.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  const existing = await db.student.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.admissionNo === "string" && body.admissionNo.trim()) {
    data.admissionNo = body.admissionNo.trim();
  }
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if ("gender" in body) data.gender = body.gender ? String(body.gender) : null;
  if ("guardianName" in body) data.guardianName = body.guardianName ? String(body.guardianName).trim() : null;
  if ("contact" in body) data.contact = body.contact ? String(body.contact).trim() : null;
  if ("active" in body) data.active = Boolean(body.active);
  if ("classSectionId" in body) {
    if (body.classSectionId) {
      const cls = await db.classSection.findUnique({ where: { id: body.classSectionId } });
      if (!cls) return NextResponse.json({ error: "Selected class does not exist" }, { status: 400 });
      data.classSectionId = body.classSectionId;
    } else {
      data.classSectionId = null;
    }
  }

  try {
    const student = await db.student.update({ where: { id }, data });
    return NextResponse.json({ student });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "That admission number is already used" }, { status: 409 });
    }
    console.error("update student error", e);
    return NextResponse.json({ error: "Could not update student" }, { status: 500 });
  }
}

/**
 * DELETE /api/students/[id] — permanently delete a student and their attendance.
 * Auth: admin only.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  const existing = await db.student.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  await db.student.delete({ where: { id } }); // attendance cascades
  return NextResponse.json({ ok: true });
}
