import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Test function that mirrors the actual safetyCheck implementation
function safetyCheckTest(db: Database) {
  // Get all active weather events
  const weatherEvents = db.query(`
    SELECT * FROM weather_events
    WHERE end_time > datetime('now')
    ORDER BY start_time ASC
  `).all() as Array<{
    id: number;
    start_time: string;
    end_time: string;
    affected_routes: string;
    condition: string;
  }>;

  if (weatherEvents.length === 0) {
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["Safety check: No active weather events found"]
    );
    return { ok: true, cancelled: 0, message: "No active weather events" };
  }

  let totalCancelled = 0;

  // Process each weather event
  for (const weatherEvent of weatherEvents) {
    // Parse affected routes (comma-separated)
    const affectedRoutes = weatherEvent.affected_routes
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (affectedRoutes.length === 0) {
      continue;
    }

    // Build SQL query to find matching flights
    const placeholders = affectedRoutes.map(() => "?").join(",");
    const cancelledFlights = db.query(`
      SELECT id, route, start_time, end_time
      FROM flights
      WHERE route IN (${placeholders})
        AND status = 'scheduled'
        AND start_time < ?
        AND end_time > ?
    `).all(
      [...affectedRoutes, weatherEvent.end_time, weatherEvent.start_time]
    ) as Array<{
      id: number;
      route: string;
      start_time: string;
      end_time: string;
    }>;

    // Cancel matching flights
    if (cancelledFlights.length > 0) {
      const flightIds = cancelledFlights.map((f) => f.id);
      const placeholders = flightIds.map(() => "?").join(",");
      db.run(
        `UPDATE flights SET status='cancelled' WHERE id IN (${placeholders})`,
        flightIds
      );

      totalCancelled += cancelledFlights.length;

      // Create detailed alert
      const routesList = affectedRoutes.join(", ");
      const alertMessage = `${cancelledFlights.length} flight(s) cancelled due to ${weatherEvent.condition} affecting ${routesList}`;
      db.run(
        "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
        [alertMessage]
      );
    }
  }

  if (totalCancelled === 0) {
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["Safety check: No flights needed to be cancelled"]
    );
  }

  return { ok: true, cancelled: totalCancelled };
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

  it("should return no cancellations when no weather events exist", () => {
    // Insert flights but no weather events
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    const result = safetyCheckTest(db);
    expect(result.cancelled).toBe(0);
    expect(result.message).toBe("No active weather events");

    const flights = db.query("SELECT status FROM flights").all() as { status: string }[];
    expect(flights[0].status).toBe("scheduled");
  });

  it("should only cancel flights matching affected routes", () => {
    // Insert flights on different routes
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KHYI", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KEDC", "scheduled"]
    );

    // Create weather event affecting only KAUS–KGTU
    const weatherStart = new Date("2025-11-10T09:00:00Z").toISOString();
    const weatherEnd = new Date("2025-11-10T12:00:00Z").toISOString();
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [weatherStart, weatherEnd, "KAUS–KGTU", "storm"]
    );

    const result = safetyCheckTest(db);
    expect(result.cancelled).toBe(1);

    const cancelled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='cancelled'").get() as { count: number };
    const scheduled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='scheduled'").get() as { count: number };
    expect(cancelled.count).toBe(1);
    expect(scheduled.count).toBe(2);
  });

  it("should only cancel flights with time overlap", () => {
    // Insert flights at different times
    const flight1Start = new Date("2025-11-10T09:00:00Z").toISOString();
    const flight1End = new Date("2025-11-10T10:00:00Z").toISOString();
    const flight2Start = new Date("2025-11-10T10:00:00Z").toISOString();
    const flight2End = new Date("2025-11-10T11:00:00Z").toISOString();
    const flight3Start = new Date("2025-11-10T13:00:00Z").toISOString();
    const flight3End = new Date("2025-11-10T14:00:00Z").toISOString();

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, flight1Start, flight1End, "KAUS–KGTU", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, flight2Start, flight2End, "KAUS–KGTU", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, flight3Start, flight3End, "KAUS–KGTU", "scheduled"]
    );

    // Weather event from 10:00 to 12:00 - should affect flight 2 only
    const weatherStart = new Date("2025-11-10T10:00:00Z").toISOString();
    const weatherEnd = new Date("2025-11-10T12:00:00Z").toISOString();
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [weatherStart, weatherEnd, "KAUS–KGTU", "storm"]
    );

    const result = safetyCheckTest(db);
    expect(result.cancelled).toBe(1);

    const cancelled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='cancelled'").get() as { count: number };
    expect(cancelled.count).toBe(1);
  });

  it("should only cancel scheduled flights, not already cancelled or rescheduled", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "cancelled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "rescheduled"]
    );

    const weatherStart = new Date("2025-11-10T09:00:00Z").toISOString();
    const weatherEnd = new Date("2025-11-10T12:00:00Z").toISOString();
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [weatherStart, weatherEnd, "KAUS–KGTU", "storm"]
    );

    const result = safetyCheckTest(db);
    expect(result.cancelled).toBe(1);

    const scheduled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='scheduled'").get() as { count: number };
    const cancelled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='cancelled'").get() as { count: number };
    const rescheduled = db.query("SELECT COUNT(*) as count FROM flights WHERE status='rescheduled'").get() as { count: number };
    
    expect(scheduled.count).toBe(0);
    expect(cancelled.count).toBe(2); // 1 already cancelled + 1 newly cancelled
    expect(rescheduled.count).toBe(1);
  });

  it("should create detailed alerts with cancellation counts", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    const weatherStart = new Date("2025-11-10T09:00:00Z").toISOString();
    const weatherEnd = new Date("2025-11-10T12:00:00Z").toISOString();
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [weatherStart, weatherEnd, "KAUS–KGTU", "storm"]
    );

    safetyCheckTest(db);
    const alert = db.query("SELECT message FROM alerts ORDER BY id DESC LIMIT 1").get() as {
      message: string;
    };
    expect(alert.message).toContain("2 flight(s) cancelled");
    expect(alert.message).toContain("storm");
    expect(alert.message).toContain("KAUS–KGTU");
  });

  it("should handle multiple weather events affecting different routes", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KHYI", "scheduled"]
    );

    const weatherStart = new Date("2025-11-10T09:00:00Z").toISOString();
    const weatherEnd = new Date("2025-11-10T12:00:00Z").toISOString();
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [weatherStart, weatherEnd, "KAUS–KGTU, KAUS–KHYI", "storm"]
    );

    const result = safetyCheckTest(db);
    expect(result.cancelled).toBe(2);
  });
});

