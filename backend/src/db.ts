import { Database } from "bun:sqlite";

export const db = new Database("flight.db");

db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, message TEXT)");

export const addTest = (msg: string) => {
  db.run("INSERT INTO test (message) VALUES (?)", [msg]);
};

export const getAll = () => {
  return db.query("SELECT * FROM test").all();
};

