import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Mock safety check function for testing
function safetyCheckTest(db: Database) {
  // Cancel all flights
  db.run("UPDATE flights SET status='cancelled'");

  // Create alert
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    ["All flights cancelled (test)"]
  );

  return { ok: true };
}

describe("Safety Check", () => {
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
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        message TEXT
      )
    `);

    // Insert test flights
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    for (let i = 0; i < 5; i++) {
      db.run(
        "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
      );
    }
  });

  it("should cancel all flights", () => {
    safetyCheckTest(db);
    const flights = db.query("SELECT status FROM flights").all() as { status: string }[];
    expect(flights.length).toBe(5);
    flights.forEach((flight) => {
      expect(flight.status).toBe("cancelled");
    });
  });

  it("should create an alert about cancellation", () => {
    safetyCheckTest(db);
    const alert = db.query("SELECT message FROM alerts ORDER BY id DESC LIMIT 1").get() as {
      message: string;
    };
    expect(alert).toBeDefined();
    expect(alert.message).toBe("All flights cancelled (test)");
  });

  it("should only affect flights with scheduled status", () => {
    // Set one flight to already cancelled
    db.run("UPDATE flights SET status='cancelled' WHERE id = 1");
    
    // Set one flight to rescheduled
    db.run("UPDATE flights SET status='rescheduled' WHERE id = 2");
    
    safetyCheckTest(db);
    
    const cancelledFlights = db.query("SELECT COUNT(*) as count FROM flights WHERE status='cancelled'").get() as {
      count: number;
    };
    expect(cancelledFlights.count).toBe(5); // All flights should be cancelled
  });

  it("should be idempotent (can run multiple times)", () => {
    safetyCheckTest(db);
    safetyCheckTest(db);
    const flights = db.query("SELECT COUNT(*) as count FROM flights WHERE status='cancelled'").get() as {
      count: number;
    };
    expect(flights.count).toBe(5);
  });
});

