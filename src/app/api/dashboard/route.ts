import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaff, todayStr } from "@/lib/api-helpers";

/**
 * GET /api/dashboard — headline stats for the dashboard.
 * Auth: teacher + admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ("res" in auth) return auth.res;

  const today = todayStr();

  const [students, teachers, classes, subjects, todayRecords] = await Promise.all([
    db.student.count({ where: { active: true } }),
    db.user.count({ where: { role: "TEACHER", active: true } }),
    db.classSection.count(),
    db.subject.count(),
    db.attendance.findMany({
      where: { date: today },
      select: { status: true },
    }),
  ]);

  const summary = { present: 0, absent: 0, leave: 0 };
  for (const r of todayRecords) {
    if (r.status === "PRESENT") summary.present += 1;
    else if (r.status === "ABSENT") summary.absent += 1;
    else if (r.status === "LEAVE") summary.leave += 1;
  }
  const marked = summary.present + summary.absent + summary.leave;

  return NextResponse.json({
    today,
    stats: { students, teachers, classes, subjects },
    todayAttendance: {
      ...summary,
      marked,
      unmarked: Math.max(students - marked, 0),
      pct: marked > 0 ? Math.round((summary.present / marked) * 1000) / 10 : null,
    },
  });
}
