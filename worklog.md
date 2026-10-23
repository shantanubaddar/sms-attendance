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

---
Task ID: 2
Agent: main (Z.ai Code orchestrator)
Task: Redesign the login page with three pill tabs (Student / Admin / Teacher) that slide the semi-transparent background into role-specific photos, re-theme the whole site to the school logo palette (orange / lime / sky), and add a working Student login with a read-only "My Attendance" portal.

Work Log:
- Assets: copied the 3 uploaded photos to `public/images/` (login-students = classroom, login-admin = office, login-teacher = teacher+laptop) and logo to `public/logo-full.png`. Extracted exact logo colors with PIL (orange #F07020, lime #B0E010, sky #90D0E0), converted to OKLCH, and generated a transparent circles-only `public/logo-mark.png` (also dropped in `src/app/icon.png` as favicon). NOTE: `logo-removebg-preview.png` text is NOT white (verified 0 near-white pixels) — used cropped mark + HTML text for the brand row instead.
- Theme (`globals.css`): primary → logo orange oklch(0.639 0.179 43.8) (#E05E15, 3.63:1 vs white), ring → lighter orange, chart-1..5 → logo palette; dark mode mirrors. Emerald kept only for semantic "Present/positive" states. Fixed CSS syntax error: `//` comments after custom props are invalid postcss — must be `/* */`.
- Backend STUDENT role: `Student` model + `username @unique` + `passwordHash` (scrypt). `lib/auth.ts`: Role + "STUDENT", session claims carry `studentId`, verifySession accepts it. Login route: staff lookup first, then student lookup (username lowercased; seeded = admission no e.g. `sms0001`, password `student123`), 401 on inactive/missing hash. New `GET /api/me/student` (requireStudent, session-scoped): profile, overall P/A/L/%, this-month summary, last-6-months breakdown, today status, recent 45 records. Added `requireStaff` (ADMIN|TEACHER) in api-helpers and swapped it into all staff routes (attendance, dashboard, classes, students, subjects, reports/*) — students get 403 there (curl-verified).
- Seed: every demo student now gets `username = sms####` + shared `student123`; reseeded (1200 records).
- Login page rewrite (`login-view.tsx`): full-viewport dark stage, 3-slide background track (next/image fill, priority) that translates X by selected pill index (700ms ease, motion-reduce safe) under a semi-transparent black gradient veil; role-tinted ambient glow that cross-fades (sky/orange/lime). Three pill tabs side by side (role=tablist/tab, h-11 touch targets, glass inactive style, filled accent when active). Glassmorphism card (bg-white/10 backdrop-blur border-white/25) with per-role icon chip, title/description, username label ("Admission No." for students), glass inputs with role-colored focus rings, role-colored rounded submit, glass demo-credentials box that switches per role. Compressed vertical rhythm so the whole page fits 1280x720 without scrolling; footer pinned via flex + mt-auto on min-h-svh.
- Student frontend: new `student-view.tsx` (greeting + class + today badge, overall % with P/A/L tiles, this-month % + pure-CSS 6-month bar chart, scrollable recent records with status badges, skeleton + retry states). `types.ts` + Role/SessionUser.studentId + StudentPortalData. `app-shell.tsx`: logo-mark header, STUDENT_NAV ("My Attendance"), role-colored badges (Admin=primary orange, Teacher=lime tint, Student=sky tint), active nav uses bg-primary. `page.tsx` renders StudentView for STUDENT sessions. Dashboard stat chips re-tinted emerald → primary.
- Verification: lint clean; curl matrix (student login 200 + me/student data, student→staff APIs 403, wrong pw 401, staff login intact, attendance roster 200 — note param is `classId` not `classSectionId`). agent-browser E2E desktop 1280x720 AND mobile 390x844: pill switching slides background to correct image with matching accent; student/admin/teacher login flows all land on correct views; wrong-password glass error; student portal shows real data (87.5% overall / 93.8% month / bars / records); footer sticks on short pages and pushes naturally on long ones; zero console/page errors. Hit the known agent-browser quirk again (mouse events dead after `set viewport` mid-session) — fresh session fixed it.
- Restarted dev server once (kill PIDs + `bun run dev`) because the pre-schema-push process held a stale Prisma client (500 "Unknown argument username").

Stage Summary:
- Login page: three pill portals with sliding photo backgrounds themed sky/orange/lime from the logo; site-wide logo palette; favicon + header now use the circle mark.
- Student portal is live: admission-no login, read-only personal attendance (overall/month/6-month trend/recent records), fully RBAC-isolated from staff APIs.
- Demo logins now: admin/admin123 · teacher1|teacher2/teacher123 · any student SMS0001–SMS0050 / student123.
- Not yet done (candidates next): admin UI to set/reset student passwords on student create/edit, Vercel deploy (sqlite→postgres provider swap + SESSION_SECRET), docs deliverables.

---
Task ID: 3
Agent: main (Z.ai Code orchestrator)
Task: Make the app deployable on Vercel — migrate from SQLite to PostgreSQL (Neon), fix build config for Vercel, verify the app end-to-end against a real Postgres, and prepare the git repo for push.

Work Log:
- Changed `prisma/schema.prisma` datasource provider sqlite → postgresql (schema models unchanged — fully portable).
- `package.json`: `build` is now plain `next build` (Vercel-safe); standalone-copy logic moved to `build:standalone`; added `postinstall: prisma generate` so Vercel builds generate the Prisma client.
- `next.config.ts`: `output: "standalone"` now conditional (`process.env.VERCEL ? {} : { output: "standalone" }`) — standalone is for sandbox/self-host only, must be off on Vercel.
- `src/lib/db.ts`: Prisma query logging disabled when NODE_ENV=production (clean Vercel logs).
- `.env.example` added (gitignored `.env*` excepted via `!.env.example`) documenting local + Neon pooled URL and SESSION_SECRET. `.gitignore`: added `/.pgdata`, `/.pgbin`, `/db`, `!.env.example`. Untracked `.env` and `db/custom.db` from git (were committed in initial snapshot; old .env held only the sqlite file path, no secrets).
- Sandbox has no postgres, no docker, no sudo; npm `embedded-postgres` binary needed libicui18n.so.60 (absent, Debian trixie has ICU 76). Solution: Zonky self-contained PG 17.4 binaries from Maven Central (~15MB, statically linked, no ICU) in `./.pgbin`, cluster in `./.pgdata`, port 5433, db `sms`, user postgres/postgres. `scripts/db-server.ts` (re)starts it idempotently and creates the DB (uses `pg` dev dep; zonky ships no psql).
- GOTCHA: sandbox shell exports `DATABASE_URL=file:...` which overrides `.env` (real env > dotenv). Prisma/bun both follow that precedence. Locally must export the PG URL inline before db:push/seed/dev. On Vercel this conflict can't occur (env comes from project settings only).
- Verified against real Postgres: `db:push` OK, seed OK (3 users/50 students/1200 records), dev server restarted with PG env, full curl matrix (admin+student login, /api/me/student data, dashboard, attendance roster, class report, student→staff 403) all pass, agent-browser login → student portal renders fresh PG data (95.8%). Lint clean. NOTE: `next build` not run in sandbox per environment rule — first real production build happens on Vercel; config changes follow Vercel's documented setup.
- Git repo committed (b5c6d2f) ready for `git push` to GitHub.

Stage Summary:
- Repo is Vercel-ready: Postgres schema, correct build scripts, env template, secrets untracked.
- Sandbox runs PG 17.4 on port 5433 (start with `bun scripts/db-server.ts`, then export DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sms before `bun run dev`).
- User steps remaining (account-bound, can't be done from sandbox): create Neon DB, push to GitHub, import in Vercel, set DATABASE_URL + SESSION_SECRET, run seed locally against Neon.
