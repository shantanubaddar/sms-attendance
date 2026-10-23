import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
  verifyPassword,
} from "@/lib/auth";

/**
 * POST /api/auth/login  { username, password }
 * Staff accounts (ADMIN / TEACHER) live in the User table.
 * Students log in with the username on their Student record
 * (seeded as their admission number, lowercase) + password.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // ---- staff login ----
    const user = await db.user.findUnique({ where: { username } });
    if (user) {
      if (!user.active || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
      }
      const token = await signSession({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role === "ADMIN" ? "ADMIN" : "TEACHER",
      });
      const res = NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
      res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
      return res;
    }

    // ---- student login ----
    const student = await db.student.findUnique({
      where: { username },
      include: { classSection: true },
    });
    if (!student || !student.passwordHash || !student.active) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
    if (!verifyPassword(password, student.passwordHash)) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const token = await signSession({
      id: student.id,
      username: student.username,
      name: student.name,
      role: "STUDENT",
      studentId: student.id,
    });

    const res = NextResponse.json({
      user: {
        id: student.id,
        username: student.username,
        name: student.name,
        role: "STUDENT",
        studentId: student.id,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
