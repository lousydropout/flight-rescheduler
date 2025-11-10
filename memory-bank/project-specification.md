# **AI Flight Lesson Rescheduler — Local SQLite Version**

## **Overview**

A local simulation of a single flight school that automatically cancels and reschedules lessons when weather turns bad.

All logic runs in a single **Bun + Hono** backend with **Bun's built-in SQLite database**.

The frontend (React + Vite) polls API routes for live updates.

No external services, no cloud, no Docker — entirely local.

---

## **1. System Scope**

| Entity      | Count                                                         | Notes                                                               |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Instructors | 5                                                             | Available 8 AM – 5 PM                                               |
| Planes      | 5                                                             | Interchangeable                                                     |
| Students    | 20                                                            | Each has training level + preferred time (morning, noon, afternoon) |
| Flights     | 1-hour lessons, 2 per week per student                        |                                                                     |
| Routes      | Fixed list around Austin (e.g., KAUS–KGTU, KAUS–KHYI)         |                                                                     |
| Weather     | Normally clear; bad weather manually simulated via POST route |                                                                     |

---

## **2. Core Objectives**

1. Create local SQLite schema and seed data.

2. Simulate normal schedule with clear weather.

3. Allow POST `/simulate-weather` to create temporary "bad weather" windows.

4. Cancel overlapping flights during weather events.

5. Deterministically reschedule cancelled flights into next available slots.

6. Expose JSON endpoints for frontend polling (`/flights`, `/weather`, `/alerts`).

7. Build a local React dashboard to visualize everything.

8. Later: optional GPT ranking for reschedule suggestions.

---

## **3. Architecture**

```
flight-rescheduler/

├── backend/  (Bun + Hono)
│   ├── src/
│   │   ├── index.ts        # Hono app
│   │   ├── db.ts           # Bun:sqlite connection + helpers
│   │   ├── seed.ts         # inserts demo data
│   │   ├── routes/
│   │   │   ├── flights.ts
│   │   │   ├── weather.ts
│   │   │   ├── alerts.ts
│   │   │   ├── reschedule.ts
│   │   │   └── seed.ts
│   │   └── services/
│   │       ├── simulateWeather.ts
│   │       ├── safetyCheck.ts
│   │       └── rescheduler.ts
│   ├── schema.sql
│   └── bun.toml
└── frontend/  (React + Vite)
```

---

## **4. Database Schema (SQLite)**

```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  level TEXT,
  preferred_time TEXT
);

CREATE TABLE instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT
);

CREATE TABLE planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tail_number TEXT
);

CREATE TABLE flights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  instructor_id INTEGER,
  plane_id INTEGER,
  start_time TEXT,
  end_time TEXT,
  route TEXT,
  status TEXT
);

CREATE TABLE weather_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_time TEXT,
  end_time TEXT,
  affected_routes TEXT,
  condition TEXT
);

CREATE TABLE reschedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flight_id INTEGER,
  suggested_time TEXT,
  instructor_id INTEGER,
  plane_id INTEGER,
  accepted INTEGER,
  rank REAL,
  reason TEXT
);

CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  message TEXT
);
```

---

# **Task Breakdown for Codex**

---

## **Epic 1 — Environment Setup**

1. Initialize project:

   ```bash
   mkdir flight-rescheduler-backend && cd flight-rescheduler-backend
   bun init
   bun add hono bun:sqlite
   ```

2. Create `src/db.ts`:

   ```ts
   import { Database } from "bun:sqlite";

   export const db = new Database("flight.db");

   export const query = (sql: string, params?: any[]) => db.query(sql).all(params);
   ```

3. Run `schema.sql` on startup if tables don't exist.

---

## **Epic 2 — Seeding & Baseline Data**

1. Implement `/seed` route:

   * Inserts 5 instructors, 5 planes, 20 students.

   * Creates 40 flights randomly distributed through the week.

   * Writes an alert summarizing seed results.

