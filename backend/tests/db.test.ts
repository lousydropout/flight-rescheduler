import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

describe("Database Operations", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, message TEXT)");
  });

  it("should insert and retrieve data", () => {
    db.run("INSERT INTO test (message) VALUES (?)", ["Hello DB"]);
    const result = db.query("SELECT * FROM test WHERE message = ?").get("Hello DB") as {
      id: number;
      message: string;
    };
    expect(result).toBeDefined();
    expect(result.message).toBe("Hello DB");
    expect(result.id).toBe(1);
  });

  it("should handle multiple inserts", () => {
    db.run("INSERT INTO test (message) VALUES (?)", ["First"]);
    db.run("INSERT INTO test (message) VALUES (?)", ["Second"]);
    const results = db.query("SELECT * FROM test").all() as { id: number; message: string }[];
    expect(results.length).toBe(2);
    expect(results[0].message).toBe("First");
    expect(results[1].message).toBe("Second");
  });

  it("should return empty array when no data exists", () => {
    const results = db.query("SELECT * FROM test").all();
    expect(results).toEqual([]);
  });

  it("should handle prepared statements", () => {
    const stmt = db.prepare("INSERT INTO test (message) VALUES (?)");
    stmt.run("Prepared 1");
    stmt.run("Prepared 2");
    const results = db.query("SELECT * FROM test").all() as { message: string }[];
    expect(results.length).toBe(2);
  });
});

