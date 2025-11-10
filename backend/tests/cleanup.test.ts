import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Test function that mirrors the actual cleanupSimulation implementation
function cleanupSimulationTest(db: Database) {
  // Delete all weather events
  db.run("DELETE FROM weather_events");

  // Reset all flights to scheduled status
  db.run("UPDATE flights SET status='scheduled'");

  // Add reset alert
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    ["Simulation reset - all flights restored to scheduled status"]
  );

  return { ok: true, message: "Simulation reset" };
}

describe("Cleanup Simulation", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE IF NOT EXISTS flights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        instructor_id INTEGER,
        plane_id INTEGER,
        start_time TEXT,
        end_time TEXT,
        route TEXT,
        status TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT,
        end_time TEXT,
        affected_routes TEXT,
        condition TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        message TEXT
      )
    `);
  });

  it("should delete all weather events", () => {
    // Insert some weather events
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T13:00:00Z").toISOString();
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [startTime, endTime, "KAUS–KGTU", "storm"]
    );
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [startTime, endTime, "KAUS–KHYI", "fog"]
    );

    cleanupSimulationTest(db);

    const count = db.query("SELECT COUNT(*) as count FROM weather_events").get() as { count: number };
    expect(count.count).toBe(0);
  });

  it("should reset all flights to scheduled status", () => {
    // Insert flights with different statuses
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "cancelled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "rescheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    cleanupSimulationTest(db);

    const scheduled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='scheduled'").get() as { count: number };
    const cancelled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='cancelled'").get() as { count: number };
    const rescheduled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='rescheduled'").get() as { count: number };

    expect(scheduled.count).toBe(3);
    expect(cancelled.count).toBe(0);
    expect(rescheduled.count).toBe(0);
  });

  it("should preserve flight data (times, instructors, planes)", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 2, 3, startTime, endTime, "KAUS–KGTU", "cancelled"]
    );

    cleanupSimulationTest(db);

    const flight = db.query("SELECT * FROM flights WHERE id = 1").get() as {
      student_id: number;
      instructor_id: number;
      plane_id: number;
      start_time: string;
      end_time: string;
      route: string;
      status: string;
    };

    expect(flight.status).toBe("scheduled");
    expect(flight.student_id).toBe(1);
    expect(flight.instructor_id).toBe(2);
    expect(flight.plane_id).toBe(3);
    expect(flight.start_time).toBe(startTime);
    expect(flight.end_time).toBe(endTime);
    expect(flight.route).toBe("KAUS–KGTU");
  });

  it("should create a reset alert", () => {
    cleanupSimulationTest(db);

    const alert = db.query("SELECT message FROM alerts ORDER BY id DESC LIMIT 1").get() as {
      message: string;
    };
    expect(alert).toBeDefined();
    expect(alert.message).toContain("Simulation reset");
    expect(alert.message).toContain("restored to scheduled status");
  });

  it("should be idempotent (safe to call multiple times)", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "cancelled"]
    );

    cleanupSimulationTest(db);
    cleanupSimulationTest(db);

    const scheduled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='scheduled'").get() as { count: number };
    expect(scheduled.count).toBe(1);
  });
});