2. Add helper to check if data already seeded.

3. Test:

   ```bash
   curl -X POST http://localhost:4000/seed
   ```

---

## **Epic 3 — Simulation Logic**

1. **Weather Simulation**

   * `POST /simulate-weather` accepts `{ condition, duration_hours }`.

   * Randomly select 2–3 routes; insert into `weather_events`.

   * Log: "Storm affecting KAUS–KHYI for 3 h."

2. **Safety Check**

   * Function `cancelFlightsDuringWeather()`.

   * For each flight overlapping a weather event → set `status='cancelled'`, insert alert.

3. **Rescheduler**

   * `POST /reschedule`.

   * For each cancelled flight:

     * Find next available instructor and plane.

     * Prefer student's `preferred_time`.

     * Reassign flight's `start_time` and mark `status='rescheduled'`.

     * Insert alert: "Flight 23 rescheduled to 2025-11-10 10:00."

4. Verify loop:

   ```
   POST /seed
   POST /simulate-weather
   POST /reschedule
   GET /flights
   ```

---

## **Epic 4 — API Endpoints**

| Route               | Method | Description                                           |
| ------------------- | ------ | ----------------------------------------------------- |
| `/flights`          | GET    | Return all flights with student/instructor/plane info |
| `/weather`          | GET    | Return all active weather events                      |
| `/alerts`           | GET    | Return latest 50 alerts                               |
| `/simulate-weather` | POST   | Trigger bad weather event                             |
| `/reschedule`       | POST   | Run deterministic rescheduler                         |
| `/seed`             | POST   | Populate DB                                           |

Add CORS:

```ts
import { cors } from "hono/cors";
app.use("*", cors());
```

---

## **Epic 5 — Frontend (React + Vite)**

1. Initialize:

   ```bash
   npm create vite@latest flight-rescheduler-frontend -- --template react-ts
   ```

2. `.env`:

   ```
   VITE_API_BASE=http://localhost:4000
   ```

3. Components:

   * `FlightsTable.tsx`

   * `WeatherTable.tsx`

   * `AlertsFeed.tsx`

   * `Dashboard.tsx`

4. Hooks:

   ```ts
   useEffect(() => {
     const fetchData = async () => {
       const [f, w, a] = await Promise.all([
         fetch(`${API}/flights`).then(r=>r.json()),
         fetch(`${API}/weather`).then(r=>r.json()),
         fetch(`${API}/alerts`).then(r=>r.json())
       ]);
       setFlights(f); setWeather(w); setAlerts(a);
     };
     fetchData();
     const id = setInterval(fetchData, 10000);
     return () => clearInterval(id);
   }, []);
   ```

5. Add buttons for `/simulate-weather` and `/reschedule`.

---

## **Epic 6 — QA & Docs**

1. Run simulation several times; ensure reschedules avoid overlap.

2. Add `/cleanup` route to reset DB.

3. Write `README.md`:

   * Run commands:

     ```
     bun run dev   # backend
     npm run dev   # frontend
     ```

   * Describe routes and schema.

4. Record 1-minute demo video showing seed → storm → cancel → reschedule.

---

## **Epic 7 — Optional AI Ranking**

1. Add `/reschedule/ai` route.

2. Select unranked reschedules → send to GPT with JSON prompt.

3. Update `rank` and `reason` fields.

4. Display ranks on dashboard.

---

## **Deliverables**

| Epic | Outcome                             |
| ---- | ----------------------------------- |
| 1    | Local Bun + SQLite environment      |
| 2    | Schema + seeding route              |
| 3    | Working weather + rescheduler logic |
| 4    | REST endpoints for frontend         |
| 5    | React dashboard running locally     |
| 6    | QA + docs                           |
| 7    | Optional AI ranking route           |

---

**Result:**

A single-process Bun app with SQLite storage and a small React dashboard — easy to test, debug, and later containerize or migrate to cloud.

