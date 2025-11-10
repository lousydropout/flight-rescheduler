import { db } from "../db";

export function rescheduleFlights() {
  // Only reschedule flights that are currently cancelled
  const result = db.run("UPDATE flights SET status='rescheduled' WHERE status='cancelled'");
  const changes = result.changes || 0;

  // Create alert
  if (changes > 0) {
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      [`${changes} flights rescheduled`]
    );
  } else {
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["No cancelled flights to reschedule"]
    );
  }

  return { ok: true, rescheduled: changes };
}

