import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Re-check against the database (catches deactivated / deleted accounts)
  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
}
