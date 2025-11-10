import { Database } from "bun:sqlite";
import { initSchema } from "./schema";

/**
 * Creates a test database instance for unit tests
 */
export function createTestDb(): Database {
  const testDb = new Database(":memory:"); // In-memory database for tests
  
  // Initialize schema on test database
  const originalDb = require("./db").db;
  // Temporarily replace db in schema module
  const schemaModule = require("./schema");
  
  // Create a wrapper that uses our test DB
  const testInitSchema = () => {
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
      CREATE TABLE IF NOT EXISTS weather_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT,
        end_time TEXT,
        affected_routes TEXT,
        condition TEXT
      )
    `);
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        message TEXT
      )
    `);
  };
  
  testInitSchema();
  return testDb;
}

