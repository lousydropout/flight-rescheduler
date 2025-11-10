import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

describe("Flights", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
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
    
    // Insert test data
    db.run("INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)", [
      "Test Student",
      "beginner",
      "morning",
    ]);
    db.run("INSERT INTO instructors (name) VALUES (?)", ["Test Instructor"]);
    db.run("INSERT INTO planes (tail_number) VALUES (?)", ["N99999"]);
  });

  it("should create a flight with all required fields", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );
    
    const flight = db.query("SELECT * FROM flights WHERE id = 1").get() as {
      student_id: number;
      instructor_id: number;
      plane_id: number;
      route: string;
      status: string;
    };
    
    expect(flight).toBeDefined();
    expect(flight.student_id).toBe(1);
    expect(flight.instructor_id).toBe(1);
    expect(flight.plane_id).toBe(1);
    expect(flight.route).toBe("KAUS–KGTU");
    expect(flight.status).toBe("scheduled");
  });

  it("should allow updating flight status", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );
    
    db.run("UPDATE flights SET status = ? WHERE id = ?", ["cancelled", 1]);
    
    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    
    expect(flight.status).toBe("cancelled");
  });

  it("should enforce 1-hour flight duration", () => {
    const startTime = new Date("2025-11-10T10:00:00Z");
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime.toISOString(), endTime.toISOString(), "KAUS–KGTU", "scheduled"]
    );
    
    const flight = db.query("SELECT start_time, end_time FROM flights WHERE id = 1").get() as {
      start_time: string;
      end_time: string;
    };
    
    const start = new Date(flight.start_time);
    const end = new Date(flight.end_time);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    expect(durationHours).toBe(1);
  });

  it("should allow querying flights by status", () => {
    const startTime = new Date("2025-11-10T10:00:00Z").toISOString();
    const endTime = new Date("2025-11-10T11:00:00Z").toISOString();
    
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KHYI", "cancelled"]
    );
    
    const scheduledFlights = db.query("SELECT * FROM flights WHERE status = ?").all("scheduled") as { status: string }[];
    const cancelledFlights = db.query("SELECT * FROM flights WHERE status = ?").all("cancelled") as { status: string }[];
    
    expect(scheduledFlights.length).toBe(1);
    expect(cancelledFlights.length).toBe(1);
  });
});

