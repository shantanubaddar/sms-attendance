import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isDateStr } from "@/lib/api-helpers";

/**
 * GET /api/reports/student?studentId=&from=&to=
 * Individual student report: every attendance record in range + summary.
 * Auth: teacher + admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("res" in auth) return auth.res;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  if (!studentId || !isDateStr(from) || !isDateStr(to)) {
    return NextResponse.json({ error: "studentId, from and to dates (YYYY-MM-DD) are required" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "'From' date must be before 'To' date" }, { status: 400 });
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { classSection: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const records = await db.attendance.findMany({
    where: { studentId, date: { gte: from, lte: to } },
    orderBy: { date: "desc" },
  });

  const agg = { present: 0, absent: 0, leave: 0 };
  for (const r of records) {
    if (r.status === "PRESENT") agg.present += 1;
    else if (r.status === "ABSENT") agg.absent += 1;
    else if (r.status === "LEAVE") agg.leave += 1;
  }
  const total = agg.present + agg.absent + agg.leave;

  return NextResponse.json({
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      name: student.name,
      classSection: student.classSection,
      active: student.active,
    },
    from,
    to,
    records: records.map((r) => ({ date: r.date, status: r.status })),
    summary: { ...agg, total, pct: total > 0 ? Math.round((agg.present / total) * 1000) / 10 : null },
  });
}
