# Project Worklog

---
Task ID: 1
Agent: main (Z.ai Code orchestrator)
Task: Build the complete base Online Attendance Management System for Sankar Matriculation School (Next.js 16 + Prisma/SQLite + shadcn/ui), single-page app under `/`, all data access via API routes.

Work Log:
- Inspected project scaffold: Next.js 16 App Router, Tailwind 4, full shadcn/ui set, Prisma + SQLite (`db/custom.db`), `jose` present, `bcryptjs` absent (used Node `crypto` scrypt instead — zero new deps).
- `prisma/schema.prisma`: models `User` (username/passwordHash/name/role/active), `ClassSection` (name+section unique), `Subject`, `Student` (admissionNo unique, guardian, contact, active, class FK), `Attendance` (studentId+date unique, status PRESENT/ABSENT/LEAVE, markedBy FK SetNull, cascade delete with student). SQLite has no enums → validated strings. Pushed with `bun run db:push`.
- `prisma/seed.ts`: 3 users (admin/admin123, teacher1/teacher123, teacher2/teacher123), classes 1–10 section A, 5 subjects, 50 demo students (5 per class), ~1,200 attendance records across last 24 weekdays (up to yesterday). Run: `bun prisma/seed.ts`.
- `src/lib/auth.ts`: scrypt password hashing, JWT session via `jose` in httpOnly cookie `sms_session` (7d), `getSessionUser` reads cookie from Request.
- `src/lib/api-helpers.ts`: `requireAuth` / `requireAdmin` guards, `jsonError`, date validation. `src/lib/dates.ts`: local-timezone date helpers (todayStr, displayDate, presets, weekend check).
- API routes (all relative, role-guarded): auth (login/logout/me), students (GET with search/class filter + overall P/A/L/% stats, POST admin), students/[id] (PUT/DELETE admin), classes (GET/POST, PUT/DELETE with student-count guard), subjects CRUD, users (admin CRUD with self-delete + last-admin guards, password reset), attendance (GET roster with saved marks; POST bulk upsert transaction, future-date blocked), reports/class (per-student P/A/L/% + summary), reports/student (detail records + summary), reports/daily (per-class school summary), dashboard (stats + today's attendance).
- Frontend: single page `src/app/page.tsx` (client) with view switching (dashboard/attendance/students/reports/admin) + login gate. Components in `src/components/attendance/`: `login-view`, `app-shell` (sticky header, scrollable nav, role badge, sticky footer), `dashboard-view` (stat cards, today's attendance progress), `attendance-view` (class+date pickers, P/A/L segmented toggles with mobile short labels, mark-all-present, sticky save bar with live counts, already-marked badge), `students-view` (debounced search, class filter, responsive table, add/edit dialog, delete confirm), `reports-view` (Class/Student/Daily tabs, date presets, CSV export for class report, color-coded %), `admin-view` (Users/Classes/Subjects tabs with dialogs + confirms).
- Styling: emerald primary (light+dark) in `globals.css`; layout metadata/title updated; sonner Toaster (top-center, richColors).
- Verified RBAC via curl: teacher 403 on POST /students and /api/users; anon 401; future date 400. Data flows verified end-to-end.
- agent-browser E2E: login (admin+teacher), dashboard stats, mark attendance + save + toast (desktop 1280x720 and mobile 390x844), class/student/daily reports, students CRUD (add/edit/delete with toasts), admin tabs, teacher sees no Manage tab and read-only students, footer sticks to bottom on desktop and pushes naturally on mobile.
- Fixed during verification: reports-view loaded student list only on class *change* (now also on mount for default class; moved `loadClassStudents` above the effect to avoid TDZ). Removed leftover unused code in students-view.
- Note: agent-browser session once stopped delivering mouse events after `set viewport` mid-session; fresh session fixed it (tooling quirk, not an app bug — confirmed via programmatic click working and window-level event listeners receiving nothing).

Stage Summary:
- Working base app: secure role-based auth (admin/teacher), class + date attendance marking with edit support, student CRUD with attendance %, class/student/daily reports with CSV export, admin management of users/classes/subjects, dashboard, responsive mobile-first UI, sticky footer.
- Seed logins: admin/admin123, teacher1/teacher123, teacher2/teacher123.
- Vercel plan (not yet done): swap Prisma provider sqlite→postgresql (Neon/Vercel Postgres free tier) + `SESSION_SECRET` env at deploy time; schema is portable, no code changes expected beyond provider/env.
- Next candidate features (only if needed): teacher–class assignments, subject-wise attendance, password change UI for teachers, pagination, backup/restore screen, SRS/test-case docs for deliverables.
