/**
 * Lightweight session auth for the Attendance Management System.
 * - Passwords hashed with Node's built-in scrypt (salted).
 * - Sessions are signed JWTs (jose) stored in an httpOnly cookie.
 * - No extra dependencies required.
 */
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "sms_session";
const SESSION_DAYS = 7;

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "sankar-sms-dev-secret-change-in-production"
);

export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  /** Set only for STUDENT sessions — the Student record id. */
  studentId?: string;
}

// ---------- password hashing (scrypt, no external deps) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ---------- JWT session ----------

export async function signSession(user: SessionUser): Promise<string> {
  const claims: Record<string, string> = {
    username: user.username,
    name: user.name,
    role: user.role,
  };
  if (user.studentId) claims.studentId = user.studentId;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub || typeof payload.role !== "string") return null;
    const role = payload.role;
    if (role !== "ADMIN" && role !== "TEACHER" && role !== "STUDENT") return null;
    return {
      id: payload.sub,
      username: String(payload.username ?? ""),
      name: String(payload.name ?? ""),
      role,
      studentId: typeof payload.studentId === "string" ? payload.studentId : undefined,
    };
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
  }
  return null;
}

/** Returns the session user for this request, or null. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * SESSION_DAYS,
};
