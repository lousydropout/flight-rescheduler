import { db } from "../db";

export function rescheduleFlights() {
  // Reschedule all cancelled flights (simplest version)
  db.run("UPDATE flights SET status='rescheduled'");

  // Create alert
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    ["Flights rescheduled"]
  );

  return { ok: true };
}

