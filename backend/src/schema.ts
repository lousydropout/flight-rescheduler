import { db } from "./db";

export function initSchema() {
  // Students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      level TEXT,
      preferred_time TEXT
    )
  `);

  // Instructors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);

  // Planes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS planes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tail_number TEXT
    )
  `);

  // Flights table
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

  // Weather events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weather_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT,
      end_time TEXT,
      affected_routes TEXT,
      condition TEXT
    )
  `);

  // Alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      message TEXT
    )
  `);

  // Simulation settings table for storing simulation time
  db.exec(`
    CREATE TABLE IF NOT EXISTS simulation_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}

