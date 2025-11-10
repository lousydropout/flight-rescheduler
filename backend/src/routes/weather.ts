import { db } from "../db";
import { getSimulationTime } from "./time";

const AVAILABLE_ROUTES = ["KAUS–KGTU", "KAUS–KHYI", "KAUS–KEDC", "KAUS–KATT"];

export function simulateWeather(condition: string = "storm", durationHours: number = 3, startTimeParam?: string) {
  // Randomly select 2-3 routes
  const numRoutes = Math.floor(Math.random() * 2) + 2; // 2 or 3 routes
  const shuffled = [...AVAILABLE_ROUTES].sort(() => Math.random() - 0.5);
  const selectedRoutes = shuffled.slice(0, numRoutes);
  const affectedRoutes = selectedRoutes.join(", ");

  // Use provided start_time or current time
  const startTime = startTimeParam ? new Date(startTimeParam) : new Date();
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Insert weather event
  db.run(
    "INSERT INTO weather_events(start_time, end_time, affected_routes, condition) VALUES (?, ?, ?, ?)",
    [startTime.toISOString(), endTime.toISOString(), affectedRoutes, condition]
  );

  // Create detailed alert
  const alertMessage = `Simulated ${condition} (${durationHours}h) affecting ${affectedRoutes}`;
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    [alertMessage]
  );

  return { ok: true, condition, duration_hours: durationHours, affected_routes: affectedRoutes };
}

export function getAllWeather() {
  // Get all active weather events (where end_time is after current simulation time)
  const currentTime = getSimulationTime();
  const weather = db.query(`
    SELECT * FROM weather_events
    WHERE end_time > ?
    ORDER BY start_time ASC
  `).all(currentTime);
  
  return weather;
}

