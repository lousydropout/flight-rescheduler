# **AI Flight Lesson Rescheduler — Vertical Build Task List**

---

## 🧩 **Phase 0 — Bootstrapping**

### **Task 0.1: Initialize project**

**Goal:** Have a running web server that returns `"OK"`.

**Steps**

```bash
mkdir flight-rescheduler && cd flight-rescheduler
bun create hono@latest backend
cd backend
bun add bun:sqlite
```

Edit `src/index.ts`:

```ts
import { Hono } from "hono";
const app = new Hono();
app.get("/", c => c.text("OK"));
export default app;
```

**Test:**
`bun run dev` → visit `http://localhost:3000` → should say `OK`.

✅ *Proof that Bun + Hono runs.*

---

## 🧩 **Phase 1 — Database Layer**

### **Task 1.1: Create SQLite DB + connection helper**

**Goal:** Write and read a trivial record.

**Steps**

* Create `src/db.ts`:

  ```ts
  import { Database } from "bun:sqlite";
  export const db = new Database("flight.db");
  db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, message TEXT)");
  export const addTest = (msg: string) => db.run("INSERT INTO test (message) VALUES (?)", msg);
  export const getAll = () => db.query("SELECT * FROM test").all();
  ```
* Add routes to verify:

  ```ts
  app.get("/test", () => c.json(getAll()));
  app.post("/test", () => { addTest("Hello DB"); return c.json({ok:true}); });
  ```

**Test:**
Run:

```bash
curl -X POST localhost:3000/test
curl localhost:3000/test
```

✅ *You see `{id:1,message:"Hello DB"}` — DB working.*

---

## 🧩 **Phase 2 — Schema + Seeding**

### **Task 2.1: Define schema**

Create `src/schema.ts` with `CREATE TABLE IF NOT EXISTS` for:

* students
* instructors
* planes
* flights
* weather_events
* alerts

**Test:**
Run `bun run dev` → console prints no errors → inspect file `flight.db` with `sqlite3 flight.db` → `.tables` shows new tables.

✅ *Schema exists.*

---

### **Task 2.2: Add /seed route**

Create `src/routes/seed.ts`:

```ts
app.post("/seed", c => {
  // insert 5 instructors, 5 planes, 20 students, ~40 flights
  db.run("INSERT INTO instructors(name) VALUES ('Cole'), ('Diaz'), ('Patel'), ('Kim'), ('Nguyen')");
  db.run("INSERT INTO planes(tail_number) VALUES ('N11111'), ('N22222'), ('N33333'), ('N44444'), ('N55555')");
  // ... simple random insertions for students/flights ...
  return c.json({ ok: true });
});
```

**Test:**
`curl -X POST localhost:3000/seed`
then `sqlite3 flight.db "SELECT COUNT(*) FROM flights;"`

✅ *Data seeded.*

---

## 🧩 **Phase 3 — First Simulation Loop (minimal)**

### **Task 3.1: Implement /simulate-weather (mock)**

**Goal:** Create fake "storm" entries and log them.

**Steps**

```ts
app.post("/simulate-weather", c => {
  db.run("INSERT INTO weather_events(start_time,end_time,affected_routes,condition) VALUES (datetime('now'), datetime('now','+3 hours'), 'KAUS–KHYI', 'storm')");
  db.run("INSERT INTO alerts(timestamp,message) VALUES (datetime('now'),'Simulated storm at KAUS–KHYI')");
  return c.json({ ok: true });
});
```

**Test:**

```bash
curl -X POST localhost:3000/simulate-weather
sqlite3 flight.db "SELECT * FROM weather_events;"
```

✅ *Storm created; alert logged.*

---

### **Task 3.2: Add flight cancel logic**

Simplest version: cancel *all* flights to see the loop in action.

```ts
app.post("/safety-check", () => {
  db.run("UPDATE flights SET status='cancelled'");
  db.run("INSERT INTO alerts(timestamp,message) VALUES (datetime('now'),'All flights cancelled (test)')");
  return c.json({ok:true});
});
```

**Test:**

```bash
curl -X POST localhost:3000/safety-check
sqlite3 flight.db "SELECT DISTINCT status FROM flights;"
```

✅ *Flights now `cancelled`; alerts recorded.*

---

### **Task 3.3: Implement /reschedule (deterministic stub)**

Simplest version: set all cancelled → `rescheduled` 2h later.

```ts
app.post("/reschedule", () => {
  db.run("UPDATE flights SET status='rescheduled'");
  db.run("INSERT INTO alerts(timestamp,message) VALUES (datetime('now'),'Flights rescheduled')");
  return c.json({ok:true});
});
```

**Test:**

