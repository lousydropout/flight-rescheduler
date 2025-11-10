import { db } from "../db";

export function simulateWeather() {
  // Insert weather event
  db.run(
    "INSERT INTO weather_events(start_time, end_time, affected_routes, condition) VALUES (datetime('now'), datetime('now','+3 hours'), ?, ?)",
    ["KAUS–KHYI", "storm"]
  );

  // Create alert
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    ["Simulated storm at KAUS–KHYI"]
  );

  return { ok: true };
}

export function getAllWeather() {
  // Get all active weather events (where end_time is in the future)
  const weather = db.query(`
    SELECT * FROM weather_events
    WHERE end_time > datetime('now')
    ORDER BY start_time ASC
  `).all();
  
  return weather;
}

