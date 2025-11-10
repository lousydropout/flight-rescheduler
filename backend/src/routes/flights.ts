import { store } from "../store";
import { getSimulationTime } from "./time";

/**
 * Cancels affected flights that haven't been rescheduled before the storm arrives.
 * A flight is cancelled if:
 * - It has status "affected"
 * - There's a weather event affecting its route
 * - The weather event's start_time has passed (storm has arrived)
 * - The flight's time still overlaps with the weather event (wasn't rescheduled)
 */
function cancelAffectedFlightsPastStormStart() {
  const currentTime = getSimulationTime();
  const allFlights = store.getFlights();
  const allWeatherEvents = store.getWeatherEvents();
  
  let cancelledCount = 0;
  
  // Get all active weather events (not yet ended)
  const activeWeatherEvents = allWeatherEvents.filter(w => w.end_time > currentTime);
  
  // Find affected flights that should be cancelled
  const affectedFlights = allFlights.filter(f => f.status === 'affected');
  
  for (const flight of affectedFlights) {
    // Check if there's a weather event that:
    // 1. Affects this flight's route
    // 2. Has already started (start_time <= currentTime)
    // 3. The flight's time still overlaps with the weather event (wasn't rescheduled)
    
    for (const weatherEvent of activeWeatherEvents) {
      const affectedRoutes = weatherEvent.affected_routes
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      
      if (!affectedRoutes.includes(flight.route)) {
        continue; // This weather event doesn't affect this flight's route
      }
      
      // Check if storm has started
      if (weatherEvent.start_time > currentTime) {
        continue; // Storm hasn't started yet, flight can still be rescheduled
      }
      
      // Check if flight's time still overlaps with weather event (wasn't rescheduled)
      const flightOverlaps = flight.start_time < weatherEvent.end_time && 
                             flight.end_time > weatherEvent.start_time;
      
      if (flightOverlaps) {
        // Flight wasn't rescheduled in time, cancel it
        store.updateFlight(flight.id, { status: 'cancelled' });
        cancelledCount++;
        
        // Create alert
        const student = store.getStudent(flight.student_id);
        const studentName = student?.name || `Student ${flight.student_id}`;
        const alertMessage = `Flight for ${studentName} cancelled: not rescheduled before ${weatherEvent.condition} arrival`;
        store.addAlert(currentTime, alertMessage);
        break; // Only cancel once per flight
      }
    }
  }
  
  return cancelledCount;
}

