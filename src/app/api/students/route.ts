import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/api-helpers";

/**
 * GET /api/students?search=&classId=&active=
 * Returns students (with overall attendance stats) — auth: teacher + admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("res" in auth) return auth.res;

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const classId = searchParams.get("classId") || "";
  const active = searchParams.get("active") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { admissionNo: { contains: search } },
    ];
  }
  if (classId) where.classSectionId = classId;
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;

  const students = await db.student.findMany({
    where,
    include: { classSection: true },
    orderBy: [{ classSectionId: "asc" }, { admissionNo: "asc" }],
    take: 500,
  });

  // Aggregate overall attendance stats for the returned students
  const ids = students.map((s) => s.id);
  const group = ids.length
    ? await db.attendance.groupBy({
        by: ["studentId", "status"],
        where: { studentId: { in: ids } },
        _count: { _all: true },
      })
    : [];

  const stats = new Map<string, { p: number; a: number; l: number }>();
  for (const row of group) {
    const cur = stats.get(row.studentId) || { p: 0, a: 0, l: 0 };
    if (row.status === "PRESENT") cur.p += row._count._all;
    else if (row.status === "ABSENT") cur.a += row._count._all;
    else if (row.status === "LEAVE") cur.l += row._count._all;
    stats.set(row.studentId, cur);
  }

  const rows = students.map((s) => {
    const st = stats.get(s.id) || { p: 0, a: 0, l: 0 };
    const total = st.p + st.a + st.l;
    return {
      id: s.id,
      admissionNo: s.admissionNo,
      name: s.name,
      gender: s.gender,
      guardianName: s.guardianName,
      contact: s.contact,
      active: s.active,
      classSectionId: s.classSectionId,
      classSection: s.classSection,
      p: st.p,
      a: st.a,
      l: st.l,
      total,
      pct: total > 0 ? Math.round((st.p / total) * 1000) / 10 : null,
    };
  });

  return NextResponse.json({ students: rows });
}

/**
 * POST /api/students — create a student. Auth: admin only.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const body = await req.json().catch(() => null);
  const admissionNo = typeof body?.admissionNo === "string" ? body.admissionNo.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const classSectionId = typeof body?.classSectionId === "string" ? body.classSectionId : "";

  if (!admissionNo || !name) {
    return NextResponse.json({ error: "Admission number and name are required" }, { status: 400 });
  }
  if (!classSectionId) {
    return NextResponse.json({ error: "Please select a class" }, { status: 400 });
  }

  const cls = await db.classSection.findUnique({ where: { id: classSectionId } });
  if (!cls) return NextResponse.json({ error: "Selected class does not exist" }, { status: 400 });

  try {
    const student = await db.student.create({
      data: {
        admissionNo,
        name,
        gender: typeof body?.gender === "string" && body.gender ? body.gender : null,
        guardianName: typeof body?.guardianName === "string" && body.guardianName.trim() ? body.guardianName.trim() : null,
        contact: typeof body?.contact === "string" && body.contact.trim() ? body.contact.trim() : null,
        active: body?.active === false ? false : true,
        classSectionId,
      },
    });
    return NextResponse.json({ student }, { status: 201 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: `Admission number "${admissionNo}" is already used` },
        { status: 409 }
      );
    }
    console.error("create student error", e);
    return NextResponse.json({ error: "Could not create student" }, { status: 500 });
  }
}
