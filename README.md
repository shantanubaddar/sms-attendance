# 🏫 Online Attendance Management System

**Sankar Matriculation School — Sankagiri West, Namakkal District, Tamil Nadu**

A full-stack school attendance app with three role-based portals (Admin / Teacher / Student), built to run locally or on **Vercel + Neon PostgreSQL** for free.

## Features

- **Three-portal login** (Student / Admin / Teacher) with animated role-photo backgrounds and school-logo theme (orange · lime · sky)
- **Admin** — manage students, classes, subjects and staff accounts
- **Teachers** — mark daily attendance per class, review and edit records
- **Students** — personal *My Attendance* portal: overall %, monthly trend chart, recent records
- **Reports** — daily sheet, per-class summary, per-student history
- **Dashboard** — today's snapshot and school-wide stats
- Mobile-first responsive UI, sticky-footer layout, light/dark support
- Secure: scrypt-hashed passwords, httpOnly JWT sessions, role-guarded APIs

## Tech Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma ORM · PostgreSQL · JWT (`jose`)

---

## 1 · Run it locally (~10 minutes)

**Prerequisites:** [Node.js 20+](https://nodejs.org) and a free PostgreSQL database from [Neon](https://neon.tech) (sign up with GitHub → create a project → Dashboard → **Connect** → copy the **Pooled** connection string).

```bash
# 1. install dependencies (auto-runs prisma generate)
npm install

# 2. create a `.env` file in this folder (see .env.example):
#    DATABASE_URL="postgresql://...neon-pooled-url.../neondb?sslmode=require"
#    SESSION_SECRET="<long random string>"

# 3. create tables + demo data
npx prisma db push
npm run db:seed

# 4. start the dev server
npm run dev        →  http://localhost:3000
```

> Generate a session secret with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 2 · Deploy on Vercel (free, ~15 minutes)

### Step 1 — Database
Use the **same Neon database** you set up locally — then there is nothing else to do; production connects to data that already exists.
*(Want a separate production DB? Create another Neon project and run `npx prisma db push` + `npm run db:seed` against it.)*

### Step 2 — Push to GitHub
This folder is already a git repository (branch `main`) with a clean history:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

`.env` is gitignored — your secrets never get uploaded.

### Step 3 — Import into Vercel
1. Go to [vercel.com](https://vercel.com) → sign up with GitHub → **Add New… → Project** → import your repo.
2. The **Next.js** framework preset is auto-detected — leave build settings untouched.
3. Under **Environment Variables**, add for *Production, Preview and Development*:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon **Pooled** connection string (must end with `?sslmode=require`) |
   | `SESSION_SECRET` | the **same** long random string you used locally |

4. Click **Deploy** — the first build takes ~2 minutes.
5. Live at `https://<your-project>.vercel.app` 🎉

From now on every `git push` to `main` auto-redeploys the site.

<details>
<summary>Alternative: deploy with the Vercel CLI (no GitHub)</summary>

```bash
npm install -g vercel
vercel login
vercel               # preview deploy
vercel --prod        # production deploy
# add env vars first:  vercel env add DATABASE_URL   /   vercel env add SESSION_SECRET
```
</details>

### ⚠️ Important
- Keep `SESSION_SECRET` **the same value forever** — changing it logs out every user.
- **Change the demo passwords before real use** (passwords currently live in `prisma/seed.ts`; an in-app password manager is a planned feature).

## Demo Logins (seed data)

| Portal | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Teacher | `teacher1` or `teacher2` | `teacher123` |
| Student | `sms0001` … `sms0050` (admission no, case-insensitive) | `student123` |

The seed also creates classes 1–10 (Section A), 5 subjects and ~24 weekdays of attendance history.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server at `http://localhost:3000` |
| `npm run build` | production build (runs `prisma generate` first) |
| `npx prisma db push` | sync `prisma/schema.prisma` to the database |
| `npm run db:seed` | **reset + reseed** demo data (deletes existing rows!) |
| `npm run lint` | ESLint check |
| `npx prisma studio` | browse/edit the database in a GUI |

## Troubleshooting

| Problem | Fix |
|---|---|
| `P1001: Can't reach database server` | Use the Neon **Pooled** URL and keep `?sslmode=require` at the end |
| Login returns 500 | `SESSION_SECRET` missing in Vercel environment variables |
| Everyone logged out after a deploy | `SESSION_SECRET` value changed — keep it constant |
| Seed fails with "Unknown argument…" | Run `npx prisma db push` first (schema not applied yet) |
| First request on the live site is slow | Neon free tier sleeps when idle — the first hit wakes it (~1s) |

## Project Structure

```
prisma/schema.prisma          database models (User, Student, ClassSection, Subject, Attendance)
prisma/seed.ts                demo-data seeder
src/app/api/…                 REST API routes (auth, students, attendance, reports, dashboard)
src/components/attendance/    app views (login, dashboard, attendance, reports, admin, student portal)
src/lib/                      auth (JWT + scrypt), prisma client, helpers
public/images/                login portal photos · public/logo-*.png  school logo
```

> `scripts/`, `examples/`, `tests/`, `upload/` and `worklog.md` are development helpers/artifacts from the build environment — the deployed app doesn't use them.