```bash
curl -X POST localhost:3000/reschedule
sqlite3 flight.db "SELECT DISTINCT status FROM flights;"
```

✅ *Flights flip to `rescheduled`.*

Now you can see the full vertical loop:
`POST /simulate-weather` → `POST /safety-check` → `POST /reschedule`.

---

## 🧩 **Phase 4 — Add Simple Frontend**

### **Task 4.1: Setup React + Vite app**

```
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

**Test:**
`npm run dev` → `localhost:5173` shows starter page.

✅ *Frontend running.*

---

### **Task 4.2: Fetch & display flights**

Replace `App.tsx` with:

```tsx
const API = "http://localhost:3000";
export default function App() {
  const [flights, setFlights] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => setFlights(await fetch(`${API}/flights`).then(r=>r.json()));
    load(); const id = setInterval(load, 3000); return ()=>clearInterval(id);
  }, []);
  return (
    <table>
      <thead><tr><th>ID</th><th>Status</th></tr></thead>
      <tbody>{flights.map(f=><tr key={f.id}><td>{f.id}</td><td>{f.status}</td></tr>)}</tbody>
    </table>
  );
}
```

**Test:**
`npm run dev` → table shows flights with statuses (`scheduled`, `cancelled`, etc.).
✅ *You see the simulation data live.*

---

## 🧩 **Phase 5 — Wire True Logic**

Now that the end-to-end loop runs, deepen the realism.

### **Task 5.1: Real weather targeting**

Modify `/simulate-weather` to randomly pick 2–3 routes and `duration_hours`.
Update only flights whose `route` matches and whose `start_time` overlaps.

**Test:**
Simulate a storm → check that only some flights are `cancelled`.

✅ *Selective cancellation verified.*

---

### **Task 5.2: Real rescheduling**

Implement availability check:

* Each instructor/plane can only fly one flight/hour.
* Pick earliest open slot after storm ends.
* Match student `preferred_time` if possible.

**Test:**
After storm → call `/reschedule` → confirm cancelled flights now have new times and no resource overlaps.

✅ *Deterministic realistic rescheduling.*

---

### **Task 5.3: Alerts endpoint**

`GET /alerts` → return recent messages.

Frontend shows them in a small side panel.

**Test:**
Trigger storm → watch alert feed fill up.

✅ *Visual confirmation of event log.*

---

## 🧩 **Phase 6 — Polish Simulation**

### **Task 6.1: Add auto-refresh dashboard**

Frontend polls `/flights`, `/weather`, `/alerts` every 10s.

**Test:**
Run simulation commands in backend terminal and watch frontend update automatically.

✅ *Live updates confirmed.*

---

### **Task 6.2: Add reset /cleanup route**

```ts
app.post("/cleanup", () => {
  db.run("DELETE FROM weather_events");
  db.run("UPDATE flights SET status='scheduled'");
  db.run("INSERT INTO alerts(timestamp,message) VALUES (datetime('now'),'Simulation reset')");
  return c.json({ok:true});
});
```

**Test:**
Trigger storm → cleanup → all back to scheduled.

✅ *Reset works.*

---

## 🧩 **Phase 7 — Optional AI Layer**

### **Task 7.1: Add /reschedule/ai route**

Fetch unranked reschedules, send them to GPT for ranking, update `rank` + `reason`.

**Test:**
After running `/reschedule`, call `/reschedule/ai` → verify DB updated with `rank` values.

✅ *AI adds reasoning.*

---

## 🎯 **Expected Behavior When Done**

1. You open `localhost:5173` → see a live dashboard.
2. You click "Seed" → flights populate.
3. "Simulate Weather" → storm appears, flights cancel.
4. "Reschedule" → cancelled flights shift to new slots.
5. Alerts show every action in real time.
6. "Reset" → world returns to normal.

Everything loops cleanly without any external dependencies.

---

## ✅ **Progress Status**

**Completed Phases:**
- ✅ Phase 0: Bootstrapping
- ✅ Phase 1: Database Layer
- ✅ Phase 2: Schema + Seeding
- ✅ Phase 3: First Simulation Loop
- ✅ Phase 4: Frontend (with Tailwind CSS, shadcn/ui, simulation clock)

**Current Status:**
- 54 tests passing
- Full simulation loop working
- Modern dashboard with real-time updates
- Simulation clock showing backend time

**Next:**
- Phase 5: Wire True Logic (route-specific weather, availability checks)
- Phase 6: Polish Simulation
- Phase 7: Optional AI Layer

---

This task plan builds **vertically**:

* You'll see output after Task 0.1, Task 1.1, Task 2.2, etc.
* You'll have a running simulation halfway through (Phase 3).
* Each deeper task refines realism without breaking the visible loop.

