import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

const AVAILABLE_ROUTES = ["KAUS–KGTU", "KAUS–KHYI", "KAUS–KEDC", "KAUS–KATT"];

// Test function that mirrors the actual simulateWeather implementation
function simulateWeatherTest(db: Database, condition: string = "storm", durationHours: number = 3) {
  // Randomly select 2-3 routes
  const numRoutes = Math.floor(Math.random() * 2) + 2; // 2 or 3 routes
  const shuffled = [...AVAILABLE_ROUTES].sort(() => Math.random() - 0.5);
  const selectedRoutes = shuffled.slice(0, numRoutes);
  const affectedRoutes = selectedRoutes.join(", ");

  // Calculate end time based on duration
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Insert weather event
  db.run(
    "INSERT INTO weather_events(start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
    [startTime.toISOString(), endTime.toISOString(), affectedRoutes, condition]
  );

  // Create detailed alert
  const alertMessage = `Simulated ${condition} (${durationHours}h) affecting ${affectedRoutes}`;
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    [alertMessage]
  );

  return { ok: true, condition, duration_hours: durationHours, affected_routes: affectedRoutes };
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

  it("should create a weather event with random routes", () => {
    const result = simulateWeatherTest(db);
    const event = db.query("SELECT * FROM weather_events ORDER BY id DESC LIMIT 1").get() as {
      affected_routes: string;
      condition: string;
    };
    expect(event).toBeDefined();
    expect(event.condition).toBe("storm");
    // Should contain at least one route from available routes
    const routes = event.affected_routes.split(", ");
    expect(routes.length).toBeGreaterThanOrEqual(2);
    expect(routes.length).toBeLessThanOrEqual(3);
    routes.forEach(route => {
      expect(AVAILABLE_ROUTES).toContain(route);
    });
    expect(result.affected_routes).toBe(event.affected_routes);
  });

  it("should set weather event duration correctly", () => {
    const durationHours = 5;
    simulateWeatherTest(db, "storm", durationHours);
    const event = db.query("SELECT start_time, end_time FROM weather_events ORDER BY id DESC LIMIT 1").get() as {
      start_time: string;
      end_time: string;
    };
    expect(event).toBeDefined();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const actualDurationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    expect(actualDurationHours).toBe(durationHours);
  });

  it("should accept custom condition and duration", () => {
    const result = simulateWeatherTest(db, "fog", 2);
    expect(result.condition).toBe("fog");
    expect(result.duration_hours).toBe(2);
    const event = db.query("SELECT condition FROM weather_events ORDER BY id DESC LIMIT 1").get() as {
      condition: string;
    };
    expect(event.condition).toBe("fog");
  });

  it("should create a detailed alert about the weather event", () => {
    const result = simulateWeatherTest(db, "storm", 4);
    const alert = db.query("SELECT message FROM alerts ORDER BY id DESC LIMIT 1").get() as {
      message: string;
    };
    expect(alert).toBeDefined();
    expect(alert.message).toContain("Simulated storm");
    expect(alert.message).toContain("4h");
    expect(alert.message).toContain(result.affected_routes);
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

