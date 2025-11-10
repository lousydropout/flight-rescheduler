import { db } from "../db";

interface CancelledFlight {
  id: number;
  student_id: number;
  instructor_id: number;
  plane_id: number;
  route: string;
  student_preferred_time: string;
}

// Helper function to check if a time slot is available for an instructor
function isInstructorAvailable(instructorId: number, startTime: string, endTime: string): boolean {
  const conflicts = db.query(`
    SELECT COUNT(*) as count
    FROM flights
    WHERE instructor_id = ?
      AND status != 'cancelled'
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND end_time <= ?)
      )
  `).get(instructorId, endTime, startTime, endTime, startTime, startTime, endTime) as { count: number };
  
  return conflicts.count === 0;
}

// Helper function to check if a time slot is available for a plane
function isPlaneAvailable(planeId: number, startTime: string, endTime: string): boolean {
  const conflicts = db.query(`
    SELECT COUNT(*) as count
    FROM flights
    WHERE plane_id = ?
      AND status != 'cancelled'
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND end_time <= ?)
      )
  `).get(planeId, endTime, startTime, endTime, startTime, startTime, endTime) as { count: number };
  
  return conflicts.count === 0;
}

// Helper function to get preferred time window hours
function getPreferredTimeWindow(preferredTime: string): { start: number; end: number } {
  switch (preferredTime) {
    case "morning":
      return { start: 8, end: 11 };
    case "noon":
      return { start: 11, end: 14 };
    case "afternoon":
      return { start: 14, end: 17 };
    default:
      return { start: 8, end: 17 }; // Default to full day
  }
}

// Helper function to find next available slot
function findAvailableSlot(
  flight: CancelledFlight,
  earliestStart: Date,
  preferredWindow: { start: number; end: number }
): { startTime: Date; endTime: Date; instructorId: number; planeId: number } | null {
  // Get all instructors and planes
  const instructors = db.query("SELECT id FROM instructors").all() as Array<{ id: number }>;
  const planes = db.query("SELECT id FROM planes").all() as Array<{ id: number }>;

  const earliestHour = earliestStart.getHours();
  const earliestMinute = earliestStart.getMinutes();

  // Try preferred time window first
  // Start from max(preferred window start, earliest hour + 1 if we're past the hour)
  const preferredStartHour = Math.max(
    preferredWindow.start,
    earliestMinute > 0 ? earliestHour + 1 : earliestHour
  );

  for (let hour = preferredStartHour; hour < preferredWindow.end; hour++) {
    const candidateDate = new Date(earliestStart);
    candidateDate.setHours(hour, 0, 0, 0);
    
    // If candidate is before earliest start, skip
    if (candidateDate < earliestStart) {
      continue;
    }

    const endDate = new Date(candidateDate);
    endDate.setHours(hour + 1, 0, 0, 0);

    // Try each instructor/plane combination
    for (const instructor of instructors) {
      for (const plane of planes) {
        if (
          isInstructorAvailable(instructor.id, candidateDate.toISOString(), endDate.toISOString()) &&
          isPlaneAvailable(plane.id, candidateDate.toISOString(), endDate.toISOString())
        ) {
          return {
            startTime: candidateDate,
            endTime: endDate,
            instructorId: instructor.id,
            planeId: plane.id,
          };
        }
      }
    }
  }

  // If no slot in preferred time, try other time windows (8-17)
  // Start from max(8, earliest hour + 1 if we're past the hour)
  const otherStartHour = Math.max(
    8,
    earliestMinute > 0 ? earliestHour + 1 : earliestHour
  );

  for (let hour = otherStartHour; hour < 17; hour++) {
    // Skip preferred window hours
    if (hour >= preferredWindow.start && hour < preferredWindow.end) {
      continue;
    }

    const candidateDate = new Date(earliestStart);
    candidateDate.setHours(hour, 0, 0, 0);
    
    if (candidateDate < earliestStart) {
      continue;
    }

    const endDate = new Date(candidateDate);
    endDate.setHours(hour + 1, 0, 0, 0);

    for (const instructor of instructors) {
      for (const plane of planes) {
        if (
          isInstructorAvailable(instructor.id, candidateDate.toISOString(), endDate.toISOString()) &&
          isPlaneAvailable(plane.id, candidateDate.toISOString(), endDate.toISOString())
        ) {
          return {
            startTime: candidateDate,
            endTime: endDate,
            instructorId: instructor.id,
            planeId: plane.id,
          };
        }
      }
    }
  }

  return null;
}

