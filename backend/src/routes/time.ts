import { db } from "../db";

export function getSimulationTime() {
  // Get current simulation time from database
  // For now, this is just the current time, but could be adjusted for simulation control
  const result = db.query("SELECT datetime('now') as current_time").get() as {
    current_time: string;
  };
  return result.current_time;
}

