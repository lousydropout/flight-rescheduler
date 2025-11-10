import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Test functions that mirror the actual time implementation
function getSimulationTimeTest(db: Database) {
  // Get stored simulation time from dedicated table
  // Use SELECT * to avoid SQLite date/time interpretation issues when selecting specific columns
  const results = db.query("SELECT * FROM simulation_time WHERE id = 1").all() as {
    id: number;
    current_time: string;
  }[];
  const result = results[0] || null;

  if (result && result.current_time) {
    return result.current_time;
  }

  // Fallback: initialize with current time if table is empty
  const now = new Date().toISOString();
  db.run("INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)", [now]);
  return now;
}

function advanceTimeByMinutesTest(db: Database, minutes: number) {
  // Get current simulation time
  const currentTime = getSimulationTimeTest(db);
  const currentDate = new Date(currentTime);

  // Advance by specified minutes
  const newDate = new Date(currentDate);
  newDate.setMinutes(newDate.getMinutes() + minutes);

  const newTime = newDate.toISOString();

  // Update the simulation time in the database
  db.run(
    "UPDATE simulation_time SET current_time = ? WHERE id = 1",
    [newTime]
  );

  return newTime;
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

  // Update the simulation time in the database
  db.run(
    "UPDATE simulation_time SET current_time = ? WHERE id = 1",
    [newTime]
  );

  return newTime;
}

describe("Simulation Time Control", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE IF NOT EXISTS simulation_time (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_time TEXT NOT NULL
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
    // First ensure the row exists
    db.run("DELETE FROM simulation_time");
    db.run(
      "INSERT INTO simulation_time (id, current_time) VALUES (1, ?)",
      [storedTime]
    );

    const time = getSimulationTimeTest(db);
    expect(time).toBe(storedTime);
  });

  it("should advance time by specified minutes", () => {
    const startTime = "2025-11-10T14:00:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)",
      [startTime]
    );

    const newTime = advanceTimeByMinutesTest(db, 10);
    const newDate = new Date(newTime);
    const startDate = new Date(startTime);
    
    expect(newDate.getMinutes()).toBe(startDate.getMinutes() + 10);
  });

  it("should advance time by 10 minutes (background process simulation)", () => {
    const startTime = "2025-11-10T14:00:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)",
      [startTime]
    );

    // Simulate background process advancing by 10 minutes
    const newTime = advanceTimeByMinutesTest(db, 10);
    const newDate = new Date(newTime);
    
    expect(newDate.getMinutes()).toBe(10);
    expect(newDate.getHours()).toBe(14);
  });

  it("should fast forward to next hour from current time", () => {
    const startTime = "2025-11-10T14:01:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)",
      [startTime]
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
      "INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)",
      [startTime]
    );

    const newTime = fastForwardTimeTest(db);
    const newDate = new Date(newTime);
    
    expect(newDate.getHours()).toBe(15); // 14:30 -> 15:00
    expect(newDate.getMinutes()).toBe(0);
  });

  it("should handle hour rollover (23:00 -> 00:00 next day)", () => {
    const startTime = "2025-11-10T23:15:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)",
      [startTime]
    );

    const newTime = fastForwardTimeTest(db);
    const newDate = new Date(newTime);
    
    expect(newDate.getHours()).toBe(0); // 23:15 -> 00:00 next day
    expect(newDate.getDate()).toBe(11); // Next day
  });

  it("should update stored simulation time after fast forward", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)",
      [startTime]
    );

    const newTime = fastForwardTimeTest(db);
    const storedResults = db.query("SELECT * FROM simulation_time WHERE id = 1").all() as {
      id: number;
      current_time: string;
    }[];
    const stored = storedResults[0];

    expect(stored.current_time).toBe(newTime);
    expect(newTime).not.toBe(startTime);
  });

  it("should be chainable (can fast forward multiple times)", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    db.run(
      "INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)",
      [startTime]
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

