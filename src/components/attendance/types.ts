/** Shared types for the Attendance Management System frontend. */

export type Role = "ADMIN" | "TEACHER";
export type AttStatus = "PRESENT" | "ABSENT" | "LEAVE";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface ClassSection {
  id: string;
  name: string;
  section: string;
  studentCount?: number;
}

export interface StudentRow {
  id: string;
  admissionNo: string;
  name: string;
  gender?: string | null;
  guardianName?: string | null;
  contact?: string | null;
  active: boolean;
  classSectionId?: string | null;
  classSection?: { id: string; name: string; section: string } | null;
  p?: number;
  a?: number;
  l?: number;
  total?: number;
  pct?: number | null;
}

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface SubjectRow {
  id: string;
  name: string;
  code?: string | null;
}

export interface RosterStudent {
  id: string;
  admissionNo: string;
  name: string;
  status: AttStatus | null;
}

export interface ClassReportRow {
  id: string;
  admissionNo: string;
  name: string;
  present: number;
  absent: number;
  leave: number;
  total: number;
  pct: number | null;
}

export interface DashboardData {
  today: string;
  stats: { students: number; teachers: number; classes: number; subjects: number };
  todayAttendance: {
    present: number;
    absent: number;
    leave: number;
    marked: number;
    unmarked: number;
    pct: number | null;
  };
}

export const STATUS_LABELS: Record<AttStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LEAVE: "Leave",
};

export function classLabel(c: { name: string; section: string } | null | undefined): string {
  if (!c) return "No class";
  return `Class ${c.name}-${c.section}`;
}
