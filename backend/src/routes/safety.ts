import { store } from "../store";
import { getSimulationTime } from "./time";

export function safetyCheck() {
  // Get all active weather events (using simulation time)
  const currentTime = getSimulationTime();
  const allWeatherEvents = store.getWeatherEvents();
  const weatherEvents = allWeatherEvents
    .filter(w => w.end_time > currentTime)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (weatherEvents.length === 0) {
    store.addAlert(new Date().toISOString(), "Safety check: No active weather events found");
    return { ok: true, cancelled: 0, message: "No active weather events" };
  }

  let totalCancelled = 0;
  const allFlights = store.getFlights();

  // Process each weather event
  for (const weatherEvent of weatherEvents) {
    // Parse affected routes (comma-separated)
    const affectedRoutes = weatherEvent.affected_routes
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (affectedRoutes.length === 0) {
      continue;
    }

    // Find matching flights
    // Match route AND time overlap AND status is 'scheduled' or 'in_progress'
    // Time overlap: flight.start_time < weather.end_time AND flight.end_time > weather.start_time
    const affectedFlights = allFlights.filter(f =>
      affectedRoutes.includes(f.route) &&
      (f.status === 'scheduled' || f.status === 'in_progress') &&
      f.start_time < weatherEvent.end_time &&
      f.end_time > weatherEvent.start_time
    );

    // Mark matching flights as affected
    if (affectedFlights.length > 0) {
      for (const flight of affectedFlights) {
        store.updateFlight(flight.id, { status: 'affected' });
      }

      totalCancelled += affectedFlights.length;

      // Create detailed alert
      const routesList = affectedRoutes.join(", ");
      const alertMessage = `${affectedFlights.length} flight(s) affected by ${weatherEvent.condition} on ${routesList}. Click to reschedule.`;
      store.addAlert(new Date().toISOString(), alertMessage);
    }
  }

  if (totalCancelled === 0) {
    store.addAlert(new Date().toISOString(), "Safety check: No flights needed to be affected");
  }

  return { ok: true, cancelled: totalCancelled, affected: totalCancelled };
}

