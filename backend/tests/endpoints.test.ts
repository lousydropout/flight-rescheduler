import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Test functions that mirror the actual route implementations
function getAllFlightsTest(db: Database) {
  return db.query(`
    SELECT 
      f.id,
      f.start_time,
      f.end_time,
      f.route,
      f.status,
      s.name as student_name,
      s.level as student_level,
      s.preferred_time as student_preferred_time,
      i.name as instructor_name,
      p.tail_number as plane_tail_number
    FROM flights f
    LEFT JOIN students s ON f.student_id = s.id
    LEFT JOIN instructors i ON f.instructor_id = i.id
    LEFT JOIN planes p ON f.plane_id = p.id
    ORDER BY f.start_time ASC
  `).all();
}

function getAllWeatherTest(db: Database) {
  return db.query(`
    SELECT * FROM weather_events
    WHERE end_time > datetime('now')
    ORDER BY start_time ASC
  `).all();
}

function getAllAlertsTest(db: Database) {
  return db.query(`
    SELECT * FROM alerts
    ORDER BY timestamp DESC
    LIMIT 50
  `).all();
}

describe("GET Endpoints", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    
    // Initialize schema
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

  describe("GET /flights", () => {
    it("should return empty array when no flights exist", () => {
      const flights = getAllFlightsTest(db);
      expect(flights).toEqual([]);
    });

    it("should return flights with joined student, instructor, and plane data", () => {
      // Insert test data
      db.run("INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)", [
        "Test Student",
        "beginner",
        "morning",
      ]);
      db.run("INSERT INTO instructors (name) VALUES (?)", ["Test Instructor"]);
      db.run("INSERT INTO planes (tail_number) VALUES (?)", ["N99999"]);
      
      const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
      const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
      db.run(
        "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
      );

      const flights = getAllFlightsTest(db);
      expect(flights.length).toBe(1);
      expect(flights[0]).toHaveProperty("student_name");
      expect(flights[0]).toHaveProperty("instructor_name");
      expect(flights[0]).toHaveProperty("plane_tail_number");
      expect((flights[0] as any).student_name).toBe("Test Student");
      expect((flights[0] as any).instructor_name).toBe("Test Instructor");
      expect((flights[0] as any).plane_tail_number).toBe("N99999");
    });

    it("should return all flights ordered by start_time", () => {
      // Insert multiple flights
      const times = [
        { start: "2025-11-10T12:00:00Z", end: "2025-11-10T13:00:00Z" },
        { start: "2025-11-10T10:00:00Z", end: "2025-11-10T11:00:00Z" },
        { start: "2025-11-10T11:00:00Z", end: "2025-11-10T12:00:00Z" },
      ];

      db.run("INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)", [
        "Test Student",
        "beginner",
        "morning",
      ]);
      db.run("INSERT INTO instructors (name) VALUES (?)", ["Test Instructor"]);
      db.run("INSERT INTO planes (tail_number) VALUES (?)", ["N99999"]);

      times.forEach((t) => {
        db.run(
          "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [1, 1, 1, t.start, t.end, "KAUS–KGTU", "scheduled"]
        );
      });

      const flights = getAllFlightsTest(db);
      expect(flights.length).toBe(3);
      // Check ordering
      const firstTime = new Date((flights[0] as any).start_time).getTime();
      const secondTime = new Date((flights[1] as any).start_time).getTime();
      const thirdTime = new Date((flights[2] as any).start_time).getTime();
      expect(firstTime).toBeLessThan(secondTime);
      expect(secondTime).toBeLessThan(thirdTime);
    });

    it("should handle flights with missing relationships gracefully", () => {
      // Insert flight without student/instructor/plane
      const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
      const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
      db.run(
        "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [999, 999, 999, startTime, endTime, "KAUS–KGTU", "scheduled"]
      );

      const flights = getAllFlightsTest(db);
      expect(flights.length).toBe(1);
      expect((flights[0] as any).student_name).toBeNull();
      expect((flights[0] as any).instructor_name).toBeNull();
      expect((flights[0] as any).plane_tail_number).toBeNull();
    });
  });

  describe("GET /weather", () => {
    it("should return empty array when no weather events exist", () => {
      const weather = getAllWeatherTest(db);
      expect(weather).toEqual([]);
    });

    it("should return only active weather events (end_time in future)", () => {
      // Use SQLite datetime functions for proper comparison
      const future = new Date(Date.now() + 3 * 60 * 60 * 1000); // +3 hours from now
      const past = new Date(Date.now() - 3 * 60 * 60 * 1000); // -3 hours ago

      // Insert active weather event (ends in future)
      db.run(
        "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (datetime('now', '-1 hour'), datetime('now', '+2 hours'), ?, ?)",
        ["KAUS–KGTU", "storm"]
      );

      // Insert expired weather event (ended in past)
      db.run(
        "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (datetime('now', '-5 hours'), datetime('now', '-3 hours'), ?, ?)",
        ["KAUS–KHYI", "storm"]
      );

      const weather = getAllWeatherTest(db);
      expect(weather.length).toBe(1);
      expect((weather[0] as any).affected_routes).toBe("KAUS–KGTU");
    });

    it("should return weather events ordered by start_time", () => {
      // Insert in reverse order using SQLite datetime functions
      db.run(
        "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (datetime('now', '+2 hours'), datetime('now', '+5 hours'), ?, ?)",
        ["Route 2", "storm"]
      );
      db.run(
        "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (datetime('now', '+1 hour'), datetime('now', '+4 hours'), ?, ?)",
        ["Route 1", "storm"]
      );
      db.run(
        "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (datetime('now'), datetime('now', '+3 hours'), ?, ?)",
        ["Route 0", "storm"]
      );

      const weather = getAllWeatherTest(db);
      expect(weather.length).toBe(3);
      expect((weather[0] as any).affected_routes).toBe("Route 0");
      expect((weather[1] as any).affected_routes).toBe("Route 1");
      expect((weather[2] as any).affected_routes).toBe("Route 2");
    });
  });

  describe("GET /alerts", () => {
    it("should return empty array when no alerts exist", () => {
      const alerts = getAllAlertsTest(db);
      expect(alerts).toEqual([]);
    });

    it("should return alerts ordered by timestamp DESC (newest first)", () => {
      // Insert alerts
      db.run("INSERT INTO alerts (timestamp, message) VALUES (?, ?)", [
        "2025-11-10 10:00:00",
        "First alert",
      ]);
      db.run("INSERT INTO alerts (timestamp, message) VALUES (?, ?)", [
        "2025-11-10 12:00:00",
        "Third alert",
      ]);
      db.run("INSERT INTO alerts (timestamp, message) VALUES (?, ?)", [
        "2025-11-10 11:00:00",
        "Second alert",
      ]);

      const alerts = getAllAlertsTest(db);
      expect(alerts.length).toBe(3);
      expect((alerts[0] as any).message).toBe("Third alert");
      expect((alerts[1] as any).message).toBe("Second alert");
      expect((alerts[2] as any).message).toBe("First alert");
    });

    it("should limit results to 50 alerts", () => {
      // Insert 60 alerts
      for (let i = 0; i < 60; i++) {
        db.run("INSERT INTO alerts (timestamp, message) VALUES (datetime('now'), ?)", [
          `Alert ${i}`,
        ]);
      }

      const alerts = getAllAlertsTest(db);
      expect(alerts.length).toBe(50);
    });

    it("should return all required alert fields", () => {
      db.run("INSERT INTO alerts (timestamp, message) VALUES (?, ?)", [
        "2025-11-10 10:00:00",
        "Test alert",
      ]);

      const alerts = getAllAlertsTest(db);
      expect(alerts.length).toBe(1);
      expect(alerts[0]).toHaveProperty("id");
      expect(alerts[0]).toHaveProperty("timestamp");
      expect(alerts[0]).toHaveProperty("message");
      expect((alerts[0] as any).message).toBe("Test alert");
    });
  });
});

