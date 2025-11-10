import { Database } from "bun:sqlite";
import { initSchema } from "./schema";

export const db = new Database("flight.db");

// Initialize schema
initSchema();

// Keep test table for now
db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, message TEXT)");

export const addTest = (msg: string) => {
  db.run("INSERT INTO test (message) VALUES (?)", [msg]);
};

export const getAll = () => {
  return db.query("SELECT * FROM test").all();
};