export function rescheduleFlights() {
  // Get all cancelled flights with student info
  const cancelledFlights = db.query(`
    SELECT 
      f.id,
      f.student_id,
      f.instructor_id,
      f.plane_id,
      f.route,
      s.preferred_time as student_preferred_time
    FROM flights f
    LEFT JOIN students s ON f.student_id = s.id
    WHERE f.status = 'cancelled'
    ORDER BY f.start_time ASC
  `).all() as CancelledFlight[];

  if (cancelledFlights.length === 0) {
    db.run(
      "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
      ["Rescheduler: No cancelled flights found"]
    );
    return { ok: true, rescheduled: 0 };
  }

  // Get latest weather event end_time to know when it's safe to reschedule
  const latestWeather = db.query(`
    SELECT MAX(end_time) as max_end_time
    FROM weather_events
    WHERE end_time > datetime('now')
  `).get() as { max_end_time: string | null };

  // Determine earliest start time (max of weather end_time or current time)
  const now = new Date();
  let earliestStart = now;
  
  if (latestWeather.max_end_time) {
    const weatherEnd = new Date(latestWeather.max_end_time);
    if (weatherEnd > now) {
      earliestStart = weatherEnd;
    }
  }

  let rescheduledCount = 0;
  let failedCount = 0;

  // Process each cancelled flight
  for (const flight of cancelledFlights) {
    const preferredTime = flight.student_preferred_time || "morning";
    const preferredWindow = getPreferredTimeWindow(preferredTime);

    // Find available slot
    const slot = findAvailableSlot(flight, earliestStart, preferredWindow);

    if (slot) {
      // Update flight with new schedule
      db.run(
        `UPDATE flights 
         SET start_time = ?, 
             end_time = ?, 
             instructor_id = ?, 
             plane_id = ?, 
             status = 'rescheduled'
         WHERE id = ?`,
        [
          slot.startTime.toISOString(),
          slot.endTime.toISOString(),
          slot.instructorId,
          slot.planeId,
          flight.id,
        ]
      );

      // Get instructor and plane names for alert
      const instructor = db.query("SELECT name FROM instructors WHERE id = ?").get(slot.instructorId) as { name: string } | null;
      const plane = db.query("SELECT tail_number FROM planes WHERE id = ?").get(slot.planeId) as { tail_number: string } | null;

      const instructorName = instructor?.name || `Instructor ${slot.instructorId}`;
      const planeTail = plane?.tail_number || `Plane ${slot.planeId}`;
      const timeStr = slot.startTime.toLocaleString();

      // Create detailed alert
      const alertMessage = `Flight ${flight.id} rescheduled to ${timeStr} (${instructorName} / ${planeTail})`;
      db.run(
        "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
        [alertMessage]
      );

      rescheduledCount++;
    } else {
      // No available slot found
      db.run(
        "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
        [`Flight ${flight.id} could not be rescheduled - no available slots found`]
      );
      failedCount++;
    }
  }

  // Create summary alert
  const summaryMessage = `Reschedule complete: ${rescheduledCount} flights reassigned${failedCount > 0 ? `, ${failedCount} failed` : ""}`;
  db.run(
    "INSERT INTO alerts(timestamp, message) VALUES (datetime('now'), ?)",
    [summaryMessage]
  );

  return { ok: true, rescheduled: rescheduledCount, failed: failedCount };
}

