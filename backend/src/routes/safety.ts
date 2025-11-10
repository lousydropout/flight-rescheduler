import { db } from "../db";

export function safetyCheck() {
  // Cancel all flights (simplest version for now)
  db.run("UPDATE flights SET status='cancelled'");

  // Create alert
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    ["All flights cancelled (test)"]
  );

  return { ok: true };
}

