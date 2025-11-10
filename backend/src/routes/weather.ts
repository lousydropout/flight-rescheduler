import { store } from "../store";
import { getSimulationTime } from "./time";
import { safetyCheck } from "./safety";

const AVAILABLE_ROUTES = ["KAUS–KGTU", "KAUS–KHYI", "KAUS–KEDC", "KAUS–KATT"];

export function simulateWeather(condition: string = "storm", durationHours: number = 3, startTimeParam?: string) {
  // Randomly select 2-3 routes
  const numRoutes = Math.floor(Math.random() * 2) + 2; // 2 or 3 routes
  const shuffled = [...AVAILABLE_ROUTES].sort(() => Math.random() - 0.5);
  const selectedRoutes = shuffled.slice(0, numRoutes);
  const affectedRoutes = selectedRoutes.join(", ");

  // Use provided start_time or current simulation time
  const currentSimTime = getSimulationTime();
  const startTime = startTimeParam ? new Date(startTimeParam) : new Date(currentSimTime);
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  // Insert weather event
  store.addWeatherEvent(
    startTime.toISOString(),
    endTime.toISOString(),
    affectedRoutes,
    condition
  );

  // Create detailed alert using simulation time
  const alertMessage = `Simulated ${condition} (${durationHours}h) affecting ${affectedRoutes}`;
  store.addAlert(currentSimTime, alertMessage);

  // Automatically run safety check after creating weather event
  const safetyResult = safetyCheck();

  return { 
    ok: true, 
    condition, 
    duration_hours: durationHours, 
    affected_routes: affectedRoutes,
    safety_check: {
      cancelled: safetyResult.cancelled
    }
  };
}

export function getAllWeather() {
  // Get all active weather events (where end_time is after current simulation time)
  const currentTime = getSimulationTime();
  const allWeather = store.getWeatherEvents();
  return allWeather
    .filter(w => w.end_time > currentTime)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

