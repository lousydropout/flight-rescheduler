import { store } from "../store";

export function cleanupSimulation() {
  // Delete all weather events
  store.clearWeatherEvents();

  // Reset all flights to scheduled status (preserves original times, instructors, planes)
  const flights = store.getFlights();
  for (const flight of flights) {
    if (flight.status !== 'scheduled') {
      store.updateFlight(flight.id, { status: 'scheduled' });
    }
  }

  // Add reset alert
  store.addAlert(
    new Date().toISOString(),
    "Simulation reset - all flights restored to scheduled status"
  );

  return { ok: true, message: "Simulation reset" };
}