export function getAllFlights() {
  // Get current simulation time
  const currentTime = getSimulationTime();
  const twoHoursAgo = new Date(new Date(currentTime).getTime() - 2 * 60 * 60 * 1000).toISOString();
  
  // Get all flights with joined student, instructor, and plane info
  // Exclude flights that are 2+ hours past their completion time
  const allFlights = store.getFlights();
  const students = store.getStudents();
  const instructors = store.getInstructors();
  const planes = store.getPlanes();
  
  // Create lookup maps
  const studentMap = new Map(students.map(s => [s.id, s]));
  const instructorMap = new Map(instructors.map(i => [i.id, i]));
  const planeMap = new Map(planes.map(p => [p.id, p]));
  
  // Filter and join data
  const flights = allFlights
    .filter(f => f.status !== 'completed' || f.end_time > twoHoursAgo)
    .map(f => ({
      id: f.id,
      start_time: f.start_time,
      end_time: f.end_time,
      route: f.route,
      status: f.status,
      student_name: studentMap.get(f.student_id)?.name || null,
      student_level: studentMap.get(f.student_id)?.level || null,
      student_preferred_time: studentMap.get(f.student_id)?.preferred_time || null,
      instructor_name: instructorMap.get(f.instructor_id)?.name || null,
      plane_tail_number: planeMap.get(f.plane_id)?.tail_number || null,
    }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  
  return flights;
}

/**
 * Updates flight statuses based on current simulation time:
 * - scheduled -> in_progress: when simulation time is within flight's time window
 * - scheduled -> completed: when simulation time has passed flight's end_time (skips in_progress)
 * - in_progress -> completed: when simulation time has passed flight's end_time
 * - affected -> cancelled: when affected flights haven't been rescheduled before storm arrives
 */
export function updateFlightStatuses() {
  const currentTime = getSimulationTime();
  const flights = store.getFlights();
  
  let scheduledToCompleted = 0;
  let inProgressUpdated = 0;
  let completedUpdated = 0;
  
  for (const flight of flights) {
    if (flight.status === 'scheduled' && flight.end_time <= currentTime) {
      store.updateFlight(flight.id, { status: 'completed' });
      scheduledToCompleted++;
    } else if (flight.status === 'scheduled' && flight.start_time <= currentTime && flight.end_time > currentTime) {
      store.updateFlight(flight.id, { status: 'in_progress' });
      inProgressUpdated++;
    } else if (flight.status === 'in_progress' && flight.end_time <= currentTime) {
      store.updateFlight(flight.id, { status: 'completed' });
      completedUpdated++;
    }
  }
  
  // Cancel affected flights that weren't rescheduled before storm arrival
  const cancelledCount = cancelAffectedFlightsPastStormStart();
  
  return { 
    scheduled_to_completed: scheduledToCompleted,
    in_progress: inProgressUpdated,
    completed: completedUpdated,
    cancelled: cancelledCount
  };
}

/**
 * Removes completed flights that are 2+ hours past their end_time
 * Returns the number of flights removed
 */
export function removeOldCompletedFlights(): number {
  const currentTime = getSimulationTime();
  const twoHoursAgo = new Date(new Date(currentTime).getTime() - 2 * 60 * 60 * 1000).toISOString();
  
  return store.deleteFlights(f => 
    f.status === 'completed' && f.end_time <= twoHoursAgo
  );
}

/**
 * Generates new scheduled flights to replace removed ones
 * Creates flights in the future relative to simulation time
 */
export function generateNewScheduledFlights(count: number): number {
  if (count <= 0) return 0;
  
  // Get all students, instructors, and planes
  const students = store.getStudents();
  const instructors = store.getInstructors();
  const planes = store.getPlanes();
  
  if (students.length === 0 || instructors.length === 0 || planes.length === 0) {
    return 0; // Can't generate flights without basic data
  }
  
  const routes = [
    "KAUS–KGTU",
    "KAUS–KHYI",
    "KAUS–KEDC",
    "KAUS–KATT",
  ];
  
  const currentTime = getSimulationTime();
  const baseDate = new Date(currentTime);
  
  // Start generating flights from tomorrow (or next day if it's late)
  baseDate.setDate(baseDate.getDate() + 1);
  baseDate.setHours(8, 0, 0, 0); // Start at 8 AM
  
  const allFlights = store.getFlights();
  
  let generated = 0;
  let dayOffset = 0;
  let hour = 8;
  const maxDaysAhead = 14; // Don't look more than 2 weeks ahead
  let attempts = 0;
  const maxAttempts = count * 100; // Safety limit to prevent infinite loops
  
  for (let i = 0; i < count && attempts < maxAttempts; i++) {
    attempts++;
    
    // Find next available time slot
    const flightDate = new Date(baseDate);
    flightDate.setDate(baseDate.getDate() + dayOffset);
    flightDate.setHours(hour, 0, 0, 0);
    
    // Safety check: don't go too far in the future
    if (dayOffset > maxDaysAhead) {
      break; // Stop generating if we've looked too far ahead
    }
    
    const endDate = new Date(flightDate);
    endDate.setHours(hour + 1, 0, 0, 0);
    
    const startTimeStr = flightDate.toISOString();
    const endTimeStr = endDate.toISOString();
    
    // Check if this time slot conflicts with existing flights
    // Time overlap: flight.start_time < new.end_time AND flight.end_time > new.start_time
    const hasConflict = allFlights.some(f => 
      f.status !== 'cancelled' && 
      f.status !== 'affected' &&
      f.start_time < endTimeStr && 
      f.end_time > startTimeStr
    );
    
    // If there's a conflict, try next hour
    if (hasConflict) {
      hour++;
      if (hour >= 17) {
        hour = 8;
        dayOffset++;
      }
      i--; // Retry this iteration
      continue;
    }
    
    // Randomly assign student, instructor, plane, and route
    const studentId = students[Math.floor(Math.random() * students.length)].id;
    const instructorId = instructors[Math.floor(Math.random() * instructors.length)].id;
    const planeId = planes[Math.floor(Math.random() * planes.length)].id;
    const route = routes[Math.floor(Math.random() * routes.length)];
    
    store.addFlight(
      studentId,
      instructorId,
      planeId,
      startTimeStr,
      endTimeStr,
      route,
      "scheduled"
    );
    
    generated++;
    hour++;
    if (hour >= 17) {
      hour = 8;
      dayOffset++;
    }
  }
  
  if (generated > 0) {
    const alertMessage = `Generated ${generated} new scheduled flight(s)`;
    store.addAlert(new Date().toISOString(), alertMessage);
  }
  
  return generated;
}

/**
 * Cleanup old flights and generate new ones
 * This is called periodically to maintain the flight board
 */
export function cleanupAndGenerateFlights() {
  const removed = removeOldCompletedFlights();
  let generated = 0;
  
  if (removed > 0) {
    // Generate 1-2 new flights per removed flight
    const newFlightCount = Math.min(removed * 2, 10); // Cap at 10 new flights at a time
    generated = generateNewScheduledFlights(newFlightCount);
  }
  
  return { removed, generated };
}
