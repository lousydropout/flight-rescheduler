import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Mock weather simulation function for testing
function simulateWeatherTest(db: Database) {
  // Insert weather event
  db.run(
    "INSERT INTO weather_events(start_time, end_time, affected_routes, condition) VALUES (datetime('now'), datetime('now','+3 hours'), ?, ?)",
    ["KAUS–KHYI", "storm"]
  );

  // Create alert
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    ["Simulated storm at KAUS–KHYI"]
  );

  return { ok: true };
}

describe("Weather Simulation", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
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

  it("should create a weather event", () => {
    simulateWeatherTest(db);
    const event = db.query("SELECT * FROM weather_events ORDER BY id DESC LIMIT 1").get() as {
      affected_routes: string;
      condition: string;
    };
    expect(event).toBeDefined();
    expect(event.affected_routes).toBe("KAUS–KHYI");
    expect(event.condition).toBe("storm");
  });

  it("should set weather event duration to 3 hours", () => {
    simulateWeatherTest(db);
    const event = db.query("SELECT start_time, end_time FROM weather_events ORDER BY id DESC LIMIT 1").get() as {
      start_time: string;
      end_time: string;
    };
    expect(event).toBeDefined();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    expect(durationHours).toBe(3);
  });

  it("should create an alert about the weather event", () => {
    simulateWeatherTest(db);
    const alert = db.query("SELECT message FROM alerts ORDER BY id DESC LIMIT 1").get() as {
      message: string;
    };
    expect(alert).toBeDefined();
    expect(alert.message).toContain("Simulated storm");
    expect(alert.message).toContain("KAUS–KHYI");
  });

  it("should allow multiple weather events", () => {
    simulateWeatherTest(db);
    simulateWeatherTest(db);
    const events = db.query("SELECT COUNT(*) as count FROM weather_events").get() as {
      count: number;
    };
    expect(events.count).toBe(2);
  });
});

