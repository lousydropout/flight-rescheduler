import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// Test function that mirrors the actual updateFlightStatuses implementation
function updateFlightStatusesTest(db: Database, currentTime: string) {
  // First, update scheduled flights that have already ended to completed
  const scheduledToCompleted = db.run(`
    UPDATE flights
    SET status = 'completed'
    WHERE status = 'scheduled'
      AND end_time <= ?
  `, [currentTime]);

  // Update flights that should be in progress
  const inProgressUpdated = db.run(`
    UPDATE flights
    SET status = 'in_progress'
    WHERE status = 'scheduled'
      AND start_time <= ?
      AND end_time > ?
  `, [currentTime, currentTime]);

  // Update flights that should be completed
  const completedUpdated = db.run(`
    UPDATE flights
    SET status = 'completed'
    WHERE status = 'in_progress'
      AND end_time <= ?
  `, [currentTime]);

  return { 
    scheduled_to_completed: scheduledToCompleted.changes || 0,
    in_progress: inProgressUpdated.changes || 0,
    completed: completedUpdated.changes || 0
  };
}

function getSimulationTimeTest(db: Database) {
  const results = db.query("SELECT * FROM simulation_time WHERE id = 1").all() as {
    id: number;
    current_time: string;
  }[];
  const result = results[0] || null;

  if (result && result.current_time) {
    return result.current_time;
  }

  const now = new Date().toISOString();
  db.run("INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)", [now]);
  return now;
}

