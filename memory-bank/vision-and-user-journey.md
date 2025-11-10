# Vision: What "Done" Looks Like

When this project is complete, you should be able to run it locally from scratch, watch it behave like a miniature flight-school dispatch system, and see the entire simulation come to life in your browser.

Let's walk through it in sequence.

---

## 🧱 1. Starting From Nothing

You clone the repo and run:

```bash
bun run dev    # starts backend on localhost:4000
npm run dev    # starts frontend on localhost:5173
```

Bun prints something like:

```
[Hono] Server running on http://localhost:4000
Database: flight.db (SQLite) opened.
```

Your React app auto-opens at `localhost:5173`.

The dashboard loads — right now it's empty except for a "Seed Data" button.

---

## ✈️ 2. Seeding the World

You click "Seed Data."

That triggers `POST /seed`, which:

* Creates 20 students (e.g., "Jamie Lee," "Alex Rivera," etc.)

* Adds 5 instructors and 5 planes.

* Generates about 40 scheduled flights for the week.

* Logs an alert:

  ```
  [14:00] Seeded 20 students, 5 instructors, 40 flights.
  ```

Now your dashboard shows:

* **Flights Table:**

  A list of rows like

  ```
  Mon 9:00   Jamie Lee   Instructor Morgan   N54321   KAUS–KHYI   SCHEDULED
  Mon 10:00  Alex Rivera Instructor Patel   N11223   KAUS–KGTU   SCHEDULED
  ```

* **Weather Table:**

  All "Clear" conditions for each route.

* **Alerts Feed:**

  "Seed completed."

---

## 🌤️ 3. Normal Operation

Nothing breaks because the simulated weather is "clear."

You can click "Reschedule" manually — it runs, finds no cancellations, and logs:

```
[14:15] Rescheduler: no cancelled flights found.
```

Everything is stable — the school is humming along.

---

## 🌩️ 4. Simulating Bad Weather

You press "Simulate Weather," which calls `POST /simulate-weather` with `{condition:"storm",duration_hours:3}`.

The backend:

1. Picks random routes, say `KAUS–KHYI` and `KAUS–KGTU`.

2. Marks them unsafe for the next three hours.

3. Cancels any flights overlapping those routes and times.

4. Writes an alert:

   ```
   [14:20] Storm generated (3h) affecting KAUS–KHYI, KAUS–KGTU.
   [14:20] 8 flights cancelled due to weather.
   ```

On your dashboard:

* **Flights Table:** several rows flip from `SCHEDULED` → `CANCELLED`.

* **Weather Table:** those two routes now read `⛈  Storm (Unsafe)`.

* **Alerts Feed:** shows the storm creation and cancellations.

---

## 🔁 5. Running the Rescheduler

You click "Reschedule Cancelled Flights."

The backend's `/reschedule` route:

* Loops through cancelled flights.

* Finds next open instructor + plane within preferred time windows.

* Updates flight records to `RESCHEDULED`.

* Logs:

  ```
  [14:21] Flight 12 rescheduled to Tue 10:00 (Morgan / N54321)
  [14:21] Flight 19 rescheduled to Wed 14:00 (Diaz / N23232)
  [14:21] Reschedule complete: 8 flights reassigned.
  ```

Dashboard updates:

* Those rows move to new times, `status = RESCHEDULED`.

* Alerts show all reassignment messages.

* Weather table still shows storm, but flights have shifted out of it.

---

## 🧠 6. (Optional) AI Ranking Mode

Later, when you enable GPT:

You click "AI Rank Reschedules."

Backend sends current reschedules to GPT with context (students, instructors, weather).

GPT responds with ranked JSON, e.g.:

```json
[
  {"flight_id": 12, "rank": 0.92, "reason": "Clear weather and instructor rested"},
  {"flight_id": 19, "rank": 0.75, "reason": "Windy afternoon but acceptable"}
]
```

Dashboard shows small "AI score" badges beside those rescheduled rows.

---

## 🧹 7. Cleanup & Reset

You click "Reset Simulation" → `/cleanup`.

Backend clears weather events and restores all flights to "scheduled."

Alerts show:

```
[14:30] Simulation reset.
```

Everything returns to a sunny, pre-storm baseline.

---

## 💻 8. Developer-Side Reality

* All data lives in `flight.db` (SQLite file, ~100KB).

* You can open it with `sqlite3 flight.db` and run `SELECT * FROM flights;`.

* Logs print to console as Hono handles each route:

  ```
  POST /simulate-weather 200 (12ms)
  POST /reschedule 200 (24ms)
  GET /flights 200 (5ms)
  ```

No Docker, no network complexity, just Bun serving JSON and writing to local disk.

---

## 🎯 In Summary

When finished, you'll be able to:

1. Run the backend and frontend with two simple commands.

2. See a live dashboard with flights, weather, and alerts.

3. Simulate storms and watch flights cancel + reschedule automatically.

4. Optionally, toggle AI ranking to give reschedules "smart" commentary.

5. Reset everything instantly for new demo runs.

It'll feel like a **tiny, self-contained air-school simulator** — visual, deterministic, and ready to grow into a cloud-deployed version whenever you're bored of local.

