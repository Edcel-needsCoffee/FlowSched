# FlowSched — Application Architecture

## 1. Architecture Style

FlowSched uses a modular client-server architecture.

```
Browser (Chairman / Faculty / Academic Admin)
   |
   | HTTPS / REST
   | WebSocket for live schedule updates
   v
Backend Application
   |
   +---- Services / Business Logic (workload calc, conflict detection)
   |
   +---- Database (faculty, subjects, schedules, assignments, rooms)
   |
   +---- Redis / Cache / Queue
   |
   +---- Background Workers (report & Excel generation)
   |
   +---- External Services (email notifications, future SSO)
```

---

## 2. Frontend

The frontend (the schedule grid, dashboard, faculty/subject management screens) is responsible for:

- Rendering the weekly drag-and-drop schedule grid
- User interaction — dragging classes onto the grid, filtering by faculty/section
- Client-side state (in-progress drag position, filter selections, form inputs)
- Form interaction (add/edit faculty, subjects, workload assignments)
- API communication with the backend
- Real-time UI updates when a chairman changes the schedule while others are viewing it

The frontend must not:

- Access the database directly.
- Contain database credentials.
- Be the authoritative source of business rules (e.g. workload limits, conflict logic).
- Bypass backend authorization — a Faculty-role session must never be able to call chairman-only endpoints, even if the UI happens to expose the button.

---

## 3. Backend

The backend is responsible for:

- Authentication (login per role: Chairman, Faculty, Academic Administrator)
- Authorization (route-level and record-level — e.g. a Faculty user can only fetch their own workload)
- Validation (subject units, teaching-hour limits, schedule time ranges)
- Business logic — workload calculation, conflict detection (overlapping schedules, room double-booking, overloaded faculty)
- Database operations (CRUD for faculty, subjects, rooms, schedules, assignments)
- API endpoints (REST)
- Real-time event generation (schedule updates broadcast to connected clients)
- Background job dispatch (report/Excel generation)
- Logging
- Error handling

Business logic (workload calculation, conflict detection, room-maintenance checks) should reside in service/application layers rather than directly inside route handlers, so the same rules apply whether a request comes from the schedule grid, the workload dashboard, or a future bulk-import endpoint.

---

## 4. Database

The database is the authoritative persistent storage for faculty profiles, subjects, rooms, schedules, workload assignments, and user accounts.

Critical application data must not depend solely on:

- Browser storage
- Redis
- Cache
- WebSocket state

A dropped connection or cache flush must never be able to lose a faculty's schedule or workload record.

---

## 5. REST API

REST is the primary communication mechanism for:

- CRUD on faculty, subjects, rooms, schedules, and workload assignments
- Authentication (login/logout, session/token refresh)
- Data retrieval (dashboard summaries, workload reports, faculty schedules)
- Data modification (assigning a subject, updating a schedule slot, toggling room maintenance)
- Standard application operations

---

## 6. Real-Time Communication

Use WebSocket or Server-Sent Events where FlowSched genuinely needs live updates:

- **Live schedule grid** — if the chairman moves a class while an instructor has the schedule open, the instructor's view updates without a refresh.
- **Conflict notifications** — instant warning banners when a newly placed class conflicts with another instructor's load or a room under maintenance.
- **Room maintenance status changes** — reflected immediately across any open schedule views.
- **Workload dashboard** — optional live refresh as the chairman reassigns subjects across faculty.

Do not use real-time communication for ordinary CRUD operations (e.g. editing a faculty profile, adding a subject to the catalog) when REST is sufficient.

---

## 7. Background Processing

Long-running or resource-intensive operations should not block normal HTTP requests. Use background workers and a queue when appropriate.

Examples in FlowSched:

- Generating the final Excel schedule export (per faculty, per year/section, or department-wide)
- Bulk subject-catalog imports (e.g. importing a term's subject list from a spreadsheet)
- Workload summary/report generation for the Academic Administrator
- Email notifications (e.g. notifying a faculty member their schedule changed)

---

## 8. Frontend Interaction

Normal application operations behave like an AJAX/SPA application:

```
User Action (e.g. drag a class onto the grid)
   ↓
Frontend
   ↓
Async API Request
   ↓
Backend (validate, check conflicts, persist)
   ↓
Database
   ↓
Response
   ↓
Update UI (schedule grid re-renders the new placement)
```

Do not reload the entire browser page after normal CRUD operations — placing a class, editing a faculty profile, or toggling room maintenance must update in place.

Avoid using `window.location.reload()` as a shortcut for refreshing application data.

---

## 9. Error Handling

Errors must be handled at every layer.

**Frontend:**
- Display useful feedback (e.g. "This overlaps Engr. Ramos's existing class — assign anyway?").
- Preserve user input where appropriate (e.g. don't clear a partially filled "Add Class" form on a failed save).
- Provide retry options for failed requests (e.g. failed Excel export).

**Backend:**
- Return consistent error responses (status code + message shape).
- Log diagnostic information (who attempted what, and why it failed).
- Do not expose sensitive internal information (stack traces, query details) to the client.

**Database:**
- Handle constraint and transaction failures safely (e.g. two chairmen saving conflicting schedule changes at once).

---

## 10. Scalability

FlowSched should be designed so that:

- Backend components can scale independently where practical (API servers vs. background workers).
- Long-running operations (bulk imports, report generation) move to workers instead of blocking requests.
- Real-time communication (live schedule updates) can support multiple backend instances if the department's usage grows.
- Redis can be introduced for caching (e.g. dashboard summaries), queues (background jobs), or coordination (WebSocket pub/sub across instances).
- The database remains the single source of truth for faculty, schedule, and workload data.

Do not introduce unnecessary infrastructure — a single department deployment doesn't need the same scale-out setup as a multi-campus system; add Redis, workers, and multi-instance WebSocket coordination only when actual load requires it.