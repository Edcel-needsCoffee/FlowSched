# Technology Stack

## Frontend

Framework:
React

Language:
TypeScript

Build Tool:
Vite

UI Framework:
Tailwind CSS

State Management:
Zustand

Routing:
React Router

---

## Backend

Language:
Node.js

Framework:
Express

ORM:
Prisma

Validation:
Zod

---

## Database

Database:
PostgreSQL

Migration:
Prisma Migrate

---

## Real-Time

Technology:
Socket.IO

Purpose:
Broadcasting live schedule-grid updates (a chairman moving a class updates any open instructor views instantly), instant conflict-warning notifications, and room-maintenance status changes — without requiring a page refresh or polling.

---

## Cache / Queue

Cache:
Redis

Queue:
Redis + BullMQ

Workers:
Node.js (BullMQ workers) — handle Excel schedule exports, bulk subject-catalog imports, and workload report generation.

---

## Authentication

Authentication:
JWT (access + refresh tokens)

Authorization:
RBAC — three roles: Department Head / Program Chair, Faculty Member, Academic Administrator.

---

## File Storage

Development:
LOCAL

Production:
S3-compatible (MinIO) — stores generated Excel schedule exports and workload reports.

---

## Testing

Unit:
Vitest

Integration:
Supertest (API route/service-layer tests)

E2E:
Playwright — covers the drag-and-drop schedule flow, role-based access, and conflict detection.

---

## Deployment

Runtime:
Node.js (Docker container)

Reverse Proxy:
Nginx

Environment:
Docker (Linux containers), deployable on-prem or on a single department server.

---

### Stack summary

```
React + TypeScript
+
Tailwind CSS
+
Express + TypeScript
+
PostgreSQL (Prisma)
+
Redis + BullMQ
+
Socket.IO
+
Playwright
```