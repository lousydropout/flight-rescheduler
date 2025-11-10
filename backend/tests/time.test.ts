import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Test functions that mirror the actual time implementation
function getSimulationTimeTest(db: Database) {
  // Get stored simulation time if available, otherwise use current time
  const setting = db.query("SELECT value FROM simulation_settings WHERE key = ?").get("simulation_time") as {
    value: string;
  } | null;

  if (setting && setting.value) {
    return setting.value;
  }

  // Default to current time
  const result = db.query("SELECT datetime('now') as current_time").get() as {
    current_time: string;
  };
  return result.current_time;
}

function fastForwardTimeTest(db: Database) {
  // Get current simulation time
  const currentTime = getSimulationTimeTest(db);
  const currentDate = new Date(currentTime);

  // Advance to next hour (e.g., 4:01 -> 5:00, 5:30 -> 6:00)
  const nextHour = currentDate.getHours() + 1;
  const fastForwardedDate = new Date(currentDate);
  fastForwardedDate.setHours(nextHour, 0, 0, 0);
  fastForwardedDate.setMinutes(0);
  fastForwardedDate.setSeconds(0);
  fastForwardedDate.setMilliseconds(0);

  const newTime = fastForwardedDate.toISOString();

  // Store the new simulation time
  db.run(
    "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
    ["simulation_time", newTime]
  );

  return newTime;
}

describe("Simulation Time Control", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE IF NOT EXISTS simulation_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  });

  it("should return current time when no simulation time is set", () => {
    const time = getSimulationTimeTest(db);
    expect(time).toBeDefined();
    expect(new Date(time).getTime()).toBeGreaterThan(0);
  });

  it("should return stored simulation time when set", () => {
    const storedTime = "2025-11-10T14:30:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
      ["simulation_time", storedTime]
    );

    const time = getSimulationTimeTest(db);
    expect(time).toBe(storedTime);
  });

  it("should fast forward to next hour from current time", () => {
    const startTime = "2025-11-10T14:01:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
      ["simulation_time", startTime]
    );

    const newTime = fastForwardTimeTest(db);
    const newDate = new Date(newTime);
    
    expect(newDate.getHours()).toBe(15); // 14:01 -> 15:00
    expect(newDate.getMinutes()).toBe(0);
    expect(newDate.getSeconds()).toBe(0);
  });

  it("should fast forward correctly from half hour", () => {
    const startTime = "2025-11-10T14:30:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
      ["simulation_time", startTime]
    );

    const newTime = fastForwardTimeTest(db);
    const newDate = new Date(newTime);
    
    expect(newDate.getHours()).toBe(15); // 14:30 -> 15:00
    expect(newDate.getMinutes()).toBe(0);
  });

  it("should handle hour rollover (23:00 -> 00:00 next day)", () => {
    const startTime = "2025-11-10T23:15:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
      ["simulation_time", startTime]
    );

    const newTime = fastForwardTimeTest(db);
    const newDate = new Date(newTime);
    
    expect(newDate.getHours()).toBe(0); // 23:15 -> 00:00 next day
    expect(newDate.getDate()).toBe(11); // Next day
  });

  it("should update stored simulation time after fast forward", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
      ["simulation_time", startTime]
    );

    const newTime = fastForwardTimeTest(db);
    const stored = db.query("SELECT value FROM simulation_settings WHERE key = ?").get("simulation_time") as {
      value: string;
    };

    expect(stored.value).toBe(newTime);
    expect(newTime).not.toBe(startTime);
  });

  it("should be chainable (can fast forward multiple times)", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
      ["simulation_time", startTime]
    );

    const time1 = fastForwardTimeTest(db);
    const date1 = new Date(time1);
    expect(date1.getHours()).toBe(11);

    const time2 = fastForwardTimeTest(db);
    const date2 = new Date(time2);
    expect(date2.getHours()).toBe(12);

    const time3 = fastForwardTimeTest(db);
    const date3 = new Date(time3);
    expect(date3.getHours()).toBe(13);
  });
});

