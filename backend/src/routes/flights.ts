import { db } from "../db";
import { getSimulationTime } from "./time";

export function getAllFlights() {
  // Get all flights with joined student, instructor, and plane info
  const flights = db.query(`
    SELECT 
      f.id,
      f.start_time,
      f.end_time,
      f.route,
      f.status,
      s.name as student_name,
      s.level as student_level,
      s.preferred_time as student_preferred_time,
      i.name as instructor_name,
      p.tail_number as plane_tail_number
    FROM flights f
    LEFT JOIN students s ON f.student_id = s.id
    LEFT JOIN instructors i ON f.instructor_id = i.id
    LEFT JOIN planes p ON f.plane_id = p.id
    ORDER BY f.start_time ASC
  `).all();
  
  return flights;
}

/**
 * Updates flight statuses based on current simulation time:
 * - scheduled -> in_progress: when simulation time is within flight's time window
 * - scheduled -> completed: when simulation time has passed flight's end_time (skips in_progress)
 * - in_progress -> completed: when simulation time has passed flight's end_time
 */
export function updateFlightStatuses() {
  const currentTime = getSimulationTime();

  // First, update scheduled flights that have already ended to completed
  // (scheduled flights where current time >= end_time)
  const scheduledToCompleted = db.run(`
    UPDATE flights
    SET status = 'completed'
    WHERE status = 'scheduled'
      AND end_time <= ?
  `, [currentTime]);

  // Update flights that should be in progress
  // (scheduled flights where current time is >= start_time and < end_time)
  const inProgressUpdated = db.run(`
    UPDATE flights
    SET status = 'in_progress'
    WHERE status = 'scheduled'
      AND start_time <= ?
      AND end_time > ?
  `, [currentTime, currentTime]);

  // Update flights that should be completed
  // (in_progress flights where current time >= end_time)
  const completedUpdated = db.run(`
    UPDATE flights
    SET status = 'completed'
    WHERE status = 'in_progress'
      AND end_time <= ?
  `, [currentTime]);

  return { 
    scheduled_to_completed: scheduledToCompleted.changes || 0,
    in_progress: inProgressUpdated.changes || 0,
    completed: completedUpdated.changes || 0
  };
}

