import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/users/[id] — update name/role/active/password. Auth: admin only. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.role === "ADMIN" || body.role === "TEACHER") data.role = body.role;
  if ("active" in body) data.active = Boolean(body.active);

  // Role / active changes must never leave the school without an active admin,
  // and an admin cannot lock themselves out.
  if (data.role === "TEACHER" && existing.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", active: true, NOT: { id } } });
    if (admins === 0) {
      return NextResponse.json(
        { error: "At least one active administrator account is required" },
        { status: 409 }
      );
    }
  }
  if (data.active === false && existing.active && existing.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", active: true, NOT: { id } } });
    if (admins === 0) {
      return NextResponse.json(
        { error: "You cannot deactivate the only active administrator" },
        { status: 409 }
      );
    }
  }
  if (data.active === false && existing.id === auth.user.id) {
    return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 409 });
  }

  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    data.passwordHash = hashPassword(body.password);
  }

  try {
    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch (e) {
    console.error("update user error", e);
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}

/** DELETE /api/users/[id] — delete a staff account. Auth: admin only. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(req);
  if ("res" in auth) return auth.res;

  const { id } = await ctx.params;
  if (id === auth.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 409 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (existing.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", active: true, NOT: { id } } });
    if (admins === 0) {
      return NextResponse.json(
        { error: "At least one active administrator account is required" },
        { status: 409 }
      );
    }
  }

  await db.user.delete({ where: { id } }); // attendance rows keep (markedById -> SetNull)
  return NextResponse.json({ ok: true });
}
