import { store } from "../store";
import { getSimulationTime } from "./time";

const AVAILABLE_ROUTES = ["KAUS–KGTU", "KAUS–KHYI", "KAUS–KEDC", "KAUS–KATT"];

export function getAllRoutesWithStatus() {
  const currentTime = getSimulationTime();
  
  // Get all active weather events
  const allWeatherEvents = store.getWeatherEvents();
  const weatherEvents = allWeatherEvents
    .filter(w => w.end_time > currentTime)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Check each route for active weather
  return AVAILABLE_ROUTES.map((route) => {
    // Find if this route has any active weather events
    const activeWeather = weatherEvents.find((event) => {
      const affectedRoutes = event.affected_routes
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      
      // Check if route is in affected routes and time overlaps
      if (!affectedRoutes.includes(route)) {
        return false;
      }

      // Check time overlap with current simulation time
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const simTime = new Date(currentTime);
      
      return simTime >= eventStart && simTime < eventEnd;
    });

    return {
      route,
      status: activeWeather ? "unsafe" : "clear",
      weather_event: activeWeather || null,
    };
  });
}

