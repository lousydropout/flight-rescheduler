import { db } from "../db";

export function getSimulationTime() {
  // Get stored simulation time if available, otherwise use current time
  const setting = db.query("SELECT value FROM simulation_settings WHERE key = ?").get("simulation_time") as {
    value: string;
  } | null;

  if (setting && setting.value) {
    return setting.value;
  }

  // Default to current time
  const result = db.query("SELECT datetime('now') as current_time").get() as {
    current_time: string;
  };
  return result.current_time;
}

export function fastForwardTime() {
  // Get current simulation time
  const currentTime = getSimulationTime();
  const currentDate = new Date(currentTime);

  // Advance to next hour (e.g., 4:01 -> 5:00, 5:30 -> 6:00)
  const nextHour = currentDate.getHours() + 1;
  const fastForwardedDate = new Date(currentDate);
  fastForwardedDate.setHours(nextHour, 0, 0, 0);
  fastForwardedDate.setMinutes(0);
  fastForwardedDate.setSeconds(0);
  fastForwardedDate.setMilliseconds(0);

  const newTime = fastForwardedDate.toISOString();

  // Store the new simulation time
  db.run(
    "INSERT OR REPLACE INTO simulation_settings (key, value) VALUES (?, ?)",
    ["simulation_time", newTime]
  );

  return newTime;
}