describe("Flight Status Updates", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
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
      CREATE TABLE IF NOT EXISTS simulation_time (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_time TEXT NOT NULL
      )
    `);
  });

  it("should update scheduled flight to in_progress when simulation time is within flight window", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T10:30:00.000Z"; // Middle of flight

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.in_progress).toBe(1);
    expect(result.completed).toBe(0);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("in_progress");
  });

  it("should not update flight if simulation time is before start_time", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T09:30:00.000Z"; // Before flight

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(0);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("scheduled");
  });

  it("should update scheduled flight to completed if simulation time is after end_time", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T11:30:00.000Z"; // After flight

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.scheduled_to_completed).toBe(1);
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(0);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("completed");
  });

  it("should not update cancelled or rescheduled flights", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T10:30:00.000Z";

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "cancelled"]
    );
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [2, 1, 1, startTime, endTime, "KAUS–KGTU", "rescheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(0);

    const cancelled = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    const rescheduled = db.query("SELECT status FROM flights WHERE id = 2").get() as {
      status: string;
    };

    expect(cancelled.status).toBe("cancelled");
    expect(rescheduled.status).toBe("rescheduled");
  });

  it("should update multiple flights that are in progress", () => {
    const currentTime = "2025-11-10T10:30:00.000Z";

    // Flight 1: in progress
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, "2025-11-10T10:00:00.000Z", "2025-11-10T11:00:00.000Z", "KAUS–KGTU", "scheduled"]
    );

    // Flight 2: in progress
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [2, 1, 1, "2025-11-10T10:00:00.000Z", "2025-11-10T11:00:00.000Z", "KAUS–KHYI", "scheduled"]
    );

    // Flight 3: not yet started
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [3, 1, 1, "2025-11-10T11:00:00.000Z", "2025-11-10T12:00:00.000Z", "KAUS–KEDC", "scheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.in_progress).toBe(2);
    expect(result.completed).toBe(0);

    const flight1 = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    const flight2 = db.query("SELECT status FROM flights WHERE id = 2").get() as {
      status: string;
    };
    const flight3 = db.query("SELECT status FROM flights WHERE id = 3").get() as {
      status: string;
    };

    expect(flight1.status).toBe("in_progress");
    expect(flight2.status).toBe("in_progress");
    expect(flight3.status).toBe("scheduled");
  });

  it("should handle flight that starts exactly at current time", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T10:00:00.000Z"; // Exactly at start

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.in_progress).toBe(1);
    expect(result.completed).toBe(0);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("in_progress");
  });

  it("should update in_progress flight to completed when time passes end_time", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T11:30:00.000Z"; // After flight ended

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "in_progress"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(1);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("completed");
  });

  it("should update in_progress flight to completed when time is exactly at end_time", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T11:00:00.000Z"; // Exactly at end

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "in_progress"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(1);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("completed");
  });

  it("should handle full progression: scheduled -> in_progress -> completed", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    // Step 1: Time is during flight -> should be in_progress
    let result = updateFlightStatusesTest(db, "2025-11-10T10:30:00.000Z");
    expect(result.in_progress).toBe(1);
    expect(result.completed).toBe(0);

    let flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("in_progress");

    // Step 2: Time has passed end_time -> should be completed
    result = updateFlightStatusesTest(db, "2025-11-10T11:30:00.000Z");
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(1);

    flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("completed");
  });

  it("should not update completed flights", () => {
    const startTime = "2025-11-10T10:00:00.000Z";
    const endTime = "2025-11-10T11:00:00.000Z";
    const currentTime = "2025-11-10T12:00:00.000Z"; // Well after flight ended

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "completed"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.scheduled_to_completed).toBe(0);
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(0);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("completed");
  });

  it("should update scheduled flights to completed when their end_time has already passed", () => {
    const startTime = "2025-11-10T08:00:00.000Z"; // 8 AM
    const endTime = "2025-11-10T09:00:00.000Z";   // 9 AM
    const currentTime = "2025-11-10T20:00:00.000Z"; // 8 PM (12 hours later)

    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, startTime, endTime, "KAUS–KGTU", "scheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.scheduled_to_completed).toBe(1);
    expect(result.in_progress).toBe(0);
    expect(result.completed).toBe(0);

    const flight = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    expect(flight.status).toBe("completed");
  });

  it("should handle multiple scheduled flights that have already ended", () => {
    const currentTime = "2025-11-10T20:00:00.000Z"; // 8 PM

    // Flight 1: ended at 9 AM
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 1, 1, "2025-11-10T08:00:00.000Z", "2025-11-10T09:00:00.000Z", "KAUS–KGTU", "scheduled"]
    );

    // Flight 2: ended at 10 AM
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [2, 1, 1, "2025-11-10T09:00:00.000Z", "2025-11-10T10:00:00.000Z", "KAUS–KHYI", "scheduled"]
    );

    // Flight 3: ends exactly at current time (8 PM) - should be marked as completed
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [3, 1, 1, "2025-11-10T19:00:00.000Z", "2025-11-10T20:00:00.000Z", "KAUS–KEDC", "scheduled"]
    );

    // Flight 4: still in progress (should become in_progress, not completed)
    db.run(
      "INSERT INTO flights (student_id, instructor_id, plane_id, start_time, end_time, route, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [4, 1, 1, "2025-11-10T19:30:00.000Z", "2025-11-10T20:30:00.000Z", "KAUS–KATT", "scheduled"]
    );

    const result = updateFlightStatusesTest(db, currentTime);
    expect(result.scheduled_to_completed).toBe(3); // Flights 1, 2, and 3 (all ended)
    expect(result.in_progress).toBe(1); // Flight 4
    expect(result.completed).toBe(0);

    const flight1 = db.query("SELECT status FROM flights WHERE id = 1").get() as {
      status: string;
    };
    const flight2 = db.query("SELECT status FROM flights WHERE id = 2").get() as {
      status: string;
    };
    const flight3 = db.query("SELECT status FROM flights WHERE id = 3").get() as {
      status: string;
    };
    const flight4 = db.query("SELECT status FROM flights WHERE id = 4").get() as {
      status: string;
    };

    expect(flight1.status).toBe("completed");
    expect(flight2.status).toBe("completed");
    expect(flight3.status).toBe("completed");
    expect(flight4.status).toBe("in_progress");
  });
});

