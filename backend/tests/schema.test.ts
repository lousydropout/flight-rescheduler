import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

describe("Schema", () => {
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

  it("should create students table", () => {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='students'").get();
    expect(result).toBeDefined();
  });

  it("should create instructors table", () => {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='instructors'").get();
    expect(result).toBeDefined();
  });

  it("should create planes table", () => {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='planes'").get();
    expect(result).toBeDefined();
  });

  it("should create flights table", () => {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='flights'").get();
    expect(result).toBeDefined();
  });

  it("should create weather_events table", () => {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='weather_events'").get();
    expect(result).toBeDefined();
  });

  it("should create alerts table", () => {
    const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='alerts'").get();
    expect(result).toBeDefined();
  });

  it("should allow inserting into students table", () => {
    db.run("INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)", [
      "Test Student",
      "beginner",
      "morning",
    ]);
    const result = db.query("SELECT * FROM students WHERE name = ?").get("Test Student");
    expect(result).toBeDefined();
    expect((result as any).name).toBe("Test Student");
  });

  it("should allow inserting into instructors table", () => {
    db.run("INSERT INTO instructors (name) VALUES (?)", ["Test Instructor"]);
    const result = db.query("SELECT * FROM instructors WHERE name = ?").get("Test Instructor");
    expect(result).toBeDefined();
    expect((result as any).name).toBe("Test Instructor");
  });

  it("should allow inserting into planes table", () => {
    db.run("INSERT INTO planes (tail_number) VALUES (?)", ["N99999"]);
    const result = db.query("SELECT * FROM planes WHERE tail_number = ?").get("N99999");
    expect(result).toBeDefined();
    expect((result as any).tail_number).toBe("N99999");
  });
});

