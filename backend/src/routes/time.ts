import { db } from "../db";

export function getSimulationTime() {
  // Get stored simulation time from dedicated table
  // Use SELECT * to avoid SQLite date/time interpretation issues when selecting specific columns
  const results = db.query("SELECT * FROM simulation_time WHERE id = 1").all() as {
    id: number;
    current_time: string;
  }[];
  const result = results[0] || null;

  if (result && result.current_time) {
    return result.current_time;
  }

  // Fallback: initialize with current time if table is empty
  const now = new Date().toISOString();
  db.run("INSERT OR REPLACE INTO simulation_time (id, current_time) VALUES (1, ?)", [now]);
  return now;
}

export function advanceTimeByMinutes(minutes: number) {
  // Get current simulation time
  const currentTime = getSimulationTime();
  const currentDate = new Date(currentTime);

  // Advance by specified minutes
  const newDate = new Date(currentDate);
  newDate.setMinutes(newDate.getMinutes() + minutes);

  const newTime = newDate.toISOString();

  // Update the simulation time in the database
  db.run(
    "UPDATE simulation_time SET current_time = ? WHERE id = 1",
    [newTime]
  );

  return newTime;
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

  // Update the simulation time in the database
  db.run(
    "UPDATE simulation_time SET current_time = ? WHERE id = 1",
    [newTime]
  );

  return newTime;
}

