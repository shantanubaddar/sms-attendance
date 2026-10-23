import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff, isDateStr } from "@/lib/api-helpers";

/**
 * GET /api/reports/daily?date=
 * Daily summary for the whole school: per-class present/absent/leave/unmarked.
 * Auth: teacher + admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("res" in auth) return auth.res;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || "";
  if (!isDateStr(date)) {
    return NextResponse.json({ error: "A valid date (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const classes = await db.classSection.findMany({
    orderBy: [{ name: "asc" }, { section: "asc" }],
    include: { students: { where: { active: true }, select: { id: true } } },
  });

  const records = await db.attendance.findMany({
    where: { date },
    select: { studentId: true, status: true },
  });
  const statusByStudent = new Map(records.map((r) => [r.studentId, r.status]));

  const rows = classes.map((c) => {
    const strength = c.students.length;
    let present = 0,
      absent = 0,
      leave = 0;
    for (const s of c.students) {
      const st = statusByStudent.get(s.id);
      if (st === "PRESENT") present += 1;
      else if (st === "ABSENT") absent += 1;
      else if (st === "LEAVE") leave += 1;
    }
    const marked = present + absent + leave;
    return {
      id: c.id,
      name: c.name,
      section: c.section,
      strength,
      present,
      absent,
      leave,
      unmarked: strength - marked,
      pct: marked > 0 ? Math.round((present / marked) * 1000) / 10 : null,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      strength: acc.strength + r.strength,
      present: acc.present + r.present,
      absent: acc.absent + r.absent,
      leave: acc.leave + r.leave,
      unmarked: acc.unmarked + r.unmarked,
    }),
    { strength: 0, present: 0, absent: 0, leave: 0, unmarked: 0 }
  );

  return NextResponse.json({ date, rows, totals });
}
