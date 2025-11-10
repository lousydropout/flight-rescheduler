import { store } from "../store";
import { getSimulationTime } from "./time";

interface TimeSlot {
  start_time: string;
  end_time: string;
  instructor_id: number;
  instructor_name: string;
  plane_id: number;
  plane_tail: string;
  available: boolean;
}

// Helper function to check if a time slot is available for an instructor
function isInstructorAvailable(instructorId: number, startTime: string, endTime: string, excludeFlightId?: number): boolean {
  const allFlights = store.getFlights();
  const conflicts = allFlights.filter(f =>
    f.instructor_id === instructorId &&
    f.status !== 'cancelled' &&
    f.status !== 'affected' &&
    f.id !== excludeFlightId &&
    f.start_time < endTime &&
    f.end_time > startTime
  );
  return conflicts.length === 0;
}

// Helper function to check if a time slot is available for a plane
function isPlaneAvailable(planeId: number, startTime: string, endTime: string, excludeFlightId?: number): boolean {
  const allFlights = store.getFlights();
  const conflicts = allFlights.filter(f =>
    f.plane_id === planeId &&
    f.status !== 'cancelled' &&
    f.status !== 'affected' &&
    f.id !== excludeFlightId &&
    f.start_time < endTime &&
    f.end_time > startTime
  );
  return conflicts.length === 0;
}

// Helper function to check if a time slot overlaps with active weather events affecting a route
function isSlotAffectedByWeather(route: string, startTime: string, endTime: string): boolean {
  const currentTime = getSimulationTime();
  const allWeatherEvents = store.getWeatherEvents();
  
  // Get active weather events (where end_time is after current simulation time)
  const activeWeatherEvents = allWeatherEvents.filter(w => w.end_time > currentTime);
  
  // Check if any active weather event affects this route and overlaps with the time slot
  for (const weatherEvent of activeWeatherEvents) {
    // Parse affected routes
    const affectedRoutes = weatherEvent.affected_routes
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    
    // Check if this route is affected
    if (!affectedRoutes.includes(route)) {
      continue;
    }
    
    // Check if time slot overlaps with weather event
    // Time overlap: slot.start_time < weather.end_time AND slot.end_time > weather.start_time
    if (startTime < weatherEvent.end_time && endTime > weatherEvent.start_time) {
      return true; // Slot is affected by weather
    }
  }
  
  return false; // No weather conflicts
}

/**
 * Get available time slots for the next week for a specific flight
 */
export function getAvailableTimeSlots(flightId: number): TimeSlot[] {
  // Get flight details
  const flight = store.getFlight(flightId);
  if (!flight) {
    throw new Error(`Flight ${flightId} not found`);
  }

  // Get student for preferred time (not used in current logic but available)
  const student = store.getStudent(flight.student_id);

  // Get all instructors and planes
  const instructors = store.getInstructors();
  const planes = store.getPlanes();

  // Get current simulation time and calculate next week
  const currentTime = getSimulationTime();
  const startDate = new Date(currentTime);
  startDate.setHours(0, 0, 0, 0); // Start of today
  
  // If current time is past 5 PM, start from tomorrow
  if (startDate.getHours() >= 17) {
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7); // Next 7 days

  const slots: TimeSlot[] = [];

  // Generate slots for each day (8 AM to 5 PM, hourly)
  for (let day = 0; day < 7; day++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(currentDay.getDate() + day);

    for (let hour = 8; hour < 17; hour++) {
      const slotStart = new Date(currentDay);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Skip if slot is in the past
      if (slotStart < new Date(currentTime)) {
        continue;
      }

      // Try each instructor/plane combination
      for (const instructor of instructors) {
        for (const plane of planes) {
          const slotStartStr = slotStart.toISOString();
          const slotEndStr = slotEnd.toISOString();
          
          // Check instructor and plane availability
          const instructorAvailable = isInstructorAvailable(instructor.id, slotStartStr, slotEndStr, flightId);
          const planeAvailable = isPlaneAvailable(plane.id, slotStartStr, slotEndStr, flightId);
          
          // Check if slot is affected by weather for this route
          const affectedByWeather = isSlotAffectedByWeather(flight.route, slotStartStr, slotEndStr);
          
          // Slot is only available if instructor and plane are available AND not affected by weather
          const available = instructorAvailable && planeAvailable && !affectedByWeather;

          slots.push({
            start_time: slotStartStr,
            end_time: slotEndStr,
            instructor_id: instructor.id,
            instructor_name: instructor.name,
            plane_id: plane.id,
            plane_tail: plane.tail_number,
            available,
          });
        }
      }
    }
  }

  return slots;
}

