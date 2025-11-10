import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

const AVAILABLE_ROUTES = ["KAUS–KGTU", "KAUS–KHYI", "KAUS–KEDC", "KAUS–KATT"];

// Test function that mirrors the actual getAllRoutesWithStatus implementation
function getAllRoutesWithStatusTest(db: Database, currentTime: string) {
  // Get all active weather events
  const weatherEvents = db.query(`
    SELECT * FROM weather_events
    WHERE end_time > ?
    ORDER BY start_time ASC
  `).all(currentTime) as Array<{
    id: number;
    start_time: string;
    end_time: string;
    affected_routes: string;
    condition: string;
  }>;

  // Check each route for active weather
  return AVAILABLE_ROUTES.map((route) => {
    // Find if this route has any active weather events
    const activeWeather = weatherEvents.find((event) => {
      const affectedRoutes = event.affected_routes
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      
      // Check if route is in affected routes and time overlaps
      if (!affectedRoutes.includes(route)) {
        return false;
      }

      // Check time overlap with current simulation time
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const simTime = new Date(currentTime);
      
      return simTime >= eventStart && simTime < eventEnd;
    });

    return {
      route,
      status: activeWeather ? "unsafe" : "clear",
      weather_event: activeWeather || null,
    };
  });
}

describe("Routes with Status", () => {
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
  });

  it("should return all routes with clear status when no weather events exist", () => {
    const currentTime = "2025-11-10T12:00:00.000Z";
    const routes = getAllRoutesWithStatusTest(db, currentTime);

    expect(routes.length).toBe(4);
    routes.forEach((route) => {
      expect(route.status).toBe("clear");
      expect(route.weather_event).toBeNull();
    });
  });

  it("should mark routes as unsafe when they have active weather", () => {
    const currentTime = "2025-11-10T12:00:00.000Z";
    const eventStart = "2025-11-10T11:00:00.000Z";
    const eventEnd = "2025-11-10T13:00:00.000Z";

    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [eventStart, eventEnd, "KAUS–KGTU", "storm"]
    );

    const routes = getAllRoutesWithStatusTest(db, currentTime);
    const affectedRoute = routes.find((r) => r.route === "KAUS–KGTU");
    const unaffectedRoute = routes.find((r) => r.route === "KAUS–KHYI");

    expect(affectedRoute?.status).toBe("unsafe");
    expect(affectedRoute?.weather_event).toBeDefined();
    expect(affectedRoute?.weather_event?.condition).toBe("storm");

    expect(unaffectedRoute?.status).toBe("clear");
    expect(unaffectedRoute?.weather_event).toBeNull();
  });

  it("should handle multiple routes in one weather event", () => {
    const currentTime = "2025-11-10T12:00:00.000Z";
    const eventStart = "2025-11-10T11:00:00.000Z";
    const eventEnd = "2025-11-10T13:00:00.000Z";

    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [eventStart, eventEnd, "KAUS–KGTU, KAUS–KHYI", "storm"]
    );

    const routes = getAllRoutesWithStatusTest(db, currentTime);
    const route1 = routes.find((r) => r.route === "KAUS–KGTU");
    const route2 = routes.find((r) => r.route === "KAUS–KHYI");
    const route3 = routes.find((r) => r.route === "KAUS–KEDC");

    expect(route1?.status).toBe("unsafe");
    expect(route2?.status).toBe("unsafe");
    expect(route3?.status).toBe("clear");
  });

  it("should only mark routes unsafe if time overlaps", () => {
    const currentTime = "2025-11-10T12:00:00.000Z";
    
    // Weather event that hasn't started yet
    const futureStart = "2025-11-10T13:00:00.000Z";
    const futureEnd = "2025-11-10T14:00:00.000Z";
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [futureStart, futureEnd, "KAUS–KGTU", "storm"]
    );

    // Weather event that has already ended
    const pastStart = "2025-11-10T10:00:00.000Z";
    const pastEnd = "2025-11-10T11:00:00.000Z";
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [pastStart, pastEnd, "KAUS–KHYI", "storm"]
    );

    const routes = getAllRoutesWithStatusTest(db, currentTime);
    const route1 = routes.find((r) => r.route === "KAUS–KGTU");
    const route2 = routes.find((r) => r.route === "KAUS–KHYI");

    expect(route1?.status).toBe("clear"); // Future event
    expect(route2?.status).toBe("clear"); // Past event
  });

  it("should handle multiple weather events affecting different routes", () => {
    const currentTime = "2025-11-10T12:00:00.000Z";
    const eventStart = "2025-11-10T11:00:00.000Z";
    const eventEnd = "2025-11-10T13:00:00.000Z";

    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [eventStart, eventEnd, "KAUS–KGTU", "storm"]
    );
    db.run(
      "INSERT INTO weather_events (start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
      [eventStart, eventEnd, "KAUS–KEDC", "fog"]
    );

    const routes = getAllRoutesWithStatusTest(db, currentTime);
    const route1 = routes.find((r) => r.route === "KAUS–KGTU");
    const route2 = routes.find((r) => r.route === "KAUS–KEDC");
    const route3 = routes.find((r) => r.route === "KAUS–KHYI");

    expect(route1?.status).toBe("unsafe");
    expect(route1?.weather_event?.condition).toBe("storm");
    expect(route2?.status).toBe("unsafe");
    expect(route2?.weather_event?.condition).toBe("fog");
    expect(route3?.status).toBe("clear");
  });

  it("should return all available routes", () => {
    const currentTime = "2025-11-10T12:00:00.000Z";
    const routes = getAllRoutesWithStatusTest(db, currentTime);

    expect(routes.length).toBe(AVAILABLE_ROUTES.length);
    const routeNames = routes.map((r) => r.route);
    AVAILABLE_ROUTES.forEach((route) => {
      expect(routeNames).toContain(route);
    });
  });
});

