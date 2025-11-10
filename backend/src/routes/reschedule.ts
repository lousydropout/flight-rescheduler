import { store } from "../store";
import { getSimulationTime } from "./time";

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
  const allFlights = store.getFlights();
  const conflicts = allFlights.filter(f =>
    f.instructor_id === instructorId &&
    f.status !== 'cancelled' &&
    f.start_time < endTime &&
    f.end_time > startTime
  );
  return conflicts.length === 0;
}

// Helper function to check if a time slot is available for a plane
function isPlaneAvailable(planeId: number, startTime: string, endTime: string): boolean {
  const allFlights = store.getFlights();
  const conflicts = allFlights.filter(f =>
    f.plane_id === planeId &&
    f.status !== 'cancelled' &&
    f.start_time < endTime &&
    f.end_time > startTime
  );
  return conflicts.length === 0;
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
  const instructors = store.getInstructors();
  const planes = store.getPlanes();

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
  const allFlights = store.getFlights();
  const students = store.getStudents();
  const studentMap = new Map(students.map(s => [s.id, s]));
  
  const cancelledFlights: CancelledFlight[] = allFlights
    .filter(f => f.status === 'cancelled')
    .map(f => ({
      id: f.id,
      student_id: f.student_id,
      instructor_id: f.instructor_id,
      plane_id: f.plane_id,
      route: f.route,
      student_preferred_time: studentMap.get(f.student_id)?.preferred_time || "morning",
    }))
    .sort((a, b) => {
      const flightA = allFlights.find(f => f.id === a.id);
      const flightB = allFlights.find(f => f.id === b.id);
      return (flightA?.start_time || "").localeCompare(flightB?.start_time || "");
    });

  if (cancelledFlights.length === 0) {
    store.addAlert(new Date().toISOString(), "Rescheduler: No cancelled flights found");
    return { ok: true, rescheduled: 0 };
  }

  // Get latest weather event end_time to know when it's safe to reschedule
  const currentTime = getSimulationTime();
  const allWeatherEvents = store.getWeatherEvents();
  const activeWeatherEvents = allWeatherEvents.filter(w => w.end_time > currentTime);
  const latestWeatherEnd = activeWeatherEvents.length > 0
    ? Math.max(...activeWeatherEvents.map(w => new Date(w.end_time).getTime()))
    : null;

  // Determine earliest start time (max of weather end_time or current simulation time)
  const now = new Date(currentTime);
  let earliestStart = now;
  
  if (latestWeatherEnd) {
    const weatherEnd = new Date(latestWeatherEnd);
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
      store.updateFlight(flight.id, {
        start_time: slot.startTime.toISOString(),
        end_time: slot.endTime.toISOString(),
        instructor_id: slot.instructorId,
        plane_id: slot.planeId,
        status: 'scheduled'
      });

      // Get instructor and plane names for alert
      const instructor = store.getInstructor(slot.instructorId);
      const plane = store.getPlane(slot.planeId);

      const instructorName = instructor?.name || `Instructor ${slot.instructorId}`;
      const planeTail = plane?.tail_number || `Plane ${slot.planeId}`;
      const timeStr = slot.startTime.toLocaleString();

      // Create detailed alert
      const alertMessage = `Flight ${flight.id} rescheduled to ${timeStr} (${instructorName} / ${planeTail})`;
      store.addAlert(new Date().toISOString(), alertMessage);

      rescheduledCount++;
    } else {
      // No available slot found
      store.addAlert(
        new Date().toISOString(),
        `Flight ${flight.id} could not be rescheduled - no available slots found`
      );
      failedCount++;
    }
  }

  // Create summary alert
  const summaryMessage = `Reschedule complete: ${rescheduledCount} flights reassigned${failedCount > 0 ? `, ${failedCount} failed` : ""}`;
  store.addAlert(new Date().toISOString(), summaryMessage);

  return { ok: true, rescheduled: rescheduledCount, failed: failedCount };
}
