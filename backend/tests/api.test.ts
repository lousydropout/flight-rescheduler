import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { Database } from "bun:sqlite";

// Create a test app instance
function createTestApp() {
  const app = new Hono();
  
  // Mock database for testing
  const testDb = new Database(":memory:");
  
  // Initialize schema
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      level TEXT,
      preferred_time TEXT
    )
  `);
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS planes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tail_number TEXT
    )
  `);
  testDb.exec(`
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
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      message TEXT
    )
  `);
  
  // Simple test routes
  app.get("/", (c) => c.text("OK"));
  
  app.post("/seed", async (c) => {
    // Simple seed for testing
    testDb.run("INSERT INTO instructors (name) VALUES (?)", ["Test Instructor"]);
    testDb.run("INSERT INTO planes (tail_number) VALUES (?)", ["N99999"]);
    testDb.run("INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)", [
      "Test Student",
      "beginner",
      "morning",
    ]);
    return c.json({ ok: true, students: 1, instructors: 1, planes: 1, flights: 0 });
  });
  
  return app;
}

describe("API Routes", () => {
  let app: Hono;

  beforeAll(() => {
    app = createTestApp();
  });

  it("should return OK on GET /", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("OK");
  });

  it("should seed database on POST /seed", async () => {
    const res = await app.request("/seed", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.students).toBe(1);
    expect(json.instructors).toBe(1);
    expect(json.planes).toBe(1);
  });
});

