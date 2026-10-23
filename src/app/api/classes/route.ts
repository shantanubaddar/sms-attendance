import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/api-helpers";

/**
 * GET /api/classes — list classes with active student counts. Auth: any.
 */
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("res" in auth) return auth.res;

  const classes = await db.classSection.findMany({
    orderBy: [{ name: "asc" }, { section: "asc" }],
    include: { _count: { select: { students: { where: { active: true } } } } },
  });

  return NextResponse.json({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
      studentCount: c._count.students,
      createdAt: c.createdAt,
    })),
  });
}

/**
 * POST /api/classes — create a class/section. Auth: admin only.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const section = typeof body?.section === "string" && body.section.trim() ? body.section.trim().toUpperCase() : "A";

  if (!name) return NextResponse.json({ error: "Class name is required" }, { status: 400 });

  try {
    const cls = await db.classSection.create({ data: { name, section } });
    return NextResponse.json({ class: cls }, { status: 201 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: `Class ${name}-${section} already exists` },
        { status: 409 }
      );
    }
    console.error("create class error", e);
    return NextResponse.json({ error: "Could not create class" }, { status: 500 });
  }
}
