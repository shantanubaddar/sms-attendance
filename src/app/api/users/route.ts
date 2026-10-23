import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";

/** GET /api/users — list staff accounts. Auth: admin only. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

/** POST /api/users — create a staff account. Auth: admin only. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "ADMIN" ? "ADMIN" : "TEACHER";

  if (!username || !name || !password) {
    return NextResponse.json({ error: "Username, name and password are required" }, { status: 400 });
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-30 characters (letters, numbers, . _ - only)" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  try {
    const user = await db.user.create({
      data: { username, name, role, passwordHash: hashPassword(password) },
      select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: `Username "${username}" is already taken` }, { status: 409 });
    }
    console.error("create user error", e);
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}
