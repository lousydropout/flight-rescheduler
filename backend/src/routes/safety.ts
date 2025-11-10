import { db } from "../db";

export function safetyCheck() {
  // Get all active weather events
  const weatherEvents = db.query(`
    SELECT * FROM weather_events
    WHERE end_time > datetime('now')
    ORDER BY start_time ASC
  `).all() as Array<{
    id: number;
    start_time: string;
    end_time: string;
    affected_routes: string;
    condition: string;
  }>;

  if (weatherEvents.length === 0) {
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["Safety check: No active weather events found"]
    );
    return { ok: true, cancelled: 0, message: "No active weather events" };
  }

  let totalCancelled = 0;

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

    // Build SQL query to find matching flights
    // Match route AND time overlap AND status is 'scheduled'
    // Time overlap: flight.start_time < weather.end_time AND flight.end_time > weather.start_time
    const placeholders = affectedRoutes.map(() => "?").join(",");
    const cancelledFlights = db.query(`
      SELECT id, route, start_time, end_time
      FROM flights
      WHERE route IN (${placeholders})
        AND status = 'scheduled'
        AND start_time < ?
        AND end_time > ?
    `).all(
      [...affectedRoutes, weatherEvent.end_time, weatherEvent.start_time]
    ) as Array<{
      id: number;
      route: string;
      start_time: string;
      end_time: string;
    }>;

    // Cancel matching flights
    if (cancelledFlights.length > 0) {
      const flightIds = cancelledFlights.map((f) => f.id);
      const placeholders = flightIds.map(() => "?").join(",");
      db.run(
        `UPDATE flights SET status='cancelled' WHERE id IN (${placeholders})`,
        flightIds
      );

      totalCancelled += cancelledFlights.length;

      // Create detailed alert
      const routesList = affectedRoutes.join(", ");
      const alertMessage = `${cancelledFlights.length} flight(s) cancelled due to ${weatherEvent.condition} affecting ${routesList}`;
      db.run(
        "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
        [alertMessage]
      );
    }
  }

  if (totalCancelled === 0) {
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["Safety check: No flights needed to be cancelled"]
    );
  }

  return { ok: true, cancelled: totalCancelled };
}

