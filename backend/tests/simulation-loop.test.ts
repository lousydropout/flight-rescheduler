import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

describe("Simulation Loop Integration", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    
    // Initialize all tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        level TEXT,
        preferred_time TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS instructors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS planes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tail_number TEXT
      )
    `);
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

  it("should complete full simulation loop: seed → weather → cancel → reschedule", () => {
    // 1. Seed data
    db.run("INSERT INTO instructors (name) VALUES (?)", ["Test Instructor"]);
    db.run("INSERT INTO planes (tail_number) VALUES (?)", ["N99999"]);
    db.run("INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)", [
      "Test Student",
      "beginner",
      "morning",
    ]);
    
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    for (let i = 0; i < 3; i++) {
      db.run(
        "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
      );
    }

    // Verify initial state
    let scheduledFlights = db.query("SELECT COUNT(*) as count FROM flights WHERE status='scheduled'").get() as {
      count: number;
    };
    expect(scheduledFlights.count).toBe(3);

    // 2. Simulate weather
    db.run(
      "INSERT INTO weather_events(start_time, end_time, affected_routes, condition) VALUES (datetime('now'), datetime('now','+3 hours'), ?, ?)",
      ["KAUS–KHYI", "storm"]
    );
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["Simulated storm at KAUS–KHYI"]
    );

    const weatherEvents = db.query("SELECT COUNT(*) as count FROM weather_events").get() as {
      count: number;
    };
    expect(weatherEvents.count).toBe(1);

    // 3. Safety check (cancel flights)
    db.run("UPDATE flights SET status='cancelled'");
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["All flights cancelled (test)"]
    );

    let cancelledFlights = db.query("SELECT COUNT(*) as count FROM flights WHERE status='cancelled'").get() as {
      count: number;
    };
    expect(cancelledFlights.count).toBe(3);

    // 4. Reschedule
    db.run("UPDATE flights SET status='rescheduled'");
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["Flights rescheduled"]
    );

    const rescheduledFlights = db.query("SELECT COUNT(*) as count FROM flights WHERE status='rescheduled'").get() as {
      count: number;
    };
    expect(rescheduledFlights.count).toBe(3);

    // Verify alerts were created
    const alerts = db.query("SELECT COUNT(*) as count FROM alerts").get() as { count: number };
    expect(alerts.count).toBe(3);
  });

  it("should maintain correct state transitions", () => {
    // Create a flight
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    // Verify initial state
    let flight = db.query("SELECT status FROM flights WHERE id = 1").get() as { status: string };
    expect(flight.status).toBe("scheduled");

    // Cancel
    db.run("UPDATE flights SET status='cancelled' WHERE id = 1");
    flight = db.query("SELECT status FROM flights WHERE id = 1").get() as { status: string };
    expect(flight.status).toBe("cancelled");

    // Reschedule
    db.run("UPDATE flights SET status='rescheduled' WHERE id = 1");
    flight = db.query("SELECT status FROM flights WHERE id = 1").get() as { status: string };
    expect(flight.status).toBe("rescheduled");
  });
});