/**
 * Update a flight's schedule with a new time slot
 */
export function updateFlightSchedule(
  flightId: number,
  startTime: string,
  endTime: string,
  instructorId: number,
  planeId: number
): { ok: boolean; message?: string } {
  // Verify the flight exists and is affected
  const flight = store.getFlight(flightId);
  if (!flight) {
    return { ok: false, message: `Flight ${flightId} not found` };
  }

  if (flight.status !== "affected") {
    return { ok: false, message: `Flight ${flightId} is not in 'affected' status` };
  }

  // Verify the time slot is available
  if (!isInstructorAvailable(instructorId, startTime, endTime, flightId)) {
    return { ok: false, message: "Instructor is not available at this time" };
  }

  if (!isPlaneAvailable(planeId, startTime, endTime, flightId)) {
    return { ok: false, message: "Plane is not available at this time" };
  }

  // Verify the time slot is not affected by weather
  if (isSlotAffectedByWeather(flight.route, startTime, endTime)) {
    return { ok: false, message: "This time slot is affected by active weather events" };
  }

  // Get student name for the alert
  const student = store.getStudent(flight.student_id);
  const studentName = student?.name || `Student ${flight.student_id}`;

  // Capture old flight details before updating
  const oldStartTime = flight.start_time;
  const oldInstructorId = flight.instructor_id;
  const oldInstructor = store.getInstructor(oldInstructorId);
  const oldInstructorName = oldInstructor?.name || `Instructor ${oldInstructorId}`;
  const oldRoute = flight.route;
  const oldTimeStr = new Date(oldStartTime).toLocaleString();

  console.log(`[Reschedule] Flight ${flightId} - Old: ${oldTimeStr}, ${oldInstructorName}, ${oldRoute}`);
  console.log(`[Reschedule] Flight ${flightId} - New: ${new Date(startTime).toLocaleString()}, Instructor ${instructorId}, ${flight.route}`);

  // Update the flight
  const updateSuccess = store.updateFlight(flightId, {
    start_time: startTime,
    end_time: endTime,
    instructor_id: instructorId,
    plane_id: planeId,
    status: 'scheduled'
  });

  if (!updateSuccess) {
    return { ok: false, message: `Failed to update flight ${flightId}` };
  }

  // Get new instructor and route details for alert
  const newInstructor = store.getInstructor(instructorId);
  const newInstructorName = newInstructor?.name || `Instructor ${instructorId}`;
  const newRoute = flight.route; // Route stays the same unless changed
  const newTimeStr = new Date(startTime).toLocaleString();

  // Only create alert if something actually changed
  const timeChanged = oldStartTime !== startTime;
  const instructorChanged = oldInstructorId !== instructorId;
  const planeChanged = flight.plane_id !== planeId;
  
  if (timeChanged || instructorChanged || planeChanged) {
    const alertMessage = `Flight for ${studentName} rescheduled: (${oldTimeStr}, ${oldInstructorName}, ${oldRoute}) → (${newTimeStr}, ${newInstructorName}, ${newRoute})`;
    store.addAlert(new Date().toISOString(), alertMessage);
  } else {
    console.log(`[Reschedule] Flight ${flightId} - No changes detected, skipping alert`);
  }

  // Verify the flight was updated correctly
  const updatedFlight = store.getFlight(flightId);
  if (!updatedFlight || updatedFlight.status !== 'scheduled') {
    console.error(`Flight ${flightId} update verification failed`, updatedFlight);
  }

  return { ok: true };
}
