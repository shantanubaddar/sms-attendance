/**
 * Small API helpers shared by all route handlers.
 */
import { NextResponse } from "next/server";
import { getSessionUser, type Role, type SessionUser } from "@/lib/auth";

export function jsonError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Requires any authenticated user. Returns user or a 401 response. */
export async function requireAuth(
  req: Request
): Promise<{ user: SessionUser } | { res: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) return { res: jsonError("Not authenticated", 401) };
  return { user };
}

/** Requires an authenticated ADMIN. Returns user or an error response. */
export async function requireAdmin(
  req: Request
): Promise<{ user: SessionUser } | { res: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) return { res: jsonError("Not authenticated", 401) };
  if (user.role !== "ADMIN") return { res: jsonError("Admin access required", 403) };
  return { user };
}

export function hasRole(user: SessionUser, role: Role): boolean {
  return user.role === role;
}

/** Validates "YYYY-MM-DD" strictly. */
export function isDateStr(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

/** Local "YYYY-MM-DD" for today. */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
