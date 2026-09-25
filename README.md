# FlowSched — Industrial Engineering Faculty Workload Management System

Monorepo foundation (Phase 1). Two apps plus one shared package:

- `apps/web` — React + TypeScript frontend (Vite, Tailwind CSS, React Router, Zustand).
- `apps/api` — Express + TypeScript backend (Prisma + SQLite for local dev / PostgreSQL for production, Zod validation, JWT-ready).
- `packages/shared` — shared TypeScript enums/types (`Role`, `EmploymentStatus`, `DayOfWeek`, `Semester`).

## Prerequisites

- Node.js >= 20, npm >= 10

No Docker or database server is needed for local development — the API uses a local SQLite file.

## Quickstart

1. No database server needed — local dev uses the SQLite file (`apps/api/prisma/dev.db`) that Prisma creates in step 3.

2. Configure environment:

   ```powershell
   copy .env.example .env
   copy apps\api\.env.example apps\api\.env
   ```

   | Variable | Used by | Purpose |
   |---|---|---|
   | `JWT_SECRET` | `apps/api` (Phase 2) | Signs short-lived access tokens |
   | `JWT_REFRESH_SECRET` | `apps/api` (Phase 2) | Signs long-lived refresh tokens |
   | `PORT` | `apps/api` | Port the Express server listens on (default `4000`) |
   | `CORS_ORIGIN` | `apps/api` | Allowed browser origin for CORS (Vite dev server, default `http://localhost:5173`) |
   | `VITE_API_URL` | `apps/web` | Base URL the frontend uses to reach the API (default `http://localhost:4000`) |

3. Install, migrate, seed:

   ```powershell
   npm install
   npm run migrate:dev --workspace apps/api
   npm run seed --workspace apps/api
   ```

4. Run dev servers (two terminals):

   ```powershell
   npm run dev --workspace apps/api   # http://localhost:4000/api/health
   npm run dev --workspace apps/web   # http://localhost:5173
   ```

5. Run tests:

   ```powershell
   npm run test --workspace apps/api
   npm run test --workspace apps/web
   ```

6. Inspect data: `npx prisma studio --schema prisma/schema.prisma` from `apps/api`.
