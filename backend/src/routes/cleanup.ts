import { db } from "../db";

export function cleanupSimulation() {
  // Delete all weather events
  db.run("DELETE FROM weather_events");

  // Reset all flights to scheduled status (preserves original times, instructors, planes)
  db.run("UPDATE flights SET status='scheduled'");

  // Add reset alert
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    ["Simulation reset - all flights restored to scheduled status"]
  );

  return { ok: true, message: "Simulation reset" };
}

