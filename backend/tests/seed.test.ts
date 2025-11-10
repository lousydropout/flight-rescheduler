import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Mock seed function for testing
function seedDatabaseTest(db: Database) {
  // Clear existing data
  db.exec("DELETE FROM flights");
  db.exec("DELETE FROM students");
  db.exec("DELETE FROM instructors");
  db.exec("DELETE FROM planes");
  db.exec("DELETE FROM alerts");

  // Insert 5 instructors
  const instructors = ["Cole", "Diaz", "Patel", "Kim", "Nguyen"];
  const instructorStmt = db.prepare("INSERT INTO instructors (name) VALUES (?)");
  for (const name of instructors) {
    instructorStmt.run(name);
  }

  // Insert 5 planes
  const planes = ["N11111", "N22222", "N33333", "N44444", "N55555"];
  const planeStmt = db.prepare("INSERT INTO planes (tail_number) VALUES (?)");
  for (const tailNumber of planes) {
    planeStmt.run(tailNumber);
  }

  // Insert 20 students
  const studentNames = [
    "Jamie Lee",
    "Alex Rivera",
    "Morgan Chen",
    "Taylor Swift",
    "Jordan Martinez",
    "Casey Brown",
    "Riley Johnson",
    "Quinn Williams",
    "Sage Anderson",
    "Blake Davis",
    "Cameron Wilson",
    "Dakota Moore",
    "Emery Taylor",
    "Finley Jackson",
    "Harper White",
    "Indigo Harris",
    "Jules Clark",
    "Kai Lewis",
    "Lake Robinson",
    "Noah Walker",
  ];

  const levels = ["beginner", "intermediate", "advanced"];
  const preferredTimes = ["morning", "noon", "afternoon"];

  const studentStmt = db.prepare(
    "INSERT INTO students (name, level, preferred_time) VALUES (?, ?, ?)"
  );

  const studentIds: number[] = [];
  for (const name of studentNames) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const preferredTime =
      preferredTimes[Math.floor(Math.random() * preferredTimes.length)];
    const result = studentStmt.run(name, level, preferredTime);
    studentIds.push(Number(result.lastInsertRowid));
  }

  // Insert ~40 flights (2 per student)
  const routes = [
    "KAUS–KGTU",
    "KAUS–KHYI",
    "KAUS–KEDC",
    "KAUS–KATT",
    "KAUS–KGTU",
  ];

  // Get instructor and plane IDs
  const instructorIds = db
    .query("SELECT id FROM instructors")
    .all() as { id: number }[];
  const planeIds = db.query("SELECT id FROM planes").all() as { id: number }[];

  const flightStmt = db.prepare(
    "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  // Generate flights for the current week
  const now = new Date();
  const currentDay = now.getDay();
  const daysToMonday = currentDay === 0 ? 1 : 8 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(8, 0, 0, 0);

  let flightCount = 0;
  for (let day = 0; day < 5; day++) {
    for (let hour = 8; hour < 17; hour++) {
      if (flightCount >= 40) break;

      const flightDate = new Date(monday);
      flightDate.setDate(monday.getDate() + day);
      flightDate.setHours(hour, 0, 0, 0);

      const endDate = new Date(flightDate);
      endDate.setHours(hour + 1, 0, 0, 0);

      const studentIndex = Math.floor(flightCount / 2) % studentIds.length;
      const studentId = studentIds[studentIndex];

      const instructorId =
        instructorIds[Math.floor(Math.random() * instructorIds.length)].id;
      const planeId = planeIds[Math.floor(Math.random() * planeIds.length)].id;
      const route = routes[Math.floor(Math.random() * routes.length)];

      flightStmt.run(
        studentId,
        instructorId,
        planeId,
        flightDate.toISOString(),
        endDate.toISOString(),
        route,
        "scheduled"
      );

      flightCount++;
    }
    if (flightCount >= 40) break;
  }

  // Insert alert
  const alertMessage = `Seeded 20 students, 5 instructors, 40 flights.`;
  db.run(
    "INSERT INTO alerts (timestamp, message) VALUES (datetime('now'), ?)",
    [alertMessage]
  );

  return {
    students: studentIds.length,
    instructors: instructors.length,
    planes: planes.length,
    flights: flightCount,
  };
}

describe("Seed Database", () => {
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
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        message TEXT
      )
    `);
  });

  it("should seed 5 instructors", () => {
    seedDatabaseTest(db);
    const count = db.query("SELECT COUNT(*) as count FROM instructors").get() as { count: number };
    expect(count.count).toBe(5);
  });

  it("should seed 5 planes", () => {
    seedDatabaseTest(db);
    const count = db.query("SELECT COUNT(*) as count FROM planes").get() as { count: number };
    expect(count.count).toBe(5);
  });

  it("should seed 20 students", () => {
    seedDatabaseTest(db);
    const count = db.query("SELECT COUNT(*) as count FROM students").get() as { count: number };
    expect(count.count).toBe(20);
  });

  it("should seed approximately 40 flights", () => {
    seedDatabaseTest(db);
    const count = db.query("SELECT COUNT(*) as count FROM flights").get() as { count: number };
    expect(count.count).toBe(40);
  });

  it("should create an alert after seeding", () => {
    seedDatabaseTest(db);
    const alerts = db.query("SELECT * FROM alerts ORDER BY id DESC LIMIT 1").get() as { message: string };
    expect(alerts).toBeDefined();
    expect(alerts.message).toContain("Seeded");
  });

  it("should assign flights to students", () => {
    seedDatabaseTest(db);
    const flights = db.query("SELECT DISTINCT student_id FROM flights").all() as { student_id: number }[];
    expect(flights.length).toBeGreaterThan(0);
  });

  it("should assign flights to instructors", () => {
    seedDatabaseTest(db);
    const flights = db.query("SELECT DISTINCT instructor_id FROM flights").all() as { instructor_id: number }[];
    expect(flights.length).toBeGreaterThan(0);
  });

  it("should assign flights to planes", () => {
    seedDatabaseTest(db);
    const flights = db.query("SELECT DISTINCT plane_id FROM flights").all() as { plane_id: number }[];
    expect(flights.length).toBeGreaterThan(0);
  });

  it("should set all flights to scheduled status", () => {
    seedDatabaseTest(db);
    const flights = db.query("SELECT status FROM flights").all() as { status: string }[];
    expect(flights.length).toBe(40);
    flights.forEach((flight) => {
      expect(flight.status).toBe("scheduled");
    });
  });

  it("should be idempotent (can run multiple times)", () => {
    seedDatabaseTest(db);
    const firstCount = db.query("SELECT COUNT(*) as count FROM students").get() as { count: number };
    seedDatabaseTest(db);
    const secondCount = db.query("SELECT COUNT(*) as count FROM students").get() as { count: number };
    expect(firstCount.count).toBe(secondCount.count);
    expect(secondCount.count).toBe(20);
  });
});

