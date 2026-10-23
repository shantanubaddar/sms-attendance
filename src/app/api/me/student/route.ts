import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/api-helpers";

/**
 * GET /api/me/student
 * The logged-in student's own attendance portal data:
 * profile, overall summary, this-month summary, last-6-months
 * breakdown and recent records. Students can only ever see
 * their own data (scoped by the session's studentId).
 */
export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if ("res" in auth) return auth.res;

  const studentId = auth.user.studentId!;

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { classSection: true },
  });
  if (!student || !student.active) {
    return NextResponse.json({ error: "Student account unavailable" }, { status: 403 });
  }

  const records = await db.attendance.findMany({
    where: { studentId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const now = new Date();
  const monthKey = (dateStr: string) => dateStr.slice(0, 7); // "YYYY-MM"
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const sum = (rows: { status: string }[]) => {
    let present = 0,
      absent = 0,
      leave = 0;
    for (const r of rows) {
      if (r.status === "PRESENT") present += 1;
      else if (r.status === "ABSENT") absent += 1;
      else if (r.status === "LEAVE") leave += 1;
    }
    const total = present + absent + leave;
    return { present, absent, leave, total, pct: total > 0 ? Math.round((present / total) * 1000) / 10 : null };
  };

  const overall = sum(records);
  const monthRows = records.filter((r) => monthKey(r.date) === thisMonth);
  const thisMonthSummary = sum(monthRows);

  // last 6 months (oldest first)
  const months: {
    key: string;
    label: string;
    present: number;
    absent: number;
    leave: number;
    total: number;
    pct: number | null;
  }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rows = records.filter((r) => monthKey(r.date) === key);
    const s = sum(rows);
    months.push({
      key,
      label: d.toLocaleString("en-IN", { month: "short" }),
      ...s,
    });
  }

  const todayRecord = records.find((r) => r.date === todayStr) || null;

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      admissionNo: student.admissionNo,
      username: student.username,
      classSection: student.classSection
        ? { name: student.classSection.name, section: student.classSection.section }
        : null,
    },
    overall,
    thisMonth: thisMonthSummary,
    months,
    todayStatus: todayRecord ? todayRecord.status : null,
    recent: records.slice(0, 45).map((r) => ({ date: r.date, status: r.status })),
  });
}
