import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isDateStr, todayStr } from "@/lib/api-helpers";

/**
 * GET /api/attendance?classId=&date=
 * Returns the class roster with any attendance already marked for that date.
 * Auth: teacher + admin.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("res" in auth) return auth.res;

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") || "";
  const date = searchParams.get("date") || "";

  if (!classId || !isDateStr(date)) {
    return NextResponse.json({ error: "classId and a valid date (YYYY-MM-DD) are required" }, { status: 400 });
  }

  const cls = await db.classSection.findUnique({ where: { id: classId } });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const students = await db.student.findMany({
    where: { classSectionId: classId, active: true },
    orderBy: { admissionNo: "asc" },
  });

  const records = await db.attendance.findMany({
    where: { date, studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true, status: true },
  });
  const statusMap = new Map(records.map((r) => [r.studentId, r.status]));

  return NextResponse.json({
    classSection: { id: cls.id, name: cls.name, section: cls.section },
    date,
    alreadyMarked: records.length > 0,
    students: students.map((s) => ({
      id: s.id,
      admissionNo: s.admissionNo,
      name: s.name,
      status: statusMap.get(s.id) ?? null,
    })),
  });
}

const VALID_STATUSES = new Set(["PRESENT", "ABSENT", "LEAVE"]);

/**
 * POST /api/attendance — save attendance for a class on a date (bulk upsert).
 * Body: { classId, date, records: [{ studentId, status }] }
 * Auth: teacher + admin.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("res" in auth) return auth.res;

  const body = await req.json().catch(() => null);
  const classId = typeof body?.classId === "string" ? body.classId : "";
  const date = typeof body?.date === "string" ? body.date : "";
  const records = Array.isArray(body?.records) ? body.records : [];

  if (!classId || !isDateStr(date)) {
    return NextResponse.json({ error: "classId and a valid date (YYYY-MM-DD) are required" }, { status: 400 });
  }
  if (date > todayStr()) {
    return NextResponse.json({ error: "Attendance cannot be marked for a future date" }, { status: 400 });
  }
  if (records.length === 0) {
    return NextResponse.json({ error: "No attendance records to save" }, { status: 400 });
  }

  const cls = await db.classSection.findUnique({ where: { id: classId } });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const students = await db.student.findMany({
    where: { classSectionId: classId, active: true },
    select: { id: true },
  });
  const classStudentIds = new Set(students.map((s) => s.id));

  for (const r of records) {
    if (!r || typeof r.studentId !== "string" || !classStudentIds.has(r.studentId)) {
      return NextResponse.json({ error: "One of the students does not belong to this class" }, { status: 400 });
    }
    if (!VALID_STATUSES.has(r.status)) {
      return NextResponse.json({ error: "Status must be PRESENT, ABSENT or LEAVE" }, { status: 400 });
    }
  }

  await db.$transaction(
    records.map((r: { studentId: string; status: string }) =>
      db.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date } },
        create: { studentId: r.studentId, date, status: r.status, markedById: auth.user.id },
        update: { status: r.status, markedById: auth.user.id },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    saved: records.length,
    classSection: { id: cls.id, name: cls.name, section: cls.section },
    date,
  });
}
