import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isDateStr } from "@/lib/api-helpers";

/**
 * GET /api/reports/class?classId=&from=&to=
 * Class attendance report for a date range: per-student counts + percentage.
 * Auth: teacher + admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("res" in auth) return auth.res;

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  if (!classId || !isDateStr(from) || !isDateStr(to)) {
    return NextResponse.json({ error: "classId, from and to dates (YYYY-MM-DD) are required" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "'From' date must be before 'To' date" }, { status: 400 });
  }

  const cls = await db.classSection.findUnique({ where: { id: classId } });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const students = await db.student.findMany({
    where: { classSectionId: classId, active: true },
    orderBy: { admissionNo: "asc" },
    select: { id: true, admissionNo: true, name: true },
  });

  const records = await db.attendance.findMany({
    where: {
      date: { gte: from, lte: to },
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true, status: true, date: true },
  });

  const distinctDates = new Set(records.map((r) => r.date));
  const byStudent = new Map<string, { p: number; a: number; l: number }>();
  for (const s of students) byStudent.set(s.id, { p: 0, a: 0, l: 0 });

  for (const r of records) {
    const agg = byStudent.get(r.studentId);
    if (!agg) continue;
    if (r.status === "PRESENT") agg.p += 1;
    else if (r.status === "ABSENT") agg.a += 1;
    else if (r.status === "LEAVE") agg.l += 1;
  }

  const rows = students.map((s) => {
    const agg = byStudent.get(s.id)!;
    const total = agg.p + agg.a + agg.l;
    return {
      ...s,
      present: agg.p,
      absent: agg.a,
      leave: agg.l,
      total,
      pct: total > 0 ? Math.round((agg.p / total) * 1000) / 10 : null,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({ p: acc.p + r.present, a: acc.a + r.absent, l: acc.l + r.leave }),
    { p: 0, a: 0, l: 0 }
  );
  const totalMarks = totals.p + totals.a + totals.l;

  return NextResponse.json({
    classSection: { id: cls.id, name: cls.name, section: cls.section },
    from,
    to,
    markedDays: distinctDates.size,
    rows,
    summary: {
      students: students.length,
      present: totals.p,
      absent: totals.a,
      leave: totals.l,
      pct: totalMarks > 0 ? Math.round((totals.p / totalMarks) * 1000) / 10 : null,
    },
  });
}
